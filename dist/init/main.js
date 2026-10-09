import {
  extraArtifactsPath,
  getComposeProfiles,
  getContainerIp,
  getPullRequestNumber,
  waitForContainerCompletion
} from "../main-7kr7ynhf.js";
import {
  debug,
  error,
  exec,
  getInput,
  info,
  saveState,
  setFailed,
  setOutput,
  warning
} from "../main-nh6pkjgy.js";

// init/main.ts
import * as fs2 from "node:fs";
import * as path2 from "node:path";
import { fileURLToPath } from "node:url";

// init/lib/tls.ts
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
function environment(service) {
  if (!Array.isArray(service.environment))
    return { ...service.environment };
  return Object.fromEntries(service.environment.map((entry) => {
    let separator = entry.indexOf("=");
    if (separator < 0)
      throw Error(`TLS requires explicit environment value: ${entry}`);
    return [entry.slice(0, separator), entry.slice(separator + 1)];
  }));
}
function configureTls(compose) {
  let names = /* @__PURE__ */ new Set(["DNS:ydb", "DNS:localhost", "IP:127.0.0.1"]);
  for (let [name, service] of Object.entries(compose.services)) {
    if (!/^(storage|database)-\d+$/.test(name))
      continue;
    service.hostname ??= service.container_name ?? name;
    for (let host of [name, service.hostname, service.container_name])
      if (host)
        names.add(`DNS:${host}`);
    for (let network of Object.values(service.networks ?? {}))
      if (network.ipv4_address)
        names.add(`IP:${network.ipv4_address}`);
    if (!Array.isArray(service.command))
      throw Error(`Expected node arguments for ${name}`);
    service.command.push("--grpc-public-host", service.hostname, "--grpcs-port", "2135", "--grpcs-public-port", "2135", "--grpc-cert", "/tls/server.crt", "--grpc-key", "/tls/server.key", "--grpc-ca", "/tls/ca.crt"), service.volumes = [...service.volumes ?? [], "./tls/server:/tls:ro"];
  }
  for (let name of ["workload-current", "workload-baseline"]) {
    let service = compose.services[name];
    service.environment = {
      ...environment(service),
      YDB_ENDPOINT: "grpcs://ydb:2135",
      YDB_CONNECTION_STRING: "grpcs://ydb:2135/Root/testdb",
      YDB_SSL_ROOT_CERTIFICATES_FILE: "/tls/ca.crt",
      GRPC_DEFAULT_SSL_ROOTS_FILE_PATH: "/tls/ca.crt",
      NODE_EXTRA_CA_CERTS: "/tls/ca.crt",
      SSL_CERT_FILE: "/tls/ca.crt"
    }, service.volumes = [...service.volumes ?? [], "./tls/public:/tls:ro"];
  }
  let readiness = compose.services["database-readiness"];
  return readiness.environment = {
    ...environment(readiness),
    YDB_READINESS_SCHEME: "grpcs",
    YDB_READINESS_PORT: "2135",
    YDB_TLS_CA_FILE: "/tls/ca.crt"
  }, readiness.volumes = [...readiness.volumes ?? [], "./tls/public:/tls:ro"], compose.services.blackhole.command = "tcp-listen:2135,fork,reuseaddr exec:'/bin/cat'", [...names];
}
function createCertificates(directory, names) {
  fs.mkdirSync(path.join(directory, "server"), { recursive: !0 }), fs.mkdirSync(path.join(directory, "public"), { recursive: !0 });
  let openssl = (args) => execFileSync("openssl", args, { cwd: directory, stdio: "pipe" });
  try {
    openssl([
      "req",
      "-x509",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-days",
      "2",
      "-subj",
      "/CN=YDB SLO test CA",
      "-addext",
      "basicConstraints=critical,CA:TRUE",
      "-addext",
      "keyUsage=critical,keyCertSign,cRLSign",
      "-keyout",
      "ca.key",
      "-out",
      "public/ca.crt"
    ]), fs.rmSync(path.join(directory, "server/server.key"), { force: !0 }), openssl([
      "req",
      "-newkey",
      "rsa:2048",
      "-nodes",
      "-subj",
      "/CN=ydb",
      "-keyout",
      "server/server.key",
      "-out",
      "server.csr"
    ]), fs.writeFileSync(path.join(directory, "server.ext"), `basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=${names.join(",")}
`), openssl([
      "x509",
      "-req",
      "-in",
      "server.csr",
      "-CA",
      "public/ca.crt",
      "-CAkey",
      "ca.key",
      "-CAcreateserial",
      "-days",
      "2",
      "-extfile",
      "server.ext",
      "-out",
      "server/server.crt"
    ]), fs.copyFileSync(path.join(directory, "public/ca.crt"), path.join(directory, "server/ca.crt")), fs.chmodSync(path.join(directory, "server/server.key"), 292);
  } finally {
    for (let file of ["ca.key", "public/ca.srl", "server.csr", "server.ext"])
      fs.rmSync(path.join(directory, file), { force: !0 });
  }
}
function prepareTls(cwd, composeFile) {
  let compose = JSON.parse(execFileSync("docker", [
    "compose",
    "-f",
    composeFile,
    "--profile",
    "*",
    "config",
    "--no-interpolate",
    "--format",
    "json"
  ], { cwd, encoding: "utf8" })), names = configureTls(compose);
  createCertificates(path.join(cwd, "tls"), names);
  let output = "compose.tls.json";
  return fs.writeFileSync(path.join(cwd, output), JSON.stringify(compose, null, 2) + `
`), output;
}

