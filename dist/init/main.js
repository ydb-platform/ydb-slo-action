import {
  collectMetricsFromPrometheus,
  evaluateSloResult,
  extraArtifactsPath,
  getComposeProfiles,
  getContainerIp,
  getPullRequestNumber,
  loadMetricConfig,
  parseSloResult,
  queryInstant,
  waitForContainerCompletion
} from "../main-51kb8934.js";
import {
  analyzeSloWorkload,
  debug,
  error,
  exec,
  getInput,
  info,
  loadThresholdConfig,
  saveState,
  setFailed,
  setOutput,
  summary,
  warning
} from "../main-4nedmbz7.js";

// init/main.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
import { fileURLToPath } from "node:url";

// init/lib/slo.ts
import * as fs from "node:fs/promises";
import * as path from "node:path";
class SloRunError extends Error {
  checks;
  constructor(checks) {
    super(checks.filter((check) => check.verdict !== "PASS").map((check) => `${check.id}: ${check.verdict}: ${check.detail}`).join(`
`));
    this.checks = checks;
  }
}
async function validateWorkloads(cwd, workloads, window) {
  let thresholds = await loadThresholdConfig(getInput("thresholds_yaml"), getInput("thresholds_yaml_path")), checks = window.failures.map((detail) => ({ id: "process", verdict: "FAIL", detail })), prometheusIp = await getContainerIp("ydb-prometheus");
  for (let workload of workloads) {
    let resultPath = path.join(extraArtifactsPath(cwd), `${workload.name}-slo-result.json`);
    try {
      if (await exec("docker", ["cp", `${workload.container}:/tmp/slo-result.json`, resultPath], {
        ignoreReturnCode: !0
      }) !== 0) {
        if (!prometheusIp) {
          checks.push({ id: workload.name, verdict: "INVALID", detail: "Prometheus is unavailable" });
          continue;
        }
        let seconds = Math.max(1, Math.ceil((window.finish.getTime() - window.start.getTime()) / 1000)), at = window.finish.getTime() / 1000, selector2 = `{ref=${JSON.stringify(workload.ref)},__name__=~"ydb_client_operation_duration_seconds_count|ydb_topic_writer_written_messages_total|ydb_topic_reader_delivered_messages_total"}`, response = await queryInstant({
          url: `http://${prometheusIp}:9090`,
          query: `sum(max_over_time(${selector2}[${seconds}s] @ ${at}))`
        }), count = Number(response.data?.result[0]?.value[1]), observed = response.status === "success" && Number.isFinite(count) && count > 0;
        checks.push({
          id: workload.name,
          verdict: observed ? "PASS" : "INVALID",
          detail: observed ? "Native SDK observations collected" : "Missing SDK observations"
        });
        continue;
      }
      let result2 = parseSloResult(await fs.readFile(resultPath, "utf8")), check = evaluateSloResult(result2, workload.ref, thresholds);
      if (checks.push({ ...check, id: workload.name }), check.verdict !== "PASS")
        continue;
      if (!prometheusIp) {
        checks.push({ id: `${workload.name}/telemetry`, verdict: "INVALID", detail: "Prometheus is unavailable" });
        continue;
      }
      let selector = `{ref=${JSON.stringify(workload.ref)},run_id=${JSON.stringify(result2.runId)}}`, required = result2.kind === "table" ? ["ydb_client_operation_duration_seconds_count"] : ["ydb_topic_writer_written_messages_total", "ydb_topic_reader_delivered_messages_total"];
      for (let metric of required) {
        let seconds = Math.max(1, Math.ceil((window.finish.getTime() - window.start.getTime()) / 1000)), at = window.finish.getTime() / 1000, response = await queryInstant({
          url: `http://${prometheusIp}:9090`,
          query: `sum(max_over_time(${metric}${selector}[${seconds}s] @ ${at}))`
        }), count = Number(response.data?.result[0]?.value[1]);
        if (response.status !== "success" || !Number.isFinite(count) || count <= 0)
          checks.push({ id: `${workload.name}/telemetry`, verdict: "INVALID", detail: `Missing SDK observations: ${metric}` });
      }
    } catch (error2) {
      if (!(error2 instanceof Error))
        throw error2;
      checks.push({ id: workload.name, verdict: "INVALID", detail: error2.message });
    }
  }
  if (workloads.length === 0)
    checks.push({ id: "workload", verdict: "INVALID", detail: "No workload executed" });
  if (prometheusIp) {
    let config = await loadMetricConfig(getInput("metrics_yaml"), getInput("metrics_yaml_path")), metrics = await collectMetricsFromPrometheus(`http://${prometheusIp}:9090`, window.start, window.finish, config), analysis = analyzeSloWorkload(getInput("workload_name"), metrics.filter((metric) => metric.role !== "diagnostic"), getInput("workload_current_ref") || "current", getInput("workload_baseline_ref") || "baseline", { thresholdConfig: thresholds });
    for (let metric of analysis.metrics) {
      if (metric.severity !== "failure")
        continue;
      checks.push({
        id: metric.name,
        verdict: "FAIL",
        detail: [...metric.absoluteCheck.violations, ...metric.relativeCheck?.violations ?? []].join("; ")
      });
    }
  }
  let verdict = checks.some((check) => check.verdict === "FAIL") ? "FAIL" : checks.some((check) => check.verdict === "INVALID") ? "INVALID" : "PASS", result = { schemaVersion: 3, verdict, checks };
  saveState("slo_verdict", JSON.stringify(result)), setOutput("slo-verdict", verdict), await fs.writeFile(path.join(extraArtifactsPath(cwd), "slo-verdict.json"), JSON.stringify(result, null, 2)), summary.addHeading(`SLO V3: ${verdict}`);
  for (let check of checks)
    info(`${check.id}: ${check.verdict}: ${check.detail}`), summary.addRaw(`${check.id}: **${check.verdict}** — ${check.detail}

`);
  if (await summary.write(), verdict !== "PASS")
    throw new SloRunError(checks);
}

