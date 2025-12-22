import {
  collectComposeLogs,
  copyFromContainer,
  getContainerIp,
  uploadArtifacts
} from "../main-77exffx0.js";
import {
  compareWorkloadMetrics,
  formatChange,
  formatValue,
  loadMetricConfig
} from "../main-7myt13pq.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-h98689qs.js";

// init/post.ts
var import_core2 = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
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
            data: response.data.result
          });
      }
    } catch {
      continue;
    }
  return metrics;
}

// init/lib/summary.ts
var import_core = __toESM(require_core(), 1);
async function writeJobSummary(comparison) {
  import_core.summary.addBreak();
  let statusEmoji = comparison.summary.regressions > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2";
  import_core.summary.addHeading(`${statusEmoji} ${comparison.workload}`, 3);
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
  import_core.summary.addTable(matrix), import_core.summary.addBreak(), await import_core.summary.write();
}

// init/post.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function post() {
  let cwd = import_core2.getState("cwd"), workload = import_core2.getState("workload"), logsPath = path.join(cwd, `${workload}-logs.txt`), eventsPath = path.join(cwd, `${workload}-events.jsonl`), metricsPath = path.join(cwd, `${workload}-metrics.jsonl`), metadataPath = path.join(cwd, `${workload}-metadata.json`), logsContent = await collectLogs();
  await fs.writeFile(logsPath, logsContent, { encoding: "utf-8" });
  let eventsContent = await collectEvents();
  await fs.writeFile(eventsPath, eventsContent, { encoding: "utf-8" });
  let metricsContent = await collectMetrics();
  await fs.writeFile(metricsPath, metricsContent, { encoding: "utf-8" });
  let metadataContent = await collectMetadata();
  await fs.writeFile(metadataPath, metadataContent, { encoding: "utf-8" }), await import_exec.exec("docker", ["compose", "-f", "compose.yml", "down"], {
    cwd: path.resolve(process.env.GITHUB_ACTION_PATH, "deploy")
  }), await uploadArtifacts(workload, [logsPath, eventsPath, metricsPath, metadataPath], cwd), await writeWorkloadSummary(metricsContent);
}
async function collectLogs() {
  import_core2.info("Collecting logs...");
  let cwd = import_core2.getState("cwd");
  return await collectComposeLogs(cwd);
}
async function collectEvents() {
  return import_core2.info("Collecting events..."), await copyFromContainer({
    container: "ydb-chaos-monkey",
    sourcePath: "/var/log/chaos-events.jsonl"
  }) || "";
}
async function collectMetrics() {
  import_core2.info("Collecting metrics...");
  let start = new Date(import_core2.getState("start")), finish = /* @__PURE__ */ new Date, prometheusIp = await getContainerIp("ydb-prometheus"), prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : "http://prometheus:9090";
  import_core2.debug(`Prometheus URL: ${prometheusUrl}`);
  let config = await loadMetricConfig(import_core2.getInput("metrics_yaml"), import_core2.getInput("metrics_yaml_path"));
  return (await collectMetricsFromPrometheus(prometheusUrl, start, finish, config)).map((m) => JSON.stringify(m)).join(`
`);
}
async function collectMetadata() {
  import_core2.info("Saving metadata...");
  let pull = import_core2.getState("pull"), commit = import_core2.getState("commit"), start = new Date(import_core2.getState("start")), finish = /* @__PURE__ */ new Date, duration = finish.getTime() - start.getTime(), workload = import_core2.getState("workload"), workload_current_ref = import_core2.getInput("workload_current_ref"), workload_baseline_ref = import_core2.getInput("workload_baseline_ref");
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
  import_core2.info("Writing Job Summary...");
  let workload = import_core2.getState("workload"), currentRef = import_core2.getInput("workload_current_ref"), baselineRef = import_core2.getInput("workload_baseline_ref"), metrics = metricsContent.split(`
`).filter((line) => line.trim().length > 0).map((line) => JSON.parse(line)), comparison = compareWorkloadMetrics(workload, metrics, currentRef, baselineRef, "avg");
  await writeJobSummary(comparison);
}
post();
