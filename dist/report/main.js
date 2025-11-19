import {
  require_artifact
} from "../main-bjt997wk.js";
import {
  require_core,
  require_exec
} from "../main-777rh5c8.js";
import {
  require_github
} from "../github-kf07besq.js";
import {
  __require,
  __toESM
} from "../main-eyq3236q.js";

// report/main.ts
var import_artifact2 = __toESM(require_artifact(), 1), import_core6 = __toESM(require_core(), 1), import_github3 = __toESM(require_github(), 1);
import * as fs3 from "node:fs";
import * as path3 from "node:path";

// report/lib/metrics.ts
function parseMetricsJsonl(content) {
  let metrics = /* @__PURE__ */ new Map, lines = content.trim().split(`
`);
  for (let line of lines) {
    if (!line.trim())
      continue;
    try {
      let metric = JSON.parse(line);
      metrics.set(metric.name, metric);
    } catch {
      continue;
    }
  }
  return metrics;
}
function separateByRef(metric) {
  let current = null, base = null;
  if (metric.type === "instant") {
    let data = metric.data;
    current = data.find((s) => s.metric.ref === "current") || null, base = data.find((s) => s.metric.ref === "base") || null;
  } else {
    let data = metric.data;
    current = data.find((s) => s.metric.ref === "current") || null, base = data.find((s) => s.metric.ref === "base") || null;
  }
  return { current, base };
}
function percentile(values, p) {
  let sorted = [...values].sort((a, b) => a - b), index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}
function aggregateValues(values, fn) {
  if (values.length === 0)
    return NaN;
  let nums = values.map(([_, v]) => parseFloat(v)).filter((n) => !isNaN(n));
  if (nums.length === 0)
    return NaN;
  switch (fn) {
    case "last":
      return nums[nums.length - 1];
    case "first":
      return nums[0];
    case "avg":
      return nums.reduce((a, b) => a + b, 0) / nums.length;
    case "min":
      return Math.min(...nums);
    case "max":
      return Math.max(...nums);
    case "p50":
      return percentile(nums, 0.5);
    case "p95":
      return percentile(nums, 0.95);
    case "p99":
      return percentile(nums, 0.99);
    case "sum":
      return nums.reduce((a, b) => a + b, 0);
    case "count":
      return nums.length;
    default:
      return NaN;
  }
}
function getMetricValue(metric, ref, aggregate = "avg") {
  let separated = separateByRef(metric), series = ref === "current" ? separated.current : separated.base;
  if (!series)
    return NaN;
  if (metric.type === "instant")
    return parseFloat(series.value[1]);
  else
    return aggregateValues(series.values, aggregate);
}

// report/lib/analysis.ts
function inferMetricDirection(name) {
  let lowerName = name.toLowerCase();
  if (lowerName.includes("latency") || lowerName.includes("duration") || lowerName.includes("time") || lowerName.includes("delay") || lowerName.includes("error") || lowerName.includes("failure"))
    return "lower_is_better";
  if (lowerName.includes("availability") || lowerName.includes("throughput") || lowerName.includes("success") || lowerName.includes("qps") || lowerName.includes("rps") || lowerName.includes("ops"))
    return "higher_is_better";
  return "neutral";
}
function determineChangeDirection(currentValue, baseValue, metricDirection, neutralThreshold = 5) {
  if (isNaN(currentValue) || isNaN(baseValue))
    return "unknown";
  if (Math.abs((currentValue - baseValue) / baseValue * 100) < neutralThreshold)
    return "neutral";
  if (metricDirection === "lower_is_better")
    return currentValue < baseValue ? "better" : "worse";
  if (metricDirection === "higher_is_better")
    return currentValue > baseValue ? "better" : "worse";
  return "neutral";
}
function compareMetric(metric, aggregate = "avg", neutralThreshold) {
  let currentValue = getMetricValue(metric, "current", aggregate), baseValue = getMetricValue(metric, "base", aggregate), absolute = currentValue - baseValue, percent = isNaN(baseValue) || baseValue === 0 ? NaN : absolute / baseValue * 100, metricDirection = inferMetricDirection(metric.name), direction = determineChangeDirection(currentValue, baseValue, metricDirection, neutralThreshold);
  return {
    name: metric.name,
    type: metric.type,
    current: {
      value: currentValue,
      available: !isNaN(currentValue)
    },
    base: {
      value: baseValue,
      available: !isNaN(baseValue)
    },
    change: {
      absolute,
      percent,
      direction
    }
  };
}
function compareWorkloadMetrics(workload, metrics, aggregate = "avg", neutralThreshold) {
  let comparisons = [];
  for (let [_name, metric] of metrics) {
    let comparison = compareMetric(metric, aggregate, neutralThreshold);
    comparisons.push(comparison);
  }
  let regressions = comparisons.filter((c) => c.change.direction === "worse").length, improvements = comparisons.filter((c) => c.change.direction === "better").length, stable = comparisons.filter((c) => c.change.direction === "neutral").length;
  return {
    workload,
    metrics: comparisons,
    summary: {
      total: comparisons.length,
      regressions,
      improvements,
      stable
    }
  };
}
function formatValue(value, metricName) {
  if (isNaN(value))
    return "N/A";
  let lowerName = metricName.toLowerCase();
  if (lowerName.includes("latency") || lowerName.includes("duration") || lowerName.endsWith("_ms"))
    return `${value.toFixed(2)}ms`;
  if (lowerName.includes("time") && lowerName.endsWith("_s"))
    return `${value.toFixed(2)}s`;
  if (lowerName.includes("availability") || lowerName.includes("percent") || lowerName.includes("rate"))
    return `${value.toFixed(2)}%`;
  if (lowerName.includes("throughput") || lowerName.includes("qps") || lowerName.includes("rps") || lowerName.includes("ops")) {
    if (value >= 1000)
      return `${(value / 1000).toFixed(2)}k/s`;
    return `${value.toFixed(0)}/s`;
  }
  return value.toFixed(2);
}
function formatChange(percent, direction) {
  if (isNaN(percent))
    return "N/A";
  let sign = percent >= 0 ? "+" : "", emoji = direction === "better" ? "\uD83D\uDFE2" : direction === "worse" ? "\uD83D\uDD34" : direction === "neutral" ? "⚪" : "❓";
  return `${sign}${percent.toFixed(1)}% ${emoji}`;
}

// report/lib/artifacts.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1);
import * as fs from "node:fs";
import * as path from "node:path";

// report/lib/events.ts
function parseEventsJsonl(content) {
  let events = [], lines = content.trim().split(`
`);
  for (let line of lines) {
    if (!line.trim())
      continue;
    try {
      let event = JSON.parse(line);
      events.push(event);
    } catch {
      continue;
    }
  }
  return events;
}
function parseChaosEventsJsonl(content) {
  let events = [], lines = content.trim().split(`
`);
  for (let line of lines) {
    if (!line.trim())
      continue;
    try {
      let event = JSON.parse(line);
      events.push(event);
    } catch {
      continue;
    }
  }
  return events;
}
function getEventIcon(action, attributes) {
  let icons = {
    pause: "⏸️",
    unpause: "▶️",
    stop: "⏹️",
    start: "▶️",
    restart: "\uD83D\uDD04",
    die: "\uD83D\uDCA4",
    create: "\uD83C\uDD95",
    destroy: "\uD83D\uDDD1️"
  };
  if (action === "kill")
    return attributes?.signal === "SIGKILL" ? "\uD83D\uDC80" : "⚡";
  return icons[action] || "\uD83D\uDCCC";
}
function getChaosEventIcon(description) {
  let lower = description.toLowerCase();
  if (lower.includes("kill"))
    return "\uD83D\uDC80";
  if (lower.includes("stopping") || lower.includes("stop"))
    return "⏹️";
  if (lower.includes("starting") || lower.includes("start"))
    return "▶️";
  if (lower.includes("restart"))
    return "\uD83D\uDD04";
  if (lower.includes("paus"))
    return "⏸️";
  if (lower.includes("unpaus"))
    return "▶️";
  if (lower.includes("blackhole"))
    return "\uD83D\uDD73️";
  if (lower.includes("healthy"))
    return "✅";
  if (lower.includes("timeout") || lower.includes("warning"))
    return "⏱️";
  if (lower.includes("completed") || lower.includes("finished"))
    return "\uD83C\uDFC1";
  if (lower.includes("started") || lower.includes("starting"))
    return "\uD83C\uDFAC";
  return "\uD83D\uDCCC";
}
function getEventColor(action) {
  return {
    pause: "#f59e0b",
    unpause: "#10b981",
    stop: "#ef4444",
    start: "#10b981",
    kill: "#dc2626",
    restart: "#f59e0b",
    die: "#6b7280",
    create: "#3b82f6",
    destroy: "#ef4444"
  }[action] || "#6b7280";
}
function getChaosEventColor() {
  return "#60a5fa";
}
function formatEventLabel(event) {
  let name = event.Actor.Attributes.name || event.Actor.ID.substring(0, 12), nodeType = event.Actor.Attributes["ydb.node.type"], service = event.Actor.Attributes["com.docker.compose.service"], displayName = name;
  if (nodeType)
    displayName = `${nodeType} (${name})`;
  else if (service)
    displayName = service;
  let action = event.Action;
  if (action === "kill" && event.Actor.Attributes.signal)
    return `${action} ${displayName} (${event.Actor.Attributes.signal})`;
  return `${action} ${displayName}`;
}
function formatChaosEventLabel(event) {
  let description = event.description.replace(/ydb-/g, "");
  if (event.duration_ms) {
    let seconds = (event.duration_ms / 1000).toFixed(1);
    return `[${event.script}] ${description} (${seconds}s)`;
  }
  return `[${event.script}] ${description}`;
}
function formatEvents(events) {
  return events.map((event) => ({
    timestamp: event.time,
    action: event.Action,
    type: event.Type,
    label: formatEventLabel(event),
    icon: getEventIcon(event.Action, event.Actor.Attributes),
    color: getEventColor(event.Action),
    actor: event.Actor.Attributes.name || event.Actor.ID.substring(0, 12),
    source: "docker"
  }));
}
function formatChaosEvents(events) {
  return events.map((event) => ({
    timestamp: event.epoch_ms,
    action: "chaos",
    type: "chaos",
    label: formatChaosEventLabel(event),
    icon: getChaosEventIcon(event.description),
    color: getChaosEventColor(),
    actor: event.script,
    source: "chaos",
    duration_ms: event.duration_ms
  }));
}

// report/lib/artifacts.ts
async function downloadWorkloadArtifacts(options) {
  let artifactClient = new import_artifact.DefaultArtifactClient;
  import_core.info(`Listing artifacts for workflow run ${options.workflowRunId}...`);
  let { artifacts } = await artifactClient.listArtifacts({
    findBy: {
      token: options.token,
      workflowRunId: options.workflowRunId,
      repositoryOwner: options.repositoryOwner,
      repositoryName: options.repositoryName
    }
  });
  import_core.info(`Found ${artifacts.length} artifacts`), import_core.debug(`Artifacts: ${JSON.stringify(artifacts.map((a) => a.name), null, 2)}`);
  let downloadedPaths = /* @__PURE__ */ new Map;
  for (let artifact of artifacts) {
    import_core.info(`Downloading artifact ${artifact.name}...`);
    let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
      path: options.downloadPath,
      findBy: {
        token: options.token,
        workflowRunId: options.workflowRunId,
        repositoryOwner: options.repositoryOwner,
        repositoryName: options.repositoryName
      }
    }), artifactPath = path.join(downloadPath || options.downloadPath, artifact.name);
    downloadedPaths.set(artifact.name, artifactPath), import_core.info(`Downloaded artifact ${artifact.name} to ${artifactPath}`);
  }
  let workloadFiles = /* @__PURE__ */ new Map;
  for (let [artifactName, artifactPath] of downloadedPaths) {
    let workload = artifactName;
    if (!fs.existsSync(artifactPath)) {
      import_core.warning(`Artifact path does not exist: ${artifactPath}`);
      continue;
    }
    let stat = fs.statSync(artifactPath), files = [];
    if (stat.isDirectory())
      files = fs.readdirSync(artifactPath).map((f) => path.join(artifactPath, f));
    else
      files = [artifactPath];
    let group = workloadFiles.get(workload) || {};
    for (let file of files) {
      let basename2 = path.basename(file);
      if (basename2.endsWith("-pull.txt"))
        group.pull = file;
      else if (basename2.endsWith("-metrics.jsonl"))
        group.metrics = file;
      else if (basename2.endsWith("-chaos-events.jsonl"))
        group.chaosEvents = file;
      else if (basename2.endsWith("-events.jsonl"))
        group.events = file;
      else if (basename2.endsWith("-logs.txt"))
        group.logs = file;
    }
    workloadFiles.set(workload, group);
  }
  let workloads = [];
  for (let [workload, files] of workloadFiles) {
    if (!files.pull || !files.metrics) {
      import_core.warning(`Skipping incomplete workload ${workload}: missing required files`);
      continue;
    }
    try {
      let pullNumber = parseInt(fs.readFileSync(files.pull, { encoding: "utf-8" }).trim()), metricsContent = fs.readFileSync(files.metrics, { encoding: "utf-8" }), metrics = parseMetricsJsonl(metricsContent), events = [];
      if (files.events && fs.existsSync(files.events)) {
        let eventsContent = fs.readFileSync(files.events, { encoding: "utf-8" }), rawEvents = parseEventsJsonl(eventsContent);
        events.push(...formatEvents(rawEvents));
      }
      if (files.chaosEvents && fs.existsSync(files.chaosEvents)) {
        let chaosEventsContent = fs.readFileSync(files.chaosEvents, { encoding: "utf-8" }), rawChaosEvents = parseChaosEventsJsonl(chaosEventsContent);
        events.push(...formatChaosEvents(rawChaosEvents));
      }
      events.sort((a, b) => a.timestamp - b.timestamp), workloads.push({
        workload,
        pullNumber,
        metrics,
        events,
        logsPath: files.logs
      }), import_core.info(`Parsed workload ${workload}: ${metrics.size} metrics, ${events.length} events`);
    } catch (error) {
      import_core.warning(`Failed to parse workload ${workload}: ${String(error)}`);
      continue;
    }
  }
  return workloads;
}

// report/lib/checks.ts
var import_core3 = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);

// report/lib/thresholds.ts
var import_exec = __toESM(require_exec(), 1), import_core2 = __toESM(require_core(), 1);
import * as fs2 from "node:fs";
import * as path2 from "node:path";
import { fileURLToPath } from "node:url";
async function parseThresholdsYaml(yamlContent) {
  if (!yamlContent || yamlContent.trim() === "")
    return null;
  try {
    let chunks = [];
    await import_exec.exec("yq", ["-o=json", "."], {
      input: Buffer.from(yamlContent, "utf-8"),
      silent: !0,
      listeners: {
        stdout: (data) => chunks.push(data.toString())
      }
    });
    let json = chunks.join("");
    return JSON.parse(json);
  } catch (error) {
    return import_core2.warning(`Failed to parse thresholds YAML: ${String(error)}`), null;
  }
}
function mergeThresholdConfigs(defaultConfig, customConfig) {
  return {
    neutral_change_percent: customConfig.neutral_change_percent ?? defaultConfig.neutral_change_percent,
    default: {
      warning_change_percent: customConfig.default?.warning_change_percent ?? defaultConfig.default.warning_change_percent,
      critical_change_percent: customConfig.default?.critical_change_percent ?? defaultConfig.default.critical_change_percent
    },
    metrics: [...customConfig.metrics || [], ...defaultConfig.metrics || []]
  };
}
async function loadDefaultThresholds() {
  import_core2.debug("Loading default thresholds from deploy/thresholds.yaml");
  let actionRoot = path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), "../../"), defaultPath = path2.join(actionRoot, "deploy", "thresholds.yaml");
  if (fs2.existsSync(defaultPath)) {
    let content = fs2.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseThresholdsYaml(content);
    if (config)
      return config;
  }
  return import_core2.warning("Could not load default thresholds, using hardcoded defaults"), {
    neutral_change_percent: 5,
    default: {
      warning_change_percent: 20,
      critical_change_percent: 50
    }
  };
}
async function loadThresholds(customYaml, customPath) {
  let config = await loadDefaultThresholds();
  if (customYaml) {
    import_core2.debug("Merging custom thresholds from inline YAML");
    let customConfig = await parseThresholdsYaml(customYaml);
    if (customConfig)
      config = mergeThresholdConfigs(config, customConfig);
  }
  if (customPath && fs2.existsSync(customPath)) {
    import_core2.debug(`Merging custom thresholds from file: ${customPath}`);
    let content = fs2.readFileSync(customPath, { encoding: "utf-8" }), customConfig = await parseThresholdsYaml(content);
    if (customConfig)
      config = mergeThresholdConfigs(config, customConfig);
  }
  return config;
}
function matchPattern(metricName, pattern) {
  let regexPattern = pattern.replace(/\*/g, ".*").replace(/\?/g, ".");
  return new RegExp(`^${regexPattern}$`, "i").test(metricName);
}
function findMatchingThreshold(metricName, config) {
  if (!config.metrics)
    return null;
  for (let threshold of config.metrics)
    if (threshold.name && threshold.name === metricName)
      return threshold;
  for (let threshold of config.metrics)
    if (threshold.pattern && matchPattern(metricName, threshold.pattern))
      return threshold;
  return null;
}
function evaluateThreshold(comparison, config) {
  if (!comparison.base.available)
    return "success";
  let threshold = findMatchingThreshold(comparison.name, config);
  if (threshold) {
    if (threshold.critical_min !== void 0 && comparison.current.value < threshold.critical_min)
      return import_core2.debug(`${comparison.name}: below critical_min (${comparison.current.value} < ${threshold.critical_min})`), "failure";
    if (threshold.warning_min !== void 0 && comparison.current.value < threshold.warning_min)
      return import_core2.debug(`${comparison.name}: below warning_min (${comparison.current.value} < ${threshold.warning_min})`), "warning";
    if (threshold.critical_max !== void 0 && comparison.current.value > threshold.critical_max)
      return import_core2.debug(`${comparison.name}: above critical_max (${comparison.current.value} > ${threshold.critical_max})`), "failure";
    if (threshold.warning_max !== void 0 && comparison.current.value > threshold.warning_max)
      return import_core2.debug(`${comparison.name}: above warning_max (${comparison.current.value} > ${threshold.warning_max})`), "warning";
  }
  if (!isNaN(comparison.change.percent)) {
    let changePercent = Math.abs(comparison.change.percent), warningThreshold = threshold?.warning_change_percent ?? config.default.warning_change_percent, criticalThreshold = threshold?.critical_change_percent ?? config.default.critical_change_percent;
    if (comparison.change.direction === "worse") {
      if (changePercent > criticalThreshold)
        return import_core2.debug(`${comparison.name}: critical regression (${changePercent.toFixed(1)}% > ${criticalThreshold}%)`), "failure";
      if (changePercent > warningThreshold)
        return import_core2.debug(`${comparison.name}: warning regression (${changePercent.toFixed(1)}% > ${warningThreshold}%)`), "warning";
    }
  }
  return "success";
}
function evaluateWorkloadThresholds(comparisons, config) {
  let failures = [], warnings = [];
  for (let comparison of comparisons) {
    let severity = evaluateThreshold(comparison, config);
    if (severity === "failure")
      failures.push(comparison);
    else if (severity === "warning")
      warnings.push(comparison);
  }
  let overall = "success";
  if (failures.length > 0)
    overall = "failure";
  else if (warnings.length > 0)
    overall = "warning";
  return { overall, failures, warnings };
}

// report/lib/checks.ts
async function createWorkloadCheck(options) {
  let octokit = import_github.getOctokit(options.token), name = `SLO: ${options.workload.workload}`, evaluation = evaluateWorkloadThresholds(options.workload.metrics, options.thresholds), conclusion = determineConclusionFromEvaluation(evaluation.overall), title = generateTitle(options.workload, evaluation), summaryText = generateSummary(options.workload, evaluation, options.reportUrl);
  import_core3.info(`Creating check "${name}" with conclusion: ${conclusion}`);
  let { data } = await octokit.rest.checks.create({
    owner: options.owner,
    repo: options.repo,
    name,
    head_sha: options.sha,
    status: "completed",
    conclusion,
    output: {
      title,
      summary: summaryText
    }
  });
  return import_core3.info(`Check created: ${data.html_url}`), { id: data.id, url: data.html_url };
}
function determineConclusionFromEvaluation(severity) {
  if (severity === "failure")
    return "failure";
  if (severity === "warning")
    return "neutral";
  return "success";
}
function generateTitle(workload, evaluation) {
  if (evaluation.failures.length > 0)
    return `${evaluation.failures.length} critical threshold(s) violated`;
  if (evaluation.warnings.length > 0)
    return `${evaluation.warnings.length} warning threshold(s) exceeded`;
  if (workload.summary.improvements > 0)
    return `${workload.summary.improvements} improvement(s) detected`;
  return "All metrics within thresholds";
}
function generateSummary(workload, evaluation, reportUrl) {
  let lines = [
    `**Metrics analyzed:** ${workload.summary.total}`,
    `- \uD83D\uDD34 Critical: ${evaluation.failures.length}`,
    `- \uD83D\uDFE1 Warnings: ${evaluation.warnings.length}`,
    `- \uD83D\uDFE2 Improvements: ${workload.summary.improvements}`,
    `- ⚪ Stable: ${workload.summary.stable}`,
    ""
  ];
  if (reportUrl)
    lines.push(`\uD83D\uDCCA [View detailed HTML report](${reportUrl})`, "");
  if (evaluation.failures.length > 0) {
    lines.push("### ❌ Critical Thresholds Violated", "");
    for (let metric of evaluation.failures.slice(0, 5))
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`);
    lines.push("");
  }
  if (evaluation.warnings.length > 0) {
    lines.push("### ⚠️ Warning Thresholds Exceeded", "");
    for (let metric of evaluation.warnings.slice(0, 5))
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`);
    lines.push("");
  }
  let improvements = workload.metrics.filter((m) => m.change.direction === "better").sort((a, b) => Math.abs(b.change.percent) - Math.abs(a.change.percent));
  if (improvements.length > 0) {
    lines.push("### \uD83D\uDFE2 Top Improvements", "");
    for (let metric of improvements.slice(0, 5))
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`);
  }
  return lines.join(`
`);
}

// report/lib/comment.ts
var import_core4 = __toESM(require_core(), 1), import_github2 = __toESM(require_github(), 1);
function generateCommentBody(data) {
  let totalRegressions = data.workloads.reduce((sum, w) => sum + w.summary.regressions, 0), totalImprovements = data.workloads.reduce((sum, w) => sum + w.summary.improvements, 0), statusEmoji = totalRegressions > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2", statusText = totalRegressions > 0 ? `${totalRegressions} regressions` : "All clear", header = `## \uD83C\uDF0B SLO Test Results

**Status**: ${statusEmoji} ${data.workloads.length} workloads tested • ${statusText}

${data.jobSummaryUrl ? `\uD83D\uDCC8 [View Job Summary](${data.jobSummaryUrl}) for detailed comparison
` : ""}`, table = `
| Workload | Metrics | Regressions | Improvements | Links |
|----------|---------|-------------|--------------|-------|
${data.workloads.map((w) => {
    let emoji = w.summary.regressions > 0 ? "\uD83D\uDFE1" : w.summary.improvements > 0 ? "\uD83D\uDFE2" : "⚪", reportLink = data.artifactUrls.get(w.workload) || "#", checkLink = data.checkUrls.get(w.workload) || "#";
    return `| ${emoji} ${w.workload} | ${w.summary.total} | ${w.summary.regressions} | ${w.summary.improvements} | [Report](${reportLink}) • [Check](${checkLink}) |`;
  }).join(`
`)}
`, footer = `
---
*Generated by [ydb-slo-action](https://github.com/ydb-platform/ydb-slo-action)*`;
  return header + table + footer;
}
async function findExistingSLOComment(token, owner, repo, prNumber) {
  let octokit = import_github2.getOctokit(token);
  import_core4.info(`Searching for existing SLO comment in PR #${prNumber}...`);
  let { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });
  for (let comment of comments)
    if (comment.body?.includes("\uD83C\uDF0B SLO Test Results"))
      return import_core4.info(`Found existing comment: ${comment.id}`), comment.id;
  return null;
}
async function createOrUpdateComment(token, owner, repo, prNumber, body) {
  let octokit = import_github2.getOctokit(token), existingId = await findExistingSLOComment(token, owner, repo, prNumber);
  if (existingId) {
    import_core4.info(`Updating existing comment ${existingId}...`);
    let { data } = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body
    });
    return import_core4.info(`Comment updated: ${data.html_url}`), { url: data.html_url, id: data.id };
  } else {
    import_core4.info("Creating new comment...");
    let { data } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
    return import_core4.info(`Comment created: ${data.html_url}`), { url: data.html_url, id: data.id };
  }
}

