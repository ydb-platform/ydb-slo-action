import {
  collectComposeLogs,
  getComposeProfiles,
  getContainerIp,
  uploadArtifacts
} from "../main-sb5fmyn6.js";
import {
  compareWorkloadMetrics,
  formatChange,
  formatValue,
  loadMetricConfig
} from "../main-bzx26vvv.js";
import {
  debug,
  exec,
  getInput,
  getState,
  info,
  summary
} from "../main-st7zz2z8.js";

// init/post.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

// init/lib/prometheus.ts
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
async function collectAlertsFromPrometheus(url, start, end, step = "15s") {
  debug('Querying alerts: ALERTS{alertstate="firing"}');
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
            query: metric.query,
            round: metric.round,
            data: response.data.result
          });
      } else {
        let response = await queryRange({
          url,
          step: metric.step || config.default.step,
          query: metric.query,
          start: start.getTime() / 1000,
          end: finish.getTime() / 1000,
          queryTimeout: config.default.timeout
        });
        if (response.status === "success" && response.data)
          metrics.push({
            type: "range",
            name: metric.name,
            query: metric.query,
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
async function writeJobSummary(comparison) {
  let statusEmoji = comparison.summary.regressions > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2";
  summary.addHeading(`${statusEmoji} ${comparison.workload}`, 3);
  let matrix = [
    [
      { data: "Metric", header: !0 },
      { data: "Current", header: !0 },
      { data: "Baseline", header: !0 },
      { data: "Change", header: !0 }
    ],
    ...comparison.metrics.map((m) => [
      m.name,
      formatValue(m.current.value, m.name),
      m.baseline.available ? formatValue(m.baseline.value, m.name) : "N/A",
      m.baseline.available ? formatChange(m.change.percent, m.change.direction) : "N/A"
    ])
  ];
  summary.addTable(matrix), summary.addBreak(), await summary.write();
}

// init/post.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function post() {
  let cwd = getState("cwd"), workload = getState("workload"), logsPath = path.join(cwd, `${workload}-logs.txt`), alertsPath = path.join(cwd, `${workload}-alerts.jsonl`), metricsPath = path.join(cwd, `${workload}-metrics.jsonl`), metadataPath = path.join(cwd, `${workload}-metadata.json`), logsContent = await collectLogs();
  await fs.writeFile(logsPath, logsContent, { encoding: "utf-8" });
  let alertsContent = await collectAlerts();
  await fs.writeFile(alertsPath, alertsContent, { encoding: "utf-8" });
  let metricsContent = await collectMetrics();
  await fs.writeFile(metricsPath, metricsContent, { encoding: "utf-8" });
  let metadataContent = await collectMetadata();
  await fs.writeFile(metadataPath, metadataContent, { encoding: "utf-8" });
  let profiles = await getComposeProfiles(cwd);
  await exec("docker", ["compose", "-f", "compose.yml", "down"], {
    cwd: path.resolve(process.env.GITHUB_ACTION_PATH, "deploy"),
    env: {
      ...process.env,
      COMPOSE_PROFILES: profiles.join(",")
    }
  }), await uploadArtifacts(workload, [logsPath, alertsPath, metricsPath, metadataPath], cwd), await writeWorkloadSummary(metricsContent);
}
async function collectLogs() {
  info("Collecting logs...");
  let cwd = getState("cwd"), profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","));
  return await collectComposeLogs(cwd, profiles);
}
async function collectAlerts() {
  info("Collecting alerts from Prometheus...");
  let start = new Date(getState("start")), finish = getState("finish") ? new Date(getState("finish")) : /* @__PURE__ */ new Date, prometheusIp = await getContainerIp("ydb-prometheus"), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://prometheus:9090";
  return debug(`Prometheus URL for alerts: ${prometheusUrl}`), (await collectAlertsFromPrometheus(prometheusUrl, start, finish)).map((a) => JSON.stringify(a)).join(`
`);
}
async function collectMetrics() {
  info("Collecting metrics...");
  let start = new Date(getState("start")), finish = getState("finish") ? new Date(getState("finish")) : /* @__PURE__ */ new Date, prometheusIp = await getContainerIp("ydb-prometheus"), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://prometheus:9090";
  debug(`Prometheus URL: ${prometheusUrl}`);
  let config = await loadMetricConfig(getInput("metrics_yaml"), getInput("metrics_yaml_path"));
  return (await collectMetricsFromPrometheus(prometheusUrl, start, finish, config)).map((m) => JSON.stringify(m)).join(`
`);
}
async function collectMetadata() {
  info("Saving metadata...");
  let pull = getState("pull"), commit = getState("commit"), start = new Date(getState("start")), finish = getState("finish") ? new Date(getState("finish")) : /* @__PURE__ */ new Date, duration = finish.getTime() - start.getTime(), workload = getState("workload"), workload_current_ref = getInput("workload_current_ref"), workload_baseline_ref = getInput("workload_baseline_ref");
  return JSON.stringify({
    pull,
    commit,
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
`).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line)), comparison = compareWorkloadMetrics(workload, metrics, currentRef, baselineRef, "avg");
  await writeJobSummary(comparison);
}
post();
