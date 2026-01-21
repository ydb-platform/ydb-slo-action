import {
  getComposeProfiles,
  getContainerIp,
  getPullRequestNumber,
  waitForContainerCompletion
} from "../main-cjm6n7yr.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-mj2ce5f3.js";

// init/main.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path.join(process.cwd(), ".slo"), workload = import_core.getInput("workload_name") || "unspecified", disableProfiles = import_core.getInput("disable_compose_profiles") || "";
  import_core.saveState("cwd", cwd), import_core.saveState("pull", await getPullRequestNumber()), import_core.saveState("commit", process.env.GITHUB_SHA), import_core.saveState("workload", workload), fs.mkdirSync(cwd, { recursive: !0 });
  {
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
  {
    let profiles = await getComposeProfiles(cwd);
    profiles = profiles.filter((profile) => !disableProfiles.includes(profile)), await import_exec.exec("docker", ["compose", "up", "--quiet-pull", "--quiet-build", "--detach"], {
      cwd,
      env: {
        ...process.env,
        COMPOSE_PROFILES: profiles.join(",")
      }
    }), import_core.debug(`Ran with profiles: ${profiles.join(", ")}`), import_core.info("Waiting for database readiness check to complete..."), await waitForContainerCompletion({
      container: "ydb-database-readiness"
    }), import_core.info("All database nodes are ready");
    let ydbStorageIps = [
      await getContainerIp("ydb-storage-1")
    ], ydbDatabaseIps = [
      await getContainerIp("ydb-database-1"),
      await getContainerIp("ydb-database-2"),
      await getContainerIp("ydb-database-3"),
      await getContainerIp("ydb-database-4"),
      await getContainerIp("ydb-database-5")
    ];
    if (profiles.includes("chaos"))
      ydbDatabaseIps.push(await getContainerIp("ydb-blackhole"));
    if (import_core.setOutput("ydb-storage-ips", ydbStorageIps.filter(Boolean).join(",")), import_core.setOutput("ydb-database-ips", ydbDatabaseIps.filter(Boolean).join(",")), profiles.includes("telemetry")) {
      let prometheusIp = await getContainerIp("ydb-prometheus");
      import_core.setOutput("ydb-prometheus-url", `http://${prometheusIp}:9090`), import_core.setOutput("ydb-prometheus-otlp", `http://${prometheusIp}:9090/api/v1/otlp/v1/metrics`);
    }
  }
  let start = /* @__PURE__ */ new Date;
  import_core.info(`YDB started at ${start}`), import_core.saveState("start", start.toISOString());
}
main();