// report/lib/html.ts
function generateHTMLReport(data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>SLO Report: ${escapeHtml(data.workload)}</title>
	<style>${getStyles()}</style>
</head>
<body>
	<header>
		<h1>\uD83C\uDF0B SLO Report: ${escapeHtml(data.workload)}</h1>
		<div class="commit-info">
			<span class="commit current">
				Current: <a href="${data.commits.current.url}" target="_blank">${data.commits.current.short}</a>
			</span>
			<span class="vs">vs</span>
			<span class="commit base">
				Base: <a href="${data.commits.base.url}" target="_blank">${data.commits.base.short}</a>
			</span>
		</div>
		<div class="meta">
			<span>PR #${data.meta.prNumber}</span>
			${data.meta.testDuration ? `<span>Duration: ${data.meta.testDuration}</span>` : ""}
			<span>Generated: ${data.meta.generatedAt}</span>
		</div>
	</header>

	<section class="summary">
		<h2>\uD83D\uDCCA Metrics Overview</h2>
		<div class="stats">
			<div class="stat-card">
				<div class="stat-value">${data.comparison.summary.total}</div>
				<div class="stat-label">Total Metrics</div>
			</div>
			<div class="stat-card improvements">
				<div class="stat-value">${data.comparison.summary.improvements}</div>
				<div class="stat-label">Improvements</div>
			</div>
			<div class="stat-card regressions">
				<div class="stat-value">${data.comparison.summary.regressions}</div>
				<div class="stat-label">Regressions</div>
			</div>
			<div class="stat-card stable">
				<div class="stat-value">${data.comparison.summary.stable}</div>
				<div class="stat-label">Stable</div>
			</div>
		</div>
		${generateComparisonTable(data.comparison)}
	</section>

	<section class="charts">
		<h2>\uD83D\uDCC8 Time Series</h2>
		${generateCharts(data)}
	</section>

	${data.events.length > 0 ? generateEventsSection(data.events) : ""}

	<footer>
		<p>Generated by <a href="https://github.com/ydb-platform/ydb-slo-action" target="_blank">ydb-slo-action</a></p>
	</footer>

	<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns@3.0.0/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js"></script>
	<script>
		${generateChartScripts(data)}
	</script>
</body>
</html>`;
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function generateComparisonTable(comparison) {
  return `
		<table class="comparison-table">
			<thead>
				<tr>
					<th>Metric</th>
					<th>Current</th>
					<th>Base</th>
					<th>Change</th>
				</tr>
			</thead>
			<tbody>
				${comparison.metrics.map((m) => `
		<tr class="${m.change.direction}">
			<td>${escapeHtml(m.name)}</td>
			<td>${formatValue(m.current.value, m.name)}</td>
			<td>${m.base.available ? formatValue(m.base.value, m.name) : "N/A"}</td>
			<td class="change-cell">${m.base.available ? formatChange(m.change.percent, m.change.direction) : "N/A"}</td>
		</tr>
	`).join("")}
			</tbody>
		</table>
	`;
}
function generateCharts(data) {
  return data.comparison.metrics.filter((m) => m.type === "range").map((comparison) => {
    if (!data.metrics.get(comparison.name))
      return "";
    return `
		<div class="chart-card">
			<div class="chart-header">
				<h3>
					${escapeHtml(comparison.name)}
					<span class="indicator ${comparison.change.direction}">${formatChange(comparison.change.percent, comparison.change.direction)}</span>
				</h3>
				<div class="chart-meta">
					Current: ${formatValue(comparison.current.value, comparison.name)}
					${comparison.base.available ? ` • Base: ${formatValue(comparison.base.value, comparison.name)}` : ""}
				</div>
			</div>
			<div class="chart-container">
				<canvas id="chart-${sanitizeId(comparison.name)}"></canvas>
			</div>
		</div>
	`;
  }).join("");
}
function generateEventsSection(events) {
  return `
	<section class="events-section">
		<h2>\uD83D\uDCCD Events Timeline</h2>
		<div class="events-list">
			${events.map((e) => `
		<div class="event-item">
			<span class="event-marker" style="background-color: ${e.color}"></span>
			<span class="event-icon">${e.icon}</span>
			<span class="event-time">${formatTimestamp(e.timestamp)}</span>
			<span class="event-label">${escapeHtml(e.label)}</span>
		</div>
	`).join("")}
		</div>
	</section>
	`;
}
function generateChartScripts(data) {
  return data.comparison.metrics.filter((m) => m.type === "range").map((comparison) => {
    let metric = data.metrics.get(comparison.name);
    if (!metric)
      return "";
    return generateSingleChartScript(comparison.name, metric, data.events);
  }).join(`
`);
}
function generateSingleChartScript(metricName, metric, events) {
  let currentSeries = metric.data.find((s) => s.metric.ref === "current"), baseSeries = metric.data.find((s) => s.metric.ref === "base"), currentData = currentSeries ? JSON.stringify(currentSeries.values.map(([t, v]) => ({ x: t * 1000, y: parseFloat(v) }))) : "[]", baseData = baseSeries ? JSON.stringify(baseSeries.values.map(([t, v]) => ({ x: t * 1000, y: parseFloat(v) }))) : "[]", annotations = events.map((e) => {
    if (e.duration_ms) {
      let xMax = e.timestamp * 1000 + e.duration_ms;
      return `{
			type: 'box',
			xMin: ${e.timestamp * 1000},
			xMax: ${xMax},
			backgroundColor: '#60a5fa20',
			borderColor: '#3b82f6',
			borderWidth: 3,
			label: {
				display: true,
				content: '${escapeJs(e.label)}',
				position: 'start',
				backgroundColor: '#3b82f6',
				color: '#fff',
				font: { size: 12 },
				padding: 6
			}
		}`;
    } else
      return `{
			type: 'line',
			xMin: ${e.timestamp * 1000},
			xMax: ${e.timestamp * 1000},
			borderColor: '#3b82f6',
			borderWidth: 3,
			label: {
				display: true,
				content: '${e.icon}',
				position: 'start',
				backgroundColor: '#3b82f6',
				color: '#fff',
				font: { size: 14 },
				padding: 4
			}
		}`;
  }).join(`,
`);
  return `
(function() {
	const ctx = document.getElementById('chart-${sanitizeId(metricName)}');
	if (!ctx) return;

	new Chart(ctx, {
		type: 'line',
		data: {
			datasets: [
				{
					label: 'Current',
					data: ${currentData},
					borderColor: '#3b82f6',
					backgroundColor: '#3b82f620',
					borderWidth: 2,
					pointRadius: 2,
					pointHoverRadius: 4,
					tension: 0.1,
					fill: true
				},
				${baseSeries ? `{
					label: 'Base',
					data: ${baseData},
					borderColor: '#94a3b8',
					backgroundColor: '#94a3b820',
					borderWidth: 2,
					borderDash: [5, 5],
					pointRadius: 2,
					pointHoverRadius: 4,
					tension: 0.1,
					fill: true
				}` : ""}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			interaction: {
				mode: 'index',
				intersect: false
			},
			scales: {
				x: {
					type: 'time',
					time: {
						unit: 'minute',
						displayFormats: {
							minute: 'HH:mm'
						}
					},
					title: {
						display: true,
						text: 'Time'
					}
				},
				y: {
					beginAtZero: false,
					title: {
						display: true,
						text: '${escapeJs(metricName)}'
					}
				}
			},
			plugins: {
				legend: {
					display: true,
					position: 'top'
				},
				tooltip: {
					mode: 'index',
					intersect: false
				},
				annotation: {
					annotations: [${annotations}]
				}
			}
		}
	});
})();
`;
}
function sanitizeId(str) {
  return str.replace(/[^a-zA-Z0-9]/g, "-");
}
function escapeJs(str) {
  return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "\\\"").replace(/\n/g, "\\n");
}
function formatTimestamp(timestamp) {
  return new Date(timestamp * 1000).toISOString().substring(11, 19);
}
function getStyles() {
  return `
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
	line-height: 1.6;
	color: #24292f;
	background: #ffffff;
	padding: 20px;
}

@media (prefers-color-scheme: dark) {
	body {
		background: #0d1117;
		color: #c9d1d9;
	}
}

header {
	max-width: 1200px;
	margin: 0 auto 40px;
	padding: 30px;
	background: #f6f8fa;
	border-radius: 8px;
	border: 1px solid #d0d7de;
}

@media (prefers-color-scheme: dark) {
	header {
		background: #161b22;
		border-color: #30363d;
	}
}

header h1 {
	font-size: 32px;
	margin-bottom: 15px;
}

.commit-info {
	font-size: 16px;
	margin-bottom: 10px;
	display: flex;
	align-items: center;
	gap: 15px;
	flex-wrap: wrap;
}

.commit {
	padding: 4px 8px;
	border-radius: 4px;
	font-family: 'Courier New', monospace;
	font-size: 14px;
}

.commit.current {
	background: #dff6dd;
	color: #1a7f37;
}

.commit.base {
	background: #ddf4ff;
	color: #0969da;
}

@media (prefers-color-scheme: dark) {
	.commit.current {
		background: #033a16;
		color: #3fb950;
	}
	.commit.base {
		background: #0c2d6b;
		color: #58a6ff;
	}
}

.commit a {
	color: inherit;
	text-decoration: none;
	font-weight: 600;
}

.commit a:hover {
	text-decoration: underline;
}

.vs {
	color: #6e7781;
	font-weight: 600;
}

.meta {
	font-size: 14px;
	color: #6e7781;
	display: flex;
	gap: 15px;
	flex-wrap: wrap;
}

section {
	max-width: 1200px;
	margin: 0 auto 40px;
}

section h2 {
	font-size: 24px;
	margin-bottom: 20px;
	border-bottom: 1px solid #d0d7de;
	padding-bottom: 10px;
}

@media (prefers-color-scheme: dark) {
	section h2 {
		border-color: #30363d;
	}
}

.stats {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	gap: 15px;
	margin-bottom: 30px;
}

.stat-card {
	padding: 20px;
	background: #f6f8fa;
	border-radius: 8px;
	border: 2px solid #d0d7de;
	text-align: center;
}

.stat-card.improvements {
	border-color: #1a7f37;
}

.stat-card.regressions {
	border-color: #cf222e;
}

.stat-card.stable {
	border-color: #6e7781;
}

@media (prefers-color-scheme: dark) {
	.stat-card {
		background: #161b22;
		border-color: #30363d;
	}
	.stat-card.improvements {
		border-color: #3fb950;
	}
	.stat-card.regressions {
		border-color: #f85149;
	}
	.stat-card.stable {
		border-color: #8b949e;
	}
}

.stat-value {
	font-size: 36px;
	font-weight: 700;
	margin-bottom: 5px;
}

.stat-label {
	font-size: 14px;
	color: #6e7781;
	font-weight: 500;
}

.comparison-table {
	width: 100%;
	border-collapse: collapse;
	background: #ffffff;
	border: 1px solid #d0d7de;
	border-radius: 8px;
	overflow: hidden;
}

@media (prefers-color-scheme: dark) {
	.comparison-table {
		background: #0d1117;
		border-color: #30363d;
	}
}

.comparison-table th,
.comparison-table td {
	padding: 12px 16px;
	text-align: left;
	border-bottom: 1px solid #d0d7de;
}

@media (prefers-color-scheme: dark) {
	.comparison-table th,
	.comparison-table td {
		border-color: #30363d;
	}
}

.comparison-table th {
	background: #f6f8fa;
	font-weight: 600;
	font-size: 14px;
}

@media (prefers-color-scheme: dark) {
	.comparison-table th {
		background: #161b22;
	}
}

.comparison-table tr:last-child td {
	border-bottom: none;
}

.comparison-table tr.better {
	background: #dff6dd20;
}

.comparison-table tr.worse {
	background: #ffebe920;
}

@media (prefers-color-scheme: dark) {
	.comparison-table tr.better {
		background: #033a1620;
	}
	.comparison-table tr.worse {
		background: #86181d20;
	}
}

.change-cell {
	font-weight: 600;
}

.chart-card {
	margin-bottom: 40px;
	background: #ffffff;
	border: 1px solid #d0d7de;
	border-radius: 8px;
	padding: 20px;
}

@media (prefers-color-scheme: dark) {
	.chart-card {
		background: #0d1117;
		border-color: #30363d;
	}
}

.chart-header {
	margin-bottom: 15px;
}

.chart-header h3 {
	font-size: 18px;
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
}

.indicator {
	font-size: 14px;
	padding: 4px 8px;
	border-radius: 4px;
	font-weight: 600;
}

.indicator.better {
	background: #dff6dd;
	color: #1a7f37;
}

.indicator.worse {
	background: #ffebe9;
	color: #cf222e;
}

.indicator.neutral {
	background: #f6f8fa;
	color: #6e7781;
}

@media (prefers-color-scheme: dark) {
	.indicator.better {
		background: #033a16;
		color: #3fb950;
	}
	.indicator.worse {
		background: #86181d;
		color: #ff7b72;
	}
	.indicator.neutral {
		background: #161b22;
		color: #8b949e;
	}
}

.chart-meta {
	font-size: 14px;
	color: #6e7781;
	margin-top: 5px;
}

.chart-container {
	position: relative;
	height: 400px;
}

.events-section {
	max-width: 1200px;
	margin: 40px auto;
}

.events-list {
	display: flex;
	flex-direction: column;
	gap: 10px;
}

.event-item {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 10px;
	background: #f6f8fa;
	border-radius: 6px;
	border-left: 3px solid #d0d7de;
}

@media (prefers-color-scheme: dark) {
	.event-item {
		background: #161b22;
		border-color: #30363d;
	}
}

.event-marker {
	width: 12px;
	height: 12px;
	border-radius: 50%;
}

.event-icon {
	font-size: 18px;
}

.event-time {
	font-family: 'Courier New', monospace;
	font-size: 14px;
	color: #6e7781;
	min-width: 80px;
}

.event-label {
	font-size: 14px;
	flex: 1;
}

footer {
	max-width: 1200px;
	margin: 60px auto 20px;
	text-align: center;
	color: #6e7781;
	font-size: 14px;
	padding-top: 20px;
	border-top: 1px solid #d0d7de;
}

@media (prefers-color-scheme: dark) {
	footer {
		border-color: #30363d;
	}
}

footer a {
	color: #0969da;
	text-decoration: none;
}

footer a:hover {
	text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
	footer a {
		color: #58a6ff;
	}
}

@media (max-width: 768px) {
	body {
		padding: 10px;
	}

	header h1 {
		font-size: 24px;
	}

	.chart-container {
		height: 300px;
	}

	.stats {
		grid-template-columns: repeat(2, 1fr);
	}
}
`;
}

// report/lib/summary.ts
var import_core5 = __toESM(require_core(), 1);
async function writeJobSummary(data) {
  import_core5.summary.addHeading("\uD83C\uDF0B SLO Test Summary", 1), import_core5.summary.addRaw(`
<p>
	<strong>Current:</strong> <a href="${data.commits.current.url}">${data.commits.current.short}</a>
	vs
	<strong>Base:</strong> <a href="${data.commits.base.url}">${data.commits.base.short}</a>
</p>
	`), import_core5.summary.addBreak();
  let totalMetrics = data.workloads.reduce((sum, w) => sum + w.summary.total, 0), totalRegressions = data.workloads.reduce((sum, w) => sum + w.summary.regressions, 0), totalImprovements = data.workloads.reduce((sum, w) => sum + w.summary.improvements, 0), totalStable = data.workloads.reduce((sum, w) => sum + w.summary.stable, 0);
  import_core5.summary.addRaw(`
<table>
	<tr>
		<td><strong>${data.workloads.length}</strong> workloads</td>
		<td><strong>${totalMetrics}</strong> metrics</td>
		<td><strong style="color: #1a7f37;">${totalImprovements}</strong> improvements</td>
		<td><strong style="color: #cf222e;">${totalRegressions}</strong> regressions</td>
		<td><strong style="color: #6e7781;">${totalStable}</strong> stable</td>
	</tr>
</table>
	`), import_core5.summary.addBreak();
  for (let workload of data.workloads) {
    let statusEmoji = workload.summary.regressions > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2", artifactUrl = data.artifactUrls?.get(workload.workload);
    if (import_core5.summary.addHeading(`${statusEmoji} ${workload.workload}`, 3), artifactUrl)
      import_core5.summary.addRaw(`<p><a href="${artifactUrl}">\uD83D\uDCCA View detailed HTML report</a></p>`);
    import_core5.summary.addTable([
      [
        { data: "Metric", header: !0 },
        { data: "Current", header: !0 },
        { data: "Base", header: !0 },
        { data: "Change", header: !0 }
      ],
      ...workload.metrics.map((m) => [
        m.name,
        formatValue(m.current.value, m.name),
        m.base.available ? formatValue(m.base.value, m.name) : "N/A",
        m.base.available ? formatChange(m.change.percent, m.change.direction) : "N/A"
      ])
    ]), import_core5.summary.addBreak();
  }
  await import_core5.summary.write();
}

// report/main.ts
async function main() {
  try {
    let cwd = path3.join(process.cwd(), ".slo-reports"), token = import_core6.getInput("github_token") || import_core6.getInput("token"), runId = parseInt(import_core6.getInput("github_run_id") || import_core6.getInput("run_id") || String(import_github3.context.runId));
    if (!token) {
      import_core6.setFailed("github_token is required");
      return;
    }
    fs3.mkdirSync(cwd, { recursive: !0 }), import_core6.info(`Working directory: ${cwd}`), import_core6.info("\uD83D\uDCE6 Downloading artifacts from current run...");
    let workloads = await downloadWorkloadArtifacts({
      token,
      workflowRunId: runId,
      repositoryOwner: import_github3.context.repo.owner,
      repositoryName: import_github3.context.repo.repo,
      downloadPath: cwd
    });
    if (workloads.length === 0) {
      import_core6.warning("No workload artifacts found in current run");
      return;
    }
    import_core6.info(`Found ${workloads.length} workloads: ${workloads.map((w) => w.workload).join(", ")}`);
    let prNumber = workloads[0]?.pullNumber;
    if (!prNumber) {
      import_core6.setFailed("Pull request number not found in artifacts");
      return;
    }
    import_core6.info(`Processing PR #${prNumber}`);
    let { getOctokit: getOctokit3 } = await import("../github-kf07besq.js"), octokit = getOctokit3(token);
    import_core6.info("Fetching PR information...");
    let { data: pr } = await octokit.rest.pulls.get({
      owner: import_github3.context.repo.owner,
      repo: import_github3.context.repo.repo,
      pull_number: prNumber
    });
    import_core6.info(`PR: ${pr.title}`), import_core6.info(`Base branch: ${pr.base.ref}`), import_core6.info(`Head SHA: ${pr.head.sha}`), import_core6.info("⚙️  Loading thresholds configuration...");
    let thresholds = await loadThresholds(import_core6.getInput("thresholds_yaml"), import_core6.getInput("thresholds_yaml_path"));
    import_core6.info(`Loaded thresholds: neutral_change=${thresholds.neutral_change_percent}%`), import_core6.info("\uD83D\uDCCA Analyzing metrics...");
    let comparisons = workloads.map((w) => compareWorkloadMetrics(w.workload, w.metrics, "avg", thresholds.neutral_change_percent));
    import_core6.info("\uD83D\uDCDD Generating HTML reports...");
    let htmlReportsPath = path3.join(cwd, "reports");
    fs3.mkdirSync(htmlReportsPath, { recursive: !0 });
    let htmlFiles = [];
    for (let i = 0;i < workloads.length; i++) {
      let workload = workloads[i], comparison = comparisons[i], htmlData = {
        workload: workload.workload,
        comparison,
        metrics: workload.metrics,
        events: workload.events,
        commits: {
          current: {
            sha: pr.head.sha,
            url: `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/commit/${pr.head.sha}`,
            short: pr.head.sha.substring(0, 7)
          },
          base: {
            sha: pr.base.sha,
            url: `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/commit/${pr.base.sha}`,
            short: pr.base.sha.substring(0, 7)
          }
        },
        meta: {
          prNumber,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }, html = generateHTMLReport(htmlData), htmlPath = path3.join(htmlReportsPath, `${workload.workload}-report.html`);
      fs3.writeFileSync(htmlPath, html, { encoding: "utf-8" }), htmlFiles.push({ workload: workload.workload, path: htmlPath }), import_core6.info(`Generated HTML report for ${workload.workload}`);
    }
    import_core6.info("\uD83D\uDCE4 Uploading HTML reports...");
    let uploadResult = await new import_artifact2.DefaultArtifactClient().uploadArtifact("slo-reports", htmlFiles.map((f) => f.path), htmlReportsPath, {
      retentionDays: 30
    });
    import_core6.info(`Uploaded HTML reports as artifact: ${uploadResult.id}`), import_core6.info("✅ Creating GitHub Checks...");
    let checkUrls = /* @__PURE__ */ new Map;
    for (let comparison of comparisons)
      try {
        let check = await createWorkloadCheck({
          token,
          owner: import_github3.context.repo.owner,
          repo: import_github3.context.repo.repo,
          sha: pr.head.sha,
          workload: comparison,
          thresholds
        });
        checkUrls.set(comparison.workload, check.url), import_core6.info(`Created check for ${comparison.workload}: ${check.url}`);
      } catch (error) {
        import_core6.warning(`Failed to create check for ${comparison.workload}: ${String(error)}`);
      }
    import_core6.info("\uD83D\uDCCB Writing Job Summary..."), await writeJobSummary({
      workloads: comparisons,
      commits: {
        current: {
          sha: pr.head.sha,
          url: `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/commit/${pr.head.sha}`,
          short: pr.head.sha.substring(0, 7)
        },
        base: {
          sha: pr.base.sha,
          url: `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/commit/${pr.base.sha}`,
          short: pr.base.sha.substring(0, 7)
        }
      }
    }), import_core6.info("Job Summary written"), import_core6.info("\uD83D\uDCAC Creating/updating PR comment...");
    let artifactUrls = /* @__PURE__ */ new Map, artifactBaseUrl = `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/actions/runs/${runId}/artifacts/${uploadResult.id}`;
    for (let file of htmlFiles)
      artifactUrls.set(file.workload, artifactBaseUrl);
    let commentBody = generateCommentBody({
      workloads: comparisons,
      artifactUrls,
      checkUrls,
      jobSummaryUrl: `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/actions/runs/${runId}`
    }), comment = await createOrUpdateComment(token, import_github3.context.repo.owner, import_github3.context.repo.repo, prNumber, commentBody);
    import_core6.info(`PR comment: ${comment.url}`), import_core6.info("✅ Report generation completed successfully!");
  } catch (error) {
    throw import_core6.setFailed(`Report generation failed: ${String(error)}`), error;
  }
}
main();

