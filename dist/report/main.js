import {
  compareWorkloadMetrics,
  formatChange,
  formatValue
} from "../main-djyc6k4y.js";
import {
  __toESM,
  require_artifact,
  require_core,
  require_exec,
  require_github
} from "../main-gvzvxekz.js";

// report/main.ts
var import_artifact2 = __toESM(require_artifact(), 1), import_core4 = __toESM(require_core(), 1), import_github3 = __toESM(require_github(), 1);
import * as fs3 from "node:fs/promises";
import * as path3 from "node:path";
import { fileURLToPath } from "node:url";

// shared/thresholds.ts
var import_exec = __toESM(require_exec(), 1), import_core = __toESM(require_core(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
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
    return import_core.warning(`Failed to parse thresholds YAML: ${String(error)}`), null;
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
async function loadDefaultThresholdConfig() {
  import_core.debug("Loading default thresholds from GITHUB_ACTION_PATH/deploy/thresholds.yaml");
  let actionRoot = path.resolve(process.env.GITHUB_ACTION_PATH), defaultPath = path.join(actionRoot, "deploy", "thresholds.yaml");
  if (fs.existsSync(defaultPath)) {
    let content = fs.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseThresholdsYaml(content);
    if (config)
      return config;
  }
  return import_core.warning("Could not load default thresholds, using hardcoded defaults"), {
    neutral_change_percent: 5,
    default: {
      warning_change_percent: 20,
      critical_change_percent: 50
    }
  };
}
async function loadThresholdConfig(customYaml, customPath) {
  let config = await loadDefaultThresholdConfig();
  if (customYaml) {
    import_core.debug("Merging custom thresholds from inline YAML");
    let customConfig = await parseThresholdsYaml(customYaml);
    if (customConfig)
      config = mergeThresholdConfigs(config, customConfig);
  }
  if (customPath && fs.existsSync(customPath)) {
    import_core.debug(`Merging custom thresholds from file: ${customPath}`);
    let content = fs.readFileSync(customPath, { encoding: "utf-8" }), customConfig = await parseThresholdsYaml(content);
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
  let threshold = findMatchingThreshold(comparison.name, config), severity = "success", reason;
  if (threshold) {
    if (threshold.critical_min !== void 0 && comparison.current.value < threshold.critical_min)
      import_core.debug(`${comparison.name}: below critical_min (${comparison.current.value} < ${threshold.critical_min})`), severity = "failure", reason = `Value ${comparison.current.value.toFixed(2)} < critical min ${threshold.critical_min}`;
    else if (threshold.critical_max !== void 0 && comparison.current.value > threshold.critical_max)
      import_core.debug(`${comparison.name}: above critical_max (${comparison.current.value} > ${threshold.critical_max})`), severity = "failure", reason = `Value ${comparison.current.value.toFixed(2)} > critical max ${threshold.critical_max}`;
    else if (threshold.warning_min !== void 0 && comparison.current.value < threshold.warning_min)
      import_core.debug(`${comparison.name}: below warning_min (${comparison.current.value} < ${threshold.warning_min})`), severity = "warning", reason = `Value ${comparison.current.value.toFixed(2)} < warning min ${threshold.warning_min}`;
    else if (threshold.warning_max !== void 0 && comparison.current.value > threshold.warning_max)
      import_core.debug(`${comparison.name}: above warning_max (${comparison.current.value} > ${threshold.warning_max})`), severity = "warning", reason = `Value ${comparison.current.value.toFixed(2)} > warning max ${threshold.warning_max}`;
  }
  if (!isNaN(comparison.change.percent)) {
    let changePercent = Math.abs(comparison.change.percent), warningThreshold = threshold?.warning_change_percent ?? config.default.warning_change_percent, criticalThreshold = threshold?.critical_change_percent ?? config.default.critical_change_percent;
    if (comparison.change.direction === "worse") {
      if (severity !== "failure") {
        if (changePercent > criticalThreshold)
          severity = "failure", reason = `Regression ${changePercent.toFixed(2)}% > critical ${criticalThreshold}%`;
        else if (severity !== "warning" && changePercent > warningThreshold)
          severity = "warning", reason = `Regression ${changePercent.toFixed(2)}% > warning ${warningThreshold}%`;
      }
    }
  }
  return {
    metric_name: comparison.name,
    threshold_name: threshold?.name,
    threshold_pattern: threshold?.pattern,
    threshold_severity: severity,
    reason
  };
}
function evaluateWorkloadThresholds(comparisons, config) {
  let failures = [], warnings = [];
  for (let comparison of comparisons) {
    let severity = evaluateThreshold(comparison, config);
    if (severity.threshold_severity === "failure")
      failures.push({ ...comparison, reason: severity.reason });
    else if (severity.threshold_severity === "warning")
      warnings.push({ ...comparison, reason: severity.reason });
  }
  let overall = "success";
  if (failures.length > 0)
    overall = "failure";
  else if (warnings.length > 0)
    overall = "warning";
  return { overall, failures, warnings };
}

// report/lib/artifacts.ts
var import_artifact = __toESM(require_artifact(), 1), import_core2 = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
import * as fs2 from "node:fs";
import * as path2 from "node:path";
async function downloadRunArtifacts(destinationPath) {
  let token = import_core2.getInput("github_token"), workflowRunId = parseInt(import_core2.getInput("github_run_id") || String(import_github.context.runId));
  if (!token || !workflowRunId)
    throw Error("GitHub token and workflow run ID are required to download artifacts");
  let artifactClient = new import_artifact.DefaultArtifactClient, { artifacts } = await artifactClient.listArtifacts({
    findBy: {
      token,
      workflowRunId,
      repositoryName: import_github.context.repo.repo,
      repositoryOwner: import_github.context.repo.owner
    }
  });
  import_core2.debug(`Found ${artifacts.length} artifacts in workflow run ${workflowRunId}`);
  let downloadedPaths = /* @__PURE__ */ new Map;
  for (let artifact of artifacts) {
    let artifactDir = path2.join(destinationPath, artifact.name);
    import_core2.debug(`Downloading artifact ${artifact.name}...`);
    let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
      path: artifactDir,
      findBy: {
        token,
        workflowRunId,
        repositoryName: import_github.context.repo.repo,
        repositoryOwner: import_github.context.repo.owner
      }
    }), artifactPath = downloadPath || artifactDir;
    downloadedPaths.set(artifact.name, artifactPath), import_core2.debug(`Downloaded artifact ${artifact.name} to ${artifactPath}`);
  }
  let runArtifacts = /* @__PURE__ */ new Map;
  for (let [artifactName, artifactPath] of downloadedPaths) {
    let workload = artifactName;
    if (!fs2.existsSync(artifactPath)) {
      import_core2.warning(`Artifact path does not exist: ${artifactPath}`);
      continue;
    }
    let stat = fs2.statSync(artifactPath), files = [];
    if (stat.isDirectory())
      files = fs2.readdirSync(artifactPath).map((f) => path2.join(artifactPath, f));
    else
      files = [artifactPath];
    let group = runArtifacts.get(workload) || {};
    group.name = workload;
    for (let file of files) {
      let basename2 = path2.basename(file);
      if (basename2.endsWith("-logs.txt"))
        group.logsPath = file;
      else if (basename2.endsWith("-events.jsonl"))
        group.eventsPath = file;
      else if (basename2.endsWith("-metrics.jsonl"))
        group.metricsPath = file;
      else if (basename2.endsWith("-metadata.json"))
        group.metadataPath = file;
    }
    runArtifacts.set(workload, group);
  }
  return runArtifacts;
}

// report/lib/checks.ts
function generateCheckTitle(comparison, evaluation) {
  if (evaluation.failures.length > 0)
    return `${evaluation.failures.length} critical threshold(s) violated`;
  if (evaluation.warnings.length > 0)
    return `${evaluation.warnings.length} warning threshold(s) exceeded`;
  if (comparison.summary.improvements > 0)
    return `${comparison.summary.improvements} improvement(s) detected`;
  return "All metrics within thresholds";
}
function generateCheckSummary(comparison, evaluation, reportURL) {
  let lines = [
    `**Metrics analyzed:** ${comparison.summary.total}`,
    `- \uD83D\uDFE2 Stable: ${comparison.summary.stable}`,
    `- \uD83D\uDD34 Critical: ${evaluation.failures.length}`,
    `- \uD83D\uDFE1 Warnings: ${evaluation.warnings.length}`,
    `- \uD83D\uDE80 Improvements: ${comparison.summary.improvements}`,
    ""
  ];
  if (reportURL)
    lines.push(`\uD83D\uDCCA [View detailed HTML report](${reportURL})`, "");
  if (evaluation.failures.length > 0) {
    lines.push("### ⛔ Critical Thresholds Violated", "");
    for (let metric of evaluation.failures.slice(0, 5)) {
      let reason = metric.reason ? ` — ${metric.reason}` : "";
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})${reason}`);
    }
    lines.push("");
  }
  if (evaluation.warnings.length > 0) {
    lines.push("### ⚠️ Warning Thresholds Exceeded", "");
    for (let metric of evaluation.warnings.slice(0, 5)) {
      let reason = metric.reason ? ` — ${metric.reason}` : "";
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})${reason}`);
    }
    lines.push("");
  }
  let improvements = comparison.metrics.filter((m) => m.change.direction === "better").sort((a, b) => Math.abs(b.change.percent) - Math.abs(a.change.percent));
  if (improvements.length > 0) {
    lines.push("### \uD83D\uDE80 Top Improvements", "");
    for (let metric of improvements.slice(0, 5))
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`);
  }
  return lines.join(`
`);
}

// report/lib/comment.ts
var import_core3 = __toESM(require_core(), 1), import_github2 = __toESM(require_github(), 1);
function generateCommentBody(reports) {
  let totalFailures = 0, totalWarnings = 0, rows = reports.map((report) => {
    let evaluation = evaluateWorkloadThresholds(report.comparison.metrics, report.thresholds);
    if (evaluation.overall === "failure")
      totalFailures++;
    if (evaluation.overall === "warning")
      totalWarnings++;
    let emoji = evaluation.overall === "failure" ? "\uD83D\uDD34" : evaluation.overall === "warning" ? "\uD83D\uDFE1" : report.comparison.summary.improvements > 0 ? "\uD83D\uDE80" : "\uD83D\uDFE2", checkLink = report.checkUrl || "#", reportLink = report.reportUrl || "#", comp = report.comparison;
    return `| ${emoji} | ${comp.workload} | ${comp.summary.total} | ${comp.summary.regressions} | ${comp.summary.improvements} | [Report](${reportLink}) • [Check](${checkLink}) |`;
  }), statusEmoji = totalFailures > 0 ? "\uD83D\uDD34" : totalWarnings > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2", statusText = totalFailures > 0 ? `${totalFailures} workloads failed` : totalWarnings > 0 ? `${totalWarnings} workloads with warnings` : "All passed", header = [
    "## \uD83C\uDF0B SLO Test Results",
    "",
    `**Status**: ${statusEmoji} ${reports.length} workloads tested • ${statusText}`,
    ""
  ].join(`
`), content = [
    "| | Workload | Metrics | Regressions | Improvements | Links |",
    "|-|----------|---------|-------------|--------------|-------|",
    ...rows
  ].flat().join(`
`), footer = `
---
*Generated by [ydb-slo-action](https://github.com/ydb-platform/ydb-slo-action)*`;
  return header + content + footer;
}
async function findExistingComment(pull) {
  let token = import_core3.getInput("github_token"), octokit = import_github2.getOctokit(token);
  import_core3.info(`Searching for existing SLO comment in PR #${pull}...`);
  let { data: comments } = await octokit.rest.issues.listComments({
    issue_number: pull,
    owner: import_github2.context.repo.owner,
    repo: import_github2.context.repo.repo
  });
  for (let comment of comments)
    if (comment.body?.includes("\uD83C\uDF0B SLO Test Results"))
      return import_core3.info(`Found existing comment: ${comment.id}`), comment.id;
  return null;
}
async function createOrUpdateComment(pull, body) {
  let token = import_core3.getInput("github_token"), octokit = import_github2.getOctokit(token), existingId = await findExistingComment(pull);
  if (existingId) {
    import_core3.info(`Updating existing comment ${existingId}...`);
    let { data } = await octokit.rest.issues.updateComment({
      comment_id: existingId,
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      body
    });
    return import_core3.debug(`Comment updated: ${data.html_url}`), { url: data.html_url, id: data.id };
  } else {
    import_core3.info("Creating new comment...");
    let { data } = await octokit.rest.issues.createComment({
      issue_number: pull,
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      body
    });
    return import_core3.debug(`Comment created: ${data.html_url}`), { url: data.html_url, id: data.id };
  }
}

// shared/events.ts
function getEventIcon(hasDuration) {
  return hasDuration ? "⏱️" : "\uD83D\uDCCD";
}
function formatChaosEvents(events) {
  return events.map((event) => ({
    icon: getEventIcon(!!event.duration_ms),
    label: event.description,
    timestamp: event.epoch_ms,
    duration_ms: event.duration_ms
  }));
}

// report/lib/events.ts
function loadChaosEvents(content) {
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
  return formatChaosEvents(events);
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
				Current: ${escapeHtml(data.currentRef)}
			</span>
			<span class="vs">vs</span>
			<span class="commit baseline">
				Baseline: ${escapeHtml(data.baselineRef)}
			</span>
		</div>
		<div class="meta">
			<span>PR #${data.prNumber}</span>
			<span>Duration: ${((data.testEndTime - data.testStartTime) / 1000).toFixed(0)}s</span>
			<span>Generated: ${(/* @__PURE__ */ new Date()).toISOString()}</span>
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
		${generateCharts(data, data.testStartTime, data.testEndTime)}
	</section>

	<footer>
		<p>Generated by <a href="https://github.com/ydb-platform/ydb-slo-action" target="_blank">ydb-slo-action</a></p>
	</footer>

	<script src="https://cdn.jsdelivr.net/npm/chart.js/dist/chart.umd.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
	<script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation/dist/chartjs-plugin-annotation.min.js"></script>
	<script>
		${generateChartScripts(data, data.testStartTime, data.testEndTime)}
	</script>
</body>
</html>`;
}
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function getRelevantAggregates(metricName) {
  let lowerName = metricName.toLowerCase();
  if (lowerName.includes("availability") || lowerName.includes("uptime") || lowerName.includes("success_rate"))
    return ["avg", "p50"];
  if (lowerName.includes("latency") || lowerName.includes("duration") || lowerName.includes("time") || lowerName.endsWith("_ms") || lowerName.includes("delay"))
    return ["p50", "p90", "p95"];
  return ["avg", "p50", "p90", "p95"];
}
function formatAggregateName(agg) {
  return agg;
}
function generateComparisonTable(comparison) {
  return `
		<table class="comparison-table">
			<thead>
				<tr>
					<th>Metric</th>
					<th>Current</th>
					<th>Baseline</th>
					<th>Change</th>
				</tr>
			</thead>
			<tbody>
				${comparison.metrics.map((m) => {
    return `
		<tr class="${m.change.direction}">
			<td>
				<a href="#metric-${sanitizeId(m.name)}" class="metric-link">
					${escapeHtml(m.name)}
				</a>
			</td>
			<td>${formatValue(m.current.value, m.name)}</td>
			<td>${m.baseline.available ? formatValue(m.baseline.value, m.name) : "N/A"}</td>
			<td class="change-cell">${m.baseline.available ? formatChange(m.change.percent, m.change.direction) : "N/A"}</td>
		</tr>
	`;
  }).join("")}
			</tbody>
		</table>
	`;
}
function generateCharts(data, globalStartTime, globalEndTime) {
  return data.comparison.metrics.filter((m) => m.type === "range").map((comparison) => {
    let metric = data.metrics.find((m) => m.name === comparison.name);
    if (!metric)
      return "";
    if (!metric.data || metric.data.length === 0)
      return "";
    if (!metric.data.some((s) => s.values && s.values.length > 0))
      return "";
    let relevantEvents = data.events.filter((e) => e.timestamp >= globalStartTime && e.timestamp <= globalEndTime), eventsTimeline = relevantEvents.length > 0 ? generateChartEventsTimeline(relevantEvents) : "", metaSummary = "";
    if (comparison.current.aggregates && comparison.baseline.aggregates) {
      let currentAgg = comparison.current.aggregates, baseAgg = comparison.baseline.aggregates, relevantAggs = getRelevantAggregates(comparison.name), headerCells = relevantAggs.map((agg) => `<th>${formatAggregateName(agg)}</th>`).join(""), currentCells = relevantAggs.map((agg) => `<td>${formatValue(currentAgg[agg], comparison.name)}</td>`).join(""), baseCells = relevantAggs.map((agg) => `<td>${formatValue(baseAgg[agg], comparison.name)}</td>`).join("");
      metaSummary = `
					<table class="aggregates-table">
						<thead>
							<tr>
								<th></th>
								${headerCells}
							</tr>
						</thead>
						<tbody>
							<tr>
								<td class="row-label">Current</td>
								${currentCells}
							</tr>
							<tr>
								<td class="row-label">Baseline</td>
								${baseCells}
							</tr>
						</tbody>
					</table>
				`;
    } else
      metaSummary = `
					Current: ${formatValue(comparison.current.value, comparison.name)}
					${comparison.baseline.available ? ` • Baseline: ${formatValue(comparison.baseline.value, comparison.name)}` : ""}
				`;
    return `
		<div class="chart-card" id="metric-${sanitizeId(comparison.name)}">
			<div class="chart-header">
				<div class="chart-title-section">
					<h3>
						${escapeHtml(comparison.name)}
						<span class="indicator ${comparison.change.direction}">${formatChange(comparison.change.percent, comparison.change.direction)}</span>
					</h3>
				</div>
				<div class="chart-meta">
					${metaSummary}
				</div>
			</div>
			<div class="chart-container">
				<canvas id="chart-${sanitizeId(comparison.name)}"></canvas>
			</div>
			${eventsTimeline}
		</div>
	`;
  }).join("");
}
function generateChartEventsTimeline(events) {
  if (events.length === 0)
    return "";
  return `
		<div class="chart-events-timeline">
			<div class="timeline-title">Events:</div>
			<div class="timeline-events">
				${events.map((e, idx) => `
		<div class="timeline-event" data-event-id="${idx}" title="${escapeHtml(e.label)}">
			<span class="event-icon">${e.icon}</span>
			<span class="event-time">${formatTimestamp(e.timestamp)}</span>
			<span class="event-label">${escapeHtml(e.label)}</span>
		</div>
	`).join("")}
			</div>
		</div>
	`;
}
function generateChartScripts(data, globalStartTime, globalEndTime) {
  return data.comparison.metrics.filter((m) => m.type === "range").map((comparison) => {
    let metric = data.metrics.find((m) => m.name === comparison.name);
    if (!metric)
      return "";
    if (!metric.data || metric.data.length === 0)
      return "";
    if (!metric.data.some((s) => s.values && s.values.length > 0))
      return "";
    return generateSingleChartScript(comparison.name, metric, data.events, globalStartTime, globalEndTime, data.currentRef, data.baselineRef);
  }).join(`
`);
}
function filterOutliers(values) {
  if (values.length === 0)
    return values;
  let nums = values.map(([, v]) => parseFloat(v)).filter((n) => !isNaN(n));
  if (nums.length === 0)
    return values;
  nums.sort((a, b) => a - b);
  let p1Index = Math.floor(nums.length * 0.01), p99Index = Math.floor(nums.length * 0.99), p1 = nums[p1Index], p99 = nums[p99Index];
  return values.filter(([, v]) => {
    let num = parseFloat(v);
    return !isNaN(num) && num >= p1 && num <= p99;
  });
}
function generateSingleChartScript(metricName, metric, events, globalStartTime, globalEndTime, currentRef, baselineRef) {
  let currentSeries = metric.data.find((s) => s.metric.ref === currentRef), baselineSeries = metric.data.find((s) => s.metric.ref === baselineRef), filteredCurrentValues = currentSeries ? filterOutliers(currentSeries.values) : [], filteredBaselineValues = baselineSeries ? filterOutliers(baselineSeries.values) : [], currentData = filteredCurrentValues.length > 0 ? JSON.stringify(filteredCurrentValues.map(([t, v]) => ({ x: t * 1000, y: parseFloat(v) }))) : "[]", baselineData = filteredBaselineValues.length > 0 ? JSON.stringify(filteredBaselineValues.map(([t, v]) => ({ x: t * 1000, y: parseFloat(v) }))) : "[]", boundaryAnnotations = [
    `{
			type: 'line',
			xMin: ${globalStartTime},
			xMax: ${globalStartTime},
			borderColor: '#10b981',
			borderWidth: 2,
			borderDash: [5, 5]
		}`,
    `{
			type: 'line',
			xMin: ${globalEndTime},
			xMax: ${globalEndTime},
			borderColor: '#ef4444',
			borderWidth: 2,
			borderDash: [5, 5]
		}`
  ], boxAnnotations = [], lineAnnotations = [];
  for (let i = 0;i < events.length; i++) {
    let e = events[i];
    if (e.duration_ms) {
      let xMax = e.timestamp + e.duration_ms;
      boxAnnotations.push(`{
			id: 'event-bg-${i}',
			type: 'box',
			drawTime: 'beforeDatasetsDraw',
			xMin: ${e.timestamp},
			xMax: ${xMax},
			backgroundColor: 'rgba(251, 146, 60, 0.08)',
			borderColor: 'transparent',
			borderWidth: 0
		}`), boxAnnotations.push(`{
			id: 'event-bar-${i}',
			type: 'box',
			drawTime: 'beforeDatasetsDraw',
			xMin: ${e.timestamp},
			xMax: ${xMax},
			yMin: (ctx) => ctx.chart.scales.y.min,
			yMax: (ctx) => ctx.chart.scales.y.min + (ctx.chart.scales.y.max - ctx.chart.scales.y.min) * 0.02,
			backgroundColor: '#f97316',
			borderColor: 'transparent',
			borderWidth: 0
		}`);
    } else
      lineAnnotations.push(`{
			id: 'event-line-${i}',
			type: 'line',
			drawTime: 'afterDatasetsDraw',
			xMin: ${e.timestamp},
			xMax: ${e.timestamp},
			borderColor: '#f97316',
			borderWidth: 2
		}`);
  }
  let allAnnotations = [...boxAnnotations, ...boundaryAnnotations, ...lineAnnotations].join(`,
`);
  return `
(function() {
	const ctx = document.getElementById('chart-${sanitizeId(metricName)}');
	if (!ctx) return;

	const chart = new Chart(ctx, {
		type: 'line',
		data: {
		datasets: [
			{
				label: '${escapeHtml(currentRef)}',
				data: ${currentData},
				borderColor: '#3b82f6',
				backgroundColor: '#3b82f620',
				borderWidth: 2,
				pointRadius: 2,
				pointHoverRadius: 4,
				tension: 0.1,
				fill: true
			},
			${baselineSeries ? `{
				label: '${escapeHtml(baselineRef)}',
				data: ${baselineData},
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
				min: ${globalStartTime},
				max: ${globalEndTime},
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
					grace: '10%',
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
					annotations: [${allAnnotations}]
				}
			}
		}
	});

	// Store chart reference for interaction
	ctx.chartInstance = chart;

	// Add hover handlers for timeline events
	const chartCard = ctx.closest('.chart-card');
	if (chartCard) {
		const timelineEvents = chartCard.querySelectorAll('.timeline-event');
		timelineEvents.forEach((eventEl) => {
			const eventId = parseInt(eventEl.getAttribute('data-event-id'));

			eventEl.addEventListener('mouseenter', () => {
				// Access annotations array
				const annotations = chart.config.options.plugins.annotation.annotations;

				// Find and update annotations for this event
				for (let i = 0; i < annotations.length; i++) {
					const ann = annotations[i];
					if (ann.id === 'event-bg-' + eventId) {
						ann.backgroundColor = 'rgba(251, 146, 60, 0.35)';
					} else if (ann.id === 'event-bar-' + eventId) {
						ann.backgroundColor = '#fb923c';
					} else if (ann.id === 'event-line-' + eventId) {
						ann.borderColor = '#fb923c';
						ann.borderWidth = 4;
					}
				}

				chart.update('none');
			});

			eventEl.addEventListener('mouseleave', () => {
				// Access annotations array
				const annotations = chart.config.options.plugins.annotation.annotations;

				// Restore annotations for this event
				for (let i = 0; i < annotations.length; i++) {
					const ann = annotations[i];
					if (ann.id === 'event-bg-' + eventId) {
						ann.backgroundColor = 'rgba(251, 146, 60, 0.08)';
					} else if (ann.id === 'event-bar-' + eventId) {
						ann.backgroundColor = '#f97316';
					} else if (ann.id === 'event-line-' + eventId) {
						ann.borderColor = '#f97316';
						ann.borderWidth = 2;
					}
				}

				chart.update('none');
			});
		});
	}
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
  let date = new Date(timestamp), hours = date.getHours().toString().padStart(2, "0"), minutes = date.getMinutes().toString().padStart(2, "0"), seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
}
function getStyles() {
  return `
* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

html {
	scroll-behavior: smooth;
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

.commit.baseline {
	background: #ddf4ff;
	color: #0969da;
}

@media (prefers-color-scheme: dark) {
	.commit.current {
		background: #033a16;
		color: #3fb950;
	}
	.commit.baseline {
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

.metric-link {
	color: #0969da;
	text-decoration: none;
}

.metric-link:hover {
	text-decoration: underline;
}

@media (prefers-color-scheme: dark) {
	.metric-link {
		color: #58a6ff;
	}
}

.chart-card {
	margin-bottom: 40px;
	background: #ffffff;
	border: 1px solid #d0d7de;
	border-radius: 8px;
	padding: 20px;
	scroll-margin-top: 20px;
}

@media (prefers-color-scheme: dark) {
	.chart-card {
		background: #0d1117;
		border-color: #30363d;
	}
}

.chart-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 24px;
	margin-bottom: 15px;
}

.chart-title-section h3 {
	font-size: 18px;
	display: flex;
	align-items: center;
	gap: 10px;
	flex-wrap: wrap;
	margin: 0;
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
	flex-shrink: 0;
}

.aggregates-table {
	width: auto;
	border-collapse: collapse;
	font-size: 13px;
}

.aggregates-table th {
	font-weight: 600;
	padding: 4px 12px;
	text-align: center;
	color: #656d76;
	font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
}

.aggregates-table td {
	padding: 4px 12px;
	text-align: center;
	font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
}

.aggregates-table .row-label {
	font-weight: 600;
	text-align: right;
	color: #1f2328;
	padding-right: 16px;
}

@media (prefers-color-scheme: dark) {
	.aggregates-table .row-label {
		color: #e6edf3;
	}
}

.chart-container {
	position: relative;
	height: 400px;
}

.chart-events-timeline {
	margin-top: 15px;
	padding-top: 15px;
	border-top: 1px solid #e5e7eb;
}

@media (prefers-color-scheme: dark) {
	.chart-events-timeline {
		border-top-color: #30363d;
	}
}

.timeline-title {
	font-size: 13px;
	font-weight: 600;
	color: #656d76;
	margin-bottom: 10px;
}

.timeline-events {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.timeline-event {
	display: flex;
	align-items: center;
	gap: 10px;
	padding: 8px 12px;
	background: #f6f8fa;
	border-radius: 6px;
	font-size: 13px;
	transition: all 0.2s;
	cursor: pointer;
	border: 2px solid transparent;
}

.timeline-event:hover {
	background: #fff5ed;
	border-color: #fb923c;
	box-shadow: 0 2px 8px rgba(251, 146, 60, 0.2);
	transform: translateX(4px);
}

@media (prefers-color-scheme: dark) {
	.timeline-event {
		background: #161b22;
		border-color: transparent;
	}

	.timeline-event:hover {
		background: #2d1810;
		border-color: #fb923c;
		box-shadow: 0 2px 8px rgba(251, 146, 60, 0.3);
	}
}

.event-icon {
	font-size: 16px;
	flex-shrink: 0;
}

.event-time {
	font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace;
	font-size: 12px;
	color: #656d76;
	flex-shrink: 0;
}

.event-label {
	color: #1f2328;
	flex-grow: 1;
}

@media (prefers-color-scheme: dark) {
	.event-label {
		color: #e6edf3;
	}
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

// report/lib/metrics.ts
function loadCollectedMetrics(content) {
  let metrics = [], lines = content.trim().split(`
`);
  for (let line of lines) {
    if (!line.trim())
      continue;
    try {
      let metric = JSON.parse(line);
      metrics.push(metric);
    } catch {
      continue;
    }
  }
  return metrics;
}

// report/main.ts
process.env.GITHUB_ACTION_PATH ??= fileURLToPath(new URL("../..", import.meta.url));
async function main() {
  let cwd = path3.join(process.cwd(), ".slo-reports");
  await fs3.mkdir(cwd, { recursive: !0 });
  let runArtifacts = await downloadRunArtifacts(cwd);
  if (import_core4.info(`Found ${runArtifacts.size} artifacts: ${[...runArtifacts.keys()].join(", ")}`), runArtifacts.size === 0) {
    import_core4.setFailed("No workload artifacts found in current run");
    return;
  }
  let pull = import_github3.context.issue.number, reports = [], thresholds = await loadThresholdConfig();
  for (let [, artifact] of runArtifacts) {
    if (!artifact.metadataPath || !artifact.metricsPath || !artifact.eventsPath) {
      import_core4.info(`Skipping artifact ${artifact.name}: missing required files`);
      continue;
    }
    let events = loadChaosEvents(await fs3.readFile(artifact.eventsPath, "utf-8")), metrics = loadCollectedMetrics(await fs3.readFile(artifact.metricsPath, "utf-8")), metadata = JSON.parse(await fs3.readFile(artifact.metadataPath, "utf-8"));
    if (metadata.pull && metadata.pull !== pull)
      pull = metadata.pull;
    let comparison = compareWorkloadMetrics(metadata.workload, metrics, metadata.workload_current_ref || "current", metadata.workload_baseline_ref || "baseline", "avg", thresholds.neutral_change_percent), report = {
      workload: metadata.workload,
      events,
      metrics,
      metadata,
      thresholds,
      comparison
    }, check = await createWorkloadCheck(`SLO: ${metadata.workload}`, metadata.commit, comparison, thresholds);
    report.checkUrl = check.url, reports.push(report);
  }
  if (await createWorkloadHTMLReport(cwd, reports), pull)
    await createPullRequestComment(pull, reports);
}
async function createWorkloadCheck(name, commit, comparison, thresholds, reportURL) {
  let token = import_core4.getInput("github_token"), octokit = import_github3.getOctokit(token), evaluation = evaluateWorkloadThresholds(comparison.metrics, thresholds), conclusion = "success";
  if (evaluation.overall === "failure")
    conclusion = "failure";
  if (evaluation.overall === "warning")
    conclusion = "neutral";
  let title = generateCheckTitle(comparison, evaluation), summary = generateCheckSummary(comparison, evaluation, reportURL), { data } = await octokit.rest.checks.create({
    name,
    repo: import_github3.context.repo.repo,
    owner: import_github3.context.repo.owner,
    head_sha: commit,
    status: "completed",
    conclusion,
    output: {
      title,
      summary
    }
  });
  return import_core4.debug(`Created check "${name}" with conclusion: ${conclusion}, url: ${data.html_url}`), { id: data.id, url: data.html_url };
}
async function createWorkloadHTMLReport(cwd, reports) {
  import_core4.info("\uD83D\uDCDD Generating HTML reports...");
  let artifactClient = new import_artifact2.DefaultArtifactClient, htmlFiles = [];
  for (let report of reports) {
    let htmlData = {
      workload: report.workload,
      comparison: report.comparison,
      metrics: report.metrics,
      events: report.events,
      currentRef: report.metadata.workload_current_ref || "current",
      baselineRef: report.metadata.workload_baseline_ref || "baseline",
      prNumber: report.metadata.pull,
      testStartTime: report.metadata?.start_epoch_ms || Date.now() - 600000,
      testEndTime: report.metadata?.finish_epoch_ms || Date.now()
    }, html = generateHTMLReport(htmlData), htmlPath = path3.join(cwd, `${report.workload}-report.html`);
    await fs3.writeFile(htmlPath, html, { encoding: "utf-8" }), htmlFiles.push({ workload: report.workload, path: htmlPath });
    let { id } = await artifactClient.uploadArtifact(report.workload + "-html-report", [htmlPath], cwd, {
      retentionDays: 30
    }), runId = import_github3.context.runId.toString();
    report.reportUrl = `https://api.github.com/repos/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/actions/runs/${runId}/artifacts/${id}`;
  }
}
async function createPullRequestComment(issue, reports) {
  import_core4.info("\uD83D\uDCAC Creating/updating PR comment...");
  let body = generateCommentBody(reports.map((r) => ({
    workload: r.workload,
    comparison: r.comparison,
    thresholds: r.thresholds,
    checkUrl: r.checkUrl,
    reportUrl: r.reportUrl
  })));
  await createOrUpdateComment(issue, body);
}
main();

//# debugId=7C0BB5AF8BA3FA3A64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vc2hhcmVkL3RocmVzaG9sZHMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi9jb21tZW50LnRzIiwgIi4uL3NoYXJlZC9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9odG1sLnRzIiwgIi4uL3JlcG9ydC9saWIvbWV0cmljcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJpbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzZXRGYWlsZWQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHsgY29tcGFyZVdvcmtsb2FkTWV0cmljcywgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuLi9zaGFyZWQvYW5hbHlzaXMuanMnXG5pbXBvcnQgdHlwZSB7IEZvcm1hdHRlZEV2ZW50IH0gZnJvbSAnLi4vc2hhcmVkL2V2ZW50cy5qcydcbmltcG9ydCB0eXBlIHsgVGVzdE1ldGFkYXRhIH0gZnJvbSAnLi4vc2hhcmVkL21ldGFkYXRhLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMgfSBmcm9tICcuLi9zaGFyZWQvbWV0cmljcy5qcydcbmltcG9ydCB7IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzLCBsb2FkVGhyZXNob2xkQ29uZmlnLCB0eXBlIFRocmVzaG9sZENvbmZpZyB9IGZyb20gJy4uL3NoYXJlZC90aHJlc2hvbGRzLmpzJ1xuaW1wb3J0IHsgZG93bmxvYWRSdW5BcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBnZW5lcmF0ZUNoZWNrU3VtbWFyeSwgZ2VuZXJhdGVDaGVja1RpdGxlIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGxvYWRDaGFvc0V2ZW50cyB9IGZyb20gJy4vbGliL2V2ZW50cy5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyBsb2FkQ29sbGVjdGVkTWV0cmljcyB9IGZyb20gJy4vbGliL21ldHJpY3MuanMnXG5cbnByb2Nlc3MuZW52WydHSVRIVUJfQUNUSU9OX1BBVEgnXSA/Pz0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi8uLicsIGltcG9ydC5tZXRhLnVybCkpXG5cbnR5cGUgV29ya2xvYWRSZXBvcnQgPSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdXG5cdG1ldGFkYXRhOiBUZXN0TWV0YWRhdGFcblx0dGhyZXNob2xkczogVGhyZXNob2xkQ29uZmlnXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXG5cdGNoZWNrVXJsPzogc3RyaW5nXG5cdHJlcG9ydFVybD86IHN0cmluZ1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvLXJlcG9ydHMnKVxuXHRhd2FpdCBmcy5ta2Rpcihjd2QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0bGV0IHJ1bkFydGlmYWN0cyA9IGF3YWl0IGRvd25sb2FkUnVuQXJ0aWZhY3RzKGN3ZClcblx0aW5mbyhgRm91bmQgJHtydW5BcnRpZmFjdHMuc2l6ZX0gYXJ0aWZhY3RzOiAke1suLi5ydW5BcnRpZmFjdHMua2V5cygpXS5qb2luKCcsICcpfWApXG5cblx0aWYgKHJ1bkFydGlmYWN0cy5zaXplID09PSAwKSB7XG5cdFx0c2V0RmFpbGVkKCdObyB3b3JrbG9hZCBhcnRpZmFjdHMgZm91bmQgaW4gY3VycmVudCBydW4nKVxuXHRcdHJldHVyblxuXHR9XG5cblx0bGV0IHB1bGwgPSBjb250ZXh0Lmlzc3VlLm51bWJlclxuXHRsZXQgcmVwb3J0czogV29ya2xvYWRSZXBvcnRbXSA9IFtdXG5cdGxldCB0aHJlc2hvbGRzID0gYXdhaXQgbG9hZFRocmVzaG9sZENvbmZpZygpXG5cblx0Zm9yIChsZXQgWywgYXJ0aWZhY3RdIG9mIHJ1bkFydGlmYWN0cykge1xuXHRcdGlmICghYXJ0aWZhY3QubWV0YWRhdGFQYXRoIHx8ICFhcnRpZmFjdC5tZXRyaWNzUGF0aCB8fCAhYXJ0aWZhY3QuZXZlbnRzUGF0aCkge1xuXHRcdFx0aW5mbyhgU2tpcHBpbmcgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfTogbWlzc2luZyByZXF1aXJlZCBmaWxlc2ApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGxldCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10gPSBsb2FkQ2hhb3NFdmVudHMoYXdhaXQgZnMucmVhZEZpbGUoYXJ0aWZhY3QuZXZlbnRzUGF0aCwgJ3V0Zi04JykpXG5cdFx0bGV0IG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdID0gbG9hZENvbGxlY3RlZE1ldHJpY3MoYXdhaXQgZnMucmVhZEZpbGUoYXJ0aWZhY3QubWV0cmljc1BhdGgsICd1dGYtOCcpKVxuXHRcdGxldCBtZXRhZGF0YSA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUoYXJ0aWZhY3QubWV0YWRhdGFQYXRoLCAndXRmLTgnKSkgYXMgVGVzdE1ldGFkYXRhXG5cblx0XHRpZiAobWV0YWRhdGEucHVsbCAmJiBtZXRhZGF0YS5wdWxsICE9PSBwdWxsKSB7XG5cdFx0XHRwdWxsID0gbWV0YWRhdGEucHVsbFxuXHRcdH1cblxuXHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyZVdvcmtsb2FkTWV0cmljcyhcblx0XHRcdG1ldGFkYXRhLndvcmtsb2FkLFxuXHRcdFx0bWV0cmljcyxcblx0XHRcdG1ldGFkYXRhLndvcmtsb2FkX2N1cnJlbnRfcmVmIHx8ICdjdXJyZW50Jyxcblx0XHRcdG1ldGFkYXRhLndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZWxpbmUnLFxuXHRcdFx0J2F2ZycsXG5cdFx0XHR0aHJlc2hvbGRzLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnRcblx0XHQpXG5cblx0XHRsZXQgcmVwb3J0OiBXb3JrbG9hZFJlcG9ydCA9IHtcblx0XHRcdHdvcmtsb2FkOiBtZXRhZGF0YS53b3JrbG9hZCxcblx0XHRcdGV2ZW50cyxcblx0XHRcdG1ldHJpY3MsXG5cdFx0XHRtZXRhZGF0YSxcblx0XHRcdHRocmVzaG9sZHMsXG5cdFx0XHRjb21wYXJpc29uLFxuXHRcdH1cblxuXHRcdGxldCBjaGVjayA9IGF3YWl0IGNyZWF0ZVdvcmtsb2FkQ2hlY2soYFNMTzogJHttZXRhZGF0YS53b3JrbG9hZH1gLCBtZXRhZGF0YS5jb21taXQhLCBjb21wYXJpc29uLCB0aHJlc2hvbGRzKVxuXHRcdHJlcG9ydC5jaGVja1VybCA9IGNoZWNrLnVybFxuXG5cdFx0cmVwb3J0cy5wdXNoKHJlcG9ydClcblx0fVxuXG5cdGF3YWl0IGNyZWF0ZVdvcmtsb2FkSFRNTFJlcG9ydChjd2QsIHJlcG9ydHMpXG5cblx0aWYgKHB1bGwpIHtcblx0XHRhd2FpdCBjcmVhdGVQdWxsUmVxdWVzdENvbW1lbnQocHVsbCwgcmVwb3J0cylcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrbG9hZENoZWNrKFxuXHRuYW1lOiBzdHJpbmcsXG5cdGNvbW1pdDogc3RyaW5nLFxuXHRjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdHRocmVzaG9sZHM6IFRocmVzaG9sZENvbmZpZyxcblx0cmVwb3J0VVJMPzogc3RyaW5nXG4pIHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpXG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXZhbHVhdGlvbiA9IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKGNvbXBhcmlzb24ubWV0cmljcywgdGhyZXNob2xkcylcblx0bGV0IGNvbmNsdXNpb246ICdzdWNjZXNzJyB8ICduZXV0cmFsJyB8ICdmYWlsdXJlJyA9ICdzdWNjZXNzJ1xuXHRpZiAoZXZhbHVhdGlvbi5vdmVyYWxsID09PSAnZmFpbHVyZScpIGNvbmNsdXNpb24gPSAnZmFpbHVyZSdcblx0aWYgKGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ3dhcm5pbmcnKSBjb25jbHVzaW9uID0gJ25ldXRyYWwnXG5cblx0bGV0IHRpdGxlID0gZ2VuZXJhdGVDaGVja1RpdGxlKGNvbXBhcmlzb24sIGV2YWx1YXRpb24pXG5cdGxldCBzdW1tYXJ5ID0gZ2VuZXJhdGVDaGVja1N1bW1hcnkoY29tcGFyaXNvbiwgZXZhbHVhdGlvbiwgcmVwb3J0VVJMKVxuXG5cdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5jaGVja3MuY3JlYXRlKHtcblx0XHRuYW1lLFxuXHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0aGVhZF9zaGE6IGNvbW1pdCEsXG5cdFx0c3RhdHVzOiAnY29tcGxldGVkJyxcblx0XHRjb25jbHVzaW9uLFxuXHRcdG91dHB1dDoge1xuXHRcdFx0dGl0bGUsXG5cdFx0XHRzdW1tYXJ5LFxuXHRcdH0sXG5cdH0pXG5cblx0ZGVidWcoYENyZWF0ZWQgY2hlY2sgXCIke25hbWV9XCIgd2l0aCBjb25jbHVzaW9uOiAke2NvbmNsdXNpb259LCB1cmw6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdHJldHVybiB7IGlkOiBkYXRhLmlkLCB1cmw6IGRhdGEuaHRtbF91cmwhIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya2xvYWRIVE1MUmVwb3J0KGN3ZDogc3RyaW5nLCByZXBvcnRzOiBXb3JrbG9hZFJlcG9ydFtdKSB7XG5cdGluZm8oJ/Cfk50gR2VuZXJhdGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgaHRtbEZpbGVzOiBBcnJheTx7IHdvcmtsb2FkOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9PiA9IFtdXG5cblx0Zm9yIChsZXQgcmVwb3J0IG9mIHJlcG9ydHMpIHtcblx0XHRsZXQgaHRtbERhdGE6IEhUTUxSZXBvcnREYXRhID0ge1xuXHRcdFx0d29ya2xvYWQ6IHJlcG9ydC53b3JrbG9hZCxcblx0XHRcdGNvbXBhcmlzb246IHJlcG9ydC5jb21wYXJpc29uLFxuXHRcdFx0bWV0cmljczogcmVwb3J0Lm1ldHJpY3MsXG5cdFx0XHRldmVudHM6IHJlcG9ydC5ldmVudHMsXG5cdFx0XHRjdXJyZW50UmVmOiByZXBvcnQubWV0YWRhdGEud29ya2xvYWRfY3VycmVudF9yZWYgfHwgJ2N1cnJlbnQnLFxuXHRcdFx0YmFzZWxpbmVSZWY6IHJlcG9ydC5tZXRhZGF0YS53b3JrbG9hZF9iYXNlbGluZV9yZWYgfHwgJ2Jhc2VsaW5lJyxcblx0XHRcdHByTnVtYmVyOiByZXBvcnQubWV0YWRhdGEucHVsbCEsXG5cdFx0XHR0ZXN0U3RhcnRUaW1lOiByZXBvcnQubWV0YWRhdGE/LnN0YXJ0X2Vwb2NoX21zIHx8IERhdGUubm93KCkgLSAxMCAqIDYwICogMTAwMCxcblx0XHRcdHRlc3RFbmRUaW1lOiByZXBvcnQubWV0YWRhdGE/LmZpbmlzaF9lcG9jaF9tcyB8fCBEYXRlLm5vdygpLFxuXHRcdH1cblxuXHRcdGxldCBodG1sID0gZ2VuZXJhdGVIVE1MUmVwb3J0KGh0bWxEYXRhKVxuXHRcdGxldCBodG1sUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3JlcG9ydC53b3JrbG9hZH0tcmVwb3J0Lmh0bWxgKVxuXG5cdFx0YXdhaXQgZnMud3JpdGVGaWxlKGh0bWxQYXRoLCBodG1sLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0aHRtbEZpbGVzLnB1c2goeyB3b3JrbG9hZDogcmVwb3J0Lndvcmtsb2FkLCBwYXRoOiBodG1sUGF0aCB9KVxuXG5cdFx0bGV0IHsgaWQgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LnVwbG9hZEFydGlmYWN0KHJlcG9ydC53b3JrbG9hZCArICctaHRtbC1yZXBvcnQnLCBbaHRtbFBhdGhdLCBjd2QsIHtcblx0XHRcdHJldGVudGlvbkRheXM6IDMwLFxuXHRcdH0pXG5cblx0XHRsZXQgcnVuSWQgPSBjb250ZXh0LnJ1bklkLnRvU3RyaW5nKClcblx0XHRyZXBvcnQucmVwb3J0VXJsID0gYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2FjdGlvbnMvcnVucy8ke3J1bklkfS9hcnRpZmFjdHMvJHtpZH1gXG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlUHVsbFJlcXVlc3RDb21tZW50KGlzc3VlOiBudW1iZXIsIHJlcG9ydHM6IFdvcmtsb2FkUmVwb3J0W10pIHtcblx0aW5mbygn8J+SrCBDcmVhdGluZy91cGRhdGluZyBQUiBjb21tZW50Li4uJylcblxuXHRsZXQgYm9keSA9IGdlbmVyYXRlQ29tbWVudEJvZHkoXG5cdFx0cmVwb3J0cy5tYXAoKHIpID0+ICh7XG5cdFx0XHR3b3JrbG9hZDogci53b3JrbG9hZCxcblx0XHRcdGNvbXBhcmlzb246IHIuY29tcGFyaXNvbixcblx0XHRcdHRocmVzaG9sZHM6IHIudGhyZXNob2xkcyxcblx0XHRcdGNoZWNrVXJsOiByLmNoZWNrVXJsLFxuXHRcdFx0cmVwb3J0VXJsOiByLnJlcG9ydFVybCxcblx0XHR9KSlcblx0KVxuXHRhd2FpdCBjcmVhdGVPclVwZGF0ZUNvbW1lbnQoaXNzdWUsIGJvZHkpXG59XG5cbm1haW4oKVxuIiwKICAgICIvKipcbiAqIFNoYXJlZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gYW5kIGV2YWx1YXRpb25cbiAqXG4gKiBUaGlzIG1vZHVsZSB3YXMgY29waWVkIGZyb20gcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIGFuZCBhZGFwdGVkIHRvIGxpdmVcbiAqIHVuZGVyIHNoYXJlZC9saWIgc28gYm90aCBgaW5pdGAgYW5kIGByZXBvcnRgIGNhbiBpbXBvcnQgaXQuXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBNZXRyaWNDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBNZXRyaWNUaHJlc2hvbGQge1xuXHRuYW1lPzogc3RyaW5nIC8vIEV4YWN0IG1ldHJpYyBuYW1lIChoaWdoZXIgcHJpb3JpdHkgdGhhbiBwYXR0ZXJuKVxuXHRwYXR0ZXJuPzogc3RyaW5nIC8vIEdsb2IgcGF0dGVybiAobG93ZXIgcHJpb3JpdHkpXG5cdGRpcmVjdGlvbj86ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnXG5cdHdhcm5pbmdfbWluPzogbnVtYmVyXG5cdGNyaXRpY2FsX21pbj86IG51bWJlclxuXHR3YXJuaW5nX21heD86IG51bWJlclxuXHRjcml0aWNhbF9tYXg/OiBudW1iZXJcblx0d2FybmluZ19jaGFuZ2VfcGVyY2VudD86IG51bWJlclxuXHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudD86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVzaG9sZENvbmZpZyB7XG5cdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRkZWZhdWx0OiB7XG5cdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHR9XG5cdG1ldHJpY3M/OiBNZXRyaWNUaHJlc2hvbGRbXVxufVxuXG5leHBvcnQgdHlwZSBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJyB8ICd3YXJuaW5nJyB8ICdmYWlsdXJlJ1xuXG5leHBvcnQgdHlwZSBFdmFsdWF0ZWRUaHJlc2hvbGQgPSB7XG5cdG1ldHJpY19uYW1lOiBzdHJpbmdcblx0dGhyZXNob2xkX25hbWU/OiBzdHJpbmdcblx0dGhyZXNob2xkX3BhdHRlcm4/OiBzdHJpbmdcblx0dGhyZXNob2xkX3NldmVyaXR5OiBUaHJlc2hvbGRTZXZlcml0eVxuXHRyZWFzb24/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBQYXJzZSBZQU1MIHRocmVzaG9sZHMgY29uZmlnIHVzaW5nIGB5cWBcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGFyc2VUaHJlc2hvbGRzWWFtbCh5YW1sQ29udGVudDogc3RyaW5nKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWcgfCBudWxsPiB7XG5cdGlmICgheWFtbENvbnRlbnQgfHwgeWFtbENvbnRlbnQudHJpbSgpID09PSAnJykge1xuXHRcdHJldHVybiBudWxsXG5cdH1cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoJ3lxJywgWyctbz1qc29uJywgJy4nXSwge1xuXHRcdFx0aW5wdXQ6IEJ1ZmZlci5mcm9tKHlhbWxDb250ZW50LCAndXRmLTgnKSxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGpzb24gPSBjaHVua3Muam9pbignJylcblx0XHRsZXQgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uKSBhcyBUaHJlc2hvbGRDb25maWdcblxuXHRcdHJldHVybiBwYXJzZWRcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2UgdGhyZXNob2xkcyBZQU1MOiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG5cbi8qKlxuICogTWVyZ2UgdHdvIHRocmVzaG9sZCBjb25maWdzIChjdXN0b20gZXh0ZW5kcy9vdmVycmlkZXMgZGVmYXVsdClcbiAqL1xuZnVuY3Rpb24gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGRlZmF1bHRDb25maWc6IFRocmVzaG9sZENvbmZpZywgY3VzdG9tQ29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBUaHJlc2hvbGRDb25maWcge1xuXHQvLyBwcmV0dGllci1pZ25vcmVcblx0cmV0dXJuIHtcblx0XHRuZXV0cmFsX2NoYW5nZV9wZXJjZW50OiBjdXN0b21Db25maWcubmV1dHJhbF9jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQsXG5cdFx0ZGVmYXVsdDoge1xuXHRcdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogY3VzdG9tQ29uZmlnLmRlZmF1bHQ/Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5kZWZhdWx0Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQsXG5cdFx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDogY3VzdG9tQ29uZmlnLmRlZmF1bHQ/LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcuZGVmYXVsdC5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudCxcblx0XHR9LFxuXHRcdG1ldHJpY3M6IFsuLi4oY3VzdG9tQ29uZmlnLm1ldHJpY3MgfHwgW10pLCAuLi4oZGVmYXVsdENvbmZpZy5tZXRyaWNzIHx8IFtdKV0sXG5cdH1cbn1cblxuLyoqXG4gKiBMb2FkIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWxcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWREZWZhdWx0VGhyZXNob2xkQ29uZmlnKCk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdGRlYnVnKCdMb2FkaW5nIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIEdJVEhVQl9BQ1RJT05fUEFUSC9kZXBsb3kvdGhyZXNob2xkcy55YW1sJylcblx0bGV0IGFjdGlvblJvb3QgPSBwYXRoLnJlc29sdmUocHJvY2Vzcy5lbnZbJ0dJVEhVQl9BQ1RJT05fUEFUSCddISlcblx0bGV0IGRlZmF1bHRQYXRoID0gcGF0aC5qb2luKGFjdGlvblJvb3QsICdkZXBsb3knLCAndGhyZXNob2xkcy55YW1sJylcblxuXHRpZiAoZnMuZXhpc3RzU3luYyhkZWZhdWx0UGF0aCkpIHtcblx0XHRsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhkZWZhdWx0UGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGxldCBjb25maWcgPSBhd2FpdCBwYXJzZVRocmVzaG9sZHNZYW1sKGNvbnRlbnQpXG5cdFx0aWYgKGNvbmZpZykgcmV0dXJuIGNvbmZpZ1xuXHR9XG5cblx0Ly8gRmFsbGJhY2sgdG8gaGFyZGNvZGVkIGRlZmF1bHRzXG5cdHdhcm5pbmcoJ0NvdWxkIG5vdCBsb2FkIGRlZmF1bHQgdGhyZXNob2xkcywgdXNpbmcgaGFyZGNvZGVkIGRlZmF1bHRzJylcblx0cmV0dXJuIHtcblx0XHRuZXV0cmFsX2NoYW5nZV9wZXJjZW50OiA1LjAsXG5cdFx0ZGVmYXVsdDoge1xuXHRcdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogMjAuMCxcblx0XHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OiA1MC4wLFxuXHRcdH0sXG5cdH1cbn1cblxuLyoqXG4gKiBMb2FkIHRocmVzaG9sZHMgY29uZmlndXJhdGlvbiB3aXRoIG1lcmdpbmc6XG4gKiAxLiBMb2FkIGRlZmF1bHQgZnJvbSBkZXBsb3kvdGhyZXNob2xkcy55YW1sXG4gKiAyLiBNZXJnZSB3aXRoIGN1c3RvbSBZQU1MIChpbmxpbmUpIGlmIHByb3ZpZGVkXG4gKiAzLiBNZXJnZSB3aXRoIGN1c3RvbSBmaWxlIGlmIHByb3ZpZGVkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGhyZXNob2xkQ29uZmlnKGN1c3RvbVlhbWw/OiBzdHJpbmcsIGN1c3RvbVBhdGg/OiBzdHJpbmcpOiBQcm9taXNlPFRocmVzaG9sZENvbmZpZz4ge1xuXHRsZXQgY29uZmlnID0gYXdhaXQgbG9hZERlZmF1bHRUaHJlc2hvbGRDb25maWcoKVxuXG5cdC8vIE1lcmdlIHdpdGggY3VzdG9tIFlBTUwgKGlubGluZSlcblx0aWYgKGN1c3RvbVlhbWwpIHtcblx0XHRkZWJ1ZygnTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGlubGluZSBZQU1MJylcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjdXN0b21ZYW1sKVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHQvLyBNZXJnZSB3aXRoIGN1c3RvbSBmaWxlXG5cdGlmIChjdXN0b21QYXRoICYmIGZzLmV4aXN0c1N5bmMoY3VzdG9tUGF0aCkpIHtcblx0XHRkZWJ1ZyhgTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGZpbGU6ICR7Y3VzdG9tUGF0aH1gKVxuXHRcdGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGN1c3RvbVBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gY29uZmlnXG59XG5cbi8qKlxuICogTWF0Y2ggbWV0cmljIG5hbWUgYWdhaW5zdCBwYXR0ZXJuIChzdXBwb3J0cyB3aWxkY2FyZHMpXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybihtZXRyaWNOYW1lOiBzdHJpbmcsIHBhdHRlcm46IHN0cmluZyk6IGJvb2xlYW4ge1xuXHQvLyBDb252ZXJ0IGdsb2IgcGF0dGVybiB0byByZWdleFxuXHRsZXQgcmVnZXhQYXR0ZXJuID0gcGF0dGVyblxuXHRcdC5yZXBsYWNlKC9cXCovZywgJy4qJykgLy8gKiAtPiAuKlxuXHRcdC5yZXBsYWNlKC9cXD8vZywgJy4nKSAvLyA/IC0+IC5cblxuXHRsZXQgcmVnZXggPSBuZXcgUmVnRXhwKGBeJHtyZWdleFBhdHRlcm59JGAsICdpJylcblx0cmV0dXJuIHJlZ2V4LnRlc3QobWV0cmljTmFtZSlcbn1cblxuLyoqXG4gKiBGaW5kIG1hdGNoaW5nIHRocmVzaG9sZCBmb3IgbWV0cmljIChleGFjdCBtYXRjaCBmaXJzdCwgdGhlbiBwYXR0ZXJuKVxuICovXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQobWV0cmljTmFtZTogc3RyaW5nLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IE1ldHJpY1RocmVzaG9sZCB8IG51bGwge1xuXHRpZiAoIWNvbmZpZy5tZXRyaWNzKSByZXR1cm4gbnVsbFxuXG5cdC8vIEZpcnN0IHBhc3M6IGV4YWN0IG1hdGNoIChoaWdoZXN0IHByaW9yaXR5KVxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLm5hbWUgJiYgdGhyZXNob2xkLm5hbWUgPT09IG1ldHJpY05hbWUpIHtcblx0XHRcdHJldHVybiB0aHJlc2hvbGRcblx0XHR9XG5cdH1cblxuXHQvLyBTZWNvbmQgcGFzczogcGF0dGVybiBtYXRjaFxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLnBhdHRlcm4gJiYgbWF0Y2hQYXR0ZXJuKG1ldHJpY05hbWUsIHRocmVzaG9sZC5wYXR0ZXJuKSkge1xuXHRcdFx0cmV0dXJuIHRocmVzaG9sZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogRXZhbHVhdGUgdGhyZXNob2xkIGZvciBhIG1ldHJpYyBjb21wYXJpc29uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uOiBNZXRyaWNDb21wYXJpc29uLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IEV2YWx1YXRlZFRocmVzaG9sZCB7XG5cdGxldCB0aHJlc2hvbGQgPSBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQoY29tcGFyaXNvbi5uYW1lLCBjb25maWcpXG5cdGxldCBzZXZlcml0eTogVGhyZXNob2xkU2V2ZXJpdHkgPSAnc3VjY2Vzcydcblx0bGV0IHJlYXNvbjogc3RyaW5nIHwgdW5kZWZpbmVkXG5cblx0Ly8gQ2hlY2sgYWJzb2x1dGUgdmFsdWUgdGhyZXNob2xkcyBmaXJzdFxuXHRpZiAodGhyZXNob2xkKSB7XG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWluXG5cdFx0aWYgKHRocmVzaG9sZC5jcml0aWNhbF9taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQuY3JpdGljYWxfbWluKSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBiZWxvdyBjcml0aWNhbF9taW4gKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA8ICR7dGhyZXNob2xkLmNyaXRpY2FsX21pbn0pYClcblx0XHRcdHNldmVyaXR5ID0gJ2ZhaWx1cmUnXG5cdFx0XHRyZWFzb24gPSBgVmFsdWUgJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWUudG9GaXhlZCgyKX0gPCBjcml0aWNhbCBtaW4gJHt0aHJlc2hvbGQuY3JpdGljYWxfbWlufWBcblx0XHR9XG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWF4XG5cdFx0ZWxzZSBpZiAodGhyZXNob2xkLmNyaXRpY2FsX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC5jcml0aWNhbF9tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIGNyaXRpY2FsX21heCAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9ID4gJHt0aHJlc2hvbGQuY3JpdGljYWxfbWF4fSlgKVxuXHRcdFx0c2V2ZXJpdHkgPSAnZmFpbHVyZSdcblx0XHRcdHJlYXNvbiA9IGBWYWx1ZSAke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZS50b0ZpeGVkKDIpfSA+IGNyaXRpY2FsIG1heCAke3RocmVzaG9sZC5jcml0aWNhbF9tYXh9YFxuXHRcdH1cblx0XHQvLyBDaGVjayB3YXJuaW5nX21pblxuXHRcdGVsc2UgaWYgKHRocmVzaG9sZC53YXJuaW5nX21pbiAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA8IHRocmVzaG9sZC53YXJuaW5nX21pbikge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYmVsb3cgd2FybmluZ19taW4gKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA8ICR7dGhyZXNob2xkLndhcm5pbmdfbWlufSlgKVxuXHRcdFx0c2V2ZXJpdHkgPSAnd2FybmluZydcblx0XHRcdHJlYXNvbiA9IGBWYWx1ZSAke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZS50b0ZpeGVkKDIpfSA8IHdhcm5pbmcgbWluICR7dGhyZXNob2xkLndhcm5pbmdfbWlufWBcblx0XHR9XG5cdFx0Ly8gQ2hlY2sgd2FybmluZ19tYXhcblx0XHRlbHNlIGlmICh0aHJlc2hvbGQud2FybmluZ19tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQud2FybmluZ19tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIHdhcm5pbmdfbWF4ICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPiAke3RocmVzaG9sZC53YXJuaW5nX21heH0pYClcblx0XHRcdHNldmVyaXR5ID0gJ3dhcm5pbmcnXG5cdFx0XHRyZWFzb24gPSBgVmFsdWUgJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWUudG9GaXhlZCgyKX0gPiB3YXJuaW5nIG1heCAke3RocmVzaG9sZC53YXJuaW5nX21heH1gXG5cdFx0fVxuXHR9XG5cblx0Ly8gQ2hlY2sgY2hhbmdlIHBlcmNlbnQgdGhyZXNob2xkc1xuXHRpZiAoIWlzTmFOKGNvbXBhcmlzb24uY2hhbmdlLnBlcmNlbnQpKSB7XG5cdFx0bGV0IGNoYW5nZVBlcmNlbnQgPSBNYXRoLmFicyhjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50KVxuXG5cdFx0Ly8gVXNlIG1ldHJpYy1zcGVjaWZpYyBvciBkZWZhdWx0IHRocmVzaG9sZHNcblx0XHRsZXQgd2FybmluZ1RocmVzaG9sZCA9IHRocmVzaG9sZD8ud2FybmluZ19jaGFuZ2VfcGVyY2VudCA/PyBjb25maWcuZGVmYXVsdC53YXJuaW5nX2NoYW5nZV9wZXJjZW50XG5cdFx0bGV0IGNyaXRpY2FsVGhyZXNob2xkID0gdGhyZXNob2xkPy5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudCA/PyBjb25maWcuZGVmYXVsdC5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudFxuXG5cdFx0Ly8gT25seSB0cmlnZ2VyIGlmIGNoYW5nZSBpcyBpbiBcIndvcnNlXCIgZGlyZWN0aW9uXG5cdFx0aWYgKGNvbXBhcmlzb24uY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ3dvcnNlJykge1xuXHRcdFx0aWYgKHNldmVyaXR5ICE9PSAnZmFpbHVyZScpIHtcblx0XHRcdFx0aWYgKGNoYW5nZVBlcmNlbnQgPiBjcml0aWNhbFRocmVzaG9sZCkge1xuXHRcdFx0XHRcdHNldmVyaXR5ID0gJ2ZhaWx1cmUnXG5cdFx0XHRcdFx0cmVhc29uID0gYFJlZ3Jlc3Npb24gJHtjaGFuZ2VQZXJjZW50LnRvRml4ZWQoMil9JSA+IGNyaXRpY2FsICR7Y3JpdGljYWxUaHJlc2hvbGR9JWBcblx0XHRcdFx0fSBlbHNlIGlmIChzZXZlcml0eSAhPT0gJ3dhcm5pbmcnICYmIGNoYW5nZVBlcmNlbnQgPiB3YXJuaW5nVGhyZXNob2xkKSB7XG5cdFx0XHRcdFx0c2V2ZXJpdHkgPSAnd2FybmluZydcblx0XHRcdFx0XHRyZWFzb24gPSBgUmVncmVzc2lvbiAke2NoYW5nZVBlcmNlbnQudG9GaXhlZCgyKX0lID4gd2FybmluZyAke3dhcm5pbmdUaHJlc2hvbGR9JWBcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bWV0cmljX25hbWU6IGNvbXBhcmlzb24ubmFtZSxcblx0XHR0aHJlc2hvbGRfbmFtZTogdGhyZXNob2xkPy5uYW1lLFxuXHRcdHRocmVzaG9sZF9wYXR0ZXJuOiB0aHJlc2hvbGQ/LnBhdHRlcm4sXG5cdFx0dGhyZXNob2xkX3NldmVyaXR5OiBzZXZlcml0eSxcblx0XHRyZWFzb24sXG5cdH1cbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSBhbGwgbWV0cmljcyBhbmQgcmV0dXJuIG92ZXJhbGwgc2V2ZXJpdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKFxuXHRjb21wYXJpc29uczogTWV0cmljQ29tcGFyaXNvbltdLFxuXHRjb25maWc6IFRocmVzaG9sZENvbmZpZ1xuKToge1xuXHRvdmVyYWxsOiBUaHJlc2hvbGRTZXZlcml0eVxuXHRmYWlsdXJlczogKE1ldHJpY0NvbXBhcmlzb24gJiB7IHJlYXNvbj86IHN0cmluZyB9KVtdXG5cdHdhcm5pbmdzOiAoTWV0cmljQ29tcGFyaXNvbiAmIHsgcmVhc29uPzogc3RyaW5nIH0pW11cbn0ge1xuXHRsZXQgZmFpbHVyZXM6IChNZXRyaWNDb21wYXJpc29uICYgeyByZWFzb24/OiBzdHJpbmcgfSlbXSA9IFtdXG5cdGxldCB3YXJuaW5nczogKE1ldHJpY0NvbXBhcmlzb24gJiB7IHJlYXNvbj86IHN0cmluZyB9KVtdID0gW11cblxuXHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0bGV0IHNldmVyaXR5ID0gZXZhbHVhdGVUaHJlc2hvbGQoY29tcGFyaXNvbiwgY29uZmlnKVxuXG5cdFx0aWYgKHNldmVyaXR5LnRocmVzaG9sZF9zZXZlcml0eSA9PT0gJ2ZhaWx1cmUnKSB7XG5cdFx0XHRmYWlsdXJlcy5wdXNoKHsgLi4uY29tcGFyaXNvbiwgcmVhc29uOiBzZXZlcml0eS5yZWFzb24gfSlcblx0XHR9IGVsc2UgaWYgKHNldmVyaXR5LnRocmVzaG9sZF9zZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSB7XG5cdFx0XHR3YXJuaW5ncy5wdXNoKHsgLi4uY29tcGFyaXNvbiwgcmVhc29uOiBzZXZlcml0eS5yZWFzb24gfSlcblx0XHR9XG5cdH1cblxuXHRsZXQgb3ZlcmFsbDogVGhyZXNob2xkU2V2ZXJpdHkgPSAnc3VjY2Vzcydcblx0aWYgKGZhaWx1cmVzLmxlbmd0aCA+IDApIHtcblx0XHRvdmVyYWxsID0gJ2ZhaWx1cmUnXG5cdH0gZWxzZSBpZiAod2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdG92ZXJhbGwgPSAnd2FybmluZydcblx0fVxuXG5cdHJldHVybiB7IG92ZXJhbGwsIGZhaWx1cmVzLCB3YXJuaW5ncyB9XG59XG4iLAogICAgIi8qKlxuICogQXJ0aWZhY3RzIGRvd25sb2FkIGFuZCBwYXJzaW5nXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGRlYnVnLCBnZXRJbnB1dCwgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBjb250ZXh0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5leHBvcnQgaW50ZXJmYWNlIFdvcmtsb2FkQXJ0aWZhY3RzIHtcblx0bmFtZTogc3RyaW5nXG5cdGxvZ3NQYXRoOiBzdHJpbmdcblx0ZXZlbnRzUGF0aDogc3RyaW5nXG5cdG1ldHJpY3NQYXRoOiBzdHJpbmdcblx0bWV0YWRhdGFQYXRoOiBzdHJpbmdcbn1cblxuLyoqXG4gKiBEb3dubG9hZCBhcnRpZmFjdHMgZm9yIGEgd29ya2Zsb3cgcnVuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFJ1bkFydGlmYWN0cyhkZXN0aW5hdGlvblBhdGg6IHN0cmluZyk6IFByb21pc2U8TWFwPHN0cmluZywgV29ya2xvYWRBcnRpZmFjdHM+PiB7XG5cdGxldCB0b2tlbiA9IGdldElucHV0KCdnaXRodWJfdG9rZW4nKVxuXHRsZXQgd29ya2Zsb3dSdW5JZCA9IHBhcnNlSW50KGdldElucHV0KCdnaXRodWJfcnVuX2lkJykgfHwgU3RyaW5nKGNvbnRleHQucnVuSWQpKVxuXG5cdGlmICghdG9rZW4gfHwgIXdvcmtmbG93UnVuSWQpIHtcblx0XHR0aHJvdyBuZXcgRXJyb3IoJ0dpdEh1YiB0b2tlbiBhbmQgd29ya2Zsb3cgcnVuIElEIGFyZSByZXF1aXJlZCB0byBkb3dubG9hZCBhcnRpZmFjdHMnKVxuXHR9XG5cblx0bGV0IGFydGlmYWN0Q2xpZW50ID0gbmV3IERlZmF1bHRBcnRpZmFjdENsaWVudCgpXG5cdGxldCB7IGFydGlmYWN0cyB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQubGlzdEFydGlmYWN0cyh7XG5cdFx0ZmluZEJ5OiB7XG5cdFx0XHR0b2tlbjogdG9rZW4sXG5cdFx0XHR3b3JrZmxvd1J1bklkOiB3b3JrZmxvd1J1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU5hbWU6IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0fSxcblx0fSlcblxuXHRkZWJ1ZyhgRm91bmQgJHthcnRpZmFjdHMubGVuZ3RofSBhcnRpZmFjdHMgaW4gd29ya2Zsb3cgcnVuICR7d29ya2Zsb3dSdW5JZH1gKVxuXG5cdC8vIERvd25sb2FkIGVhY2ggYXJ0aWZhY3QgdG8gaXRzIG93biBzdWJkaXJlY3Rvcnlcblx0bGV0IGRvd25sb2FkZWRQYXRocyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcblxuXHRmb3IgKGxldCBhcnRpZmFjdCBvZiBhcnRpZmFjdHMpIHtcblx0XHRsZXQgYXJ0aWZhY3REaXIgPSBwYXRoLmpvaW4oZGVzdGluYXRpb25QYXRoLCBhcnRpZmFjdC5uYW1lKVxuXG5cdFx0ZGVidWcoYERvd25sb2FkaW5nIGFydGlmYWN0ICR7YXJ0aWZhY3QubmFtZX0uLi5gKVxuXG5cdFx0bGV0IHsgZG93bmxvYWRQYXRoIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC5kb3dubG9hZEFydGlmYWN0KGFydGlmYWN0LmlkLCB7XG5cdFx0XHRwYXRoOiBhcnRpZmFjdERpcixcblx0XHRcdGZpbmRCeToge1xuXHRcdFx0XHR0b2tlbjogdG9rZW4sXG5cdFx0XHRcdHdvcmtmbG93UnVuSWQ6IHdvcmtmbG93UnVuSWQsXG5cdFx0XHRcdHJlcG9zaXRvcnlOYW1lOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRsZXQgYXJ0aWZhY3RQYXRoID0gZG93bmxvYWRQYXRoIHx8IGFydGlmYWN0RGlyXG5cdFx0ZG93bmxvYWRlZFBhdGhzLnNldChhcnRpZmFjdC5uYW1lLCBhcnRpZmFjdFBhdGgpXG5cblx0XHRkZWJ1ZyhgRG93bmxvYWRlZCBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9IHRvICR7YXJ0aWZhY3RQYXRofWApXG5cdH1cblxuXHQvLyBHcm91cCBhcnRpZmFjdHMgYnkgd29ya2xvYWRcblx0bGV0IHJ1bkFydGlmYWN0cyA9IG5ldyBNYXA8c3RyaW5nLCBXb3JrbG9hZEFydGlmYWN0cz4oKVxuXG5cdGZvciAobGV0IFthcnRpZmFjdE5hbWUsIGFydGlmYWN0UGF0aF0gb2YgZG93bmxvYWRlZFBhdGhzKSB7XG5cdFx0Ly8gQXJ0aWZhY3QgbmFtZSBpcyB0aGUgd29ya2xvYWQgbmFtZSwgZmlsZXMgaW5zaWRlIGhhdmUgd29ya2xvYWQgcHJlZml4XG5cdFx0bGV0IHdvcmtsb2FkID0gYXJ0aWZhY3ROYW1lXG5cblx0XHQvLyBMaXN0IGZpbGVzIGluIGFydGlmYWN0IGRpcmVjdG9yeVxuXHRcdGlmICghZnMuZXhpc3RzU3luYyhhcnRpZmFjdFBhdGgpKSB7XG5cdFx0XHR3YXJuaW5nKGBBcnRpZmFjdCBwYXRoIGRvZXMgbm90IGV4aXN0OiAke2FydGlmYWN0UGF0aH1gKVxuXHRcdFx0Y29udGludWVcblx0XHR9XG5cblx0XHRsZXQgc3RhdCA9IGZzLnN0YXRTeW5jKGFydGlmYWN0UGF0aClcblx0XHRsZXQgZmlsZXM6IHN0cmluZ1tdID0gW11cblxuXHRcdGlmIChzdGF0LmlzRGlyZWN0b3J5KCkpIHtcblx0XHRcdGZpbGVzID0gZnMucmVhZGRpclN5bmMoYXJ0aWZhY3RQYXRoKS5tYXAoKGYpID0+IHBhdGguam9pbihhcnRpZmFjdFBhdGgsIGYpKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRmaWxlcyA9IFthcnRpZmFjdFBhdGhdXG5cdFx0fVxuXG5cdFx0bGV0IGdyb3VwID0gcnVuQXJ0aWZhY3RzLmdldCh3b3JrbG9hZCkgfHwgKHt9IGFzIFdvcmtsb2FkQXJ0aWZhY3RzKVxuXHRcdGdyb3VwLm5hbWUgPSB3b3JrbG9hZFxuXG5cdFx0Zm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0bGV0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKVxuXG5cdFx0XHRpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1sb2dzLnR4dCcpKSB7XG5cdFx0XHRcdGdyb3VwLmxvZ3NQYXRoID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWV2ZW50cy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLmV2ZW50c1BhdGggPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbWV0cmljcy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLm1ldHJpY3NQYXRoID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldGFkYXRhLmpzb24nKSkge1xuXHRcdFx0XHRncm91cC5tZXRhZGF0YVBhdGggPSBmaWxlXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cnVuQXJ0aWZhY3RzLnNldCh3b3JrbG9hZCwgZ3JvdXApXG5cdH1cblxuXHRyZXR1cm4gcnVuQXJ0aWZhY3RzXG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIENoZWNrcyBBUEkgaW50ZWdyYXRpb25cbiAqL1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4uLy4uL3NoYXJlZC9hbmFseXNpcy5qcydcbmltcG9ydCB7IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzIH0gZnJvbSAnLi4vLi4vc2hhcmVkL3RocmVzaG9sZHMuanMnXG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNoZWNrVGl0bGUoXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvbixcblx0ZXZhbHVhdGlvbjogUmV0dXJuVHlwZTx0eXBlb2YgZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHM+XG4pOiBzdHJpbmcge1xuXHRpZiAoZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGggPiAwKSB7XG5cdFx0cmV0dXJuIGAke2V2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RofSBjcml0aWNhbCB0aHJlc2hvbGQocykgdmlvbGF0ZWRgXG5cdH1cblxuXHRpZiAoZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0cmV0dXJuIGAke2V2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RofSB3YXJuaW5nIHRocmVzaG9sZChzKSBleGNlZWRlZGBcblx0fVxuXG5cdGlmIChjb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzID4gMCkge1xuXHRcdHJldHVybiBgJHtjb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzfSBpbXByb3ZlbWVudChzKSBkZXRlY3RlZGBcblx0fVxuXG5cdHJldHVybiAnQWxsIG1ldHJpY3Mgd2l0aGluIHRocmVzaG9sZHMnXG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNoZWNrU3VtbWFyeShcblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uLFxuXHRldmFsdWF0aW9uOiBSZXR1cm5UeXBlPHR5cGVvZiBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcz4sXG5cdHJlcG9ydFVSTD86IHN0cmluZ1xuKTogc3RyaW5nIHtcblx0bGV0IGxpbmVzID0gW1xuXHRcdGAqKk1ldHJpY3MgYW5hbHl6ZWQ6KiogJHtjb21wYXJpc29uLnN1bW1hcnkudG90YWx9YCxcblx0XHRgLSDwn5+iIFN0YWJsZTogJHtjb21wYXJpc29uLnN1bW1hcnkuc3RhYmxlfWAsXG5cdFx0YC0g8J+UtCBDcml0aWNhbDogJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH1gLFxuXHRcdGAtIPCfn6EgV2FybmluZ3M6ICR7ZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGh9YCxcblx0XHRgLSDwn5qAIEltcHJvdmVtZW50czogJHtjb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzfWAsXG5cdFx0JycsXG5cdF1cblxuXHRpZiAocmVwb3J0VVJMKSB7XG5cdFx0bGluZXMucHVzaChg8J+TiiBbVmlldyBkZXRhaWxlZCBIVE1MIHJlcG9ydF0oJHtyZXBvcnRVUkx9KWAsICcnKVxuXHR9XG5cblx0Ly8gQ3JpdGljYWwgZmFpbHVyZXNcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDim5QgQ3JpdGljYWwgVGhyZXNob2xkcyBWaW9sYXRlZCcsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGV2YWx1YXRpb24uZmFpbHVyZXMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxldCByZWFzb24gPSBtZXRyaWMucmVhc29uID8gYCDigJQgJHttZXRyaWMucmVhc29ufWAgOiAnJ1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pJHtyZWFzb259YFxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdGxpbmVzLnB1c2goJycpXG5cdH1cblxuXHQvLyBXYXJuaW5nc1xuXHRpZiAoZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0bGluZXMucHVzaCgnIyMjIOKaoO+4jyBXYXJuaW5nIFRocmVzaG9sZHMgRXhjZWVkZWQnLCAnJylcblxuXHRcdGZvciAobGV0IG1ldHJpYyBvZiBldmFsdWF0aW9uLndhcm5pbmdzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsZXQgcmVhc29uID0gbWV0cmljLnJlYXNvbiA/IGAg4oCUICR7bWV0cmljLnJlYXNvbn1gIDogJydcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KSR7cmVhc29ufWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gVG9wIGltcHJvdmVtZW50c1xuXHRsZXQgaW1wcm92ZW1lbnRzID0gY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS5jaGFuZ2UuZGlyZWN0aW9uID09PSAnYmV0dGVyJylcblx0XHQuc29ydCgoYSwgYikgPT4gTWF0aC5hYnMoYi5jaGFuZ2UucGVyY2VudCkgLSBNYXRoLmFicyhhLmNoYW5nZS5wZXJjZW50KSlcblxuXHRpZiAoaW1wcm92ZW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg8J+agCBUb3AgSW1wcm92ZW1lbnRzJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgaW1wcm92ZW1lbnRzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSlgXG5cdFx0XHQpXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG59XG4iLAogICAgImltcG9ydCB7IGRlYnVnLCBnZXRJbnB1dCwgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBjb250ZXh0LCBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuaW1wb3J0IHR5cGUgeyBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuLi8uLi9zaGFyZWQvYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcywgdHlwZSBUaHJlc2hvbGRDb25maWcgfSBmcm9tICcuLi8uLi9zaGFyZWQvdGhyZXNob2xkcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBDb21tZW50UmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0dGhyZXNob2xkczogVGhyZXNob2xkQ29uZmlnXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXHRjaGVja1VybD86IHN0cmluZ1xuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBQUiBjb21tZW50IGJvZHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29tbWVudEJvZHkocmVwb3J0czogQ29tbWVudFJlcG9ydERhdGFbXSk6IHN0cmluZyB7XG5cdGxldCB0b3RhbEZhaWx1cmVzID0gMFxuXHRsZXQgdG90YWxXYXJuaW5ncyA9IDBcblxuXHRsZXQgcm93cyA9IHJlcG9ydHMubWFwKChyZXBvcnQpID0+IHtcblx0XHRsZXQgZXZhbHVhdGlvbiA9IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKHJlcG9ydC5jb21wYXJpc29uLm1ldHJpY3MsIHJlcG9ydC50aHJlc2hvbGRzKVxuXG5cdFx0aWYgKGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ2ZhaWx1cmUnKSB0b3RhbEZhaWx1cmVzKytcblx0XHRpZiAoZXZhbHVhdGlvbi5vdmVyYWxsID09PSAnd2FybmluZycpIHRvdGFsV2FybmluZ3MrK1xuXG5cdFx0bGV0IGVtb2ppID1cblx0XHRcdGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ2ZhaWx1cmUnXG5cdFx0XHRcdD8gJ/CflLQnXG5cdFx0XHRcdDogZXZhbHVhdGlvbi5vdmVyYWxsID09PSAnd2FybmluZydcblx0XHRcdFx0XHQ/ICfwn5+hJ1xuXHRcdFx0XHRcdDogcmVwb3J0LmNvbXBhcmlzb24uc3VtbWFyeS5pbXByb3ZlbWVudHMgPiAwXG5cdFx0XHRcdFx0XHQ/ICfwn5qAJ1xuXHRcdFx0XHRcdFx0OiAn8J+foidcblxuXHRcdGxldCBjaGVja0xpbmsgPSByZXBvcnQuY2hlY2tVcmwgfHwgJyMnXG5cdFx0bGV0IHJlcG9ydExpbmsgPSByZXBvcnQucmVwb3J0VXJsIHx8ICcjJ1xuXHRcdGxldCBjb21wID0gcmVwb3J0LmNvbXBhcmlzb25cblxuXHRcdHJldHVybiBgfCAke2Vtb2ppfSB8ICR7Y29tcC53b3JrbG9hZH0gfCAke2NvbXAuc3VtbWFyeS50b3RhbH0gfCAke2NvbXAuc3VtbWFyeS5yZWdyZXNzaW9uc30gfCAke2NvbXAuc3VtbWFyeS5pbXByb3ZlbWVudHN9IHwgW1JlcG9ydF0oJHtyZXBvcnRMaW5rfSkg4oCiIFtDaGVja10oJHtjaGVja0xpbmt9KSB8YFxuXHR9KVxuXG5cdGxldCBzdGF0dXNFbW9qaSA9IHRvdGFsRmFpbHVyZXMgPiAwID8gJ/CflLQnIDogdG90YWxXYXJuaW5ncyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0bGV0IHN0YXR1c1RleHQgPVxuXHRcdHRvdGFsRmFpbHVyZXMgPiAwXG5cdFx0XHQ/IGAke3RvdGFsRmFpbHVyZXN9IHdvcmtsb2FkcyBmYWlsZWRgXG5cdFx0XHQ6IHRvdGFsV2FybmluZ3MgPiAwXG5cdFx0XHRcdD8gYCR7dG90YWxXYXJuaW5nc30gd29ya2xvYWRzIHdpdGggd2FybmluZ3NgXG5cdFx0XHRcdDogJ0FsbCBwYXNzZWQnXG5cblx0bGV0IGhlYWRlciA9IFtcblx0XHRgIyMg8J+MiyBTTE8gVGVzdCBSZXN1bHRzYCxcblx0XHRgYCxcblx0XHRgKipTdGF0dXMqKjogJHtzdGF0dXNFbW9qaX0gJHtyZXBvcnRzLmxlbmd0aH0gd29ya2xvYWRzIHRlc3RlZCDigKIgJHtzdGF0dXNUZXh0fWAsXG5cdFx0JycsXG5cdF0uam9pbignXFxuJylcblxuXHRsZXQgY29udGVudCA9IFtcblx0XHQnfCB8IFdvcmtsb2FkIHwgTWV0cmljcyB8IFJlZ3Jlc3Npb25zIHwgSW1wcm92ZW1lbnRzIHwgTGlua3MgfCcsXG5cdFx0J3wtfC0tLS0tLS0tLS18LS0tLS0tLS0tfC0tLS0tLS0tLS0tLS18LS0tLS0tLS0tLS0tLS18LS0tLS0tLXwnLFxuXHRcdC4uLnJvd3MsXG5cdF1cblx0XHQuZmxhdCgpXG5cdFx0LmpvaW4oJ1xcbicpXG5cblx0bGV0IGZvb3RlciA9IGBcXG4tLS1cXG4qR2VuZXJhdGVkIGJ5IFt5ZGItc2xvLWFjdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3lkYi1wbGF0Zm9ybS95ZGItc2xvLWFjdGlvbikqYFxuXG5cdHJldHVybiBoZWFkZXIgKyBjb250ZW50ICsgZm9vdGVyXG59XG5cbi8qKlxuICogRmluZCBleGlzdGluZyBjb21tZW50IGluIFBSXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBmaW5kRXhpc3RpbmdDb21tZW50KHB1bGw6IG51bWJlcik6IFByb21pc2U8bnVtYmVyIHwgbnVsbD4ge1xuXHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJylcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXG5cdGluZm8oYFNlYXJjaGluZyBmb3IgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFIgIyR7cHVsbH0uLi5gKVxuXG5cdGxldCB7IGRhdGE6IGNvbW1lbnRzIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLmxpc3RDb21tZW50cyh7XG5cdFx0aXNzdWVfbnVtYmVyOiBwdWxsLFxuXHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdH0pXG5cblx0Zm9yIChsZXQgY29tbWVudCBvZiBjb21tZW50cykge1xuXHRcdGlmIChjb21tZW50LmJvZHk/LmluY2x1ZGVzKCfwn4yLIFNMTyBUZXN0IFJlc3VsdHMnKSkge1xuXHRcdFx0aW5mbyhgRm91bmQgZXhpc3RpbmcgY29tbWVudDogJHtjb21tZW50LmlkfWApXG5cdFx0XHRyZXR1cm4gY29tbWVudC5pZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogQ3JlYXRlIG9yIHVwZGF0ZSBQUiBjb21tZW50XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVPclVwZGF0ZUNvbW1lbnQocHVsbDogbnVtYmVyLCBib2R5OiBzdHJpbmcpOiBQcm9taXNlPHsgdXJsOiBzdHJpbmc7IGlkOiBudW1iZXIgfT4ge1xuXHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJylcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXG5cdGxldCBleGlzdGluZ0lkID0gYXdhaXQgZmluZEV4aXN0aW5nQ29tbWVudChwdWxsKVxuXG5cdGlmIChleGlzdGluZ0lkKSB7XG5cdFx0aW5mbyhgVXBkYXRpbmcgZXhpc3RpbmcgY29tbWVudCAke2V4aXN0aW5nSWR9Li4uYClcblxuXHRcdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMudXBkYXRlQ29tbWVudCh7XG5cdFx0XHRjb21tZW50X2lkOiBleGlzdGluZ0lkLFxuXHRcdFx0b3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0Ym9keSxcblx0XHR9KVxuXG5cdFx0ZGVidWcoYENvbW1lbnQgdXBkYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cblx0XHRyZXR1cm4geyB1cmw6IGRhdGEuaHRtbF91cmwhLCBpZDogZGF0YS5pZCB9XG5cdH0gZWxzZSB7XG5cdFx0aW5mbyhgQ3JlYXRpbmcgbmV3IGNvbW1lbnQuLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcblx0XHRcdGlzc3VlX251bWJlcjogcHVsbCxcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGRlYnVnKGBDb21tZW50IGNyZWF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogQ2hhb3MgZXZlbnRzIHBhcnNpbmcgYW5kIGZvcm1hdHRpbmdcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIENoYW9zRXZlbnQge1xuXHRzY3JpcHQ6IHN0cmluZ1xuXHRlcG9jaF9tczogbnVtYmVyXG5cdHRpbWVzdGFtcDogc3RyaW5nXG5cdGRlc2NyaXB0aW9uOiBzdHJpbmdcblx0ZHVyYXRpb25fbXM/OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBGb3JtYXR0ZWRFdmVudCB7XG5cdGljb246IHN0cmluZ1xuXHRsYWJlbDogc3RyaW5nXG5cdHRpbWVzdGFtcDogbnVtYmVyIC8vIG1pbGxpc2Vjb25kcyAoZXBvY2hfbXMpXG5cdGR1cmF0aW9uX21zPzogbnVtYmVyXG59XG5cbi8qKlxuICogR2V0IGljb24gZm9yIGV2ZW50IGJhc2VkIG9uIGR1cmF0aW9uXG4gKiBEdXJhdGlvbiBldmVudHMgKGludGVydmFscykgZ2V0IOKPse+4j1xuICogSW5zdGFudCBldmVudHMgZ2V0IPCfk41cbiAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRJY29uKGhhc0R1cmF0aW9uOiBib29sZWFuKTogc3RyaW5nIHtcblx0cmV0dXJuIGhhc0R1cmF0aW9uID8gJ+KPse+4jycgOiAn8J+TjSdcbn1cblxuLyoqXG4gKiBGb3JtYXQgZXZlbnRzIGZvciB2aXN1YWxpemF0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDaGFvc0V2ZW50cyhldmVudHM6IENoYW9zRXZlbnRbXSk6IEZvcm1hdHRlZEV2ZW50W10ge1xuXHRyZXR1cm4gZXZlbnRzLm1hcCgoZXZlbnQpID0+ICh7XG5cdFx0aWNvbjogZ2V0RXZlbnRJY29uKCEhZXZlbnQuZHVyYXRpb25fbXMpLFxuXHRcdGxhYmVsOiBldmVudC5kZXNjcmlwdGlvbixcblx0XHR0aW1lc3RhbXA6IGV2ZW50LmVwb2NoX21zLFxuXHRcdGR1cmF0aW9uX21zOiBldmVudC5kdXJhdGlvbl9tcyxcblx0fSkpXG59XG4iLAogICAgImltcG9ydCB7IGZvcm1hdENoYW9zRXZlbnRzLCB0eXBlIENoYW9zRXZlbnQsIHR5cGUgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXZlbnRzLmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gbG9hZENoYW9zRXZlbnRzKGNvbnRlbnQ6IHN0cmluZyk6IEZvcm1hdHRlZEV2ZW50W10ge1xuXHRsZXQgZXZlbnRzOiBDaGFvc0V2ZW50W10gPSBbXVxuXHRsZXQgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJylcblxuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWVcblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgZXZlbnQgPSBKU09OLnBhcnNlKGxpbmUpIGFzIENoYW9zRXZlbnRcblx0XHRcdGV2ZW50cy5wdXNoKGV2ZW50KVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gU2tpcCBpbnZhbGlkIGxpbmVzXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBmb3JtYXRDaGFvc0V2ZW50cyhldmVudHMpXG59XG4iLAogICAgIi8qKlxuICogSFRNTCByZXBvcnQgZ2VuZXJhdGlvbiB3aXRoIENoYXJ0LmpzXG4gKi9cblxuaW1wb3J0IHR5cGUgeyBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4uLy4uL3NoYXJlZC9ldmVudHMuanMnXG5pbXBvcnQgdHlwZSB7IENvbGxlY3RlZE1ldHJpYywgUmFuZ2VTZXJpZXMgfSBmcm9tICcuLi8uLi9zaGFyZWQvbWV0cmljcy5qcydcbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2FuYWx5c2lzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIEhUTUxSZXBvcnREYXRhIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRjdXJyZW50UmVmOiBzdHJpbmdcblx0YmFzZWxpbmVSZWY6IHN0cmluZ1xuXHRldmVudHM6IEZvcm1hdHRlZEV2ZW50W11cblx0bWV0cmljczogQ29sbGVjdGVkTWV0cmljW11cblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uXG5cdHByTnVtYmVyOiBudW1iZXJcblx0dGVzdFN0YXJ0VGltZTogbnVtYmVyIC8vIGVwb2NoIG1zXG5cdHRlc3RFbmRUaW1lOiBudW1iZXIgLy8gZXBvY2ggbXNcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBIVE1MIHJlcG9ydFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVIVE1MUmVwb3J0KGRhdGE6IEhUTUxSZXBvcnREYXRhKTogc3RyaW5nIHtcblx0cmV0dXJuIGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sIGxhbmc9XCJlblwiPlxuPGhlYWQ+XG5cdDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuXHQ8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMFwiPlxuXHQ8dGl0bGU+U0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvdGl0bGU+XG5cdDxzdHlsZT4ke2dldFN0eWxlcygpfTwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cblx0PGhlYWRlcj5cblx0XHQ8aDE+8J+MiyBTTE8gUmVwb3J0OiAke2VzY2FwZUh0bWwoZGF0YS53b3JrbG9hZCl9PC9oMT5cblx0XHQ8ZGl2IGNsYXNzPVwiY29tbWl0LWluZm9cIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiY29tbWl0IGN1cnJlbnRcIj5cblx0XHRcdFx0Q3VycmVudDogJHtlc2NhcGVIdG1sKGRhdGEuY3VycmVudFJlZil9XG5cdFx0XHQ8L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInZzXCI+dnM8L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBiYXNlbGluZVwiPlxuXHRcdFx0XHRCYXNlbGluZTogJHtlc2NhcGVIdG1sKGRhdGEuYmFzZWxpbmVSZWYpfVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJtZXRhXCI+XG5cdFx0XHQ8c3Bhbj5QUiAjJHtkYXRhLnByTnVtYmVyfTwvc3Bhbj5cblx0XHRcdDxzcGFuPkR1cmF0aW9uOiAkeygoZGF0YS50ZXN0RW5kVGltZSAtIGRhdGEudGVzdFN0YXJ0VGltZSkgLyAxMDAwKS50b0ZpeGVkKDApfXM8L3NwYW4+XG5cdFx0XHQ8c3Bhbj5HZW5lcmF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfTwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0PC9oZWFkZXI+XG5cblx0PHNlY3Rpb24gY2xhc3M9XCJzdW1tYXJ5XCI+XG5cdFx0PGgyPvCfk4ogTWV0cmljcyBPdmVydmlldzwvaDI+XG5cdFx0PGRpdiBjbGFzcz1cInN0YXRzXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS50b3RhbH08L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5Ub3RhbCBNZXRyaWNzPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgaW1wcm92ZW1lbnRzXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5pbXByb3ZlbWVudHN9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+SW1wcm92ZW1lbnRzPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgcmVncmVzc2lvbnNcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnJlZ3Jlc3Npb25zfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlJlZ3Jlc3Npb25zPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgc3RhYmxlXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5zdGFibGV9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+U3RhYmxlPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQke2dlbmVyYXRlQ29tcGFyaXNvblRhYmxlKGRhdGEuY29tcGFyaXNvbil9XG5cdDwvc2VjdGlvbj5cblxuXHQ8c2VjdGlvbiBjbGFzcz1cImNoYXJ0c1wiPlxuXHRcdDxoMj7wn5OIIFRpbWUgU2VyaWVzPC9oMj5cblx0XHQke2dlbmVyYXRlQ2hhcnRzKGRhdGEsIGRhdGEudGVzdFN0YXJ0VGltZSwgZGF0YS50ZXN0RW5kVGltZSl9XG5cdDwvc2VjdGlvbj5cblxuXHQ8Zm9vdGVyPlxuXHRcdDxwPkdlbmVyYXRlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3lkYi1wbGF0Zm9ybS95ZGItc2xvLWFjdGlvblwiIHRhcmdldD1cIl9ibGFua1wiPnlkYi1zbG8tYWN0aW9uPC9hPjwvcD5cblx0PC9mb290ZXI+XG5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0LmpzL2Rpc3QvY2hhcnQudW1kLm1pbi5qc1wiPjwvc2NyaXB0PlxuXHQ8c2NyaXB0IHNyYz1cImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vY2hhcnRqcy1hZGFwdGVyLWRhdGUtZm5zL2Rpc3QvY2hhcnRqcy1hZGFwdGVyLWRhdGUtZm5zLmJ1bmRsZS5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtcGx1Z2luLWFubm90YXRpb24vZGlzdC9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uLm1pbi5qc1wiPjwvc2NyaXB0PlxuXHQ8c2NyaXB0PlxuXHRcdCR7Z2VuZXJhdGVDaGFydFNjcmlwdHMoZGF0YSwgZGF0YS50ZXN0U3RhcnRUaW1lLCBkYXRhLnRlc3RFbmRUaW1lKX1cblx0PC9zY3JpcHQ+XG48L2JvZHk+XG48L2h0bWw+YFxufVxuXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiB0ZXh0XG5cdFx0LnJlcGxhY2UoLyYvZywgJyZhbXA7Jylcblx0XHQucmVwbGFjZSgvPC9nLCAnJmx0OycpXG5cdFx0LnJlcGxhY2UoLz4vZywgJyZndDsnKVxuXHRcdC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jylcblx0XHQucmVwbGFjZSgvJy9nLCAnJiMwMzk7Jylcbn1cblxuLyoqXG4gKiBHZXQgcmVsZXZhbnQgYWdncmVnYXRlcyBmb3IgbWV0cmljIGJhc2VkIG9uIGl0cyB0eXBlXG4gKi9cbmZ1bmN0aW9uIGdldFJlbGV2YW50QWdncmVnYXRlcyhtZXRyaWNOYW1lOiBzdHJpbmcpOiAoJ2F2ZycgfCAncDUwJyB8ICdwOTAnIHwgJ3A5NScpW10ge1xuXHRsZXQgbG93ZXJOYW1lID0gbWV0cmljTmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gQXZhaWxhYmlsaXR5IG1ldHJpY3M6IG9ubHkgYXZnIGFuZCBwNTBcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygnYXZhaWxhYmlsaXR5JykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCd1cHRpbWUnKSB8fCBsb3dlck5hbWUuaW5jbHVkZXMoJ3N1Y2Nlc3NfcmF0ZScpKSB7XG5cdFx0cmV0dXJuIFsnYXZnJywgJ3A1MCddXG5cdH1cblxuXHQvLyBMYXRlbmN5L2R1cmF0aW9uIG1ldHJpY3M6IHA1MCwgcDkwLCBwOTUgKG5vIGF2Zylcblx0aWYgKFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnbGF0ZW5jeScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkdXJhdGlvbicpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aW1lJykgfHxcblx0XHRsb3dlck5hbWUuZW5kc1dpdGgoJ19tcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkZWxheScpXG5cdCkge1xuXHRcdHJldHVybiBbJ3A1MCcsICdwOTAnLCAncDk1J11cblx0fVxuXG5cdC8vIERlZmF1bHQ6IHNob3cgYWxsXG5cdHJldHVybiBbJ2F2ZycsICdwNTAnLCAncDkwJywgJ3A5NSddXG59XG5cbi8qKlxuICogRm9ybWF0IGFnZ3JlZ2F0ZSBuYW1lIGZvciBkaXNwbGF5XG4gKi9cbmZ1bmN0aW9uIGZvcm1hdEFnZ3JlZ2F0ZU5hbWUoYWdnOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gYWdnIC8vIEtlZXAgdGVjaG5pY2FsIG5hbWVzOiBwNTAsIHA5MCwgcDk1XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ29tcGFyaXNvblRhYmxlKGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvbik6IHN0cmluZyB7XG5cdGxldCByb3dzID0gY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0Lm1hcCgobSkgPT4ge1xuXHRcdFx0cmV0dXJuIGBcblx0XHQ8dHIgY2xhc3M9XCIke20uY2hhbmdlLmRpcmVjdGlvbn1cIj5cblx0XHRcdDx0ZD5cblx0XHRcdFx0PGEgaHJlZj1cIiNtZXRyaWMtJHtzYW5pdGl6ZUlkKG0ubmFtZSl9XCIgY2xhc3M9XCJtZXRyaWMtbGlua1wiPlxuXHRcdFx0XHRcdCR7ZXNjYXBlSHRtbChtLm5hbWUpfVxuXHRcdFx0XHQ8L2E+XG5cdFx0XHQ8L3RkPlxuXHRcdFx0PHRkPiR7Zm9ybWF0VmFsdWUobS5jdXJyZW50LnZhbHVlLCBtLm5hbWUpfTwvdGQ+XG5cdFx0XHQ8dGQ+JHttLmJhc2VsaW5lLmF2YWlsYWJsZSA/IGZvcm1hdFZhbHVlKG0uYmFzZWxpbmUudmFsdWUsIG0ubmFtZSkgOiAnTi9BJ308L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2hhbmdlLWNlbGxcIj4ke20uYmFzZWxpbmUuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJ308L3RkPlxuXHRcdDwvdHI+XG5cdGBcblx0XHR9KVxuXHRcdC5qb2luKCcnKVxuXG5cdHJldHVybiBgXG5cdFx0PHRhYmxlIGNsYXNzPVwiY29tcGFyaXNvbi10YWJsZVwiPlxuXHRcdFx0PHRoZWFkPlxuXHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0PHRoPk1ldHJpYzwvdGg+XG5cdFx0XHRcdFx0PHRoPkN1cnJlbnQ8L3RoPlxuXHRcdFx0XHRcdDx0aD5CYXNlbGluZTwvdGg+XG5cdFx0XHRcdFx0PHRoPkNoYW5nZTwvdGg+XG5cdFx0XHRcdDwvdHI+XG5cdFx0XHQ8L3RoZWFkPlxuXHRcdFx0PHRib2R5PlxuXHRcdFx0XHQke3Jvd3N9XG5cdFx0XHQ8L3Rib2R5PlxuXHRcdDwvdGFibGU+XG5cdGBcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydHMoZGF0YTogSFRNTFJlcG9ydERhdGEsIGdsb2JhbFN0YXJ0VGltZTogbnVtYmVyLCBnbG9iYWxFbmRUaW1lOiBudW1iZXIpOiBzdHJpbmcge1xuXHRyZXR1cm4gZGF0YS5jb21wYXJpc29uLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLnR5cGUgPT09ICdyYW5nZScpIC8vIE9ubHkgcmFuZ2UgbWV0cmljcyBoYXZlIGNoYXJ0c1xuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZmluZCgobSkgPT4gbS5uYW1lID09PSBjb21wYXJpc29uLm5hbWUpXG5cdFx0XHRpZiAoIW1ldHJpYykgcmV0dXJuICcnXG5cblx0XHRcdC8vIFNraXAgbWV0cmljcyB3aXRoIG5vIGRhdGEgKGVtcHR5IGRhdGEgYXJyYXkgb3Igbm8gc2VyaWVzKVxuXHRcdFx0aWYgKCFtZXRyaWMuZGF0YSB8fCBtZXRyaWMuZGF0YS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdC8vIFNraXAgaWYgYWxsIHNlcmllcyBhcmUgZW1wdHlcblx0XHRcdGxldCBoYXNEYXRhID0gKG1ldHJpYy5kYXRhIGFzIFJhbmdlU2VyaWVzW10pLnNvbWUoKHMpID0+IHMudmFsdWVzICYmIHMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRpZiAoIWhhc0RhdGEpIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdC8vIEZpbHRlciBldmVudHMgdGhhdCBhcmUgcmVsZXZhbnQgdG8gdGhpcyBtZXRyaWMncyB0aW1lZnJhbWVcblx0XHRcdGxldCByZWxldmFudEV2ZW50cyA9IGRhdGEuZXZlbnRzLmZpbHRlcihcblx0XHRcdFx0KGUpID0+IGUudGltZXN0YW1wID49IGdsb2JhbFN0YXJ0VGltZSAmJiBlLnRpbWVzdGFtcCA8PSBnbG9iYWxFbmRUaW1lXG5cdFx0XHQpXG5cblx0XHRcdGxldCBldmVudHNUaW1lbGluZSA9IHJlbGV2YW50RXZlbnRzLmxlbmd0aCA+IDAgPyBnZW5lcmF0ZUNoYXJ0RXZlbnRzVGltZWxpbmUocmVsZXZhbnRFdmVudHMpIDogJydcblxuXHRcdFx0Ly8gR2VuZXJhdGUgYWdncmVnYXRlcyBzdW1tYXJ5IGZvciBjaGFydCBoZWFkZXJcblx0XHRcdGxldCBtZXRhU3VtbWFyeSA9ICcnXG5cdFx0XHRpZiAoY29tcGFyaXNvbi5jdXJyZW50LmFnZ3JlZ2F0ZXMgJiYgY29tcGFyaXNvbi5iYXNlbGluZS5hZ2dyZWdhdGVzKSB7XG5cdFx0XHRcdGxldCBjdXJyZW50QWdnID0gY29tcGFyaXNvbi5jdXJyZW50LmFnZ3JlZ2F0ZXNcblx0XHRcdFx0bGV0IGJhc2VBZ2cgPSBjb21wYXJpc29uLmJhc2VsaW5lLmFnZ3JlZ2F0ZXNcblxuXHRcdFx0XHQvLyBHZXQgcmVsZXZhbnQgYWdncmVnYXRlcyBmb3IgdGhpcyBtZXRyaWNcblx0XHRcdFx0bGV0IHJlbGV2YW50QWdncyA9IGdldFJlbGV2YW50QWdncmVnYXRlcyhjb21wYXJpc29uLm5hbWUpXG5cblx0XHRcdFx0Ly8gR2VuZXJhdGUgdGFibGUgaGVhZGVyXG5cdFx0XHRcdGxldCBoZWFkZXJDZWxscyA9IHJlbGV2YW50QWdncy5tYXAoKGFnZykgPT4gYDx0aD4ke2Zvcm1hdEFnZ3JlZ2F0ZU5hbWUoYWdnKX08L3RoPmApLmpvaW4oJycpXG5cblx0XHRcdFx0Ly8gR2VuZXJhdGUgY3VycmVudCByb3dcblx0XHRcdFx0bGV0IGN1cnJlbnRDZWxscyA9IHJlbGV2YW50QWdnc1xuXHRcdFx0XHRcdC5tYXAoKGFnZykgPT4gYDx0ZD4ke2Zvcm1hdFZhbHVlKGN1cnJlbnRBZ2dbYWdnXSwgY29tcGFyaXNvbi5uYW1lKX08L3RkPmApXG5cdFx0XHRcdFx0LmpvaW4oJycpXG5cblx0XHRcdFx0Ly8gR2VuZXJhdGUgYmFzZWxpbmUgcm93XG5cdFx0XHRcdGxldCBiYXNlQ2VsbHMgPSByZWxldmFudEFnZ3Ncblx0XHRcdFx0XHQubWFwKChhZ2cpID0+IGA8dGQ+JHtmb3JtYXRWYWx1ZShiYXNlQWdnW2FnZ10sIGNvbXBhcmlzb24ubmFtZSl9PC90ZD5gKVxuXHRcdFx0XHRcdC5qb2luKCcnKVxuXG5cdFx0XHRcdG1ldGFTdW1tYXJ5ID0gYFxuXHRcdFx0XHRcdDx0YWJsZSBjbGFzcz1cImFnZ3JlZ2F0ZXMtdGFibGVcIj5cblx0XHRcdFx0XHRcdDx0aGVhZD5cblx0XHRcdFx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdFx0XHRcdDx0aD48L3RoPlxuXHRcdFx0XHRcdFx0XHRcdCR7aGVhZGVyQ2VsbHN9XG5cdFx0XHRcdFx0XHRcdDwvdHI+XG5cdFx0XHRcdFx0XHQ8L3RoZWFkPlxuXHRcdFx0XHRcdFx0PHRib2R5PlxuXHRcdFx0XHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicm93LWxhYmVsXCI+Q3VycmVudDwvdGQ+XG5cdFx0XHRcdFx0XHRcdFx0JHtjdXJyZW50Q2VsbHN9XG5cdFx0XHRcdFx0XHRcdDwvdHI+XG5cdFx0XHRcdFx0XHRcdDx0cj5cblx0XHRcdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyb3ctbGFiZWxcIj5CYXNlbGluZTwvdGQ+XG5cdFx0XHRcdFx0XHRcdFx0JHtiYXNlQ2VsbHN9XG5cdFx0XHRcdFx0XHRcdDwvdHI+XG5cdFx0XHRcdFx0XHQ8L3Rib2R5PlxuXHRcdFx0XHRcdDwvdGFibGU+XG5cdFx0XHRcdGBcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1ldGFTdW1tYXJ5ID0gYFxuXHRcdFx0XHRcdEN1cnJlbnQ6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlLCBjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdCR7Y29tcGFyaXNvbi5iYXNlbGluZS5hdmFpbGFibGUgPyBgIOKAoiBCYXNlbGluZTogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmJhc2VsaW5lLnZhbHVlLCBjb21wYXJpc29uLm5hbWUpfWAgOiAnJ31cblx0XHRcdFx0YFxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYFxuXHRcdDxkaXYgY2xhc3M9XCJjaGFydC1jYXJkXCIgaWQ9XCJtZXRyaWMtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtaGVhZGVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC10aXRsZS1zZWN0aW9uXCI+XG5cdFx0XHRcdFx0PGgzPlxuXHRcdFx0XHRcdFx0JHtlc2NhcGVIdG1sKGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImluZGljYXRvciAke2NvbXBhcmlzb24uY2hhbmdlLmRpcmVjdGlvbn1cIj4ke2Zvcm1hdENoYW5nZShjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50LCBjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb24pfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2gzPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LW1ldGFcIj5cblx0XHRcdFx0XHQke21ldGFTdW1tYXJ5fVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWNvbnRhaW5lclwiPlxuXHRcdFx0XHQ8Y2FudmFzIGlkPVwiY2hhcnQtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+PC9jYW52YXM+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdCR7ZXZlbnRzVGltZWxpbmV9XG5cdFx0PC9kaXY+XG5cdGBcblx0XHR9KVxuXHRcdC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNoYXJ0RXZlbnRzVGltZWxpbmUoZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdKTogc3RyaW5nIHtcblx0aWYgKGV2ZW50cy5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG5cdGxldCBldmVudEl0ZW1zID0gZXZlbnRzXG5cdFx0Lm1hcChcblx0XHRcdChlLCBpZHgpID0+IGBcblx0XHQ8ZGl2IGNsYXNzPVwidGltZWxpbmUtZXZlbnRcIiBkYXRhLWV2ZW50LWlkPVwiJHtpZHh9XCIgdGl0bGU9XCIke2VzY2FwZUh0bWwoZS5sYWJlbCl9XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LWljb25cIj4ke2UuaWNvbn08L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LXRpbWVcIj4ke2Zvcm1hdFRpbWVzdGFtcChlLnRpbWVzdGFtcCl9PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1sYWJlbFwiPiR7ZXNjYXBlSHRtbChlLmxhYmVsKX08L3NwYW4+XG5cdFx0PC9kaXY+XG5cdGBcblx0XHQpXG5cdFx0LmpvaW4oJycpXG5cblx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtZXZlbnRzLXRpbWVsaW5lXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwidGltZWxpbmUtdGl0bGVcIj5FdmVudHM6PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwidGltZWxpbmUtZXZlbnRzXCI+XG5cdFx0XHRcdCR7ZXZlbnRJdGVtc31cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGE6IEhUTUxSZXBvcnREYXRhLCBnbG9iYWxTdGFydFRpbWU6IG51bWJlciwgZ2xvYmFsRW5kVGltZTogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IGNoYXJ0U2NyaXB0cyA9IGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKVxuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZmluZCgobSkgPT4gbS5uYW1lID09PSBjb21wYXJpc29uLm5hbWUpXG5cdFx0XHRpZiAoIW1ldHJpYykgcmV0dXJuICcnXG5cblx0XHRcdC8vIFNraXAgbWV0cmljcyB3aXRoIG5vIGRhdGFcblx0XHRcdGlmICghbWV0cmljLmRhdGEgfHwgbWV0cmljLmRhdGEubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXHRcdFx0bGV0IGhhc0RhdGEgPSAobWV0cmljLmRhdGEgYXMgUmFuZ2VTZXJpZXNbXSkuc29tZSgocykgPT4gcy52YWx1ZXMgJiYgcy52YWx1ZXMubGVuZ3RoID4gMClcblx0XHRcdGlmICghaGFzRGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoXG5cdFx0XHRcdGNvbXBhcmlzb24ubmFtZSxcblx0XHRcdFx0bWV0cmljIGFzIENvbGxlY3RlZE1ldHJpYyxcblx0XHRcdFx0ZGF0YS5ldmVudHMsXG5cdFx0XHRcdGdsb2JhbFN0YXJ0VGltZSxcblx0XHRcdFx0Z2xvYmFsRW5kVGltZSxcblx0XHRcdFx0ZGF0YS5jdXJyZW50UmVmLFxuXHRcdFx0XHRkYXRhLmJhc2VsaW5lUmVmXG5cdFx0XHQpXG5cdFx0fSlcblx0XHQuam9pbignXFxuJylcblxuXHRyZXR1cm4gY2hhcnRTY3JpcHRzXG59XG5cbi8qKlxuICogRmlsdGVyIG91dGxpZXJzIGZyb20gdGltZSBzZXJpZXMgZGF0YSB1c2luZyBwZXJjZW50aWxlc1xuICogUmVtb3ZlcyB2YWx1ZXMgb3V0c2lkZSBbcDEsIHA5OV0gcmFuZ2VcbiAqL1xuZnVuY3Rpb24gZmlsdGVyT3V0bGllcnModmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10pOiBbbnVtYmVyLCBzdHJpbmddW10ge1xuXHRpZiAodmFsdWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlc1xuXG5cdC8vIEV4dHJhY3QgbnVtZXJpYyB2YWx1ZXNcblx0bGV0IG51bXMgPSB2YWx1ZXMubWFwKChbLCB2XSkgPT4gcGFyc2VGbG9hdCh2KSkuZmlsdGVyKChuKSA9PiAhaXNOYU4obikpXG5cdGlmIChudW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlc1xuXG5cdC8vIFNvcnQgZm9yIHBlcmNlbnRpbGUgY2FsY3VsYXRpb25cblx0bnVtcy5zb3J0KChhLCBiKSA9PiBhIC0gYilcblxuXHQvLyBDYWxjdWxhdGUgcDEgYW5kIHA5OVxuXHRsZXQgcDFJbmRleCA9IE1hdGguZmxvb3IobnVtcy5sZW5ndGggKiAwLjAxKVxuXHRsZXQgcDk5SW5kZXggPSBNYXRoLmZsb29yKG51bXMubGVuZ3RoICogMC45OSlcblx0bGV0IHAxID0gbnVtc1twMUluZGV4XVxuXHRsZXQgcDk5ID0gbnVtc1twOTlJbmRleF1cblxuXHQvLyBGaWx0ZXIgdmFsdWVzIHdpdGhpbiBbcDEsIHA5OV1cblx0cmV0dXJuIHZhbHVlcy5maWx0ZXIoKFssIHZdKSA9PiB7XG5cdFx0bGV0IG51bSA9IHBhcnNlRmxvYXQodilcblx0XHRyZXR1cm4gIWlzTmFOKG51bSkgJiYgbnVtID49IHAxICYmIG51bSA8PSBwOTlcblx0fSlcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTaW5nbGVDaGFydFNjcmlwdChcblx0bWV0cmljTmFtZTogc3RyaW5nLFxuXHRtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyxcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdLFxuXHRnbG9iYWxTdGFydFRpbWU6IG51bWJlcixcblx0Z2xvYmFsRW5kVGltZTogbnVtYmVyLFxuXHRjdXJyZW50UmVmOiBzdHJpbmcsXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBjdXJyZW50U2VyaWVzID0gKG1ldHJpYy5kYXRhIGFzIFJhbmdlU2VyaWVzW10pLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gY3VycmVudFJlZilcblx0bGV0IGJhc2VsaW5lU2VyaWVzID0gKG1ldHJpYy5kYXRhIGFzIFJhbmdlU2VyaWVzW10pLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gYmFzZWxpbmVSZWYpXG5cblx0Ly8gRmlsdGVyIG91dGxpZXJzIGZyb20gYm90aCBzZXJpZXNcblx0bGV0IGZpbHRlcmVkQ3VycmVudFZhbHVlcyA9IGN1cnJlbnRTZXJpZXMgPyBmaWx0ZXJPdXRsaWVycyhjdXJyZW50U2VyaWVzLnZhbHVlcykgOiBbXVxuXHRsZXQgZmlsdGVyZWRCYXNlbGluZVZhbHVlcyA9IGJhc2VsaW5lU2VyaWVzID8gZmlsdGVyT3V0bGllcnMoYmFzZWxpbmVTZXJpZXMudmFsdWVzKSA6IFtdXG5cblx0bGV0IGN1cnJlbnREYXRhID1cblx0XHRmaWx0ZXJlZEN1cnJlbnRWYWx1ZXMubGVuZ3RoID4gMFxuXHRcdFx0PyBKU09OLnN0cmluZ2lmeShmaWx0ZXJlZEN1cnJlbnRWYWx1ZXMubWFwKChbdCwgdl0pID0+ICh7IHg6IHQgKiAxMDAwLCB5OiBwYXJzZUZsb2F0KHYpIH0pKSlcblx0XHRcdDogJ1tdJ1xuXG5cdGxldCBiYXNlbGluZURhdGEgPVxuXHRcdGZpbHRlcmVkQmFzZWxpbmVWYWx1ZXMubGVuZ3RoID4gMFxuXHRcdFx0PyBKU09OLnN0cmluZ2lmeShmaWx0ZXJlZEJhc2VsaW5lVmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0XHQ6ICdbXSdcblxuXHQvLyBHZW5lcmF0ZSBhbm5vdGF0aW9ucyBmb3IgdGVzdCBib3VuZGFyaWVzXG5cdGxldCBib3VuZGFyeUFubm90YXRpb25zOiBzdHJpbmdbXSA9IFtcblx0XHRge1xuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0eE1pbjogJHtnbG9iYWxTdGFydFRpbWV9LFxuXHRcdFx0eE1heDogJHtnbG9iYWxTdGFydFRpbWV9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjMTBiOTgxJyxcblx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdXG5cdFx0fWAsXG5cdFx0YHtcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdHhNaW46ICR7Z2xvYmFsRW5kVGltZX0sXG5cdFx0XHR4TWF4OiAke2dsb2JhbEVuZFRpbWV9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjZWY0NDQ0Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdXG5cdFx0fWAsXG5cdF1cblxuXHQvLyBTZXBhcmF0ZSBldmVudHMgaW50byBib3hlcyAod2l0aCBkdXJhdGlvbikgYW5kIGxpbmVzIChpbnN0YW50KVxuXHRsZXQgYm94QW5ub3RhdGlvbnM6IHN0cmluZ1tdID0gW11cblx0bGV0IGxpbmVBbm5vdGF0aW9uczogc3RyaW5nW10gPSBbXVxuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0bGV0IGUgPSBldmVudHNbaV1cblx0XHRpZiAoZS5kdXJhdGlvbl9tcykge1xuXHRcdFx0Ly8gQm94IGFubm90YXRpb24gZm9yIGV2ZW50cyB3aXRoIGR1cmF0aW9uICh0aW1lc3RhbXAgYWxyZWFkeSBpbiBtcylcblx0XHRcdGxldCB4TWF4ID0gZS50aW1lc3RhbXAgKyBlLmR1cmF0aW9uX21zXG5cdFx0XHQvLyBBZGQgc2VtaS10cmFuc3BhcmVudCBib3ggKGJlaGluZCBncmFwaClcblx0XHRcdGJveEFubm90YXRpb25zLnB1c2goYHtcblx0XHRcdGlkOiAnZXZlbnQtYmctJHtpfScsXG5cdFx0XHR0eXBlOiAnYm94Jyxcblx0XHRcdGRyYXdUaW1lOiAnYmVmb3JlRGF0YXNldHNEcmF3Jyxcblx0XHRcdHhNaW46ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0eE1heDogJHt4TWF4fSxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMjUxLCAxNDYsIDYwLCAwLjA4KScsXG5cdFx0XHRib3JkZXJDb2xvcjogJ3RyYW5zcGFyZW50Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAwXG5cdFx0fWApXG5cdFx0XHQvLyBBZGQgdGhpY2sgaG9yaXpvbnRhbCBsaW5lIGF0IGJvdHRvbSAoYmVoaW5kIGdyYXBoKVxuXHRcdFx0Ym94QW5ub3RhdGlvbnMucHVzaChge1xuXHRcdFx0aWQ6ICdldmVudC1iYXItJHtpfScsXG5cdFx0XHR0eXBlOiAnYm94Jyxcblx0XHRcdGRyYXdUaW1lOiAnYmVmb3JlRGF0YXNldHNEcmF3Jyxcblx0XHRcdHhNaW46ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0eE1heDogJHt4TWF4fSxcblx0XHRcdHlNaW46IChjdHgpID0+IGN0eC5jaGFydC5zY2FsZXMueS5taW4sXG5cdFx0XHR5TWF4OiAoY3R4KSA9PiBjdHguY2hhcnQuc2NhbGVzLnkubWluICsgKGN0eC5jaGFydC5zY2FsZXMueS5tYXggLSBjdHguY2hhcnQuc2NhbGVzLnkubWluKSAqIDAuMDIsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZjk3MzE2Jyxcblx0XHRcdGJvcmRlckNvbG9yOiAndHJhbnNwYXJlbnQnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDBcblx0XHR9YClcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gTGluZSBhbm5vdGF0aW9uIGZvciBpbnN0YW50IGV2ZW50cyAodGltZXN0YW1wIGFscmVhZHkgaW4gbXMpXG5cdFx0XHRsaW5lQW5ub3RhdGlvbnMucHVzaChge1xuXHRcdFx0aWQ6ICdldmVudC1saW5lLSR7aX0nLFxuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0ZHJhd1RpbWU6ICdhZnRlckRhdGFzZXRzRHJhdycsXG5cdFx0XHR4TWluOiAke2UudGltZXN0YW1wfSxcblx0XHRcdHhNYXg6ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjZjk3MzE2Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAyXG5cdFx0fWApXG5cdFx0fVxuXHR9XG5cblx0Ly8gQ29tYmluZSBhbGwgYW5ub3RhdGlvbnM6IGJveGVzIGZpcnN0IChiZWhpbmQpLCB0aGVuIGJvdW5kYXJpZXMsIHRoZW4gbGluZXMgKGZyb250KVxuXHRsZXQgYWxsQW5ub3RhdGlvbnMgPSBbLi4uYm94QW5ub3RhdGlvbnMsIC4uLmJvdW5kYXJ5QW5ub3RhdGlvbnMsIC4uLmxpbmVBbm5vdGF0aW9uc10uam9pbignLFxcbicpXG5cblx0cmV0dXJuIGBcbihmdW5jdGlvbigpIHtcblx0Y29uc3QgY3R4ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXJ0LSR7c2FuaXRpemVJZChtZXRyaWNOYW1lKX0nKTtcblx0aWYgKCFjdHgpIHJldHVybjtcblxuXHRjb25zdCBjaGFydCA9IG5ldyBDaGFydChjdHgsIHtcblx0XHR0eXBlOiAnbGluZScsXG5cdFx0ZGF0YToge1xuXHRcdGRhdGFzZXRzOiBbXG5cdFx0XHR7XG5cdFx0XHRcdGxhYmVsOiAnJHtlc2NhcGVIdG1sKGN1cnJlbnRSZWYpfScsXG5cdFx0XHRcdGRhdGE6ICR7Y3VycmVudERhdGF9LFxuXHRcdFx0XHRib3JkZXJDb2xvcjogJyMzYjgyZjYnLFxuXHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjM2I4MmY2MjAnLFxuXHRcdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdHRlbnNpb246IDAuMSxcblx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdCR7XG5cdFx0XHRcdGJhc2VsaW5lU2VyaWVzXG5cdFx0XHRcdFx0PyBge1xuXHRcdFx0XHRsYWJlbDogJyR7ZXNjYXBlSHRtbChiYXNlbGluZVJlZil9Jyxcblx0XHRcdFx0ZGF0YTogJHtiYXNlbGluZURhdGF9LFxuXHRcdFx0XHRcdGJvcmRlckNvbG9yOiAnIzk0YTNiOCcsXG5cdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzk0YTNiODIwJyxcblx0XHRcdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdFx0XHRib3JkZXJEYXNoOiBbNSwgNV0sXG5cdFx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0XHR9YFxuXHRcdFx0XHRcdDogJydcblx0XHRcdH1cblx0XHRcdF1cblx0XHR9LFxuXHRcdG9wdGlvbnM6IHtcblx0XHRcdHJlc3BvbnNpdmU6IHRydWUsXG5cdFx0XHRtYWludGFpbkFzcGVjdFJhdGlvOiBmYWxzZSxcblx0XHRcdGludGVyYWN0aW9uOiB7XG5cdFx0XHRcdG1vZGU6ICdpbmRleCcsXG5cdFx0XHRcdGludGVyc2VjdDogZmFsc2Vcblx0XHRcdH0sXG5cdFx0c2NhbGVzOiB7XG5cdFx0XHR4OiB7XG5cdFx0XHRcdHR5cGU6ICd0aW1lJyxcblx0XHRcdFx0bWluOiAke2dsb2JhbFN0YXJ0VGltZX0sXG5cdFx0XHRcdG1heDogJHtnbG9iYWxFbmRUaW1lfSxcblx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdHVuaXQ6ICdtaW51dGUnLFxuXHRcdFx0XHRcdGRpc3BsYXlGb3JtYXRzOiB7XG5cdFx0XHRcdFx0XHRtaW51dGU6ICdISDptbSdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHR0ZXh0OiAnVGltZSdcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFx0eToge1xuXHRcdFx0XHRcdGJlZ2luQXRaZXJvOiBmYWxzZSxcblx0XHRcdFx0XHRncmFjZTogJzEwJScsXG5cdFx0XHRcdFx0dGl0bGU6IHtcblx0XHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0XHR0ZXh0OiAnJHtlc2NhcGVKcyhtZXRyaWNOYW1lKX0nXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0cGx1Z2luczoge1xuXHRcdFx0XHRsZWdlbmQ6IHtcblx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdHBvc2l0aW9uOiAndG9wJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR0b29sdGlwOiB7XG5cdFx0XHRcdFx0bW9kZTogJ2luZGV4Jyxcblx0XHRcdFx0XHRpbnRlcnNlY3Q6IGZhbHNlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFubm90YXRpb246IHtcblx0XHRcdFx0XHRhbm5vdGF0aW9uczogWyR7YWxsQW5ub3RhdGlvbnN9XVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBTdG9yZSBjaGFydCByZWZlcmVuY2UgZm9yIGludGVyYWN0aW9uXG5cdGN0eC5jaGFydEluc3RhbmNlID0gY2hhcnQ7XG5cblx0Ly8gQWRkIGhvdmVyIGhhbmRsZXJzIGZvciB0aW1lbGluZSBldmVudHNcblx0Y29uc3QgY2hhcnRDYXJkID0gY3R4LmNsb3Nlc3QoJy5jaGFydC1jYXJkJyk7XG5cdGlmIChjaGFydENhcmQpIHtcblx0XHRjb25zdCB0aW1lbGluZUV2ZW50cyA9IGNoYXJ0Q2FyZC5xdWVyeVNlbGVjdG9yQWxsKCcudGltZWxpbmUtZXZlbnQnKTtcblx0XHR0aW1lbGluZUV2ZW50cy5mb3JFYWNoKChldmVudEVsKSA9PiB7XG5cdFx0XHRjb25zdCBldmVudElkID0gcGFyc2VJbnQoZXZlbnRFbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZXZlbnQtaWQnKSk7XG5cblx0XHRcdGV2ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcblx0XHRcdFx0Ly8gQWNjZXNzIGFubm90YXRpb25zIGFycmF5XG5cdFx0XHRcdGNvbnN0IGFubm90YXRpb25zID0gY2hhcnQuY29uZmlnLm9wdGlvbnMucGx1Z2lucy5hbm5vdGF0aW9uLmFubm90YXRpb25zO1xuXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHVwZGF0ZSBhbm5vdGF0aW9ucyBmb3IgdGhpcyBldmVudFxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFubm90YXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Y29uc3QgYW5uID0gYW5ub3RhdGlvbnNbaV07XG5cdFx0XHRcdFx0aWYgKGFubi5pZCA9PT0gJ2V2ZW50LWJnLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMjUxLCAxNDYsIDYwLCAwLjM1KSc7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbm4uaWQgPT09ICdldmVudC1iYXItJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5iYWNrZ3JvdW5kQ29sb3IgPSAnI2ZiOTIzYyc7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbm4uaWQgPT09ICdldmVudC1saW5lLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYm9yZGVyQ29sb3IgPSAnI2ZiOTIzYyc7XG5cdFx0XHRcdFx0XHRhbm4uYm9yZGVyV2lkdGggPSA0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNoYXJ0LnVwZGF0ZSgnbm9uZScpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGV2ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsICgpID0+IHtcblx0XHRcdFx0Ly8gQWNjZXNzIGFubm90YXRpb25zIGFycmF5XG5cdFx0XHRcdGNvbnN0IGFubm90YXRpb25zID0gY2hhcnQuY29uZmlnLm9wdGlvbnMucGx1Z2lucy5hbm5vdGF0aW9uLmFubm90YXRpb25zO1xuXG5cdFx0XHRcdC8vIFJlc3RvcmUgYW5ub3RhdGlvbnMgZm9yIHRoaXMgZXZlbnRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbm5vdGF0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IGFubiA9IGFubm90YXRpb25zW2ldO1xuXHRcdFx0XHRcdGlmIChhbm4uaWQgPT09ICdldmVudC1iZy0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1MSwgMTQ2LCA2MCwgMC4wOCknO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtYmFyLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJyNmOTczMTYnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtbGluZS0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlckNvbG9yID0gJyNmOTczMTYnO1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlcldpZHRoID0gMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjaGFydC51cGRhdGUoJ25vbmUnKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59KSgpO1xuYFxufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUlkKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJy0nKVxufVxuXG5mdW5jdGlvbiBlc2NhcGVKcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIikucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAodGltZXN0YW1wOiBudW1iZXIpOiBzdHJpbmcge1xuXHRsZXQgZGF0ZSA9IG5ldyBEYXRlKHRpbWVzdGFtcCkgLy8gdGltZXN0YW1wIGFscmVhZHkgaW4gbWlsbGlzZWNvbmRzXG5cdC8vIEZvcm1hdCBhcyBsb2NhbCB0aW1lIEhIOk1NOlNTXG5cdGxldCBob3VycyA9IGRhdGUuZ2V0SG91cnMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0bGV0IG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0bGV0IHNlY29uZHMgPSBkYXRlLmdldFNlY29uZHMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0cmV0dXJuIGAke2hvdXJzfToke21pbnV0ZXN9OiR7c2Vjb25kc31gXG59XG5cbmZ1bmN0aW9uIGdldFN0eWxlcygpOiBzdHJpbmcge1xuXHRyZXR1cm4gYFxuKiB7XG5cdG1hcmdpbjogMDtcblx0cGFkZGluZzogMDtcblx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcbn1cblxuaHRtbCB7XG5cdHNjcm9sbC1iZWhhdmlvcjogc21vb3RoO1xufVxuXG5ib2R5IHtcblx0Zm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCAnSGVsdmV0aWNhIE5ldWUnLCBBcmlhbCwgc2Fucy1zZXJpZjtcblx0bGluZS1oZWlnaHQ6IDEuNjtcblx0Y29sb3I6ICMyNDI5MmY7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdHBhZGRpbmc6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Ym9keSB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRjb2xvcjogI2M5ZDFkOTtcblx0fVxufVxuXG5oZWFkZXIge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcblx0cGFkZGluZzogMzBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGhlYWRlciB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuaGVhZGVyIGgxIHtcblx0Zm9udC1zaXplOiAzMnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY29tbWl0LWluZm8ge1xuXHRmb250LXNpemU6IDE2cHg7XG5cdG1hcmdpbi1ib3R0b206IDEwcHg7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTVweDtcblx0ZmxleC13cmFwOiB3cmFwO1xufVxuXG4uY29tbWl0IHtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDE0cHg7XG59XG5cbi5jb21taXQuY3VycmVudCB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uY29tbWl0LmJhc2VsaW5lIHtcblx0YmFja2dyb3VuZDogI2RkZjRmZjtcblx0Y29sb3I6ICMwOTY5ZGE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbW1pdC5jdXJyZW50IHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5jb21taXQuYmFzZWxpbmUge1xuXHRcdGJhY2tncm91bmQ6ICMwYzJkNmI7XG5cdFx0Y29sb3I6ICM1OGE2ZmY7XG5cdH1cbn1cblxuLmNvbW1pdCBhIHtcblx0Y29sb3I6IGluaGVyaXQ7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmNvbW1pdCBhOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbi52cyB7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4ubWV0YSB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGdhcDogMTVweDtcblx0ZmxleC13cmFwOiB3cmFwO1xufVxuXG5zZWN0aW9uIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogMCBhdXRvIDQwcHg7XG59XG5cbnNlY3Rpb24gaDIge1xuXHRmb250LXNpemU6IDI0cHg7XG5cdG1hcmdpbi1ib3R0b206IDIwcHg7XG5cdGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRwYWRkaW5nLWJvdHRvbTogMTBweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRzZWN0aW9uIGgyIHtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLnN0YXRzIHtcblx0ZGlzcGxheTogZ3JpZDtcblx0Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maXQsIG1pbm1heCgyMDBweCwgMWZyKSk7XG5cdGdhcDogMTVweDtcblx0bWFyZ2luLWJvdHRvbTogMzBweDtcbn1cblxuLnN0YXQtY2FyZCB7XG5cdHBhZGRpbmc6IDIwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0Ym9yZGVyOiAycHggc29saWQgI2QwZDdkZTtcblx0dGV4dC1hbGlnbjogY2VudGVyO1xufVxuXG4uc3RhdC1jYXJkLmltcHJvdmVtZW50cyB7XG5cdGJvcmRlci1jb2xvcjogIzFhN2YzNztcbn1cblxuLnN0YXQtY2FyZC5yZWdyZXNzaW9ucyB7XG5cdGJvcmRlci1jb2xvcjogI2NmMjIyZTtcbn1cblxuLnN0YXQtY2FyZC5zdGFibGUge1xuXHRib3JkZXItY29sb3I6ICM2ZTc3ODE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LnN0YXQtY2FyZCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cblx0LnN0YXQtY2FyZC5pbXByb3ZlbWVudHMge1xuXHRcdGJvcmRlci1jb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuc3RhdC1jYXJkLnJlZ3Jlc3Npb25zIHtcblx0XHRib3JkZXItY29sb3I6ICNmODUxNDk7XG5cdH1cblx0LnN0YXQtY2FyZC5zdGFibGUge1xuXHRcdGJvcmRlci1jb2xvcjogIzhiOTQ5ZTtcblx0fVxufVxuXG4uc3RhdC12YWx1ZSB7XG5cdGZvbnQtc2l6ZTogMzZweDtcblx0Zm9udC13ZWlnaHQ6IDcwMDtcblx0bWFyZ2luLWJvdHRvbTogNXB4O1xufVxuXG4uc3RhdC1sYWJlbCB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtd2VpZ2h0OiA1MDA7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHtcblx0d2lkdGg6IDEwMCU7XG5cdGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdGJvcmRlcjogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0b3ZlcmZsb3c6IGhpZGRlbjtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdGgsXG4uY29tcGFyaXNvbi10YWJsZSB0ZCB7XG5cdHBhZGRpbmc6IDEycHggMTZweDtcblx0dGV4dC1hbGlnbjogbGVmdDtcblx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkMGQ3ZGU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUgdGgsXG5cdC5jb21wYXJpc29uLXRhYmxlIHRkIHtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdGgge1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRmb250LXdlaWdodDogNjAwO1xuXHRmb250LXNpemU6IDE0cHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUgdGgge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdH1cbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHI6bGFzdC1jaGlsZCB0ZCB7XG5cdGJvcmRlci1ib3R0b206IG5vbmU7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyLmJldHRlciB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQyMDtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHIud29yc2Uge1xuXHRiYWNrZ3JvdW5kOiAjZmZlYmU5MjA7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUgdHIuYmV0dGVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2MjA7XG5cdH1cblx0LmNvbXBhcmlzb24tdGFibGUgdHIud29yc2Uge1xuXHRcdGJhY2tncm91bmQ6ICM4NjE4MWQyMDtcblx0fVxufVxuXG4uY2hhbmdlLWNlbGwge1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4ubWV0cmljLWxpbmsge1xuXHRjb2xvcjogIzA5NjlkYTtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xufVxuXG4ubWV0cmljLWxpbms6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQubWV0cmljLWxpbmsge1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbi5jaGFydC1jYXJkIHtcblx0bWFyZ2luLWJvdHRvbTogNDBweDtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRwYWRkaW5nOiAyMHB4O1xuXHRzY3JvbGwtbWFyZ2luLXRvcDogMjBweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY2hhcnQtY2FyZCB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmNoYXJ0LWhlYWRlciB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcblx0YWxpZ24taXRlbXM6IGZsZXgtc3RhcnQ7XG5cdGdhcDogMjRweDtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNoYXJ0LXRpdGxlLXNlY3Rpb24gaDMge1xuXHRmb250LXNpemU6IDE4cHg7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTBweDtcblx0ZmxleC13cmFwOiB3cmFwO1xuXHRtYXJnaW46IDA7XG59XG5cbi5pbmRpY2F0b3Ige1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmluZGljYXRvci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmluZGljYXRvci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTk7XG5cdGNvbG9yOiAjY2YyMjJlO1xufVxuXG4uaW5kaWNhdG9yLm5ldXRyYWwge1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRjb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuaW5kaWNhdG9yLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjtcblx0XHRjb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuaW5kaWNhdG9yLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkO1xuXHRcdGNvbG9yOiAjZmY3YjcyO1xuXHR9XG5cdC5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRjb2xvcjogIzhiOTQ5ZTtcblx0fVxufVxuXG4uY2hhcnQtbWV0YSB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZsZXgtc2hyaW5rOiAwO1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSB7XG5cdHdpZHRoOiBhdXRvO1xuXHRib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xuXHRmb250LXNpemU6IDEzcHg7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIHRoIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0cGFkZGluZzogNHB4IDEycHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Y29sb3I6ICM2NTZkNzY7XG5cdGZvbnQtZmFtaWx5OiAnU0YgTW9ubycsICdNb25hY28nLCAnSW5jb25zb2xhdGEnLCAnUm9ib3RvIE1vbm8nLCAnQ29uc29sYXMnLCBtb25vc3BhY2U7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIHRkIHtcblx0cGFkZGluZzogNHB4IDEycHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Zm9udC1mYW1pbHk6ICdTRiBNb25vJywgJ01vbmFjbycsICdJbmNvbnNvbGF0YScsICdSb2JvdG8gTW9ubycsICdDb25zb2xhcycsIG1vbm9zcGFjZTtcbn1cblxuLmFnZ3JlZ2F0ZXMtdGFibGUgLnJvdy1sYWJlbCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdHRleHQtYWxpZ246IHJpZ2h0O1xuXHRjb2xvcjogIzFmMjMyODtcblx0cGFkZGluZy1yaWdodDogMTZweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuYWdncmVnYXRlcy10YWJsZSAucm93LWxhYmVsIHtcblx0XHRjb2xvcjogI2U2ZWRmMztcblx0fVxufVxuXG4uY2hhcnQtY29udGFpbmVyIHtcblx0cG9zaXRpb246IHJlbGF0aXZlO1xuXHRoZWlnaHQ6IDQwMHB4O1xufVxuXG4uY2hhcnQtZXZlbnRzLXRpbWVsaW5lIHtcblx0bWFyZ2luLXRvcDogMTVweDtcblx0cGFkZGluZy10b3A6IDE1cHg7XG5cdGJvcmRlci10b3A6IDFweCBzb2xpZCAjZTVlN2ViO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jaGFydC1ldmVudHMtdGltZWxpbmUge1xuXHRcdGJvcmRlci10b3AtY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLnRpbWVsaW5lLXRpdGxlIHtcblx0Zm9udC1zaXplOiAxM3B4O1xuXHRmb250LXdlaWdodDogNjAwO1xuXHRjb2xvcjogIzY1NmQ3Njtcblx0bWFyZ2luLWJvdHRvbTogMTBweDtcbn1cblxuLnRpbWVsaW5lLWV2ZW50cyB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG5cdGdhcDogOHB4O1xufVxuXG4udGltZWxpbmUtZXZlbnQge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdHBhZGRpbmc6IDhweCAxMnB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA2cHg7XG5cdGZvbnQtc2l6ZTogMTNweDtcblx0dHJhbnNpdGlvbjogYWxsIDAuMnM7XG5cdGN1cnNvcjogcG9pbnRlcjtcblx0Ym9yZGVyOiAycHggc29saWQgdHJhbnNwYXJlbnQ7XG59XG5cbi50aW1lbGluZS1ldmVudDpob3ZlciB7XG5cdGJhY2tncm91bmQ6ICNmZmY1ZWQ7XG5cdGJvcmRlci1jb2xvcjogI2ZiOTIzYztcblx0Ym94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMjUxLCAxNDYsIDYwLCAwLjIpO1xuXHR0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoNHB4KTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQudGltZWxpbmUtZXZlbnQge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudDtcblx0fVxuXG5cdC50aW1lbGluZS1ldmVudDpob3ZlciB7XG5cdFx0YmFja2dyb3VuZDogIzJkMTgxMDtcblx0XHRib3JkZXItY29sb3I6ICNmYjkyM2M7XG5cdFx0Ym94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMjUxLCAxNDYsIDYwLCAwLjMpO1xuXHR9XG59XG5cbi5ldmVudC1pY29uIHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRmbGV4LXNocmluazogMDtcbn1cblxuLmV2ZW50LXRpbWUge1xuXHRmb250LWZhbWlseTogJ1NGIE1vbm8nLCAnTW9uYWNvJywgJ0luY29uc29sYXRhJywgJ1JvYm90byBNb25vJywgJ0NvbnNvbGFzJywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDEycHg7XG5cdGNvbG9yOiAjNjU2ZDc2O1xuXHRmbGV4LXNocmluazogMDtcbn1cblxuLmV2ZW50LWxhYmVsIHtcblx0Y29sb3I6ICMxZjIzMjg7XG5cdGZsZXgtZ3JvdzogMTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuZXZlbnQtbGFiZWwge1xuXHRcdGNvbG9yOiAjZTZlZGYzO1xuXHR9XG59XG5cbmZvb3RlciB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDYwcHggYXV0byAyMHB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmctdG9wOiAyMHB4O1xuXHRib3JkZXItdG9wOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG5mb290ZXIgYSB7XG5cdGNvbG9yOiAjMDk2OWRhO1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG59XG5cbmZvb3RlciBhOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Zm9vdGVyIGEge1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA3NjhweCkge1xuXHRib2R5IHtcblx0XHRwYWRkaW5nOiAxMHB4O1xuXHR9XG5cblx0aGVhZGVyIGgxIHtcblx0XHRmb250LXNpemU6IDI0cHg7XG5cdH1cblxuXHQuY2hhcnQtY29udGFpbmVyIHtcblx0XHRoZWlnaHQ6IDMwMHB4O1xuXHR9XG5cblx0LnN0YXRzIHtcblx0XHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCgyLCAxZnIpO1xuXHR9XG59XG5gXG59XG4iLAogICAgImltcG9ydCB0eXBlIHsgQ29sbGVjdGVkTWV0cmljIH0gZnJvbSAnLi4vLi4vc2hhcmVkL21ldHJpY3MuanMnXG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ29sbGVjdGVkTWV0cmljcyhjb250ZW50OiBzdHJpbmcpOiBDb2xsZWN0ZWRNZXRyaWNbXSB7XG5cdGxldCBtZXRyaWNzOiBDb2xsZWN0ZWRNZXRyaWNbXSA9IFtdXG5cdGxldCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKVxuXG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAoIWxpbmUudHJpbSgpKSBjb250aW51ZVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBtZXRyaWMgPSBKU09OLnBhcnNlKGxpbmUpIGFzIENvbGxlY3RlZE1ldHJpY1xuXHRcdFx0bWV0cmljcy5wdXNoKG1ldHJpYylcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbWV0cmljc1xufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7QUFJQSx1REFDQSwyQ0FDQTtBQU5BO0FBQ0E7QUFDQTs7O0FDUUEsOENBQ0E7QUFKQTtBQUNBO0FBeUNBLGVBQWUsbUJBQW1CLENBQUMsYUFBc0Q7QUFBQSxFQUN4RixJQUFJLENBQUMsZUFBZSxZQUFZLEtBQUssTUFBTTtBQUFBLElBQzFDLE9BQU87QUFBQSxFQUdSLElBQUk7QUFBQSxJQUNILElBQUksU0FBbUIsQ0FBQztBQUFBLElBRXhCLE1BQU0saUJBQUssTUFBTSxDQUFDLFdBQVcsR0FBRyxHQUFHO0FBQUEsTUFDbEMsT0FBTyxPQUFPLEtBQUssYUFBYSxPQUFPO0FBQUEsTUFDdkMsUUFBUTtBQUFBLE1BQ1IsV0FBVztBQUFBLFFBQ1YsUUFBUSxDQUFDLFNBQVMsT0FBTyxLQUFLLEtBQUssU0FBUyxDQUFDO0FBQUEsTUFDOUM7QUFBQSxJQUNELENBQUM7QUFBQSxJQUVELElBQUksT0FBTyxPQUFPLEtBQUssRUFBRTtBQUFBLElBR3pCLE9BRmEsS0FBSyxNQUFNLElBQUk7QUFBQSxJQUczQixPQUFPLE9BQU87QUFBQSxJQUVmLE9BREEsb0JBQVEsb0NBQW9DLE9BQU8sS0FBSyxHQUFHLEdBQ3BEO0FBQUE7QUFBQTtBQU9ULFNBQVMscUJBQXFCLENBQUMsZUFBZ0MsY0FBZ0Q7QUFBQSxFQUU5RyxPQUFPO0FBQUEsSUFDTix3QkFBd0IsYUFBYSwwQkFBMEIsY0FBYztBQUFBLElBQzdFLFNBQVM7QUFBQSxNQUNSLHdCQUF3QixhQUFhLFNBQVMsMEJBQTBCLGNBQWMsUUFBUTtBQUFBLE1BQzlGLHlCQUF5QixhQUFhLFNBQVMsMkJBQTJCLGNBQWMsUUFBUTtBQUFBLElB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LGVBQWUsQ0FBQyxXQUEyQjtBQUFBLEVBQ25ELElBQUksT0FBTyxJQUFJLEtBQUssU0FBUyxHQUV6QixRQUFRLEtBQUssU0FBUyxFQUFFLFNBQVMsRUFBRSxTQUFTLEdBQUcsR0FBRyxHQUNsRCxVQUFVLEtBQUssV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEdBQUcsR0FBRyxHQUN0RCxVQUFVLEtBQUssV0FBVyxFQUFFLFNBQVMsRUFBRSxTQUFTLEdBQUcsR0FBRztBQUFBLEVBQzFELE9BQU8sR0FBRyxTQUFTLFdBQVc7QUFBQTtBQUcvQixTQUFTLFNBQVMsR0FBVztBQUFBLEVBQzVCLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QUFRLENBQUMsR0FDeEQsVUFBVSxLQUFLLEVBQUUsVUFBVSxPQUFPLFVBQVUsTUFBTSxTQUFTLENBQUM7QUFBQSxJQUU1RCxNQUFNLE9BQU8sTUFBTSxlQUFlLGVBQWUsT0FBTyxXQUFXLGdCQUFnQixDQUFDLFFBQVEsR0FBRyxLQUFLO0FBQUEsTUFDbkcsZUFBZTtBQUFBLElBQ2hCLENBQUMsR0FFRyxRQUFRLHVCQUFRLE1BQU0sU0FBUztBQUFBLElBQ25DLE9BQU8sWUFBWSxnQ0FBZ0MsdUJBQVEsS0FBSyxTQUFTLHVCQUFRLEtBQUsscUJBQXFCLG1CQUFtQjtBQUFBO0FBQUE7QUFJaEksZUFBZSx3QkFBd0IsQ0FBQyxPQUFlLFNBQTJCO0FBQUEsRUFDakYsa0JBQUssOENBQW1DO0FBQUEsRUFFeEMsSUFBSSxPQUFPLG9CQUNWLFFBQVEsSUFBSSxDQUFDLE9BQU87QUFBQSxJQUNuQixVQUFVLEVBQUU7QUFBQSxJQUNaLFlBQVksRUFBRTtBQUFBLElBQ2QsWUFBWSxFQUFFO0FBQUEsSUFDZCxVQUFVLEVBQUU7QUFBQSxJQUNaLFdBQVcsRUFBRTtBQUFBLEVBQ2QsRUFBRSxDQUNIO0FBQUEsRUFDQSxNQUFNLHNCQUFzQixPQUFPLElBQUk7QUFBQTtBQUd4QyxLQUFLOyIsCiAgImRlYnVnSWQiOiAiN0MwQkI1QUY4QkEzRkEzQTY0NzU2RTIxNjQ3NTZFMjEiLAogICJuYW1lcyI6IFtdCn0=
