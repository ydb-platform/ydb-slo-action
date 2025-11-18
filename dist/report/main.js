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
function formatEvents(events) {
  return events.map((event) => ({
    timestamp: event.time,
    action: event.Action,
    type: event.Type,
    label: formatEventLabel(event),
    icon: getEventIcon(event.Action, event.Actor.Attributes),
    color: getEventColor(event.Action),
    actor: event.Actor.Attributes.name || event.Actor.ID.substring(0, 12)
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
        events = formatEvents(rawEvents);
      }
      workloads.push({
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

//# debugId=84250AA6ABBEACFD64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9tZXRyaWNzLnRzIiwgIi4uL3JlcG9ydC9saWIvYW5hbHlzaXMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIiwgIi4uL3JlcG9ydC9saWIvY29tbWVudC50cyIsICIuLi9yZXBvcnQvbGliL2h0bWwudHMiLCAiLi4vcmVwb3J0L2xpYi9zdW1tYXJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgIi8qKlxuICogU0xPIFJlcG9ydCBBY3Rpb24gLSBNYWluIE9yY2hlc3RyYXRvclxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBnZXRJbnB1dCwgaW5mbywgc2V0RmFpbGVkLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmltcG9ydCB7IGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MgfSBmcm9tICcuL2xpYi9hbmFseXNpcy5qcydcbmltcG9ydCB7IGRvd25sb2FkV29ya2xvYWRBcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBjcmVhdGVXb3JrbG9hZENoZWNrIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyB3cml0ZUpvYlN1bW1hcnkgfSBmcm9tICcuL2xpYi9zdW1tYXJ5LmpzJ1xuaW1wb3J0IHsgbG9hZFRocmVzaG9sZHMgfSBmcm9tICcuL2xpYi90aHJlc2hvbGRzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHR0cnkge1xuXHRcdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8tcmVwb3J0cycpXG5cdFx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IGdldElucHV0KCd0b2tlbicpXG5cdFx0bGV0IHJ1bklkID0gcGFyc2VJbnQoZ2V0SW5wdXQoJ2dpdGh1Yl9ydW5faWQnKSB8fCBnZXRJbnB1dCgncnVuX2lkJykgfHwgU3RyaW5nKGNvbnRleHQucnVuSWQpKVxuXG5cdFx0aWYgKCF0b2tlbikge1xuXHRcdFx0c2V0RmFpbGVkKCdnaXRodWJfdG9rZW4gaXMgcmVxdWlyZWQnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblx0XHRpbmZvKGBXb3JraW5nIGRpcmVjdG9yeTogJHtjd2R9YClcblxuXHRcdC8vIFN0ZXAgMTogRG93bmxvYWQgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW5cblx0XHQvLyBOT1RFOiBBcnRpZmFjdHMgYWxyZWFkeSBjb250YWluIGJvdGggY3VycmVudCBhbmQgYmFzZSBzZXJpZXMgKGNvbGxlY3RlZCBpbiBpbml0IGFjdGlvbilcblx0XHRpbmZvKCfwn5OmIERvd25sb2FkaW5nIGFydGlmYWN0cyBmcm9tIGN1cnJlbnQgcnVuLi4uJylcblx0XHRsZXQgd29ya2xvYWRzID0gYXdhaXQgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyh7XG5cdFx0XHR0b2tlbixcblx0XHRcdHdvcmtmbG93UnVuSWQ6IHJ1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRkb3dubG9hZFBhdGg6IGN3ZCxcblx0XHR9KVxuXG5cdFx0aWYgKHdvcmtsb2Fkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHdhcm5pbmcoJ05vIHdvcmtsb2FkIGFydGlmYWN0cyBmb3VuZCBpbiBjdXJyZW50IHJ1bicpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRpbmZvKGBGb3VuZCAke3dvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkczogJHt3b3JrbG9hZHMubWFwKCh3KSA9PiB3Lndvcmtsb2FkKS5qb2luKCcsICcpfWApXG5cblx0XHQvLyBTdGVwIDI6IEdldCBQUiBpbmZvcm1hdGlvblxuXHRcdGxldCBwck51bWJlciA9IHdvcmtsb2Fkc1swXT8ucHVsbE51bWJlclxuXHRcdGlmICghcHJOdW1iZXIpIHtcblx0XHRcdHNldEZhaWxlZCgnUHVsbCByZXF1ZXN0IG51bWJlciBub3QgZm91bmQgaW4gYXJ0aWZhY3RzJylcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGluZm8oYFByb2Nlc3NpbmcgUFIgIyR7cHJOdW1iZXJ9YClcblxuXHRcdC8vIEdldCBQUiBkZXRhaWxzIGZvciBjb21taXQgaW5mb1xuXHRcdGxldCB7IGdldE9jdG9raXQgfSA9IGF3YWl0IGltcG9ydCgnQGFjdGlvbnMvZ2l0aHViJylcblx0XHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQodG9rZW4pXG5cblx0XHRpbmZvKCdGZXRjaGluZyBQUiBpbmZvcm1hdGlvbi4uLicpXG5cdFx0bGV0IHsgZGF0YTogcHIgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5wdWxscy5nZXQoe1xuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0cHVsbF9udW1iZXI6IHByTnVtYmVyLFxuXHRcdH0pXG5cblx0XHRpbmZvKGBQUjogJHtwci50aXRsZX1gKVxuXHRcdGluZm8oYEJhc2UgYnJhbmNoOiAke3ByLmJhc2UucmVmfWApXG5cdFx0aW5mbyhgSGVhZCBTSEE6ICR7cHIuaGVhZC5zaGF9YClcblxuXHRcdC8vIFN0ZXAgMzogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb25cblx0XHRpbmZvKCfimpnvuI8gIExvYWRpbmcgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uLi4uJylcblx0XHRsZXQgdGhyZXNob2xkcyA9IGF3YWl0IGxvYWRUaHJlc2hvbGRzKGdldElucHV0KCd0aHJlc2hvbGRzX3lhbWwnKSwgZ2V0SW5wdXQoJ3RocmVzaG9sZHNfeWFtbF9wYXRoJykpXG5cdFx0aW5mbyhgTG9hZGVkIHRocmVzaG9sZHM6IG5ldXRyYWxfY2hhbmdlPSR7dGhyZXNob2xkcy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50fSVgKVxuXG5cdFx0Ly8gU3RlcCA0OiBBbmFseXplIG1ldHJpY3MgKGFscmVhZHkgY29udGFpbiBjdXJyZW50IGFuZCBiYXNlIHNlcmllcyB3aXRoIHJlZiBsYWJlbClcblx0XHRpbmZvKCfwn5OKIEFuYWx5emluZyBtZXRyaWNzLi4uJylcblx0XHRsZXQgY29tcGFyaXNvbnMgPSB3b3JrbG9hZHMubWFwKCh3KSA9PlxuXHRcdFx0Y29tcGFyZVdvcmtsb2FkTWV0cmljcyh3Lndvcmtsb2FkLCB3Lm1ldHJpY3MsICdhdmcnLCB0aHJlc2hvbGRzLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQpXG5cdFx0KVxuXG5cdFx0Ly8gU3RlcCA1OiBHZW5lcmF0ZSBIVE1MIHJlcG9ydHNcblx0XHRpbmZvKCfwn5OdIEdlbmVyYXRpbmcgSFRNTCByZXBvcnRzLi4uJylcblxuXHRcdGxldCBodG1sUmVwb3J0c1BhdGggPSBwYXRoLmpvaW4oY3dkLCAncmVwb3J0cycpXG5cdFx0ZnMubWtkaXJTeW5jKGh0bWxSZXBvcnRzUGF0aCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblxuXHRcdGxldCBodG1sRmlsZXM6IEFycmF5PHsgd29ya2xvYWQ6IHN0cmluZzsgcGF0aDogc3RyaW5nIH0+ID0gW11cblxuXHRcdGZvciAobGV0IGkgPSAwOyBpIDwgd29ya2xvYWRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRsZXQgd29ya2xvYWQgPSB3b3JrbG9hZHNbaV1cblx0XHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyaXNvbnNbaV1cblxuXHRcdFx0bGV0IGh0bWxEYXRhOiBIVE1MUmVwb3J0RGF0YSA9IHtcblx0XHRcdFx0d29ya2xvYWQ6IHdvcmtsb2FkLndvcmtsb2FkLFxuXHRcdFx0XHRjb21wYXJpc29uLFxuXHRcdFx0XHRtZXRyaWNzOiB3b3JrbG9hZC5tZXRyaWNzLFxuXHRcdFx0XHRldmVudHM6IHdvcmtsb2FkLmV2ZW50cyxcblx0XHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRcdGN1cnJlbnQ6IHtcblx0XHRcdFx0XHRcdHNoYTogcHIuaGVhZC5zaGEsXG5cdFx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0XHRzaG9ydDogcHIuaGVhZC5zaGEuc3Vic3RyaW5nKDAsIDcpLFxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdFx0c2hhOiBwci5iYXNlLnNoYSxcblx0XHRcdFx0XHRcdHVybDogYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2NvbnRleHQucmVwby5vd25lcn0vJHtjb250ZXh0LnJlcG8ucmVwb30vY29tbWl0LyR7cHIuYmFzZS5zaGF9YCxcblx0XHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0fSxcblx0XHRcdFx0bWV0YToge1xuXHRcdFx0XHRcdHByTnVtYmVyLFxuXHRcdFx0XHRcdGdlbmVyYXRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG5cdFx0XHRcdH0sXG5cdFx0XHR9XG5cblx0XHRcdGxldCBodG1sID0gZ2VuZXJhdGVIVE1MUmVwb3J0KGh0bWxEYXRhKVxuXHRcdFx0bGV0IGh0bWxQYXRoID0gcGF0aC5qb2luKGh0bWxSZXBvcnRzUGF0aCwgYCR7d29ya2xvYWQud29ya2xvYWR9LXJlcG9ydC5odG1sYClcblxuXHRcdFx0ZnMud3JpdGVGaWxlU3luYyhodG1sUGF0aCwgaHRtbCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0aHRtbEZpbGVzLnB1c2goeyB3b3JrbG9hZDogd29ya2xvYWQud29ya2xvYWQsIHBhdGg6IGh0bWxQYXRoIH0pXG5cblx0XHRcdGluZm8oYEdlbmVyYXRlZCBIVE1MIHJlcG9ydCBmb3IgJHt3b3JrbG9hZC53b3JrbG9hZH1gKVxuXHRcdH1cblxuXHRcdC8vIFN0ZXAgNjogVXBsb2FkIEhUTUwgcmVwb3J0cyBhcyBhcnRpZmFjdHNcblx0XHRpbmZvKCfwn5OkIFVwbG9hZGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdFx0bGV0IGFydGlmYWN0Q2xpZW50ID0gbmV3IERlZmF1bHRBcnRpZmFjdENsaWVudCgpXG5cdFx0bGV0IHVwbG9hZFJlc3VsdCA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LnVwbG9hZEFydGlmYWN0KFxuXHRcdFx0J3Nsby1yZXBvcnRzJyxcblx0XHRcdGh0bWxGaWxlcy5tYXAoKGYpID0+IGYucGF0aCksXG5cdFx0XHRodG1sUmVwb3J0c1BhdGgsXG5cdFx0XHR7XG5cdFx0XHRcdHJldGVudGlvbkRheXM6IDMwLFxuXHRcdFx0fVxuXHRcdClcblxuXHRcdGluZm8oYFVwbG9hZGVkIEhUTUwgcmVwb3J0cyBhcyBhcnRpZmFjdDogJHt1cGxvYWRSZXN1bHQuaWR9YClcblxuXHRcdC8vIFN0ZXAgNzogQ3JlYXRlIEdpdEh1YiBDaGVja3Ncblx0XHRpbmZvKCfinIUgQ3JlYXRpbmcgR2l0SHViIENoZWNrcy4uLicpXG5cblx0XHRsZXQgY2hlY2tVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXG5cdFx0Zm9yIChsZXQgY29tcGFyaXNvbiBvZiBjb21wYXJpc29ucykge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0bGV0IGNoZWNrID0gYXdhaXQgY3JlYXRlV29ya2xvYWRDaGVjayh7XG5cdFx0XHRcdFx0dG9rZW4sXG5cdFx0XHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0XHRzaGE6IHByLmhlYWQuc2hhLFxuXHRcdFx0XHRcdHdvcmtsb2FkOiBjb21wYXJpc29uLFxuXHRcdFx0XHRcdHRocmVzaG9sZHMsXG5cdFx0XHRcdH0pXG5cblx0XHRcdFx0Y2hlY2tVcmxzLnNldChjb21wYXJpc29uLndvcmtsb2FkLCBjaGVjay51cmwpXG5cdFx0XHRcdGluZm8oYENyZWF0ZWQgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7Y2hlY2sudXJsfWApXG5cdFx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gY3JlYXRlIGNoZWNrIGZvciAke2NvbXBhcmlzb24ud29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBTdGVwIDg6IFdyaXRlIEpvYiBTdW1tYXJ5XG5cdFx0aW5mbygn8J+TiyBXcml0aW5nIEpvYiBTdW1tYXJ5Li4uJylcblxuXHRcdGF3YWl0IHdyaXRlSm9iU3VtbWFyeSh7XG5cdFx0XHR3b3JrbG9hZHM6IGNvbXBhcmlzb25zLFxuXHRcdFx0Y29tbWl0czoge1xuXHRcdFx0XHRjdXJyZW50OiB7XG5cdFx0XHRcdFx0c2hhOiBwci5oZWFkLnNoYSxcblx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmhlYWQuc2hhfWAsXG5cdFx0XHRcdFx0c2hvcnQ6IHByLmhlYWQuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0fSxcblx0XHRcdFx0YmFzZToge1xuXHRcdFx0XHRcdHNoYTogcHIuYmFzZS5zaGEsXG5cdFx0XHRcdFx0dXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9jb21taXQvJHtwci5iYXNlLnNoYX1gLFxuXHRcdFx0XHRcdHNob3J0OiBwci5iYXNlLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdH0sXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRpbmZvKCdKb2IgU3VtbWFyeSB3cml0dGVuJylcblxuXHRcdC8vIFN0ZXAgOTogQ3JlYXRlL1VwZGF0ZSBQUiBjb21tZW50XG5cdFx0aW5mbygn8J+SrCBDcmVhdGluZy91cGRhdGluZyBQUiBjb21tZW50Li4uJylcblxuXHRcdC8vIEFydGlmYWN0IFVSTHMgKEdpdEh1YiBVSSBkb3dubG9hZClcblx0XHRsZXQgYXJ0aWZhY3RVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRcdGxldCBhcnRpZmFjdEJhc2VVcmwgPSBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH0vYXJ0aWZhY3RzLyR7dXBsb2FkUmVzdWx0LmlkfWBcblxuXHRcdGZvciAobGV0IGZpbGUgb2YgaHRtbEZpbGVzKSB7XG5cdFx0XHRhcnRpZmFjdFVybHMuc2V0KGZpbGUud29ya2xvYWQsIGFydGlmYWN0QmFzZVVybClcblx0XHR9XG5cblx0XHRsZXQgY29tbWVudEJvZHkgPSBnZW5lcmF0ZUNvbW1lbnRCb2R5KHtcblx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRhcnRpZmFjdFVybHMsXG5cdFx0XHRjaGVja1VybHMsXG5cdFx0XHRqb2JTdW1tYXJ5VXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH1gLFxuXHRcdH0pXG5cblx0XHRsZXQgY29tbWVudCA9IGF3YWl0IGNyZWF0ZU9yVXBkYXRlQ29tbWVudCh0b2tlbiwgY29udGV4dC5yZXBvLm93bmVyLCBjb250ZXh0LnJlcG8ucmVwbywgcHJOdW1iZXIsIGNvbW1lbnRCb2R5KVxuXG5cdFx0aW5mbyhgUFIgY29tbWVudDogJHtjb21tZW50LnVybH1gKVxuXG5cdFx0aW5mbygn4pyFIFJlcG9ydCBnZW5lcmF0aW9uIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkhJylcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRzZXRGYWlsZWQoYFJlcG9ydCBnZW5lcmF0aW9uIGZhaWxlZDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0dGhyb3cgZXJyb3Jcblx0fVxufVxuXG5tYWluKClcbiIsCiAgICAiLyoqXG4gKiBNZXRyaWNzIHBhcnNpbmcgYW5kIHR5cGVzIGZvciByZXBvcnQgYWN0aW9uXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBTZXJpZXMge1xuXHRtZXRyaWM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0dmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10gLy8gW3RpbWVzdGFtcCAoc2VjKSwgdmFsdWUgKGZsb2F0KV1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBJbnN0YW50U2VyaWVzIHtcblx0bWV0cmljOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5cdHZhbHVlOiBbbnVtYmVyLCBzdHJpbmddIC8vIFt0aW1lc3RhbXAgKHNlYyksIHZhbHVlIChmbG9hdCldXG59XG5cbi8qKlxuICogQ29sbGVjdGVkIG1ldHJpYyBmcm9tIGluaXQgYWN0aW9uIChKU09OTCBmb3JtYXQpXG4gKi9cbmV4cG9ydCBpbnRlcmZhY2UgQ29sbGVjdGVkTWV0cmljIHtcblx0bmFtZTogc3RyaW5nXG5cdHF1ZXJ5OiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRkYXRhOiBTZXJpZXNbXSB8IEluc3RhbnRTZXJpZXNbXVxufVxuXG4vKipcbiAqIFBhcnNlZCBtZXRyaWNzIGJ5IG5hbWVcbiAqL1xuZXhwb3J0IHR5cGUgTWV0cmljc01hcCA9IE1hcDxzdHJpbmcsIENvbGxlY3RlZE1ldHJpYz5cblxuLyoqXG4gKiBQYXJzZSBKU09OTCBtZXRyaWNzIGZpbGUgaW50byBNZXRyaWNzTWFwXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZU1ldHJpY3NKc29ubChjb250ZW50OiBzdHJpbmcpOiBNZXRyaWNzTWFwIHtcblx0bGV0IG1ldHJpY3MgPSBuZXcgTWFwPHN0cmluZywgQ29sbGVjdGVkTWV0cmljPigpXG5cdGxldCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKVxuXG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAoIWxpbmUudHJpbSgpKSBjb250aW51ZVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBtZXRyaWMgPSBKU09OLnBhcnNlKGxpbmUpIGFzIENvbGxlY3RlZE1ldHJpY1xuXHRcdFx0bWV0cmljcy5zZXQobWV0cmljLm5hbWUsIG1ldHJpYylcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbWV0cmljc1xufVxuXG4vKipcbiAqIFNlcGFyYXRlIHNlcmllcyBieSByZWYgbGFiZWwgKGN1cnJlbnQgdnMgYmFzZSlcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBTZXBhcmF0ZWRTZXJpZXMge1xuXHRjdXJyZW50OiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxuXHRiYXNlOiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VwYXJhdGVCeVJlZihtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyk6IFNlcGFyYXRlZFNlcmllcyB7XG5cdGxldCBjdXJyZW50OiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbCA9IG51bGxcblx0bGV0IGJhc2U6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXG5cdGlmIChtZXRyaWMudHlwZSA9PT0gJ2luc3RhbnQnKSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBJbnN0YW50U2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09ICdjdXJyZW50JykgfHwgbnVsbFxuXHRcdGJhc2UgPSBkYXRhLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2Jhc2UnKSB8fCBudWxsXG5cdH0gZWxzZSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXVxuXHRcdGN1cnJlbnQgPSBkYXRhLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gJ2N1cnJlbnQnKSB8fCBudWxsXG5cdFx0YmFzZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnYmFzZScpIHx8IG51bGxcblx0fVxuXG5cdHJldHVybiB7IGN1cnJlbnQsIGJhc2UgfVxufVxuXG4vKipcbiAqIEFnZ3JlZ2F0ZSBmdW5jdGlvbiB0eXBlIGZvciByYW5nZSBtZXRyaWNzXG4gKi9cbmV4cG9ydCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uID0gJ2xhc3QnIHwgJ2ZpcnN0JyB8ICdhdmcnIHwgJ21pbicgfCAnbWF4JyB8ICdwNTAnIHwgJ3A5NScgfCAncDk5JyB8ICdzdW0nIHwgJ2NvdW50J1xuXG4vKipcbiAqIENhbGN1bGF0ZSBwZXJjZW50aWxlXG4gKi9cbmZ1bmN0aW9uIHBlcmNlbnRpbGUodmFsdWVzOiBudW1iZXJbXSwgcDogbnVtYmVyKTogbnVtYmVyIHtcblx0bGV0IHNvcnRlZCA9IFsuLi52YWx1ZXNdLnNvcnQoKGEsIGIpID0+IGEgLSBiKVxuXHRsZXQgaW5kZXggPSBNYXRoLmNlaWwoc29ydGVkLmxlbmd0aCAqIHApIC0gMVxuXHRyZXR1cm4gc29ydGVkW01hdGgubWF4KDAsIGluZGV4KV1cbn1cblxuLyoqXG4gKiBBZ2dyZWdhdGUgcmFuZ2UgbWV0cmljIHZhbHVlcyB1c2luZyBzcGVjaWZpZWQgZnVuY3Rpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGFnZ3JlZ2F0ZVZhbHVlcyh2YWx1ZXM6IFtudW1iZXIsIHN0cmluZ11bXSwgZm46IEFnZ3JlZ2F0ZUZ1bmN0aW9uKTogbnVtYmVyIHtcblx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDApIHJldHVybiBOYU5cblxuXHRsZXQgbnVtcyA9IHZhbHVlcy5tYXAoKFtfLCB2XSkgPT4gcGFyc2VGbG9hdCh2KSkuZmlsdGVyKChuKSA9PiAhaXNOYU4obikpXG5cblx0aWYgKG51bXMubGVuZ3RoID09PSAwKSByZXR1cm4gTmFOXG5cblx0c3dpdGNoIChmbikge1xuXHRcdGNhc2UgJ2xhc3QnOlxuXHRcdFx0cmV0dXJuIG51bXNbbnVtcy5sZW5ndGggLSAxXVxuXHRcdGNhc2UgJ2ZpcnN0Jzpcblx0XHRcdHJldHVybiBudW1zWzBdXG5cdFx0Y2FzZSAnYXZnJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApIC8gbnVtcy5sZW5ndGhcblx0XHRjYXNlICdtaW4nOlxuXHRcdFx0cmV0dXJuIE1hdGgubWluKC4uLm51bXMpXG5cdFx0Y2FzZSAnbWF4Jzpcblx0XHRcdHJldHVybiBNYXRoLm1heCguLi5udW1zKVxuXHRcdGNhc2UgJ3A1MCc6XG5cdFx0XHRyZXR1cm4gcGVyY2VudGlsZShudW1zLCAwLjUpXG5cdFx0Y2FzZSAncDk1Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTUpXG5cdFx0Y2FzZSAncDk5Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTkpXG5cdFx0Y2FzZSAnc3VtJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApXG5cdFx0Y2FzZSAnY291bnQnOlxuXHRcdFx0cmV0dXJuIG51bXMubGVuZ3RoXG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiBOYU5cblx0fVxufVxuXG4vKipcbiAqIEdldCBzaW5nbGUgdmFsdWUgZnJvbSBtZXRyaWMgKGluc3RhbnQgb3IgYWdncmVnYXRlZCByYW5nZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldHJpY1ZhbHVlKFxuXHRtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyxcblx0cmVmOiAnY3VycmVudCcgfCAnYmFzZScsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJ1xuKTogbnVtYmVyIHtcblx0bGV0IHNlcGFyYXRlZCA9IHNlcGFyYXRlQnlSZWYobWV0cmljKVxuXHRsZXQgc2VyaWVzID0gcmVmID09PSAnY3VycmVudCcgPyBzZXBhcmF0ZWQuY3VycmVudCA6IHNlcGFyYXRlZC5iYXNlXG5cblx0aWYgKCFzZXJpZXMpIHJldHVybiBOYU5cblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdpbnN0YW50Jykge1xuXHRcdGxldCBpbnN0YW50U2VyaWVzID0gc2VyaWVzIGFzIEluc3RhbnRTZXJpZXNcblx0XHRyZXR1cm4gcGFyc2VGbG9hdChpbnN0YW50U2VyaWVzLnZhbHVlWzFdKVxuXHR9IGVsc2Uge1xuXHRcdGxldCByYW5nZVNlcmllcyA9IHNlcmllcyBhcyBTZXJpZXNcblx0XHRyZXR1cm4gYWdncmVnYXRlVmFsdWVzKHJhbmdlU2VyaWVzLnZhbHVlcywgYWdncmVnYXRlKVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogTWV0cmljcyBhbmFseXNpcyBhbmQgY29tcGFyaXNvblxuICovXG5cbmltcG9ydCB7IGdldE1ldHJpY1ZhbHVlLCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uLCB0eXBlIENvbGxlY3RlZE1ldHJpYywgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0NvbXBhcmlzb24ge1xuXHRuYW1lOiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRjdXJyZW50OiB7XG5cdFx0dmFsdWU6IG51bWJlclxuXHRcdGF2YWlsYWJsZTogYm9vbGVhblxuXHR9XG5cdGJhc2U6IHtcblx0XHR2YWx1ZTogbnVtYmVyXG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdH1cblx0Y2hhbmdlOiB7XG5cdFx0YWJzb2x1dGU6IG51bWJlclxuXHRcdHBlcmNlbnQ6IG51bWJlclxuXHRcdGRpcmVjdGlvbjogJ2JldHRlcicgfCAnd29yc2UnIHwgJ25ldXRyYWwnIHwgJ3Vua25vd24nXG5cdH1cbn1cblxuZXhwb3J0IGludGVyZmFjZSBXb3JrbG9hZENvbXBhcmlzb24ge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdG1ldHJpY3M6IE1ldHJpY0NvbXBhcmlzb25bXVxuXHRzdW1tYXJ5OiB7XG5cdFx0dG90YWw6IG51bWJlclxuXHRcdHJlZ3Jlc3Npb25zOiBudW1iZXJcblx0XHRpbXByb3ZlbWVudHM6IG51bWJlclxuXHRcdHN0YWJsZTogbnVtYmVyXG5cdH1cbn1cblxuLyoqXG4gKiBJbmZlciBtZXRyaWMgZGlyZWN0aW9uIGJhc2VkIG9uIG5hbWVcbiAqL1xuZnVuY3Rpb24gaW5mZXJNZXRyaWNEaXJlY3Rpb24obmFtZTogc3RyaW5nKTogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCcge1xuXHRsZXQgbG93ZXJOYW1lID0gbmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gTG93ZXIgaXMgYmV0dGVyXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkZWxheScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdlcnJvcicpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdmYWlsdXJlJylcblx0KSB7XG5cdFx0cmV0dXJuICdsb3dlcl9pc19iZXR0ZXInXG5cdH1cblxuXHQvLyBIaWdoZXIgaXMgYmV0dGVyXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aHJvdWdocHV0JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3N1Y2Nlc3MnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygncXBzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3JwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdvcHMnKVxuXHQpIHtcblx0XHRyZXR1cm4gJ2hpZ2hlcl9pc19iZXR0ZXInXG5cdH1cblxuXHRyZXR1cm4gJ25ldXRyYWwnXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGNoYW5nZSBkaXJlY3Rpb25cbiAqL1xuZnVuY3Rpb24gZGV0ZXJtaW5lQ2hhbmdlRGlyZWN0aW9uKFxuXHRjdXJyZW50VmFsdWU6IG51bWJlcixcblx0YmFzZVZhbHVlOiBudW1iZXIsXG5cdG1ldHJpY0RpcmVjdGlvbjogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCcsXG5cdG5ldXRyYWxUaHJlc2hvbGQ6IG51bWJlciA9IDUuMFxuKTogJ2JldHRlcicgfCAnd29yc2UnIHwgJ25ldXRyYWwnIHwgJ3Vua25vd24nIHtcblx0aWYgKGlzTmFOKGN1cnJlbnRWYWx1ZSkgfHwgaXNOYU4oYmFzZVZhbHVlKSkge1xuXHRcdHJldHVybiAndW5rbm93bidcblx0fVxuXG5cdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoKChjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWUpIC8gYmFzZVZhbHVlKSAqIDEwMClcblxuXHQvLyBDb25zaWRlciBjaGFuZ2UgYmVsb3cgdGhyZXNob2xkIGFzIHN0YWJsZS9uZXV0cmFsXG5cdGlmIChjaGFuZ2VQZXJjZW50IDwgbmV1dHJhbFRocmVzaG9sZCkge1xuXHRcdHJldHVybiAnbmV1dHJhbCdcblx0fVxuXG5cdGlmIChtZXRyaWNEaXJlY3Rpb24gPT09ICdsb3dlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA8IGJhc2VWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2hpZ2hlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA+IGJhc2VWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0cmV0dXJuICduZXV0cmFsJ1xufVxuXG4vKipcbiAqIENvbXBhcmUgc2luZ2xlIG1ldHJpY1xuICovXG5leHBvcnQgZnVuY3Rpb24gY29tcGFyZU1ldHJpYyhcblx0bWV0cmljOiBDb2xsZWN0ZWRNZXRyaWMsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJyxcblx0bmV1dHJhbFRocmVzaG9sZD86IG51bWJlclxuKTogTWV0cmljQ29tcGFyaXNvbiB7XG5cdGxldCBjdXJyZW50VmFsdWUgPSBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsICdjdXJyZW50JywgYWdncmVnYXRlKVxuXHRsZXQgYmFzZVZhbHVlID0gZ2V0TWV0cmljVmFsdWUobWV0cmljLCAnYmFzZScsIGFnZ3JlZ2F0ZSlcblxuXHRsZXQgYWJzb2x1dGUgPSBjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWVcblx0bGV0IHBlcmNlbnQgPSBpc05hTihiYXNlVmFsdWUpIHx8IGJhc2VWYWx1ZSA9PT0gMCA/IE5hTiA6IChhYnNvbHV0ZSAvIGJhc2VWYWx1ZSkgKiAxMDBcblxuXHRsZXQgbWV0cmljRGlyZWN0aW9uID0gaW5mZXJNZXRyaWNEaXJlY3Rpb24obWV0cmljLm5hbWUpXG5cdGxldCBkaXJlY3Rpb24gPSBkZXRlcm1pbmVDaGFuZ2VEaXJlY3Rpb24oY3VycmVudFZhbHVlLCBiYXNlVmFsdWUsIG1ldHJpY0RpcmVjdGlvbiwgbmV1dHJhbFRocmVzaG9sZClcblxuXHRyZXR1cm4ge1xuXHRcdG5hbWU6IG1ldHJpYy5uYW1lLFxuXHRcdHR5cGU6IG1ldHJpYy50eXBlLFxuXHRcdGN1cnJlbnQ6IHtcblx0XHRcdHZhbHVlOiBjdXJyZW50VmFsdWUsXG5cdFx0XHRhdmFpbGFibGU6ICFpc05hTihjdXJyZW50VmFsdWUpLFxuXHRcdH0sXG5cdFx0YmFzZToge1xuXHRcdFx0dmFsdWU6IGJhc2VWYWx1ZSxcblx0XHRcdGF2YWlsYWJsZTogIWlzTmFOKGJhc2VWYWx1ZSksXG5cdFx0fSxcblx0XHRjaGFuZ2U6IHtcblx0XHRcdGFic29sdXRlLFxuXHRcdFx0cGVyY2VudCxcblx0XHRcdGRpcmVjdGlvbixcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogQ29tcGFyZSBhbGwgbWV0cmljcyBpbiBhIHdvcmtsb2FkXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBjb21wYXJlV29ya2xvYWRNZXRyaWNzKFxuXHR3b3JrbG9hZDogc3RyaW5nLFxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwLFxuXHRhZ2dyZWdhdGU6IEFnZ3JlZ2F0ZUZ1bmN0aW9uID0gJ2F2ZycsXG5cdG5ldXRyYWxUaHJlc2hvbGQ/OiBudW1iZXJcbik6IFdvcmtsb2FkQ29tcGFyaXNvbiB7XG5cdGxldCBjb21wYXJpc29uczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblxuXHRmb3IgKGxldCBbX25hbWUsIG1ldHJpY10gb2YgbWV0cmljcykge1xuXHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyZU1ldHJpYyhtZXRyaWMsIGFnZ3JlZ2F0ZSwgbmV1dHJhbFRocmVzaG9sZClcblx0XHRjb21wYXJpc29ucy5wdXNoKGNvbXBhcmlzb24pXG5cdH1cblxuXHQvLyBDYWxjdWxhdGUgc3VtbWFyeVxuXHRsZXQgcmVncmVzc2lvbnMgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ3dvcnNlJykubGVuZ3RoXG5cdGxldCBpbXByb3ZlbWVudHMgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ2JldHRlcicpLmxlbmd0aFxuXHRsZXQgc3RhYmxlID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICduZXV0cmFsJykubGVuZ3RoXG5cblx0cmV0dXJuIHtcblx0XHR3b3JrbG9hZCxcblx0XHRtZXRyaWNzOiBjb21wYXJpc29ucyxcblx0XHRzdW1tYXJ5OiB7XG5cdFx0XHR0b3RhbDogY29tcGFyaXNvbnMubGVuZ3RoLFxuXHRcdFx0cmVncmVzc2lvbnMsXG5cdFx0XHRpbXByb3ZlbWVudHMsXG5cdFx0XHRzdGFibGUsXG5cdFx0fSxcblx0fVxufVxuXG4vKipcbiAqIEZvcm1hdCB2YWx1ZSB3aXRoIHVuaXQgaW5mZXJlbmNlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRWYWx1ZSh2YWx1ZTogbnVtYmVyLCBtZXRyaWNOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRpZiAoaXNOYU4odmFsdWUpKSByZXR1cm4gJ04vQSdcblxuXHRsZXQgbG93ZXJOYW1lID0gbWV0cmljTmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gTGF0ZW5jeS9kdXJhdGlvbiAobXMpXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fCBsb3dlck5hbWUuaW5jbHVkZXMoJ2R1cmF0aW9uJykgfHwgbG93ZXJOYW1lLmVuZHNXaXRoKCdfbXMnKSkge1xuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDIpfW1zYFxuXHR9XG5cblx0Ly8gVGltZSAoc2Vjb25kcylcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpICYmIGxvd2VyTmFtZS5lbmRzV2l0aCgnX3MnKSkge1xuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDIpfXNgXG5cdH1cblxuXHQvLyBQZXJjZW50YWdlXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygncGVyY2VudCcpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygncmF0ZScpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9JWBcblx0fVxuXG5cdC8vIFRocm91Z2hwdXRcblx0aWYgKFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGhyb3VnaHB1dCcpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdxcHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygncnBzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ29wcycpXG5cdCkge1xuXHRcdGlmICh2YWx1ZSA+PSAxMDAwKSB7XG5cdFx0XHRyZXR1cm4gYCR7KHZhbHVlIC8gMTAwMCkudG9GaXhlZCgyKX1rL3NgXG5cdFx0fVxuXHRcdHJldHVybiBgJHt2YWx1ZS50b0ZpeGVkKDApfS9zYFxuXHR9XG5cblx0Ly8gRGVmYXVsdDogMiBkZWNpbWFsIHBsYWNlc1xuXHRyZXR1cm4gdmFsdWUudG9GaXhlZCgyKVxufVxuXG4vKipcbiAqIEZvcm1hdCBjaGFuZ2UgcGVyY2VudGFnZVxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhbmdlKHBlcmNlbnQ6IG51bWJlciwgZGlyZWN0aW9uOiAnYmV0dGVyJyB8ICd3b3JzZScgfCAnbmV1dHJhbCcgfCAndW5rbm93bicpOiBzdHJpbmcge1xuXHRpZiAoaXNOYU4ocGVyY2VudCkpIHJldHVybiAnTi9BJ1xuXG5cdGxldCBzaWduID0gcGVyY2VudCA+PSAwID8gJysnIDogJydcblx0bGV0IGVtb2ppID0gZGlyZWN0aW9uID09PSAnYmV0dGVyJyA/ICfwn5+iJyA6IGRpcmVjdGlvbiA9PT0gJ3dvcnNlJyA/ICfwn5S0JyA6IGRpcmVjdGlvbiA9PT0gJ25ldXRyYWwnID8gJ+KaqicgOiAn4p2TJ1xuXG5cdHJldHVybiBgJHtzaWdufSR7cGVyY2VudC50b0ZpeGVkKDEpfSUgJHtlbW9qaX1gXG59XG4iLAogICAgIi8qKlxuICogQXJ0aWZhY3RzIGRvd25sb2FkIGFuZCBwYXJzaW5nXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGRlYnVnLCBpbmZvLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBEb2NrZXJFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHsgZm9ybWF0RXZlbnRzLCBwYXJzZUV2ZW50c0pzb25sLCB0eXBlIEZvcm1hdHRlZEV2ZW50IH0gZnJvbSAnLi9ldmVudHMuanMnXG5pbXBvcnQgeyBwYXJzZU1ldHJpY3NKc29ubCwgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtsb2FkQXJ0aWZhY3RzIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRwdWxsTnVtYmVyOiBudW1iZXJcblx0bWV0cmljczogTWV0cmljc01hcFxuXHRldmVudHM6IEZvcm1hdHRlZEV2ZW50W11cblx0bG9nc1BhdGg/OiBzdHJpbmdcbn1cblxuZXhwb3J0IGludGVyZmFjZSBBcnRpZmFjdERvd25sb2FkT3B0aW9ucyB7XG5cdHRva2VuOiBzdHJpbmdcblx0d29ya2Zsb3dSdW5JZDogbnVtYmVyXG5cdHJlcG9zaXRvcnlPd25lcjogc3RyaW5nXG5cdHJlcG9zaXRvcnlOYW1lOiBzdHJpbmdcblx0ZG93bmxvYWRQYXRoOiBzdHJpbmdcbn1cblxuLyoqXG4gKiBEb3dubG9hZCBhbmQgcGFyc2UgYXJ0aWZhY3RzIGZvciBhIHdvcmtmbG93IHJ1blxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyhvcHRpb25zOiBBcnRpZmFjdERvd25sb2FkT3B0aW9ucyk6IFByb21pc2U8V29ya2xvYWRBcnRpZmFjdHNbXT4ge1xuXHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblxuXHRpbmZvKGBMaXN0aW5nIGFydGlmYWN0cyBmb3Igd29ya2Zsb3cgcnVuICR7b3B0aW9ucy53b3JrZmxvd1J1bklkfS4uLmApXG5cblx0bGV0IHsgYXJ0aWZhY3RzIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC5saXN0QXJ0aWZhY3RzKHtcblx0XHRmaW5kQnk6IHtcblx0XHRcdHRva2VuOiBvcHRpb25zLnRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZDogb3B0aW9ucy53b3JrZmxvd1J1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBvcHRpb25zLnJlcG9zaXRvcnlPd25lcixcblx0XHRcdHJlcG9zaXRvcnlOYW1lOiBvcHRpb25zLnJlcG9zaXRvcnlOYW1lLFxuXHRcdH0sXG5cdH0pXG5cblx0aW5mbyhgRm91bmQgJHthcnRpZmFjdHMubGVuZ3RofSBhcnRpZmFjdHNgKVxuXHRkZWJ1Zyhcblx0XHRgQXJ0aWZhY3RzOiAke0pTT04uc3RyaW5naWZ5KFxuXHRcdFx0YXJ0aWZhY3RzLm1hcCgoYSkgPT4gYS5uYW1lKSxcblx0XHRcdG51bGwsXG5cdFx0XHQyXG5cdFx0KX1gXG5cdClcblxuXHQvLyBEb3dubG9hZCBhbGwgYXJ0aWZhY3RzXG5cdGxldCBkb3dubG9hZGVkUGF0aHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0aW5mbyhgRG93bmxvYWRpbmcgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfS4uLmApXG5cblx0XHRsZXQgeyBkb3dubG9hZFBhdGggfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LmRvd25sb2FkQXJ0aWZhY3QoYXJ0aWZhY3QuaWQsIHtcblx0XHRcdHBhdGg6IG9wdGlvbnMuZG93bmxvYWRQYXRoLFxuXHRcdFx0ZmluZEJ5OiB7XG5cdFx0XHRcdHRva2VuOiBvcHRpb25zLnRva2VuLFxuXHRcdFx0XHR3b3JrZmxvd1J1bklkOiBvcHRpb25zLndvcmtmbG93UnVuSWQsXG5cdFx0XHRcdHJlcG9zaXRvcnlPd25lcjogb3B0aW9ucy5yZXBvc2l0b3J5T3duZXIsXG5cdFx0XHRcdHJlcG9zaXRvcnlOYW1lOiBvcHRpb25zLnJlcG9zaXRvcnlOYW1lLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGFydGlmYWN0UGF0aCA9IHBhdGguam9pbihkb3dubG9hZFBhdGggfHwgb3B0aW9ucy5kb3dubG9hZFBhdGgsIGFydGlmYWN0Lm5hbWUpXG5cdFx0ZG93bmxvYWRlZFBhdGhzLnNldChhcnRpZmFjdC5uYW1lLCBhcnRpZmFjdFBhdGgpXG5cblx0XHRpbmZvKGBEb3dubG9hZGVkIGFydGlmYWN0ICR7YXJ0aWZhY3QubmFtZX0gdG8gJHthcnRpZmFjdFBhdGh9YClcblx0fVxuXG5cdC8vIEdyb3VwIGZpbGVzIGJ5IHdvcmtsb2FkXG5cdGxldCB3b3JrbG9hZEZpbGVzID0gbmV3IE1hcDxcblx0XHRzdHJpbmcsXG5cdFx0e1xuXHRcdFx0cHVsbD86IHN0cmluZ1xuXHRcdFx0bWV0cmljcz86IHN0cmluZ1xuXHRcdFx0ZXZlbnRzPzogc3RyaW5nXG5cdFx0XHRsb2dzPzogc3RyaW5nXG5cdFx0fVxuXHQ+KClcblxuXHRmb3IgKGxldCBbYXJ0aWZhY3ROYW1lLCBhcnRpZmFjdFBhdGhdIG9mIGRvd25sb2FkZWRQYXRocykge1xuXHRcdC8vIEFydGlmYWN0IG5hbWUgaXMgdGhlIHdvcmtsb2FkIG5hbWUsIGZpbGVzIGluc2lkZSBoYXZlIHdvcmtsb2FkIHByZWZpeFxuXHRcdGxldCB3b3JrbG9hZCA9IGFydGlmYWN0TmFtZVxuXG5cdFx0Ly8gTGlzdCBmaWxlcyBpbiBhcnRpZmFjdCBkaXJlY3Rvcnlcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoYXJ0aWZhY3RQYXRoKSkge1xuXHRcdFx0d2FybmluZyhgQXJ0aWZhY3QgcGF0aCBkb2VzIG5vdCBleGlzdDogJHthcnRpZmFjdFBhdGh9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0bGV0IHN0YXQgPSBmcy5zdGF0U3luYyhhcnRpZmFjdFBhdGgpXG5cdFx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG5cdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGFydGlmYWN0UGF0aCkubWFwKChmKSA9PiBwYXRoLmpvaW4oYXJ0aWZhY3RQYXRoLCBmKSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmlsZXMgPSBbYXJ0aWZhY3RQYXRoXVxuXHRcdH1cblxuXHRcdGxldCBncm91cCA9IHdvcmtsb2FkRmlsZXMuZ2V0KHdvcmtsb2FkKSB8fCB7fVxuXG5cdFx0Zm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0bGV0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKVxuXG5cdFx0XHRpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1wdWxsLnR4dCcpKSB7XG5cdFx0XHRcdGdyb3VwLnB1bGwgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbWV0cmljcy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLm1ldHJpY3MgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctZXZlbnRzLmpzb25sJykpIHtcblx0XHRcdFx0Z3JvdXAuZXZlbnRzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWxvZ3MudHh0JykpIHtcblx0XHRcdFx0Z3JvdXAubG9ncyA9IGZpbGVcblx0XHRcdH1cblx0XHR9XG5cblx0XHR3b3JrbG9hZEZpbGVzLnNldCh3b3JrbG9hZCwgZ3JvdXApXG5cdH1cblxuXHQvLyBQYXJzZSB3b3JrbG9hZCBkYXRhXG5cdGxldCB3b3JrbG9hZHM6IFdvcmtsb2FkQXJ0aWZhY3RzW10gPSBbXVxuXG5cdGZvciAobGV0IFt3b3JrbG9hZCwgZmlsZXNdIG9mIHdvcmtsb2FkRmlsZXMpIHtcblx0XHRpZiAoIWZpbGVzLnB1bGwgfHwgIWZpbGVzLm1ldHJpY3MpIHtcblx0XHRcdHdhcm5pbmcoYFNraXBwaW5nIGluY29tcGxldGUgd29ya2xvYWQgJHt3b3JrbG9hZH06IG1pc3NpbmcgcmVxdWlyZWQgZmlsZXNgKVxuXHRcdFx0Y29udGludWVcblx0XHR9XG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IHB1bGxOdW1iZXIgPSBwYXJzZUludChmcy5yZWFkRmlsZVN5bmMoZmlsZXMucHVsbCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KS50cmltKCkpXG5cdFx0XHRsZXQgbWV0cmljc0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZXMubWV0cmljcywgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0bGV0IG1ldHJpY3MgPSBwYXJzZU1ldHJpY3NKc29ubChtZXRyaWNzQ29udGVudClcblxuXHRcdFx0bGV0IGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSA9IFtdXG5cdFx0XHRpZiAoZmlsZXMuZXZlbnRzICYmIGZzLmV4aXN0c1N5bmMoZmlsZXMuZXZlbnRzKSkge1xuXHRcdFx0XHRsZXQgZXZlbnRzQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlcy5ldmVudHMsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRcdFx0bGV0IHJhd0V2ZW50cyA9IHBhcnNlRXZlbnRzSnNvbmwoZXZlbnRzQ29udGVudClcblx0XHRcdFx0ZXZlbnRzID0gZm9ybWF0RXZlbnRzKHJhd0V2ZW50cylcblx0XHRcdH1cblxuXHRcdFx0d29ya2xvYWRzLnB1c2goe1xuXHRcdFx0XHR3b3JrbG9hZCxcblx0XHRcdFx0cHVsbE51bWJlcixcblx0XHRcdFx0bWV0cmljcyxcblx0XHRcdFx0ZXZlbnRzLFxuXHRcdFx0XHRsb2dzUGF0aDogZmlsZXMubG9ncyxcblx0XHRcdH0pXG5cblx0XHRcdGluZm8oYFBhcnNlZCB3b3JrbG9hZCAke3dvcmtsb2FkfTogJHttZXRyaWNzLnNpemV9IG1ldHJpY3MsICR7ZXZlbnRzLmxlbmd0aH0gZXZlbnRzYClcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0d2FybmluZyhgRmFpbGVkIHRvIHBhcnNlIHdvcmtsb2FkICR7d29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHdvcmtsb2Fkc1xufVxuIiwKICAgICIvKipcbiAqIERvY2tlciBldmVudHMgcGFyc2luZyBhbmQgZm9ybWF0dGluZ1xuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgRG9ja2VyRXZlbnQge1xuXHR0aW1lOiBudW1iZXJcblx0QWN0aW9uOiBzdHJpbmdcblx0VHlwZTogc3RyaW5nXG5cdEFjdG9yOiB7XG5cdFx0SUQ6IHN0cmluZ1xuXHRcdEF0dHJpYnV0ZXM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0fVxuXHRba2V5OiBzdHJpbmddOiB1bmtub3duXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ybWF0dGVkRXZlbnQge1xuXHR0aW1lc3RhbXA6IG51bWJlclxuXHRhY3Rpb246IHN0cmluZ1xuXHR0eXBlOiBzdHJpbmdcblx0bGFiZWw6IHN0cmluZ1xuXHRpY29uOiBzdHJpbmdcblx0Y29sb3I6IHN0cmluZ1xuXHRhY3Rvcjogc3RyaW5nXG59XG5cbi8qKlxuICogUGFyc2UgZXZlbnRzIEpTT05MIGZpbGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlRXZlbnRzSnNvbmwoY29udGVudDogc3RyaW5nKTogRG9ja2VyRXZlbnRbXSB7XG5cdGxldCBldmVudHM6IERvY2tlckV2ZW50W10gPSBbXVxuXHRsZXQgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJylcblxuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWVcblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgZXZlbnQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIERvY2tlckV2ZW50XG5cdFx0XHRldmVudHMucHVzaChldmVudClcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZXZlbnRzXG59XG5cbi8qKlxuICogR2V0IGljb24gZm9yIGV2ZW50IGFjdGlvblxuICovXG5mdW5jdGlvbiBnZXRFdmVudEljb24oYWN0aW9uOiBzdHJpbmcsIGF0dHJpYnV0ZXM/OiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+KTogc3RyaW5nIHtcblx0bGV0IGljb25zOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+ID0ge1xuXHRcdHBhdXNlOiAn4o+477iPJyxcblx0XHR1bnBhdXNlOiAn4pa277iPJyxcblx0XHRzdG9wOiAn4o+577iPJyxcblx0XHRzdGFydDogJ+KWtu+4jycsXG5cdFx0cmVzdGFydDogJ/CflIQnLFxuXHRcdGRpZTogJ/CfkqQnLFxuXHRcdGNyZWF0ZTogJ/CfhpUnLFxuXHRcdGRlc3Ryb3k6ICfwn5eR77iPJyxcblx0fVxuXG5cdGlmIChhY3Rpb24gPT09ICdraWxsJykge1xuXHRcdHJldHVybiBhdHRyaWJ1dGVzPy5zaWduYWwgPT09ICdTSUdLSUxMJyA/ICfwn5KAJyA6ICfimqEnXG5cdH1cblxuXHRyZXR1cm4gaWNvbnNbYWN0aW9uXSB8fCAn8J+TjCdcbn1cblxuLyoqXG4gKiBHZXQgY29sb3IgZm9yIGV2ZW50IGFjdGlvblxuICovXG5mdW5jdGlvbiBnZXRFdmVudENvbG9yKGFjdGlvbjogc3RyaW5nKTogc3RyaW5nIHtcblx0bGV0IGNvbG9yczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcblx0XHRwYXVzZTogJyNmNTllMGInLCAvLyBvcmFuZ2Vcblx0XHR1bnBhdXNlOiAnIzEwYjk4MScsIC8vIGdyZWVuXG5cdFx0c3RvcDogJyNlZjQ0NDQnLCAvLyByZWRcblx0XHRzdGFydDogJyMxMGI5ODEnLCAvLyBncmVlblxuXHRcdGtpbGw6ICcjZGMyNjI2JywgLy8gZGFyayByZWRcblx0XHRyZXN0YXJ0OiAnI2Y1OWUwYicsIC8vIG9yYW5nZVxuXHRcdGRpZTogJyM2YjcyODAnLCAvLyBncmF5XG5cdFx0Y3JlYXRlOiAnIzNiODJmNicsIC8vIGJsdWVcblx0XHRkZXN0cm95OiAnI2VmNDQ0NCcsIC8vIHJlZFxuXHR9XG5cblx0cmV0dXJuIGNvbG9yc1thY3Rpb25dIHx8ICcjNmI3MjgwJ1xufVxuXG4vKipcbiAqIEZvcm1hdCBldmVudCBsYWJlbFxuICovXG5mdW5jdGlvbiBmb3JtYXRFdmVudExhYmVsKGV2ZW50OiBEb2NrZXJFdmVudCk6IHN0cmluZyB7XG5cdC8vIFRyeSB0byBnZXQgZnJpZW5kbHkgbmFtZSBmcm9tIGNvbXBvc2UgbGFiZWxzXG5cdGxldCBuYW1lID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5uYW1lIHx8IGV2ZW50LkFjdG9yLklELnN1YnN0cmluZygwLCAxMilcblx0bGV0IG5vZGVUeXBlID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlc1sneWRiLm5vZGUudHlwZSddXG5cdGxldCBzZXJ2aWNlID0gZXZlbnQuQWN0b3IuQXR0cmlidXRlc1snY29tLmRvY2tlci5jb21wb3NlLnNlcnZpY2UnXVxuXG5cdC8vIFVzZSBZREIgbm9kZSB0eXBlIGlmIGF2YWlsYWJsZSAoZS5nLiwgXCJkYXRhYmFzZVwiLCBcInN0b3JhZ2VcIilcblx0bGV0IGRpc3BsYXlOYW1lID0gbmFtZVxuXHRpZiAobm9kZVR5cGUpIHtcblx0XHRkaXNwbGF5TmFtZSA9IGAke25vZGVUeXBlfSAoJHtuYW1lfSlgXG5cdH0gZWxzZSBpZiAoc2VydmljZSkge1xuXHRcdGRpc3BsYXlOYW1lID0gc2VydmljZVxuXHR9XG5cblx0bGV0IGFjdGlvbiA9IGV2ZW50LkFjdGlvblxuXG5cdGlmIChhY3Rpb24gPT09ICdraWxsJyAmJiBldmVudC5BY3Rvci5BdHRyaWJ1dGVzLnNpZ25hbCkge1xuXHRcdHJldHVybiBgJHthY3Rpb259ICR7ZGlzcGxheU5hbWV9ICgke2V2ZW50LkFjdG9yLkF0dHJpYnV0ZXMuc2lnbmFsfSlgXG5cdH1cblxuXHRyZXR1cm4gYCR7YWN0aW9ufSAke2Rpc3BsYXlOYW1lfWBcbn1cblxuLyoqXG4gKiBGb3JtYXQgZXZlbnRzIGZvciB2aXN1YWxpemF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRFdmVudHMoZXZlbnRzOiBEb2NrZXJFdmVudFtdKTogRm9ybWF0dGVkRXZlbnRbXSB7XG5cdHJldHVybiBldmVudHMubWFwKChldmVudCkgPT4gKHtcblx0XHR0aW1lc3RhbXA6IGV2ZW50LnRpbWUsXG5cdFx0YWN0aW9uOiBldmVudC5BY3Rpb24sXG5cdFx0dHlwZTogZXZlbnQuVHlwZSxcblx0XHRsYWJlbDogZm9ybWF0RXZlbnRMYWJlbChldmVudCksXG5cdFx0aWNvbjogZ2V0RXZlbnRJY29uKGV2ZW50LkFjdGlvbiwgZXZlbnQuQWN0b3IuQXR0cmlidXRlcyksXG5cdFx0Y29sb3I6IGdldEV2ZW50Q29sb3IoZXZlbnQuQWN0aW9uKSxcblx0XHRhY3RvcjogZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5uYW1lIHx8IGV2ZW50LkFjdG9yLklELnN1YnN0cmluZygwLCAxMiksXG5cdH0pKVxufVxuIiwKICAgICIvKipcbiAqIEdpdEh1YiBDaGVja3MgQVBJIGludGVncmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcywgdHlwZSBUaHJlc2hvbGRDb25maWcgfSBmcm9tICcuL3RocmVzaG9sZHMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hlY2tPcHRpb25zIHtcblx0dG9rZW46IHN0cmluZ1xuXHRvd25lcjogc3RyaW5nXG5cdHJlcG86IHN0cmluZ1xuXHRzaGE6IHN0cmluZ1xuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uXG5cdHRocmVzaG9sZHM6IFRocmVzaG9sZENvbmZpZ1xuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBDcmVhdGUgR2l0SHViIENoZWNrIGZvciB3b3JrbG9hZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya2xvYWRDaGVjayhvcHRpb25zOiBDaGVja09wdGlvbnMpOiBQcm9taXNlPHsgaWQ6IG51bWJlcjsgdXJsOiBzdHJpbmcgfT4ge1xuXHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQob3B0aW9ucy50b2tlbilcblxuXHRsZXQgbmFtZSA9IGBTTE86ICR7b3B0aW9ucy53b3JrbG9hZC53b3JrbG9hZH1gXG5cdGxldCBldmFsdWF0aW9uID0gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMob3B0aW9ucy53b3JrbG9hZC5tZXRyaWNzLCBvcHRpb25zLnRocmVzaG9sZHMpXG5cdGxldCBjb25jbHVzaW9uID0gZGV0ZXJtaW5lQ29uY2x1c2lvbkZyb21FdmFsdWF0aW9uKGV2YWx1YXRpb24ub3ZlcmFsbClcblx0bGV0IHRpdGxlID0gZ2VuZXJhdGVUaXRsZShvcHRpb25zLndvcmtsb2FkLCBldmFsdWF0aW9uKVxuXHRsZXQgc3VtbWFyeVRleHQgPSBnZW5lcmF0ZVN1bW1hcnkob3B0aW9ucy53b3JrbG9hZCwgZXZhbHVhdGlvbiwgb3B0aW9ucy5yZXBvcnRVcmwpXG5cblx0aW5mbyhgQ3JlYXRpbmcgY2hlY2sgXCIke25hbWV9XCIgd2l0aCBjb25jbHVzaW9uOiAke2NvbmNsdXNpb259YClcblxuXHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuY2hlY2tzLmNyZWF0ZSh7XG5cdFx0b3duZXI6IG9wdGlvbnMub3duZXIsXG5cdFx0cmVwbzogb3B0aW9ucy5yZXBvLFxuXHRcdG5hbWUsXG5cdFx0aGVhZF9zaGE6IG9wdGlvbnMuc2hhLFxuXHRcdHN0YXR1czogJ2NvbXBsZXRlZCcsXG5cdFx0Y29uY2x1c2lvbixcblx0XHRvdXRwdXQ6IHtcblx0XHRcdHRpdGxlLFxuXHRcdFx0c3VtbWFyeTogc3VtbWFyeVRleHQsXG5cdFx0fSxcblx0fSlcblxuXHRpbmZvKGBDaGVjayBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRyZXR1cm4geyBpZDogZGF0YS5pZCwgdXJsOiBkYXRhLmh0bWxfdXJsISB9XG59XG5cbi8qKlxuICogTWFwIHRocmVzaG9sZCBzZXZlcml0eSB0byBHaXRIdWIgQ2hlY2sgY29uY2x1c2lvblxuICovXG5mdW5jdGlvbiBkZXRlcm1pbmVDb25jbHVzaW9uRnJvbUV2YWx1YXRpb24oXG5cdHNldmVyaXR5OiAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZmFpbHVyZSdcbik6ICdzdWNjZXNzJyB8ICduZXV0cmFsJyB8ICdmYWlsdXJlJyB7XG5cdGlmIChzZXZlcml0eSA9PT0gJ2ZhaWx1cmUnKSByZXR1cm4gJ2ZhaWx1cmUnXG5cdGlmIChzZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSByZXR1cm4gJ25ldXRyYWwnXG5cdHJldHVybiAnc3VjY2Vzcydcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBjaGVjayB0aXRsZVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVRpdGxlKFxuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uLFxuXHRldmFsdWF0aW9uOiB7IG92ZXJhbGw6IHN0cmluZzsgZmFpbHVyZXM6IGFueVtdOyB3YXJuaW5nczogYW55W10gfVxuKTogc3RyaW5nIHtcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH0gY3JpdGljYWwgdGhyZXNob2xkKHMpIHZpb2xhdGVkYFxuXHR9XG5cblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyB0aHJlc2hvbGQocykgZXhjZWVkZWRgXG5cdH1cblxuXHRpZiAod29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHMgPiAwKSB7XG5cdFx0cmV0dXJuIGAke3dvcmtsb2FkLnN1bW1hcnkuaW1wcm92ZW1lbnRzfSBpbXByb3ZlbWVudChzKSBkZXRlY3RlZGBcblx0fVxuXG5cdHJldHVybiAnQWxsIG1ldHJpY3Mgd2l0aGluIHRocmVzaG9sZHMnXG59XG5cbi8qKlxuICogR2VuZXJhdGUgY2hlY2sgc3VtbWFyeVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVN1bW1hcnkoXG5cdHdvcmtsb2FkOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdGV2YWx1YXRpb246IHsgb3ZlcmFsbDogc3RyaW5nOyBmYWlsdXJlczogYW55W107IHdhcm5pbmdzOiBhbnlbXSB9LFxuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBsaW5lcyA9IFtcblx0XHRgKipNZXRyaWNzIGFuYWx5emVkOioqICR7d29ya2xvYWQuc3VtbWFyeS50b3RhbH1gLFxuXHRcdGAtIPCflLQgQ3JpdGljYWw6ICR7ZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGh9YCxcblx0XHRgLSDwn5+hIFdhcm5pbmdzOiAke2V2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RofWAsXG5cdFx0YC0g8J+foiBJbXByb3ZlbWVudHM6ICR7d29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHN9YCxcblx0XHRgLSDimqogU3RhYmxlOiAke3dvcmtsb2FkLnN1bW1hcnkuc3RhYmxlfWAsXG5cdFx0JycsXG5cdF1cblxuXHRpZiAocmVwb3J0VXJsKSB7XG5cdFx0bGluZXMucHVzaChg8J+TiiBbVmlldyBkZXRhaWxlZCBIVE1MIHJlcG9ydF0oJHtyZXBvcnRVcmx9KWAsICcnKVxuXHR9XG5cblx0Ly8gQ3JpdGljYWwgZmFpbHVyZXNcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDinYwgQ3JpdGljYWwgVGhyZXNob2xkcyBWaW9sYXRlZCcsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGV2YWx1YXRpb24uZmFpbHVyZXMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gV2FybmluZ3Ncblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDimqDvuI8gV2FybmluZyBUaHJlc2hvbGRzIEV4Y2VlZGVkJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgZXZhbHVhdGlvbi53YXJuaW5ncy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdGxpbmVzLnB1c2goJycpXG5cdH1cblxuXHQvLyBUb3AgaW1wcm92ZW1lbnRzXG5cdGxldCBpbXByb3ZlbWVudHMgPSB3b3JrbG9hZC5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS5jaGFuZ2UuZGlyZWN0aW9uID09PSAnYmV0dGVyJylcblx0XHQuc29ydCgoYSwgYikgPT4gTWF0aC5hYnMoYi5jaGFuZ2UucGVyY2VudCkgLSBNYXRoLmFicyhhLmNoYW5nZS5wZXJjZW50KSlcblxuXHRpZiAoaW1wcm92ZW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg8J+foiBUb3AgSW1wcm92ZW1lbnRzJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgaW1wcm92ZW1lbnRzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSlgXG5cdFx0XHQpXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG59XG4iLAogICAgIi8qKlxuICogVGhyZXNob2xkcyBjb25maWd1cmF0aW9uIGFuZCBldmFsdWF0aW9uXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xuXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBNZXRyaWNDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBNZXRyaWNUaHJlc2hvbGQge1xuXHRuYW1lPzogc3RyaW5nIC8vIEV4YWN0IG1ldHJpYyBuYW1lIChoaWdoZXIgcHJpb3JpdHkgdGhhbiBwYXR0ZXJuKVxuXHRwYXR0ZXJuPzogc3RyaW5nIC8vIEdsb2IgcGF0dGVybiAobG93ZXIgcHJpb3JpdHkpXG5cdGRpcmVjdGlvbj86ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnXG5cdHdhcm5pbmdfbWluPzogbnVtYmVyXG5cdGNyaXRpY2FsX21pbj86IG51bWJlclxuXHR3YXJuaW5nX21heD86IG51bWJlclxuXHRjcml0aWNhbF9tYXg/OiBudW1iZXJcblx0d2FybmluZ19jaGFuZ2VfcGVyY2VudD86IG51bWJlclxuXHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudD86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVzaG9sZENvbmZpZyB7XG5cdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRkZWZhdWx0OiB7XG5cdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHR9XG5cdG1ldHJpY3M/OiBNZXRyaWNUaHJlc2hvbGRbXVxufVxuXG5leHBvcnQgdHlwZSBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJyB8ICd3YXJuaW5nJyB8ICdmYWlsdXJlJ1xuXG4vKipcbiAqIFBhcnNlIFlBTUwgdGhyZXNob2xkcyBjb25maWdcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGFyc2VUaHJlc2hvbGRzWWFtbCh5YW1sQ29udGVudDogc3RyaW5nKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWcgfCBudWxsPiB7XG5cdGlmICgheWFtbENvbnRlbnQgfHwgeWFtbENvbnRlbnQudHJpbSgpID09PSAnJykge1xuXHRcdHJldHVybiBudWxsXG5cdH1cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoJ3lxJywgWyctbz1qc29uJywgJy4nXSwge1xuXHRcdFx0aW5wdXQ6IEJ1ZmZlci5mcm9tKHlhbWxDb250ZW50LCAndXRmLTgnKSxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGpzb24gPSBjaHVua3Muam9pbignJylcblx0XHRsZXQgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uKSBhcyBUaHJlc2hvbGRDb25maWdcblxuXHRcdHJldHVybiBwYXJzZWRcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2UgdGhyZXNob2xkcyBZQU1MOiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG5cbi8qKlxuICogTWVyZ2UgdHdvIHRocmVzaG9sZCBjb25maWdzIChjdXN0b20gZXh0ZW5kcy9vdmVycmlkZXMgZGVmYXVsdClcbiAqL1xuZnVuY3Rpb24gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGRlZmF1bHRDb25maWc6IFRocmVzaG9sZENvbmZpZywgY3VzdG9tQ29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBUaHJlc2hvbGRDb25maWcge1xuXHRyZXR1cm4ge1xuXHRcdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IGN1c3RvbUNvbmZpZy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcubmV1dHJhbF9jaGFuZ2VfcGVyY2VudCxcblx0XHRkZWZhdWx0OiB7XG5cdFx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OlxuXHRcdFx0XHRjdXN0b21Db25maWcuZGVmYXVsdD8ud2FybmluZ19jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudCxcblx0XHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OlxuXHRcdFx0XHRjdXN0b21Db25maWcuZGVmYXVsdD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5kZWZhdWx0LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50LFxuXHRcdH0sXG5cdFx0bWV0cmljczogWy4uLihjdXN0b21Db25maWcubWV0cmljcyB8fCBbXSksIC4uLihkZWZhdWx0Q29uZmlnLm1ldHJpY3MgfHwgW10pXSxcblx0XHQvLyBDdXN0b20gbWV0cmljcyBjb21lIGZpcnN0LCBzbyB0aGV5IGhhdmUgaGlnaGVyIHByaW9yaXR5IGluIGZpbmRNYXRjaGluZ1RocmVzaG9sZCgpXG5cdH1cbn1cblxuLyoqXG4gKiBMb2FkIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbG9hZERlZmF1bHRUaHJlc2hvbGRzKCk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdGRlYnVnKCdMb2FkaW5nIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWwnKVxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uLy4uLycpXG5cdGxldCBkZWZhdWx0UGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JywgJ3RocmVzaG9sZHMueWFtbCcpXG5cblx0aWYgKGZzLmV4aXN0c1N5bmMoZGVmYXVsdFBhdGgpKSB7XG5cdFx0bGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZGVmYXVsdFBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjb25maWcpIHJldHVybiBjb25maWdcblx0fVxuXG5cdC8vIEZhbGxiYWNrIHRvIGhhcmRjb2RlZCBkZWZhdWx0c1xuXHR3YXJuaW5nKCdDb3VsZCBub3QgbG9hZCBkZWZhdWx0IHRocmVzaG9sZHMsIHVzaW5nIGhhcmRjb2RlZCBkZWZhdWx0cycpXG5cdHJldHVybiB7XG5cdFx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogNS4wLFxuXHRcdGRlZmF1bHQ6IHtcblx0XHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IDIwLjAsXG5cdFx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDogNTAuMCxcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gd2l0aCBtZXJnaW5nOlxuICogMS4gTG9hZCBkZWZhdWx0IGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbFxuICogMi4gTWVyZ2Ugd2l0aCBjdXN0b20gWUFNTCAoaW5saW5lKSBpZiBwcm92aWRlZFxuICogMy4gTWVyZ2Ugd2l0aCBjdXN0b20gZmlsZSBpZiBwcm92aWRlZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRocmVzaG9sZHMoY3VzdG9tWWFtbD86IHN0cmluZywgY3VzdG9tUGF0aD86IHN0cmluZyk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdC8vIEFsd2F5cyBsb2FkIGRlZmF1bHRzIGZpcnN0XG5cdGxldCBjb25maWcgPSBhd2FpdCBsb2FkRGVmYXVsdFRocmVzaG9sZHMoKVxuXG5cdC8vIE1lcmdlIHdpdGggY3VzdG9tIFlBTUwgKGlubGluZSlcblx0aWYgKGN1c3RvbVlhbWwpIHtcblx0XHRkZWJ1ZygnTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGlubGluZSBZQU1MJylcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjdXN0b21ZYW1sKVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHQvLyBNZXJnZSB3aXRoIGN1c3RvbSBmaWxlXG5cdGlmIChjdXN0b21QYXRoICYmIGZzLmV4aXN0c1N5bmMoY3VzdG9tUGF0aCkpIHtcblx0XHRkZWJ1ZyhgTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGZpbGU6ICR7Y3VzdG9tUGF0aH1gKVxuXHRcdGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGN1c3RvbVBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gY29uZmlnXG59XG5cbi8qKlxuICogTWF0Y2ggbWV0cmljIG5hbWUgYWdhaW5zdCBwYXR0ZXJuIChzdXBwb3J0cyB3aWxkY2FyZHMpXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybihtZXRyaWNOYW1lOiBzdHJpbmcsIHBhdHRlcm46IHN0cmluZyk6IGJvb2xlYW4ge1xuXHQvLyBDb252ZXJ0IGdsb2IgcGF0dGVybiB0byByZWdleFxuXHRsZXQgcmVnZXhQYXR0ZXJuID0gcGF0dGVyblxuXHRcdC5yZXBsYWNlKC9cXCovZywgJy4qJykgLy8gKiAtPiAuKlxuXHRcdC5yZXBsYWNlKC9cXD8vZywgJy4nKSAvLyA/IC0+IC5cblxuXHRsZXQgcmVnZXggPSBuZXcgUmVnRXhwKGBeJHtyZWdleFBhdHRlcm59JGAsICdpJylcblx0cmV0dXJuIHJlZ2V4LnRlc3QobWV0cmljTmFtZSlcbn1cblxuLyoqXG4gKiBGaW5kIG1hdGNoaW5nIHRocmVzaG9sZCBmb3IgbWV0cmljIChleGFjdCBtYXRjaCBmaXJzdCwgdGhlbiBwYXR0ZXJuKVxuICovXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQobWV0cmljTmFtZTogc3RyaW5nLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IE1ldHJpY1RocmVzaG9sZCB8IG51bGwge1xuXHRpZiAoIWNvbmZpZy5tZXRyaWNzKSByZXR1cm4gbnVsbFxuXG5cdC8vIEZpcnN0IHBhc3M6IGV4YWN0IG1hdGNoIChoaWdoZXN0IHByaW9yaXR5KVxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLm5hbWUgJiYgdGhyZXNob2xkLm5hbWUgPT09IG1ldHJpY05hbWUpIHtcblx0XHRcdHJldHVybiB0aHJlc2hvbGRcblx0XHR9XG5cdH1cblxuXHQvLyBTZWNvbmQgcGFzczogcGF0dGVybiBtYXRjaFxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLnBhdHRlcm4gJiYgbWF0Y2hQYXR0ZXJuKG1ldHJpY05hbWUsIHRocmVzaG9sZC5wYXR0ZXJuKSkge1xuXHRcdFx0cmV0dXJuIHRocmVzaG9sZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogRXZhbHVhdGUgdGhyZXNob2xkIGZvciBhIG1ldHJpYyBjb21wYXJpc29uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uOiBNZXRyaWNDb21wYXJpc29uLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IFRocmVzaG9sZFNldmVyaXR5IHtcblx0Ly8gQ2FuJ3QgZXZhbHVhdGUgd2l0aG91dCBiYXNlXG5cdGlmICghY29tcGFyaXNvbi5iYXNlLmF2YWlsYWJsZSkge1xuXHRcdHJldHVybiAnc3VjY2Vzcydcblx0fVxuXG5cdGxldCB0aHJlc2hvbGQgPSBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQoY29tcGFyaXNvbi5uYW1lLCBjb25maWcpXG5cblx0Ly8gQ2hlY2sgYWJzb2x1dGUgdmFsdWUgdGhyZXNob2xkcyBmaXJzdFxuXHRpZiAodGhyZXNob2xkKSB7XG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWluXG5cdFx0aWYgKHRocmVzaG9sZC5jcml0aWNhbF9taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQuY3JpdGljYWxfbWluKSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBiZWxvdyBjcml0aWNhbF9taW4gKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA8ICR7dGhyZXNob2xkLmNyaXRpY2FsX21pbn0pYClcblx0XHRcdHJldHVybiAnZmFpbHVyZSdcblx0XHR9XG5cblx0XHQvLyBDaGVjayB3YXJuaW5nX21pblxuXHRcdGlmICh0aHJlc2hvbGQud2FybmluZ19taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQud2FybmluZ19taW4pIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGJlbG93IHdhcm5pbmdfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC53YXJuaW5nX21pbn0pYClcblx0XHRcdHJldHVybiAnd2FybmluZydcblx0XHR9XG5cblx0XHQvLyBDaGVjayBjcml0aWNhbF9tYXhcblx0XHRpZiAodGhyZXNob2xkLmNyaXRpY2FsX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC5jcml0aWNhbF9tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIGNyaXRpY2FsX21heCAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9ID4gJHt0aHJlc2hvbGQuY3JpdGljYWxfbWF4fSlgKVxuXHRcdFx0cmV0dXJuICdmYWlsdXJlJ1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHdhcm5pbmdfbWF4XG5cdFx0aWYgKHRocmVzaG9sZC53YXJuaW5nX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC53YXJuaW5nX21heCkge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYWJvdmUgd2FybmluZ19tYXggKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA+ICR7dGhyZXNob2xkLndhcm5pbmdfbWF4fSlgKVxuXHRcdFx0cmV0dXJuICd3YXJuaW5nJ1xuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIGNoYW5nZSBwZXJjZW50IHRocmVzaG9sZHNcblx0aWYgKCFpc05hTihjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50KSkge1xuXHRcdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudClcblxuXHRcdC8vIFVzZSBtZXRyaWMtc3BlY2lmaWMgb3IgZGVmYXVsdCB0aHJlc2hvbGRzXG5cdFx0bGV0IHdhcm5pbmdUaHJlc2hvbGQgPSB0aHJlc2hvbGQ/Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudFxuXHRcdGxldCBjcml0aWNhbFRocmVzaG9sZCA9IHRocmVzaG9sZD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQuY3JpdGljYWxfY2hhbmdlX3BlcmNlbnRcblxuXHRcdC8vIE9ubHkgdHJpZ2dlciBpZiBjaGFuZ2UgaXMgaW4gXCJ3b3JzZVwiIGRpcmVjdGlvblxuXHRcdGlmIChjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb24gPT09ICd3b3JzZScpIHtcblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gY3JpdGljYWxUaHJlc2hvbGQpIHtcblx0XHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogY3JpdGljYWwgcmVncmVzc2lvbiAoJHtjaGFuZ2VQZXJjZW50LnRvRml4ZWQoMSl9JSA+ICR7Y3JpdGljYWxUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRyZXR1cm4gJ2ZhaWx1cmUnXG5cdFx0XHR9XG5cblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gd2FybmluZ1RocmVzaG9sZCkge1xuXHRcdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiB3YXJuaW5nIHJlZ3Jlc3Npb24gKCR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDEpfSUgPiAke3dhcm5pbmdUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRyZXR1cm4gJ3dhcm5pbmcnXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuICdzdWNjZXNzJ1xufVxuXG4vKipcbiAqIEV2YWx1YXRlIGFsbCBtZXRyaWNzIGFuZCByZXR1cm4gb3ZlcmFsbCBzZXZlcml0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMoXG5cdGNvbXBhcmlzb25zOiBNZXRyaWNDb21wYXJpc29uW10sXG5cdGNvbmZpZzogVGhyZXNob2xkQ29uZmlnXG4pOiB7XG5cdG92ZXJhbGw6IFRocmVzaG9sZFNldmVyaXR5XG5cdGZhaWx1cmVzOiBNZXRyaWNDb21wYXJpc29uW11cblx0d2FybmluZ3M6IE1ldHJpY0NvbXBhcmlzb25bXVxufSB7XG5cdGxldCBmYWlsdXJlczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblx0bGV0IHdhcm5pbmdzOiBNZXRyaWNDb21wYXJpc29uW10gPSBbXVxuXG5cdGZvciAobGV0IGNvbXBhcmlzb24gb2YgY29tcGFyaXNvbnMpIHtcblx0XHRsZXQgc2V2ZXJpdHkgPSBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uLCBjb25maWcpXG5cblx0XHRpZiAoc2V2ZXJpdHkgPT09ICdmYWlsdXJlJykge1xuXHRcdFx0ZmFpbHVyZXMucHVzaChjb21wYXJpc29uKVxuXHRcdH0gZWxzZSBpZiAoc2V2ZXJpdHkgPT09ICd3YXJuaW5nJykge1xuXHRcdFx0d2FybmluZ3MucHVzaChjb21wYXJpc29uKVxuXHRcdH1cblx0fVxuXG5cdGxldCBvdmVyYWxsOiBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJ1xuXHRpZiAoZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdG92ZXJhbGwgPSAnZmFpbHVyZSdcblx0fSBlbHNlIGlmICh3YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0b3ZlcmFsbCA9ICd3YXJuaW5nJ1xuXHR9XG5cblx0cmV0dXJuIHsgb3ZlcmFsbCwgZmFpbHVyZXMsIHdhcm5pbmdzIH1cbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgUFIgY29tbWVudCBnZW5lcmF0aW9uIGFuZCBtYW5hZ2VtZW50XG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgdHlwZSB7IFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWVudERhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGFydGlmYWN0VXJsczogTWFwPHN0cmluZywgc3RyaW5nPlxuXHRjaGVja1VybHM6IE1hcDxzdHJpbmcsIHN0cmluZz5cblx0am9iU3VtbWFyeVVybD86IHN0cmluZ1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIFBSIGNvbW1lbnQgYm9keVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDb21tZW50Qm9keShkYXRhOiBDb21tZW50RGF0YSk6IHN0cmluZyB7XG5cdGxldCB0b3RhbFJlZ3Jlc3Npb25zID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5yZWdyZXNzaW9ucywgMClcblx0bGV0IHRvdGFsSW1wcm92ZW1lbnRzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5pbXByb3ZlbWVudHMsIDApXG5cblx0bGV0IHN0YXR1c0Vtb2ppID0gdG90YWxSZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0bGV0IHN0YXR1c1RleHQgPSB0b3RhbFJlZ3Jlc3Npb25zID4gMCA/IGAke3RvdGFsUmVncmVzc2lvbnN9IHJlZ3Jlc3Npb25zYCA6ICdBbGwgY2xlYXInXG5cblx0bGV0IGhlYWRlciA9IGAjIyDwn4yLIFNMTyBUZXN0IFJlc3VsdHNcblxuKipTdGF0dXMqKjogJHtzdGF0dXNFbW9qaX0gJHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkcyB0ZXN0ZWQg4oCiICR7c3RhdHVzVGV4dH1cblxuJHtkYXRhLmpvYlN1bW1hcnlVcmwgPyBg8J+TiCBbVmlldyBKb2IgU3VtbWFyeV0oJHtkYXRhLmpvYlN1bW1hcnlVcmx9KSBmb3IgZGV0YWlsZWQgY29tcGFyaXNvblxcbmAgOiAnJ31gXG5cblx0bGV0IHRhYmxlID0gYFxufCBXb3JrbG9hZCB8IE1ldHJpY3MgfCBSZWdyZXNzaW9ucyB8IEltcHJvdmVtZW50cyB8IExpbmtzIHxcbnwtLS0tLS0tLS0tfC0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS18XG4ke2RhdGEud29ya2xvYWRzXG5cdC5tYXAoKHcpID0+IHtcblx0XHRsZXQgZW1vamkgPSB3LnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogdy5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDAgPyAn8J+foicgOiAn4pqqJ1xuXHRcdGxldCByZXBvcnRMaW5rID0gZGF0YS5hcnRpZmFjdFVybHMuZ2V0KHcud29ya2xvYWQpIHx8ICcjJ1xuXHRcdGxldCBjaGVja0xpbmsgPSBkYXRhLmNoZWNrVXJscy5nZXQody53b3JrbG9hZCkgfHwgJyMnXG5cblx0XHRyZXR1cm4gYHwgJHtlbW9qaX0gJHt3Lndvcmtsb2FkfSB8ICR7dy5zdW1tYXJ5LnRvdGFsfSB8ICR7dy5zdW1tYXJ5LnJlZ3Jlc3Npb25zfSB8ICR7dy5zdW1tYXJ5LmltcHJvdmVtZW50c30gfCBbUmVwb3J0XSgke3JlcG9ydExpbmt9KSDigKIgW0NoZWNrXSgke2NoZWNrTGlua30pIHxgXG5cdH0pXG5cdC5qb2luKCdcXG4nKX1cbmBcblxuXHRsZXQgZm9vdGVyID0gYFxcbi0tLVxcbipHZW5lcmF0ZWQgYnkgW3lkYi1zbG8tYWN0aW9uXShodHRwczovL2dpdGh1Yi5jb20veWRiLXBsYXRmb3JtL3lkYi1zbG8tYWN0aW9uKSpgXG5cblx0cmV0dXJuIGhlYWRlciArIHRhYmxlICsgZm9vdGVyXG59XG5cbi8qKlxuICogRmluZCBleGlzdGluZyBTTE8gY29tbWVudCBpbiBQUlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEV4aXN0aW5nU0xPQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyXG4pOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXG5cdGluZm8oYFNlYXJjaGluZyBmb3IgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFIgIyR7cHJOdW1iZXJ9Li4uYClcblxuXHRsZXQgeyBkYXRhOiBjb21tZW50cyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdG93bmVyLFxuXHRcdHJlcG8sXG5cdFx0aXNzdWVfbnVtYmVyOiBwck51bWJlcixcblx0fSlcblxuXHRmb3IgKGxldCBjb21tZW50IG9mIGNvbW1lbnRzKSB7XG5cdFx0aWYgKGNvbW1lbnQuYm9keT8uaW5jbHVkZXMoJ/CfjIsgU0xPIFRlc3QgUmVzdWx0cycpKSB7XG5cdFx0XHRpbmZvKGBGb3VuZCBleGlzdGluZyBjb21tZW50OiAke2NvbW1lbnQuaWR9YClcblx0XHRcdHJldHVybiBjb21tZW50LmlkXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBDcmVhdGUgb3IgdXBkYXRlIFBSIGNvbW1lbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZU9yVXBkYXRlQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyLFxuXHRib2R5OiBzdHJpbmdcbik6IFByb21pc2U8eyB1cmw6IHN0cmluZzsgaWQ6IG51bWJlciB9PiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXhpc3RpbmdJZCA9IGF3YWl0IGZpbmRFeGlzdGluZ1NMT0NvbW1lbnQodG9rZW4sIG93bmVyLCByZXBvLCBwck51bWJlcilcblxuXHRpZiAoZXhpc3RpbmdJZCkge1xuXHRcdGluZm8oYFVwZGF0aW5nIGV4aXN0aW5nIGNvbW1lbnQgJHtleGlzdGluZ0lkfS4uLmApXG5cblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLnVwZGF0ZUNvbW1lbnQoe1xuXHRcdFx0b3duZXIsXG5cdFx0XHRyZXBvLFxuXHRcdFx0Y29tbWVudF9pZDogZXhpc3RpbmdJZCxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGluZm8oYENvbW1lbnQgdXBkYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cblx0XHRyZXR1cm4geyB1cmw6IGRhdGEuaHRtbF91cmwhLCBpZDogZGF0YS5pZCB9XG5cdH0gZWxzZSB7XG5cdFx0aW5mbyhgQ3JlYXRpbmcgbmV3IGNvbW1lbnQuLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcblx0XHRcdG93bmVyLFxuXHRcdFx0cmVwbyxcblx0XHRcdGlzc3VlX251bWJlcjogcHJOdW1iZXIsXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRpbmZvKGBDb21tZW50IGNyZWF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogSFRNTCByZXBvcnQgZ2VuZXJhdGlvbiB3aXRoIENoYXJ0LmpzXG4gKi9cblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMsIE1ldHJpY3NNYXAsIFNlcmllcyB9IGZyb20gJy4vbWV0cmljcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBIVE1MUmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXBcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdGNvbW1pdHM6IHtcblx0XHRjdXJyZW50OiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdFx0YmFzZTogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHR9XG5cdG1ldGE6IHtcblx0XHRwck51bWJlcjogbnVtYmVyXG5cdFx0Z2VuZXJhdGVkQXQ6IHN0cmluZ1xuXHRcdHRlc3REdXJhdGlvbj86IHN0cmluZ1xuXHR9XG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCByZXBvcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSFRNTFJlcG9ydChkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cblx0PG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cblx0PHRpdGxlPlNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L3RpdGxlPlxuXHQ8c3R5bGU+JHtnZXRTdHlsZXMoKX08L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG5cdDxoZWFkZXI+XG5cdFx0PGgxPvCfjIsgU0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvaDE+XG5cdFx0PGRpdiBjbGFzcz1cImNvbW1pdC1pbmZvXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBjdXJyZW50XCI+XG5cdFx0XHRcdEN1cnJlbnQ6IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5jdXJyZW50LnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2RhdGEuY29tbWl0cy5jdXJyZW50LnNob3J0fTwvYT5cblx0XHRcdDwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwidnNcIj52czwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiY29tbWl0IGJhc2VcIj5cblx0XHRcdFx0QmFzZTogPGEgaHJlZj1cIiR7ZGF0YS5jb21taXRzLmJhc2UudXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7ZGF0YS5jb21taXRzLmJhc2Uuc2hvcnR9PC9hPlxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJtZXRhXCI+XG5cdFx0XHQ8c3Bhbj5QUiAjJHtkYXRhLm1ldGEucHJOdW1iZXJ9PC9zcGFuPlxuXHRcdFx0JHtkYXRhLm1ldGEudGVzdER1cmF0aW9uID8gYDxzcGFuPkR1cmF0aW9uOiAke2RhdGEubWV0YS50ZXN0RHVyYXRpb259PC9zcGFuPmAgOiAnJ31cblx0XHRcdDxzcGFuPkdlbmVyYXRlZDogJHtkYXRhLm1ldGEuZ2VuZXJhdGVkQXR9PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHQ8L2hlYWRlcj5cblxuXHQ8c2VjdGlvbiBjbGFzcz1cInN1bW1hcnlcIj5cblx0XHQ8aDI+8J+TiiBNZXRyaWNzIE92ZXJ2aWV3PC9oMj5cblx0XHQ8ZGl2IGNsYXNzPVwic3RhdHNcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmRcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnRvdGFsfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlRvdGFsIE1ldHJpY3M8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCBpbXByb3ZlbWVudHNcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50c308L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5JbXByb3ZlbWVudHM8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCByZWdyZXNzaW9uc1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkucmVncmVzc2lvbnN9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+UmVncmVzc2lvbnM8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCBzdGFibGVcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnN0YWJsZX08L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5TdGFibGU8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdCR7Z2VuZXJhdGVDb21wYXJpc29uVGFibGUoZGF0YS5jb21wYXJpc29uKX1cblx0PC9zZWN0aW9uPlxuXG5cdDxzZWN0aW9uIGNsYXNzPVwiY2hhcnRzXCI+XG5cdFx0PGgyPvCfk4ggVGltZSBTZXJpZXM8L2gyPlxuXHRcdCR7Z2VuZXJhdGVDaGFydHMoZGF0YSl9XG5cdDwvc2VjdGlvbj5cblxuXHQke2RhdGEuZXZlbnRzLmxlbmd0aCA+IDAgPyBnZW5lcmF0ZUV2ZW50c1NlY3Rpb24oZGF0YS5ldmVudHMpIDogJyd9XG5cblx0PGZvb3Rlcj5cblx0XHQ8cD5HZW5lcmF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb25cIiB0YXJnZXQ9XCJfYmxhbmtcIj55ZGItc2xvLWFjdGlvbjwvYT48L3A+XG5cdDwvZm9vdGVyPlxuXG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydC5qc0A0LjQuMC9kaXN0L2NoYXJ0LnVtZC5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtYWRhcHRlci1kYXRlLWZuc0AzLjAuMC9kaXN0L2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy5idW5kbGUubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uQDMuMC4xL2Rpc3QvY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbi5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdD5cblx0XHQke2dlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGEpfVxuXHQ8L3NjcmlwdD5cbjwvYm9keT5cbjwvaHRtbD5gXG59XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHRleHRcblx0XHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuXHRcdC5yZXBsYWNlKC88L2csICcmbHQ7Jylcblx0XHQucmVwbGFjZSgvPi9nLCAnJmd0OycpXG5cdFx0LnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuXHRcdC5yZXBsYWNlKC8nL2csICcmIzAzOTsnKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24pOiBzdHJpbmcge1xuXHRsZXQgcm93cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5tYXAoXG5cdFx0XHQobSkgPT4gYFxuXHRcdDx0ciBjbGFzcz1cIiR7bS5jaGFuZ2UuZGlyZWN0aW9ufVwiPlxuXHRcdFx0PHRkPiR7ZXNjYXBlSHRtbChtLm5hbWUpfTwvdGQ+XG5cdFx0XHQ8dGQ+JHtmb3JtYXRWYWx1ZShtLmN1cnJlbnQudmFsdWUsIG0ubmFtZSl9PC90ZD5cblx0XHRcdDx0ZD4ke20uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2UudmFsdWUsIG0ubmFtZSkgOiAnTi9BJ308L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2hhbmdlLWNlbGxcIj4ke20uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRDaGFuZ2UobS5jaGFuZ2UucGVyY2VudCwgbS5jaGFuZ2UuZGlyZWN0aW9uKSA6ICdOL0EnfTwvdGQ+XG5cdFx0PC90cj5cblx0YFxuXHRcdClcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHRcdDx0YWJsZSBjbGFzcz1cImNvbXBhcmlzb24tdGFibGVcIj5cblx0XHRcdDx0aGVhZD5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5NZXRyaWM8L3RoPlxuXHRcdFx0XHRcdDx0aD5DdXJyZW50PC90aD5cblx0XHRcdFx0XHQ8dGg+QmFzZTwvdGg+XG5cdFx0XHRcdFx0PHRoPkNoYW5nZTwvdGg+XG5cdFx0XHRcdDwvdHI+XG5cdFx0XHQ8L3RoZWFkPlxuXHRcdFx0PHRib2R5PlxuXHRcdFx0XHQke3Jvd3N9XG5cdFx0XHQ8L3Rib2R5PlxuXHRcdDwvdGFibGU+XG5cdGBcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydHMoZGF0YTogSFRNTFJlcG9ydERhdGEpOiBzdHJpbmcge1xuXHRyZXR1cm4gZGF0YS5jb21wYXJpc29uLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLnR5cGUgPT09ICdyYW5nZScpIC8vIE9ubHkgcmFuZ2UgbWV0cmljcyBoYXZlIGNoYXJ0c1xuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtY2FyZFwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWhlYWRlclwiPlxuXHRcdFx0XHQ8aDM+XG5cdFx0XHRcdFx0JHtlc2NhcGVIdG1sKGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJpbmRpY2F0b3IgJHtjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb259XCI+JHtmb3JtYXRDaGFuZ2UoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCwgY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uKX08L3NwYW4+XG5cdFx0XHRcdDwvaDM+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1tZXRhXCI+XG5cdFx0XHRcdFx0Q3VycmVudDogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmN1cnJlbnQudmFsdWUsIGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0JHtjb21wYXJpc29uLmJhc2UuYXZhaWxhYmxlID8gYCDigKIgQmFzZTogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmJhc2UudmFsdWUsIGNvbXBhcmlzb24ubmFtZSl9YCA6ICcnfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWNvbnRhaW5lclwiPlxuXHRcdFx0XHQ8Y2FudmFzIGlkPVwiY2hhcnQtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+PC9jYW52YXM+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0YFxuXHRcdH0pXG5cdFx0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRXZlbnRzU2VjdGlvbihldmVudHM6IEZvcm1hdHRlZEV2ZW50W10pOiBzdHJpbmcge1xuXHRsZXQgZXZlbnRzTGlzdCA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSkgPT4gYFxuXHRcdDxkaXYgY2xhc3M9XCJldmVudC1pdGVtXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LW1hcmtlclwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogJHtlLmNvbG9yfVwiPjwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtaWNvblwiPiR7ZS5pY29ufTwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtdGltZVwiPiR7Zm9ybWF0VGltZXN0YW1wKGUudGltZXN0YW1wKX08L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LWxhYmVsXCI+JHtlc2NhcGVIdG1sKGUubGFiZWwpfTwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0YFxuXHRcdClcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHQ8c2VjdGlvbiBjbGFzcz1cImV2ZW50cy1zZWN0aW9uXCI+XG5cdFx0PGgyPvCfk40gRXZlbnRzIFRpbWVsaW5lPC9oMj5cblx0XHQ8ZGl2IGNsYXNzPVwiZXZlbnRzLWxpc3RcIj5cblx0XHRcdCR7ZXZlbnRzTGlzdH1cblx0XHQ8L2Rpdj5cblx0PC9zZWN0aW9uPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGE6IEhUTUxSZXBvcnREYXRhKTogc3RyaW5nIHtcblx0bGV0IGNoYXJ0U2NyaXB0cyA9IGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKVxuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0cmV0dXJuIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoY29tcGFyaXNvbi5uYW1lLCBtZXRyaWMgYXMgQ29sbGVjdGVkTWV0cmljLCBkYXRhLmV2ZW50cylcblx0XHR9KVxuXHRcdC5qb2luKCdcXG4nKVxuXG5cdHJldHVybiBjaGFydFNjcmlwdHNcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTaW5nbGVDaGFydFNjcmlwdChtZXRyaWNOYW1lOiBzdHJpbmcsIG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10pOiBzdHJpbmcge1xuXHRsZXQgY3VycmVudFNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnY3VycmVudCcpXG5cdGxldCBiYXNlU2VyaWVzID0gKG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09ICdiYXNlJylcblxuXHRsZXQgY3VycmVudERhdGEgPSBjdXJyZW50U2VyaWVzXG5cdFx0PyBKU09OLnN0cmluZ2lmeShjdXJyZW50U2VyaWVzLnZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdDogJ1tdJ1xuXG5cdGxldCBiYXNlRGF0YSA9IGJhc2VTZXJpZXNcblx0XHQ/IEpTT04uc3RyaW5naWZ5KGJhc2VTZXJpZXMudmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0OiAnW10nXG5cblx0bGV0IGFubm90YXRpb25zID0gZXZlbnRzXG5cdFx0Lm1hcChcblx0XHRcdChlKSA9PiBge1xuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0eE1heDogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcke2UuY29sb3J9Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdLFxuXHRcdFx0bGFiZWw6IHtcblx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0Y29udGVudDogJyR7ZS5pY29ufScsXG5cdFx0XHRcdHBvc2l0aW9uOiAnc3RhcnQnLFxuXHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcke2UuY29sb3J9Jyxcblx0XHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdFx0Zm9udDogeyBzaXplOiAxNCB9LFxuXHRcdFx0XHRwYWRkaW5nOiA0XG5cdFx0XHR9XG5cdFx0fWBcblx0XHQpXG5cdFx0LmpvaW4oJyxcXG4nKVxuXG5cdHJldHVybiBgXG4oZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGN0eCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFydC0ke3Nhbml0aXplSWQobWV0cmljTmFtZSl9Jyk7XG5cdGlmICghY3R4KSByZXR1cm47XG5cblx0bmV3IENoYXJ0KGN0eCwge1xuXHRcdHR5cGU6ICdsaW5lJyxcblx0XHRkYXRhOiB7XG5cdFx0XHRkYXRhc2V0czogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGFiZWw6ICdDdXJyZW50Jyxcblx0XHRcdFx0XHRkYXRhOiAke2N1cnJlbnREYXRhfSxcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogJyMzYjgyZjYnLFxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMzYjgyZjYyMCcsXG5cdFx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQke1xuXHRcdFx0XHRcdGJhc2VTZXJpZXNcblx0XHRcdFx0XHRcdD8gYHtcblx0XHRcdFx0XHRsYWJlbDogJ0Jhc2UnLFxuXHRcdFx0XHRcdGRhdGE6ICR7YmFzZURhdGF9LFxuXHRcdFx0XHRcdGJvcmRlckNvbG9yOiAnIzk0YTNiOCcsXG5cdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzk0YTNiODIwJyxcblx0XHRcdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdFx0XHRib3JkZXJEYXNoOiBbNSwgNV0sXG5cdFx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0XHR9YFxuXHRcdFx0XHRcdFx0OiAnJ1xuXHRcdFx0XHR9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRyZXNwb25zaXZlOiB0cnVlLFxuXHRcdFx0bWFpbnRhaW5Bc3BlY3RSYXRpbzogZmFsc2UsXG5cdFx0XHRpbnRlcmFjdGlvbjoge1xuXHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRpbnRlcnNlY3Q6IGZhbHNlXG5cdFx0XHR9LFxuXHRcdFx0c2NhbGVzOiB7XG5cdFx0XHRcdHg6IHtcblx0XHRcdFx0XHR0eXBlOiAndGltZScsXG5cdFx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdFx0dW5pdDogJ21pbnV0ZScsXG5cdFx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0czoge1xuXHRcdFx0XHRcdFx0XHRtaW51dGU6ICdISDptbSdcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdFx0dGV4dDogJ1RpbWUnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR5OiB7XG5cdFx0XHRcdFx0YmVnaW5BdFplcm86IGZhbHNlLFxuXHRcdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdFx0dGV4dDogJyR7ZXNjYXBlSnMobWV0cmljTmFtZSl9J1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBsdWdpbnM6IHtcblx0XHRcdFx0bGVnZW5kOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRwb3NpdGlvbjogJ3RvcCdcblx0XHRcdFx0fSxcblx0XHRcdFx0dG9vbHRpcDoge1xuXHRcdFx0XHRcdG1vZGU6ICdpbmRleCcsXG5cdFx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbm5vdGF0aW9uOiB7XG5cdFx0XHRcdFx0YW5ub3RhdGlvbnM6IFske2Fubm90YXRpb25zfV1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KSgpO1xuYFxufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUlkKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJy0nKVxufVxuXG5mdW5jdGlvbiBlc2NhcGVKcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIikucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAodGltZXN0YW1wOiBudW1iZXIpOiBzdHJpbmcge1xuXHRsZXQgZGF0ZSA9IG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApXG5cdHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDExLCAxOSlcbn1cblxuZnVuY3Rpb24gZ2V0U3R5bGVzKCk6IHN0cmluZyB7XG5cdHJldHVybiBgXG4qIHtcblx0bWFyZ2luOiAwO1xuXHRwYWRkaW5nOiAwO1xuXHRib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuXG5ib2R5IHtcblx0Zm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCAnSGVsdmV0aWNhIE5ldWUnLCBBcmlhbCwgc2Fucy1zZXJpZjtcblx0bGluZS1oZWlnaHQ6IDEuNjtcblx0Y29sb3I6ICMyNDI5MmY7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdHBhZGRpbmc6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Ym9keSB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRjb2xvcjogI2M5ZDFkOTtcblx0fVxufVxuXG5oZWFkZXIge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcblx0cGFkZGluZzogMzBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGhlYWRlciB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuaGVhZGVyIGgxIHtcblx0Zm9udC1zaXplOiAzMnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY29tbWl0LWluZm8ge1xuXHRmb250LXNpemU6IDE2cHg7XG5cdG1hcmdpbi1ib3R0b206IDEwcHg7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTVweDtcblx0ZmxleC13cmFwOiB3cmFwO1xufVxuXG4uY29tbWl0IHtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDE0cHg7XG59XG5cbi5jb21taXQuY3VycmVudCB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uY29tbWl0LmJhc2Uge1xuXHRiYWNrZ3JvdW5kOiAjZGRmNGZmO1xuXHRjb2xvcjogIzA5NjlkYTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tbWl0LmN1cnJlbnQge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTY7XG5cdFx0Y29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LmNvbW1pdC5iYXNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGMyZDZiO1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbi5jb21taXQgYSB7XG5cdGNvbG9yOiBpbmhlcml0O1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5jb21taXQgYTpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG4udnMge1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLm1ldGEge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuc2VjdGlvbiB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDAgYXV0byA0MHB4O1xufVxuXG5zZWN0aW9uIGgyIHtcblx0Zm9udC1zaXplOiAyNHB4O1xuXHRtYXJnaW4tYm90dG9tOiAyMHB4O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcblx0cGFkZGluZy1ib3R0b206IDEwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0c2VjdGlvbiBoMiB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5zdGF0cyB7XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZml0LCBtaW5tYXgoMjAwcHgsIDFmcikpO1xuXHRnYXA6IDE1cHg7XG5cdG1hcmdpbi1ib3R0b206IDMwcHg7XG59XG5cbi5zdGF0LWNhcmQge1xuXHRwYWRkaW5nOiAyMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdGJvcmRlcjogMnB4IHNvbGlkICNkMGQ3ZGU7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcbn1cblxuLnN0YXQtY2FyZC5pbXByb3ZlbWVudHMge1xuXHRib3JkZXItY29sb3I6ICMxYTdmMzc7XG59XG5cbi5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRib3JkZXItY29sb3I6ICNjZjIyMmU7XG59XG5cbi5zdGF0LWNhcmQuc3RhYmxlIHtcblx0Ym9yZGVyLWNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5zdGF0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG5cdC5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0XHRib3JkZXItY29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LnN0YXQtY2FyZC5yZWdyZXNzaW9ucyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjZjg1MTQ5O1xuXHR9XG5cdC5zdGF0LWNhcmQuc3RhYmxlIHtcblx0XHRib3JkZXItY29sb3I6ICM4Yjk0OWU7XG5cdH1cbn1cblxuLnN0YXQtdmFsdWUge1xuXHRmb250LXNpemU6IDM2cHg7XG5cdGZvbnQtd2VpZ2h0OiA3MDA7XG5cdG1hcmdpbi1ib3R0b206IDVweDtcbn1cblxuLnN0YXQtbGFiZWwge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXdlaWdodDogNTAwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB7XG5cdHdpZHRoOiAxMDAlO1xuXHRib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdG92ZXJmbG93OiBoaWRkZW47XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoLFxuLmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRwYWRkaW5nOiAxMnB4IDE2cHg7XG5cdHRleHQtYWxpZ246IGxlZnQ7XG5cdGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoLFxuXHQuY29tcGFyaXNvbi10YWJsZSB0ZCB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyOmxhc3QtY2hpbGQgdGQge1xuXHRib3JkZXItYm90dG9tOiBub25lO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkMjA7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTIwO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjIwO1xuXHR9XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkMjA7XG5cdH1cbn1cblxuLmNoYW5nZS1jZWxsIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmNoYXJ0LWNhcmQge1xuXHRtYXJnaW4tYm90dG9tOiA0MHB4O1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdHBhZGRpbmc6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNoYXJ0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jaGFydC1oZWFkZXIge1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY2hhcnQtaGVhZGVyIGgzIHtcblx0Zm9udC1zaXplOiAxOHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuLmluZGljYXRvciB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4uaW5kaWNhdG9yLmJldHRlciB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uaW5kaWNhdG9yLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTtcblx0Y29sb3I6ICNjZjIyMmU7XG59XG5cbi5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5pbmRpY2F0b3IuYmV0dGVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5pbmRpY2F0b3Iud29yc2Uge1xuXHRcdGJhY2tncm91bmQ6ICM4NjE4MWQ7XG5cdFx0Y29sb3I6ICNmZjdiNzI7XG5cdH1cblx0LmluZGljYXRvci5uZXV0cmFsIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGNvbG9yOiAjOGI5NDllO1xuXHR9XG59XG5cbi5jaGFydC1tZXRhIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0bWFyZ2luLXRvcDogNXB4O1xufVxuXG4uY2hhcnQtY29udGFpbmVyIHtcblx0cG9zaXRpb246IHJlbGF0aXZlO1xuXHRoZWlnaHQ6IDQwMHB4O1xufVxuXG4uZXZlbnRzLXNlY3Rpb24ge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiA0MHB4IGF1dG87XG59XG5cbi5ldmVudHMtbGlzdCB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG5cdGdhcDogMTBweDtcbn1cblxuLmV2ZW50LWl0ZW0ge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdHBhZGRpbmc6IDEwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDZweDtcblx0Ym9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5ldmVudC1pdGVtIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uZXZlbnQtbWFya2VyIHtcblx0d2lkdGg6IDEycHg7XG5cdGhlaWdodDogMTJweDtcblx0Ym9yZGVyLXJhZGl1czogNTAlO1xufVxuXG4uZXZlbnQtaWNvbiB7XG5cdGZvbnQtc2l6ZTogMThweDtcbn1cblxuLmV2ZW50LXRpbWUge1xuXHRmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRtaW4td2lkdGg6IDgwcHg7XG59XG5cbi5ldmVudC1sYWJlbCB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0ZmxleDogMTtcbn1cblxuZm9vdGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogNjBweCBhdXRvIDIwcHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0cGFkZGluZy10b3A6IDIwcHg7XG5cdGJvcmRlci10b3A6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGZvb3RlciB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmZvb3RlciBhIHtcblx0Y29sb3I6ICMwOTY5ZGE7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbn1cblxuZm9vdGVyIGE6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIgYSB7XG5cdFx0Y29sb3I6ICM1OGE2ZmY7XG5cdH1cbn1cblxuQG1lZGlhIChtYXgtd2lkdGg6IDc2OHB4KSB7XG5cdGJvZHkge1xuXHRcdHBhZGRpbmc6IDEwcHg7XG5cdH1cblxuXHRoZWFkZXIgaDEge1xuXHRcdGZvbnQtc2l6ZTogMjRweDtcblx0fVxuXG5cdC5jaGFydC1jb250YWluZXIge1xuXHRcdGhlaWdodDogMzAwcHg7XG5cdH1cblxuXHQuc3RhdHMge1xuXHRcdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDIsIDFmcik7XG5cdH1cbn1cbmBcbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgQWN0aW9ucyBKb2IgU3VtbWFyeSBnZW5lcmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgc3VtbWFyeSB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBTdW1tYXJ5RGF0YSB7XG5cdHdvcmtsb2FkczogV29ya2xvYWRDb21wYXJpc29uW11cblx0Y29tbWl0czoge1xuXHRcdGN1cnJlbnQ6IHsgc2hhOiBzdHJpbmc7IHVybDogc3RyaW5nOyBzaG9ydDogc3RyaW5nIH1cblx0XHRiYXNlOiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdH1cblx0YXJ0aWZhY3RVcmxzPzogTWFwPHN0cmluZywgc3RyaW5nPlxufVxuXG4vKipcbiAqIFdyaXRlIEpvYiBTdW1tYXJ5IHdpdGggYWxsIHdvcmtsb2Fkc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVKb2JTdW1tYXJ5KGRhdGE6IFN1bW1hcnlEYXRhKTogUHJvbWlzZTx2b2lkPiB7XG5cdHN1bW1hcnkuYWRkSGVhZGluZygn8J+MiyBTTE8gVGVzdCBTdW1tYXJ5JywgMSlcblxuXHQvLyBDb21taXRzIGluZm9cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHA+XG5cdDxzdHJvbmc+Q3VycmVudDo8L3N0cm9uZz4gPGEgaHJlZj1cIiR7ZGF0YS5jb21taXRzLmN1cnJlbnQudXJsfVwiPiR7ZGF0YS5jb21taXRzLmN1cnJlbnQuc2hvcnR9PC9hPlxuXHR2c1xuXHQ8c3Ryb25nPkJhc2U6PC9zdHJvbmc+IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5iYXNlLnVybH1cIj4ke2RhdGEuY29tbWl0cy5iYXNlLnNob3J0fTwvYT5cbjwvcD5cblx0YClcblxuXHRzdW1tYXJ5LmFkZEJyZWFrKClcblxuXHQvLyBPdmVyYWxsIHN0YXRzXG5cdGxldCB0b3RhbE1ldHJpY3MgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnRvdGFsLCAwKVxuXHRsZXQgdG90YWxSZWdyZXNzaW9ucyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkucmVncmVzc2lvbnMsIDApXG5cdGxldCB0b3RhbEltcHJvdmVtZW50cyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkuaW1wcm92ZW1lbnRzLCAwKVxuXHRsZXQgdG90YWxTdGFibGUgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnN0YWJsZSwgMClcblxuXHRzdW1tYXJ5LmFkZFJhdyhgXG48dGFibGU+XG5cdDx0cj5cblx0XHQ8dGQ+PHN0cm9uZz4ke2RhdGEud29ya2xvYWRzLmxlbmd0aH08L3N0cm9uZz4gd29ya2xvYWRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZz4ke3RvdGFsTWV0cmljc308L3N0cm9uZz4gbWV0cmljczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmcgc3R5bGU9XCJjb2xvcjogIzFhN2YzNztcIj4ke3RvdGFsSW1wcm92ZW1lbnRzfTwvc3Ryb25nPiBpbXByb3ZlbWVudHM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICNjZjIyMmU7XCI+JHt0b3RhbFJlZ3Jlc3Npb25zfTwvc3Ryb25nPiByZWdyZXNzaW9uczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmcgc3R5bGU9XCJjb2xvcjogIzZlNzc4MTtcIj4ke3RvdGFsU3RhYmxlfTwvc3Ryb25nPiBzdGFibGU8L3RkPlxuXHQ8L3RyPlxuPC90YWJsZT5cblx0YClcblxuXHRzdW1tYXJ5LmFkZEJyZWFrKClcblxuXHQvLyBFYWNoIHdvcmtsb2FkXG5cdGZvciAobGV0IHdvcmtsb2FkIG9mIGRhdGEud29ya2xvYWRzKSB7XG5cdFx0bGV0IHN0YXR1c0Vtb2ppID0gd29ya2xvYWQuc3VtbWFyeS5yZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0XHRsZXQgYXJ0aWZhY3RVcmwgPSBkYXRhLmFydGlmYWN0VXJscz8uZ2V0KHdvcmtsb2FkLndvcmtsb2FkKVxuXG5cdFx0c3VtbWFyeS5hZGRIZWFkaW5nKGAke3N0YXR1c0Vtb2ppfSAke3dvcmtsb2FkLndvcmtsb2FkfWAsIDMpXG5cblx0XHRpZiAoYXJ0aWZhY3RVcmwpIHtcblx0XHRcdHN1bW1hcnkuYWRkUmF3KGA8cD48YSBocmVmPVwiJHthcnRpZmFjdFVybH1cIj7wn5OKIFZpZXcgZGV0YWlsZWQgSFRNTCByZXBvcnQ8L2E+PC9wPmApXG5cdFx0fVxuXG5cdFx0Ly8gTWV0cmljcyB0YWJsZVxuXHRcdHN1bW1hcnkuYWRkVGFibGUoW1xuXHRcdFx0W1xuXHRcdFx0XHR7IGRhdGE6ICdNZXRyaWMnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQ3VycmVudCcsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdCYXNlJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRcdHsgZGF0YTogJ0NoYW5nZScsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XSxcblx0XHRcdC4uLndvcmtsb2FkLm1ldHJpY3MubWFwKChtKSA9PiBbXG5cdFx0XHRcdG0ubmFtZSxcblx0XHRcdFx0Zm9ybWF0VmFsdWUobS5jdXJyZW50LnZhbHVlLCBtLm5hbWUpLFxuXHRcdFx0XHRtLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0VmFsdWUobS5iYXNlLnZhbHVlLCBtLm5hbWUpIDogJ04vQScsXG5cdFx0XHRcdG0uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRDaGFuZ2UobS5jaGFuZ2UucGVyY2VudCwgbS5jaGFuZ2UuZGlyZWN0aW9uKSA6ICdOL0EnLFxuXHRcdFx0XSksXG5cdFx0XSlcblxuXHRcdHN1bW1hcnkuYWRkQnJlYWsoKVxuXHR9XG5cblx0YXdhaXQgc3VtbWFyeS53cml0ZSgpXG59XG5cbi8qKlxuICogQ2xlYXIgZXhpc3Rpbmcgc3VtbWFyeVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYXJKb2JTdW1tYXJ5KCk6IFByb21pc2U8dm9pZD4ge1xuXHRzdW1tYXJ5LmVtcHR5QnVmZmVyKClcblx0YXdhaXQgc3VtbWFyeS53cml0ZSgpXG59XG4iCiAgXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7Ozs7Ozs7O0FBT0EsdURBQ0EsMkNBQ0E7QUFMQTtBQUNBOzs7QUMyQk8sU0FBUyxpQkFBaUIsQ0FBQyxTQUE2QjtBQUFBLEVBQzlELElBQUksMEJBQVUsSUFBSSxLQUNkLFFBQVEsUUFBUSxLQUFLLEVBQUUsTUFBTTtBQUFBLENBQUk7QUFBQSxFQUVyQyxTQUFTLFFBQVEsT0FBTztBQUFBLElBQ3ZCLElBQUksQ0FBQyxLQUFLLEtBQUs7QUFBQSxNQUFHO0FBQUEsSUFFbEIsSUFBSTtBQUFBLE1BQ0gsSUFBSSxTQUFTLEtBQUssTUFBTSxJQUFJO0FBQUEsTUFDNUIsUUFBUSxJQUFJLE9BQU8sTUFBTSxNQUFNO0FBQUEsTUFDOUIsTUFBTTtBQUFBLE1BRVA7QUFBQTtBQUFBO0FBQUEsRUFJRixPQUFPO0FBQUE7QUFXRCxTQUFTLGFBQWEsQ0FBQyxRQUEwQztBQUFBLEVBQ3ZFLElBQUksVUFBeUMsTUFDekMsT0FBc0M7QUFBQSxFQUUxQyxJQUFJLE9BQU8sU0FBUyxXQUFXO0FBQUEsSUFDOUIsSUFBSSxPQUFPLE9BQU87QUFBQSxJQUNsQixVQUFVLEtBQUssS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLFFBQVEsU0FBUyxLQUFLLE1BQzFELE9BQU8sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sUUFBUSxNQUFNLEtBQUs7QUFBQSxJQUM5QztBQUFBLElBQ04sSUFBSSxPQUFPLE9BQU87QUFBQSxJQUNsQixVQUFVLEtBQUssS0FBSyxDQUFDLE1BQU0sRUFBRSxPQUFPLFFBQVEsU0FBUyxLQUFLLE1BQzFELE9BQU8sS0FBSyxLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sUUFBUSxNQUFNLEtBQUs7QUFBQTtBQUFBLEVBR3JELE9BQU8sRUFBRSxTQUFTLEtBQUs7QUFBQTtBQVd4QixTQUFTLFVBQVUsQ0FBQyxRQUFrQixHQUFtQjtBQUFBLEVBQ3hE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QUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUMvVVI7QUFnQkEsZUFBc0IsZUFBZSxDQUFDLE1BQWtDO0FBQUEsRUFDdkUscUJBQVEsV0FBVyxpQ0FBc0IsQ0FBQyxHQUcxQyxxQkFBUSxPQUFPO0FBQUE7QUFBQSxzQ0FFc0IsS0FBSyxRQUFRLFFBQVEsUUFBUSxLQUFLLFFBQVEsUUFBUTtBQUFBO0FBQUEsbUNBRXJELEtBQUssUUFBUSxLQUFLLFFBQVEsS0FBSyxR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QkFBcUIsbUJBQW1CLGFBQWE7QUFBQSxJQUVwSSxTQUFTLFFBQVE7QUFBQSxNQUNoQixhQUFhLElBQUksS0FBSyxVQUFVLGVBQWU7QUFBQSxJQUdoRCxJQUFJLGNBQWMsb0JBQW9CO0FBQUEsTUFDckMsV0FBVztBQUFBLE1BQ1g7QUFBQSxNQUNBO0FBQUEsTUFDQSxlQUFlLHNCQUFzQix1QkFBUSxLQUFLLFNBQVMsdUJBQVEsS0FBSyxxQkFBcUI7QUFBQSxJQUM5RixDQUFDLEdBRUcsVUFBVSxNQUFNLHNCQUFzQixPQUFPLHVCQUFRLEtBQUssT0FBTyx1QkFBUSxLQUFLLE1BQU0sVUFBVSxXQUFXO0FBQUEsSUFFN0csa0JBQUssZUFBZSxRQUFRLEtBQUssR0FFakMsa0JBQUssNkNBQTRDO0FBQUEsSUFDaEQsT0FBTyxPQUFPO0FBQUEsSUFFZixNQURBLHVCQUFVLDZCQUE2QixPQUFPLEtBQUssR0FBRyxHQUNoRDtBQUFBO0FBQUE7QUFJUixLQUFLOyIsCiAgImRlYnVnSWQiOiAiODQyNTBBQTZBQkJFQUNGRDY0NzU2RTIxNjQ3NTZFMjEiLAogICJuYW1lcyI6IFtdCn0=
