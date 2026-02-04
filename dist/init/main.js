import {
  getComposeProfiles,
  getContainerIp,
  getPullRequestNumber,
  waitForContainerCompletion
} from "../main-jq95dajc.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-1qcptng8.js";

// init/main.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core.getInput("workload_name") || "unspecified";
  import_core.saveState("cwd", cwd), import_core.saveState("pull", await getPullRequestNumber()), import_core.saveState("commit", process.env.GITHUB_SHA), import_core.saveState("workload", workload), fs.mkdirSync(cwd, { recursive: !0 }), await copyAssets(cwd), await deployInfra(cwd, workload), await waitForWorkloads();
}
async function copyAssets(cwd) {
  let deployPath = path.join(process.env.GITHUB_ACTION_PATH, "deploy");
  if (!fs.existsSync(deployPath)) {
    import_core.setFailed(`Deploy assets not found at ${deployPath}`);
    return;
  }
  for (let entry of fs.readdirSync(deployPath)) {
    let src = path.join(deployPath, entry), dest = path.join(cwd, entry);
    fs.cpSync(src, dest, { recursive: !0 });
  }
  import_core.debug(`Deploy assets copied to ${cwd}`);
}
async function deployInfra(cwd, workload) {
  let profiles = await getComposeProfiles(cwd), disableProfiles = import_core.getInput("disable_compose_profiles") || "";
  profiles = profiles.filter((profile) => !disableProfiles.includes(profile));
  let workloadDuration = import_core.getInput("workload_duration") || "60", workloadCurrentRef = import_core.getInput("workload_current_ref") || "current", workloadCurrentImage = import_core.getInput("workload_current_image"), workloadCurrentCommand = import_core.getInput("workload_current_command") || "", workloadBaselineRef = import_core.getInput("workload_baseline_ref") || "baseline", workloadBaselineImage = import_core.getInput("workload_baseline_image") || "", workloadBaselineCommand = import_core.getInput("workload_baseline_command") || "";
  if (workloadCurrentImage)
    profiles.push("workload-current");
  if (workloadBaselineImage)
    profiles.push("workload-baseline");
  if (await import_exec.exec("docker", ["compose", "up", "--quiet-pull", "--quiet-build", "--detach"], {
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
  }), import_core.debug(`Ran with profiles: ${profiles.join(", ")}`), profiles.includes("telemetry")) {
    let prometheusIp = await getContainerIp("ydb-prometheus");
    import_core.setOutput("ydb-prometheus-url", `http://${prometheusIp}:9090`), import_core.setOutput("ydb-prometheus-otlp", `http://${prometheusIp}:9090/api/v1/otlp`);
  }
}
async function waitForWorkloads() {
  let start = /* @__PURE__ */ new Date;
  import_core.saveState("start", start.toISOString()), import_core.info(`Workloads started at ${start}`);
  let workloadCurrentImage = import_core.getInput("workload_current_image"), workloadBaselineImage = import_core.getInput("workload_baseline_image") || "", workloadTimeoutMs = (parseInt(import_core.getInput("workload_duration") || "60", 10) + 60) * 1000, workloadsToWait = [];
  if (workloadCurrentImage)
    workloadsToWait.push({ name: "current", container: "ydb-workload-current" });
  if (workloadBaselineImage)
    workloadsToWait.push({ name: "baseline", container: "ydb-workload-baseline" });
  if (workloadsToWait.length > 0) {
    import_core.info(`Waiting for ${workloadsToWait.length} workload(s) to complete...`), import_core.info(`  - ${workloadsToWait.map((w) => w.name).join(", ")}`);
    try {
      await Promise.all(workloadsToWait.map((w) => waitForContainerCompletion({
        container: w.container,
        timeoutMs: workloadTimeoutMs
      }))), import_core.info("All workloads completed successfully");
    } catch (error) {
      import_core.setFailed(`Workload failed: ${error}`);
    }
  }
  let finish = /* @__PURE__ */ new Date;
  import_core.saveState("finish", finish.toISOString()), import_core.info(`Workloads finished at ${finish}`);
}
main();
