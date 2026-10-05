import {
  summary,
  exec,
  getInput,
  debug,
  warning,
  info,
  getState,
  formatChangeCell,
  formatValue,
  analyzeSloWorkload
} from "../main-xzyv760g.js";
import {
  getContainerIp,
  collectComposeLogs,
  getComposeProfiles,
  uploadArtifacts,
  collectExtraArtifacts,
  parseSloSummary,
  loadMetricConfig,
  safeStep,
  queryRange,
  collectMetricsFromPrometheus
} from "../main-y3n7pjbt.js";

// init/post.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

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
  let cwd = getState("cwd"), workload = getState("workload"), logsPath = path.join(cwd, `${workload}-logs.txt`), alertsPath = path.join(cwd, `${workload}-alerts.jsonl`), metricsPath = path.join(cwd, `${workload}-metrics.jsonl`), metadataPath = path.join(cwd, `${workload}-metadata.json`), thresholdsPath = path.join(cwd, `${workload}-thresholds.yaml`), metricsContent = "", extraArtifactPaths = [];
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
    warning(`Failed to collect ${path.basename(filePath)}: ${err}`);
  }
  try {
    await fs.writeFile(filePath, content, { encoding: "utf-8" });
  } catch (err) {
    warning(`Failed to write ${path.basename(filePath)}: ${err}`);
  }
  return content;
}
async function teardown(cwd) {
  info("Tearing down infrastructure...");
  try {
    let composeFile = getState("compose_file") || "compose.yml", profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","), composeFile);
    await exec("docker", ["compose", "-f", composeFile, "down"], {
      cwd,
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
  let cwd = getState("cwd"), composeFile = getState("compose_file") || "compose.yml", profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","), composeFile);
  return await collectComposeLogs(cwd, profiles, composeFile);
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
      return debug(`Reading per-scenario thresholds from ${inputPath}`), await fs.readFile(inputPath, { encoding: "utf-8" });
    } catch (error) {
      warning(`Could not read thresholds_yaml_path "${inputPath}": ${String(error)}`);
    }
  return "";
}
async function collectMetadata() {
  info("Saving metadata...");
  let pull = getState("pull"), commit = getState("commit"), failed = getState("failed"), startState = getState("start"), finishState = getState("finish"), start = startState ? new Date(startState) : void 0, finish = finishState ? new Date(finishState) : void 0, workload = getState("workload"), workload_current_ref = getInput("workload_current_ref"), workload_baseline_ref = getInput("workload_baseline_ref"), bridge_mode = getInput("bridge_mode") === "true", sloState = getState("slo_verdict");
  return JSON.stringify({
    slo: sloState ? parseSloSummary(sloState) : void 0,
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
    bridge_mode,
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
`).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line)), sloState = getState("slo_verdict"), analysis = analyzeSloWorkload(workload, metrics, currentRef, baselineRef, {
    sloVerdict: sloState ? parseSloSummary(sloState).verdict : "INVALID"
  });
  await writeJobSummary(analysis);
}
async function writeFailedSummary() {
  let workload = getState("workload"), failed = getState("failed");
  summary.addHeading(`Failed ${workload} (${failed || "unknown"}).`), summary.addRaw(`See the \`${workload}-logs.txt\` artifact attached to this run for full logs.`, !0), await summary.write();
}
post();
