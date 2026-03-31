import {
  collectComposeLogs,
  getComposeProfiles,
  getContainerIp,
  uploadArtifacts
} from "../main-73wr87bf.js";
import {
  analyzeWorkload,
  formatValue
} from "../main-t5hbpttf.js";
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
function metricStatusEmoji(metric) {
  if (metric.severity === "failure")
    return "\uD83D\uDD34";
  if (metric.severity === "warning")
    return "\uD83D\uDFE1";
  if (metric.relativeCheck) {
    if (Math.abs(metric.relativeCheck.changePercent) < 5)
      return "⚪";
  }
  return "✅";
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
        m.relativeCheck ? `${m.relativeCheck.changePercent >= 0 ? "+" : ""}${m.relativeCheck.changePercent.toFixed(1)}%` : "N/A",
        m.relativeCheck ? m.relativeCheck.concordance.toFixed(2) : "N/A",
        metricStatusEmoji(m)
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
        metricStatusEmoji(m)
      ])
    ];
    summary.addTable(matrix);
  }
  summary.addBreak(), await summary.write();
}

// init/post.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function post() {
  let cwd = getState("cwd"), workload = getState("workload"), logsPath = path2.join(cwd, `${workload}-logs.txt`), alertsPath = path2.join(cwd, `${workload}-alerts.jsonl`), metricsPath = path2.join(cwd, `${workload}-metrics.jsonl`), metadataPath = path2.join(cwd, `${workload}-metadata.json`), logsContent = await collectLogs();
  await fs2.writeFile(logsPath, logsContent, { encoding: "utf-8" });
  let alertsContent = await collectAlerts();
  await fs2.writeFile(alertsPath, alertsContent, { encoding: "utf-8" });
  let metricsContent = await collectMetrics();
  await fs2.writeFile(metricsPath, metricsContent, { encoding: "utf-8" });
  let metadataContent = await collectMetadata();
  await fs2.writeFile(metadataPath, metadataContent, { encoding: "utf-8" });
  let profiles = await getComposeProfiles(cwd);
  if (await exec("docker", ["compose", "-f", "compose.yml", "down"], {
    cwd: path2.resolve(process.env.GITHUB_ACTION_PATH, "deploy"),
    env: {
      ...process.env,
      COMPOSE_PROFILES: profiles.join(",")
    }
  }), await uploadArtifacts(workload, [logsPath, alertsPath, metricsPath, metadataPath], cwd), getState("failed"))
    await writeFailedSummary();
  else
    await writeWorkloadSummary(metricsContent);
}
async function collectLogs() {
  info("Collecting logs...");
  let cwd = getState("cwd"), profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","));
  return await collectComposeLogs(cwd, profiles);
}
async function collectAlerts() {
  if (info("Collecting alerts from Prometheus..."), !getState("start") || !getState("finish"))
    return "";
  let start = new Date(getState("start")), finish = getState("finish") ? new Date(getState("finish")) : /* @__PURE__ */ new Date, prometheusIp = await getContainerIp("ydb-prometheus"), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://prometheus:9090";
  return debug(`Prometheus URL for alerts: ${prometheusUrl}`), (await collectAlertsFromPrometheus(prometheusUrl, start, finish)).map((a) => JSON.stringify(a)).join(`
`);
}
async function collectMetrics() {
  if (info("Collecting metrics..."), !getState("start") || !getState("finish"))
    return "";
  let start = new Date(getState("start")), finish = getState("finish") ? new Date(getState("finish")) : /* @__PURE__ */ new Date, prometheusIp = await getContainerIp("ydb-prometheus"), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://prometheus:9090";
  debug(`Prometheus URL: ${prometheusUrl}`);
  let config = await loadMetricConfig(getInput("metrics_yaml"), getInput("metrics_yaml_path"));
  return (await collectMetricsFromPrometheus(prometheusUrl, start, finish, config)).map((m) => JSON.stringify(m)).join(`
`);
}
async function collectMetadata() {
  info("Saving metadata...");
  let pull = getState("pull"), commit = getState("commit"), start = new Date(getState("start")), finish = getState("finish") ? new Date(getState("finish")) : /* @__PURE__ */ new Date, failed = getState("failed"), duration = finish.getTime() - start.getTime(), workload = getState("workload"), workload_current_ref = getInput("workload_current_ref"), workload_baseline_ref = getInput("workload_baseline_ref");
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
    start_time: start.toISOString(),
    start_epoch_ms: start.getTime(),
    finish_time: finish.toISOString(),
    finish_epoch_ms: finish.getTime(),
    duration_ms: duration
  });
}
async function writeWorkloadSummary(metricsContent) {
  info("Writing Job Summary...");
  let workload = getState("workload"), currentRef = getInput("workload_current_ref"), baselineRef = getInput("workload_baseline_ref"), metrics = metricsContent.split(`
`).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line)), analysis = analyzeWorkload(workload, metrics, currentRef, baselineRef);
  await writeJobSummary(analysis);
}
async function writeFailedSummary() {
  let cwd = getState("cwd"), workload = getState("workload");
  summary.addHeading(`Failed ${workload}.`);
  let workloadLogs = await collectComposeLogs(cwd, ["workload-current", "workload-baseline"]);
  summary.addCodeBlock(workloadLogs), await summary.write();
}
post();