//# debugId=1015D54E8114DF2464756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9tZXRyaWNzLnRzIiwgIi4uL3JlcG9ydC9saWIvYW5hbHlzaXMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIiwgIi4uL3JlcG9ydC9saWIvY29tbWVudC50cyIsICIuLi9yZXBvcnQvbGliL2h0bWwudHMiLCAiLi4vcmVwb3J0L2xpYi9zdW1tYXJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgIi8qKlxuICogU0xPIFJlcG9ydCBBY3Rpb24gLSBNYWluIE9yY2hlc3RyYXRvclxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBnZXRJbnB1dCwgaW5mbywgc2V0RmFpbGVkLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmltcG9ydCB7IGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MgfSBmcm9tICcuL2xpYi9hbmFseXNpcy5qcydcbmltcG9ydCB7IGRvd25sb2FkV29ya2xvYWRBcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBjcmVhdGVXb3JrbG9hZENoZWNrIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyB3cml0ZUpvYlN1bW1hcnkgfSBmcm9tICcuL2xpYi9zdW1tYXJ5LmpzJ1xuaW1wb3J0IHsgbG9hZFRocmVzaG9sZHMgfSBmcm9tICcuL2xpYi90aHJlc2hvbGRzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHR0cnkge1xuXHRcdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8tcmVwb3J0cycpXG5cdFx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IGdldElucHV0KCd0b2tlbicpXG5cdFx0bGV0IHJ1bklkID0gcGFyc2VJbnQoZ2V0SW5wdXQoJ2dpdGh1Yl9ydW5faWQnKSB8fCBnZXRJbnB1dCgncnVuX2lkJykgfHwgU3RyaW5nKGNvbnRleHQucnVuSWQpKVxuXG5cdFx0aWYgKCF0b2tlbikge1xuXHRcdFx0c2V0RmFpbGVkKCdnaXRodWJfdG9rZW4gaXMgcmVxdWlyZWQnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblx0XHRpbmZvKGBXb3JraW5nIGRpcmVjdG9yeTogJHtjd2R9YClcblxuXHRcdC8vIFN0ZXAgMTogRG93bmxvYWQgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW5cblx0XHQvLyBOT1RFOiBBcnRpZmFjdHMgYWxyZWFkeSBjb250YWluIGJvdGggY3VycmVudCBhbmQgYmFzZSBzZXJpZXMgKGNvbGxlY3RlZCBpbiBpbml0IGFjdGlvbilcblx0XHRpbmZvKCfwn5OmIERvd25sb2FkaW5nIGFydGlmYWN0cyBmcm9tIGN1cnJlbnQgcnVuLi4uJylcblx0XHRsZXQgd29ya2xvYWRzID0gYXdhaXQgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyh7XG5cdFx0XHR0b2tlbixcblx0XHRcdHdvcmtmbG93UnVuSWQ6IHJ1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRkb3dubG9hZFBhdGg6IGN3ZCxcblx0XHR9KVxuXG5cdFx0aWYgKHdvcmtsb2Fkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHdhcm5pbmcoJ05vIHdvcmtsb2FkIGFydGlmYWN0cyBmb3VuZCBpbiBjdXJyZW50IHJ1bicpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRpbmZvKGBGb3VuZCAke3dvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkczogJHt3b3JrbG9hZHMubWFwKCh3KSA9PiB3Lndvcmtsb2FkKS5qb2luKCcsICcpfWApXG5cblx0XHQvLyBTdGVwIDI6IEdldCBQUiBpbmZvcm1hdGlvblxuXHRcdGxldCBwck51bWJlciA9IHdvcmtsb2Fkc1swXT8ucHVsbE51bWJlclxuXHRcdGlmICghcHJOdW1iZXIpIHtcblx0XHRcdHNldEZhaWxlZCgnUHVsbCByZXF1ZXN0IG51bWJlciBub3QgZm91bmQgaW4gYXJ0aWZhY3RzJylcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGluZm8oYFByb2Nlc3NpbmcgUFIgIyR7cHJOdW1iZXJ9YClcblxuXHRcdC8vIEdldCBQUiBkZXRhaWxzIGZvciBjb21taXQgaW5mb1xuXHRcdGxldCB7IGdldE9jdG9raXQgfSA9IGF3YWl0IGltcG9ydCgnQGFjdGlvbnMvZ2l0aHViJylcblx0XHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQodG9rZW4pXG5cblx0XHRpbmZvKCdGZXRjaGluZyBQUiBpbmZvcm1hdGlvbi4uLicpXG5cdFx0bGV0IHsgZGF0YTogcHIgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5wdWxscy5nZXQoe1xuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0cHVsbF9udW1iZXI6IHByTnVtYmVyLFxuXHRcdH0pXG5cblx0XHRpbmZvKGBQUjogJHtwci50aXRsZX1gKVxuXHRcdGluZm8oYEJhc2UgYnJhbmNoOiAke3ByLmJhc2UucmVmfWApXG5cdFx0aW5mbyhgSGVhZCBTSEE6ICR7cHIuaGVhZC5zaGF9YClcblxuXHRcdC8vIFN0ZXAgMzogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb25cblx0XHRpbmZvKCfimpnvuI8gIExvYWRpbmcgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uLi4uJylcblx0XHRsZXQgdGhyZXNob2xkcyA9IGF3YWl0IGxvYWRUaHJlc2hvbGRzKGdldElucHV0KCd0aHJlc2hvbGRzX3lhbWwnKSwgZ2V0SW5wdXQoJ3RocmVzaG9sZHNfeWFtbF9wYXRoJykpXG5cdFx0aW5mbyhgTG9hZGVkIHRocmVzaG9sZHM6IG5ldXRyYWxfY2hhbmdlPSR7dGhyZXNob2xkcy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50fSVgKVxuXG5cdFx0Ly8gU3RlcCA0OiBBbmFseXplIG1ldHJpY3MgKGFscmVhZHkgY29udGFpbiBjdXJyZW50IGFuZCBiYXNlIHNlcmllcyB3aXRoIHJlZiBsYWJlbClcblx0XHRpbmZvKCfwn5OKIEFuYWx5emluZyBtZXRyaWNzLi4uJylcblx0XHRsZXQgY29tcGFyaXNvbnMgPSB3b3JrbG9hZHMubWFwKCh3KSA9PlxuXHRcdFx0Y29tcGFyZVdvcmtsb2FkTWV0cmljcyh3Lndvcmtsb2FkLCB3Lm1ldHJpY3MsICdhdmcnLCB0aHJlc2hvbGRzLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQpXG5cdFx0KVxuXG5cdFx0Ly8gU3RlcCA1OiBHZW5lcmF0ZSBIVE1MIHJlcG9ydHNcblx0XHRpbmZvKCfwn5OdIEdlbmVyYXRpbmcgSFRNTCByZXBvcnRzLi4uJylcblxuXHRcdGxldCBodG1sUmVwb3J0c1BhdGggPSBwYXRoLmpvaW4oY3dkLCAncmVwb3J0cycpXG5cdFx0ZnMubWtkaXJTeW5jKGh0bWxSZXBvcnRzUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHRcdGxldCBodG1sRmlsZXM6IEFycmF5PHsgd29ya2xvYWQ6IHN0cmluZzsgcGF0aDogc3RyaW5nIH0+ID0gW11cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgd29ya2xvYWRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgd29ya2xvYWQgPSB3b3JrbG9hZHNbaV1cblx0XHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyaXNvbnNbaV1cblxuXHRcdFx0bGV0IGh0bWxEYXRhOiBIVE1MUmVwb3J0RGF0YSA9IHtcblx0XHRcdFx0d29ya2xvYWQ6IHdvcmtsb2FkLndvcmtsb2FkLFxuXHRcdFx0XHRjb21wYXJpc29uLFxuXHRcdFx0XHRtZXRyaWNzOiB3b3JrbG9hZC5tZXRyaWNzLFxuXHRcdFx0XHRldmVudHM6IHdvcmtsb2FkLmV2ZW50cyxcblx0XHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRcdGN1cnJlbnQ6IHtcblx0XHRcdFx0XHRcdHNoYTogcHIuaGVhZC5zaGEsXG5cdFx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0XHRzaG9ydDogcHIuaGVhZC5zaGEuc3Vic3RyaW5nKDAsIDcpLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdFx0c2hhOiBwci5iYXNlLnNoYSxcblx0XHRcdFx0XHRcdHVybDogYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2NvbnRleHQucmVwby5vd25lcn0vJHtjb250ZXh0LnJlcG8ucmVwb30vY29tbWl0LyR7cHIuYmFzZS5zaGF9YCxcblx0XHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0bWV0YToge1xuXHRcdFx0XHRcdHByTnVtYmVyLFxuXHRcdFx0XHRcdGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG5cdFx0XHRcdH0sXG5cdFx0XHR9XG5cblx0XHRcdGxldCBodG1sID0gZ2VuZXJhdGVIVE1MUmVwb3J0KGh0bWxEYXRhKVxuXHRcdFx0bGV0IGh0bWxQYXRoID0gcGF0aC5qb2luKGh0bWxSZXBvcnRzUGF0aCwgYCR7d29ya2xvYWQud29ya2xvYWR9LXJlcG9ydC5odG1sYClcblxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhodG1sUGF0aCwgaHRtbCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0aHRtbEZpbGVzLnB1c2goeyB3b3JrbG9hZDogd29ya2xvYWQud29ya2xvYWQsIHBhdGg6IGh0bWxQYXRoIH0pXG5cblx0XHRcdGluZm8oYEdlbmVyYXRlZCBIVE1MIHJlcG9ydCBmb3IgJHt3b3JrbG9hZC53b3JrbG9hZH1gKVxuXHRcdH1cblxuXHRcdC8vIFN0ZXAgNjogVXBsb2FkIEhUTUwgcmVwb3J0cyBhcyBhcnRpZmFjdHNcblx0XHRpbmZvKCfwn5OkIFVwbG9hZGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdFx0bGV0IGFydGlmYWN0Q2xpZW50ID0gbmV3IERlZmF1bHRBcnRpZmFjdENsaWVudCgpXG5cdFx0bGV0IHVwbG9hZFJlc3VsdCA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LnVwbG9hZEFydGlmYWN0KFxuXHRcdFx0J3Nsby1yZXBvcnRzJyxcblx0XHRcdGh0bWxGaWxlcy5tYXAoKGYpID0+IGYucGF0aCksXG5cdFx0XHRodG1sUmVwb3J0c1BhdGgsXG5cdFx0XHR7XG5cdFx0XHRcdHJldGVudGlvbkRheXM6IDMwLFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGluZm8oYFVwbG9hZGVkIEhUTUwgcmVwb3J0cyBhcyBhcnRpZmFjdDogJHt1cGxvYWRSZXN1bHQuaWR9YClcblxuXHRcdC8vIFN0ZXAgNzogQ3JlYXRlIEdpdEh1YiBDaGVja3Ncblx0XHRpbmZvKCfinIUgQ3JlYXRpbmcgR2l0SHViIENoZWNrcy4uLicpXG5cblx0XHRsZXQgY2hlY2tVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXG5cdFx0Zm9yIChsZXQgY29tcGFyaXNvbiBvZiBjb21wYXJpc29ucykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bGV0IGNoZWNrID0gYXdhaXQgY3JlYXRlV29ya2xvYWRDaGVjayh7XG5cdFx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0XHRzaGE6IHByLmhlYWQuc2hhLFxuXHRcdFx0XHRcdHdvcmtsb2FkOiBjb21wYXJpc29uLFxuXHRcdFx0XHRcdHRocmVzaG9sZHMsXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0Y2hlY2tVcmxzLnNldChjb21wYXJpc29uLndvcmtsb2FkLCBjaGVjay51cmwpXG5cdFx0XHRcdGluZm8oYENyZWF0ZWQgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7Y2hlY2sudXJsfWApXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gY3JlYXRlIGNoZWNrIGZvciAke2NvbXBhcmlzb24ud29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdGVwIDg6IFdyaXRlIEpvYiBTdW1tYXJ5XG5cdFx0aW5mbygn8J+TiyBXcml0aW5nIEpvYiBTdW1tYXJ5Li4uJylcblxuXHRcdGF3YWl0IHdyaXRlSm9iU3VtbWFyeSh7XG5cdFx0XHR3b3JrbG9hZHM6IGNvbXBhcmlzb25zLFxuXHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRjdXJyZW50OiB7XG5cdFx0XHRcdFx0c2hhOiBwci5oZWFkLnNoYSxcblx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0c2hvcnQ6IHByLmhlYWQuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0fSxcblx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdHNoYTogcHIuYmFzZS5zaGEsXG5cdFx0XHRcdFx0dXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9jb21taXQvJHtwci5iYXNlLnNoYX1gLFxuXHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRpbmZvKCdKb2IgU3VtbWFyeSB3cml0dGVuJylcblxuXHRcdC8vIFN0ZXAgOTogQ3JlYXRlL1VwZGF0ZSBQUiBjb21tZW50XG5cdFx0aW5mbygn8J+SrCBDcmVhdGluZy91cGRhdGluZyBQUiBjb21tZW50Li4uJylcblxuXHRcdC8vIEFydGlmYWN0IFVSTHMgKEdpdEh1YiBVSSBkb3dubG9hZClcblx0XHRsZXQgYXJ0aWZhY3RVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRcdGxldCBhcnRpZmFjdEJhc2VVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH0vYXJ0aWZhY3RzLyR7dXBsb2FkUmVzdWx0LmlkfWBcblxuXHRcdGZvciAobGV0IGZpbGUgb2YgaHRtbEZpbGVzKSB7XG5cdFx0XHRhcnRpZmFjdFVybHMuc2V0KGZpbGUud29ya2xvYWQsIGFydGlmYWN0QmFzZVVybClcblx0XHR9XG5cblx0XHRsZXQgY29tbWVudEJvZHkgPSBnZW5lcmF0ZUNvbW1lbnRCb2R5KHtcblx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRhcnRpZmFjdFVybHMsXG5cdFx0XHRjaGVja1VybHMsXG5cdFx0XHRqb2JTdW1tYXJ5VXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH1gLFxuXHRcdH0pXG5cblx0XHRsZXQgY29tbWVudCA9IGF3YWl0IGNyZWF0ZU9yVXBkYXRlQ29tbWVudCh0b2tlbiwgY29udGV4dC5yZXBvLm93bmVyLCBjb250ZXh0LnJlcG8ucmVwbywgcHJOdW1iZXIsIGNvbW1lbnRCb2R5KVxuXG5cdFx0aW5mbyhgUFIgY29tbWVudDogJHtjb21tZW50LnVybH1gKVxuXG5cdFx0aW5mbygn4pyFIFJlcG9ydCBnZW5lcmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJylcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRzZXRGYWlsZWQoYFJlcG9ydCBnZW5lcmF0aW9uIGZhaWxlZDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0dGhyb3cgZXJyb3Jcblx0fVxufVxuXG5tYWluKClcbiIsCiAgICAiLyoqXG4gKiBNZXRyaWNzIHBhcnNpbmcgYW5kIHR5cGVzIGZvciByZXBvcnQgYWN0aW9uXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTZXJpZXMge1xuXHRtZXRyaWM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0dmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10gLy8gW3RpbWVzdGFtcCAoc2VjKSwgdmFsdWUgKGZsb2F0KV1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnN0YW50U2VyaWVzIHtcblx0bWV0cmljOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5cdHZhbHVlOiBbbnVtYmVyLCBzdHJpbmddIC8vIFt0aW1lc3RhbXAgKHNlYyksIHZhbHVlIChmbG9hdCldXG59XG5cbi8qKlxuICogQ29sbGVjdGVkIG1ldHJpYyBmcm9tIGluaXQgYWN0aW9uIChKU09OTCBmb3JtYXQpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sbGVjdGVkTWV0cmljIHtcblx0bmFtZTogc3RyaW5nXG5cdHF1ZXJ5OiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRkYXRhOiBTZXJpZXNbXSB8IEluc3RhbnRTZXJpZXNbXVxufVxuXG4vKipcbiAqIFBhcnNlZCBtZXRyaWNzIGJ5IG5hbWVcbiAqL1xuZXhwb3J0IHR5cGUgTWV0cmljc01hcCA9IE1hcDxzdHJpbmcsIENvbGxlY3RlZE1ldHJpYz5cblxuLyoqXG4gKiBQYXJzZSBKU09OTCBtZXRyaWNzIGZpbGUgaW50byBNZXRyaWNzTWFwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1ldHJpY3NKc29ubChjb250ZW50OiBzdHJpbmcpOiBNZXRyaWNzTWFwIHtcblx0bGV0IG1ldHJpY3MgPSBuZXcgTWFwPHN0cmluZywgQ29sbGVjdGVkTWV0cmljPigpXG5cdGxldCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKVxuXG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAoIWxpbmUudHJpbSgpKSBjb250aW51ZVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBtZXRyaWMgPSBKU09OLnBhcnNlKGxpbmUpIGFzIENvbGxlY3RlZE1ldHJpY1xuXHRcdFx0bWV0cmljcy5zZXQobWV0cmljLm5hbWUsIG1ldHJpYylcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbWV0cmljc1xufVxuXG4vKipcbiAqIFNlcGFyYXRlIHNlcmllcyBieSByZWYgbGFiZWwgKGN1cnJlbnQgdnMgYmFzZSlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXBhcmF0ZWRTZXJpZXMge1xuXHRjdXJyZW50OiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxuXHRiYXNlOiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VwYXJhdGVCeVJlZihtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyk6IFNlcGFyYXRlZFNlcmllcyB7XG5cdGxldCBjdXJyZW50OiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbCA9IG51bGxcblx0bGV0IGJhc2U6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXG5cdGlmIChtZXRyaWMudHlwZSA9PT0gJ2luc3RhbnQnKSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBJbnN0YW50U2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09ICdjdXJyZW50JykgfHwgbnVsbFxuXHRcdGJhc2UgPSBkYXRhLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2Jhc2UnKSB8fCBudWxsXG5cdH0gZWxzZSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXVxuXHRcdGN1cnJlbnQgPSBkYXRhLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2N1cnJlbnQnKSB8fCBudWxsXG5cdFx0YmFzZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnYmFzZScpIHx8IG51bGxcblx0fVxuXG5cdHJldHVybiB7IGN1cnJlbnQsIGJhc2UgfVxufVxuXG4vKipcbiAqIEFnZ3JlZ2F0ZSBmdW5jdGlvbiB0eXBlIGZvciByYW5nZSBtZXRyaWNzXG4gKi9cbmV4cG9ydCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uID0gJ2xhc3QnIHwgJ2ZpcnN0JyB8ICdhdmcnIHwgJ21pbicgfCAnbWF4JyB8ICdwNTAnIHwgJ3A5NScgfCAncDk5JyB8ICdzdW0nIHwgJ2NvdW50J1xuXG4vKipcbiAqIENhbGN1bGF0ZSBwZXJjZW50aWxlXG4gKi9cbmZ1bmN0aW9uIHBlcmNlbnRpbGUodmFsdWVzOiBudW1iZXJbXSwgcDogbnVtYmVyKTogbnVtYmVyIHtcblx0bGV0IHNvcnRlZCA9IFsuLi52YWx1ZXNdLnNvcnQoKGEsIGIpID0+IGEgLSBiKVxuXHRsZXQgaW5kZXggPSBNYXRoLmNlaWwoc29ydGVkLmxlbmd0aCAqIHApIC0gMVxuXHRyZXR1cm4gc29ydGVkW01hdGgubWF4KDAsIGluZGV4KV1cbn1cblxuLyoqXG4gKiBBZ2dyZWdhdGUgcmFuZ2UgbWV0cmljIHZhbHVlcyB1c2luZyBzcGVjaWZpZWQgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZVZhbHVlcyh2YWx1ZXM6IFtudW1iZXIsIHN0cmluZ11bXSwgZm46IEFnZ3JlZ2F0ZUZ1bmN0aW9uKTogbnVtYmVyIHtcblx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDApIHJldHVybiBOYU5cblxuXHRsZXQgbnVtcyA9IHZhbHVlcy5tYXAoKFtfLCB2XSkgPT4gcGFyc2VGbG9hdCh2KSkuZmlsdGVyKChuKSA9PiAhaXNOYU4obikpXG5cblx0aWYgKG51bXMubGVuZ3RoID09PSAwKSByZXR1cm4gTmFOXG5cblx0c3dpdGNoIChmbikge1xuXHRcdGNhc2UgJ2xhc3QnOlxuXHRcdFx0cmV0dXJuIG51bXNbbnVtcy5sZW5ndGggLSAxXVxuXHRcdGNhc2UgJ2ZpcnN0Jzpcblx0XHRcdHJldHVybiBudW1zWzBdXG5cdFx0Y2FzZSAnYXZnJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtcy5sZW5ndGhcblx0XHRjYXNlICdtaW4nOlxuXHRcdFx0cmV0dXJuIE1hdGgubWluKC4uLm51bXMpXG5cdFx0Y2FzZSAnbWF4Jzpcblx0XHRcdHJldHVybiBNYXRoLm1heCguLi5udW1zKVxuXHRcdGNhc2UgJ3A1MCc6XG5cdFx0XHRyZXR1cm4gcGVyY2VudGlsZShudW1zLCAwLjUpXG5cdFx0Y2FzZSAncDk1Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTUpXG5cdFx0Y2FzZSAncDk5Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTkpXG5cdFx0Y2FzZSAnc3VtJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApXG5cdFx0Y2FzZSAnY291bnQnOlxuXHRcdFx0cmV0dXJuIG51bXMubGVuZ3RoXG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiBOYU5cblx0fVxufVxuXG4vKipcbiAqIEdldCBzaW5nbGUgdmFsdWUgZnJvbSBtZXRyaWMgKGluc3RhbnQgb3IgYWdncmVnYXRlZCByYW5nZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldHJpY1ZhbHVlKFxuXHRtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyxcblx0cmVmOiAnY3VycmVudCcgfCAnYmFzZScsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJ1xuKTogbnVtYmVyIHtcblx0bGV0IHNlcGFyYXRlZCA9IHNlcGFyYXRlQnlSZWYobWV0cmljKVxuXHRsZXQgc2VyaWVzID0gcmVmID09PSAnY3VycmVudCcgPyBzZXBhcmF0ZWQuY3VycmVudCA6IHNlcGFyYXRlZC5iYXNlXG5cblx0aWYgKCFzZXJpZXMpIHJldHVybiBOYU5cblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdpbnN0YW50Jykge1xuXHRcdGxldCBpbnN0YW50U2VyaWVzID0gc2VyaWVzIGFzIEluc3RhbnRTZXJpZXNcblx0XHRyZXR1cm4gcGFyc2VGbG9hdChpbnN0YW50U2VyaWVzLnZhbHVlWzFdKVxuXHR9IGVsc2Uge1xuXHRcdGxldCByYW5nZVNlcmllcyA9IHNlcmllcyBhcyBTZXJpZXNcblx0XHRyZXR1cm4gYWdncmVnYXRlVmFsdWVzKHJhbmdlU2VyaWVzLnZhbHVlcywgYWdncmVnYXRlKVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogTWV0cmljcyBhbmFseXNpcyBhbmQgY29tcGFyaXNvblxuICovXG5cbmltcG9ydCB7IGdldE1ldHJpY1ZhbHVlLCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uLCB0eXBlIENvbGxlY3RlZE1ldHJpYywgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0NvbXBhcmlzb24ge1xuXHRuYW1lOiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRjdXJyZW50OiB7XG5cdFx0dmFsdWU6IG51bWJlclxuXHRcdGF2YWlsYWJsZTogYm9vbGVhblxuXHR9XG5cdGJhc2U6IHtcblx0XHR2YWx1ZTogbnVtYmVyXG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdH1cblx0Y2hhbmdlOiB7XG5cdFx0YWJzb2x1dGU6IG51bWJlclxuXHRcdHBlcmNlbnQ6IG51bWJlclxuXHRcdGRpcmVjdGlvbjogJ2JldHRlcicgfCAnd29yc2UnIHwgJ25ldXRyYWwnIHwgJ3Vua25vd24nXG5cdH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrbG9hZENvbXBhcmlzb24ge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdG1ldHJpY3M6IE1ldHJpY0NvbXBhcmlzb25bXVxuXHRzdW1tYXJ5OiB7XG5cdFx0dG90YWw6IG51bWJlclxuXHRcdHJlZ3Jlc3Npb25zOiBudW1iZXJcblx0XHRpbXByb3ZlbWVudHM6IG51bWJlclxuXHRcdHN0YWJsZTogbnVtYmVyXG5cdH1cbn1cblxuLyoqXG4gKiBJbmZlciBtZXRyaWMgZGlyZWN0aW9uIGJhc2VkIG9uIG5hbWVcbiAqL1xuZnVuY3Rpb24gaW5mZXJNZXRyaWNEaXJlY3Rpb24obmFtZTogc3RyaW5nKTogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCcge1xuXHRsZXQgbG93ZXJOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gTG93ZXIgaXMgYmV0dGVyXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkZWxheScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdlcnJvcicpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdmYWlsdXJlJylcblx0KSB7XG5cdFx0cmV0dXJuICdsb3dlcl9pc19iZXR0ZXInXG5cdH1cblxuXHQvLyBIaWdoZXIgaXMgYmV0dGVyXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aHJvdWdocHV0JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3N1Y2Nlc3MnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygncXBzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3JwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdvcHMnKVxuXHQpIHtcblx0XHRyZXR1cm4gJ2hpZ2hlcl9pc19iZXR0ZXInXG5cdH1cblxuXHRyZXR1cm4gJ25ldXRyYWwnXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGNoYW5nZSBkaXJlY3Rpb25cbiAqL1xuZnVuY3Rpb24gZGV0ZXJtaW5lQ2hhbmdlRGlyZWN0aW9uKFxuXHRjdXJyZW50VmFsdWU6IG51bWJlcixcblx0YmFzZVZhbHVlOiBudW1iZXIsXG5cdG1ldHJpY0RpcmVjdGlvbjogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCcsXG5cdG5ldXRyYWxUaHJlc2hvbGQ6IG51bWJlciA9IDUuMFxuKTogJ2JldHRlcicgfCAnd29yc2UnIHwgJ25ldXRyYWwnIHwgJ3Vua25vd24nIHtcblx0aWYgKGlzTmFOKGN1cnJlbnRWYWx1ZSkgfHwgaXNOYU4oYmFzZVZhbHVlKSkge1xuXHRcdHJldHVybiAndW5rbm93bidcblx0fVxuXG5cdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoKChjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWUpIC8gYmFzZVZhbHVlKSAqIDEwMClcblxuXHQvLyBDb25zaWRlciBjaGFuZ2UgYmVsb3cgdGhyZXNob2xkIGFzIHN0YWJsZS9uZXV0cmFsXG5cdGlmIChjaGFuZ2VQZXJjZW50IDwgbmV1dHJhbFRocmVzaG9sZCkge1xuXHRcdHJldHVybiAnbmV1dHJhbCdcblx0fVxuXG5cdGlmIChtZXRyaWNEaXJlY3Rpb24gPT09ICdsb3dlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA8IGJhc2VWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2hpZ2hlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA+IGJhc2VWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0cmV0dXJuICduZXV0cmFsJ1xufVxuXG4vKipcbiAqIENvbXBhcmUgc2luZ2xlIG1ldHJpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZU1ldHJpYyhcblx0bWV0cmljOiBDb2xsZWN0ZWRNZXRyaWMsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJyxcblx0bmV1dHJhbFRocmVzaG9sZD86IG51bWJlclxuKTogTWV0cmljQ29tcGFyaXNvbiB7XG5cdGxldCBjdXJyZW50VmFsdWUgPSBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsICdjdXJyZW50JywgYWdncmVnYXRlKVxuXHRsZXQgYmFzZVZhbHVlID0gZ2V0TWV0cmljVmFsdWUobWV0cmljLCAnYmFzZScsIGFnZ3JlZ2F0ZSlcblxuXHRsZXQgYWJzb2x1dGUgPSBjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWVcblx0bGV0IHBlcmNlbnQgPSBpc05hTihiYXNlVmFsdWUpIHx8IGJhc2VWYWx1ZSA9PT0gMCA/IE5hTiA6IChhYnNvbHV0ZSAvIGJhc2VWYWx1ZSkgKiAxMDBcblxuXHRsZXQgbWV0cmljRGlyZWN0aW9uID0gaW5mZXJNZXRyaWNEaXJlY3Rpb24obWV0cmljLm5hbWUpXG5cdGxldCBkaXJlY3Rpb24gPSBkZXRlcm1pbmVDaGFuZ2VEaXJlY3Rpb24oY3VycmVudFZhbHVlLCBiYXNlVmFsdWUsIG1ldHJpY0RpcmVjdGlvbiwgbmV1dHJhbFRocmVzaG9sZClcblxuXHRyZXR1cm4ge1xuXHRcdG5hbWU6IG1ldHJpYy5uYW1lLFxuXHRcdHR5cGU6IG1ldHJpYy50eXBlLFxuXHRcdGN1cnJlbnQ6IHtcblx0XHRcdHZhbHVlOiBjdXJyZW50VmFsdWUsXG5cdFx0XHRhdmFpbGFibGU6ICFpc05hTihjdXJyZW50VmFsdWUpLFxuXHRcdH0sXG5cdFx0YmFzZToge1xuXHRcdFx0dmFsdWU6IGJhc2VWYWx1ZSxcblx0XHRcdGF2YWlsYWJsZTogIWlzTmFOKGJhc2VWYWx1ZSksXG5cdFx0fSxcblx0XHRjaGFuZ2U6IHtcblx0XHRcdGFic29sdXRlLFxuXHRcdFx0cGVyY2VudCxcblx0XHRcdGRpcmVjdGlvbixcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogQ29tcGFyZSBhbGwgbWV0cmljcyBpbiBhIHdvcmtsb2FkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlV29ya2xvYWRNZXRyaWNzKFxuXHR3b3JrbG9hZDogc3RyaW5nLFxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwLFxuXHRhZ2dyZWdhdGU6IEFnZ3JlZ2F0ZUZ1bmN0aW9uID0gJ2F2ZycsXG5cdG5ldXRyYWxUaHJlc2hvbGQ/OiBudW1iZXJcbik6IFdvcmtsb2FkQ29tcGFyaXNvbiB7XG5cdGxldCBjb21wYXJpc29uczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblxuXHRmb3IgKGxldCBbX25hbWUsIG1ldHJpY10gb2YgbWV0cmljcykge1xuXHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyZU1ldHJpYyhtZXRyaWMsIGFnZ3JlZ2F0ZSwgbmV1dHJhbFRocmVzaG9sZClcblx0XHRjb21wYXJpc29ucy5wdXNoKGNvbXBhcmlzb24pXG5cdH1cblxuXHQvLyBDYWxjdWxhdGUgc3VtbWFyeVxuXHRsZXQgcmVncmVzc2lvbnMgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ3dvcnNlJykubGVuZ3RoXG5cdGxldCBpbXByb3ZlbWVudHMgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ2JldHRlcicpLmxlbmd0aFxuXHRsZXQgc3RhYmxlID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICduZXV0cmFsJykubGVuZ3RoXG5cblx0cmV0dXJuIHtcblx0XHR3b3JrbG9hZCxcblx0XHRtZXRyaWNzOiBjb21wYXJpc29ucyxcblx0XHRzdW1tYXJ5OiB7XG5cdFx0XHR0b3RhbDogY29tcGFyaXNvbnMubGVuZ3RoLFxuXHRcdFx0cmVncmVzc2lvbnMsXG5cdFx0XHRpbXByb3ZlbWVudHMsXG5cdFx0XHRzdGFibGUsXG5cdFx0fSxcblx0fVxufVxuXG4vKipcbiAqIEZvcm1hdCB2YWx1ZSB3aXRoIHVuaXQgaW5mZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRWYWx1ZSh2YWx1ZTogbnVtYmVyLCBtZXRyaWNOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRpZiAoaXNOYU4odmFsdWUpKSByZXR1cm4gJ04vQSdcblxuXHRsZXQgbG93ZXJOYW1lID0gbWV0cmljTmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gTGF0ZW5jeS9kdXJhdGlvbiAobXMpXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fCBsb3dlck5hbWUuaW5jbHVkZXMoJ2R1cmF0aW9uJykgfHwgbG93ZXJOYW1lLmVuZHNXaXRoKCdfbXMnKSkge1xuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDIpfW1zYFxuXHR9XG5cblx0Ly8gVGltZSAoc2Vjb25kcylcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpICYmIGxvd2VyTmFtZS5lbmRzV2l0aCgnX3MnKSkge1xuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDIpfXNgXG5cdH1cblxuXHQvLyBQZXJjZW50YWdlXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygncGVyY2VudCcpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygncmF0ZScpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9JWBcblx0fVxuXG5cdC8vIFRocm91Z2hwdXRcblx0aWYgKFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGhyb3VnaHB1dCcpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdxcHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygncnBzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ29wcycpXG5cdCkge1xuXHRcdGlmICh2YWx1ZSA+PSAxMDAwKSB7XG5cdFx0XHRyZXR1cm4gYCR7KHZhbHVlIC8gMTAwMCkudG9GaXhlZCgyKX1rL3NgXG5cdFx0fVxuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDApfS9zYFxuXHR9XG5cblx0Ly8gRGVmYXVsdDogMiBkZWNpbWFsIHBsYWNlc1xuXHRyZXR1cm4gdmFsdWUudG9GaXhlZCgyKVxufVxuXG4vKipcbiAqIEZvcm1hdCBjaGFuZ2UgcGVyY2VudGFnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhbmdlKHBlcmNlbnQ6IG51bWJlciwgZGlyZWN0aW9uOiAnYmV0dGVyJyB8ICd3b3JzZScgfCAnbmV1dHJhbCcgfCAndW5rbm93bicpOiBzdHJpbmcge1xuXHRpZiAoaXNOYU4ocGVyY2VudCkpIHJldHVybiAnTi9BJ1xuXG5cdGxldCBzaWduID0gcGVyY2VudCA+PSAwID8gJysnIDogJydcblx0bGV0IGVtb2ppID0gZGlyZWN0aW9uID09PSAnYmV0dGVyJyA/ICfwn5+iJyA6IGRpcmVjdGlvbiA9PT0gJ3dvcnNlJyA/ICfwn5S0JyA6IGRpcmVjdGlvbiA9PT0gJ25ldXRyYWwnID8gJ+KaqicgOiAn4p2TJ1xuXG5cdHJldHVybiBgJHtzaWdufSR7cGVyY2VudC50b0ZpeGVkKDEpfSUgJHtlbW9qaX1gXG59XG4iLAogICAgIi8qKlxuICogQXJ0aWZhY3RzIGRvd25sb2FkIGFuZCBwYXJzaW5nXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGRlYnVnLCBpbmZvLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBDaGFvc0V2ZW50LCBEb2NrZXJFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHtcblx0Zm9ybWF0Q2hhb3NFdmVudHMsXG5cdGZvcm1hdEV2ZW50cyxcblx0cGFyc2VDaGFvc0V2ZW50c0pzb25sLFxuXHRwYXJzZUV2ZW50c0pzb25sLFxuXHR0eXBlIEZvcm1hdHRlZEV2ZW50LFxufSBmcm9tICcuL2V2ZW50cy5qcydcbmltcG9ydCB7IHBhcnNlTWV0cmljc0pzb25sLCB0eXBlIE1ldHJpY3NNYXAgfSBmcm9tICcuL21ldHJpY3MuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya2xvYWRBcnRpZmFjdHMge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdHB1bGxOdW1iZXI6IG51bWJlclxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXVxuXHRsb2dzUGF0aD86IHN0cmluZ1xufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFydGlmYWN0RG93bmxvYWRPcHRpb25zIHtcblx0dG9rZW46IHN0cmluZ1xuXHR3b3JrZmxvd1J1bklkOiBudW1iZXJcblx0cmVwb3NpdG9yeU93bmVyOiBzdHJpbmdcblx0cmVwb3NpdG9yeU5hbWU6IHN0cmluZ1xuXHRkb3dubG9hZFBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIERvd25sb2FkIGFuZCBwYXJzZSBhcnRpZmFjdHMgZm9yIGEgd29ya2Zsb3cgcnVuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFdvcmtsb2FkQXJ0aWZhY3RzKG9wdGlvbnM6IEFydGlmYWN0RG93bmxvYWRPcHRpb25zKTogUHJvbWlzZTxXb3JrbG9hZEFydGlmYWN0c1tdPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXG5cdGluZm8oYExpc3RpbmcgYXJ0aWZhY3RzIGZvciB3b3JrZmxvdyBydW4gJHtvcHRpb25zLndvcmtmbG93UnVuSWR9Li4uYClcblxuXHRsZXQgeyBhcnRpZmFjdHMgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50Lmxpc3RBcnRpZmFjdHMoe1xuXHRcdGZpbmRCeToge1xuXHRcdFx0dG9rZW46IG9wdGlvbnMudG9rZW4sXG5cdFx0XHR3b3JrZmxvd1J1bklkOiBvcHRpb25zLndvcmtmbG93UnVuSWQsXG5cdFx0XHRyZXBvc2l0b3J5T3duZXI6IG9wdGlvbnMucmVwb3NpdG9yeU93bmVyLFxuXHRcdFx0cmVwb3NpdG9yeU5hbWU6IG9wdGlvbnMucmVwb3NpdG9yeU5hbWUsXG5cdFx0fSxcblx0fSlcblxuXHRpbmZvKGBGb3VuZCAke2FydGlmYWN0cy5sZW5ndGh9IGFydGlmYWN0c2ApXG5cdGRlYnVnKFxuXHRcdGBBcnRpZmFjdHM6ICR7SlNPTi5zdHJpbmdpZnkoXG5cdFx0XHRhcnRpZmFjdHMubWFwKChhKSA9PiBhLm5hbWUpLFxuXHRcdFx0bnVsbCxcblx0XHRcdDJcblx0XHQpfWBcblx0KVxuXG5cdC8vIERvd25sb2FkIGFsbCBhcnRpZmFjdHNcblx0bGV0IGRvd25sb2FkZWRQYXRocyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcblxuXHRmb3IgKGxldCBhcnRpZmFjdCBvZiBhcnRpZmFjdHMpIHtcblx0XHRpbmZvKGBEb3dubG9hZGluZyBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9Li4uYClcblxuXHRcdGxldCB7IGRvd25sb2FkUGF0aCB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQuZG93bmxvYWRBcnRpZmFjdChhcnRpZmFjdC5pZCwge1xuXHRcdFx0cGF0aDogb3B0aW9ucy5kb3dubG9hZFBhdGgsXG5cdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0dG9rZW46IG9wdGlvbnMudG9rZW4sXG5cdFx0XHRcdHdvcmtmbG93UnVuSWQ6IG9wdGlvbnMud29ya2Zsb3dSdW5JZCxcblx0XHRcdFx0cmVwb3NpdG9yeU93bmVyOiBvcHRpb25zLnJlcG9zaXRvcnlPd25lcixcblx0XHRcdFx0cmVwb3NpdG9yeU5hbWU6IG9wdGlvbnMucmVwb3NpdG9yeU5hbWUsXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRsZXQgYXJ0aWZhY3RQYXRoID0gcGF0aC5qb2luKGRvd25sb2FkUGF0aCB8fCBvcHRpb25zLmRvd25sb2FkUGF0aCwgYXJ0aWZhY3QubmFtZSlcblx0XHRkb3dubG9hZGVkUGF0aHMuc2V0KGFydGlmYWN0Lm5hbWUsIGFydGlmYWN0UGF0aClcblxuXHRcdGluZm8oYERvd25sb2FkZWQgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfSB0byAke2FydGlmYWN0UGF0aH1gKVxuXHR9XG5cblx0Ly8gR3JvdXAgZmlsZXMgYnkgd29ya2xvYWRcblx0bGV0IHdvcmtsb2FkRmlsZXMgPSBuZXcgTWFwPFxuXHRcdHN0cmluZyxcblx0XHR7XG5cdFx0XHRwdWxsPzogc3RyaW5nXG5cdFx0XHRtZXRyaWNzPzogc3RyaW5nXG5cdFx0XHRldmVudHM/OiBzdHJpbmdcblx0XHRcdGNoYW9zRXZlbnRzPzogc3RyaW5nXG5cdFx0XHRsb2dzPzogc3RyaW5nXG5cdFx0fVxuXHQ+KClcblxuXHRmb3IgKGxldCBbYXJ0aWZhY3ROYW1lLCBhcnRpZmFjdFBhdGhdIG9mIGRvd25sb2FkZWRQYXRocykge1xuXHRcdC8vIEFydGlmYWN0IG5hbWUgaXMgdGhlIHdvcmtsb2FkIG5hbWUsIGZpbGVzIGluc2lkZSBoYXZlIHdvcmtsb2FkIHByZWZpeFxuXHRcdGxldCB3b3JrbG9hZCA9IGFydGlmYWN0TmFtZVxuXG5cdFx0Ly8gTGlzdCBmaWxlcyBpbiBhcnRpZmFjdCBkaXJlY3Rvcnlcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoYXJ0aWZhY3RQYXRoKSkge1xuXHRcdFx0d2FybmluZyhgQXJ0aWZhY3QgcGF0aCBkb2VzIG5vdCBleGlzdDogJHthcnRpZmFjdFBhdGh9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0bGV0IHN0YXQgPSBmcy5zdGF0U3luYyhhcnRpZmFjdFBhdGgpXG5cdFx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG5cdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGFydGlmYWN0UGF0aCkubWFwKChmKSA9PiBwYXRoLmpvaW4oYXJ0aWZhY3RQYXRoLCBmKSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmlsZXMgPSBbYXJ0aWZhY3RQYXRoXVxuXHRcdH1cblxuXHRcdGxldCBncm91cCA9IHdvcmtsb2FkRmlsZXMuZ2V0KHdvcmtsb2FkKSB8fCB7fVxuXG5cdFx0Zm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0bGV0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKVxuXG5cdFx0XHRpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1wdWxsLnR4dCcpKSB7XG5cdFx0XHRcdGdyb3VwLnB1bGwgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbWV0cmljcy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLm1ldHJpY3MgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctY2hhb3MtZXZlbnRzLmpzb25sJykpIHtcblx0XHRcdFx0Z3JvdXAuY2hhb3NFdmVudHMgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctZXZlbnRzLmpzb25sJykpIHtcblx0XHRcdFx0Z3JvdXAuZXZlbnRzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWxvZ3MudHh0JykpIHtcblx0XHRcdFx0Z3JvdXAubG9ncyA9IGZpbGVcblx0XHRcdH1cblx0XHR9XG5cblx0XHR3b3JrbG9hZEZpbGVzLnNldCh3b3JrbG9hZCwgZ3JvdXApXG5cdH1cblxuXHQvLyBQYXJzZSB3b3JrbG9hZCBkYXRhXG5cdGxldCB3b3JrbG9hZHM6IFdvcmtsb2FkQXJ0aWZhY3RzW10gPSBbXVxuXG5cdGZvciAobGV0IFt3b3JrbG9hZCwgZmlsZXNdIG9mIHdvcmtsb2FkRmlsZXMpIHtcblx0XHRpZiAoIWZpbGVzLnB1bGwgfHwgIWZpbGVzLm1ldHJpY3MpIHtcblx0XHRcdHdhcm5pbmcoYFNraXBwaW5nIGluY29tcGxldGUgd29ya2xvYWQgJHt3b3JrbG9hZH06IG1pc3NpbmcgcmVxdWlyZWQgZmlsZXNgKVxuXHRcdFx0Y29udGludWVcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IHB1bGxOdW1iZXIgPSBwYXJzZUludChmcy5yZWFkRmlsZVN5bmMoZmlsZXMucHVsbCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KS50cmltKCkpXG5cdFx0XHRsZXQgbWV0cmljc0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZXMubWV0cmljcywgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0bGV0IG1ldHJpY3MgPSBwYXJzZU1ldHJpY3NKc29ubChtZXRyaWNzQ29udGVudClcblxuXHRcdFx0bGV0IGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSA9IFtdXG5cblx0XHRcdC8vIExvYWQgZG9ja2VyIGV2ZW50c1xuXHRcdFx0aWYgKGZpbGVzLmV2ZW50cyAmJiBmcy5leGlzdHNTeW5jKGZpbGVzLmV2ZW50cykpIHtcblx0XHRcdFx0bGV0IGV2ZW50c0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZXMuZXZlbnRzLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRcdGxldCByYXdFdmVudHMgPSBwYXJzZUV2ZW50c0pzb25sKGV2ZW50c0NvbnRlbnQpXG5cdFx0XHRcdGV2ZW50cy5wdXNoKC4uLmZvcm1hdEV2ZW50cyhyYXdFdmVudHMpKVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBMb2FkIGNoYW9zIGV2ZW50c1xuXHRcdFx0aWYgKGZpbGVzLmNoYW9zRXZlbnRzICYmIGZzLmV4aXN0c1N5bmMoZmlsZXMuY2hhb3NFdmVudHMpKSB7XG5cdFx0XHRcdGxldCBjaGFvc0V2ZW50c0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZXMuY2hhb3NFdmVudHMsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRcdFx0bGV0IHJhd0NoYW9zRXZlbnRzID0gcGFyc2VDaGFvc0V2ZW50c0pzb25sKGNoYW9zRXZlbnRzQ29udGVudClcblx0XHRcdFx0ZXZlbnRzLnB1c2goLi4uZm9ybWF0Q2hhb3NFdmVudHMocmF3Q2hhb3NFdmVudHMpKVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBTb3J0IGV2ZW50cyBieSB0aW1lc3RhbXBcblx0XHRcdGV2ZW50cy5zb3J0KChhLCBiKSA9PiBhLnRpbWVzdGFtcCAtIGIudGltZXN0YW1wKVxuXG5cdFx0XHR3b3JrbG9hZHMucHVzaCh7XG5cdFx0XHRcdHdvcmtsb2FkLFxuXHRcdFx0XHRwdWxsTnVtYmVyLFxuXHRcdFx0XHRtZXRyaWNzLFxuXHRcdFx0XHRldmVudHMsXG5cdFx0XHRcdGxvZ3NQYXRoOiBmaWxlcy5sb2dzLFxuXHRcdFx0fSlcblxuXHRcdFx0aW5mbyhgUGFyc2VkIHdvcmtsb2FkICR7d29ya2xvYWR9OiAke21ldHJpY3Muc2l6ZX0gbWV0cmljcywgJHtldmVudHMubGVuZ3RofSBldmVudHNgKVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2Ugd29ya2xvYWQgJHt3b3JrbG9hZH06ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gd29ya2xvYWRzXG59XG4iLAogICAgIi8qKlxuICogRG9ja2VyIGV2ZW50cyBwYXJzaW5nIGFuZCBmb3JtYXR0aW5nXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBEb2NrZXJFdmVudCB7XG5cdHRpbWU6IG51bWJlclxuXHRBY3Rpb246IHN0cmluZ1xuXHRUeXBlOiBzdHJpbmdcblx0QWN0b3I6IHtcblx0XHRJRDogc3RyaW5nXG5cdFx0QXR0cmlidXRlczogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR9XG5cdFtrZXk6IHN0cmluZ106IHVua25vd25cbn1cblxuZXhwb3J0IGludGVyZmFjZSBDaGFvc0V2ZW50IHtcblx0dGltZXN0YW1wOiBzdHJpbmdcblx0ZXBvY2hfbXM6IG51bWJlclxuXHRzY3JpcHQ6IHN0cmluZ1xuXHRkZXNjcmlwdGlvbjogc3RyaW5nXG5cdGR1cmF0aW9uX21zPzogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ybWF0dGVkRXZlbnQge1xuXHR0aW1lc3RhbXA6IG51bWJlclxuXHRhY3Rpb246IHN0cmluZ1xuXHR0eXBlOiBzdHJpbmdcblx0bGFiZWw6IHN0cmluZ1xuXHRpY29uOiBzdHJpbmdcblx0Y29sb3I6IHN0cmluZ1xuXHRhY3Rvcjogc3RyaW5nXG5cdHNvdXJjZTogJ2RvY2tlcicgfCAnY2hhb3MnXG5cdGR1cmF0aW9uX21zPzogbnVtYmVyXG59XG5cbi8qKlxuICogUGFyc2UgZG9ja2VyIGV2ZW50cyBKU09OTCBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV2ZW50c0pzb25sKGNvbnRlbnQ6IHN0cmluZyk6IERvY2tlckV2ZW50W10ge1xuXHRsZXQgZXZlbnRzOiBEb2NrZXJFdmVudFtdID0gW11cblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IGV2ZW50ID0gSlNPTi5wYXJzZShsaW5lKSBhcyBEb2NrZXJFdmVudFxuXHRcdFx0ZXZlbnRzLnB1c2goZXZlbnQpXG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBTa2lwIGludmFsaWQgbGluZXNcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV2ZW50c1xufVxuXG4vKipcbiAqIFBhcnNlIGNoYW9zIGV2ZW50cyBKU09OTCBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUNoYW9zRXZlbnRzSnNvbmwoY29udGVudDogc3RyaW5nKTogQ2hhb3NFdmVudFtdIHtcblx0bGV0IGV2ZW50czogQ2hhb3NFdmVudFtdID0gW11cblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IGV2ZW50ID0gSlNPTi5wYXJzZShsaW5lKSBhcyBDaGFvc0V2ZW50XG5cdFx0XHRldmVudHMucHVzaChldmVudClcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogR2V0IGljb24gZm9yIGV2ZW50IGFjdGlvblxuICovXG5mdW5jdGlvbiBnZXRFdmVudEljb24oYWN0aW9uOiBzdHJpbmcsIGF0dHJpYnV0ZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcblx0bGV0IGljb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuXHRcdHBhdXNlOiAn4o+477iPJyxcblx0XHR1bnBhdXNlOiAn4pa277iPJyxcblx0XHRzdG9wOiAn4o+577iPJyxcblx0XHRzdGFydDogJ+KWtu+4jycsXG5cdFx0cmVzdGFydDogJ/CflIQnLFxuXHRcdGRpZTogJ/CfkqQnLFxuXHRcdGNyZWF0ZTogJ/CfhpUnLFxuXHRcdGRlc3Ryb3k6ICfwn5eR77iPJyxcblx0fVxuXG5cdGlmIChhY3Rpb24gPT09ICdraWxsJykge1xuXHRcdHJldHVybiBhdHRyaWJ1dGVzPy5zaWduYWwgPT09ICdTSUdLSUxMJyA/ICfwn5KAJyA6ICfimqEnXG5cdH1cblxuXHRyZXR1cm4gaWNvbnNbYWN0aW9uXSB8fCAn8J+TjCdcbn1cblxuLyoqXG4gKiBHZXQgaWNvbiBmb3IgY2hhb3MgZXZlbnQgYmFzZWQgb24gZGVzY3JpcHRpb24ga2V5d29yZHNcbiAqL1xuZnVuY3Rpb24gZ2V0Q2hhb3NFdmVudEljb24oZGVzY3JpcHRpb246IHN0cmluZyk6IHN0cmluZyB7XG5cdGxldCBsb3dlciA9IGRlc2NyaXB0aW9uLnRvTG93ZXJDYXNlKClcblxuXHRpZiAobG93ZXIuaW5jbHVkZXMoJ2tpbGwnKSkgcmV0dXJuICfwn5KAJ1xuXHRpZiAobG93ZXIuaW5jbHVkZXMoJ3N0b3BwaW5nJykgfHwgbG93ZXIuaW5jbHVkZXMoJ3N0b3AnKSkgcmV0dXJuICfij7nvuI8nXG5cdGlmIChsb3dlci5pbmNsdWRlcygnc3RhcnRpbmcnKSB8fCBsb3dlci5pbmNsdWRlcygnc3RhcnQnKSkgcmV0dXJuICfilrbvuI8nXG5cdGlmIChsb3dlci5pbmNsdWRlcygncmVzdGFydCcpKSByZXR1cm4gJ/CflIQnXG5cdGlmIChsb3dlci5pbmNsdWRlcygncGF1cycpKSByZXR1cm4gJ+KPuO+4jydcblx0aWYgKGxvd2VyLmluY2x1ZGVzKCd1bnBhdXMnKSkgcmV0dXJuICfilrbvuI8nXG5cdGlmIChsb3dlci5pbmNsdWRlcygnYmxhY2tob2xlJykpIHJldHVybiAn8J+Vs++4jydcblx0aWYgKGxvd2VyLmluY2x1ZGVzKCdoZWFsdGh5JykpIHJldHVybiAn4pyFJ1xuXHRpZiAobG93ZXIuaW5jbHVkZXMoJ3RpbWVvdXQnKSB8fCBsb3dlci5pbmNsdWRlcygnd2FybmluZycpKSByZXR1cm4gJ+KPse+4jydcblx0aWYgKGxvd2VyLmluY2x1ZGVzKCdjb21wbGV0ZWQnKSB8fCBsb3dlci5pbmNsdWRlcygnZmluaXNoZWQnKSkgcmV0dXJuICfwn4+BJ1xuXHRpZiAobG93ZXIuaW5jbHVkZXMoJ3N0YXJ0ZWQnKSB8fCBsb3dlci5pbmNsdWRlcygnc3RhcnRpbmcnKSkgcmV0dXJuICfwn46sJ1xuXG5cdHJldHVybiAn8J+TjCdcbn1cblxuLyoqXG4gKiBHZXQgY29sb3IgZm9yIGV2ZW50IGFjdGlvblxuICovXG5mdW5jdGlvbiBnZXRFdmVudENvbG9yKGFjdGlvbjogc3RyaW5nKTogc3RyaW5nIHtcblx0bGV0IGNvbG9yczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcblx0XHRwYXVzZTogJyNmNTllMGInLCAvLyBvcmFuZ2Vcblx0XHR1bnBhdXNlOiAnIzEwYjk4MScsIC8vIGdyZWVuXG5cdFx0c3RvcDogJyNlZjQ0NDQnLCAvLyByZWRcblx0XHRzdGFydDogJyMxMGI5ODEnLCAvLyBncmVlblxuXHRcdGtpbGw6ICcjZGMyNjI2JywgLy8gZGFyayByZWRcblx0XHRyZXN0YXJ0OiAnI2Y1OWUwYicsIC8vIG9yYW5nZVxuXHRcdGRpZTogJyM2YjcyODAnLCAvLyBncmF5XG5cdFx0Y3JlYXRlOiAnIzNiODJmNicsIC8vIGJsdWVcblx0XHRkZXN0cm95OiAnI2VmNDQ0NCcsIC8vIHJlZFxuXHR9XG5cblx0cmV0dXJuIGNvbG9yc1thY3Rpb25dIHx8ICcjNmI3MjgwJ1xufVxuXG4vKipcbiAqIEdldCBjb2xvciBmb3IgY2hhb3MgZXZlbnQgKHNpbXBsZSBsaWdodCBibHVlIGZvciBhbGwpXG4gKi9cbmZ1bmN0aW9uIGdldENoYW9zRXZlbnRDb2xvcigpOiBzdHJpbmcge1xuXHRyZXR1cm4gJyM2MGE1ZmEnIC8vIGxpZ2h0IGJsdWUgKGJsdWUtNDAwKVxufVxuXG4vKipcbiAqIEZvcm1hdCBldmVudCBsYWJlbFxuICovXG5mdW5jdGlvbiBmb3JtYXRFdmVudExhYmVsKGV2ZW50OiBEb2NrZXJFdmVudCk6IHN0cmluZyB7XG5cdC8vIFRyeSB0byBnZXQgZnJpZW5kbHkgbmFtZSBmcm9tIGNvbXBvc2UgbGFiZWxzXG5cdGxldCBuYW1lID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5uYW1lIHx8IGV2ZW50LkFjdG9yLklELnN1YnN0cmluZygwLCAxMilcblx0bGV0IG5vZGVUeXBlID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlc1sneWRiLm5vZGUudHlwZSddXG5cdGxldCBzZXJ2aWNlID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlc1snY29tLmRvY2tlci5jb21wb3NlLnNlcnZpY2UnXVxuXG5cdC8vIFVzZSBZREIgbm9kZSB0eXBlIGlmIGF2YWlsYWJsZSAoZS5nLiwgXCJkYXRhYmFzZVwiLCBcInN0b3JhZ2VcIilcblx0bGV0IGRpc3BsYXlOYW1lID0gbmFtZVxuXHRpZiAobm9kZVR5cGUpIHtcblx0XHRkaXNwbGF5TmFtZSA9IGAke25vZGVUeXBlfSAoJHtuYW1lfSlgXG5cdH0gZWxzZSBpZiAoc2VydmljZSkge1xuXHRcdGRpc3BsYXlOYW1lID0gc2VydmljZVxuXHR9XG5cblx0bGV0IGFjdGlvbiA9IGV2ZW50LkFjdGlvblxuXG5cdGlmIChhY3Rpb24gPT09ICdraWxsJyAmJiBldmVudC5BY3Rvci5BdHRyaWJ1dGVzLnNpZ25hbCkge1xuXHRcdHJldHVybiBgJHthY3Rpb259ICR7ZGlzcGxheU5hbWV9ICgke2V2ZW50LkFjdG9yLkF0dHJpYnV0ZXMuc2lnbmFsfSlgXG5cdH1cblxuXHRyZXR1cm4gYCR7YWN0aW9ufSAke2Rpc3BsYXlOYW1lfWBcbn1cblxuLyoqXG4gKiBGb3JtYXQgY2hhb3MgZXZlbnQgbGFiZWxcbiAqL1xuZnVuY3Rpb24gZm9ybWF0Q2hhb3NFdmVudExhYmVsKGV2ZW50OiBDaGFvc0V2ZW50KTogc3RyaW5nIHtcblx0Ly8gU2hvcnRlbiBjb250YWluZXIgbmFtZXMgaW4gZGVzY3JpcHRpb25cblx0bGV0IGRlc2NyaXB0aW9uID0gZXZlbnQuZGVzY3JpcHRpb24ucmVwbGFjZSgveWRiLS9nLCAnJylcblxuXHQvLyBBZGQgZHVyYXRpb24gaWYgcHJlc2VudFxuXHRpZiAoZXZlbnQuZHVyYXRpb25fbXMpIHtcblx0XHRsZXQgc2Vjb25kcyA9IChldmVudC5kdXJhdGlvbl9tcyAvIDEwMDApLnRvRml4ZWQoMSlcblx0XHRyZXR1cm4gYFske2V2ZW50LnNjcmlwdH1dICR7ZGVzY3JpcHRpb259ICgke3NlY29uZHN9cylgXG5cdH1cblxuXHRyZXR1cm4gYFske2V2ZW50LnNjcmlwdH1dICR7ZGVzY3JpcHRpb259YFxufVxuXG4vKipcbiAqIEZvcm1hdCBkb2NrZXIgZXZlbnRzIGZvciB2aXN1YWxpemF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFdmVudHMoZXZlbnRzOiBEb2NrZXJFdmVudFtdKTogRm9ybWF0dGVkRXZlbnRbXSB7XG5cdHJldHVybiBldmVudHMubWFwKChldmVudCkgPT4gKHtcblx0XHR0aW1lc3RhbXA6IGV2ZW50LnRpbWUsXG5cdFx0YWN0aW9uOiBldmVudC5BY3Rpb24sXG5cdFx0dHlwZTogZXZlbnQuVHlwZSxcblx0XHRsYWJlbDogZm9ybWF0RXZlbnRMYWJlbChldmVudCksXG5cdFx0aWNvbjogZ2V0RXZlbnRJY29uKGV2ZW50LkFjdGlvbiwgZXZlbnQuQWN0b3IuQXR0cmlidXRlcyksXG5cdFx0Y29sb3I6IGdldEV2ZW50Q29sb3IoZXZlbnQuQWN0aW9uKSxcblx0XHRhY3RvcjogZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5uYW1lIHx8IGV2ZW50LkFjdG9yLklELnN1YnN0cmluZygwLCAxMiksXG5cdFx0c291cmNlOiAnZG9ja2VyJyBhcyBjb25zdCxcblx0fSkpXG59XG5cbi8qKlxuICogRm9ybWF0IGNoYW9zIGV2ZW50cyBmb3IgdmlzdWFsaXphdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhb3NFdmVudHMoZXZlbnRzOiBDaGFvc0V2ZW50W10pOiBGb3JtYXR0ZWRFdmVudFtdIHtcblx0cmV0dXJuIGV2ZW50cy5tYXAoKGV2ZW50KSA9PiAoe1xuXHRcdHRpbWVzdGFtcDogZXZlbnQuZXBvY2hfbXMsXG5cdFx0YWN0aW9uOiAnY2hhb3MnLFxuXHRcdHR5cGU6ICdjaGFvcycsXG5cdFx0bGFiZWw6IGZvcm1hdENoYW9zRXZlbnRMYWJlbChldmVudCksXG5cdFx0aWNvbjogZ2V0Q2hhb3NFdmVudEljb24oZXZlbnQuZGVzY3JpcHRpb24pLFxuXHRcdGNvbG9yOiBnZXRDaGFvc0V2ZW50Q29sb3IoKSxcblx0XHRhY3RvcjogZXZlbnQuc2NyaXB0LFxuXHRcdHNvdXJjZTogJ2NoYW9zJyBhcyBjb25zdCxcblx0XHRkdXJhdGlvbl9tczogZXZlbnQuZHVyYXRpb25fbXMsXG5cdH0pKVxufVxuIiwKICAgICIvKipcbiAqIEdpdEh1YiBDaGVja3MgQVBJIGludGVncmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcywgdHlwZSBUaHJlc2hvbGRDb25maWcgfSBmcm9tICcuL3RocmVzaG9sZHMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hlY2tPcHRpb25zIHtcblx0dG9rZW46IHN0cmluZ1xuXHRvd25lcjogc3RyaW5nXG5cdHJlcG86IHN0cmluZ1xuXHRzaGE6IHN0cmluZ1xuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uXG5cdHRocmVzaG9sZHM6IFRocmVzaG9sZENvbmZpZ1xuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBDcmVhdGUgR2l0SHViIENoZWNrIGZvciB3b3JrbG9hZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya2xvYWRDaGVjayhvcHRpb25zOiBDaGVja09wdGlvbnMpOiBQcm9taXNlPHsgaWQ6IG51bWJlcjsgdXJsOiBzdHJpbmcgfT4ge1xuXHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQob3B0aW9ucy50b2tlbilcblxuXHRsZXQgbmFtZSA9IGBTTE86ICR7b3B0aW9ucy53b3JrbG9hZC53b3JrbG9hZH1gXG5cdGxldCBldmFsdWF0aW9uID0gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMob3B0aW9ucy53b3JrbG9hZC5tZXRyaWNzLCBvcHRpb25zLnRocmVzaG9sZHMpXG5cdGxldCBjb25jbHVzaW9uID0gZGV0ZXJtaW5lQ29uY2x1c2lvbkZyb21FdmFsdWF0aW9uKGV2YWx1YXRpb24ub3ZlcmFsbClcblx0bGV0IHRpdGxlID0gZ2VuZXJhdGVUaXRsZShvcHRpb25zLndvcmtsb2FkLCBldmFsdWF0aW9uKVxuXHRsZXQgc3VtbWFyeVRleHQgPSBnZW5lcmF0ZVN1bW1hcnkob3B0aW9ucy53b3JrbG9hZCwgZXZhbHVhdGlvbiwgb3B0aW9ucy5yZXBvcnRVcmwpXG5cblx0aW5mbyhgQ3JlYXRpbmcgY2hlY2sgXCIke25hbWV9XCIgd2l0aCBjb25jbHVzaW9uOiAke2NvbmNsdXNpb259YClcblxuXHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuY2hlY2tzLmNyZWF0ZSh7XG5cdFx0b3duZXI6IG9wdGlvbnMub3duZXIsXG5cdFx0cmVwbzogb3B0aW9ucy5yZXBvLFxuXHRcdG5hbWUsXG5cdFx0aGVhZF9zaGE6IG9wdGlvbnMuc2hhLFxuXHRcdHN0YXR1czogJ2NvbXBsZXRlZCcsXG5cdFx0Y29uY2x1c2lvbixcblx0XHRvdXRwdXQ6IHtcblx0XHRcdHRpdGxlLFxuXHRcdFx0c3VtbWFyeTogc3VtbWFyeVRleHQsXG5cdFx0fSxcblx0fSlcblxuXHRpbmZvKGBDaGVjayBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRyZXR1cm4geyBpZDogZGF0YS5pZCwgdXJsOiBkYXRhLmh0bWxfdXJsISB9XG59XG5cbi8qKlxuICogTWFwIHRocmVzaG9sZCBzZXZlcml0eSB0byBHaXRIdWIgQ2hlY2sgY29uY2x1c2lvblxuICovXG5mdW5jdGlvbiBkZXRlcm1pbmVDb25jbHVzaW9uRnJvbUV2YWx1YXRpb24oXG5cdHNldmVyaXR5OiAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZmFpbHVyZSdcbik6ICdzdWNjZXNzJyB8ICduZXV0cmFsJyB8ICdmYWlsdXJlJyB7XG5cdGlmIChzZXZlcml0eSA9PT0gJ2ZhaWx1cmUnKSByZXR1cm4gJ2ZhaWx1cmUnXG5cdGlmIChzZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSByZXR1cm4gJ25ldXRyYWwnXG5cdHJldHVybiAnc3VjY2Vzcydcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBjaGVjayB0aXRsZVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVRpdGxlKFxuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uLFxuXHRldmFsdWF0aW9uOiB7IG92ZXJhbGw6IHN0cmluZzsgZmFpbHVyZXM6IGFueVtdOyB3YXJuaW5nczogYW55W10gfVxuKTogc3RyaW5nIHtcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH0gY3JpdGljYWwgdGhyZXNob2xkKHMpIHZpb2xhdGVkYFxuXHR9XG5cblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyB0aHJlc2hvbGQocykgZXhjZWVkZWRgXG5cdH1cblxuXHRpZiAod29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHMgPiAwKSB7XG5cdFx0cmV0dXJuIGAke3dvcmtsb2FkLnN1bW1hcnkuaW1wcm92ZW1lbnRzfSBpbXByb3ZlbWVudChzKSBkZXRlY3RlZGBcblx0fVxuXG5cdHJldHVybiAnQWxsIG1ldHJpY3Mgd2l0aGluIHRocmVzaG9sZHMnXG59XG5cbi8qKlxuICogR2VuZXJhdGUgY2hlY2sgc3VtbWFyeVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVN1bW1hcnkoXG5cdHdvcmtsb2FkOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdGV2YWx1YXRpb246IHsgb3ZlcmFsbDogc3RyaW5nOyBmYWlsdXJlczogYW55W107IHdhcm5pbmdzOiBhbnlbXSB9LFxuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBsaW5lcyA9IFtcblx0XHRgKipNZXRyaWNzIGFuYWx5emVkOioqICR7d29ya2xvYWQuc3VtbWFyeS50b3RhbH1gLFxuXHRcdGAtIPCflLQgQ3JpdGljYWw6ICR7ZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGh9YCxcblx0XHRgLSDwn5+hIFdhcm5pbmdzOiAke2V2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RofWAsXG5cdFx0YC0g8J+foiBJbXByb3ZlbWVudHM6ICR7d29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHN9YCxcblx0XHRgLSDimqogU3RhYmxlOiAke3dvcmtsb2FkLnN1bW1hcnkuc3RhYmxlfWAsXG5cdFx0JycsXG5cdF1cblxuXHRpZiAocmVwb3J0VXJsKSB7XG5cdFx0bGluZXMucHVzaChg8J+TiiBbVmlldyBkZXRhaWxlZCBIVE1MIHJlcG9ydF0oJHtyZXBvcnRVcmx9KWAsICcnKVxuXHR9XG5cblx0Ly8gQ3JpdGljYWwgZmFpbHVyZXNcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDinYwgQ3JpdGljYWwgVGhyZXNob2xkcyBWaW9sYXRlZCcsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGV2YWx1YXRpb24uZmFpbHVyZXMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gV2FybmluZ3Ncblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDimqDvuI8gV2FybmluZyBUaHJlc2hvbGRzIEV4Y2VlZGVkJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgZXZhbHVhdGlvbi53YXJuaW5ncy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdGxpbmVzLnB1c2goJycpXG5cdH1cblxuXHQvLyBUb3AgaW1wcm92ZW1lbnRzXG5cdGxldCBpbXByb3ZlbWVudHMgPSB3b3JrbG9hZC5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS5jaGFuZ2UuZGlyZWN0aW9uID09PSAnYmV0dGVyJylcblx0XHQuc29ydCgoYSwgYikgPT4gTWF0aC5hYnMoYi5jaGFuZ2UucGVyY2VudCkgLSBNYXRoLmFicyhhLmNoYW5nZS5wZXJjZW50KSlcblxuXHRpZiAoaW1wcm92ZW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg8J+foiBUb3AgSW1wcm92ZW1lbnRzJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgaW1wcm92ZW1lbnRzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSlgXG5cdFx0XHQpXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG59XG4iLAogICAgIi8qKlxuICogVGhyZXNob2xkcyBjb25maWd1cmF0aW9uIGFuZCBldmFsdWF0aW9uXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xuXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBNZXRyaWNDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBNZXRyaWNUaHJlc2hvbGQge1xuXHRuYW1lPzogc3RyaW5nIC8vIEV4YWN0IG1ldHJpYyBuYW1lIChoaWdoZXIgcHJpb3JpdHkgdGhhbiBwYXR0ZXJuKVxuXHRwYXR0ZXJuPzogc3RyaW5nIC8vIEdsb2IgcGF0dGVybiAobG93ZXIgcHJpb3JpdHkpXG5cdGRpcmVjdGlvbj86ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnXG5cdHdhcm5pbmdfbWluPzogbnVtYmVyXG5cdGNyaXRpY2FsX21pbj86IG51bWJlclxuXHR3YXJuaW5nX21heD86IG51bWJlclxuXHRjcml0aWNhbF9tYXg/OiBudW1iZXJcblx0d2FybmluZ19jaGFuZ2VfcGVyY2VudD86IG51bWJlclxuXHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudD86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVzaG9sZENvbmZpZyB7XG5cdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRkZWZhdWx0OiB7XG5cdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHR9XG5cdG1ldHJpY3M/OiBNZXRyaWNUaHJlc2hvbGRbXVxufVxuXG5leHBvcnQgdHlwZSBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJyB8ICd3YXJuaW5nJyB8ICdmYWlsdXJlJ1xuXG4vKipcbiAqIFBhcnNlIFlBTUwgdGhyZXNob2xkcyBjb25maWdcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGFyc2VUaHJlc2hvbGRzWWFtbCh5YW1sQ29udGVudDogc3RyaW5nKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWcgfCBudWxsPiB7XG5cdGlmICgheWFtbENvbnRlbnQgfHwgeWFtbENvbnRlbnQudHJpbSgpID09PSAnJykge1xuXHRcdHJldHVybiBudWxsXG5cdH1cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoJ3lxJywgWyctbz1qc29uJywgJy4nXSwge1xuXHRcdFx0aW5wdXQ6IEJ1ZmZlci5mcm9tKHlhbWxDb250ZW50LCAndXRmLTgnKSxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGpzb24gPSBjaHVua3Muam9pbignJylcblx0XHRsZXQgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uKSBhcyBUaHJlc2hvbGRDb25maWdcblxuXHRcdHJldHVybiBwYXJzZWRcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2UgdGhyZXNob2xkcyBZQU1MOiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG5cbi8qKlxuICogTWVyZ2UgdHdvIHRocmVzaG9sZCBjb25maWdzIChjdXN0b20gZXh0ZW5kcy9vdmVycmlkZXMgZGVmYXVsdClcbiAqL1xuZnVuY3Rpb24gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGRlZmF1bHRDb25maWc6IFRocmVzaG9sZENvbmZpZywgY3VzdG9tQ29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBUaHJlc2hvbGRDb25maWcge1xuXHRyZXR1cm4ge1xuXHRcdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IGN1c3RvbUNvbmZpZy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcubmV1dHJhbF9jaGFuZ2VfcGVyY2VudCxcblx0XHRkZWZhdWx0OiB7XG5cdFx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OlxuXHRcdFx0XHRjdXN0b21Db25maWcuZGVmYXVsdD8ud2FybmluZ19jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudCxcblx0XHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OlxuXHRcdFx0XHRjdXN0b21Db25maWcuZGVmYXVsdD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5kZWZhdWx0LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50LFxuXHRcdH0sXG5cdFx0bWV0cmljczogWy4uLihjdXN0b21Db25maWcubWV0cmljcyB8fCBbXSksIC4uLihkZWZhdWx0Q29uZmlnLm1ldHJpY3MgfHwgW10pXSxcblx0XHQvLyBDdXN0b20gbWV0cmljcyBjb21lIGZpcnN0LCBzbyB0aGV5IGhhdmUgaGlnaGVyIHByaW9yaXR5IGluIGZpbmRNYXRjaGluZ1RocmVzaG9sZCgpXG5cdH1cbn1cblxuLyoqXG4gKiBMb2FkIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbG9hZERlZmF1bHRUaHJlc2hvbGRzKCk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdGRlYnVnKCdMb2FkaW5nIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWwnKVxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uLy4uLycpXG5cdGxldCBkZWZhdWx0UGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JywgJ3RocmVzaG9sZHMueWFtbCcpXG5cblx0aWYgKGZzLmV4aXN0c1N5bmMoZGVmYXVsdFBhdGgpKSB7XG5cdFx0bGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZGVmYXVsdFBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjb25maWcpIHJldHVybiBjb25maWdcblx0fVxuXG5cdC8vIEZhbGxiYWNrIHRvIGhhcmRjb2RlZCBkZWZhdWx0c1xuXHR3YXJuaW5nKCdDb3VsZCBub3QgbG9hZCBkZWZhdWx0IHRocmVzaG9sZHMsIHVzaW5nIGhhcmRjb2RlZCBkZWZhdWx0cycpXG5cdHJldHVybiB7XG5cdFx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogNS4wLFxuXHRcdGRlZmF1bHQ6IHtcblx0XHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IDIwLjAsXG5cdFx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDogNTAuMCxcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gd2l0aCBtZXJnaW5nOlxuICogMS4gTG9hZCBkZWZhdWx0IGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbFxuICogMi4gTWVyZ2Ugd2l0aCBjdXN0b20gWUFNTCAoaW5saW5lKSBpZiBwcm92aWRlZFxuICogMy4gTWVyZ2Ugd2l0aCBjdXN0b20gZmlsZSBpZiBwcm92aWRlZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRocmVzaG9sZHMoY3VzdG9tWWFtbD86IHN0cmluZywgY3VzdG9tUGF0aD86IHN0cmluZyk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdC8vIEFsd2F5cyBsb2FkIGRlZmF1bHRzIGZpcnN0XG5cdGxldCBjb25maWcgPSBhd2FpdCBsb2FkRGVmYXVsdFRocmVzaG9sZHMoKVxuXG5cdC8vIE1lcmdlIHdpdGggY3VzdG9tIFlBTUwgKGlubGluZSlcblx0aWYgKGN1c3RvbVlhbWwpIHtcblx0XHRkZWJ1ZygnTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGlubGluZSBZQU1MJylcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjdXN0b21ZYW1sKVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHQvLyBNZXJnZSB3aXRoIGN1c3RvbSBmaWxlXG5cdGlmIChjdXN0b21QYXRoICYmIGZzLmV4aXN0c1N5bmMoY3VzdG9tUGF0aCkpIHtcblx0XHRkZWJ1ZyhgTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGZpbGU6ICR7Y3VzdG9tUGF0aH1gKVxuXHRcdGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGN1c3RvbVBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gY29uZmlnXG59XG5cbi8qKlxuICogTWF0Y2ggbWV0cmljIG5hbWUgYWdhaW5zdCBwYXR0ZXJuIChzdXBwb3J0cyB3aWxkY2FyZHMpXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybihtZXRyaWNOYW1lOiBzdHJpbmcsIHBhdHRlcm46IHN0cmluZyk6IGJvb2xlYW4ge1xuXHQvLyBDb252ZXJ0IGdsb2IgcGF0dGVybiB0byByZWdleFxuXHRsZXQgcmVnZXhQYXR0ZXJuID0gcGF0dGVyblxuXHRcdC5yZXBsYWNlKC9cXCovZywgJy4qJykgLy8gKiAtPiAuKlxuXHRcdC5yZXBsYWNlKC9cXD8vZywgJy4nKSAvLyA/IC0+IC5cblxuXHRsZXQgcmVnZXggPSBuZXcgUmVnRXhwKGBeJHtyZWdleFBhdHRlcm59JGAsICdpJylcblx0cmV0dXJuIHJlZ2V4LnRlc3QobWV0cmljTmFtZSlcbn1cblxuLyoqXG4gKiBGaW5kIG1hdGNoaW5nIHRocmVzaG9sZCBmb3IgbWV0cmljIChleGFjdCBtYXRjaCBmaXJzdCwgdGhlbiBwYXR0ZXJuKVxuICovXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQobWV0cmljTmFtZTogc3RyaW5nLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IE1ldHJpY1RocmVzaG9sZCB8IG51bGwge1xuXHRpZiAoIWNvbmZpZy5tZXRyaWNzKSByZXR1cm4gbnVsbFxuXG5cdC8vIEZpcnN0IHBhc3M6IGV4YWN0IG1hdGNoIChoaWdoZXN0IHByaW9yaXR5KVxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLm5hbWUgJiYgdGhyZXNob2xkLm5hbWUgPT09IG1ldHJpY05hbWUpIHtcblx0XHRcdHJldHVybiB0aHJlc2hvbGRcblx0XHR9XG5cdH1cblxuXHQvLyBTZWNvbmQgcGFzczogcGF0dGVybiBtYXRjaFxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLnBhdHRlcm4gJiYgbWF0Y2hQYXR0ZXJuKG1ldHJpY05hbWUsIHRocmVzaG9sZC5wYXR0ZXJuKSkge1xuXHRcdFx0cmV0dXJuIHRocmVzaG9sZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogRXZhbHVhdGUgdGhyZXNob2xkIGZvciBhIG1ldHJpYyBjb21wYXJpc29uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uOiBNZXRyaWNDb21wYXJpc29uLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IFRocmVzaG9sZFNldmVyaXR5IHtcblx0Ly8gQ2FuJ3QgZXZhbHVhdGUgd2l0aG91dCBiYXNlXG5cdGlmICghY29tcGFyaXNvbi5iYXNlLmF2YWlsYWJsZSkge1xuXHRcdHJldHVybiAnc3VjY2Vzcydcblx0fVxuXG5cdGxldCB0aHJlc2hvbGQgPSBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQoY29tcGFyaXNvbi5uYW1lLCBjb25maWcpXG5cblx0Ly8gQ2hlY2sgYWJzb2x1dGUgdmFsdWUgdGhyZXNob2xkcyBmaXJzdFxuXHRpZiAodGhyZXNob2xkKSB7XG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWluXG5cdFx0aWYgKHRocmVzaG9sZC5jcml0aWNhbF9taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQuY3JpdGljYWxfbWluKSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBiZWxvdyBjcml0aWNhbF9taW4gKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA8ICR7dGhyZXNob2xkLmNyaXRpY2FsX21pbn0pYClcblx0XHRcdHJldHVybiAnZmFpbHVyZSdcblx0XHR9XG5cblx0XHQvLyBDaGVjayB3YXJuaW5nX21pblxuXHRcdGlmICh0aHJlc2hvbGQud2FybmluZ19taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQud2FybmluZ19taW4pIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGJlbG93IHdhcm5pbmdfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC53YXJuaW5nX21pbn0pYClcblx0XHRcdHJldHVybiAnd2FybmluZydcblx0XHR9XG5cblx0XHQvLyBDaGVjayBjcml0aWNhbF9tYXhcblx0XHRpZiAodGhyZXNob2xkLmNyaXRpY2FsX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC5jcml0aWNhbF9tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIGNyaXRpY2FsX21heCAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9ID4gJHt0aHJlc2hvbGQuY3JpdGljYWxfbWF4fSlgKVxuXHRcdFx0cmV0dXJuICdmYWlsdXJlJ1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHdhcm5pbmdfbWF4XG5cdFx0aWYgKHRocmVzaG9sZC53YXJuaW5nX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC53YXJuaW5nX21heCkge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYWJvdmUgd2FybmluZ19tYXggKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA+ICR7dGhyZXNob2xkLndhcm5pbmdfbWF4fSlgKVxuXHRcdFx0cmV0dXJuICd3YXJuaW5nJ1xuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIGNoYW5nZSBwZXJjZW50IHRocmVzaG9sZHNcblx0aWYgKCFpc05hTihjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50KSkge1xuXHRcdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudClcblxuXHRcdC8vIFVzZSBtZXRyaWMtc3BlY2lmaWMgb3IgZGVmYXVsdCB0aHJlc2hvbGRzXG5cdFx0bGV0IHdhcm5pbmdUaHJlc2hvbGQgPSB0aHJlc2hvbGQ/Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudFxuXHRcdGxldCBjcml0aWNhbFRocmVzaG9sZCA9IHRocmVzaG9sZD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQuY3JpdGljYWxfY2hhbmdlX3BlcmNlbnRcblxuXHRcdC8vIE9ubHkgdHJpZ2dlciBpZiBjaGFuZ2UgaXMgaW4gXCJ3b3JzZVwiIGRpcmVjdGlvblxuXHRcdGlmIChjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb24gPT09ICd3b3JzZScpIHtcblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gY3JpdGljYWxUaHJlc2hvbGQpIHtcblx0XHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogY3JpdGljYWwgcmVncmVzc2lvbiAoJHtjaGFuZ2VQZXJjZW50LnRvRml4ZWQoMSl9JSA+ICR7Y3JpdGljYWxUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRyZXR1cm4gJ2ZhaWx1cmUnXG5cdFx0XHR9XG5cblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gd2FybmluZ1RocmVzaG9sZCkge1xuXHRcdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiB3YXJuaW5nIHJlZ3Jlc3Npb24gKCR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDEpfSUgPiAke3dhcm5pbmdUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRyZXR1cm4gJ3dhcm5pbmcnXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuICdzdWNjZXNzJ1xufVxuXG4vKipcbiAqIEV2YWx1YXRlIGFsbCBtZXRyaWNzIGFuZCByZXR1cm4gb3ZlcmFsbCBzZXZlcml0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMoXG5cdGNvbXBhcmlzb25zOiBNZXRyaWNDb21wYXJpc29uW10sXG5cdGNvbmZpZzogVGhyZXNob2xkQ29uZmlnXG4pOiB7XG5cdG92ZXJhbGw6IFRocmVzaG9sZFNldmVyaXR5XG5cdGZhaWx1cmVzOiBNZXRyaWNDb21wYXJpc29uW11cblx0d2FybmluZ3M6IE1ldHJpY0NvbXBhcmlzb25bXVxufSB7XG5cdGxldCBmYWlsdXJlczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblx0bGV0IHdhcm5pbmdzOiBNZXRyaWNDb21wYXJpc29uW10gPSBbXVxuXG5cdGZvciAobGV0IGNvbXBhcmlzb24gb2YgY29tcGFyaXNvbnMpIHtcblx0XHRsZXQgc2V2ZXJpdHkgPSBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uLCBjb25maWcpXG5cblx0XHRpZiAoc2V2ZXJpdHkgPT09ICdmYWlsdXJlJykge1xuXHRcdFx0ZmFpbHVyZXMucHVzaChjb21wYXJpc29uKVxuXHRcdH0gZWxzZSBpZiAoc2V2ZXJpdHkgPT09ICd3YXJuaW5nJykge1xuXHRcdFx0d2FybmluZ3MucHVzaChjb21wYXJpc29uKVxuXHRcdH1cblx0fVxuXG5cdGxldCBvdmVyYWxsOiBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJ1xuXHRpZiAoZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdG92ZXJhbGwgPSAnZmFpbHVyZSdcblx0fSBlbHNlIGlmICh3YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0b3ZlcmFsbCA9ICd3YXJuaW5nJ1xuXHR9XG5cblx0cmV0dXJuIHsgb3ZlcmFsbCwgZmFpbHVyZXMsIHdhcm5pbmdzIH1cbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgUFIgY29tbWVudCBnZW5lcmF0aW9uIGFuZCBtYW5hZ2VtZW50XG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgdHlwZSB7IFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWVudERhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGFydGlmYWN0VXJsczogTWFwPHN0cmluZywgc3RyaW5nPlxuXHRjaGVja1VybHM6IE1hcDxzdHJpbmcsIHN0cmluZz5cblx0am9iU3VtbWFyeVVybD86IHN0cmluZ1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIFBSIGNvbW1lbnQgYm9keVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDb21tZW50Qm9keShkYXRhOiBDb21tZW50RGF0YSk6IHN0cmluZyB7XG5cdGxldCB0b3RhbFJlZ3Jlc3Npb25zID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5yZWdyZXNzaW9ucywgMClcblx0bGV0IHRvdGFsSW1wcm92ZW1lbnRzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5pbXByb3ZlbWVudHMsIDApXG5cblx0bGV0IHN0YXR1c0Vtb2ppID0gdG90YWxSZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0bGV0IHN0YXR1c1RleHQgPSB0b3RhbFJlZ3Jlc3Npb25zID4gMCA/IGAke3RvdGFsUmVncmVzc2lvbnN9IHJlZ3Jlc3Npb25zYCA6ICdBbGwgY2xlYXInXG5cblx0bGV0IGhlYWRlciA9IGAjIyDwn4yLIFNMTyBUZXN0IFJlc3VsdHNcblxuKipTdGF0dXMqKjogJHtzdGF0dXNFbW9qaX0gJHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkcyB0ZXN0ZWQg4oCiICR7c3RhdHVzVGV4dH1cblxuJHtkYXRhLmpvYlN1bW1hcnlVcmwgPyBg8J+TiCBbVmlldyBKb2IgU3VtbWFyeV0oJHtkYXRhLmpvYlN1bW1hcnlVcmx9KSBmb3IgZGV0YWlsZWQgY29tcGFyaXNvblxcbmAgOiAnJ31gXG5cblx0bGV0IHRhYmxlID0gYFxufCBXb3JrbG9hZCB8IE1ldHJpY3MgfCBSZWdyZXNzaW9ucyB8IEltcHJvdmVtZW50cyB8IExpbmtzIHxcbnwtLS0tLS0tLS0tfC0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS18XG4ke2RhdGEud29ya2xvYWRzXG5cdC5tYXAoKHcpID0+IHtcblx0XHRsZXQgZW1vamkgPSB3LnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogdy5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDAgPyAn8J+foicgOiAn4pqqJ1xuXHRcdGxldCByZXBvcnRMaW5rID0gZGF0YS5hcnRpZmFjdFVybHMuZ2V0KHcud29ya2xvYWQpIHx8ICcjJ1xuXHRcdGxldCBjaGVja0xpbmsgPSBkYXRhLmNoZWNrVXJscy5nZXQody53b3JrbG9hZCkgfHwgJyMnXG5cblx0XHRyZXR1cm4gYHwgJHtlbW9qaX0gJHt3Lndvcmtsb2FkfSB8ICR7dy5zdW1tYXJ5LnRvdGFsfSB8ICR7dy5zdW1tYXJ5LnJlZ3Jlc3Npb25zfSB8ICR7dy5zdW1tYXJ5LmltcHJvdmVtZW50c30gfCBbUmVwb3J0XSgke3JlcG9ydExpbmt9KSDigKIgW0NoZWNrXSgke2NoZWNrTGlua30pIHxgXG5cdH0pXG5cdC5qb2luKCdcXG4nKX1cbmBcblxuXHRsZXQgZm9vdGVyID0gYFxcbi0tLVxcbipHZW5lcmF0ZWQgYnkgW3lkYi1zbG8tYWN0aW9uXShodHRwczovL2dpdGh1Yi5jb20veWRiLXBsYXRmb3JtL3lkYi1zbG8tYWN0aW9uKSpgXG5cblx0cmV0dXJuIGhlYWRlciArIHRhYmxlICsgZm9vdGVyXG59XG5cbi8qKlxuICogRmluZCBleGlzdGluZyBTTE8gY29tbWVudCBpbiBQUlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEV4aXN0aW5nU0xPQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyXG4pOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXG5cdGluZm8oYFNlYXJjaGluZyBmb3IgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFIgIyR7cHJOdW1iZXJ9Li4uYClcblxuXHRsZXQgeyBkYXRhOiBjb21tZW50cyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdG93bmVyLFxuXHRcdHJlcG8sXG5cdFx0aXNzdWVfbnVtYmVyOiBwck51bWJlcixcblx0fSlcblxuXHRmb3IgKGxldCBjb21tZW50IG9mIGNvbW1lbnRzKSB7XG5cdFx0aWYgKGNvbW1lbnQuYm9keT8uaW5jbHVkZXMoJ/CfjIsgU0xPIFRlc3QgUmVzdWx0cycpKSB7XG5cdFx0XHRpbmZvKGBGb3VuZCBleGlzdGluZyBjb21tZW50OiAke2NvbW1lbnQuaWR9YClcblx0XHRcdHJldHVybiBjb21tZW50LmlkXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBDcmVhdGUgb3IgdXBkYXRlIFBSIGNvbW1lbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZU9yVXBkYXRlQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyLFxuXHRib2R5OiBzdHJpbmdcbik6IFByb21pc2U8eyB1cmw6IHN0cmluZzsgaWQ6IG51bWJlciB9PiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXhpc3RpbmdJZCA9IGF3YWl0IGZpbmRFeGlzdGluZ1NMT0NvbW1lbnQodG9rZW4sIG93bmVyLCByZXBvLCBwck51bWJlcilcblxuXHRpZiAoZXhpc3RpbmdJZCkge1xuXHRcdGluZm8oYFVwZGF0aW5nIGV4aXN0aW5nIGNvbW1lbnQgJHtleGlzdGluZ0lkfS4uLmApXG5cblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLnVwZGF0ZUNvbW1lbnQoe1xuXHRcdFx0b3duZXIsXG5cdFx0XHRyZXBvLFxuXHRcdFx0Y29tbWVudF9pZDogZXhpc3RpbmdJZCxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGluZm8oYENvbW1lbnQgdXBkYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cblx0XHRyZXR1cm4geyB1cmw6IGRhdGEuaHRtbF91cmwhLCBpZDogZGF0YS5pZCB9XG5cdH0gZWxzZSB7XG5cdFx0aW5mbyhgQ3JlYXRpbmcgbmV3IGNvbW1lbnQuLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcblx0XHRcdG93bmVyLFxuXHRcdFx0cmVwbyxcblx0XHRcdGlzc3VlX251bWJlcjogcHJOdW1iZXIsXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRpbmZvKGBDb21tZW50IGNyZWF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogSFRNTCByZXBvcnQgZ2VuZXJhdGlvbiB3aXRoIENoYXJ0LmpzXG4gKi9cblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMsIE1ldHJpY3NNYXAsIFNlcmllcyB9IGZyb20gJy4vbWV0cmljcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBIVE1MUmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXBcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdGNvbW1pdHM6IHtcblx0XHRjdXJyZW50OiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdFx0YmFzZTogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHR9XG5cdG1ldGE6IHtcblx0XHRwck51bWJlcjogbnVtYmVyXG5cdFx0Z2VuZXJhdGVkQXQ6IHN0cmluZ1xuXHRcdHRlc3REdXJhdGlvbj86IHN0cmluZ1xuXHR9XG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCByZXBvcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSFRNTFJlcG9ydChkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cblx0PG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cblx0PHRpdGxlPlNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L3RpdGxlPlxuXHQ8c3R5bGU+JHtnZXRTdHlsZXMoKX08L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG5cdDxoZWFkZXI+XG5cdFx0PGgxPvCfjIsgU0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvaDE+XG5cdFx0PGRpdiBjbGFzcz1cImNvbW1pdC1pbmZvXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBjdXJyZW50XCI+XG5cdFx0XHRcdEN1cnJlbnQ6IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5jdXJyZW50LnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2RhdGEuY29tbWl0cy5jdXJyZW50LnNob3J0fTwvYT5cblx0XHRcdDwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwidnNcIj52czwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiY29tbWl0IGJhc2VcIj5cblx0XHRcdFx0QmFzZTogPGEgaHJlZj1cIiR7ZGF0YS5jb21taXRzLmJhc2UudXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7ZGF0YS5jb21taXRzLmJhc2Uuc2hvcnR9PC9hPlxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJtZXRhXCI+XG5cdFx0XHQ8c3Bhbj5QUiAjJHtkYXRhLm1ldGEucHJOdW1iZXJ9PC9zcGFuPlxuXHRcdFx0JHtkYXRhLm1ldGEudGVzdER1cmF0aW9uID8gYDxzcGFuPkR1cmF0aW9uOiAke2RhdGEubWV0YS50ZXN0RHVyYXRpb259PC9zcGFuPmAgOiAnJ31cblx0XHRcdDxzcGFuPkdlbmVyYXRlZDogJHtkYXRhLm1ldGEuZ2VuZXJhdGVkQXR9PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHQ8L2hlYWRlcj5cblxuXHQ8c2VjdGlvbiBjbGFzcz1cInN1bW1hcnlcIj5cblx0XHQ8aDI+8J+TiiBNZXRyaWNzIE92ZXJ2aWV3PC9oMj5cblx0XHQ8ZGl2IGNsYXNzPVwic3RhdHNcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmRcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnRvdGFsfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlRvdGFsIE1ldHJpY3M8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCBpbXByb3ZlbWVudHNcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50c308L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5JbXByb3ZlbWVudHM8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCByZWdyZXNzaW9uc1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkucmVncmVzc2lvbnN9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+UmVncmVzc2lvbnM8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCBzdGFibGVcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnN0YWJsZX08L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5TdGFibGU8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdCR7Z2VuZXJhdGVDb21wYXJpc29uVGFibGUoZGF0YS5jb21wYXJpc29uKX1cblx0PC9zZWN0aW9uPlxuXG5cdDxzZWN0aW9uIGNsYXNzPVwiY2hhcnRzXCI+XG5cdFx0PGgyPvCfk4ggVGltZSBTZXJpZXM8L2gyPlxuXHRcdCR7Z2VuZXJhdGVDaGFydHMoZGF0YSl9XG5cdDwvc2VjdGlvbj5cblxuXHQke2RhdGEuZXZlbnRzLmxlbmd0aCA+IDAgPyBnZW5lcmF0ZUV2ZW50c1NlY3Rpb24oZGF0YS5ldmVudHMpIDogJyd9XG5cblx0PGZvb3Rlcj5cblx0XHQ8cD5HZW5lcmF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb25cIiB0YXJnZXQ9XCJfYmxhbmtcIj55ZGItc2xvLWFjdGlvbjwvYT48L3A+XG5cdDwvZm9vdGVyPlxuXG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydC5qc0A0LjQuMC9kaXN0L2NoYXJ0LnVtZC5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtYWRhcHRlci1kYXRlLWZuc0AzLjAuMC9kaXN0L2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy5idW5kbGUubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uQDMuMC4xL2Rpc3QvY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbi5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdD5cblx0XHQke2dlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGEpfVxuXHQ8L3NjcmlwdD5cbjwvYm9keT5cbjwvaHRtbD5gXG59XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHRleHRcblx0XHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuXHRcdC5yZXBsYWNlKC88L2csICcmbHQ7Jylcblx0XHQucmVwbGFjZSgvPi9nLCAnJmd0OycpXG5cdFx0LnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuXHRcdC5yZXBsYWNlKC8nL2csICcmIzAzOTsnKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24pOiBzdHJpbmcge1xuXHRsZXQgcm93cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5tYXAoXG5cdFx0XHQobSkgPT4gYFxuXHRcdDx0ciBjbGFzcz1cIiR7bS5jaGFuZ2UuZGlyZWN0aW9ufVwiPlxuXHRcdFx0PHRkPiR7ZXNjYXBlSHRtbChtLm5hbWUpfTwvdGQ+XG5cdFx0XHQ8dGQ+JHtmb3JtYXRWYWx1ZShtLmN1cnJlbnQudmFsdWUsIG0ubmFtZSl9PC90ZD5cblx0XHRcdDx0ZD4ke20uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2UudmFsdWUsIG0ubmFtZSkgOiAnTi9BJ308L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2hhbmdlLWNlbGxcIj4ke20uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRDaGFuZ2UobS5jaGFuZ2UucGVyY2VudCwgbS5jaGFuZ2UuZGlyZWN0aW9uKSA6ICdOL0EnfTwvdGQ+XG5cdFx0PC90cj5cblx0YFxuXHRcdClcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHRcdDx0YWJsZSBjbGFzcz1cImNvbXBhcmlzb24tdGFibGVcIj5cblx0XHRcdDx0aGVhZD5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5NZXRyaWM8L3RoPlxuXHRcdFx0XHRcdDx0aD5DdXJyZW50PC90aD5cblx0XHRcdFx0XHQ8dGg+QmFzZTwvdGg+XG5cdFx0XHRcdFx0PHRoPkNoYW5nZTwvdGg+XG5cdFx0XHRcdDwvdHI+XG5cdFx0XHQ8L3RoZWFkPlxuXHRcdFx0PHRib2R5PlxuXHRcdFx0XHQke3Jvd3N9XG5cdFx0XHQ8L3Rib2R5PlxuXHRcdDwvdGFibGU+XG5cdGBcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydHMoZGF0YTogSFRNTFJlcG9ydERhdGEpOiBzdHJpbmcge1xuXHRyZXR1cm4gZGF0YS5jb21wYXJpc29uLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLnR5cGUgPT09ICdyYW5nZScpIC8vIE9ubHkgcmFuZ2UgbWV0cmljcyBoYXZlIGNoYXJ0c1xuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtY2FyZFwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWhlYWRlclwiPlxuXHRcdFx0XHQ8aDM+XG5cdFx0XHRcdFx0JHtlc2NhcGVIdG1sKGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJpbmRpY2F0b3IgJHtjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb259XCI+JHtmb3JtYXRDaGFuZ2UoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCwgY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uKX08L3NwYW4+XG5cdFx0XHRcdDwvaDM+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1tZXRhXCI+XG5cdFx0XHRcdFx0Q3VycmVudDogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmN1cnJlbnQudmFsdWUsIGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0JHtjb21wYXJpc29uLmJhc2UuYXZhaWxhYmxlID8gYCDigKIgQmFzZTogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmJhc2UudmFsdWUsIGNvbXBhcmlzb24ubmFtZSl9YCA6ICcnfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWNvbnRhaW5lclwiPlxuXHRcdFx0XHQ8Y2FudmFzIGlkPVwiY2hhcnQtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+PC9jYW52YXM+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0YFxuXHRcdH0pXG5cdFx0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRXZlbnRzU2VjdGlvbihldmVudHM6IEZvcm1hdHRlZEV2ZW50W10pOiBzdHJpbmcge1xuXHRsZXQgZXZlbnRzTGlzdCA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSkgPT4gYFxuXHRcdDxkaXYgY2xhc3M9XCJldmVudC1pdGVtXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LW1hcmtlclwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogJHtlLmNvbG9yfVwiPjwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtaWNvblwiPiR7ZS5pY29ufTwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtdGltZVwiPiR7Zm9ybWF0VGltZXN0YW1wKGUudGltZXN0YW1wKX08L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LWxhYmVsXCI+JHtlc2NhcGVIdG1sKGUubGFiZWwpfTwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0YFxuXHRcdClcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHQ8c2VjdGlvbiBjbGFzcz1cImV2ZW50cy1zZWN0aW9uXCI+XG5cdFx0PGgyPvCfk40gRXZlbnRzIFRpbWVsaW5lPC9oMj5cblx0XHQ8ZGl2IGNsYXNzPVwiZXZlbnRzLWxpc3RcIj5cblx0XHRcdCR7ZXZlbnRzTGlzdH1cblx0XHQ8L2Rpdj5cblx0PC9zZWN0aW9uPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGE6IEhUTUxSZXBvcnREYXRhKTogc3RyaW5nIHtcblx0bGV0IGNoYXJ0U2NyaXB0cyA9IGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKVxuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0cmV0dXJuIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoY29tcGFyaXNvbi5uYW1lLCBtZXRyaWMgYXMgQ29sbGVjdGVkTWV0cmljLCBkYXRhLmV2ZW50cylcblx0XHR9KVxuXHRcdC5qb2luKCdcXG4nKVxuXG5cdHJldHVybiBjaGFydFNjcmlwdHNcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTaW5nbGVDaGFydFNjcmlwdChtZXRyaWNOYW1lOiBzdHJpbmcsIG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10pOiBzdHJpbmcge1xuXHRsZXQgY3VycmVudFNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnY3VycmVudCcpXG5cdGxldCBiYXNlU2VyaWVzID0gKG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09ICdiYXNlJylcblxuXHRsZXQgY3VycmVudERhdGEgPSBjdXJyZW50U2VyaWVzXG5cdFx0PyBKU09OLnN0cmluZ2lmeShjdXJyZW50U2VyaWVzLnZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdDogJ1tdJ1xuXG5cdGxldCBiYXNlRGF0YSA9IGJhc2VTZXJpZXNcblx0XHQ/IEpTT04uc3RyaW5naWZ5KGJhc2VTZXJpZXMudmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0OiAnW10nXG5cblx0bGV0IGFubm90YXRpb25zID0gZXZlbnRzXG5cdFx0Lm1hcCgoZSkgPT4ge1xuXHRcdFx0aWYgKGUuZHVyYXRpb25fbXMpIHtcblx0XHRcdFx0Ly8gQm94IGFubm90YXRpb24gZm9yIGV2ZW50cyB3aXRoIGR1cmF0aW9uXG5cdFx0XHRcdGxldCB4TWF4ID0gZS50aW1lc3RhbXAgKiAxMDAwICsgZS5kdXJhdGlvbl9tc1xuXHRcdFx0XHRyZXR1cm4gYHtcblx0XHRcdHR5cGU6ICdib3gnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0eE1heDogJHt4TWF4fSxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM2MGE1ZmEyMCcsXG5cdFx0XHRib3JkZXJDb2xvcjogJyMzYjgyZjYnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDMsXG5cdFx0XHRsYWJlbDoge1xuXHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRjb250ZW50OiAnJHtlc2NhcGVKcyhlLmxhYmVsKX0nLFxuXHRcdFx0XHRwb3NpdGlvbjogJ3N0YXJ0Jyxcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzNiODJmNicsXG5cdFx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRcdGZvbnQ6IHsgc2l6ZTogMTIgfSxcblx0XHRcdFx0cGFkZGluZzogNlxuXHRcdFx0fVxuXHRcdH1gXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQvLyBMaW5lIGFubm90YXRpb24gZm9yIGluc3RhbnQgZXZlbnRzXG5cdFx0XHRcdHJldHVybiBge1xuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0eE1heDogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjM2I4MmY2Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAzLFxuXHRcdFx0bGFiZWw6IHtcblx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0Y29udGVudDogJyR7ZS5pY29ufScsXG5cdFx0XHRcdHBvc2l0aW9uOiAnc3RhcnQnLFxuXHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjM2I4MmY2Jyxcblx0XHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdFx0Zm9udDogeyBzaXplOiAxNCB9LFxuXHRcdFx0XHRwYWRkaW5nOiA0XG5cdFx0XHR9XG5cdFx0fWBcblx0XHRcdH1cblx0XHR9KVxuXHRcdC5qb2luKCcsXFxuJylcblxuXHRyZXR1cm4gYFxuKGZ1bmN0aW9uKCkge1xuXHRjb25zdCBjdHggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhcnQtJHtzYW5pdGl6ZUlkKG1ldHJpY05hbWUpfScpO1xuXHRpZiAoIWN0eCkgcmV0dXJuO1xuXG5cdG5ldyBDaGFydChjdHgsIHtcblx0XHR0eXBlOiAnbGluZScsXG5cdFx0ZGF0YToge1xuXHRcdFx0ZGF0YXNldHM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxhYmVsOiAnQ3VycmVudCcsXG5cdFx0XHRcdFx0ZGF0YTogJHtjdXJyZW50RGF0YX0sXG5cdFx0XHRcdFx0Ym9yZGVyQ29sb3I6ICcjM2I4MmY2Jyxcblx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjM2I4MmY2MjAnLFxuXHRcdFx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdFx0fSxcblx0XHRcdFx0JHtcblx0XHRcdFx0XHRiYXNlU2VyaWVzXG5cdFx0XHRcdFx0XHQ/IGB7XG5cdFx0XHRcdFx0bGFiZWw6ICdCYXNlJyxcblx0XHRcdFx0XHRkYXRhOiAke2Jhc2VEYXRhfSxcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogJyM5NGEzYjgnLFxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM5NGEzYjgyMCcsXG5cdFx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdLFxuXHRcdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdFx0fWBcblx0XHRcdFx0XHRcdDogJydcblx0XHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0b3B0aW9uczoge1xuXHRcdFx0cmVzcG9uc2l2ZTogdHJ1ZSxcblx0XHRcdG1haW50YWluQXNwZWN0UmF0aW86IGZhbHNlLFxuXHRcdFx0aW50ZXJhY3Rpb246IHtcblx0XHRcdFx0bW9kZTogJ2luZGV4Jyxcblx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0fSxcblx0XHRcdHNjYWxlczoge1xuXHRcdFx0XHR4OiB7XG5cdFx0XHRcdFx0dHlwZTogJ3RpbWUnLFxuXHRcdFx0XHRcdHRpbWU6IHtcblx0XHRcdFx0XHRcdHVuaXQ6ICdtaW51dGUnLFxuXHRcdFx0XHRcdFx0ZGlzcGxheUZvcm1hdHM6IHtcblx0XHRcdFx0XHRcdFx0bWludXRlOiAnSEg6bW0nXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRcdHRleHQ6ICdUaW1lJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0eToge1xuXHRcdFx0XHRcdGJlZ2luQXRaZXJvOiBmYWxzZSxcblx0XHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRcdHRleHQ6ICcke2VzY2FwZUpzKG1ldHJpY05hbWUpfSdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRwbHVnaW5zOiB7XG5cdFx0XHRcdGxlZ2VuZDoge1xuXHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0cG9zaXRpb246ICd0b3AnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRvb2x0aXA6IHtcblx0XHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRcdGludGVyc2VjdDogZmFsc2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0YW5ub3RhdGlvbjoge1xuXHRcdFx0XHRcdGFubm90YXRpb25zOiBbJHthbm5vdGF0aW9uc31dXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufSkoKTtcbmBcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVJZChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvW15hLXpBLVowLTldL2csICctJylcbn1cblxuZnVuY3Rpb24gZXNjYXBlSnMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZXN0YW1wKHRpbWVzdGFtcDogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKVxuXHRyZXR1cm4gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cmluZygxMSwgMTkpXG59XG5cbmZ1bmN0aW9uIGdldFN0eWxlcygpOiBzdHJpbmcge1xuXHRyZXR1cm4gYFxuKiB7XG5cdG1hcmdpbjogMDtcblx0cGFkZGluZzogMDtcblx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcbn1cblxuYm9keSB7XG5cdGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgJ0hlbHZldGljYSBOZXVlJywgQXJpYWwsIHNhbnMtc2VyaWY7XG5cdGxpbmUtaGVpZ2h0OiAxLjY7XG5cdGNvbG9yOiAjMjQyOTJmO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRwYWRkaW5nOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGJvZHkge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Y29sb3I6ICNjOWQxZDk7XG5cdH1cbn1cblxuaGVhZGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogMCBhdXRvIDQwcHg7XG5cdHBhZGRpbmc6IDMwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRoZWFkZXIge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmhlYWRlciBoMSB7XG5cdGZvbnQtc2l6ZTogMzJweDtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNvbW1pdC1pbmZvIHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxMHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuLmNvbW1pdCB7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG4uY29tbWl0LmN1cnJlbnQge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmNvbW1pdC5iYXNlIHtcblx0YmFja2dyb3VuZDogI2RkZjRmZjtcblx0Y29sb3I6ICMwOTY5ZGE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbW1pdC5jdXJyZW50IHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5jb21taXQuYmFzZSB7XG5cdFx0YmFja2dyb3VuZDogIzBjMmQ2Yjtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG4uY29tbWl0IGEge1xuXHRjb2xvcjogaW5oZXJpdDtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4uY29tbWl0IGE6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuLnZzIHtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5tZXRhIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0ZGlzcGxheTogZmxleDtcblx0Z2FwOiAxNXB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG59XG5cbnNlY3Rpb24ge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcbn1cblxuc2VjdGlvbiBoMiB7XG5cdGZvbnQtc2l6ZTogMjRweDtcblx0bWFyZ2luLWJvdHRvbTogMjBweDtcblx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdHBhZGRpbmctYm90dG9tOiAxMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdHNlY3Rpb24gaDIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uc3RhdHMge1xuXHRkaXNwbGF5OiBncmlkO1xuXHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDIwMHB4LCAxZnIpKTtcblx0Z2FwOiAxNXB4O1xuXHRtYXJnaW4tYm90dG9tOiAzMHB4O1xufVxuXG4uc3RhdC1jYXJkIHtcblx0cGFkZGluZzogMjBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDJweCBzb2xpZCAjZDBkN2RlO1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG59XG5cbi5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0Ym9yZGVyLWNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uc3RhdC1jYXJkLnJlZ3Jlc3Npb25zIHtcblx0Ym9yZGVyLWNvbG9yOiAjY2YyMjJlO1xufVxuXG4uc3RhdC1jYXJkLnN0YWJsZSB7XG5cdGJvcmRlci1jb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuc3RhdC1jYXJkIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxuXHQuc3RhdC1jYXJkLmltcHJvdmVtZW50cyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRcdGJvcmRlci1jb2xvcjogI2Y4NTE0OTtcblx0fVxuXHQuc3RhdC1jYXJkLnN0YWJsZSB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjOGI5NDllO1xuXHR9XG59XG5cbi5zdGF0LXZhbHVlIHtcblx0Zm9udC1zaXplOiAzNnB4O1xuXHRmb250LXdlaWdodDogNzAwO1xuXHRtYXJnaW4tYm90dG9tOiA1cHg7XG59XG5cbi5zdGF0LWxhYmVsIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDUwMDtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUge1xuXHR3aWR0aDogMTAwJTtcblx0Ym9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRvdmVyZmxvdzogaGlkZGVuO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0aCxcbi5jb21wYXJpc29uLXRhYmxlIHRkIHtcblx0cGFkZGluZzogMTJweCAxNnB4O1xuXHR0ZXh0LWFsaWduOiBsZWZ0O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0aCxcblx0LmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0aCB7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdGZvbnQtc2l6ZTogMTRweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0aCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0cjpsYXN0LWNoaWxkIHRkIHtcblx0Ym9yZGVyLWJvdHRvbTogbm9uZTtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHIuYmV0dGVyIHtcblx0YmFja2dyb3VuZDogI2RmZjZkZDIwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTkyMDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTYyMDtcblx0fVxuXHQuY29tcGFyaXNvbi10YWJsZSB0ci53b3JzZSB7XG5cdFx0YmFja2dyb3VuZDogIzg2MTgxZDIwO1xuXHR9XG59XG5cbi5jaGFuZ2UtY2VsbCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5jaGFydC1jYXJkIHtcblx0bWFyZ2luLWJvdHRvbTogNDBweDtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRwYWRkaW5nOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jaGFydC1jYXJkIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY2hhcnQtaGVhZGVyIHtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNoYXJ0LWhlYWRlciBoMyB7XG5cdGZvbnQtc2l6ZTogMThweDtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG59XG5cbi5pbmRpY2F0b3Ige1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmluZGljYXRvci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmluZGljYXRvci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTk7XG5cdGNvbG9yOiAjY2YyMjJlO1xufVxuXG4uaW5kaWNhdG9yLm5ldXRyYWwge1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRjb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuaW5kaWNhdG9yLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjtcblx0XHRjb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuaW5kaWNhdG9yLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkO1xuXHRcdGNvbG9yOiAjZmY3YjcyO1xuXHR9XG5cdC5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRjb2xvcjogIzhiOTQ5ZTtcblx0fVxufVxuXG4uY2hhcnQtbWV0YSB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdG1hcmdpbi10b3A6IDVweDtcbn1cblxuLmNoYXJ0LWNvbnRhaW5lciB7XG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0aGVpZ2h0OiA0MDBweDtcbn1cblxuLmV2ZW50cy1zZWN0aW9uIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogNDBweCBhdXRvO1xufVxuXG4uZXZlbnRzLWxpc3Qge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRnYXA6IDEwcHg7XG59XG5cbi5ldmVudC1pdGVtIHtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRwYWRkaW5nOiAxMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA2cHg7XG5cdGJvcmRlci1sZWZ0OiAzcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuZXZlbnQtaXRlbSB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmV2ZW50LW1hcmtlciB7XG5cdHdpZHRoOiAxMnB4O1xuXHRoZWlnaHQ6IDEycHg7XG5cdGJvcmRlci1yYWRpdXM6IDUwJTtcbn1cblxuLmV2ZW50LWljb24ge1xuXHRmb250LXNpemU6IDE4cHg7XG59XG5cbi5ldmVudC10aW1lIHtcblx0Zm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0bWluLXdpZHRoOiA4MHB4O1xufVxuXG4uZXZlbnQtbGFiZWwge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGZsZXg6IDE7XG59XG5cbmZvb3RlciB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDYwcHggYXV0byAyMHB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmctdG9wOiAyMHB4O1xuXHRib3JkZXItdG9wOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG5mb290ZXIgYSB7XG5cdGNvbG9yOiAjMDk2OWRhO1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG59XG5cbmZvb3RlciBhOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Zm9vdGVyIGEge1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA3NjhweCkge1xuXHRib2R5IHtcblx0XHRwYWRkaW5nOiAxMHB4O1xuXHR9XG5cblx0aGVhZGVyIGgxIHtcblx0XHRmb250LXNpemU6IDI0cHg7XG5cdH1cblxuXHQuY2hhcnQtY29udGFpbmVyIHtcblx0XHRoZWlnaHQ6IDMwMHB4O1xuXHR9XG5cblx0LnN0YXRzIHtcblx0XHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCgyLCAxZnIpO1xuXHR9XG59XG5gXG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIEFjdGlvbnMgSm9iIFN1bW1hcnkgZ2VuZXJhdGlvblxuICovXG5cbmltcG9ydCB7IHN1bW1hcnkgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3VtbWFyeURhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGNvbW1pdHM6IHtcblx0XHRjdXJyZW50OiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdFx0YmFzZTogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHR9XG5cdGFydGlmYWN0VXJscz86IE1hcDxzdHJpbmcsIHN0cmluZz5cbn1cblxuLyoqXG4gKiBXcml0ZSBKb2IgU3VtbWFyeSB3aXRoIGFsbCB3b3JrbG9hZHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlSm9iU3VtbWFyeShkYXRhOiBTdW1tYXJ5RGF0YSk6IFByb21pc2U8dm9pZD4ge1xuXHRzdW1tYXJ5LmFkZEhlYWRpbmcoJ/CfjIsgU0xPIFRlc3QgU3VtbWFyeScsIDEpXG5cblx0Ly8gQ29tbWl0cyBpbmZvXG5cdHN1bW1hcnkuYWRkUmF3KGBcbjxwPlxuXHQ8c3Ryb25nPkN1cnJlbnQ6PC9zdHJvbmc+IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5jdXJyZW50LnVybH1cIj4ke2RhdGEuY29tbWl0cy5jdXJyZW50LnNob3J0fTwvYT5cblx0dnNcblx0PHN0cm9uZz5CYXNlOjwvc3Ryb25nPiA8YSBocmVmPVwiJHtkYXRhLmNvbW1pdHMuYmFzZS51cmx9XCI+JHtkYXRhLmNvbW1pdHMuYmFzZS5zaG9ydH08L2E+XG48L3A+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gT3ZlcmFsbCBzdGF0c1xuXHRsZXQgdG90YWxNZXRyaWNzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS50b3RhbCwgMClcblx0bGV0IHRvdGFsUmVncmVzc2lvbnMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnJlZ3Jlc3Npb25zLCAwKVxuXHRsZXQgdG90YWxJbXByb3ZlbWVudHMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LmltcHJvdmVtZW50cywgMClcblx0bGV0IHRvdGFsU3RhYmxlID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5zdGFibGUsIDApXG5cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHRhYmxlPlxuXHQ8dHI+XG5cdFx0PHRkPjxzdHJvbmc+JHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9PC9zdHJvbmc+IHdvcmtsb2FkczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmc+JHt0b3RhbE1ldHJpY3N9PC9zdHJvbmc+IG1ldHJpY3M8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICMxYTdmMzc7XCI+JHt0b3RhbEltcHJvdmVtZW50c308L3N0cm9uZz4gaW1wcm92ZW1lbnRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZyBzdHlsZT1cImNvbG9yOiAjY2YyMjJlO1wiPiR7dG90YWxSZWdyZXNzaW9uc308L3N0cm9uZz4gcmVncmVzc2lvbnM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICM2ZTc3ODE7XCI+JHt0b3RhbFN0YWJsZX08L3N0cm9uZz4gc3RhYmxlPC90ZD5cblx0PC90cj5cbjwvdGFibGU+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gRWFjaCB3b3JrbG9hZFxuXHRmb3IgKGxldCB3b3JrbG9hZCBvZiBkYXRhLndvcmtsb2Fkcykge1xuXHRcdGxldCBzdGF0dXNFbW9qaSA9IHdvcmtsb2FkLnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdFx0bGV0IGFydGlmYWN0VXJsID0gZGF0YS5hcnRpZmFjdFVybHM/LmdldCh3b3JrbG9hZC53b3JrbG9hZClcblxuXHRcdHN1bW1hcnkuYWRkSGVhZGluZyhgJHtzdGF0dXNFbW9qaX0gJHt3b3JrbG9hZC53b3JrbG9hZH1gLCAzKVxuXG5cdFx0aWYgKGFydGlmYWN0VXJsKSB7XG5cdFx0XHRzdW1tYXJ5LmFkZFJhdyhgPHA+PGEgaHJlZj1cIiR7YXJ0aWZhY3RVcmx9XCI+8J+TiiBWaWV3IGRldGFpbGVkIEhUTUwgcmVwb3J0PC9hPjwvcD5gKVxuXHRcdH1cblxuXHRcdC8vIE1ldHJpY3MgdGFibGVcblx0XHRzdW1tYXJ5LmFkZFRhYmxlKFtcblx0XHRcdFtcblx0XHRcdFx0eyBkYXRhOiAnTWV0cmljJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRcdHsgZGF0YTogJ0N1cnJlbnQnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQmFzZScsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdDaGFuZ2UnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdF0sXG5cdFx0XHQuLi53b3JrbG9hZC5tZXRyaWNzLm1hcCgobSkgPT4gW1xuXHRcdFx0XHRtLm5hbWUsXG5cdFx0XHRcdGZvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKSxcblx0XHRcdFx0bS5iYXNlLmF2YWlsYWJsZSA/IGZvcm1hdFZhbHVlKG0uYmFzZS52YWx1ZSwgbS5uYW1lKSA6ICdOL0EnLFxuXHRcdFx0XHRtLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJyxcblx0XHRcdF0pLFxuXHRcdF0pXG5cblx0XHRzdW1tYXJ5LmFkZEJyZWFrKClcblx0fVxuXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuXG4vKipcbiAqIENsZWFyIGV4aXN0aW5nIHN1bW1hcnlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFySm9iU3VtbWFyeSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0c3VtbWFyeS5lbXB0eUJ1ZmZlcigpXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7OztBQU9BLHVEQUNBLDJDQUNBO0FBTEE7QUFDQTs7O0FDMkJPLFNBQVMsaUJBQWlCLENBQUMsU0FBNkI7QUFBQSxFQUM5RCxJQUFJLDBCQUFVLElBQUksS0FDZCxRQUFRLFFBQVEsS0FBSyxFQUFFLE1BQU07QUFBQSxDQUFJO0FBQUEsRUFFckMsU0FBUyxRQUFRLE9BQU87QUFBQSxJQUN2QixJQUFJLENBQUMsS0FBSyxLQUFLO0FBQUEsTUFBRztBQUFBLElBRWxCLElBQUk7QUFBQSxNQUNILElBQUksU0FBUyxLQUFLLE1BQU0sSUFBSTtBQUFBLE1BQzVCLFFBQVEsSUFBSSxPQUFPLE1BQU0sTUFBTTtBQUFBLE1BQzlCLE1BQU07QUFBQSxNQUVQO0FBQUE7QUFBQTtBQUFBLEVBSUYsT0FBTztBQUFBO0FBV0QsU0FBUyxhQUFhLENBQUMsUUFBMEM7QUFBQSxFQUN2RSxJQUFJLFVBQXlDLE1BQ3pDLE9BQXNDO0FBQUEsRUFFMUMsSUFBSSxPQUFPLFNBQVMsV0FBVztBQUFBLElBQzlCLElBQUksT0FBTyxPQUFPO0FBQUEsSUFDbEIsVUFBVSxLQUFLLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxRQUFRLFNBQVMsS0FBSyxN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QixZQUFZLEVBQUUsVUFBVSxJQUFJLEVBQUU7QUFBQTtBQUczQyxTQUFTLFNBQVMsR0FBVztBQUFBLEVBQzVCLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7OztBQ3JXUjtBQWdCQSxlQUFzQixlQUFlLENBQUMsTUFBa0M7QUFBQSxFQUN2RSxxQkFBUSxXQUFXLGlDQUFzQixDQUFDLEdBRzFDLHFCQUFRLE9BQU87QUFBQTtBQUFBLHNDQUVzQixLQUFLLFFBQVEsUUFBUSxRQUFRLEtBQUssUUFBUSxRQUFRO0FBQUE7QUFBQSxtQ0FFckQsS0FBSyxRQUFRLEtBQUssUUFBUSxLQUFLLFFBQVEsS0FBSztBQUFBO0FBQUEsRUFFN0UsR0FFRCxxQkFBUSxTQUFTO0FBQUEsRUFHakIsSUFBSSxlQUFlLEtBQUssVUFBVSxPQUFPLENBQUMsS0FBSyxNQUFNLE1BQU0sRUFBRSxRQUFRLE9BQU8sQ0FBQyxHQUN6RSxtQkFBbUIsS0FBSyxVQUFVLE9BQU8sQ0FBQyxLQUFLLE1BQU0sTUFBTSxFQUFFLFFBQVEsYUFBYSxDQUFDLEdBQ25GLG9CQUFvQixLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQUssTUFBTSxNQUFNLEVBQUUsUUFBUSxjQUFjLENBQUMsR0FDckYsY0FBYyxLQUFLLFVBQVUsT0FBTyxDQUFDLEtBQUssTUFBTSxNQUFNLEVBQUUsUUFBUSxRQUFRLENBQUM7QUFBQSxFQUU3RSxxQkFBUSxPQUFPO0FBQUE7QUFBQTtBQUFBLGdCQUdBLEtBQUssVUFBVTtBQUFBLGdCQUNmO0FBQUEsd0NBQ3dCO0FBQUEsd0NBQ0E7QUFBQSx3Q0FDQTtBQUFBO0FBQUE7QUFBQSxFQUd0QyxHQUVELHFCQUFRLFNBQVM7QUFBQSxFQUdqQixTQUFTLFlBQVksS0FBSyxXQUFXO0FBQUEsSUFDcEMsSUFBSSxjQUFjLFNBQVMsUUFBUSxjQUFjLElBQUksaUJBQU0sZ0JBQ3ZELGNBQWMsS0FBSyxjQUFjLElBQUksU0FBUyxRQUFRO0FBQUEsSUFJMUQsSUFGQSxxQkFBUSxXQUFXLEdBQUcsZUFBZSxTQUFTLFlBQVksQ0FBQyxHQUV2RDtBQUFBLE1BQ0gscUJBQVEsT0FBTyxlQUFlLDZEQUFrRDtBQUFBLElBSWpGLHFCQUFRLFNBQVM7QUFBQSxNQUNoQjtBQUFBLFFBQ0MsRUFBRSxNQUFNLFVBQVUsUUFBUSxHQUFLO0FBQUEsUUFDL0IsRUFBRSxNQUFNLFdBQVcsUUFBUSxHQUFLO0FBQUEsUUFDaEMsRUFBRSxNQUFNLFFBQVEsUUFBUSxHQUFLO0FBQUEsUUFDN0IsRUFBRSxNQUFNLFVBQVUsUUFBUSxHQUFLO0FBQUEsTUFDaEM7QUFBQSxNQUNBLEdBQUcsU0FBUyxRQUFRLElBQUksQ0FBQyxNQUFNO0FBQUEsUUFDOUIsRUFBRTtBQUFBLFFBQ0YsWUFBWSxFQUFFLFFBQVEsT0FBTyxFQUFFLElBQUk7QUFBQSxRQUNuQyxFQUFFLEtBQUssWUFBWSxZQUFZLEVBQUUsS0FBSyxPQUFPLEVBQUUsSUFBSSxJQUFJO0FBQUEsUUFDdkQsRUFBRSxLQUFLLFlBQVksYUFBYSxFQUFFLE9BQU8sU0FBUyxFQUFFLE9BQU8sU0FBUyxJQUFJO0FBQUEsTUFDekUsQ0FBQztBQUFBLElBQ0YsQ0FBQyxHQUVELHFCQUFRLFNBQVM7QUFBQTtBQUFBLEVBR2xCLE1BQU0scUJBQVEsTUFBTTtBQUFBOzs7QVRqRXJCLGVBQWUsSUFBSSxHQUFHO0FBQUEsRUFDckIsSUFBSTtBQUFBLElBQ0gsSUFBSSxNQUFXLFdBQUssUUFBUSxJQUFJLEdBQUcsY0FBYyxHQUM3QyxRQUFRLHNCQUFTLGNBQWMsS0FBSyxzQkFBUyxPQUFPLEdBQ3BELFFBQVEsU0FBUyxzQkFBUyxlQUFlLEtBQUssc0JBQVMsUUFBUSxLQUFLLE9BQU8sdUJBQVEsS0FBSyxDQUFDO0FBQUEsSUFFN0YsSUFBSSxDQUFDLE9BQU87QUFBQSxNQUNYLHVCQUFVLDBCQUEwQjtBQUFBLE1BQ3BDO0FBQUE7QUFBQSxJQUdFLGNBQVUsS0FBSyxFQUFFLFdBQVcsR0FBSyxDQUFDLEdBQ3JDLGtCQUFLLHNCQUFzQixLQUFLLEdBSWhDLGtCQUFLLHdEQUE2QztBQUFBLElBQ2xELElBQUksWUFBWSxNQUFNLDBCQUEwQjtBQUFBLE1BQy9DO0FBQUEsTUFDQSxlQUFlO0FBQUEsTUFDZixpQkFBaUIsdUJBQVEsS0FBSztBQUFBLE1BQzlCLGdCQUFnQix1QkFBUSxLQUFLO0FBQUEsTUFDN0IsY0FBYztBQUFBLElBQ2YsQ0FBQztBQUFBLElBRUQsSUFBSSxVQUFVLFdBQVcsR0FBRztBQUFBLE1BQzNCLHFCQUFRLDRDQUE0QztBQUFBLE1BQ3BEO0FBQUE7QUFBQSxJQUdELGtCQUFLLFNBQVMsVUFBVSxxQkFBcUIsVUFBVSxJQUFJLENBQUMsTUFBTSxFQUFFLFFBQVEsRUFBRSxLQUFLLElBQUksR0FBRztBQUFBLElBRzFGLElBQUksV0FBVyxVQUFVLElBQUk7QUFBQSxJQUM3QixJQUFJLENBQUMsVUFBVTtBQUFBLE1BQ2QsdUJBQVUsNENBQTRDO0FBQUEsTUFDdEQ7QUFBQTtBQUFBLElBR0Qsa0JBQUssa0JBQWtCLFVBQVU7QUFBQSxJQUdqQyxNQUFNLDRCQUFlLE1BQWEsaUNBQzlCLFVBQVUsWUFBVyxLQUFLO0FBQUEsSUFFOUIsa0JBQUssNEJBQTRCO0FBQUEsSUFDakMsTUFBTSxNQUFNLE9BQU8sTUFBTSxRQUFRLEtBQUssTUFBTSxJQUFJO0FBQUEsTUFDL0MsT0FBTyx1QkFBUSxLQUFLO0FBQUEsTUFDcEIsTUFBTSx1QkFBUSxLQUFLO0FBQUEsTUFDbkIsYUFBYTtBQUFBLElBQ2QsQ0FBQztBQUFBLElBRUQsa0JBQUssT0FBTyxHQUFHLE9BQU8sR0FDdEIsa0JBQUssZ0JBQWdCLEdBQUcsS0FBSyxLQUFLLEdBQ2xDLGtCQUFLLGFBQWEsR0FBRyxLQUFLLEtBQUssR0FHL0Isa0JBQUsseUNBQXdDO0FBQUEsSUFDN0MsSUFBSSxhQUFhLE1BQU0sZUFBZSxzQkFBUyxpQkFBaUIsR0FBRyxzQkFBUyxzQkFBc0IsQ0FBQztBQUFBLElBQ25HLGtCQUFLLHFDQUFxQyxXQUFXLHlCQUF5QixHQUc5RSxrQkFBSyxtQ0FBd0I7QUFBQSxJQUM3QixJQUFJLGNBQWMsVUFBVSxJQUFJLENBQUMsTUFDaEMsdUJBQXVCLEVBQUUsVUFBVSxFQUFFLFNBQVMsT0FBTyxXQUFXLHNCQUFzQixDQUN2RjtBQUFBLElBR0Esa0JBQUsseUNBQThCO0FBQUEsSUFFbkMsSUFBSSxrQkFBdUIsV0FBSyxLQUFLLFNBQVM7QUFBQSxJQUMzQyxjQUFVLGlCQUFpQixFQUFFLFdBQVcsR0FBSyxDQUFDO0FBQUEsSUFFakQsSUFBSSxZQUF1RCxDQUFDO0FBQUEsSUFFNUQsU0FBUyxJQUFJLEVBQUcsSUFBSSxVQUFVLFFBQVEsS0FBSztBQUFBLE1BQzFDLElBQUksV0FBVyxVQUFVLElBQ3JCLGFBQWEsWUFBWSxJQUV6QixXQUEyQjtBQUFBLFFBQzlCLFVBQVUsU0FBUztBQUFBLFFBQ25CO0FBQUEsUUFDQSxTQUFTLFNBQVM7QUFBQSxRQUNsQixRQUFRLFNBQVM7QUFBQSxRQUNqQixTQUFTO0FBQUEsVUFDUixTQUFTO0FBQUEsWUFDUixLQUFLLEdBQUcsS0FBSztBQUFBLFlBQ2IsS0FBSyxzQkFBc0IsdUJBQVEsS0FBSyxTQUFTLHVCQUFRLEtBQUssZUFBZSxHQUFHLEtBQUs7QUFBQSxZQUNyRixPQUFPLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDO0FBQUEsVUFDbEM7QUFBQSxVQUNBLE1BQU07QUFBQSxZQUNMLEtBQUssR0FBRyxLQUFLO0FBQUEsWUFDYixLQUFLLHNCQUFzQix1QkFBUSxLQUFLLFNBQVMsdUJBQVEsS0FBSyxlQUFlLEdBQUcsS0FBSztBQUFBLFlBQ3JGLE9BQU8sR0FBRyxLQUFLLElBQUksVUFBVSxHQUFHLENBQUM7QUFBQSxVQUNsQztBQUFBLFFBQ0Q7QUFBQSxRQUNBLE1BQU07QUFBQSxVQUNMO0FBQUEsVUFDQSw4QkFBYSxJQUFJLEtBQUssR0FBRSxZQUFZO0FBQUEsUUFDckM7QUFBQSxNQUNELEdBRUksT0FBTyxtQkFBbUIsUUFBUSxHQUNsQyxXQUFnQixXQUFLLGlCQUFpQixHQUFHLFNBQVMsc0JBQXNCO0FBQUEsTUFFekUsa0JBQWMsVUFBVSxNQUFNLEVBQUUsVUFBVSxRQUFRLENBQUMsR0FDdEQsVUFBVSxLQUFLLEVBQUUsVUFBVSxTQUFTLFVBQVUsTUFBTSxTQUFTLENBQUMsR0FFOUQsa0JBQUssNkJBQTZCLFNBQVMsVUFBVTtBQUFBO0FBQUEsSUFJdEQsa0JBQUssd0NBQTZCO0FBQUEsSUFHbEMsSUFBSSxlQUFlLE1BREUsSUFBSSx1Q0FBc0IsRUFDUCxlQUN2QyxlQUNBLFVBQVUsSUFBSSxDQUFDLE1BQU0sRUFBRSxJQUFJLEdBQzNCLGlCQUNBO0FBQUEsTUFDQyxlQUFlO0FBQUEsSUFDaEIsQ0FDRDtBQUFBLElBRUEsa0JBQUssc0NBQXNDLGFBQWEsSUFBSSxHQUc1RCxrQkFBSyw2QkFBNEI7QUFBQSxJQUVqQyxJQUFJLDRCQUFZLElBQUk7QUFBQSxJQUVwQixTQUFTLGNBQWM7QUFBQSxNQUN0QixJQUFJO0FBQUEsUUFDSCxJQUFJLFFBQVEsTUFBTSxvQkFBb0I7QUFBQSxVQUNyQztBQUFBLFVBQ0EsT0FBTyx1QkFBUSxLQUFLO0FBQUEsVUFDcEIsTUFBTSx1QkFBUSxLQUFLO0FBQUEsVUFDbkIsS0FBSyxHQUFHLEtBQUs7QUFBQSxVQUNiLFVBQVU7QUFBQSxVQUNWO0FBQUEsUUFDRCxDQUFDO0FBQUEsUUFFRCxVQUFVLElBQUksV0FBVyxVQUFVLE1BQU0sR0FBRyxHQUM1QyxrQkFBSyxxQkFBcUIsV0FBVyxhQUFhLE1BQU0sS0FBSztBQUFBLFFBQzVELE9BQU8sT0FBTztBQUFBLFFBQ2YscUJBQVEsOEJBQThCLFdBQVcsYUFBYSxPQUFPLEtBQUssR0FBRztBQUFBO0FBQUEsSUFLL0Usa0JBQUsscUNBQTBCLEdBRS9CLE1BQU0sZ0JBQWdCO0FBQUEsTUFDckIsV0FBVztBQUFBLE1BQ1gsU0FBUztBQUFBLFFBQ1IsU0FBUztBQUFBLFVBQ1IsS0FBSyxHQUFHLEtBQUs7QUFBQSxVQUNiLEtBQUssc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLGVBQWUsR0FBRyxLQUFLO0FBQUEsVUFDckYsT0FBTyxHQUFHLEtBQUssSUFBSSxVQUFVLEdBQUcsQ0FBQztBQUFBLFFBQ2xDO0FBQUEsUUFDQSxNQUFNO0FBQUEsVUFDTCxLQUFLLEdBQUcsS0FBSztBQUFBLFVBQ2IsS0FBSyxzQkFBc0IsdUJBQVEsS0FBSyxTQUFTLHVCQUFRLEtBQUssZUFBZSxHQUFHLEtBQUs7QUFBQSxVQUNyRixPQUFPLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDO0FBQUEsUUFDbEM7QUFBQSxNQUNEO0FBQUEsSUFDRCxDQUFDLEdBRUQsa0JBQUsscUJBQXFCLEdBRzFCLGtCQUFLLDhDQUFtQztBQUFBLElBR3hDLElBQUksK0JBQWUsSUFBSSxLQUNuQixrQkFBa0Isc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQixtQkFBbUIsYUFBYTtBQUFBLElBRXBJLFNBQVMsUUFBUTtBQUFBLE1BQ2hCLGFBQWEsSUFBSSxLQUFLLFVBQVUsZUFBZTtBQUFBLElBR2hELElBQUksY0FBYyxvQkFBb0I7QUFBQSxNQUNyQyxXQUFXO0FBQUEsTUFDWDtBQUFBLE1BQ0E7QUFBQSxNQUNBLGVBQWUsc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQjtBQUFBLElBQzlGLENBQUMsR0FFRyxVQUFVLE1BQU0sc0JBQXNCLE9BQU8sdUJBQVEsS0FBSyxPQUFPLHVCQUFRLEtBQUssTUFBTSxVQUFVLFdBQVc7QUFBQSxJQUU3RyxrQkFBSyxlQUFlLFFBQVEsS0FBSyxHQUVqQyxrQkFBSyw2Q0FBNEM7QUFBQSxJQUNoRCxPQUFPLE9BQU87QUFBQSxJQUVmLE1BREEsdUJBQVUsNkJBQTZCLE9BQU8sS0FBSyxHQUFHLEdBQ2hEO0FBQUE7QUFBQTtBQUlSLEtBQUs7IiwKICAiZGVidWdJZCI6ICIxMDE1RDU0RTgxMTRERjI0NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
