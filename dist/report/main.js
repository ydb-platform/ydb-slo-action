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
    destroy: "\uD83D\uDDD1️",
    healthy: "✅",
    health_timeout: "⏱️",
    scenario_start: "\uD83C\uDFAC",
    scenario_complete: "\uD83C\uDFC1",
    blackhole_create: "\uD83D\uDD73️",
    blackhole_remove: "\uD83D\uDD0C"
  };
  if (action === "kill")
    return attributes?.signal === "SIGKILL" ? "\uD83D\uDC80" : "⚡";
  return icons[action] || "\uD83D\uDCCC";
}
function getEventColor(action, severity) {
  if (severity === "critical")
    return "#dc2626";
  else if (severity === "warning")
    return "#f59e0b";
  else if (severity === "info")
    return "#10b981";
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
  let target = event.target;
  if (target.startsWith("ydb-"))
    target = target.replace("ydb-", "");
  let label = `[${event.scenario}] ${event.action} ${target}`;
  if (event.metadata.timeout !== void 0)
    label += ` (timeout=${event.metadata.timeout}s)`;
  if (event.metadata.duration_seconds !== void 0)
    label += ` (${event.metadata.duration_seconds}s)`;
  if (event.metadata.recovery_time_seconds !== void 0)
    label += ` (recovery=${event.metadata.recovery_time_seconds}s)`;
  if (event.metadata.signal)
    label += ` (${event.metadata.signal})`;
  return label;
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
    action: event.action,
    type: "chaos",
    label: formatChaosEventLabel(event),
    icon: getEventIcon(event.action),
    color: getEventColor(event.action, event.severity),
    actor: event.scenario,
    source: "chaos"
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
  let currentSeries = metric.data.find((s) => s.metric.ref === "current"), baseSeries = metric.data.find((s) => s.metric.ref === "base"), currentData = currentSeries ? JSON.stringify(currentSeries.values.map(([t, v]) => ({ x: t * 1000, y: parseFloat(v) }))) : "[]", baseData = baseSeries ? JSON.stringify(baseSeries.values.map(([t, v]) => ({ x: t * 1000, y: parseFloat(v) }))) : "[]", annotations = events.map((e) => `{
			type: 'line',
			xMin: ${e.timestamp * 1000},
			xMax: ${e.timestamp * 1000},
			borderColor: '${e.color}',
			borderWidth: 2,
			borderDash: [5, 5],
			label: {
				display: true,
				content: '${e.icon}',
				position: 'start',
				backgroundColor: '${e.color}',
				color: '#fff',
				font: { size: 14 },
				padding: 4
			}
		}`).join(`,
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

//# debugId=300CD25517E82A8464756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9tZXRyaWNzLnRzIiwgIi4uL3JlcG9ydC9saWIvYW5hbHlzaXMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIiwgIi4uL3JlcG9ydC9saWIvY29tbWVudC50cyIsICIuLi9yZXBvcnQvbGliL2h0bWwudHMiLCAiLi4vcmVwb3J0L2xpYi9zdW1tYXJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgIi8qKlxuICogU0xPIFJlcG9ydCBBY3Rpb24gLSBNYWluIE9yY2hlc3RyYXRvclxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBnZXRJbnB1dCwgaW5mbywgc2V0RmFpbGVkLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmltcG9ydCB7IGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MgfSBmcm9tICcuL2xpYi9hbmFseXNpcy5qcydcbmltcG9ydCB7IGRvd25sb2FkV29ya2xvYWRBcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBjcmVhdGVXb3JrbG9hZENoZWNrIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyB3cml0ZUpvYlN1bW1hcnkgfSBmcm9tICcuL2xpYi9zdW1tYXJ5LmpzJ1xuaW1wb3J0IHsgbG9hZFRocmVzaG9sZHMgfSBmcm9tICcuL2xpYi90aHJlc2hvbGRzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHR0cnkge1xuXHRcdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8tcmVwb3J0cycpXG5cdFx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IGdldElucHV0KCd0b2tlbicpXG5cdFx0bGV0IHJ1bklkID0gcGFyc2VJbnQoZ2V0SW5wdXQoJ2dpdGh1Yl9ydW5faWQnKSB8fCBnZXRJbnB1dCgncnVuX2lkJykgfHwgU3RyaW5nKGNvbnRleHQucnVuSWQpKVxuXG5cdFx0aWYgKCF0b2tlbikge1xuXHRcdFx0c2V0RmFpbGVkKCdnaXRodWJfdG9rZW4gaXMgcmVxdWlyZWQnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblx0XHRpbmZvKGBXb3JraW5nIGRpcmVjdG9yeTogJHtjd2R9YClcblxuXHRcdC8vIFN0ZXAgMTogRG93bmxvYWQgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW5cblx0XHQvLyBOT1RFOiBBcnRpZmFjdHMgYWxyZWFkeSBjb250YWluIGJvdGggY3VycmVudCBhbmQgYmFzZSBzZXJpZXMgKGNvbGxlY3RlZCBpbiBpbml0IGFjdGlvbilcblx0XHRpbmZvKCfwn5OmIERvd25sb2FkaW5nIGFydGlmYWN0cyBmcm9tIGN1cnJlbnQgcnVuLi4uJylcblx0XHRsZXQgd29ya2xvYWRzID0gYXdhaXQgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyh7XG5cdFx0XHR0b2tlbixcblx0XHRcdHdvcmtmbG93UnVuSWQ6IHJ1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRkb3dubG9hZFBhdGg6IGN3ZCxcblx0XHR9KVxuXG5cdFx0aWYgKHdvcmtsb2Fkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHdhcm5pbmcoJ05vIHdvcmtsb2FkIGFydGlmYWN0cyBmb3VuZCBpbiBjdXJyZW50IHJ1bicpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRpbmZvKGBGb3VuZCAke3dvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkczogJHt3b3JrbG9hZHMubWFwKCh3KSA9PiB3Lndvcmtsb2FkKS5qb2luKCcsICcpfWApXG5cblx0XHQvLyBTdGVwIDI6IEdldCBQUiBpbmZvcm1hdGlvblxuXHRcdGxldCBwck51bWJlciA9IHdvcmtsb2Fkc1swXT8ucHVsbE51bWJlclxuXHRcdGlmICghcHJOdW1iZXIpIHtcblx0XHRcdHNldEZhaWxlZCgnUHVsbCByZXF1ZXN0IG51bWJlciBub3QgZm91bmQgaW4gYXJ0aWZhY3RzJylcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGluZm8oYFByb2Nlc3NpbmcgUFIgIyR7cHJOdW1iZXJ9YClcblxuXHRcdC8vIEdldCBQUiBkZXRhaWxzIGZvciBjb21taXQgaW5mb1xuXHRcdGxldCB7IGdldE9jdG9raXQgfSA9IGF3YWl0IGltcG9ydCgnQGFjdGlvbnMvZ2l0aHViJylcblx0XHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQodG9rZW4pXG5cblx0XHRpbmZvKCdGZXRjaGluZyBQUiBpbmZvcm1hdGlvbi4uLicpXG5cdFx0bGV0IHsgZGF0YTogcHIgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5wdWxscy5nZXQoe1xuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0cHVsbF9udW1iZXI6IHByTnVtYmVyLFxuXHRcdH0pXG5cblx0XHRpbmZvKGBQUjogJHtwci50aXRsZX1gKVxuXHRcdGluZm8oYEJhc2UgYnJhbmNoOiAke3ByLmJhc2UucmVmfWApXG5cdFx0aW5mbyhgSGVhZCBTSEE6ICR7cHIuaGVhZC5zaGF9YClcblxuXHRcdC8vIFN0ZXAgMzogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb25cblx0XHRpbmZvKCfimpnvuI8gIExvYWRpbmcgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uLi4uJylcblx0XHRsZXQgdGhyZXNob2xkcyA9IGF3YWl0IGxvYWRUaHJlc2hvbGRzKGdldElucHV0KCd0aHJlc2hvbGRzX3lhbWwnKSwgZ2V0SW5wdXQoJ3RocmVzaG9sZHNfeWFtbF9wYXRoJykpXG5cdFx0aW5mbyhgTG9hZGVkIHRocmVzaG9sZHM6IG5ldXRyYWxfY2hhbmdlPSR7dGhyZXNob2xkcy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50fSVgKVxuXG5cdFx0Ly8gU3RlcCA0OiBBbmFseXplIG1ldHJpY3MgKGFscmVhZHkgY29udGFpbiBjdXJyZW50IGFuZCBiYXNlIHNlcmllcyB3aXRoIHJlZiBsYWJlbClcblx0XHRpbmZvKCfwn5OKIEFuYWx5emluZyBtZXRyaWNzLi4uJylcblx0XHRsZXQgY29tcGFyaXNvbnMgPSB3b3JrbG9hZHMubWFwKCh3KSA9PlxuXHRcdFx0Y29tcGFyZVdvcmtsb2FkTWV0cmljcyh3Lndvcmtsb2FkLCB3Lm1ldHJpY3MsICdhdmcnLCB0aHJlc2hvbGRzLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQpXG5cdFx0KVxuXG5cdFx0Ly8gU3RlcCA1OiBHZW5lcmF0ZSBIVE1MIHJlcG9ydHNcblx0XHRpbmZvKCfwn5OdIEdlbmVyYXRpbmcgSFRNTCByZXBvcnRzLi4uJylcblxuXHRcdGxldCBodG1sUmVwb3J0c1BhdGggPSBwYXRoLmpvaW4oY3dkLCAncmVwb3J0cycpXG5cdFx0ZnMubWtkaXJTeW5jKGh0bWxSZXBvcnRzUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHRcdGxldCBodG1sRmlsZXM6IEFycmF5PHsgd29ya2xvYWQ6IHN0cmluZzsgcGF0aDogc3RyaW5nIH0+ID0gW11cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgd29ya2xvYWRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgd29ya2xvYWQgPSB3b3JrbG9hZHNbaV1cblx0XHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyaXNvbnNbaV1cblxuXHRcdFx0bGV0IGh0bWxEYXRhOiBIVE1MUmVwb3J0RGF0YSA9IHtcblx0XHRcdFx0d29ya2xvYWQ6IHdvcmtsb2FkLndvcmtsb2FkLFxuXHRcdFx0XHRjb21wYXJpc29uLFxuXHRcdFx0XHRtZXRyaWNzOiB3b3JrbG9hZC5tZXRyaWNzLFxuXHRcdFx0XHRldmVudHM6IHdvcmtsb2FkLmV2ZW50cyxcblx0XHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRcdGN1cnJlbnQ6IHtcblx0XHRcdFx0XHRcdHNoYTogcHIuaGVhZC5zaGEsXG5cdFx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0XHRzaG9ydDogcHIuaGVhZC5zaGEuc3Vic3RyaW5nKDAsIDcpLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdFx0c2hhOiBwci5iYXNlLnNoYSxcblx0XHRcdFx0XHRcdHVybDogYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2NvbnRleHQucmVwby5vd25lcn0vJHtjb250ZXh0LnJlcG8ucmVwb30vY29tbWl0LyR7cHIuYmFzZS5zaGF9YCxcblx0XHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0bWV0YToge1xuXHRcdFx0XHRcdHByTnVtYmVyLFxuXHRcdFx0XHRcdGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG5cdFx0XHRcdH0sXG5cdFx0XHR9XG5cblx0XHRcdGxldCBodG1sID0gZ2VuZXJhdGVIVE1MUmVwb3J0KGh0bWxEYXRhKVxuXHRcdFx0bGV0IGh0bWxQYXRoID0gcGF0aC5qb2luKGh0bWxSZXBvcnRzUGF0aCwgYCR7d29ya2xvYWQud29ya2xvYWR9LXJlcG9ydC5odG1sYClcblxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhodG1sUGF0aCwgaHRtbCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0aHRtbEZpbGVzLnB1c2goeyB3b3JrbG9hZDogd29ya2xvYWQud29ya2xvYWQsIHBhdGg6IGh0bWxQYXRoIH0pXG5cblx0XHRcdGluZm8oYEdlbmVyYXRlZCBIVE1MIHJlcG9ydCBmb3IgJHt3b3JrbG9hZC53b3JrbG9hZH1gKVxuXHRcdH1cblxuXHRcdC8vIFN0ZXAgNjogVXBsb2FkIEhUTUwgcmVwb3J0cyBhcyBhcnRpZmFjdHNcblx0XHRpbmZvKCfwn5OkIFVwbG9hZGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdFx0bGV0IGFydGlmYWN0Q2xpZW50ID0gbmV3IERlZmF1bHRBcnRpZmFjdENsaWVudCgpXG5cdFx0bGV0IHVwbG9hZFJlc3VsdCA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LnVwbG9hZEFydGlmYWN0KFxuXHRcdFx0J3Nsby1yZXBvcnRzJyxcblx0XHRcdGh0bWxGaWxlcy5tYXAoKGYpID0+IGYucGF0aCksXG5cdFx0XHRodG1sUmVwb3J0c1BhdGgsXG5cdFx0XHR7XG5cdFx0XHRcdHJldGVudGlvbkRheXM6IDMwLFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGluZm8oYFVwbG9hZGVkIEhUTUwgcmVwb3J0cyBhcyBhcnRpZmFjdDogJHt1cGxvYWRSZXN1bHQuaWR9YClcblxuXHRcdC8vIFN0ZXAgNzogQ3JlYXRlIEdpdEh1YiBDaGVja3Ncblx0XHRpbmZvKCfinIUgQ3JlYXRpbmcgR2l0SHViIENoZWNrcy4uLicpXG5cblx0XHRsZXQgY2hlY2tVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXG5cdFx0Zm9yIChsZXQgY29tcGFyaXNvbiBvZiBjb21wYXJpc29ucykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bGV0IGNoZWNrID0gYXdhaXQgY3JlYXRlV29ya2xvYWRDaGVjayh7XG5cdFx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0XHRzaGE6IHByLmhlYWQuc2hhLFxuXHRcdFx0XHRcdHdvcmtsb2FkOiBjb21wYXJpc29uLFxuXHRcdFx0XHRcdHRocmVzaG9sZHMsXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0Y2hlY2tVcmxzLnNldChjb21wYXJpc29uLndvcmtsb2FkLCBjaGVjay51cmwpXG5cdFx0XHRcdGluZm8oYENyZWF0ZWQgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7Y2hlY2sudXJsfWApXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gY3JlYXRlIGNoZWNrIGZvciAke2NvbXBhcmlzb24ud29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdGVwIDg6IFdyaXRlIEpvYiBTdW1tYXJ5XG5cdFx0aW5mbygn8J+TiyBXcml0aW5nIEpvYiBTdW1tYXJ5Li4uJylcblxuXHRcdGF3YWl0IHdyaXRlSm9iU3VtbWFyeSh7XG5cdFx0XHR3b3JrbG9hZHM6IGNvbXBhcmlzb25zLFxuXHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRjdXJyZW50OiB7XG5cdFx0XHRcdFx0c2hhOiBwci5oZWFkLnNoYSxcblx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0c2hvcnQ6IHByLmhlYWQuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0fSxcblx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdHNoYTogcHIuYmFzZS5zaGEsXG5cdFx0XHRcdFx0dXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9jb21taXQvJHtwci5iYXNlLnNoYX1gLFxuXHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRpbmZvKCdKb2IgU3VtbWFyeSB3cml0dGVuJylcblxuXHRcdC8vIFN0ZXAgOTogQ3JlYXRlL1VwZGF0ZSBQUiBjb21tZW50XG5cdFx0aW5mbygn8J+SrCBDcmVhdGluZy91cGRhdGluZyBQUiBjb21tZW50Li4uJylcblxuXHRcdC8vIEFydGlmYWN0IFVSTHMgKEdpdEh1YiBVSSBkb3dubG9hZClcblx0XHRsZXQgYXJ0aWZhY3RVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRcdGxldCBhcnRpZmFjdEJhc2VVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH0vYXJ0aWZhY3RzLyR7dXBsb2FkUmVzdWx0LmlkfWBcblxuXHRcdGZvciAobGV0IGZpbGUgb2YgaHRtbEZpbGVzKSB7XG5cdFx0XHRhcnRpZmFjdFVybHMuc2V0KGZpbGUud29ya2xvYWQsIGFydGlmYWN0QmFzZVVybClcblx0XHR9XG5cblx0XHRsZXQgY29tbWVudEJvZHkgPSBnZW5lcmF0ZUNvbW1lbnRCb2R5KHtcblx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRhcnRpZmFjdFVybHMsXG5cdFx0XHRjaGVja1VybHMsXG5cdFx0XHRqb2JTdW1tYXJ5VXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH1gLFxuXHRcdH0pXG5cblx0XHRsZXQgY29tbWVudCA9IGF3YWl0IGNyZWF0ZU9yVXBkYXRlQ29tbWVudCh0b2tlbiwgY29udGV4dC5yZXBvLm93bmVyLCBjb250ZXh0LnJlcG8ucmVwbywgcHJOdW1iZXIsIGNvbW1lbnRCb2R5KVxuXG5cdFx0aW5mbyhgUFIgY29tbWVudDogJHtjb21tZW50LnVybH1gKVxuXG5cdFx0aW5mbygn4pyFIFJlcG9ydCBnZW5lcmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJylcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRzZXRGYWlsZWQoYFJlcG9ydCBnZW5lcmF0aW9uIGZhaWxlZDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0dGhyb3cgZXJyb3Jcblx0fVxufVxuXG5tYWluKClcbiIsCiAgICAiLyoqXG4gKiBNZXRyaWNzIHBhcnNpbmcgYW5kIHR5cGVzIGZvciByZXBvcnQgYWN0aW9uXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTZXJpZXMge1xuXHRtZXRyaWM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0dmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10gLy8gW3RpbWVzdGFtcCAoc2VjKSwgdmFsdWUgKGZsb2F0KV1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnN0YW50U2VyaWVzIHtcblx0bWV0cmljOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5cdHZhbHVlOiBbbnVtYmVyLCBzdHJpbmddIC8vIFt0aW1lc3RhbXAgKHNlYyksIHZhbHVlIChmbG9hdCldXG59XG5cbi8qKlxuICogQ29sbGVjdGVkIG1ldHJpYyBmcm9tIGluaXQgYWN0aW9uIChKU09OTCBmb3JtYXQpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sbGVjdGVkTWV0cmljIHtcblx0bmFtZTogc3RyaW5nXG5cdHF1ZXJ5OiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRkYXRhOiBTZXJpZXNbXSB8IEluc3RhbnRTZXJpZXNbXVxufVxuXG4vKipcbiAqIFBhcnNlZCBtZXRyaWNzIGJ5IG5hbWVcbiAqL1xuZXhwb3J0IHR5cGUgTWV0cmljc01hcCA9IE1hcDxzdHJpbmcsIENvbGxlY3RlZE1ldHJpYz5cblxuLyoqXG4gKiBQYXJzZSBKU09OTCBtZXRyaWNzIGZpbGUgaW50byBNZXRyaWNzTWFwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1ldHJpY3NKc29ubChjb250ZW50OiBzdHJpbmcpOiBNZXRyaWNzTWFwIHtcblx0bGV0IG1ldHJpY3MgPSBuZXcgTWFwPHN0cmluZywgQ29sbGVjdGVkTWV0cmljPigpXG5cdGxldCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKVxuXG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAoIWxpbmUudHJpbSgpKSBjb250aW51ZVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBtZXRyaWMgPSBKU09OLnBhcnNlKGxpbmUpIGFzIENvbGxlY3RlZE1ldHJpY1xuXHRcdFx0bWV0cmljcy5zZXQobWV0cmljLm5hbWUsIG1ldHJpYylcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbWV0cmljc1xufVxuXG4vKipcbiAqIFNlcGFyYXRlIHNlcmllcyBieSByZWYgbGFiZWwgKGN1cnJlbnQgdnMgYmFzZSlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXBhcmF0ZWRTZXJpZXMge1xuXHRjdXJyZW50OiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxuXHRiYXNlOiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VwYXJhdGVCeVJlZihtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyk6IFNlcGFyYXRlZFNlcmllcyB7XG5cdGxldCBjdXJyZW50OiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbCA9IG51bGxcblx0bGV0IGJhc2U6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXG5cdGlmIChtZXRyaWMudHlwZSA9PT0gJ2luc3RhbnQnKSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBJbnN0YW50U2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09ICdjdXJyZW50JykgfHwgbnVsbFxuXHRcdGJhc2UgPSBkYXRhLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2Jhc2UnKSB8fCBudWxsXG5cdH0gZWxzZSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXVxuXHRcdGN1cnJlbnQgPSBkYXRhLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2N1cnJlbnQnKSB8fCBudWxsXG5cdFx0YmFzZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnYmFzZScpIHx8IG51bGxcblx0fVxuXG5cdHJldHVybiB7IGN1cnJlbnQsIGJhc2UgfVxufVxuXG4vKipcbiAqIEFnZ3JlZ2F0ZSBmdW5jdGlvbiB0eXBlIGZvciByYW5nZSBtZXRyaWNzXG4gKi9cbmV4cG9ydCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uID0gJ2xhc3QnIHwgJ2ZpcnN0JyB8ICdhdmcnIHwgJ21pbicgfCAnbWF4JyB8ICdwNTAnIHwgJ3A5NScgfCAncDk5JyB8ICdzdW0nIHwgJ2NvdW50J1xuXG4vKipcbiAqIENhbGN1bGF0ZSBwZXJjZW50aWxlXG4gKi9cbmZ1bmN0aW9uIHBlcmNlbnRpbGUodmFsdWVzOiBudW1iZXJbXSwgcDogbnVtYmVyKTogbnVtYmVyIHtcblx0bGV0IHNvcnRlZCA9IFsuLi52YWx1ZXNdLnNvcnQoKGEsIGIpID0+IGEgLSBiKVxuXHRsZXQgaW5kZXggPSBNYXRoLmNlaWwoc29ydGVkLmxlbmd0aCAqIHApIC0gMVxuXHRyZXR1cm4gc29ydGVkW01hdGgubWF4KDAsIGluZGV4KV1cbn1cblxuLyoqXG4gKiBBZ2dyZWdhdGUgcmFuZ2UgbWV0cmljIHZhbHVlcyB1c2luZyBzcGVjaWZpZWQgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZVZhbHVlcyh2YWx1ZXM6IFtudW1iZXIsIHN0cmluZ11bXSwgZm46IEFnZ3JlZ2F0ZUZ1bmN0aW9uKTogbnVtYmVyIHtcblx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDApIHJldHVybiBOYU5cblxuXHRsZXQgbnVtcyA9IHZhbHVlcy5tYXAoKFtfLCB2XSkgPT4gcGFyc2VGbG9hdCh2KSkuZmlsdGVyKChuKSA9PiAhaXNOYU4obikpXG5cblx0aWYgKG51bXMubGVuZ3RoID09PSAwKSByZXR1cm4gTmFOXG5cblx0c3dpdGNoIChmbikge1xuXHRcdGNhc2UgJ2xhc3QnOlxuXHRcdFx0cmV0dXJuIG51bXNbbnVtcy5sZW5ndGggLSAxXVxuXHRcdGNhc2UgJ2ZpcnN0Jzpcblx0XHRcdHJldHVybiBudW1zWzBdXG5cdFx0Y2FzZSAnYXZnJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtcy5sZW5ndGhcblx0XHRjYXNlICdtaW4nOlxuXHRcdFx0cmV0dXJuIE1hdGgubWluKC4uLm51bXMpXG5cdFx0Y2FzZSAnbWF4Jzpcblx0XHRcdHJldHVybiBNYXRoLm1heCguLi5udW1zKVxuXHRcdGNhc2UgJ3A1MCc6XG5cdFx0XHRyZXR1cm4gcGVyY2VudGlsZShudW1zLCAwLjUpXG5cdFx0Y2FzZSAncDk1Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTUpXG5cdFx0Y2FzZSAncDk5Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTkpXG5cdFx0Y2FzZSAnc3VtJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApXG5cdFx0Y2FzZSAnY291bnQnOlxuXHRcdFx0cmV0dXJuIG51bXMubGVuZ3RoXG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiBOYU5cblx0fVxufVxuXG4vKipcbiAqIEdldCBzaW5nbGUgdmFsdWUgZnJvbSBtZXRyaWMgKGluc3RhbnQgb3IgYWdncmVnYXRlZCByYW5nZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldHJpY1ZhbHVlKFxuXHRtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyxcblx0cmVmOiAnY3VycmVudCcgfCAnYmFzZScsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJ1xuKTogbnVtYmVyIHtcblx0bGV0IHNlcGFyYXRlZCA9IHNlcGFyYXRlQnlSZWYobWV0cmljKVxuXHRsZXQgc2VyaWVzID0gcmVmID09PSAnY3VycmVudCcgPyBzZXBhcmF0ZWQuY3VycmVudCA6IHNlcGFyYXRlZC5iYXNlXG5cblx0aWYgKCFzZXJpZXMpIHJldHVybiBOYU5cblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdpbnN0YW50Jykge1xuXHRcdGxldCBpbnN0YW50U2VyaWVzID0gc2VyaWVzIGFzIEluc3RhbnRTZXJpZXNcblx0XHRyZXR1cm4gcGFyc2VGbG9hdChpbnN0YW50U2VyaWVzLnZhbHVlWzFdKVxuXHR9IGVsc2Uge1xuXHRcdGxldCByYW5nZVNlcmllcyA9IHNlcmllcyBhcyBTZXJpZXNcblx0XHRyZXR1cm4gYWdncmVnYXRlVmFsdWVzKHJhbmdlU2VyaWVzLnZhbHVlcywgYWdncmVnYXRlKVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogTWV0cmljcyBhbmFseXNpcyBhbmQgY29tcGFyaXNvblxuICovXG5cbmltcG9ydCB7IGdldE1ldHJpY1ZhbHVlLCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uLCB0eXBlIENvbGxlY3RlZE1ldHJpYywgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0NvbXBhcmlzb24ge1xuXHRuYW1lOiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRjdXJyZW50OiB7XG5cdFx0dmFsdWU6IG51bWJlclxuXHRcdGF2YWlsYWJsZTogYm9vbGVhblxuXHR9XG5cdGJhc2U6IHtcblx0XHR2YWx1ZTogbnVtYmVyXG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdH1cblx0Y2hhbmdlOiB7XG5cdFx0YWJzb2x1dGU6IG51bWJlclxuXHRcdHBlcmNlbnQ6IG51bWJlclxuXHRcdGRpcmVjdGlvbjogJ2JldHRlcicgfCAnd29yc2UnIHwgJ25ldXRyYWwnIHwgJ3Vua25vd24nXG5cdH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrbG9hZENvbXBhcmlzb24ge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdG1ldHJpY3M6IE1ldHJpY0NvbXBhcmlzb25bXVxuXHRzdW1tYXJ5OiB7XG5cdFx0dG90YWw6IG51bWJlclxuXHRcdHJlZ3Jlc3Npb25zOiBudW1iZXJcblx0XHRpbXByb3ZlbWVudHM6IG51bWJlclxuXHRcdHN0YWJsZTogbnVtYmVyXG5cdH1cbn1cblxuLyoqXG4gKiBJbmZlciBtZXRyaWMgZGlyZWN0aW9uIGJhc2VkIG9uIG5hbWVcbiAqL1xuZnVuY3Rpb24gaW5mZXJNZXRyaWNEaXJlY3Rpb24obmFtZTogc3RyaW5nKTogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCcge1xuXHRsZXQgbG93ZXJOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gTG93ZXIgaXMgYmV0dGVyXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkZWxheScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdlcnJvcicpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdmYWlsdXJlJylcblx0KSB7XG5cdFx0cmV0dXJuICdsb3dlcl9pc19iZXR0ZXInXG5cdH1cblxuXHQvLyBIaWdoZXIgaXMgYmV0dGVyXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aHJvdWdocHV0JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3N1Y2Nlc3MnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygncXBzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3JwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdvcHMnKVxuXHQpIHtcblx0XHRyZXR1cm4gJ2hpZ2hlcl9pc19iZXR0ZXInXG5cdH1cblxuXHRyZXR1cm4gJ25ldXRyYWwnXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGNoYW5nZSBkaXJlY3Rpb25cbiAqL1xuZnVuY3Rpb24gZGV0ZXJtaW5lQ2hhbmdlRGlyZWN0aW9uKFxuXHRjdXJyZW50VmFsdWU6IG51bWJlcixcblx0YmFzZVZhbHVlOiBudW1iZXIsXG5cdG1ldHJpY0RpcmVjdGlvbjogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCcsXG5cdG5ldXRyYWxUaHJlc2hvbGQ6IG51bWJlciA9IDUuMFxuKTogJ2JldHRlcicgfCAnd29yc2UnIHwgJ25ldXRyYWwnIHwgJ3Vua25vd24nIHtcblx0aWYgKGlzTmFOKGN1cnJlbnRWYWx1ZSkgfHwgaXNOYU4oYmFzZVZhbHVlKSkge1xuXHRcdHJldHVybiAndW5rbm93bidcblx0fVxuXG5cdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoKChjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWUpIC8gYmFzZVZhbHVlKSAqIDEwMClcblxuXHQvLyBDb25zaWRlciBjaGFuZ2UgYmVsb3cgdGhyZXNob2xkIGFzIHN0YWJsZS9uZXV0cmFsXG5cdGlmIChjaGFuZ2VQZXJjZW50IDwgbmV1dHJhbFRocmVzaG9sZCkge1xuXHRcdHJldHVybiAnbmV1dHJhbCdcblx0fVxuXG5cdGlmIChtZXRyaWNEaXJlY3Rpb24gPT09ICdsb3dlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA8IGJhc2VWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2hpZ2hlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA+IGJhc2VWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0cmV0dXJuICduZXV0cmFsJ1xufVxuXG4vKipcbiAqIENvbXBhcmUgc2luZ2xlIG1ldHJpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZU1ldHJpYyhcblx0bWV0cmljOiBDb2xsZWN0ZWRNZXRyaWMsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJyxcblx0bmV1dHJhbFRocmVzaG9sZD86IG51bWJlclxuKTogTWV0cmljQ29tcGFyaXNvbiB7XG5cdGxldCBjdXJyZW50VmFsdWUgPSBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsICdjdXJyZW50JywgYWdncmVnYXRlKVxuXHRsZXQgYmFzZVZhbHVlID0gZ2V0TWV0cmljVmFsdWUobWV0cmljLCAnYmFzZScsIGFnZ3JlZ2F0ZSlcblxuXHRsZXQgYWJzb2x1dGUgPSBjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWVcblx0bGV0IHBlcmNlbnQgPSBpc05hTihiYXNlVmFsdWUpIHx8IGJhc2VWYWx1ZSA9PT0gMCA/IE5hTiA6IChhYnNvbHV0ZSAvIGJhc2VWYWx1ZSkgKiAxMDBcblxuXHRsZXQgbWV0cmljRGlyZWN0aW9uID0gaW5mZXJNZXRyaWNEaXJlY3Rpb24obWV0cmljLm5hbWUpXG5cdGxldCBkaXJlY3Rpb24gPSBkZXRlcm1pbmVDaGFuZ2VEaXJlY3Rpb24oY3VycmVudFZhbHVlLCBiYXNlVmFsdWUsIG1ldHJpY0RpcmVjdGlvbiwgbmV1dHJhbFRocmVzaG9sZClcblxuXHRyZXR1cm4ge1xuXHRcdG5hbWU6IG1ldHJpYy5uYW1lLFxuXHRcdHR5cGU6IG1ldHJpYy50eXBlLFxuXHRcdGN1cnJlbnQ6IHtcblx0XHRcdHZhbHVlOiBjdXJyZW50VmFsdWUsXG5cdFx0XHRhdmFpbGFibGU6ICFpc05hTihjdXJyZW50VmFsdWUpLFxuXHRcdH0sXG5cdFx0YmFzZToge1xuXHRcdFx0dmFsdWU6IGJhc2VWYWx1ZSxcblx0XHRcdGF2YWlsYWJsZTogIWlzTmFOKGJhc2VWYWx1ZSksXG5cdFx0fSxcblx0XHRjaGFuZ2U6IHtcblx0XHRcdGFic29sdXRlLFxuXHRcdFx0cGVyY2VudCxcblx0XHRcdGRpcmVjdGlvbixcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogQ29tcGFyZSBhbGwgbWV0cmljcyBpbiBhIHdvcmtsb2FkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlV29ya2xvYWRNZXRyaWNzKFxuXHR3b3JrbG9hZDogc3RyaW5nLFxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwLFxuXHRhZ2dyZWdhdGU6IEFnZ3JlZ2F0ZUZ1bmN0aW9uID0gJ2F2ZycsXG5cdG5ldXRyYWxUaHJlc2hvbGQ/OiBudW1iZXJcbik6IFdvcmtsb2FkQ29tcGFyaXNvbiB7XG5cdGxldCBjb21wYXJpc29uczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblxuXHRmb3IgKGxldCBbX25hbWUsIG1ldHJpY10gb2YgbWV0cmljcykge1xuXHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyZU1ldHJpYyhtZXRyaWMsIGFnZ3JlZ2F0ZSwgbmV1dHJhbFRocmVzaG9sZClcblx0XHRjb21wYXJpc29ucy5wdXNoKGNvbXBhcmlzb24pXG5cdH1cblxuXHQvLyBDYWxjdWxhdGUgc3VtbWFyeVxuXHRsZXQgcmVncmVzc2lvbnMgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ3dvcnNlJykubGVuZ3RoXG5cdGxldCBpbXByb3ZlbWVudHMgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ2JldHRlcicpLmxlbmd0aFxuXHRsZXQgc3RhYmxlID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICduZXV0cmFsJykubGVuZ3RoXG5cblx0cmV0dXJuIHtcblx0XHR3b3JrbG9hZCxcblx0XHRtZXRyaWNzOiBjb21wYXJpc29ucyxcblx0XHRzdW1tYXJ5OiB7XG5cdFx0XHR0b3RhbDogY29tcGFyaXNvbnMubGVuZ3RoLFxuXHRcdFx0cmVncmVzc2lvbnMsXG5cdFx0XHRpbXByb3ZlbWVudHMsXG5cdFx0XHRzdGFibGUsXG5cdFx0fSxcblx0fVxufVxuXG4vKipcbiAqIEZvcm1hdCB2YWx1ZSB3aXRoIHVuaXQgaW5mZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRWYWx1ZSh2YWx1ZTogbnVtYmVyLCBtZXRyaWNOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRpZiAoaXNOYU4odmFsdWUpKSByZXR1cm4gJ04vQSdcblxuXHRsZXQgbG93ZXJOYW1lID0gbWV0cmljTmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gTGF0ZW5jeS9kdXJhdGlvbiAobXMpXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fCBsb3dlck5hbWUuaW5jbHVkZXMoJ2R1cmF0aW9uJykgfHwgbG93ZXJOYW1lLmVuZHNXaXRoKCdfbXMnKSkge1xuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDIpfW1zYFxuXHR9XG5cblx0Ly8gVGltZSAoc2Vjb25kcylcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpICYmIGxvd2VyTmFtZS5lbmRzV2l0aCgnX3MnKSkge1xuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDIpfXNgXG5cdH1cblxuXHQvLyBQZXJjZW50YWdlXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygncGVyY2VudCcpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygncmF0ZScpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9JWBcblx0fVxuXG5cdC8vIFRocm91Z2hwdXRcblx0aWYgKFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGhyb3VnaHB1dCcpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdxcHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygncnBzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ29wcycpXG5cdCkge1xuXHRcdGlmICh2YWx1ZSA+PSAxMDAwKSB7XG5cdFx0XHRyZXR1cm4gYCR7KHZhbHVlIC8gMTAwMCkudG9GaXhlZCgyKX1rL3NgXG5cdFx0fVxuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDApfS9zYFxuXHR9XG5cblx0Ly8gRGVmYXVsdDogMiBkZWNpbWFsIHBsYWNlc1xuXHRyZXR1cm4gdmFsdWUudG9GaXhlZCgyKVxufVxuXG4vKipcbiAqIEZvcm1hdCBjaGFuZ2UgcGVyY2VudGFnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhbmdlKHBlcmNlbnQ6IG51bWJlciwgZGlyZWN0aW9uOiAnYmV0dGVyJyB8ICd3b3JzZScgfCAnbmV1dHJhbCcgfCAndW5rbm93bicpOiBzdHJpbmcge1xuXHRpZiAoaXNOYU4ocGVyY2VudCkpIHJldHVybiAnTi9BJ1xuXG5cdGxldCBzaWduID0gcGVyY2VudCA+PSAwID8gJysnIDogJydcblx0bGV0IGVtb2ppID0gZGlyZWN0aW9uID09PSAnYmV0dGVyJyA/ICfwn5+iJyA6IGRpcmVjdGlvbiA9PT0gJ3dvcnNlJyA/ICfwn5S0JyA6IGRpcmVjdGlvbiA9PT0gJ25ldXRyYWwnID8gJ+KaqicgOiAn4p2TJ1xuXG5cdHJldHVybiBgJHtzaWdufSR7cGVyY2VudC50b0ZpeGVkKDEpfSUgJHtlbW9qaX1gXG59XG4iLAogICAgIi8qKlxuICogQXJ0aWZhY3RzIGRvd25sb2FkIGFuZCBwYXJzaW5nXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGRlYnVnLCBpbmZvLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBDaGFvc0V2ZW50LCBEb2NrZXJFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHsgZm9ybWF0Q2hhb3NFdmVudHMsIGZvcm1hdEV2ZW50cywgcGFyc2VDaGFvc0V2ZW50c0pzb25sLCBwYXJzZUV2ZW50c0pzb25sLCB0eXBlIEZvcm1hdHRlZEV2ZW50IH0gZnJvbSAnLi9ldmVudHMuanMnXG5pbXBvcnQgeyBwYXJzZU1ldHJpY3NKc29ubCwgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtsb2FkQXJ0aWZhY3RzIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRwdWxsTnVtYmVyOiBudW1iZXJcblx0bWV0cmljczogTWV0cmljc01hcFxuXHRldmVudHM6IEZvcm1hdHRlZEV2ZW50W11cblx0bG9nc1BhdGg/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBcnRpZmFjdERvd25sb2FkT3B0aW9ucyB7XG5cdHRva2VuOiBzdHJpbmdcblx0d29ya2Zsb3dSdW5JZDogbnVtYmVyXG5cdHJlcG9zaXRvcnlPd25lcjogc3RyaW5nXG5cdHJlcG9zaXRvcnlOYW1lOiBzdHJpbmdcblx0ZG93bmxvYWRQYXRoOiBzdHJpbmdcbn1cblxuLyoqXG4gKiBEb3dubG9hZCBhbmQgcGFyc2UgYXJ0aWZhY3RzIGZvciBhIHdvcmtmbG93IHJ1blxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyhvcHRpb25zOiBBcnRpZmFjdERvd25sb2FkT3B0aW9ucyk6IFByb21pc2U8V29ya2xvYWRBcnRpZmFjdHNbXT4ge1xuXHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblxuXHRpbmZvKGBMaXN0aW5nIGFydGlmYWN0cyBmb3Igd29ya2Zsb3cgcnVuICR7b3B0aW9ucy53b3JrZmxvd1J1bklkfS4uLmApXG5cblx0bGV0IHsgYXJ0aWZhY3RzIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC5saXN0QXJ0aWZhY3RzKHtcblx0XHRmaW5kQnk6IHtcblx0XHRcdHRva2VuOiBvcHRpb25zLnRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZDogb3B0aW9ucy53b3JrZmxvd1J1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBvcHRpb25zLnJlcG9zaXRvcnlPd25lcixcblx0XHRcdHJlcG9zaXRvcnlOYW1lOiBvcHRpb25zLnJlcG9zaXRvcnlOYW1lLFxuXHRcdH0sXG5cdH0pXG5cblx0aW5mbyhgRm91bmQgJHthcnRpZmFjdHMubGVuZ3RofSBhcnRpZmFjdHNgKVxuXHRkZWJ1Zyhcblx0XHRgQXJ0aWZhY3RzOiAke0pTT04uc3RyaW5naWZ5KFxuXHRcdFx0YXJ0aWZhY3RzLm1hcCgoYSkgPT4gYS5uYW1lKSxcblx0XHRcdG51bGwsXG5cdFx0XHQyXG5cdFx0KX1gXG5cdClcblxuXHQvLyBEb3dubG9hZCBhbGwgYXJ0aWZhY3RzXG5cdGxldCBkb3dubG9hZGVkUGF0aHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aW5mbyhgRG93bmxvYWRpbmcgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfS4uLmApXG5cblx0XHRsZXQgeyBkb3dubG9hZFBhdGggfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LmRvd25sb2FkQXJ0aWZhY3QoYXJ0aWZhY3QuaWQsIHtcblx0XHRcdHBhdGg6IG9wdGlvbnMuZG93bmxvYWRQYXRoLFxuXHRcdFx0ZmluZEJ5OiB7XG5cdFx0XHRcdHRva2VuOiBvcHRpb25zLnRva2VuLFxuXHRcdFx0XHR3b3JrZmxvd1J1bklkOiBvcHRpb25zLndvcmtmbG93UnVuSWQsXG5cdFx0XHRcdHJlcG9zaXRvcnlPd25lcjogb3B0aW9ucy5yZXBvc2l0b3J5T3duZXIsXG5cdFx0XHRcdHJlcG9zaXRvcnlOYW1lOiBvcHRpb25zLnJlcG9zaXRvcnlOYW1lLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGFydGlmYWN0UGF0aCA9IHBhdGguam9pbihkb3dubG9hZFBhdGggfHwgb3B0aW9ucy5kb3dubG9hZFBhdGgsIGFydGlmYWN0Lm5hbWUpXG5cdFx0ZG93bmxvYWRlZFBhdGhzLnNldChhcnRpZmFjdC5uYW1lLCBhcnRpZmFjdFBhdGgpXG5cblx0XHRpbmZvKGBEb3dubG9hZGVkIGFydGlmYWN0ICR7YXJ0aWZhY3QubmFtZX0gdG8gJHthcnRpZmFjdFBhdGh9YClcblx0fVxuXG5cdC8vIEdyb3VwIGZpbGVzIGJ5IHdvcmtsb2FkXG5cdGxldCB3b3JrbG9hZEZpbGVzID0gbmV3IE1hcDxcblx0XHRzdHJpbmcsXG5cdFx0e1xuXHRcdFx0cHVsbD86IHN0cmluZ1xuXHRcdFx0bWV0cmljcz86IHN0cmluZ1xuXHRcdFx0ZXZlbnRzPzogc3RyaW5nXG5cdFx0XHRjaGFvc0V2ZW50cz86IHN0cmluZ1xuXHRcdFx0bG9ncz86IHN0cmluZ1xuXHRcdH1cblx0PigpXG5cblx0Zm9yIChsZXQgW2FydGlmYWN0TmFtZSwgYXJ0aWZhY3RQYXRoXSBvZiBkb3dubG9hZGVkUGF0aHMpIHtcblx0XHQvLyBBcnRpZmFjdCBuYW1lIGlzIHRoZSB3b3JrbG9hZCBuYW1lLCBmaWxlcyBpbnNpZGUgaGF2ZSB3b3JrbG9hZCBwcmVmaXhcblx0XHRsZXQgd29ya2xvYWQgPSBhcnRpZmFjdE5hbWVcblxuXHRcdC8vIExpc3QgZmlsZXMgaW4gYXJ0aWZhY3QgZGlyZWN0b3J5XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0UGF0aCkpIHtcblx0XHRcdHdhcm5pbmcoYEFydGlmYWN0IHBhdGggZG9lcyBub3QgZXhpc3Q6ICR7YXJ0aWZhY3RQYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoYXJ0aWZhY3RQYXRoKVxuXHRcdGxldCBmaWxlczogc3RyaW5nW10gPSBbXVxuXG5cdFx0aWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuXHRcdFx0ZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhhcnRpZmFjdFBhdGgpLm1hcCgoZikgPT4gcGF0aC5qb2luKGFydGlmYWN0UGF0aCwgZikpXG5cdFx0fSBlbHNlIHtcblx0XHRcdGZpbGVzID0gW2FydGlmYWN0UGF0aF1cblx0XHR9XG5cblx0XHRsZXQgZ3JvdXAgPSB3b3JrbG9hZEZpbGVzLmdldCh3b3JrbG9hZCkgfHwge31cblxuXHRcdGZvciAobGV0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdGxldCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSlcblxuXHRcdFx0aWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctcHVsbC50eHQnKSkge1xuXHRcdFx0XHRncm91cC5wdWxsID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldHJpY3MuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5tZXRyaWNzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWNoYW9zLWV2ZW50cy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLmNoYW9zRXZlbnRzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWV2ZW50cy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLmV2ZW50cyA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1sb2dzLnR4dCcpKSB7XG5cdFx0XHRcdGdyb3VwLmxvZ3MgPSBmaWxlXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0d29ya2xvYWRGaWxlcy5zZXQod29ya2xvYWQsIGdyb3VwKVxuXHR9XG5cblx0Ly8gUGFyc2Ugd29ya2xvYWQgZGF0YVxuXHRsZXQgd29ya2xvYWRzOiBXb3JrbG9hZEFydGlmYWN0c1tdID0gW11cblxuXHRmb3IgKGxldCBbd29ya2xvYWQsIGZpbGVzXSBvZiB3b3JrbG9hZEZpbGVzKSB7XG5cdFx0aWYgKCFmaWxlcy5wdWxsIHx8ICFmaWxlcy5tZXRyaWNzKSB7XG5cdFx0XHR3YXJuaW5nKGBTa2lwcGluZyBpbmNvbXBsZXRlIHdvcmtsb2FkICR7d29ya2xvYWR9OiBtaXNzaW5nIHJlcXVpcmVkIGZpbGVzYClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBwdWxsTnVtYmVyID0gcGFyc2VJbnQoZnMucmVhZEZpbGVTeW5jKGZpbGVzLnB1bGwsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSkudHJpbSgpKVxuXHRcdFx0bGV0IG1ldHJpY3NDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVzLm1ldHJpY3MsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRcdGxldCBtZXRyaWNzID0gcGFyc2VNZXRyaWNzSnNvbmwobWV0cmljc0NvbnRlbnQpXG5cblx0XHRcdGxldCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10gPSBbXVxuXHRcdFx0XG5cdFx0XHQvLyBMb2FkIGRvY2tlciBldmVudHNcblx0XHRcdGlmIChmaWxlcy5ldmVudHMgJiYgZnMuZXhpc3RzU3luYyhmaWxlcy5ldmVudHMpKSB7XG5cdFx0XHRcdGxldCBldmVudHNDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVzLmV2ZW50cywgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0XHRsZXQgcmF3RXZlbnRzID0gcGFyc2VFdmVudHNKc29ubChldmVudHNDb250ZW50KVxuXHRcdFx0XHRldmVudHMucHVzaCguLi5mb3JtYXRFdmVudHMocmF3RXZlbnRzKSlcblx0XHRcdH1cblxuXHRcdFx0Ly8gTG9hZCBjaGFvcyBldmVudHNcblx0XHRcdGlmIChmaWxlcy5jaGFvc0V2ZW50cyAmJiBmcy5leGlzdHNTeW5jKGZpbGVzLmNoYW9zRXZlbnRzKSkge1xuXHRcdFx0XHRsZXQgY2hhb3NFdmVudHNDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVzLmNoYW9zRXZlbnRzLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRcdGxldCByYXdDaGFvc0V2ZW50cyA9IHBhcnNlQ2hhb3NFdmVudHNKc29ubChjaGFvc0V2ZW50c0NvbnRlbnQpXG5cdFx0XHRcdGV2ZW50cy5wdXNoKC4uLmZvcm1hdENoYW9zRXZlbnRzKHJhd0NoYW9zRXZlbnRzKSlcblx0XHRcdH1cblxuXHRcdFx0Ly8gU29ydCBldmVudHMgYnkgdGltZXN0YW1wXG5cdFx0XHRldmVudHMuc29ydCgoYSwgYikgPT4gYS50aW1lc3RhbXAgLSBiLnRpbWVzdGFtcClcblxuXHRcdFx0d29ya2xvYWRzLnB1c2goe1xuXHRcdFx0XHR3b3JrbG9hZCxcblx0XHRcdFx0cHVsbE51bWJlcixcblx0XHRcdFx0bWV0cmljcyxcblx0XHRcdFx0ZXZlbnRzLFxuXHRcdFx0XHRsb2dzUGF0aDogZmlsZXMubG9ncyxcblx0XHRcdH0pXG5cblx0XHRcdGluZm8oYFBhcnNlZCB3b3JrbG9hZCAke3dvcmtsb2FkfTogJHttZXRyaWNzLnNpemV9IG1ldHJpY3MsICR7ZXZlbnRzLmxlbmd0aH0gZXZlbnRzYClcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0d2FybmluZyhgRmFpbGVkIHRvIHBhcnNlIHdvcmtsb2FkICR7d29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHdvcmtsb2Fkc1xufVxuIiwKICAgICIvKipcbiAqIERvY2tlciBldmVudHMgcGFyc2luZyBhbmQgZm9ybWF0dGluZ1xuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9ja2VyRXZlbnQge1xuXHR0aW1lOiBudW1iZXJcblx0QWN0aW9uOiBzdHJpbmdcblx0VHlwZTogc3RyaW5nXG5cdEFjdG9yOiB7XG5cdFx0SUQ6IHN0cmluZ1xuXHRcdEF0dHJpYnV0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0fVxuXHRba2V5OiBzdHJpbmddOiB1bmtub3duXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhb3NFdmVudCB7XG5cdHRpbWVzdGFtcDogc3RyaW5nXG5cdGVwb2NoX21zOiBudW1iZXJcblx0c2NlbmFyaW86IHN0cmluZ1xuXHRhY3Rpb246IHN0cmluZ1xuXHR0YXJnZXQ6IHN0cmluZ1xuXHRzZXZlcml0eTogJ2luZm8nIHwgJ3dhcm5pbmcnIHwgJ2NyaXRpY2FsJ1xuXHRtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgdW5rbm93bj5cbn1cblxuZXhwb3J0IGludGVyZmFjZSBGb3JtYXR0ZWRFdmVudCB7XG5cdHRpbWVzdGFtcDogbnVtYmVyXG5cdGFjdGlvbjogc3RyaW5nXG5cdHR5cGU6IHN0cmluZ1xuXHRsYWJlbDogc3RyaW5nXG5cdGljb246IHN0cmluZ1xuXHRjb2xvcjogc3RyaW5nXG5cdGFjdG9yOiBzdHJpbmdcblx0c291cmNlOiAnZG9ja2VyJyB8ICdjaGFvcydcbn1cblxuLyoqXG4gKiBQYXJzZSBkb2NrZXIgZXZlbnRzIEpTT05MIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXZlbnRzSnNvbmwoY29udGVudDogc3RyaW5nKTogRG9ja2VyRXZlbnRbXSB7XG5cdGxldCBldmVudHM6IERvY2tlckV2ZW50W10gPSBbXVxuXHRsZXQgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJylcblxuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWVcblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgZXZlbnQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIERvY2tlckV2ZW50XG5cdFx0XHRldmVudHMucHVzaChldmVudClcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogUGFyc2UgY2hhb3MgZXZlbnRzIEpTT05MIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlQ2hhb3NFdmVudHNKc29ubChjb250ZW50OiBzdHJpbmcpOiBDaGFvc0V2ZW50W10ge1xuXHRsZXQgZXZlbnRzOiBDaGFvc0V2ZW50W10gPSBbXVxuXHRsZXQgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJylcblxuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWVcblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgZXZlbnQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIENoYW9zRXZlbnRcblx0XHRcdGV2ZW50cy5wdXNoKGV2ZW50KVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gU2tpcCBpbnZhbGlkIGxpbmVzXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBldmVudHNcbn1cblxuLyoqXG4gKiBHZXQgaWNvbiBmb3IgZXZlbnQgYWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGdldEV2ZW50SWNvbihhY3Rpb246IHN0cmluZywgYXR0cmlidXRlcz86IFJlY29yZDxzdHJpbmcsIHN0cmluZz4pOiBzdHJpbmcge1xuXHRsZXQgaWNvbnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG5cdFx0cGF1c2U6ICfij7jvuI8nLFxuXHRcdHVucGF1c2U6ICfilrbvuI8nLFxuXHRcdHN0b3A6ICfij7nvuI8nLFxuXHRcdHN0YXJ0OiAn4pa277iPJyxcblx0XHRyZXN0YXJ0OiAn8J+UhCcsXG5cdFx0ZGllOiAn8J+SpCcsXG5cdFx0Y3JlYXRlOiAn8J+GlScsXG5cdFx0ZGVzdHJveTogJ/Cfl5HvuI8nLFxuXHRcdGhlYWx0aHk6ICfinIUnLFxuXHRcdGhlYWx0aF90aW1lb3V0OiAn4o+x77iPJyxcblx0XHRzY2VuYXJpb19zdGFydDogJ/CfjqwnLFxuXHRcdHNjZW5hcmlvX2NvbXBsZXRlOiAn8J+PgScsXG5cdFx0YmxhY2tob2xlX2NyZWF0ZTogJ/CflbPvuI8nLFxuXHRcdGJsYWNraG9sZV9yZW1vdmU6ICfwn5SMJyxcblx0fVxuXG5cdGlmIChhY3Rpb24gPT09ICdraWxsJykge1xuXHRcdHJldHVybiBhdHRyaWJ1dGVzPy5zaWduYWwgPT09ICdTSUdLSUxMJyA/ICfwn5KAJyA6ICfimqEnXG5cdH1cblxuXHRyZXR1cm4gaWNvbnNbYWN0aW9uXSB8fCAn8J+TjCdcbn1cblxuLyoqXG4gKiBHZXQgY29sb3IgZm9yIGV2ZW50IGFjdGlvblxuICovXG5mdW5jdGlvbiBnZXRFdmVudENvbG9yKGFjdGlvbjogc3RyaW5nLCBzZXZlcml0eT86IHN0cmluZyk6IHN0cmluZyB7XG5cdC8vIFVzZSBzZXZlcml0eSBmb3IgY2hhb3MgZXZlbnRzXG5cdGlmIChzZXZlcml0eSA9PT0gJ2NyaXRpY2FsJykge1xuXHRcdHJldHVybiAnI2RjMjYyNicgLy8gZGFyayByZWRcblx0fSBlbHNlIGlmIChzZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSB7XG5cdFx0cmV0dXJuICcjZjU5ZTBiJyAvLyBvcmFuZ2Vcblx0fSBlbHNlIGlmIChzZXZlcml0eSA9PT0gJ2luZm8nKSB7XG5cdFx0cmV0dXJuICcjMTBiOTgxJyAvLyBncmVlblxuXHR9XG5cblx0Ly8gRG9ja2VyIGV2ZW50cyBjb2xvcnNcblx0bGV0IGNvbG9yczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcblx0XHRwYXVzZTogJyNmNTllMGInLCAvLyBvcmFuZ2Vcblx0XHR1bnBhdXNlOiAnIzEwYjk4MScsIC8vIGdyZWVuXG5cdFx0c3RvcDogJyNlZjQ0NDQnLCAvLyByZWRcblx0XHRzdGFydDogJyMxMGI5ODEnLCAvLyBncmVlblxuXHRcdGtpbGw6ICcjZGMyNjI2JywgLy8gZGFyayByZWRcblx0XHRyZXN0YXJ0OiAnI2Y1OWUwYicsIC8vIG9yYW5nZVxuXHRcdGRpZTogJyM2YjcyODAnLCAvLyBncmF5XG5cdFx0Y3JlYXRlOiAnIzNiODJmNicsIC8vIGJsdWVcblx0XHRkZXN0cm95OiAnI2VmNDQ0NCcsIC8vIHJlZFxuXHR9XG5cblx0cmV0dXJuIGNvbG9yc1thY3Rpb25dIHx8ICcjNmI3MjgwJ1xufVxuXG4vKipcbiAqIEZvcm1hdCBldmVudCBsYWJlbFxuICovXG5mdW5jdGlvbiBmb3JtYXRFdmVudExhYmVsKGV2ZW50OiBEb2NrZXJFdmVudCk6IHN0cmluZyB7XG5cdC8vIFRyeSB0byBnZXQgZnJpZW5kbHkgbmFtZSBmcm9tIGNvbXBvc2UgbGFiZWxzXG5cdGxldCBuYW1lID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5uYW1lIHx8IGV2ZW50LkFjdG9yLklELnN1YnN0cmluZygwLCAxMilcblx0bGV0IG5vZGVUeXBlID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlc1sneWRiLm5vZGUudHlwZSddXG5cdGxldCBzZXJ2aWNlID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlc1snY29tLmRvY2tlci5jb21wb3NlLnNlcnZpY2UnXVxuXG5cdC8vIFVzZSBZREIgbm9kZSB0eXBlIGlmIGF2YWlsYWJsZSAoZS5nLiwgXCJkYXRhYmFzZVwiLCBcInN0b3JhZ2VcIilcblx0bGV0IGRpc3BsYXlOYW1lID0gbmFtZVxuXHRpZiAobm9kZVR5cGUpIHtcblx0XHRkaXNwbGF5TmFtZSA9IGAke25vZGVUeXBlfSAoJHtuYW1lfSlgXG5cdH0gZWxzZSBpZiAoc2VydmljZSkge1xuXHRcdGRpc3BsYXlOYW1lID0gc2VydmljZVxuXHR9XG5cblx0bGV0IGFjdGlvbiA9IGV2ZW50LkFjdGlvblxuXG5cdGlmIChhY3Rpb24gPT09ICdraWxsJyAmJiBldmVudC5BY3Rvci5BdHRyaWJ1dGVzLnNpZ25hbCkge1xuXHRcdHJldHVybiBgJHthY3Rpb259ICR7ZGlzcGxheU5hbWV9ICgke2V2ZW50LkFjdG9yLkF0dHJpYnV0ZXMuc2lnbmFsfSlgXG5cdH1cblxuXHRyZXR1cm4gYCR7YWN0aW9ufSAke2Rpc3BsYXlOYW1lfWBcbn1cblxuLyoqXG4gKiBGb3JtYXQgY2hhb3MgZXZlbnQgbGFiZWxcbiAqL1xuZnVuY3Rpb24gZm9ybWF0Q2hhb3NFdmVudExhYmVsKGV2ZW50OiBDaGFvc0V2ZW50KTogc3RyaW5nIHtcblx0Ly8gRm9ybWF0IHRhcmdldCAoc2hvcnRlbiBjb250YWluZXIgbmFtZSBpZiBuZWVkZWQpXG5cdGxldCB0YXJnZXQgPSBldmVudC50YXJnZXRcblx0aWYgKHRhcmdldC5zdGFydHNXaXRoKCd5ZGItJykpIHtcblx0XHR0YXJnZXQgPSB0YXJnZXQucmVwbGFjZSgneWRiLScsICcnKVxuXHR9XG5cblx0Ly8gRm9ybWF0IGFjdGlvbiBsYWJlbFxuXHRsZXQgbGFiZWwgPSBgWyR7ZXZlbnQuc2NlbmFyaW99XSAke2V2ZW50LmFjdGlvbn0gJHt0YXJnZXR9YFxuXG5cdC8vIEFkZCByZWxldmFudCBtZXRhZGF0YVxuXHRpZiAoZXZlbnQubWV0YWRhdGEudGltZW91dCAhPT0gdW5kZWZpbmVkKSB7XG5cdFx0bGFiZWwgKz0gYCAodGltZW91dD0ke2V2ZW50Lm1ldGFkYXRhLnRpbWVvdXR9cylgXG5cdH1cblx0aWYgKGV2ZW50Lm1ldGFkYXRhLmR1cmF0aW9uX3NlY29uZHMgIT09IHVuZGVmaW5lZCkge1xuXHRcdGxhYmVsICs9IGAgKCR7ZXZlbnQubWV0YWRhdGEuZHVyYXRpb25fc2Vjb25kc31zKWBcblx0fVxuXHRpZiAoZXZlbnQubWV0YWRhdGEucmVjb3ZlcnlfdGltZV9zZWNvbmRzICE9PSB1bmRlZmluZWQpIHtcblx0XHRsYWJlbCArPSBgIChyZWNvdmVyeT0ke2V2ZW50Lm1ldGFkYXRhLnJlY292ZXJ5X3RpbWVfc2Vjb25kc31zKWBcblx0fVxuXHRpZiAoZXZlbnQubWV0YWRhdGEuc2lnbmFsKSB7XG5cdFx0bGFiZWwgKz0gYCAoJHtldmVudC5tZXRhZGF0YS5zaWduYWx9KWBcblx0fVxuXG5cdHJldHVybiBsYWJlbFxufVxuXG4vKipcbiAqIEZvcm1hdCBkb2NrZXIgZXZlbnRzIGZvciB2aXN1YWxpemF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFdmVudHMoZXZlbnRzOiBEb2NrZXJFdmVudFtdKTogRm9ybWF0dGVkRXZlbnRbXSB7XG5cdHJldHVybiBldmVudHMubWFwKChldmVudCkgPT4gKHtcblx0XHR0aW1lc3RhbXA6IGV2ZW50LnRpbWUsXG5cdFx0YWN0aW9uOiBldmVudC5BY3Rpb24sXG5cdFx0dHlwZTogZXZlbnQuVHlwZSxcblx0XHRsYWJlbDogZm9ybWF0RXZlbnRMYWJlbChldmVudCksXG5cdFx0aWNvbjogZ2V0RXZlbnRJY29uKGV2ZW50LkFjdGlvbiwgZXZlbnQuQWN0b3IuQXR0cmlidXRlcyksXG5cdFx0Y29sb3I6IGdldEV2ZW50Q29sb3IoZXZlbnQuQWN0aW9uKSxcblx0XHRhY3RvcjogZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5uYW1lIHx8IGV2ZW50LkFjdG9yLklELnN1YnN0cmluZygwLCAxMiksXG5cdFx0c291cmNlOiAnZG9ja2VyJyBhcyBjb25zdCxcblx0fSkpXG59XG5cbi8qKlxuICogRm9ybWF0IGNoYW9zIGV2ZW50cyBmb3IgdmlzdWFsaXphdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhb3NFdmVudHMoZXZlbnRzOiBDaGFvc0V2ZW50W10pOiBGb3JtYXR0ZWRFdmVudFtdIHtcblx0cmV0dXJuIGV2ZW50cy5tYXAoKGV2ZW50KSA9PiAoe1xuXHRcdHRpbWVzdGFtcDogZXZlbnQuZXBvY2hfbXMsXG5cdFx0YWN0aW9uOiBldmVudC5hY3Rpb24sXG5cdFx0dHlwZTogJ2NoYW9zJyxcblx0XHRsYWJlbDogZm9ybWF0Q2hhb3NFdmVudExhYmVsKGV2ZW50KSxcblx0XHRpY29uOiBnZXRFdmVudEljb24oZXZlbnQuYWN0aW9uKSxcblx0XHRjb2xvcjogZ2V0RXZlbnRDb2xvcihldmVudC5hY3Rpb24sIGV2ZW50LnNldmVyaXR5KSxcblx0XHRhY3RvcjogZXZlbnQuc2NlbmFyaW8sXG5cdFx0c291cmNlOiAnY2hhb3MnIGFzIGNvbnN0LFxuXHR9KSlcbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgQ2hlY2tzIEFQSSBpbnRlZ3JhdGlvblxuICovXG5cbmltcG9ydCB7IGluZm8gfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHsgZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMsIHR5cGUgVGhyZXNob2xkQ29uZmlnIH0gZnJvbSAnLi90aHJlc2hvbGRzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIENoZWNrT3B0aW9ucyB7XG5cdHRva2VuOiBzdHJpbmdcblx0b3duZXI6IHN0cmluZ1xuXHRyZXBvOiBzdHJpbmdcblx0c2hhOiBzdHJpbmdcblx0d29ya2xvYWQ6IFdvcmtsb2FkQ29tcGFyaXNvblxuXHR0aHJlc2hvbGRzOiBUaHJlc2hvbGRDb25maWdcblx0cmVwb3J0VXJsPzogc3RyaW5nXG59XG5cbi8qKlxuICogQ3JlYXRlIEdpdEh1YiBDaGVjayBmb3Igd29ya2xvYWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdvcmtsb2FkQ2hlY2sob3B0aW9uczogQ2hlY2tPcHRpb25zKTogUHJvbWlzZTx7IGlkOiBudW1iZXI7IHVybDogc3RyaW5nIH0+IHtcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KG9wdGlvbnMudG9rZW4pXG5cblx0bGV0IG5hbWUgPSBgU0xPOiAke29wdGlvbnMud29ya2xvYWQud29ya2xvYWR9YFxuXHRsZXQgZXZhbHVhdGlvbiA9IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKG9wdGlvbnMud29ya2xvYWQubWV0cmljcywgb3B0aW9ucy50aHJlc2hvbGRzKVxuXHRsZXQgY29uY2x1c2lvbiA9IGRldGVybWluZUNvbmNsdXNpb25Gcm9tRXZhbHVhdGlvbihldmFsdWF0aW9uLm92ZXJhbGwpXG5cdGxldCB0aXRsZSA9IGdlbmVyYXRlVGl0bGUob3B0aW9ucy53b3JrbG9hZCwgZXZhbHVhdGlvbilcblx0bGV0IHN1bW1hcnlUZXh0ID0gZ2VuZXJhdGVTdW1tYXJ5KG9wdGlvbnMud29ya2xvYWQsIGV2YWx1YXRpb24sIG9wdGlvbnMucmVwb3J0VXJsKVxuXG5cdGluZm8oYENyZWF0aW5nIGNoZWNrIFwiJHtuYW1lfVwiIHdpdGggY29uY2x1c2lvbjogJHtjb25jbHVzaW9ufWApXG5cblx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0LmNoZWNrcy5jcmVhdGUoe1xuXHRcdG93bmVyOiBvcHRpb25zLm93bmVyLFxuXHRcdHJlcG86IG9wdGlvbnMucmVwbyxcblx0XHRuYW1lLFxuXHRcdGhlYWRfc2hhOiBvcHRpb25zLnNoYSxcblx0XHRzdGF0dXM6ICdjb21wbGV0ZWQnLFxuXHRcdGNvbmNsdXNpb24sXG5cdFx0b3V0cHV0OiB7XG5cdFx0XHR0aXRsZSxcblx0XHRcdHN1bW1hcnk6IHN1bW1hcnlUZXh0LFxuXHRcdH0sXG5cdH0pXG5cblx0aW5mbyhgQ2hlY2sgY3JlYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cblx0cmV0dXJuIHsgaWQ6IGRhdGEuaWQsIHVybDogZGF0YS5odG1sX3VybCEgfVxufVxuXG4vKipcbiAqIE1hcCB0aHJlc2hvbGQgc2V2ZXJpdHkgdG8gR2l0SHViIENoZWNrIGNvbmNsdXNpb25cbiAqL1xuZnVuY3Rpb24gZGV0ZXJtaW5lQ29uY2x1c2lvbkZyb21FdmFsdWF0aW9uKFxuXHRzZXZlcml0eTogJ3N1Y2Nlc3MnIHwgJ3dhcm5pbmcnIHwgJ2ZhaWx1cmUnXG4pOiAnc3VjY2VzcycgfCAnbmV1dHJhbCcgfCAnZmFpbHVyZScge1xuXHRpZiAoc2V2ZXJpdHkgPT09ICdmYWlsdXJlJykgcmV0dXJuICdmYWlsdXJlJ1xuXHRpZiAoc2V2ZXJpdHkgPT09ICd3YXJuaW5nJykgcmV0dXJuICduZXV0cmFsJ1xuXHRyZXR1cm4gJ3N1Y2Nlc3MnXG59XG5cbi8qKlxuICogR2VuZXJhdGUgY2hlY2sgdGl0bGVcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVUaXRsZShcblx0d29ya2xvYWQ6IFdvcmtsb2FkQ29tcGFyaXNvbixcblx0ZXZhbHVhdGlvbjogeyBvdmVyYWxsOiBzdHJpbmc7IGZhaWx1cmVzOiBhbnlbXTsgd2FybmluZ3M6IGFueVtdIH1cbik6IHN0cmluZyB7XG5cdGlmIChldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gYCR7ZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGh9IGNyaXRpY2FsIHRocmVzaG9sZChzKSB2aW9sYXRlZGBcblx0fVxuXG5cdGlmIChldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aCA+IDApIHtcblx0XHRyZXR1cm4gYCR7ZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGh9IHdhcm5pbmcgdGhyZXNob2xkKHMpIGV4Y2VlZGVkYFxuXHR9XG5cblx0aWYgKHdvcmtsb2FkLnN1bW1hcnkuaW1wcm92ZW1lbnRzID4gMCkge1xuXHRcdHJldHVybiBgJHt3b3JrbG9hZC5zdW1tYXJ5LmltcHJvdmVtZW50c30gaW1wcm92ZW1lbnQocykgZGV0ZWN0ZWRgXG5cdH1cblxuXHRyZXR1cm4gJ0FsbCBtZXRyaWNzIHdpdGhpbiB0aHJlc2hvbGRzJ1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGNoZWNrIHN1bW1hcnlcbiAqL1xuZnVuY3Rpb24gZ2VuZXJhdGVTdW1tYXJ5KFxuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uLFxuXHRldmFsdWF0aW9uOiB7IG92ZXJhbGw6IHN0cmluZzsgZmFpbHVyZXM6IGFueVtdOyB3YXJuaW5nczogYW55W10gfSxcblx0cmVwb3J0VXJsPzogc3RyaW5nXG4pOiBzdHJpbmcge1xuXHRsZXQgbGluZXMgPSBbXG5cdFx0YCoqTWV0cmljcyBhbmFseXplZDoqKiAke3dvcmtsb2FkLnN1bW1hcnkudG90YWx9YCxcblx0XHRgLSDwn5S0IENyaXRpY2FsOiAke2V2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RofWAsXG5cdFx0YC0g8J+foSBXYXJuaW5nczogJHtldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aH1gLFxuXHRcdGAtIPCfn6IgSW1wcm92ZW1lbnRzOiAke3dvcmtsb2FkLnN1bW1hcnkuaW1wcm92ZW1lbnRzfWAsXG5cdFx0YC0g4pqqIFN0YWJsZTogJHt3b3JrbG9hZC5zdW1tYXJ5LnN0YWJsZX1gLFxuXHRcdCcnLFxuXHRdXG5cblx0aWYgKHJlcG9ydFVybCkge1xuXHRcdGxpbmVzLnB1c2goYPCfk4ogW1ZpZXcgZGV0YWlsZWQgSFRNTCByZXBvcnRdKCR7cmVwb3J0VXJsfSlgLCAnJylcblx0fVxuXG5cdC8vIENyaXRpY2FsIGZhaWx1cmVzXG5cdGlmIChldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg4p2MIENyaXRpY2FsIFRocmVzaG9sZHMgVmlvbGF0ZWQnLCAnJylcblxuXHRcdGZvciAobGV0IG1ldHJpYyBvZiBldmFsdWF0aW9uLmZhaWx1cmVzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSlgXG5cdFx0XHQpXG5cdFx0fVxuXG5cdFx0bGluZXMucHVzaCgnJylcblx0fVxuXG5cdC8vIFdhcm5pbmdzXG5cdGlmIChldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg4pqg77iPIFdhcm5pbmcgVGhyZXNob2xkcyBFeGNlZWRlZCcsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGV2YWx1YXRpb24ud2FybmluZ3Muc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gVG9wIGltcHJvdmVtZW50c1xuXHRsZXQgaW1wcm92ZW1lbnRzID0gd29ya2xvYWQubWV0cmljc1xuXHRcdC5maWx0ZXIoKG0pID0+IG0uY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ2JldHRlcicpXG5cdFx0LnNvcnQoKGEsIGIpID0+IE1hdGguYWJzKGIuY2hhbmdlLnBlcmNlbnQpIC0gTWF0aC5hYnMoYS5jaGFuZ2UucGVyY2VudCkpXG5cblx0aWYgKGltcHJvdmVtZW50cy5sZW5ndGggPiAwKSB7XG5cdFx0bGluZXMucHVzaCgnIyMjIPCfn6IgVG9wIEltcHJvdmVtZW50cycsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGltcHJvdmVtZW50cy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBsaW5lcy5qb2luKCdcXG4nKVxufVxuIiwKICAgICIvKipcbiAqIFRocmVzaG9sZHMgY29uZmlndXJhdGlvbiBhbmQgZXZhbHVhdGlvblxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcbmltcG9ydCB7IGZpbGVVUkxUb1BhdGggfSBmcm9tICdub2RlOnVybCdcblxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5pbXBvcnQgeyBkZWJ1Zywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB0eXBlIHsgTWV0cmljQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0cmljVGhyZXNob2xkIHtcblx0bmFtZT86IHN0cmluZyAvLyBFeGFjdCBtZXRyaWMgbmFtZSAoaGlnaGVyIHByaW9yaXR5IHRoYW4gcGF0dGVybilcblx0cGF0dGVybj86IHN0cmluZyAvLyBHbG9iIHBhdHRlcm4gKGxvd2VyIHByaW9yaXR5KVxuXHRkaXJlY3Rpb24/OiAnbG93ZXJfaXNfYmV0dGVyJyB8ICdoaWdoZXJfaXNfYmV0dGVyJyB8ICduZXV0cmFsJ1xuXHR3YXJuaW5nX21pbj86IG51bWJlclxuXHRjcml0aWNhbF9taW4/OiBudW1iZXJcblx0d2FybmluZ19tYXg/OiBudW1iZXJcblx0Y3JpdGljYWxfbWF4PzogbnVtYmVyXG5cdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ/OiBudW1iZXJcblx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ/OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaHJlc2hvbGRDb25maWcge1xuXHRuZXV0cmFsX2NoYW5nZV9wZXJjZW50OiBudW1iZXJcblx0ZGVmYXVsdDoge1xuXHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OiBudW1iZXJcblx0fVxuXHRtZXRyaWNzPzogTWV0cmljVGhyZXNob2xkW11cbn1cblxuZXhwb3J0IHR5cGUgVGhyZXNob2xkU2V2ZXJpdHkgPSAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZmFpbHVyZSdcblxuLyoqXG4gKiBQYXJzZSBZQU1MIHRocmVzaG9sZHMgY29uZmlnXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlVGhyZXNob2xkc1lhbWwoeWFtbENvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnIHwgbnVsbD4ge1xuXHRpZiAoIXlhbWxDb250ZW50IHx8IHlhbWxDb250ZW50LnRyaW0oKSA9PT0gJycpIHtcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG5cblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKCd5cScsIFsnLW89anNvbicsICcuJ10sIHtcblx0XHRcdGlucHV0OiBCdWZmZXIuZnJvbSh5YW1sQ29udGVudCwgJ3V0Zi04JyksXG5cdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0c3Rkb3V0OiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGxldCBqc29uID0gY2h1bmtzLmpvaW4oJycpXG5cdFx0bGV0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvbikgYXMgVGhyZXNob2xkQ29uZmlnXG5cblx0XHRyZXR1cm4gcGFyc2VkXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIHBhcnNlIHRocmVzaG9sZHMgWUFNTDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0cmV0dXJuIG51bGxcblx0fVxufVxuXG4vKipcbiAqIE1lcmdlIHR3byB0aHJlc2hvbGQgY29uZmlncyAoY3VzdG9tIGV4dGVuZHMvb3ZlcnJpZGVzIGRlZmF1bHQpXG4gKi9cbmZ1bmN0aW9uIG1lcmdlVGhyZXNob2xkQ29uZmlncyhkZWZhdWx0Q29uZmlnOiBUaHJlc2hvbGRDb25maWcsIGN1c3RvbUNvbmZpZzogVGhyZXNob2xkQ29uZmlnKTogVGhyZXNob2xkQ29uZmlnIHtcblx0cmV0dXJuIHtcblx0XHRuZXV0cmFsX2NoYW5nZV9wZXJjZW50OiBjdXN0b21Db25maWcubmV1dHJhbF9jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQsXG5cdFx0ZGVmYXVsdDoge1xuXHRcdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDpcblx0XHRcdFx0Y3VzdG9tQ29uZmlnLmRlZmF1bHQ/Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5kZWZhdWx0Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQsXG5cdFx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDpcblx0XHRcdFx0Y3VzdG9tQ29uZmlnLmRlZmF1bHQ/LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcuZGVmYXVsdC5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudCxcblx0XHR9LFxuXHRcdG1ldHJpY3M6IFsuLi4oY3VzdG9tQ29uZmlnLm1ldHJpY3MgfHwgW10pLCAuLi4oZGVmYXVsdENvbmZpZy5tZXRyaWNzIHx8IFtdKV0sXG5cdFx0Ly8gQ3VzdG9tIG1ldHJpY3MgY29tZSBmaXJzdCwgc28gdGhleSBoYXZlIGhpZ2hlciBwcmlvcml0eSBpbiBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQoKVxuXHR9XG59XG5cbi8qKlxuICogTG9hZCBkZWZhdWx0IHRocmVzaG9sZHMgZnJvbSBkZXBsb3kvdGhyZXNob2xkcy55YW1sXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIGxvYWREZWZhdWx0VGhyZXNob2xkcygpOiBQcm9taXNlPFRocmVzaG9sZENvbmZpZz4ge1xuXHRkZWJ1ZygnTG9hZGluZyBkZWZhdWx0IHRocmVzaG9sZHMgZnJvbSBkZXBsb3kvdGhyZXNob2xkcy55YW1sJylcblx0bGV0IGFjdGlvblJvb3QgPSBwYXRoLnJlc29sdmUocGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSksICcuLi8uLi8nKVxuXHRsZXQgZGVmYXVsdFBhdGggPSBwYXRoLmpvaW4oYWN0aW9uUm9vdCwgJ2RlcGxveScsICd0aHJlc2hvbGRzLnlhbWwnKVxuXG5cdGlmIChmcy5leGlzdHNTeW5jKGRlZmF1bHRQYXRoKSkge1xuXHRcdGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGRlZmF1bHRQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0bGV0IGNvbmZpZyA9IGF3YWl0IHBhcnNlVGhyZXNob2xkc1lhbWwoY29udGVudClcblx0XHRpZiAoY29uZmlnKSByZXR1cm4gY29uZmlnXG5cdH1cblxuXHQvLyBGYWxsYmFjayB0byBoYXJkY29kZWQgZGVmYXVsdHNcblx0d2FybmluZygnQ291bGQgbm90IGxvYWQgZGVmYXVsdCB0aHJlc2hvbGRzLCB1c2luZyBoYXJkY29kZWQgZGVmYXVsdHMnKVxuXHRyZXR1cm4ge1xuXHRcdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IDUuMCxcblx0XHRkZWZhdWx0OiB7XG5cdFx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OiAyMC4wLFxuXHRcdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IDUwLjAsXG5cdFx0fSxcblx0fVxufVxuXG4vKipcbiAqIExvYWQgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uIHdpdGggbWVyZ2luZzpcbiAqIDEuIExvYWQgZGVmYXVsdCBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWxcbiAqIDIuIE1lcmdlIHdpdGggY3VzdG9tIFlBTUwgKGlubGluZSkgaWYgcHJvdmlkZWRcbiAqIDMuIE1lcmdlIHdpdGggY3VzdG9tIGZpbGUgaWYgcHJvdmlkZWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUaHJlc2hvbGRzKGN1c3RvbVlhbWw/OiBzdHJpbmcsIGN1c3RvbVBhdGg/OiBzdHJpbmcpOiBQcm9taXNlPFRocmVzaG9sZENvbmZpZz4ge1xuXHQvLyBBbHdheXMgbG9hZCBkZWZhdWx0cyBmaXJzdFxuXHRsZXQgY29uZmlnID0gYXdhaXQgbG9hZERlZmF1bHRUaHJlc2hvbGRzKClcblxuXHQvLyBNZXJnZSB3aXRoIGN1c3RvbSBZQU1MIChpbmxpbmUpXG5cdGlmIChjdXN0b21ZYW1sKSB7XG5cdFx0ZGVidWcoJ01lcmdpbmcgY3VzdG9tIHRocmVzaG9sZHMgZnJvbSBpbmxpbmUgWUFNTCcpXG5cdFx0bGV0IGN1c3RvbUNvbmZpZyA9IGF3YWl0IHBhcnNlVGhyZXNob2xkc1lhbWwoY3VzdG9tWWFtbClcblx0XHRpZiAoY3VzdG9tQ29uZmlnKSB7XG5cdFx0XHRjb25maWcgPSBtZXJnZVRocmVzaG9sZENvbmZpZ3MoY29uZmlnLCBjdXN0b21Db25maWcpXG5cdFx0fVxuXHR9XG5cblx0Ly8gTWVyZ2Ugd2l0aCBjdXN0b20gZmlsZVxuXHRpZiAoY3VzdG9tUGF0aCAmJiBmcy5leGlzdHNTeW5jKGN1c3RvbVBhdGgpKSB7XG5cdFx0ZGVidWcoYE1lcmdpbmcgY3VzdG9tIHRocmVzaG9sZHMgZnJvbSBmaWxlOiAke2N1c3RvbVBhdGh9YClcblx0XHRsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhjdXN0b21QYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0bGV0IGN1c3RvbUNvbmZpZyA9IGF3YWl0IHBhcnNlVGhyZXNob2xkc1lhbWwoY29udGVudClcblx0XHRpZiAoY3VzdG9tQ29uZmlnKSB7XG5cdFx0XHRjb25maWcgPSBtZXJnZVRocmVzaG9sZENvbmZpZ3MoY29uZmlnLCBjdXN0b21Db25maWcpXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNvbmZpZ1xufVxuXG4vKipcbiAqIE1hdGNoIG1ldHJpYyBuYW1lIGFnYWluc3QgcGF0dGVybiAoc3VwcG9ydHMgd2lsZGNhcmRzKVxuICovXG5mdW5jdGlvbiBtYXRjaFBhdHRlcm4obWV0cmljTmFtZTogc3RyaW5nLCBwYXR0ZXJuOiBzdHJpbmcpOiBib29sZWFuIHtcblx0Ly8gQ29udmVydCBnbG9iIHBhdHRlcm4gdG8gcmVnZXhcblx0bGV0IHJlZ2V4UGF0dGVybiA9IHBhdHRlcm5cblx0XHQucmVwbGFjZSgvXFwqL2csICcuKicpIC8vICogLT4gLipcblx0XHQucmVwbGFjZSgvXFw/L2csICcuJykgLy8gPyAtPiAuXG5cblx0bGV0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXiR7cmVnZXhQYXR0ZXJufSRgLCAnaScpXG5cdHJldHVybiByZWdleC50ZXN0KG1ldHJpY05hbWUpXG59XG5cbi8qKlxuICogRmluZCBtYXRjaGluZyB0aHJlc2hvbGQgZm9yIG1ldHJpYyAoZXhhY3QgbWF0Y2ggZmlyc3QsIHRoZW4gcGF0dGVybilcbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoaW5nVGhyZXNob2xkKG1ldHJpY05hbWU6IHN0cmluZywgY29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBNZXRyaWNUaHJlc2hvbGQgfCBudWxsIHtcblx0aWYgKCFjb25maWcubWV0cmljcykgcmV0dXJuIG51bGxcblxuXHQvLyBGaXJzdCBwYXNzOiBleGFjdCBtYXRjaCAoaGlnaGVzdCBwcmlvcml0eSlcblx0Zm9yIChsZXQgdGhyZXNob2xkIG9mIGNvbmZpZy5tZXRyaWNzKSB7XG5cdFx0aWYgKHRocmVzaG9sZC5uYW1lICYmIHRocmVzaG9sZC5uYW1lID09PSBtZXRyaWNOYW1lKSB7XG5cdFx0XHRyZXR1cm4gdGhyZXNob2xkXG5cdFx0fVxuXHR9XG5cblx0Ly8gU2Vjb25kIHBhc3M6IHBhdHRlcm4gbWF0Y2hcblx0Zm9yIChsZXQgdGhyZXNob2xkIG9mIGNvbmZpZy5tZXRyaWNzKSB7XG5cdFx0aWYgKHRocmVzaG9sZC5wYXR0ZXJuICYmIG1hdGNoUGF0dGVybihtZXRyaWNOYW1lLCB0aHJlc2hvbGQucGF0dGVybikpIHtcblx0XHRcdHJldHVybiB0aHJlc2hvbGRcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEV2YWx1YXRlIHRocmVzaG9sZCBmb3IgYSBtZXRyaWMgY29tcGFyaXNvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVUaHJlc2hvbGQoY29tcGFyaXNvbjogTWV0cmljQ29tcGFyaXNvbiwgY29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBUaHJlc2hvbGRTZXZlcml0eSB7XG5cdC8vIENhbid0IGV2YWx1YXRlIHdpdGhvdXQgYmFzZVxuXHRpZiAoIWNvbXBhcmlzb24uYmFzZS5hdmFpbGFibGUpIHtcblx0XHRyZXR1cm4gJ3N1Y2Nlc3MnXG5cdH1cblxuXHRsZXQgdGhyZXNob2xkID0gZmluZE1hdGNoaW5nVGhyZXNob2xkKGNvbXBhcmlzb24ubmFtZSwgY29uZmlnKVxuXG5cdC8vIENoZWNrIGFic29sdXRlIHZhbHVlIHRocmVzaG9sZHMgZmlyc3Rcblx0aWYgKHRocmVzaG9sZCkge1xuXHRcdC8vIENoZWNrIGNyaXRpY2FsX21pblxuXHRcdGlmICh0aHJlc2hvbGQuY3JpdGljYWxfbWluICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlIDwgdGhyZXNob2xkLmNyaXRpY2FsX21pbikge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYmVsb3cgY3JpdGljYWxfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC5jcml0aWNhbF9taW59KWApXG5cdFx0XHRyZXR1cm4gJ2ZhaWx1cmUnXG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgd2FybmluZ19taW5cblx0XHRpZiAodGhyZXNob2xkLndhcm5pbmdfbWluICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlIDwgdGhyZXNob2xkLndhcm5pbmdfbWluKSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBiZWxvdyB3YXJuaW5nX21pbiAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9IDwgJHt0aHJlc2hvbGQud2FybmluZ19taW59KWApXG5cdFx0XHRyZXR1cm4gJ3dhcm5pbmcnXG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWF4XG5cdFx0aWYgKHRocmVzaG9sZC5jcml0aWNhbF9tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQuY3JpdGljYWxfbWF4KSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBhYm92ZSBjcml0aWNhbF9tYXggKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA+ICR7dGhyZXNob2xkLmNyaXRpY2FsX21heH0pYClcblx0XHRcdHJldHVybiAnZmFpbHVyZSdcblx0XHR9XG5cblx0XHQvLyBDaGVjayB3YXJuaW5nX21heFxuXHRcdGlmICh0aHJlc2hvbGQud2FybmluZ19tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQud2FybmluZ19tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIHdhcm5pbmdfbWF4ICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPiAke3RocmVzaG9sZC53YXJuaW5nX21heH0pYClcblx0XHRcdHJldHVybiAnd2FybmluZydcblx0XHR9XG5cdH1cblxuXHQvLyBDaGVjayBjaGFuZ2UgcGVyY2VudCB0aHJlc2hvbGRzXG5cdGlmICghaXNOYU4oY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCkpIHtcblx0XHRsZXQgY2hhbmdlUGVyY2VudCA9IE1hdGguYWJzKGNvbXBhcmlzb24uY2hhbmdlLnBlcmNlbnQpXG5cblx0XHQvLyBVc2UgbWV0cmljLXNwZWNpZmljIG9yIGRlZmF1bHQgdGhyZXNob2xkc1xuXHRcdGxldCB3YXJuaW5nVGhyZXNob2xkID0gdGhyZXNob2xkPy53YXJuaW5nX2NoYW5nZV9wZXJjZW50ID8/IGNvbmZpZy5kZWZhdWx0Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnRcblx0XHRsZXQgY3JpdGljYWxUaHJlc2hvbGQgPSB0aHJlc2hvbGQ/LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50ID8/IGNvbmZpZy5kZWZhdWx0LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50XG5cblx0XHQvLyBPbmx5IHRyaWdnZXIgaWYgY2hhbmdlIGlzIGluIFwid29yc2VcIiBkaXJlY3Rpb25cblx0XHRpZiAoY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uID09PSAnd29yc2UnKSB7XG5cdFx0XHRpZiAoY2hhbmdlUGVyY2VudCA+IGNyaXRpY2FsVGhyZXNob2xkKSB7XG5cdFx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGNyaXRpY2FsIHJlZ3Jlc3Npb24gKCR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDEpfSUgPiAke2NyaXRpY2FsVGhyZXNob2xkfSUpYClcblx0XHRcdFx0cmV0dXJuICdmYWlsdXJlJ1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoY2hhbmdlUGVyY2VudCA+IHdhcm5pbmdUaHJlc2hvbGQpIHtcblx0XHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogd2FybmluZyByZWdyZXNzaW9uICgke2NoYW5nZVBlcmNlbnQudG9GaXhlZCgxKX0lID4gJHt3YXJuaW5nVGhyZXNob2xkfSUpYClcblx0XHRcdFx0cmV0dXJuICd3YXJuaW5nJ1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiAnc3VjY2Vzcydcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSBhbGwgbWV0cmljcyBhbmQgcmV0dXJuIG92ZXJhbGwgc2V2ZXJpdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKFxuXHRjb21wYXJpc29uczogTWV0cmljQ29tcGFyaXNvbltdLFxuXHRjb25maWc6IFRocmVzaG9sZENvbmZpZ1xuKToge1xuXHRvdmVyYWxsOiBUaHJlc2hvbGRTZXZlcml0eVxuXHRmYWlsdXJlczogTWV0cmljQ29tcGFyaXNvbltdXG5cdHdhcm5pbmdzOiBNZXRyaWNDb21wYXJpc29uW11cbn0ge1xuXHRsZXQgZmFpbHVyZXM6IE1ldHJpY0NvbXBhcmlzb25bXSA9IFtdXG5cdGxldCB3YXJuaW5nczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblxuXHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0bGV0IHNldmVyaXR5ID0gZXZhbHVhdGVUaHJlc2hvbGQoY29tcGFyaXNvbiwgY29uZmlnKVxuXG5cdFx0aWYgKHNldmVyaXR5ID09PSAnZmFpbHVyZScpIHtcblx0XHRcdGZhaWx1cmVzLnB1c2goY29tcGFyaXNvbilcblx0XHR9IGVsc2UgaWYgKHNldmVyaXR5ID09PSAnd2FybmluZycpIHtcblx0XHRcdHdhcm5pbmdzLnB1c2goY29tcGFyaXNvbilcblx0XHR9XG5cdH1cblxuXHRsZXQgb3ZlcmFsbDogVGhyZXNob2xkU2V2ZXJpdHkgPSAnc3VjY2Vzcydcblx0aWYgKGZhaWx1cmVzLmxlbmd0aCA+IDApIHtcblx0XHRvdmVyYWxsID0gJ2ZhaWx1cmUnXG5cdH0gZWxzZSBpZiAod2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdG92ZXJhbGwgPSAnd2FybmluZydcblx0fVxuXG5cdHJldHVybiB7IG92ZXJhbGwsIGZhaWx1cmVzLCB3YXJuaW5ncyB9XG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIFBSIGNvbW1lbnQgZ2VuZXJhdGlvbiBhbmQgbWFuYWdlbWVudFxuICovXG5cbmltcG9ydCB7IGluZm8gfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHR5cGUgeyBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1lbnREYXRhIHtcblx0d29ya2xvYWRzOiBXb3JrbG9hZENvbXBhcmlzb25bXVxuXHRhcnRpZmFjdFVybHM6IE1hcDxzdHJpbmcsIHN0cmluZz5cblx0Y2hlY2tVcmxzOiBNYXA8c3RyaW5nLCBzdHJpbmc+XG5cdGpvYlN1bW1hcnlVcmw/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBQUiBjb21tZW50IGJvZHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29tbWVudEJvZHkoZGF0YTogQ29tbWVudERhdGEpOiBzdHJpbmcge1xuXHRsZXQgdG90YWxSZWdyZXNzaW9ucyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkucmVncmVzc2lvbnMsIDApXG5cdGxldCB0b3RhbEltcHJvdmVtZW50cyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkuaW1wcm92ZW1lbnRzLCAwKVxuXG5cdGxldCBzdGF0dXNFbW9qaSA9IHRvdGFsUmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdGxldCBzdGF0dXNUZXh0ID0gdG90YWxSZWdyZXNzaW9ucyA+IDAgPyBgJHt0b3RhbFJlZ3Jlc3Npb25zfSByZWdyZXNzaW9uc2AgOiAnQWxsIGNsZWFyJ1xuXG5cdGxldCBoZWFkZXIgPSBgIyMg8J+MiyBTTE8gVGVzdCBSZXN1bHRzXG5cbioqU3RhdHVzKio6ICR7c3RhdHVzRW1vaml9ICR7ZGF0YS53b3JrbG9hZHMubGVuZ3RofSB3b3JrbG9hZHMgdGVzdGVkIOKAoiAke3N0YXR1c1RleHR9XG5cbiR7ZGF0YS5qb2JTdW1tYXJ5VXJsID8gYPCfk4ggW1ZpZXcgSm9iIFN1bW1hcnldKCR7ZGF0YS5qb2JTdW1tYXJ5VXJsfSkgZm9yIGRldGFpbGVkIGNvbXBhcmlzb25cXG5gIDogJyd9YFxuXG5cdGxldCB0YWJsZSA9IGBcbnwgV29ya2xvYWQgfCBNZXRyaWNzIHwgUmVncmVzc2lvbnMgfCBJbXByb3ZlbWVudHMgfCBMaW5rcyB8XG58LS0tLS0tLS0tLXwtLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLXwtLS0tLS0tfFxuJHtkYXRhLndvcmtsb2Fkc1xuXHQubWFwKCh3KSA9PiB7XG5cdFx0bGV0IGVtb2ppID0gdy5zdW1tYXJ5LnJlZ3Jlc3Npb25zID4gMCA/ICfwn5+hJyA6IHcuc3VtbWFyeS5pbXByb3ZlbWVudHMgPiAwID8gJ/Cfn6InIDogJ+Kaqidcblx0XHRsZXQgcmVwb3J0TGluayA9IGRhdGEuYXJ0aWZhY3RVcmxzLmdldCh3Lndvcmtsb2FkKSB8fCAnIydcblx0XHRsZXQgY2hlY2tMaW5rID0gZGF0YS5jaGVja1VybHMuZ2V0KHcud29ya2xvYWQpIHx8ICcjJ1xuXG5cdFx0cmV0dXJuIGB8ICR7ZW1vaml9ICR7dy53b3JrbG9hZH0gfCAke3cuc3VtbWFyeS50b3RhbH0gfCAke3cuc3VtbWFyeS5yZWdyZXNzaW9uc30gfCAke3cuc3VtbWFyeS5pbXByb3ZlbWVudHN9IHwgW1JlcG9ydF0oJHtyZXBvcnRMaW5rfSkg4oCiIFtDaGVja10oJHtjaGVja0xpbmt9KSB8YFxuXHR9KVxuXHQuam9pbignXFxuJyl9XG5gXG5cblx0bGV0IGZvb3RlciA9IGBcXG4tLS1cXG4qR2VuZXJhdGVkIGJ5IFt5ZGItc2xvLWFjdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3lkYi1wbGF0Zm9ybS95ZGItc2xvLWFjdGlvbikqYFxuXG5cdHJldHVybiBoZWFkZXIgKyB0YWJsZSArIGZvb3RlclxufVxuXG4vKipcbiAqIEZpbmQgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRFeGlzdGluZ1NMT0NvbW1lbnQoXG5cdHRva2VuOiBzdHJpbmcsXG5cdG93bmVyOiBzdHJpbmcsXG5cdHJlcG86IHN0cmluZyxcblx0cHJOdW1iZXI6IG51bWJlclxuKTogUHJvbWlzZTxudW1iZXIgfCBudWxsPiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRpbmZvKGBTZWFyY2hpbmcgZm9yIGV4aXN0aW5nIFNMTyBjb21tZW50IGluIFBSICMke3ByTnVtYmVyfS4uLmApXG5cblx0bGV0IHsgZGF0YTogY29tbWVudHMgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMubGlzdENvbW1lbnRzKHtcblx0XHRvd25lcixcblx0XHRyZXBvLFxuXHRcdGlzc3VlX251bWJlcjogcHJOdW1iZXIsXG5cdH0pXG5cblx0Zm9yIChsZXQgY29tbWVudCBvZiBjb21tZW50cykge1xuXHRcdGlmIChjb21tZW50LmJvZHk/LmluY2x1ZGVzKCfwn4yLIFNMTyBUZXN0IFJlc3VsdHMnKSkge1xuXHRcdFx0aW5mbyhgRm91bmQgZXhpc3RpbmcgY29tbWVudDogJHtjb21tZW50LmlkfWApXG5cdFx0XHRyZXR1cm4gY29tbWVudC5pZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogQ3JlYXRlIG9yIHVwZGF0ZSBQUiBjb21tZW50XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVPclVwZGF0ZUNvbW1lbnQoXG5cdHRva2VuOiBzdHJpbmcsXG5cdG93bmVyOiBzdHJpbmcsXG5cdHJlcG86IHN0cmluZyxcblx0cHJOdW1iZXI6IG51bWJlcixcblx0Ym9keTogc3RyaW5nXG4pOiBQcm9taXNlPHsgdXJsOiBzdHJpbmc7IGlkOiBudW1iZXIgfT4ge1xuXHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQodG9rZW4pXG5cblx0bGV0IGV4aXN0aW5nSWQgPSBhd2FpdCBmaW5kRXhpc3RpbmdTTE9Db21tZW50KHRva2VuLCBvd25lciwgcmVwbywgcHJOdW1iZXIpXG5cblx0aWYgKGV4aXN0aW5nSWQpIHtcblx0XHRpbmZvKGBVcGRhdGluZyBleGlzdGluZyBjb21tZW50ICR7ZXhpc3RpbmdJZH0uLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy51cGRhdGVDb21tZW50KHtcblx0XHRcdG93bmVyLFxuXHRcdFx0cmVwbyxcblx0XHRcdGNvbW1lbnRfaWQ6IGV4aXN0aW5nSWQsXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRpbmZvKGBDb21tZW50IHVwZGF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9IGVsc2Uge1xuXHRcdGluZm8oYENyZWF0aW5nIG5ldyBjb21tZW50Li4uYClcblxuXHRcdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMuY3JlYXRlQ29tbWVudCh7XG5cdFx0XHRvd25lcixcblx0XHRcdHJlcG8sXG5cdFx0XHRpc3N1ZV9udW1iZXI6IHByTnVtYmVyLFxuXHRcdFx0Ym9keSxcblx0XHR9KVxuXG5cdFx0aW5mbyhgQ29tbWVudCBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRcdHJldHVybiB7IHVybDogZGF0YS5odG1sX3VybCEsIGlkOiBkYXRhLmlkIH1cblx0fVxufVxuIiwKICAgICIvKipcbiAqIEhUTUwgcmVwb3J0IGdlbmVyYXRpb24gd2l0aCBDaGFydC5qc1xuICovXG5cbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcbmltcG9ydCB0eXBlIHsgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuL2V2ZW50cy5qcydcbmltcG9ydCB0eXBlIHsgQ29sbGVjdGVkTWV0cmljLCBNZXRyaWNzTWFwLCBTZXJpZXMgfSBmcm9tICcuL21ldHJpY3MuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgSFRNTFJlcG9ydERhdGEge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXVxuXHRjb21taXRzOiB7XG5cdFx0Y3VycmVudDogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHRcdGJhc2U6IHsgc2hhOiBzdHJpbmc7IHVybDogc3RyaW5nOyBzaG9ydDogc3RyaW5nIH1cblx0fVxuXHRtZXRhOiB7XG5cdFx0cHJOdW1iZXI6IG51bWJlclxuXHRcdGdlbmVyYXRlZEF0OiBzdHJpbmdcblx0XHR0ZXN0RHVyYXRpb24/OiBzdHJpbmdcblx0fVxufVxuXG4vKipcbiAqIEdlbmVyYXRlIEhUTUwgcmVwb3J0XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUhUTUxSZXBvcnQoZGF0YTogSFRNTFJlcG9ydERhdGEpOiBzdHJpbmcge1xuXHRyZXR1cm4gYDwhRE9DVFlQRSBodG1sPlxuPGh0bWwgbGFuZz1cImVuXCI+XG48aGVhZD5cblx0PG1ldGEgY2hhcnNldD1cIlVURi04XCI+XG5cdDxtZXRhIG5hbWU9XCJ2aWV3cG9ydFwiIGNvbnRlbnQ9XCJ3aWR0aD1kZXZpY2Utd2lkdGgsIGluaXRpYWwtc2NhbGU9MS4wXCI+XG5cdDx0aXRsZT5TTE8gUmVwb3J0OiAke2VzY2FwZUh0bWwoZGF0YS53b3JrbG9hZCl9PC90aXRsZT5cblx0PHN0eWxlPiR7Z2V0U3R5bGVzKCl9PC9zdHlsZT5cbjwvaGVhZD5cbjxib2R5PlxuXHQ8aGVhZGVyPlxuXHRcdDxoMT7wn4yLIFNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L2gxPlxuXHRcdDxkaXYgY2xhc3M9XCJjb21taXQtaW5mb1wiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJjb21taXQgY3VycmVudFwiPlxuXHRcdFx0XHRDdXJyZW50OiA8YSBocmVmPVwiJHtkYXRhLmNvbW1pdHMuY3VycmVudC51cmx9XCIgdGFyZ2V0PVwiX2JsYW5rXCI+JHtkYXRhLmNvbW1pdHMuY3VycmVudC5zaG9ydH08L2E+XG5cdFx0XHQ8L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInZzXCI+dnM8L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBiYXNlXCI+XG5cdFx0XHRcdEJhc2U6IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5iYXNlLnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2RhdGEuY29tbWl0cy5iYXNlLnNob3J0fTwvYT5cblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibWV0YVwiPlxuXHRcdFx0PHNwYW4+UFIgIyR7ZGF0YS5tZXRhLnByTnVtYmVyfTwvc3Bhbj5cblx0XHRcdCR7ZGF0YS5tZXRhLnRlc3REdXJhdGlvbiA/IGA8c3Bhbj5EdXJhdGlvbjogJHtkYXRhLm1ldGEudGVzdER1cmF0aW9ufTwvc3Bhbj5gIDogJyd9XG5cdFx0XHQ8c3Bhbj5HZW5lcmF0ZWQ6ICR7ZGF0YS5tZXRhLmdlbmVyYXRlZEF0fTwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0PC9oZWFkZXI+XG5cblx0PHNlY3Rpb24gY2xhc3M9XCJzdW1tYXJ5XCI+XG5cdFx0PGgyPvCfk4ogTWV0cmljcyBPdmVydmlldzwvaDI+XG5cdFx0PGRpdiBjbGFzcz1cInN0YXRzXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS50b3RhbH08L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5Ub3RhbCBNZXRyaWNzPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgaW1wcm92ZW1lbnRzXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5pbXByb3ZlbWVudHN9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+SW1wcm92ZW1lbnRzPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgcmVncmVzc2lvbnNcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnJlZ3Jlc3Npb25zfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlJlZ3Jlc3Npb25zPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgc3RhYmxlXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5zdGFibGV9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+U3RhYmxlPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQke2dlbmVyYXRlQ29tcGFyaXNvblRhYmxlKGRhdGEuY29tcGFyaXNvbil9XG5cdDwvc2VjdGlvbj5cblxuXHQ8c2VjdGlvbiBjbGFzcz1cImNoYXJ0c1wiPlxuXHRcdDxoMj7wn5OIIFRpbWUgU2VyaWVzPC9oMj5cblx0XHQke2dlbmVyYXRlQ2hhcnRzKGRhdGEpfVxuXHQ8L3NlY3Rpb24+XG5cblx0JHtkYXRhLmV2ZW50cy5sZW5ndGggPiAwID8gZ2VuZXJhdGVFdmVudHNTZWN0aW9uKGRhdGEuZXZlbnRzKSA6ICcnfVxuXG5cdDxmb290ZXI+XG5cdFx0PHA+R2VuZXJhdGVkIGJ5IDxhIGhyZWY9XCJodHRwczovL2dpdGh1Yi5jb20veWRiLXBsYXRmb3JtL3lkYi1zbG8tYWN0aW9uXCIgdGFyZ2V0PVwiX2JsYW5rXCI+eWRiLXNsby1hY3Rpb248L2E+PC9wPlxuXHQ8L2Zvb3Rlcj5cblxuXHQ8c2NyaXB0IHNyYz1cImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vY2hhcnQuanNANC40LjAvZGlzdC9jaGFydC51bWQubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLWFkYXB0ZXItZGF0ZS1mbnNAMy4wLjAvZGlzdC9jaGFydGpzLWFkYXB0ZXItZGF0ZS1mbnMuYnVuZGxlLm1pbi5qc1wiPjwvc2NyaXB0PlxuXHQ8c2NyaXB0IHNyYz1cImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbkAzLjAuMS9kaXN0L2NoYXJ0anMtcGx1Z2luLWFubm90YXRpb24ubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQ+XG5cdFx0JHtnZW5lcmF0ZUNoYXJ0U2NyaXB0cyhkYXRhKX1cblx0PC9zY3JpcHQ+XG48L2JvZHk+XG48L2h0bWw+YFxufVxuXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiB0ZXh0XG5cdFx0LnJlcGxhY2UoLyYvZywgJyZhbXA7Jylcblx0XHQucmVwbGFjZSgvPC9nLCAnJmx0OycpXG5cdFx0LnJlcGxhY2UoLz4vZywgJyZndDsnKVxuXHRcdC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jylcblx0XHQucmVwbGFjZSgvJy9nLCAnJiMwMzk7Jylcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDb21wYXJpc29uVGFibGUoY29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uKTogc3RyaW5nIHtcblx0bGV0IHJvd3MgPSBjb21wYXJpc29uLm1ldHJpY3Ncblx0XHQubWFwKFxuXHRcdFx0KG0pID0+IGBcblx0XHQ8dHIgY2xhc3M9XCIke20uY2hhbmdlLmRpcmVjdGlvbn1cIj5cblx0XHRcdDx0ZD4ke2VzY2FwZUh0bWwobS5uYW1lKX08L3RkPlxuXHRcdFx0PHRkPiR7Zm9ybWF0VmFsdWUobS5jdXJyZW50LnZhbHVlLCBtLm5hbWUpfTwvdGQ+XG5cdFx0XHQ8dGQ+JHttLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0VmFsdWUobS5iYXNlLnZhbHVlLCBtLm5hbWUpIDogJ04vQSd9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cImNoYW5nZS1jZWxsXCI+JHttLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJ308L3RkPlxuXHRcdDwvdHI+XG5cdGBcblx0XHQpXG5cdFx0LmpvaW4oJycpXG5cblx0cmV0dXJuIGBcblx0XHQ8dGFibGUgY2xhc3M9XCJjb21wYXJpc29uLXRhYmxlXCI+XG5cdFx0XHQ8dGhlYWQ+XG5cdFx0XHRcdDx0cj5cblx0XHRcdFx0XHQ8dGg+TWV0cmljPC90aD5cblx0XHRcdFx0XHQ8dGg+Q3VycmVudDwvdGg+XG5cdFx0XHRcdFx0PHRoPkJhc2U8L3RoPlxuXHRcdFx0XHRcdDx0aD5DaGFuZ2U8L3RoPlxuXHRcdFx0XHQ8L3RyPlxuXHRcdFx0PC90aGVhZD5cblx0XHRcdDx0Ym9keT5cblx0XHRcdFx0JHtyb3dzfVxuXHRcdFx0PC90Ym9keT5cblx0XHQ8L3RhYmxlPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRzKGRhdGE6IEhUTUxSZXBvcnREYXRhKTogc3RyaW5nIHtcblx0cmV0dXJuIGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKSAvLyBPbmx5IHJhbmdlIG1ldHJpY3MgaGF2ZSBjaGFydHNcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmdldChjb21wYXJpc29uLm5hbWUpXG5cdFx0XHRpZiAoIW1ldHJpYykgcmV0dXJuICcnXG5cblx0XHRcdHJldHVybiBgXG5cdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWNhcmRcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1oZWFkZXJcIj5cblx0XHRcdFx0PGgzPlxuXHRcdFx0XHRcdCR7ZXNjYXBlSHRtbChjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzPVwiaW5kaWNhdG9yICR7Y29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9ufVwiPiR7Zm9ybWF0Q2hhbmdlKGNvbXBhcmlzb24uY2hhbmdlLnBlcmNlbnQsIGNvbXBhcmlzb24uY2hhbmdlLmRpcmVjdGlvbil9PC9zcGFuPlxuXHRcdFx0XHQ8L2gzPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtbWV0YVwiPlxuXHRcdFx0XHRcdEN1cnJlbnQ6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlLCBjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdCR7Y29tcGFyaXNvbi5iYXNlLmF2YWlsYWJsZSA/IGAg4oCiIEJhc2U6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5iYXNlLnZhbHVlLCBjb21wYXJpc29uLm5hbWUpfWAgOiAnJ31cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1jb250YWluZXJcIj5cblx0XHRcdFx0PGNhbnZhcyBpZD1cImNoYXJ0LSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPjwvY2FudmFzPlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdGBcblx0XHR9KVxuXHRcdC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUV2ZW50c1NlY3Rpb24oZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdKTogc3RyaW5nIHtcblx0bGV0IGV2ZW50c0xpc3QgPSBldmVudHNcblx0XHQubWFwKFxuXHRcdFx0KGUpID0+IGBcblx0XHQ8ZGl2IGNsYXNzPVwiZXZlbnQtaXRlbVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1tYXJrZXJcIiBzdHlsZT1cImJhY2tncm91bmQtY29sb3I6ICR7ZS5jb2xvcn1cIj48L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LWljb25cIj4ke2UuaWNvbn08L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LXRpbWVcIj4ke2Zvcm1hdFRpbWVzdGFtcChlLnRpbWVzdGFtcCl9PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1sYWJlbFwiPiR7ZXNjYXBlSHRtbChlLmxhYmVsKX08L3NwYW4+XG5cdFx0PC9kaXY+XG5cdGBcblx0XHQpXG5cdFx0LmpvaW4oJycpXG5cblx0cmV0dXJuIGBcblx0PHNlY3Rpb24gY2xhc3M9XCJldmVudHMtc2VjdGlvblwiPlxuXHRcdDxoMj7wn5ONIEV2ZW50cyBUaW1lbGluZTwvaDI+XG5cdFx0PGRpdiBjbGFzcz1cImV2ZW50cy1saXN0XCI+XG5cdFx0XHQke2V2ZW50c0xpc3R9XG5cdFx0PC9kaXY+XG5cdDwvc2VjdGlvbj5cblx0YFxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNoYXJ0U2NyaXB0cyhkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdGxldCBjaGFydFNjcmlwdHMgPSBkYXRhLmNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5maWx0ZXIoKG0pID0+IG0udHlwZSA9PT0gJ3JhbmdlJylcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmdldChjb21wYXJpc29uLm5hbWUpXG5cdFx0XHRpZiAoIW1ldHJpYykgcmV0dXJuICcnXG5cblx0XHRcdHJldHVybiBnZW5lcmF0ZVNpbmdsZUNoYXJ0U2NyaXB0KGNvbXBhcmlzb24ubmFtZSwgbWV0cmljIGFzIENvbGxlY3RlZE1ldHJpYywgZGF0YS5ldmVudHMpXG5cdFx0fSlcblx0XHQuam9pbignXFxuJylcblxuXHRyZXR1cm4gY2hhcnRTY3JpcHRzXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQobWV0cmljTmFtZTogc3RyaW5nLCBtZXRyaWM6IENvbGxlY3RlZE1ldHJpYywgZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdKTogc3RyaW5nIHtcblx0bGV0IGN1cnJlbnRTZXJpZXMgPSAobWV0cmljLmRhdGEgYXMgU2VyaWVzW10pLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2N1cnJlbnQnKVxuXHRsZXQgYmFzZVNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnYmFzZScpXG5cblx0bGV0IGN1cnJlbnREYXRhID0gY3VycmVudFNlcmllc1xuXHRcdD8gSlNPTi5zdHJpbmdpZnkoY3VycmVudFNlcmllcy52YWx1ZXMubWFwKChbdCwgdl0pID0+ICh7IHg6IHQgKiAxMDAwLCB5OiBwYXJzZUZsb2F0KHYpIH0pKSlcblx0XHQ6ICdbXSdcblxuXHRsZXQgYmFzZURhdGEgPSBiYXNlU2VyaWVzXG5cdFx0PyBKU09OLnN0cmluZ2lmeShiYXNlU2VyaWVzLnZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdDogJ1tdJ1xuXG5cdGxldCBhbm5vdGF0aW9ucyA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSkgPT4gYHtcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdHhNaW46ICR7ZS50aW1lc3RhbXAgKiAxMDAwfSxcblx0XHRcdHhNYXg6ICR7ZS50aW1lc3RhbXAgKiAxMDAwfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnJHtlLmNvbG9yfScsXG5cdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdGJvcmRlckRhc2g6IFs1LCA1XSxcblx0XHRcdGxhYmVsOiB7XG5cdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdGNvbnRlbnQ6ICcke2UuaWNvbn0nLFxuXHRcdFx0XHRwb3NpdGlvbjogJ3N0YXJ0Jyxcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnJHtlLmNvbG9yfScsXG5cdFx0XHRcdGNvbG9yOiAnI2ZmZicsXG5cdFx0XHRcdGZvbnQ6IHsgc2l6ZTogMTQgfSxcblx0XHRcdFx0cGFkZGluZzogNFxuXHRcdFx0fVxuXHRcdH1gXG5cdFx0KVxuXHRcdC5qb2luKCcsXFxuJylcblxuXHRyZXR1cm4gYFxuKGZ1bmN0aW9uKCkge1xuXHRjb25zdCBjdHggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhcnQtJHtzYW5pdGl6ZUlkKG1ldHJpY05hbWUpfScpO1xuXHRpZiAoIWN0eCkgcmV0dXJuO1xuXG5cdG5ldyBDaGFydChjdHgsIHtcblx0XHR0eXBlOiAnbGluZScsXG5cdFx0ZGF0YToge1xuXHRcdFx0ZGF0YXNldHM6IFtcblx0XHRcdFx0e1xuXHRcdFx0XHRcdGxhYmVsOiAnQ3VycmVudCcsXG5cdFx0XHRcdFx0ZGF0YTogJHtjdXJyZW50RGF0YX0sXG5cdFx0XHRcdFx0Ym9yZGVyQ29sb3I6ICcjM2I4MmY2Jyxcblx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjM2I4MmY2MjAnLFxuXHRcdFx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdFx0fSxcblx0XHRcdFx0JHtcblx0XHRcdFx0XHRiYXNlU2VyaWVzXG5cdFx0XHRcdFx0XHQ/IGB7XG5cdFx0XHRcdFx0bGFiZWw6ICdCYXNlJyxcblx0XHRcdFx0XHRkYXRhOiAke2Jhc2VEYXRhfSxcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogJyM5NGEzYjgnLFxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM5NGEzYjgyMCcsXG5cdFx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdLFxuXHRcdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdFx0fWBcblx0XHRcdFx0XHRcdDogJydcblx0XHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0b3B0aW9uczoge1xuXHRcdFx0cmVzcG9uc2l2ZTogdHJ1ZSxcblx0XHRcdG1haW50YWluQXNwZWN0UmF0aW86IGZhbHNlLFxuXHRcdFx0aW50ZXJhY3Rpb246IHtcblx0XHRcdFx0bW9kZTogJ2luZGV4Jyxcblx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0fSxcblx0XHRcdHNjYWxlczoge1xuXHRcdFx0XHR4OiB7XG5cdFx0XHRcdFx0dHlwZTogJ3RpbWUnLFxuXHRcdFx0XHRcdHRpbWU6IHtcblx0XHRcdFx0XHRcdHVuaXQ6ICdtaW51dGUnLFxuXHRcdFx0XHRcdFx0ZGlzcGxheUZvcm1hdHM6IHtcblx0XHRcdFx0XHRcdFx0bWludXRlOiAnSEg6bW0nXG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRcdHRleHQ6ICdUaW1lJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0eToge1xuXHRcdFx0XHRcdGJlZ2luQXRaZXJvOiBmYWxzZSxcblx0XHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRcdHRleHQ6ICcke2VzY2FwZUpzKG1ldHJpY05hbWUpfSdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRwbHVnaW5zOiB7XG5cdFx0XHRcdGxlZ2VuZDoge1xuXHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0cG9zaXRpb246ICd0b3AnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRvb2x0aXA6IHtcblx0XHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRcdGludGVyc2VjdDogZmFsc2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0YW5ub3RhdGlvbjoge1xuXHRcdFx0XHRcdGFubm90YXRpb25zOiBbJHthbm5vdGF0aW9uc31dXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xufSkoKTtcbmBcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVJZChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvW15hLXpBLVowLTldL2csICctJylcbn1cblxuZnVuY3Rpb24gZXNjYXBlSnMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZXN0YW1wKHRpbWVzdGFtcDogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXAgKiAxMDAwKVxuXHRyZXR1cm4gZGF0ZS50b0lTT1N0cmluZygpLnN1YnN0cmluZygxMSwgMTkpXG59XG5cbmZ1bmN0aW9uIGdldFN0eWxlcygpOiBzdHJpbmcge1xuXHRyZXR1cm4gYFxuKiB7XG5cdG1hcmdpbjogMDtcblx0cGFkZGluZzogMDtcblx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcbn1cblxuYm9keSB7XG5cdGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgJ0hlbHZldGljYSBOZXVlJywgQXJpYWwsIHNhbnMtc2VyaWY7XG5cdGxpbmUtaGVpZ2h0OiAxLjY7XG5cdGNvbG9yOiAjMjQyOTJmO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRwYWRkaW5nOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGJvZHkge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Y29sb3I6ICNjOWQxZDk7XG5cdH1cbn1cblxuaGVhZGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogMCBhdXRvIDQwcHg7XG5cdHBhZGRpbmc6IDMwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRoZWFkZXIge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmhlYWRlciBoMSB7XG5cdGZvbnQtc2l6ZTogMzJweDtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNvbW1pdC1pbmZvIHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxMHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuLmNvbW1pdCB7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG4uY29tbWl0LmN1cnJlbnQge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmNvbW1pdC5iYXNlIHtcblx0YmFja2dyb3VuZDogI2RkZjRmZjtcblx0Y29sb3I6ICMwOTY5ZGE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbW1pdC5jdXJyZW50IHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5jb21taXQuYmFzZSB7XG5cdFx0YmFja2dyb3VuZDogIzBjMmQ2Yjtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG4uY29tbWl0IGEge1xuXHRjb2xvcjogaW5oZXJpdDtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4uY29tbWl0IGE6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuLnZzIHtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5tZXRhIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0ZGlzcGxheTogZmxleDtcblx0Z2FwOiAxNXB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG59XG5cbnNlY3Rpb24ge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcbn1cblxuc2VjdGlvbiBoMiB7XG5cdGZvbnQtc2l6ZTogMjRweDtcblx0bWFyZ2luLWJvdHRvbTogMjBweDtcblx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdHBhZGRpbmctYm90dG9tOiAxMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdHNlY3Rpb24gaDIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uc3RhdHMge1xuXHRkaXNwbGF5OiBncmlkO1xuXHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDIwMHB4LCAxZnIpKTtcblx0Z2FwOiAxNXB4O1xuXHRtYXJnaW4tYm90dG9tOiAzMHB4O1xufVxuXG4uc3RhdC1jYXJkIHtcblx0cGFkZGluZzogMjBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDJweCBzb2xpZCAjZDBkN2RlO1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG59XG5cbi5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0Ym9yZGVyLWNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uc3RhdC1jYXJkLnJlZ3Jlc3Npb25zIHtcblx0Ym9yZGVyLWNvbG9yOiAjY2YyMjJlO1xufVxuXG4uc3RhdC1jYXJkLnN0YWJsZSB7XG5cdGJvcmRlci1jb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuc3RhdC1jYXJkIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxuXHQuc3RhdC1jYXJkLmltcHJvdmVtZW50cyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRcdGJvcmRlci1jb2xvcjogI2Y4NTE0OTtcblx0fVxuXHQuc3RhdC1jYXJkLnN0YWJsZSB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjOGI5NDllO1xuXHR9XG59XG5cbi5zdGF0LXZhbHVlIHtcblx0Zm9udC1zaXplOiAzNnB4O1xuXHRmb250LXdlaWdodDogNzAwO1xuXHRtYXJnaW4tYm90dG9tOiA1cHg7XG59XG5cbi5zdGF0LWxhYmVsIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDUwMDtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUge1xuXHR3aWR0aDogMTAwJTtcblx0Ym9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRvdmVyZmxvdzogaGlkZGVuO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0aCxcbi5jb21wYXJpc29uLXRhYmxlIHRkIHtcblx0cGFkZGluZzogMTJweCAxNnB4O1xuXHR0ZXh0LWFsaWduOiBsZWZ0O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0aCxcblx0LmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0aCB7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdGZvbnQtc2l6ZTogMTRweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0aCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0cjpsYXN0LWNoaWxkIHRkIHtcblx0Ym9yZGVyLWJvdHRvbTogbm9uZTtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHIuYmV0dGVyIHtcblx0YmFja2dyb3VuZDogI2RmZjZkZDIwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTkyMDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTYyMDtcblx0fVxuXHQuY29tcGFyaXNvbi10YWJsZSB0ci53b3JzZSB7XG5cdFx0YmFja2dyb3VuZDogIzg2MTgxZDIwO1xuXHR9XG59XG5cbi5jaGFuZ2UtY2VsbCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5jaGFydC1jYXJkIHtcblx0bWFyZ2luLWJvdHRvbTogNDBweDtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRwYWRkaW5nOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jaGFydC1jYXJkIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY2hhcnQtaGVhZGVyIHtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNoYXJ0LWhlYWRlciBoMyB7XG5cdGZvbnQtc2l6ZTogMThweDtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG59XG5cbi5pbmRpY2F0b3Ige1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmluZGljYXRvci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmluZGljYXRvci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTk7XG5cdGNvbG9yOiAjY2YyMjJlO1xufVxuXG4uaW5kaWNhdG9yLm5ldXRyYWwge1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRjb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuaW5kaWNhdG9yLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjtcblx0XHRjb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuaW5kaWNhdG9yLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkO1xuXHRcdGNvbG9yOiAjZmY3YjcyO1xuXHR9XG5cdC5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRjb2xvcjogIzhiOTQ5ZTtcblx0fVxufVxuXG4uY2hhcnQtbWV0YSB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdG1hcmdpbi10b3A6IDVweDtcbn1cblxuLmNoYXJ0LWNvbnRhaW5lciB7XG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0aGVpZ2h0OiA0MDBweDtcbn1cblxuLmV2ZW50cy1zZWN0aW9uIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogNDBweCBhdXRvO1xufVxuXG4uZXZlbnRzLWxpc3Qge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRnYXA6IDEwcHg7XG59XG5cbi5ldmVudC1pdGVtIHtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRwYWRkaW5nOiAxMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA2cHg7XG5cdGJvcmRlci1sZWZ0OiAzcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuZXZlbnQtaXRlbSB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmV2ZW50LW1hcmtlciB7XG5cdHdpZHRoOiAxMnB4O1xuXHRoZWlnaHQ6IDEycHg7XG5cdGJvcmRlci1yYWRpdXM6IDUwJTtcbn1cblxuLmV2ZW50LWljb24ge1xuXHRmb250LXNpemU6IDE4cHg7XG59XG5cbi5ldmVudC10aW1lIHtcblx0Zm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0bWluLXdpZHRoOiA4MHB4O1xufVxuXG4uZXZlbnQtbGFiZWwge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGZsZXg6IDE7XG59XG5cbmZvb3RlciB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDYwcHggYXV0byAyMHB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmctdG9wOiAyMHB4O1xuXHRib3JkZXItdG9wOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG5mb290ZXIgYSB7XG5cdGNvbG9yOiAjMDk2OWRhO1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG59XG5cbmZvb3RlciBhOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Zm9vdGVyIGEge1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA3NjhweCkge1xuXHRib2R5IHtcblx0XHRwYWRkaW5nOiAxMHB4O1xuXHR9XG5cblx0aGVhZGVyIGgxIHtcblx0XHRmb250LXNpemU6IDI0cHg7XG5cdH1cblxuXHQuY2hhcnQtY29udGFpbmVyIHtcblx0XHRoZWlnaHQ6IDMwMHB4O1xuXHR9XG5cblx0LnN0YXRzIHtcblx0XHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCgyLCAxZnIpO1xuXHR9XG59XG5gXG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIEFjdGlvbnMgSm9iIFN1bW1hcnkgZ2VuZXJhdGlvblxuICovXG5cbmltcG9ydCB7IHN1bW1hcnkgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3VtbWFyeURhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGNvbW1pdHM6IHtcblx0XHRjdXJyZW50OiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdFx0YmFzZTogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHR9XG5cdGFydGlmYWN0VXJscz86IE1hcDxzdHJpbmcsIHN0cmluZz5cbn1cblxuLyoqXG4gKiBXcml0ZSBKb2IgU3VtbWFyeSB3aXRoIGFsbCB3b3JrbG9hZHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlSm9iU3VtbWFyeShkYXRhOiBTdW1tYXJ5RGF0YSk6IFByb21pc2U8dm9pZD4ge1xuXHRzdW1tYXJ5LmFkZEhlYWRpbmcoJ/CfjIsgU0xPIFRlc3QgU3VtbWFyeScsIDEpXG5cblx0Ly8gQ29tbWl0cyBpbmZvXG5cdHN1bW1hcnkuYWRkUmF3KGBcbjxwPlxuXHQ8c3Ryb25nPkN1cnJlbnQ6PC9zdHJvbmc+IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5jdXJyZW50LnVybH1cIj4ke2RhdGEuY29tbWl0cy5jdXJyZW50LnNob3J0fTwvYT5cblx0dnNcblx0PHN0cm9uZz5CYXNlOjwvc3Ryb25nPiA8YSBocmVmPVwiJHtkYXRhLmNvbW1pdHMuYmFzZS51cmx9XCI+JHtkYXRhLmNvbW1pdHMuYmFzZS5zaG9ydH08L2E+XG48L3A+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gT3ZlcmFsbCBzdGF0c1xuXHRsZXQgdG90YWxNZXRyaWNzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS50b3RhbCwgMClcblx0bGV0IHRvdGFsUmVncmVzc2lvbnMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnJlZ3Jlc3Npb25zLCAwKVxuXHRsZXQgdG90YWxJbXByb3ZlbWVudHMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LmltcHJvdmVtZW50cywgMClcblx0bGV0IHRvdGFsU3RhYmxlID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5zdGFibGUsIDApXG5cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHRhYmxlPlxuXHQ8dHI+XG5cdFx0PHRkPjxzdHJvbmc+JHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9PC9zdHJvbmc+IHdvcmtsb2FkczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmc+JHt0b3RhbE1ldHJpY3N9PC9zdHJvbmc+IG1ldHJpY3M8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICMxYTdmMzc7XCI+JHt0b3RhbEltcHJvdmVtZW50c308L3N0cm9uZz4gaW1wcm92ZW1lbnRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZyBzdHlsZT1cImNvbG9yOiAjY2YyMjJlO1wiPiR7dG90YWxSZWdyZXNzaW9uc308L3N0cm9uZz4gcmVncmVzc2lvbnM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICM2ZTc3ODE7XCI+JHt0b3RhbFN0YWJsZX08L3N0cm9uZz4gc3RhYmxlPC90ZD5cblx0PC90cj5cbjwvdGFibGU+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gRWFjaCB3b3JrbG9hZFxuXHRmb3IgKGxldCB3b3JrbG9hZCBvZiBkYXRhLndvcmtsb2Fkcykge1xuXHRcdGxldCBzdGF0dXNFbW9qaSA9IHdvcmtsb2FkLnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdFx0bGV0IGFydGlmYWN0VXJsID0gZGF0YS5hcnRpZmFjdFVybHM/LmdldCh3b3JrbG9hZC53b3JrbG9hZClcblxuXHRcdHN1bW1hcnkuYWRkSGVhZGluZyhgJHtzdGF0dXNFbW9qaX0gJHt3b3JrbG9hZC53b3JrbG9hZH1gLCAzKVxuXG5cdFx0aWYgKGFydGlmYWN0VXJsKSB7XG5cdFx0XHRzdW1tYXJ5LmFkZFJhdyhgPHA+PGEgaHJlZj1cIiR7YXJ0aWZhY3RVcmx9XCI+8J+TiiBWaWV3IGRldGFpbGVkIEhUTUwgcmVwb3J0PC9hPjwvcD5gKVxuXHRcdH1cblxuXHRcdC8vIE1ldHJpY3MgdGFibGVcblx0XHRzdW1tYXJ5LmFkZFRhYmxlKFtcblx0XHRcdFtcblx0XHRcdFx0eyBkYXRhOiAnTWV0cmljJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRcdHsgZGF0YTogJ0N1cnJlbnQnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQmFzZScsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdDaGFuZ2UnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdF0sXG5cdFx0XHQuLi53b3JrbG9hZC5tZXRyaWNzLm1hcCgobSkgPT4gW1xuXHRcdFx0XHRtLm5hbWUsXG5cdFx0XHRcdGZvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKSxcblx0XHRcdFx0bS5iYXNlLmF2YWlsYWJsZSA/IGZvcm1hdFZhbHVlKG0uYmFzZS52YWx1ZSwgbS5uYW1lKSA6ICdOL0EnLFxuXHRcdFx0XHRtLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJyxcblx0XHRcdF0pLFxuXHRcdF0pXG5cblx0XHRzdW1tYXJ5LmFkZEJyZWFrKClcblx0fVxuXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuXG4vKipcbiAqIENsZWFyIGV4aXN0aW5nIHN1bW1hcnlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFySm9iU3VtbWFyeSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0c3VtbWFyeS5lbXB0eUJ1ZmZlcigpXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7OztBQU9BLHVEQUNBLDJDQUNBO0FBTEE7QUFDQTs7O0FDMkJPLFNBQVMsaUJBQWlCLENBQUMsU0FBNkI7QUFBQSxFQUM5RCxJQUFJLDBCQUFVLElBQUksS0FDZCxRQUFRLFFBQVEsS0FBSyxFQUFFLE1BQU07QUFBQSxDQUFJO0FBQUEsRUFFckMsU0FBUyxRQUFRLE9BQU87QUFBQSxJQUN2QixJQUFJLENBQUMsS0FBSyxLQUFLO0FBQUEsTUFBRztBQUFBLElBRWxCLElBQUk7QUFBQSxNQUNILElBQUksU0FBUyxLQUFLLE1BQU0sSUFBSTtBQUFBLE1BQzVCLFFBQVEsSUFBSSxPQUFPLE1BQU0sTUFBTTtBQUFBLE1BQzlCLE1BQU07QUFBQSxNQUVQO0FBQUE7QUFBQTtBQUFBLEVBSUYsT0FBTztBQUFBO0FBV0QsU0FBUyxhQUFhLENBQUMs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QTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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QUFBQSxVQUNyRixPQUFPLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDO0FBQUEsUUFDbEM7QUFBQSxNQUNEO0FBQUEsSUFDRCxDQUFDLEdBRUQsa0JBQUsscUJBQXFCLEdBRzFCLGtCQUFLLDhDQUFtQztBQUFBLElBR3hDLElBQUksK0JBQWUsSUFBSSxLQUNuQixrQkFBa0Isc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQixtQkFBbUIsYUFBYTtBQUFBLElBRXBJLFNBQVMsUUFBUTtBQUFBLE1BQ2hCLGFBQWEsSUFBSSxLQUFLLFVBQVUsZUFBZTtBQUFBLElBR2hELElBQUksY0FBYyxvQkFBb0I7QUFBQSxNQUNyQyxXQUFXO0FBQUEsTUFDWDtBQUFBLE1BQ0E7QUFBQSxNQUNBLGVBQWUsc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQjtBQUFBLElBQzlGLENBQUMsR0FFRyxVQUFVLE1BQU0sc0JBQXNCLE9BQU8sdUJBQVEsS0FBSyxPQUFPLHVCQUFRLEtBQUssTUFBTSxVQUFVLFdBQVc7QUFBQSxJQUU3RyxrQkFBSyxlQUFlLFFBQVEsS0FBSyxHQUVqQyxrQkFBSyw2Q0FBNEM7QUFBQSxJQUNoRCxPQUFPLE9BQU87QUFBQSxJQUVmLE1BREEsdUJBQVUsNkJBQTZCLE9BQU8sS0FBSyxHQUFHLEdBQ2hEO0FBQUE7QUFBQTtBQUlSLEtBQUs7IiwKICAiZGVidWdJZCI6ICIzMDBDRDI1NTE3RTgyQTg0NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
