import {
  collectComposeLogs,
  collectExtraArtifacts,
  getComposeProfiles,
  getContainerIp,
  uploadArtifacts
} from "../main-mmj9rtzx.js";
import {
  analyzeWorkload,
  formatChangeCell,
  formatValue
} from "../main-xrdd04fk.js";
import {
  debug,
  exec,
  getInput,
  getState,
  info,
  summary,
  warning
} from "../main-w8t1tja0.js";

// init/post.ts
import * as fs2 from "node:fs/promises";
import * as path2 from "node:path";
import { fileURLToPath } from "node:url";

// shared/metrics.ts
import * as fs from "node:fs";
import * as path from "node:path";
async function parseMetricsYaml(yamlContent) {
  if (!yamlContent || yamlContent.trim() === "")
    return null;
  try {
    let chunks = [];
    await exec("yq", ["-o=json", "."], {
      input: Buffer.from(yamlContent, "utf-8"),
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let json = chunks.join("");
    return JSON.parse(json);
  } catch (error) {
    return warning(`Failed to parse metrics YAML: ${String(error)}`), null;
  }
}
function mergeMetricConfigs(defaultConfig, customConfig) {
  let mergedByName = /* @__PURE__ */ new Map;
  for (let metric of defaultConfig.metrics || [])
    mergedByName.set(metric.name, metric);
  for (let metric of customConfig.metrics || []) {
    let base = mergedByName.get(metric.name);
    mergedByName.set(metric.name, base ? { ...base, ...metric } : metric);
  }
  let metrics = [], seen = /* @__PURE__ */ new Set;
  for (let metric of customConfig.metrics || []) {
    let merged = mergedByName.get(metric.name);
    if (!merged)
      continue;
    metrics.push(merged), seen.add(metric.name);
  }
  for (let metric of defaultConfig.metrics || []) {
    if (seen.has(metric.name))
      continue;
    metrics.push(metric);
  }
  return {
    default: {
      step: customConfig.default?.step ?? defaultConfig.default.step,
      timeout: customConfig.default?.timeout ?? defaultConfig.default.timeout
    },
    metrics
  };
}
async function loadDefaultMetricConfig() {
  debug("Loading default metrics from GITHUB_ACTION_PATH/deploy/metrics.yaml");
  let actionRoot = path.resolve(process.env.GITHUB_ACTION_PATH), defaultPath = path.join(actionRoot, "deploy", "metrics.yaml");
  if (fs.existsSync(defaultPath)) {
    let content = fs.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseMetricsYaml(content);
    if (config)
      return config;
  }
  return warning("Could not load default metrics, using hardcoded defaults"), {
    default: {
      step: "500ms",
      timeout: "30s"
    },
    metrics: []
  };
}
async function loadMetricConfig(customYaml, customPath) {
  let config = await loadDefaultMetricConfig();
  if (customYaml) {
    debug("Merging custom metrics from inline YAML");
    let customConfig = await parseMetricsYaml(customYaml);
    if (customConfig)
      config = mergeMetricConfigs(config, customConfig);
  }
  if (customPath && fs.existsSync(customPath)) {
    debug(`Merging custom metrics from file: ${customPath}`);
    let content = fs.readFileSync(customPath, { encoding: "utf-8" }), customConfig = await parseMetricsYaml(content);
    if (customConfig)
      config = mergeMetricConfigs(config, customConfig);
  }
  return config;
}

// init/lib/prometheus.ts
function parseStepToSeconds(step) {
  let match = step.match(/^(\d+)([smhd])$/);
  if (!match)
    return 15;
  let value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return value;
    case "m":
      return value * 60;
    case "h":
      return value * 3600;
    case "d":
      return value * 86400;
    default:
      return 15;
  }
}
function safeStep(start, end, preferredSeconds = 1) {
  let durationSeconds = (end.getTime() - start.getTime()) / 1000, minStep = Math.ceil(durationSeconds / 11000);
  return `${Math.max(preferredSeconds, minStep)}s`;
}
async function queryInstant(params) {
  let baseUrl = params.url || "http://localhost:9090", timeout = params.timeout || 30000, url = new URL("/api/v1/query", baseUrl);
  if (url.searchParams.set("query", params.query), params.time !== void 0)
    url.searchParams.set("time", params.time.toString());
  if (params.queryTimeout)
    url.searchParams.set("timeout", params.queryTimeout);
  let response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(timeout)
  }), data = await response.json();
  if (!response.ok)
    throw Error(`Prometheus query failed: ${data.error || response.statusText}`);
  return data;
}
async function queryRange(params) {
  let baseUrl = params.url || "http://localhost:9090", timeout = params.timeout || 30000, url = new URL("/api/v1/query_range", baseUrl);
  if (url.searchParams.set("query", params.query), url.searchParams.set("start", params.start.toString()), url.searchParams.set("end", params.end.toString()), params.step)
    url.searchParams.set("step", params.step);
  if (params.queryTimeout)
    url.searchParams.set("timeout", params.queryTimeout);
  let response = await fetch(url.toString(), {
    signal: AbortSignal.timeout(timeout)
  }), data = await response.json();
  if (!response.ok)
    throw Error(`Prometheus range query failed: ${data.error || response.statusText}`);
  return data;
}

