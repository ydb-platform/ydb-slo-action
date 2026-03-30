import {
  getComposeProfiles,
  getContainerIp,
  getPullRequestNumber,
  waitForContainerCompletion
} from "../main-73wr87bf.js";
import {
  debug,
  error,
  exec,
  getInput,
  info,
  saveState,
  setFailed,
  setOutput
} from "../main-w8t1tja0.js";

// init/main.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = getInput("workload_name") || "unspecified";
  saveState("cwd", cwd), saveState("pull", await getPullRequestNumber()), saveState("commit", process.env.GITHUB_SHA), saveState("workload", workload), fs.mkdirSync(cwd, { recursive: !0 }), await copyAssets(cwd);
  try {
    await deployInfra(cwd, workload);
  } catch (err) {
    saveState("failed", "cluster"), error(err), process.exit(1);
  }
  try {
    await waitForWorkloads();
  } catch (err) {
    saveState("failed", "workload"), error(err), process.exit(1);
  }
}
async function copyAssets(cwd) {
  let deployPath = path.join(process.env.GITHUB_ACTION_PATH, "deploy");
  if (!fs.existsSync(deployPath)) {
    setFailed(`Deploy assets not found at ${deployPath}`);
    return;
  }
  for (let entry of fs.readdirSync(deployPath)) {
    let src = path.join(deployPath, entry), dest = path.join(cwd, entry);
    fs.cpSync(src, dest, { recursive: !0 });
  }
  debug(`Deploy assets copied to ${cwd}`);
}
async function deployInfra(cwd, workload) {
  let profiles = await getComposeProfiles(cwd, getInput("disable_compose_profiles").split(",")), workloadDuration = getInput("workload_duration") || "60", workloadCurrentRef = getInput("workload_current_ref") || "current", workloadCurrentImage = getInput("workload_current_image"), workloadCurrentCommand = getInput("workload_current_command") || "", workloadBaselineRef = getInput("workload_baseline_ref") || "baseline", workloadBaselineImage = getInput("workload_baseline_image") || "", workloadBaselineCommand = getInput("workload_baseline_command") || "";
  if (workloadCurrentImage)
    profiles.push("workload-current");
  if (workloadBaselineImage)
    profiles.push("workload-baseline");
  let started = !1;
  for (let attempt = 1;attempt <= 3; attempt++) {
    try {
      await exec("docker", ["compose", "up", "--quiet-pull", "--quiet-build", "--detach"], {
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
  if (debug(`Ran with profiles: ${profiles.join(", ")}`), profiles.includes("telemetry")) {
    let prometheusIp = await getContainerIp("ydb-prometheus");
    setOutput("ydb-prometheus-url", `http://${prometheusIp}:9090`), setOutput("ydb-prometheus-otlp", `http://${prometheusIp}:9090/api/v1/otlp`);
  }
}
async function waitForWorkloads() {
  let start = /* @__PURE__ */ new Date;
  saveState("start", start.toISOString()), info(`Workloads started at ${start}`);
  let workloadCurrentImage = getInput("workload_current_image"), workloadBaselineImage = getInput("workload_baseline_image") || "", workloadDuration = parseInt(getInput("workload_duration") || "60", 10), workloadTimeoutMs = (workloadDuration + 60) * 1000;
  debug(`Workload configuration: duration=${workloadDuration}s, timeout=${workloadTimeoutMs}ms`);
  let workloadsToWait = [];
  if (workloadCurrentImage)
    workloadsToWait.push({ name: "current", container: "ydb-workload-current" });
  if (workloadBaselineImage)
    workloadsToWait.push({ name: "baseline", container: "ydb-workload-baseline" });
  if (workloadsToWait.length > 0) {
    info(`Waiting for ${workloadsToWait.length} workload(s) to complete...`), info(`  - ${workloadsToWait.map((w) => w.name).join(", ")}`), info(`  - Timeout: ${workloadTimeoutMs / 1000}s (workload duration + 60s buffer)`);
    try {
      await Promise.all(workloadsToWait.map((w) => waitForContainerCompletion({
        container: w.container,
        timeoutMs: workloadTimeoutMs
      }))), info("All workloads completed successfully");
    } catch (err) {
      error(`Workload failed: ${err}`);
    }
  }
  let finish = /* @__PURE__ */ new Date;
  saveState("finish", finish.toISOString()), info(`Workloads finished at ${finish}`);
}
await main();
process.exit(0);
