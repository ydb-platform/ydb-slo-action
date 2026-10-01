import {
  DefaultArtifactClient,
  context,
  debug,
  evaluateAbsoluteThreshold,
  exec,
  getInput,
  getOctokit,
  info,
  warning
} from "./main-4nedmbz7.js";

// init/lib/docker.ts
async function getContainerIp(containerName) {
  try {
    let chunks = [];
    return await exec("docker", ["inspect", "-f", "{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}", containerName], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }), chunks.join("").trim();
  } catch (error) {
    return warning(`Failed to get container IP for ${containerName}: ${String(error)}`), null;
  }
}
async function getContainerLogs(containerName) {
  try {
    let chunks = [];
    return await exec("docker", ["logs", "-t", containerName], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString()),
        stderr: (data) => chunks.push(data.toString())
      }
    }), chunks.join("").trim();
  } catch (error) {
    return warning(`Failed to get container logs for ${containerName}: ${String(error)}`), "";
  }
}
async function collectComposeLogs(cwd, profiles, composeFile = "compose.yml") {
  try {
    let chunks = [];
    return await exec("docker", [
      "compose",
      "-f",
      composeFile,
      ...profiles.flatMap((profile) => ["--profile", profile]),
      "logs",
      "--no-color"
    ], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString()),
        stderr: (data) => chunks.push(data.toString())
      }
    }), chunks.join("");
  } catch (error) {
    return warning(`Failed to collect docker compose logs: ${String(error)}`), "";
  }
}
async function getComposeProfiles(cwd, disableProfiles = [], composeFile = "compose.yml") {
  try {
    let chunks = [];
    await exec("docker", ["compose", "-f", composeFile, "config", "--profiles"], {
      cwd,
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let stdout = chunks.join(""), disabled = disableProfiles.map((profile) => profile.trim()).filter(Boolean), profiles = stdout.trim().split(`
`).filter(Boolean).filter((profile) => !disabled.includes(profile));
    return [...new Set(profiles)];
  } catch (error) {
    return warning(`Failed to detect profiles dynamically: ${String(error)}`), [];
  }
}
async function waitForContainerCompletion(options) {
  let { container, timeoutMs = 120000 } = options;
  try {
    let chunks = [], timeoutHandle = null, completed = !1, timeoutPromise = new Promise((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(Error(`Timeout waiting for container ${container} to complete`));
      }, timeoutMs);
    }), waitPromise = exec("docker", ["wait", container], {
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    }).then(() => {
      if (completed = !0, timeoutHandle)
        clearTimeout(timeoutHandle);
      return;
    });
    if (await Promise.race([waitPromise, timeoutPromise]), !completed)
      throw Error(`Container ${container} did not complete in time`);
    let exitCode = parseInt(chunks.join("").trim(), 10);
    if (exitCode !== 0)
      throw Error(`Container ${container} exited with code ${exitCode}.`);
  } catch (error) {
    let statusInfo = "";
    try {
      let statusChunks = [];
      await exec("docker", ["inspect", "-f", "{{.State.Status}} ({{.State.ExitCode}})", container], {
        silent: !0,
        listeners: {
          stdout: (data) => statusChunks.push(data.toString())
        }
      }), statusInfo = ` [Status: ${statusChunks.join("").trim()}]`;
    } catch {}
    try {
      warning(await getContainerLogs(container));
    } catch {}
    throw Error(`Failed to wait for container ${container}${statusInfo}.`, {
      cause: error
    });
  }
}