// init/lib/alerts.ts
async function collectAlertsFromPrometheus(url, start, end, preferredStepSeconds = 15) {
  let step = safeStep(start, end, preferredStepSeconds);
  debug(`Querying alerts: ALERTS{alertstate="firing"} (step=${step})`);
  let response = await queryRange({
    url,
    query: 'ALERTS{alertstate="firing"}',
    start: start.getTime() / 1000,
    end: end.getTime() / 1000,
    step
  });
  if (response.status !== "success" || !response.data)
    return debug(`No alerts data: ${response.error || "empty response"}`), [];
  let alerts = parseAlertsFromRange(response.data.result, step);
  return debug(`Collected ${alerts.length} alerts`), alerts;
}
function parseAlertsFromRange(results, step) {
  let alerts = [], stepMs = parseStepToMs(step);
  for (let series of results) {
    let { alertname, alertstate, ...labels } = series.metric;
    if (!alertname)
      continue;
    let intervals = findFiringIntervals(series.values, stepMs);
    for (let interval of intervals)
      alerts.push({
        alertname,
        epoch_ms: interval.start,
        duration_ms: interval.end - interval.start,
        labels
      });
  }
  return alerts;
}
function findFiringIntervals(values, stepMs) {
  let intervals = [], gapTolerance = stepMs * 2, currentInterval = null;
  for (let [timestamp, value] of values) {
    let ts = timestamp * 1000;
    if (value === "1")
      if (currentInterval === null)
        currentInterval = { start: ts, end: ts };
      else if (ts - currentInterval.end <= gapTolerance)
        currentInterval.end = ts;
      else
        intervals.push(currentInterval), currentInterval = { start: ts, end: ts };
    else if (currentInterval !== null)
      intervals.push(currentInterval), currentInterval = null;
  }
  if (currentInterval !== null)
    intervals.push(currentInterval);
  return intervals;
}
function parseStepToMs(step) {
  let match = step.match(/^(\d+)([smhd])$/);
  if (!match)
    return 15000;
  let value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s":
      return value * 1000;
    case "m":
      return value * 60 * 1000;
    case "h":
      return value * 60 * 60 * 1000;
    case "d":
      return value * 24 * 60 * 60 * 1000;
    default:
      return 15000;
  }
}

// init/lib/metrics.ts
async function collectMetricsFromPrometheus(url, start, finish, config) {
  let metrics = [];
  for (let metric of config.metrics)
    try {
      if ((metric.type || "range") === "instant") {
        let response = await queryInstant({
          url,
          time: finish.getTime() / 1000,
          query: metric.query,
          queryTimeout: config.default.timeout
        });
        if (response.status === "success" && response.data)
          metrics.push({
            type: "instant",
            name: metric.name,
            title: metric.title,
            query: metric.query,
            unit: metric.unit,
            round: metric.round,
            data: response.data.result
          });
      } else {
        let configuredStep = metric.step || config.default.step || "1s", step = safeStep(start, finish, parseStepToSeconds(configuredStep)), response = await queryRange({
          url,
          step,
          query: metric.query,
          start: start.getTime() / 1000,
          end: finish.getTime() / 1000,
          queryTimeout: config.default.timeout
        });
        if (response.status === "success" && response.data)
          metrics.push({
            type: "range",
            name: metric.name,
            title: metric.title,
            query: metric.query,
            unit: metric.unit,
            round: metric.round,
            data: response.data.result
          });
      }
    } catch {
      continue;
    }
  return metrics;
}