// init/main.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path2.join(process.cwd(), ".slo"), workload = getInput("workload_name") || "unspecified", composeFile = getInput("bridge_mode") === "true" ? "compose.bridge.yml" : "compose.yml";
  saveState("cwd", cwd), saveState("compose_file", composeFile), saveState("pull", await getPullRequestNumber()), saveState("commit", process.env.GITHUB_SHA), saveState("workload", workload), fs2.mkdirSync(cwd, { recursive: !0 }), fs2.mkdirSync(extraArtifactsPath(cwd), { recursive: !0 }), await copyAssets(cwd);
  try {
    if (getInput("tls") === "true")
      composeFile = prepareTls(cwd, composeFile), saveState("compose_file", composeFile);
    await deployInfra(cwd, workload, composeFile);
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
async function waitForWorkloads() {
  let start = /* @__PURE__ */ new Date;
  saveState("start", start.toISOString()), info(`Workloads started at ${start}`);
  let workloadCurrentImage = getInput("workload_current_image"), workloadBaselineImage = getInput("workload_baseline_image") || "", workloadDuration = parseInt(getInput("workload_duration") || "60", 10), workloadTimeoutMs = (workloadDuration + 60) * 1000, failFast = getInput("fail_on_workload_error") === "true";
  debug(`Workload configuration: duration=${workloadDuration}s, timeout=${workloadTimeoutMs}ms, failFast=${failFast}`);
  let workloadsToWait = [];
  if (workloadCurrentImage)
    workloadsToWait.push({ name: "current", container: "ydb-workload-current" });
  if (workloadBaselineImage)
    workloadsToWait.push({ name: "baseline", container: "ydb-workload-baseline" });
  let failures = [];
  if (workloadsToWait.length > 0) {
    if (info(`Waiting for ${workloadsToWait.length} workload(s) to complete...`), info(`  - ${workloadsToWait.map((w) => w.name).join(", ")}`), info(`  - Timeout: ${workloadTimeoutMs / 1000}s (workload duration + 60s buffer)`), (await Promise.allSettled(workloadsToWait.map((w) => waitForContainerCompletion({ container: w.container, timeoutMs: workloadTimeoutMs })))).forEach((result, i) => {
      if (result.status === "rejected") {
        let name = workloadsToWait[i].name;
        failures.push(`${name}: ${result.reason}`), warning(`Workload '${name}' failed: ${result.reason}`);
      }
    }), failures.length === 0)
      info("All workloads completed successfully");
  }
  let finish = /* @__PURE__ */ new Date;
  if (saveState("finish", finish.toISOString()), info(`Workloads finished at ${finish}`), failFast && failures.length > 0)
    throw Error(`Workload(s) failed: ${failures.join("; ")}`);
}
await main();
process.exit(0);