// init/lib/github.ts
import * as fs from "node:fs";
async function getPullRequestNumber() {
  let explicitPrNumber = getInput("github_issue") || getInput("github_pull_request_number");
  if (explicitPrNumber)
    return Number.parseInt(explicitPrNumber, 10);
  if (context.payload.pull_request)
    return context.payload.pull_request.number;
  let token = getInput("github_token");
  if (!token)
    return null;
  try {
    let { data } = await getOctokit(token).rest.repos.listPullRequestsAssociatedWithCommit({
      owner: context.repo.owner,
      repo: context.repo.repo,
      commit_sha: context.sha
    });
    if (data.length > 0)
      return data[0].number;
  } catch {
    return null;
  }
  return null;
}
async function uploadArtifacts(name, artifacts, cwd) {
  let artifactClient = new DefaultArtifactClient, rootDirectory = cwd || process.cwd(), files = [];
  for (let artifact of artifacts) {
    if (!fs.existsSync(artifact)) {
      warning(`Artifact source missing: ${artifact}`);
      continue;
    }
    files.push(artifact);
  }
  if (files.length === 0) {
    warning("No artifacts to upload");
    return;
  }
  try {
    let { id } = await artifactClient.uploadArtifact(name, files, rootDirectory, {
      retentionDays: 1
    });
    info(`Uploaded ${files.length} file(s) as artifact ${name} (id: ${id})`);
  } catch (error) {
    warning(`Failed to upload artifacts: ${String(error)}`);
  }
}

// init/lib/artifacts.ts
import * as fs2 from "node:fs/promises";
import * as path from "node:path";
var EXTRA_ARTIFACTS_DIR = "extra";
function extraArtifactsPath(cwd) {
  return path.join(cwd, EXTRA_ARTIFACTS_DIR);
}
async function walkFiles(dir) {
  let entries = await fs2.readdir(dir, { withFileTypes: !0 }), files = [];
  for (let entry of entries) {
    let fullPath = path.join(dir, entry.name);
    if (entry.isDirectory())
      files.push(...await walkFiles(fullPath));
    else if (entry.isFile())
      files.push(fullPath);
  }
  return files;
}
async function collectExtraArtifacts(cwd) {
  let extraDir = extraArtifactsPath(cwd);
  try {
    await fs2.access(extraDir);
  } catch {
    return [];
  }
  let files = await walkFiles(extraDir);
  if (files.length > 0)
    info(`Found ${files.length} extra artifact file(s) in ${extraDir}`);
  return files;
}