// init/lib/summary.ts
function severityEmoji(severity) {
  return severity === "failure" ? "\uD83D\uDD34" : severity === "warning" ? "\uD83D\uDFE1" : "\uD83D\uDFE2";
}
function metricStatusEmoji(severity) {
  return severity === "failure" ? "\uD83D\uDD34" : severity === "warning" ? "\uD83D\uDFE1" : "✅";
}
async function writeJobSummary(analysis) {
  let emoji = severityEmoji(analysis.severity);
  if (summary.addHeading(`${emoji} ${analysis.workload}`, 3), analysis.metrics.some((m) => m.relativeCheck)) {
    let matrix = [
      [
        { data: "Metric", header: !0 },
        { data: "Current", header: !0 },
        { data: "Baseline", header: !0 },
        { data: "Change", header: !0 },
        { data: "Concordance", header: !0 },
        { data: "Status", header: !0 }
      ],
      ...analysis.metrics.map((m) => [
        m.name,
        formatValue(m.current.trimmedMean, m.name),
        m.baseline.count > 0 ? formatValue(m.baseline.trimmedMean, m.name) : "N/A",
        formatChangeCell(m),
        m.relativeCheck ? m.relativeCheck.concordance.toFixed(2) : "N/A",
        metricStatusEmoji(m.severity)
      ])
    ];
    summary.addTable(matrix);
  } else {
    let matrix = [
      [
        { data: "Metric", header: !0 },
        { data: "Current", header: !0 },
        { data: "Status", header: !0 }
      ],
      ...analysis.metrics.map((m) => [
        m.name,
        formatValue(m.current.trimmedMean, m.name),
        metricStatusEmoji(m.severity)
      ])
    ];
    summary.addTable(matrix);
  }
  summary.addBreak(), await summary.write();
}