// init/lib/workloads.ts
async function waitForWorkloads(cwd) {
  let start = /* @__PURE__ */ new Date;
  saveState("start", start.toISOString()), info(`Workloads started at ${start}`);
  let workloadCurrentImage = getInput("workload_current_image"), workloadBaselineImage = getInput("workload_baseline_image") || "", workloadDuration = Number(getInput("workload_duration") || "60"), workloadTimeout = Number(getInput("workload_completion_timeout") || workloadDuration + 60);
  if (!Number.isSafeInteger(workloadDuration) || workloadDuration <= 0 || !Number.isSafeInteger(workloadTimeout) || workloadTimeout <= 0 || workloadTimeout > 2147483)
    throw Error("Workload duration and completion timeout must be positive integer seconds; timeout must fit the Node timer range");
  let workloadTimeoutMs = workloadTimeout * 1000, failFast = getInput("fail_on_workload_error") === "true";
  debug(`Workload configuration: duration=${workloadDuration}s, timeout=${workloadTimeoutMs}ms, failFast=${failFast}`);
  let workloadsToWait = [];
  if (workloadCurrentImage)
    workloadsToWait.push({ name: "current", container: "ydb-workload-current", ref: getInput("workload_current_ref") || "current" });
  if (workloadBaselineImage)
    workloadsToWait.push({ name: "baseline", container: "ydb-workload-baseline", ref: getInput("workload_baseline_ref") || "baseline" });
  let failures = [];
  if (workloadsToWait.length > 0) {
    if (info(`Waiting for ${workloadsToWait.length} workload(s) to complete...`), info(`  - ${workloadsToWait.map((w) => w.name).join(", ")}`), info(`  - Total completion budget: ${workloadTimeout}s`), (await Promise.allSettled(workloadsToWait.map((w) => waitForContainerCompletion({ container: w.container, timeoutMs: workloadTimeoutMs })))).forEach((result, i) => {
      if (result.status === "rejected") {
        let name = workloadsToWait[i].name;
        failures.push(`${name}: ${result.reason}`), warning(`Workload '${name}' failed: ${result.reason}`);
      }
    }), failures.length === 0)
      info("All workloads completed successfully");
  }
  let finish = /* @__PURE__ */ new Date;
  if (saveState("finish", finish.toISOString()), info(`Workloads finished at ${finish}`), await validateWorkloads(cwd, workloadsToWait, { start, finish, failures }), failFast && failures.length > 0)
    throw Error(`Workload(s) failed: ${failures.join("; ")}`);
}