// shared/slo-result.ts
class SloResultError extends Error {
  reason;
  constructor(reason) {
    super(`Invalid SLO V3 result: ${reason}`);
    this.reason = reason;
  }
}
function isVerdict(value) {
  return value === "PASS" || value === "FAIL" || value === "INVALID";
}
function isCheck(value) {
  return typeof value === "object" && value !== null && "id" in value && typeof value.id === "string" && value.id.length > 0 && "verdict" in value && isVerdict(value.verdict) && "detail" in value && typeof value.detail === "string";
}
function isOperation(value) {
  return typeof value === "object" && value !== null && "type" in value && typeof value.type === "string" && "success" in value && typeof value.success === "number" && Number.isSafeInteger(value.success) && value.success >= 0 && "error" in value && typeof value.error === "number" && Number.isSafeInteger(value.error) && value.error >= 0;
}
function decodeJson(content) {
  try {
    return JSON.parse(content);
  } catch (error) {
    if (error instanceof SyntaxError)
      throw new SloResultError(error.message);
    throw error;
  }
}
function parseSloSummary(content) {
  let value = decodeJson(content);
  if (typeof value !== "object" || value === null || !("schemaVersion" in value) || value.schemaVersion !== 3 || !("verdict" in value) || !isVerdict(value.verdict) || !("checks" in value) || !Array.isArray(value.checks) || !value.checks.every(isCheck))
    throw new SloResultError("Invalid scenario summary");
  return { schemaVersion: 3, verdict: value.verdict, checks: value.checks };
}
function parseSloResult(content) {
  let value = decodeJson(content);
  if (typeof value !== "object" || value === null || !("schemaVersion" in value) || value.schemaVersion !== 3 || !("ref" in value) || typeof value.ref !== "string" || !("runId" in value) || typeof value.runId !== "string" || value.runId.length === 0 || !("kind" in value) || value.kind !== "table" && value.kind !== "topic" || !("verdict" in value) || !isVerdict(value.verdict) || !("checks" in value) || !Array.isArray(value.checks) || !value.checks.every(isCheck) || !("operations" in value) || !Array.isArray(value.operations) || !value.operations.every(isOperation))
    throw new SloResultError("schema, verdict, checks or operation counts do not match V3");
  return {
    schemaVersion: 3,
    ref: value.ref,
    runId: value.runId,
    kind: value.kind,
    verdict: value.verdict,
    checks: value.checks,
    operations: value.operations
  };
}
function evaluateSloResult(result, expectedRef, thresholds) {
  if (result.ref !== expectedRef)
    return { id: "contract", verdict: "INVALID", detail: "Workload ref does not match the run" };
  if (result.verdict === "FAIL" || result.checks.some((check) => check.verdict === "FAIL"))
    return { id: "contract", verdict: "FAIL", detail: result.checks.filter((check) => check.verdict === "FAIL").map((check) => `${check.id}: ${check.detail}`).join("; ") || "Workload reported FAIL" };
  let required = result.kind === "table" ? ["T01", "T02"] : ["P01", "P02", "P03"], ids = result.checks.map((check) => check.id);
  if (new Set(ids).size !== ids.length || result.verdict !== "PASS" || result.checks.some((check) => check.verdict !== "PASS") || required.some((id) => !result.checks.some((check) => check.id === id && check.verdict === "PASS")))
    return { id: "contract", verdict: "INVALID", detail: "Required scenario checks are missing or invalid" };
  if (["read", "write"].some((type) => !result.operations.some((operation) => operation.type === type && operation.success > 0)))
    return { id: "contract", verdict: "INVALID", detail: "No successful read/write observations" };
  if (new Set(result.operations.map((operation) => operation.type)).size !== result.operations.length)
    return { id: "contract", verdict: "INVALID", detail: "Duplicate operation counts" };
  if (thresholds)
    for (let operation of result.operations) {
      let total = operation.success + operation.error;
      if (total === 0)
        continue;
      let check = evaluateAbsoluteThreshold(`${operation.type}_availability`, 100 * operation.success / total, "higher_is_better", thresholds);
      if (check.severity === "failure")
        return { id: "availability", verdict: "FAIL", detail: check.violations.join("; ") };
    }
  return { id: "contract", verdict: "PASS", detail: "Required workload checks passed" };
}

// shared/metrics.ts
import * as fs3 from "node:fs";
import * as path2 from "node:path";
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
function removeDisabledMetrics(config) {
  return {
    ...config,
    metrics: config.metrics.filter((metric) => !metric.disabled)
  };
}
async function loadDefaultMetricConfig() {
  debug("Loading default metrics from GITHUB_ACTION_PATH/deploy/metrics.yaml");
  let actionRoot = path2.resolve(process.env.GITHUB_ACTION_PATH), defaultPath = path2.join(actionRoot, "deploy", "metrics.yaml");
  if (fs3.existsSync(defaultPath)) {
    let content = fs3.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseMetricsYaml(content);
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
  if (customPath && fs3.existsSync(customPath)) {
    debug(`Merging custom metrics from file: ${customPath}`);
    let content = fs3.readFileSync(customPath, { encoding: "utf-8" }), customConfig = await parseMetricsYaml(content);
    if (customConfig)
      config = mergeMetricConfigs(config, customConfig);
  }
  return removeDisabledMetrics(config);
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
            role: metric.role,
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
            role: metric.role,
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

export { getContainerIp, collectComposeLogs, getComposeProfiles, waitForContainerCompletion, getPullRequestNumber, uploadArtifacts, extraArtifactsPath, collectExtraArtifacts, parseSloSummary, parseSloResult, evaluateSloResult, loadMetricConfig, safeStep, queryInstant, queryRange, collectMetricsFromPrometheus };