// init/post.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function post() {
  let cwd = getState("cwd"), workload = getState("workload"), logsPath = path2.join(cwd, `${workload}-logs.txt`), alertsPath = path2.join(cwd, `${workload}-alerts.jsonl`), metricsPath = path2.join(cwd, `${workload}-metrics.jsonl`), metadataPath = path2.join(cwd, `${workload}-metadata.json`), thresholdsPath = path2.join(cwd, `${workload}-thresholds.yaml`), metricsContent = "", extraArtifactPaths = [];
  try {
    await persist(logsPath, collectLogs), await persist(alertsPath, collectAlerts), metricsContent = await persist(metricsPath, collectMetrics), await persist(metadataPath, collectMetadata);
  } finally {
    await teardown(cwd);
  }
  try {
    extraArtifactPaths = await collectExtraArtifacts(cwd);
  } catch (err) {
    warning(`Failed to collect extra artifacts: ${err}`);
  }
  let thresholdsContent = await persist(thresholdsPath, collectThresholds), uploads = [logsPath, alertsPath, metricsPath, metadataPath, ...extraArtifactPaths];
  if (thresholdsContent.trim())
    uploads.push(thresholdsPath);
  try {
    await uploadArtifacts(workload, uploads, cwd);
  } catch (err) {
    warning(`Artifact upload failed: ${err}`);
  }
  try {
    if (getState("failed"))
      await writeFailedSummary();
    else
      await writeWorkloadSummary(metricsContent);
  } catch (err) {
    warning(`Writing job summary failed: ${err}`);
  }
}
async function persist(filePath, collect) {
  let content = "";
  try {
    content = await collect();
  } catch (err) {
    warning(`Failed to collect ${path2.basename(filePath)}: ${err}`);
  }
  try {
    await fs2.writeFile(filePath, content, { encoding: "utf-8" });
  } catch (err) {
    warning(`Failed to write ${path2.basename(filePath)}: ${err}`);
  }
  return content;
}
async function teardown(cwd) {
  info("Tearing down infrastructure...");
  try {
    let profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","));
    await exec("docker", ["compose", "-f", "compose.yml", "down"], {
      cwd: path2.resolve(process.env.GITHUB_ACTION_PATH, "deploy"),
      env: {
        ...process.env,
        COMPOSE_PROFILES: profiles.join(",")
      }
    });
  } catch (err) {
    warning(`Teardown (docker compose down) failed: ${err}`);
  }
}
async function collectLogs() {
  info("Collecting logs...");
  let cwd = getState("cwd"), profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","));
  return await collectComposeLogs(cwd, profiles);
}
async function collectAlerts() {
  info("Collecting alerts from Prometheus...");
  let start = getState("start"), finish = getState("finish"), prometheusIp = await getContainerIp("ydb-prometheus");
  if (!prometheusIp || !start || !finish)
    return info("Skipping alerts: Prometheus is not available or no time window exists"), "";
  let prometheusUrl = `http://${prometheusIp}:9090`;
  debug(`Prometheus URL for alerts: ${prometheusUrl}`);
  try {
    return (await collectAlertsFromPrometheus(prometheusUrl, new Date(start), new Date(finish))).map((a) => JSON.stringify(a)).join(`
`);
  } catch (err) {
    return warning(`Failed to collect alerts: ${err}`), "";
  }
}
async function collectMetrics() {
  info("Collecting metrics...");
  let start = getState("start"), finish = getState("finish"), prometheusIp = await getContainerIp("ydb-prometheus");
  if (!prometheusIp || !start || !finish)
    return info("Skipping metrics: Prometheus is not available or no time window exists"), "";
  let prometheusUrl = `http://${prometheusIp}:9090`;
  debug(`Prometheus URL: ${prometheusUrl}`);
  let config = await loadMetricConfig(getInput("metrics_yaml"), getInput("metrics_yaml_path"));
  return (await collectMetricsFromPrometheus(prometheusUrl, new Date(start), new Date(finish), config)).map((m) => JSON.stringify(m)).join(`
`);
}
async function collectThresholds() {
  info("Collecting thresholds...");
  let inline = getInput("thresholds_yaml");
  if (inline)
    return debug("Using inline per-scenario thresholds_yaml"), inline;
  let inputPath = getInput("thresholds_yaml_path");
  if (inputPath)
    try {
      return debug(`Reading per-scenario thresholds from ${inputPath}`), await fs2.readFile(inputPath, { encoding: "utf-8" });
    } catch (error) {
      warning(`Could not read thresholds_yaml_path "${inputPath}": ${String(error)}`);
    }
  return "";
}
async function collectMetadata() {
  info("Saving metadata...");
  let pull = getState("pull"), commit = getState("commit"), failed = getState("failed"), startState = getState("start"), finishState = getState("finish"), start = startState ? new Date(startState) : void 0, finish = finishState ? new Date(finishState) : void 0, workload = getState("workload"), workload_current_ref = getInput("workload_current_ref"), workload_baseline_ref = getInput("workload_baseline_ref");
  return JSON.stringify({
    pull,
    commit,
    failed,
    repo_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}` : void 0,
    repo_full_name: process.env.GITHUB_REPOSITORY,
    run_id: process.env.GITHUB_RUN_ID,
    run_url: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}` : void 0,
    workload,
    workload_current_ref,
    workload_baseline_ref,
    start_time: start?.toISOString(),
    start_epoch_ms: start?.getTime(),
    finish_time: finish?.toISOString(),
    finish_epoch_ms: finish?.getTime(),
    duration_ms: start && finish ? finish.getTime() - start.getTime() : void 0
  });
}
async function writeWorkloadSummary(metricsContent) {
  info("Writing Job Summary...");
  let workload = getState("workload"), currentRef = getInput("workload_current_ref"), baselineRef = getInput("workload_baseline_ref"), metrics = metricsContent.split(`
`).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line)), analysis = analyzeWorkload(workload, metrics, currentRef, baselineRef);
  await writeJobSummary(analysis);
}
async function writeFailedSummary() {
  let workload = getState("workload"), failed = getState("failed");
  summary.addHeading(`Failed ${workload} (${failed || "unknown"}).`), summary.addRaw(`See the \`${workload}-logs.txt\` artifact attached to this run for full logs.`, !0), await summary.write();
}
post();