// init/main.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path2.join(process.cwd(), ".slo"), workload = getInput("workload_name") || "unspecified", composeFile = getInput("bridge_mode") === "true" ? "compose.bridge.yml" : "compose.yml";
  saveState("cwd", cwd), saveState("compose_file", composeFile), saveState("pull", await getPullRequestNumber()), saveState("commit", process.env.GITHUB_SHA), saveState("workload", workload), fs2.mkdirSync(cwd, { recursive: !0 }), fs2.mkdirSync(extraArtifactsPath(cwd), { recursive: !0 }), await copyAssets(cwd);
  try {
    await deployInfra(cwd, workload, composeFile);
  } catch (err) {
    saveState("failed", "cluster"), error(err), process.exit(1);
  }
  try {
    await waitForWorkloads(cwd);
  } catch (err) {
    saveState("failed", "workload"), error(err), process.exit(1);
  }
}
async function copyAssets(cwd) {
  let deployPath = path2.join(process.env.GITHUB_ACTION_PATH, "deploy");
  if (!fs2.existsSync(deployPath)) {
    setFailed(`Deploy assets not found at ${deployPath}`);
    return;
  }
  for (let entry of fs2.readdirSync(deployPath)) {
    let src = path2.join(deployPath, entry), dest = path2.join(cwd, entry);
    fs2.cpSync(src, dest, { recursive: !0 });
  }
  debug(`Deploy assets copied to ${cwd}`);
}
async function deployInfra(cwd, workload, composeFile) {
  let profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(","), composeFile), workloadDuration = getInput("workload_duration") || "60", workloadCurrentRef = getInput("workload_current_ref") || "current", workloadCurrentImage = getInput("workload_current_image"), workloadCurrentCommand = getInput("workload_current_command") || "", workloadBaselineRef = getInput("workload_baseline_ref") || "baseline", workloadBaselineImage = getInput("workload_baseline_image") || "", workloadBaselineCommand = getInput("workload_baseline_command") || "";
  if (profiles = profiles.filter((profile) => profile !== "workload-current" && profile !== "workload-baseline"), workloadCurrentImage)
    profiles.push("workload-current");
  if (workloadBaselineImage)
    profiles.push("workload-baseline");
  let started = !1;
  for (let attempt = 1;attempt <= 3; attempt++) {
    try {
      await exec("docker", ["compose", "-f", composeFile, "up", "--quiet-pull", "--quiet-build", "--detach"], {
        cwd,
        env: {
          ...process.env,
          COMPOSE_PROFILES: profiles.join(","),
          WORKLOAD_NAME: workload,
          WORKLOAD_DURATION: workloadDuration,
          WORKLOAD_CURRENT_REF: workloadCurrentRef,
          WORKLOAD_CURRENT_IMAGE: workloadCurrentImage,
          WORKLOAD_CURRENT_COMMAND: workloadCurrentCommand,
          WORKLOAD_BASELINE_REF: workloadBaselineRef,
          WORKLOAD_BASELINE_IMAGE: workloadBaselineImage,
          WORKLOAD_BASELINE_COMMAND: workloadBaselineCommand
        }
      });
    } catch (err) {
      info(`Failed to start YDB cluster: (${attempt} / 3). ${new String(err)}`);
      continue;
    }
    started = !0;
    break;
  }
  if (!started)
    throw Error("Failed to start YDB cluster.");
  if (debug(`Ran ${composeFile} with profiles: ${profiles.join(", ")}`), profiles.includes("telemetry")) {
    let prometheusIp = await getContainerIp("ydb-prometheus");
    setOutput("ydb-prometheus-url", `http://${prometheusIp}:9090`), setOutput("ydb-prometheus-otlp", `http://${prometheusIp}:9090/api/v1/otlp`);
  }
}
await main();
process.exit(0);
