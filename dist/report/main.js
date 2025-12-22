import {
  compareWorkloadMetrics,
  formatChange,
  formatValue
} from "../main-7myt13pq.js";
import {
  __toESM,
  require_artifact,
  require_core,
  require_exec,
  require_github
} from "../main-h98689qs.js";

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
  let pull = import_github3.context.issue.number, reports = [], thresholds = await loadThresholdConfig(import_core4.getInput("thresholds_yaml"), import_core4.getInput("thresholds_yaml_path"));
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

//# debugId=8B3CD84F1AB342D764756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vc2hhcmVkL3RocmVzaG9sZHMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi9jb21tZW50LnRzIiwgIi4uL3NoYXJlZC9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9odG1sLnRzIiwgIi4uL3JlcG9ydC9saWIvbWV0cmljcy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJpbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzZXRGYWlsZWQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHsgY29tcGFyZVdvcmtsb2FkTWV0cmljcywgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuLi9zaGFyZWQvYW5hbHlzaXMuanMnXG5pbXBvcnQgdHlwZSB7IEZvcm1hdHRlZEV2ZW50IH0gZnJvbSAnLi4vc2hhcmVkL2V2ZW50cy5qcydcbmltcG9ydCB0eXBlIHsgVGVzdE1ldGFkYXRhIH0gZnJvbSAnLi4vc2hhcmVkL21ldGFkYXRhLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMgfSBmcm9tICcuLi9zaGFyZWQvbWV0cmljcy5qcydcbmltcG9ydCB7IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzLCBsb2FkVGhyZXNob2xkQ29uZmlnLCB0eXBlIFRocmVzaG9sZENvbmZpZyB9IGZyb20gJy4uL3NoYXJlZC90aHJlc2hvbGRzLmpzJ1xuaW1wb3J0IHsgZG93bmxvYWRSdW5BcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBnZW5lcmF0ZUNoZWNrU3VtbWFyeSwgZ2VuZXJhdGVDaGVja1RpdGxlIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGxvYWRDaGFvc0V2ZW50cyB9IGZyb20gJy4vbGliL2V2ZW50cy5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyBsb2FkQ29sbGVjdGVkTWV0cmljcyB9IGZyb20gJy4vbGliL21ldHJpY3MuanMnXG5cbnByb2Nlc3MuZW52WydHSVRIVUJfQUNUSU9OX1BBVEgnXSA/Pz0gZmlsZVVSTFRvUGF0aChuZXcgVVJMKCcuLi8uLicsIGltcG9ydC5tZXRhLnVybCkpXG5cbnR5cGUgV29ya2xvYWRSZXBvcnQgPSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdXG5cdG1ldGFkYXRhOiBUZXN0TWV0YWRhdGFcblx0dGhyZXNob2xkczogVGhyZXNob2xkQ29uZmlnXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXG5cdGNoZWNrVXJsPzogc3RyaW5nXG5cdHJlcG9ydFVybD86IHN0cmluZ1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvLXJlcG9ydHMnKVxuXHRhd2FpdCBmcy5ta2Rpcihjd2QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0bGV0IHJ1bkFydGlmYWN0cyA9IGF3YWl0IGRvd25sb2FkUnVuQXJ0aWZhY3RzKGN3ZClcblx0aW5mbyhgRm91bmQgJHtydW5BcnRpZmFjdHMuc2l6ZX0gYXJ0aWZhY3RzOiAke1suLi5ydW5BcnRpZmFjdHMua2V5cygpXS5qb2luKCcsICcpfWApXG5cblx0aWYgKHJ1bkFydGlmYWN0cy5zaXplID09PSAwKSB7XG5cdFx0c2V0RmFpbGVkKCdObyB3b3JrbG9hZCBhcnRpZmFjdHMgZm91bmQgaW4gY3VycmVudCBydW4nKVxuXHRcdHJldHVyblxuXHR9XG5cblx0bGV0IHB1bGwgPSBjb250ZXh0Lmlzc3VlLm51bWJlclxuXHRsZXQgcmVwb3J0czogV29ya2xvYWRSZXBvcnRbXSA9IFtdXG5cdGxldCB0aHJlc2hvbGRzID0gYXdhaXQgbG9hZFRocmVzaG9sZENvbmZpZyhnZXRJbnB1dCgndGhyZXNob2xkc195YW1sJyksIGdldElucHV0KCd0aHJlc2hvbGRzX3lhbWxfcGF0aCcpKVxuXG5cdGZvciAobGV0IFssIGFydGlmYWN0XSBvZiBydW5BcnRpZmFjdHMpIHtcblx0XHRpZiAoIWFydGlmYWN0Lm1ldGFkYXRhUGF0aCB8fCAhYXJ0aWZhY3QubWV0cmljc1BhdGggfHwgIWFydGlmYWN0LmV2ZW50c1BhdGgpIHtcblx0XHRcdGluZm8oYFNraXBwaW5nIGFydGlmYWN0ICR7YXJ0aWZhY3QubmFtZX06IG1pc3NpbmcgcmVxdWlyZWQgZmlsZXNgKVxuXHRcdFx0Y29udGludWVcblx0XHR9XG5cblx0XHRsZXQgZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdID0gbG9hZENoYW9zRXZlbnRzKGF3YWl0IGZzLnJlYWRGaWxlKGFydGlmYWN0LmV2ZW50c1BhdGgsICd1dGYtOCcpKVxuXHRcdGxldCBtZXRyaWNzOiBDb2xsZWN0ZWRNZXRyaWNbXSA9IGxvYWRDb2xsZWN0ZWRNZXRyaWNzKGF3YWl0IGZzLnJlYWRGaWxlKGFydGlmYWN0Lm1ldHJpY3NQYXRoLCAndXRmLTgnKSlcblx0XHRsZXQgbWV0YWRhdGEgPSBKU09OLnBhcnNlKGF3YWl0IGZzLnJlYWRGaWxlKGFydGlmYWN0Lm1ldGFkYXRhUGF0aCwgJ3V0Zi04JykpIGFzIFRlc3RNZXRhZGF0YVxuXG5cdFx0aWYgKG1ldGFkYXRhLnB1bGwgJiYgbWV0YWRhdGEucHVsbCAhPT0gcHVsbCkge1xuXHRcdFx0cHVsbCA9IG1ldGFkYXRhLnB1bGxcblx0XHR9XG5cblx0XHRsZXQgY29tcGFyaXNvbiA9IGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MoXG5cdFx0XHRtZXRhZGF0YS53b3JrbG9hZCxcblx0XHRcdG1ldHJpY3MsXG5cdFx0XHRtZXRhZGF0YS53b3JrbG9hZF9jdXJyZW50X3JlZiB8fCAnY3VycmVudCcsXG5cdFx0XHRtZXRhZGF0YS53b3JrbG9hZF9iYXNlbGluZV9yZWYgfHwgJ2Jhc2VsaW5lJyxcblx0XHRcdCdhdmcnLFxuXHRcdFx0dGhyZXNob2xkcy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50XG5cdFx0KVxuXG5cdFx0bGV0IHJlcG9ydDogV29ya2xvYWRSZXBvcnQgPSB7XG5cdFx0XHR3b3JrbG9hZDogbWV0YWRhdGEud29ya2xvYWQsXG5cdFx0XHRldmVudHMsXG5cdFx0XHRtZXRyaWNzLFxuXHRcdFx0bWV0YWRhdGEsXG5cdFx0XHR0aHJlc2hvbGRzLFxuXHRcdFx0Y29tcGFyaXNvbixcblx0XHR9XG5cblx0XHRsZXQgY2hlY2sgPSBhd2FpdCBjcmVhdGVXb3JrbG9hZENoZWNrKGBTTE86ICR7bWV0YWRhdGEud29ya2xvYWR9YCwgbWV0YWRhdGEuY29tbWl0ISwgY29tcGFyaXNvbiwgdGhyZXNob2xkcylcblx0XHRyZXBvcnQuY2hlY2tVcmwgPSBjaGVjay51cmxcblxuXHRcdHJlcG9ydHMucHVzaChyZXBvcnQpXG5cdH1cblxuXHRhd2FpdCBjcmVhdGVXb3JrbG9hZEhUTUxSZXBvcnQoY3dkLCByZXBvcnRzKVxuXG5cdGlmIChwdWxsKSB7XG5cdFx0YXdhaXQgY3JlYXRlUHVsbFJlcXVlc3RDb21tZW50KHB1bGwsIHJlcG9ydHMpXG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya2xvYWRDaGVjayhcblx0bmFtZTogc3RyaW5nLFxuXHRjb21taXQ6IHN0cmluZyxcblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uLFxuXHR0aHJlc2hvbGRzOiBUaHJlc2hvbGRDb25maWcsXG5cdHJlcG9ydFVSTD86IHN0cmluZ1xuKSB7XG5cdGxldCB0b2tlbiA9IGdldElucHV0KCdnaXRodWJfdG9rZW4nKVxuXHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQodG9rZW4pXG5cblx0bGV0IGV2YWx1YXRpb24gPSBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcyhjb21wYXJpc29uLm1ldHJpY3MsIHRocmVzaG9sZHMpXG5cdGxldCBjb25jbHVzaW9uOiAnc3VjY2VzcycgfCAnbmV1dHJhbCcgfCAnZmFpbHVyZScgPSAnc3VjY2Vzcydcblx0aWYgKGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ2ZhaWx1cmUnKSBjb25jbHVzaW9uID0gJ2ZhaWx1cmUnXG5cdGlmIChldmFsdWF0aW9uLm92ZXJhbGwgPT09ICd3YXJuaW5nJykgY29uY2x1c2lvbiA9ICduZXV0cmFsJ1xuXG5cdGxldCB0aXRsZSA9IGdlbmVyYXRlQ2hlY2tUaXRsZShjb21wYXJpc29uLCBldmFsdWF0aW9uKVxuXHRsZXQgc3VtbWFyeSA9IGdlbmVyYXRlQ2hlY2tTdW1tYXJ5KGNvbXBhcmlzb24sIGV2YWx1YXRpb24sIHJlcG9ydFVSTClcblxuXHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuY2hlY2tzLmNyZWF0ZSh7XG5cdFx0bmFtZSxcblx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdGhlYWRfc2hhOiBjb21taXQhLFxuXHRcdHN0YXR1czogJ2NvbXBsZXRlZCcsXG5cdFx0Y29uY2x1c2lvbixcblx0XHRvdXRwdXQ6IHtcblx0XHRcdHRpdGxlLFxuXHRcdFx0c3VtbWFyeSxcblx0XHR9LFxuXHR9KVxuXG5cdGRlYnVnKGBDcmVhdGVkIGNoZWNrIFwiJHtuYW1lfVwiIHdpdGggY29uY2x1c2lvbjogJHtjb25jbHVzaW9ufSwgdXJsOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRyZXR1cm4geyBpZDogZGF0YS5pZCwgdXJsOiBkYXRhLmh0bWxfdXJsISB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVdvcmtsb2FkSFRNTFJlcG9ydChjd2Q6IHN0cmluZywgcmVwb3J0czogV29ya2xvYWRSZXBvcnRbXSkge1xuXHRpbmZvKCfwn5OdIEdlbmVyYXRpbmcgSFRNTCByZXBvcnRzLi4uJylcblxuXHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblx0bGV0IGh0bWxGaWxlczogQXJyYXk8eyB3b3JrbG9hZDogc3RyaW5nOyBwYXRoOiBzdHJpbmcgfT4gPSBbXVxuXG5cdGZvciAobGV0IHJlcG9ydCBvZiByZXBvcnRzKSB7XG5cdFx0bGV0IGh0bWxEYXRhOiBIVE1MUmVwb3J0RGF0YSA9IHtcblx0XHRcdHdvcmtsb2FkOiByZXBvcnQud29ya2xvYWQsXG5cdFx0XHRjb21wYXJpc29uOiByZXBvcnQuY29tcGFyaXNvbixcblx0XHRcdG1ldHJpY3M6IHJlcG9ydC5tZXRyaWNzLFxuXHRcdFx0ZXZlbnRzOiByZXBvcnQuZXZlbnRzLFxuXHRcdFx0Y3VycmVudFJlZjogcmVwb3J0Lm1ldGFkYXRhLndvcmtsb2FkX2N1cnJlbnRfcmVmIHx8ICdjdXJyZW50Jyxcblx0XHRcdGJhc2VsaW5lUmVmOiByZXBvcnQubWV0YWRhdGEud29ya2xvYWRfYmFzZWxpbmVfcmVmIHx8ICdiYXNlbGluZScsXG5cdFx0XHRwck51bWJlcjogcmVwb3J0Lm1ldGFkYXRhLnB1bGwhLFxuXHRcdFx0dGVzdFN0YXJ0VGltZTogcmVwb3J0Lm1ldGFkYXRhPy5zdGFydF9lcG9jaF9tcyB8fCBEYXRlLm5vdygpIC0gMTAgKiA2MCAqIDEwMDAsXG5cdFx0XHR0ZXN0RW5kVGltZTogcmVwb3J0Lm1ldGFkYXRhPy5maW5pc2hfZXBvY2hfbXMgfHwgRGF0ZS5ub3coKSxcblx0XHR9XG5cblx0XHRsZXQgaHRtbCA9IGdlbmVyYXRlSFRNTFJlcG9ydChodG1sRGF0YSlcblx0XHRsZXQgaHRtbFBhdGggPSBwYXRoLmpvaW4oY3dkLCBgJHtyZXBvcnQud29ya2xvYWR9LXJlcG9ydC5odG1sYClcblxuXHRcdGF3YWl0IGZzLndyaXRlRmlsZShodG1sUGF0aCwgaHRtbCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGh0bWxGaWxlcy5wdXNoKHsgd29ya2xvYWQ6IHJlcG9ydC53b3JrbG9hZCwgcGF0aDogaHRtbFBhdGggfSlcblxuXHRcdGxldCB7IGlkIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC51cGxvYWRBcnRpZmFjdChyZXBvcnQud29ya2xvYWQgKyAnLWh0bWwtcmVwb3J0JywgW2h0bWxQYXRoXSwgY3dkLCB7XG5cdFx0XHRyZXRlbnRpb25EYXlzOiAzMCxcblx0XHR9KVxuXG5cdFx0bGV0IHJ1bklkID0gY29udGV4dC5ydW5JZC50b1N0cmluZygpXG5cdFx0cmVwb3J0LnJlcG9ydFVybCA9IGBodHRwczovL2FwaS5naXRodWIuY29tL3JlcG9zLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH0vYXJ0aWZhY3RzLyR7aWR9YFxuXHR9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNyZWF0ZVB1bGxSZXF1ZXN0Q29tbWVudChpc3N1ZTogbnVtYmVyLCByZXBvcnRzOiBXb3JrbG9hZFJlcG9ydFtdKSB7XG5cdGluZm8oJ/CfkqwgQ3JlYXRpbmcvdXBkYXRpbmcgUFIgY29tbWVudC4uLicpXG5cblx0bGV0IGJvZHkgPSBnZW5lcmF0ZUNvbW1lbnRCb2R5KFxuXHRcdHJlcG9ydHMubWFwKChyKSA9PiAoe1xuXHRcdFx0d29ya2xvYWQ6IHIud29ya2xvYWQsXG5cdFx0XHRjb21wYXJpc29uOiByLmNvbXBhcmlzb24sXG5cdFx0XHR0aHJlc2hvbGRzOiByLnRocmVzaG9sZHMsXG5cdFx0XHRjaGVja1VybDogci5jaGVja1VybCxcblx0XHRcdHJlcG9ydFVybDogci5yZXBvcnRVcmwsXG5cdFx0fSkpXG5cdClcblx0YXdhaXQgY3JlYXRlT3JVcGRhdGVDb21tZW50KGlzc3VlLCBib2R5KVxufVxuXG5tYWluKClcbiIsCiAgICAiLyoqXG4gKiBTaGFyZWQgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uIGFuZCBldmFsdWF0aW9uXG4gKlxuICogVGhpcyBtb2R1bGUgd2FzIGNvcGllZCBmcm9tIHJlcG9ydC9saWIvdGhyZXNob2xkcy50cyBhbmQgYWRhcHRlZCB0byBsaXZlXG4gKiB1bmRlciBzaGFyZWQvbGliIHNvIGJvdGggYGluaXRgIGFuZCBgcmVwb3J0YCBjYW4gaW1wb3J0IGl0LlxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgZXhlYyB9IGZyb20gJ0BhY3Rpb25zL2V4ZWMnXG5pbXBvcnQgeyBkZWJ1Zywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB0eXBlIHsgTWV0cmljQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgTWV0cmljVGhyZXNob2xkIHtcblx0bmFtZT86IHN0cmluZyAvLyBFeGFjdCBtZXRyaWMgbmFtZSAoaGlnaGVyIHByaW9yaXR5IHRoYW4gcGF0dGVybilcblx0cGF0dGVybj86IHN0cmluZyAvLyBHbG9iIHBhdHRlcm4gKGxvd2VyIHByaW9yaXR5KVxuXHRkaXJlY3Rpb24/OiAnbG93ZXJfaXNfYmV0dGVyJyB8ICdoaWdoZXJfaXNfYmV0dGVyJyB8ICduZXV0cmFsJ1xuXHR3YXJuaW5nX21pbj86IG51bWJlclxuXHRjcml0aWNhbF9taW4/OiBudW1iZXJcblx0d2FybmluZ19tYXg/OiBudW1iZXJcblx0Y3JpdGljYWxfbWF4PzogbnVtYmVyXG5cdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ/OiBudW1iZXJcblx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ/OiBudW1iZXJcbn1cblxuZXhwb3J0IGludGVyZmFjZSBUaHJlc2hvbGRDb25maWcge1xuXHRuZXV0cmFsX2NoYW5nZV9wZXJjZW50OiBudW1iZXJcblx0ZGVmYXVsdDoge1xuXHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OiBudW1iZXJcblx0fVxuXHRtZXRyaWNzPzogTWV0cmljVGhyZXNob2xkW11cbn1cblxuZXhwb3J0IHR5cGUgVGhyZXNob2xkU2V2ZXJpdHkgPSAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZmFpbHVyZSdcblxuZXhwb3J0IHR5cGUgRXZhbHVhdGVkVGhyZXNob2xkID0ge1xuXHRtZXRyaWNfbmFtZTogc3RyaW5nXG5cdHRocmVzaG9sZF9uYW1lPzogc3RyaW5nXG5cdHRocmVzaG9sZF9wYXR0ZXJuPzogc3RyaW5nXG5cdHRocmVzaG9sZF9zZXZlcml0eTogVGhyZXNob2xkU2V2ZXJpdHlcblx0cmVhc29uPzogc3RyaW5nXG59XG5cbi8qKlxuICogUGFyc2UgWUFNTCB0aHJlc2hvbGRzIGNvbmZpZyB1c2luZyBgeXFgXG4gKi9cbmFzeW5jIGZ1bmN0aW9uIHBhcnNlVGhyZXNob2xkc1lhbWwoeWFtbENvbnRlbnQ6IHN0cmluZyk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnIHwgbnVsbD4ge1xuXHRpZiAoIXlhbWxDb250ZW50IHx8IHlhbWxDb250ZW50LnRyaW0oKSA9PT0gJycpIHtcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG5cblx0dHJ5IHtcblx0XHRsZXQgY2h1bmtzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRhd2FpdCBleGVjKCd5cScsIFsnLW89anNvbicsICcuJ10sIHtcblx0XHRcdGlucHV0OiBCdWZmZXIuZnJvbSh5YW1sQ29udGVudCwgJ3V0Zi04JyksXG5cdFx0XHRzaWxlbnQ6IHRydWUsXG5cdFx0XHRsaXN0ZW5lcnM6IHtcblx0XHRcdFx0c3Rkb3V0OiAoZGF0YSkgPT4gY2h1bmtzLnB1c2goZGF0YS50b1N0cmluZygpKSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGxldCBqc29uID0gY2h1bmtzLmpvaW4oJycpXG5cdFx0bGV0IHBhcnNlZCA9IEpTT04ucGFyc2UoanNvbikgYXMgVGhyZXNob2xkQ29uZmlnXG5cblx0XHRyZXR1cm4gcGFyc2VkXG5cdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0d2FybmluZyhgRmFpbGVkIHRvIHBhcnNlIHRocmVzaG9sZHMgWUFNTDogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0cmV0dXJuIG51bGxcblx0fVxufVxuXG4vKipcbiAqIE1lcmdlIHR3byB0aHJlc2hvbGQgY29uZmlncyAoY3VzdG9tIGV4dGVuZHMvb3ZlcnJpZGVzIGRlZmF1bHQpXG4gKi9cbmZ1bmN0aW9uIG1lcmdlVGhyZXNob2xkQ29uZmlncyhkZWZhdWx0Q29uZmlnOiBUaHJlc2hvbGRDb25maWcsIGN1c3RvbUNvbmZpZzogVGhyZXNob2xkQ29uZmlnKTogVGhyZXNob2xkQ29uZmlnIHtcblx0Ly8gcHJldHRpZXItaWdub3JlXG5cdHJldHVybiB7XG5cdFx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogY3VzdG9tQ29uZmlnLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50LFxuXHRcdGRlZmF1bHQ6IHtcblx0XHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IGN1c3RvbUNvbmZpZy5kZWZhdWx0Py53YXJuaW5nX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcuZGVmYXVsdC53YXJuaW5nX2NoYW5nZV9wZXJjZW50LFxuXHRcdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IGN1c3RvbUNvbmZpZy5kZWZhdWx0Py5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLmRlZmF1bHQuY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQsXG5cdFx0fSxcblx0XHRtZXRyaWNzOiBbLi4uKGN1c3RvbUNvbmZpZy5tZXRyaWNzIHx8IFtdKSwgLi4uKGRlZmF1bHRDb25maWcubWV0cmljcyB8fCBbXSldLFxuXHR9XG59XG5cbi8qKlxuICogTG9hZCBkZWZhdWx0IHRocmVzaG9sZHMgZnJvbSBkZXBsb3kvdGhyZXNob2xkcy55YW1sXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkRGVmYXVsdFRocmVzaG9sZENvbmZpZygpOiBQcm9taXNlPFRocmVzaG9sZENvbmZpZz4ge1xuXHRkZWJ1ZygnTG9hZGluZyBkZWZhdWx0IHRocmVzaG9sZHMgZnJvbSBHSVRIVUJfQUNUSU9OX1BBVEgvZGVwbG95L3RocmVzaG9sZHMueWFtbCcpXG5cdGxldCBhY3Rpb25Sb290ID0gcGF0aC5yZXNvbHZlKHByb2Nlc3MuZW52WydHSVRIVUJfQUNUSU9OX1BBVEgnXSEpXG5cdGxldCBkZWZhdWx0UGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JywgJ3RocmVzaG9sZHMueWFtbCcpXG5cblx0aWYgKGZzLmV4aXN0c1N5bmMoZGVmYXVsdFBhdGgpKSB7XG5cdFx0bGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZGVmYXVsdFBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjb25maWcpIHJldHVybiBjb25maWdcblx0fVxuXG5cdC8vIEZhbGxiYWNrIHRvIGhhcmRjb2RlZCBkZWZhdWx0c1xuXHR3YXJuaW5nKCdDb3VsZCBub3QgbG9hZCBkZWZhdWx0IHRocmVzaG9sZHMsIHVzaW5nIGhhcmRjb2RlZCBkZWZhdWx0cycpXG5cdHJldHVybiB7XG5cdFx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogNS4wLFxuXHRcdGRlZmF1bHQ6IHtcblx0XHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IDIwLjAsXG5cdFx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDogNTAuMCxcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gd2l0aCBtZXJnaW5nOlxuICogMS4gTG9hZCBkZWZhdWx0IGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbFxuICogMi4gTWVyZ2Ugd2l0aCBjdXN0b20gWUFNTCAoaW5saW5lKSBpZiBwcm92aWRlZFxuICogMy4gTWVyZ2Ugd2l0aCBjdXN0b20gZmlsZSBpZiBwcm92aWRlZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRocmVzaG9sZENvbmZpZyhjdXN0b21ZYW1sPzogc3RyaW5nLCBjdXN0b21QYXRoPzogc3RyaW5nKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWc+IHtcblx0bGV0IGNvbmZpZyA9IGF3YWl0IGxvYWREZWZhdWx0VGhyZXNob2xkQ29uZmlnKClcblxuXHQvLyBNZXJnZSB3aXRoIGN1c3RvbSBZQU1MIChpbmxpbmUpXG5cdGlmIChjdXN0b21ZYW1sKSB7XG5cdFx0ZGVidWcoJ01lcmdpbmcgY3VzdG9tIHRocmVzaG9sZHMgZnJvbSBpbmxpbmUgWUFNTCcpXG5cdFx0bGV0IGN1c3RvbUNvbmZpZyA9IGF3YWl0IHBhcnNlVGhyZXNob2xkc1lhbWwoY3VzdG9tWWFtbClcblx0XHRpZiAoY3VzdG9tQ29uZmlnKSB7XG5cdFx0XHRjb25maWcgPSBtZXJnZVRocmVzaG9sZENvbmZpZ3MoY29uZmlnLCBjdXN0b21Db25maWcpXG5cdFx0fVxuXHR9XG5cblx0Ly8gTWVyZ2Ugd2l0aCBjdXN0b20gZmlsZVxuXHRpZiAoY3VzdG9tUGF0aCAmJiBmcy5leGlzdHNTeW5jKGN1c3RvbVBhdGgpKSB7XG5cdFx0ZGVidWcoYE1lcmdpbmcgY3VzdG9tIHRocmVzaG9sZHMgZnJvbSBmaWxlOiAke2N1c3RvbVBhdGh9YClcblx0XHRsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhjdXN0b21QYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0bGV0IGN1c3RvbUNvbmZpZyA9IGF3YWl0IHBhcnNlVGhyZXNob2xkc1lhbWwoY29udGVudClcblx0XHRpZiAoY3VzdG9tQ29uZmlnKSB7XG5cdFx0XHRjb25maWcgPSBtZXJnZVRocmVzaG9sZENvbmZpZ3MoY29uZmlnLCBjdXN0b21Db25maWcpXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGNvbmZpZ1xufVxuXG4vKipcbiAqIE1hdGNoIG1ldHJpYyBuYW1lIGFnYWluc3QgcGF0dGVybiAoc3VwcG9ydHMgd2lsZGNhcmRzKVxuICovXG5mdW5jdGlvbiBtYXRjaFBhdHRlcm4obWV0cmljTmFtZTogc3RyaW5nLCBwYXR0ZXJuOiBzdHJpbmcpOiBib29sZWFuIHtcblx0Ly8gQ29udmVydCBnbG9iIHBhdHRlcm4gdG8gcmVnZXhcblx0bGV0IHJlZ2V4UGF0dGVybiA9IHBhdHRlcm5cblx0XHQucmVwbGFjZSgvXFwqL2csICcuKicpIC8vICogLT4gLipcblx0XHQucmVwbGFjZSgvXFw/L2csICcuJykgLy8gPyAtPiAuXG5cblx0bGV0IHJlZ2V4ID0gbmV3IFJlZ0V4cChgXiR7cmVnZXhQYXR0ZXJufSRgLCAnaScpXG5cdHJldHVybiByZWdleC50ZXN0KG1ldHJpY05hbWUpXG59XG5cbi8qKlxuICogRmluZCBtYXRjaGluZyB0aHJlc2hvbGQgZm9yIG1ldHJpYyAoZXhhY3QgbWF0Y2ggZmlyc3QsIHRoZW4gcGF0dGVybilcbiAqL1xuZnVuY3Rpb24gZmluZE1hdGNoaW5nVGhyZXNob2xkKG1ldHJpY05hbWU6IHN0cmluZywgY29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBNZXRyaWNUaHJlc2hvbGQgfCBudWxsIHtcblx0aWYgKCFjb25maWcubWV0cmljcykgcmV0dXJuIG51bGxcblxuXHQvLyBGaXJzdCBwYXNzOiBleGFjdCBtYXRjaCAoaGlnaGVzdCBwcmlvcml0eSlcblx0Zm9yIChsZXQgdGhyZXNob2xkIG9mIGNvbmZpZy5tZXRyaWNzKSB7XG5cdFx0aWYgKHRocmVzaG9sZC5uYW1lICYmIHRocmVzaG9sZC5uYW1lID09PSBtZXRyaWNOYW1lKSB7XG5cdFx0XHRyZXR1cm4gdGhyZXNob2xkXG5cdFx0fVxuXHR9XG5cblx0Ly8gU2Vjb25kIHBhc3M6IHBhdHRlcm4gbWF0Y2hcblx0Zm9yIChsZXQgdGhyZXNob2xkIG9mIGNvbmZpZy5tZXRyaWNzKSB7XG5cdFx0aWYgKHRocmVzaG9sZC5wYXR0ZXJuICYmIG1hdGNoUGF0dGVybihtZXRyaWNOYW1lLCB0aHJlc2hvbGQucGF0dGVybikpIHtcblx0XHRcdHJldHVybiB0aHJlc2hvbGRcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIEV2YWx1YXRlIHRocmVzaG9sZCBmb3IgYSBtZXRyaWMgY29tcGFyaXNvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVUaHJlc2hvbGQoY29tcGFyaXNvbjogTWV0cmljQ29tcGFyaXNvbiwgY29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBFdmFsdWF0ZWRUaHJlc2hvbGQge1xuXHRsZXQgdGhyZXNob2xkID0gZmluZE1hdGNoaW5nVGhyZXNob2xkKGNvbXBhcmlzb24ubmFtZSwgY29uZmlnKVxuXHRsZXQgc2V2ZXJpdHk6IFRocmVzaG9sZFNldmVyaXR5ID0gJ3N1Y2Nlc3MnXG5cdGxldCByZWFzb246IHN0cmluZyB8IHVuZGVmaW5lZFxuXG5cdC8vIENoZWNrIGFic29sdXRlIHZhbHVlIHRocmVzaG9sZHMgZmlyc3Rcblx0aWYgKHRocmVzaG9sZCkge1xuXHRcdC8vIENoZWNrIGNyaXRpY2FsX21pblxuXHRcdGlmICh0aHJlc2hvbGQuY3JpdGljYWxfbWluICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlIDwgdGhyZXNob2xkLmNyaXRpY2FsX21pbikge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYmVsb3cgY3JpdGljYWxfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC5jcml0aWNhbF9taW59KWApXG5cdFx0XHRzZXZlcml0eSA9ICdmYWlsdXJlJ1xuXHRcdFx0cmVhc29uID0gYFZhbHVlICR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlLnRvRml4ZWQoMil9IDwgY3JpdGljYWwgbWluICR7dGhyZXNob2xkLmNyaXRpY2FsX21pbn1gXG5cdFx0fVxuXHRcdC8vIENoZWNrIGNyaXRpY2FsX21heFxuXHRcdGVsc2UgaWYgKHRocmVzaG9sZC5jcml0aWNhbF9tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQuY3JpdGljYWxfbWF4KSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBhYm92ZSBjcml0aWNhbF9tYXggKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA+ICR7dGhyZXNob2xkLmNyaXRpY2FsX21heH0pYClcblx0XHRcdHNldmVyaXR5ID0gJ2ZhaWx1cmUnXG5cdFx0XHRyZWFzb24gPSBgVmFsdWUgJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWUudG9GaXhlZCgyKX0gPiBjcml0aWNhbCBtYXggJHt0aHJlc2hvbGQuY3JpdGljYWxfbWF4fWBcblx0XHR9XG5cdFx0Ly8gQ2hlY2sgd2FybmluZ19taW5cblx0XHRlbHNlIGlmICh0aHJlc2hvbGQud2FybmluZ19taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQud2FybmluZ19taW4pIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGJlbG93IHdhcm5pbmdfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC53YXJuaW5nX21pbn0pYClcblx0XHRcdHNldmVyaXR5ID0gJ3dhcm5pbmcnXG5cdFx0XHRyZWFzb24gPSBgVmFsdWUgJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWUudG9GaXhlZCgyKX0gPCB3YXJuaW5nIG1pbiAke3RocmVzaG9sZC53YXJuaW5nX21pbn1gXG5cdFx0fVxuXHRcdC8vIENoZWNrIHdhcm5pbmdfbWF4XG5cdFx0ZWxzZSBpZiAodGhyZXNob2xkLndhcm5pbmdfbWF4ICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlID4gdGhyZXNob2xkLndhcm5pbmdfbWF4KSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBhYm92ZSB3YXJuaW5nX21heCAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9ID4gJHt0aHJlc2hvbGQud2FybmluZ19tYXh9KWApXG5cdFx0XHRzZXZlcml0eSA9ICd3YXJuaW5nJ1xuXHRcdFx0cmVhc29uID0gYFZhbHVlICR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlLnRvRml4ZWQoMil9ID4gd2FybmluZyBtYXggJHt0aHJlc2hvbGQud2FybmluZ19tYXh9YFxuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIGNoYW5nZSBwZXJjZW50IHRocmVzaG9sZHNcblx0aWYgKCFpc05hTihjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50KSkge1xuXHRcdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudClcblxuXHRcdC8vIFVzZSBtZXRyaWMtc3BlY2lmaWMgb3IgZGVmYXVsdCB0aHJlc2hvbGRzXG5cdFx0bGV0IHdhcm5pbmdUaHJlc2hvbGQgPSB0aHJlc2hvbGQ/Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudFxuXHRcdGxldCBjcml0aWNhbFRocmVzaG9sZCA9IHRocmVzaG9sZD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQuY3JpdGljYWxfY2hhbmdlX3BlcmNlbnRcblxuXHRcdC8vIE9ubHkgdHJpZ2dlciBpZiBjaGFuZ2UgaXMgaW4gXCJ3b3JzZVwiIGRpcmVjdGlvblxuXHRcdGlmIChjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb24gPT09ICd3b3JzZScpIHtcblx0XHRcdGlmIChzZXZlcml0eSAhPT0gJ2ZhaWx1cmUnKSB7XG5cdFx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gY3JpdGljYWxUaHJlc2hvbGQpIHtcblx0XHRcdFx0XHRzZXZlcml0eSA9ICdmYWlsdXJlJ1xuXHRcdFx0XHRcdHJlYXNvbiA9IGBSZWdyZXNzaW9uICR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDIpfSUgPiBjcml0aWNhbCAke2NyaXRpY2FsVGhyZXNob2xkfSVgXG5cdFx0XHRcdH0gZWxzZSBpZiAoc2V2ZXJpdHkgIT09ICd3YXJuaW5nJyAmJiBjaGFuZ2VQZXJjZW50ID4gd2FybmluZ1RocmVzaG9sZCkge1xuXHRcdFx0XHRcdHNldmVyaXR5ID0gJ3dhcm5pbmcnXG5cdFx0XHRcdFx0cmVhc29uID0gYFJlZ3Jlc3Npb24gJHtjaGFuZ2VQZXJjZW50LnRvRml4ZWQoMil9JSA+IHdhcm5pbmcgJHt3YXJuaW5nVGhyZXNob2xkfSVgXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH1cblxuXHRyZXR1cm4ge1xuXHRcdG1ldHJpY19uYW1lOiBjb21wYXJpc29uLm5hbWUsXG5cdFx0dGhyZXNob2xkX25hbWU6IHRocmVzaG9sZD8ubmFtZSxcblx0XHR0aHJlc2hvbGRfcGF0dGVybjogdGhyZXNob2xkPy5wYXR0ZXJuLFxuXHRcdHRocmVzaG9sZF9zZXZlcml0eTogc2V2ZXJpdHksXG5cdFx0cmVhc29uLFxuXHR9XG59XG5cbi8qKlxuICogRXZhbHVhdGUgYWxsIG1ldHJpY3MgYW5kIHJldHVybiBvdmVyYWxsIHNldmVyaXR5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcyhcblx0Y29tcGFyaXNvbnM6IE1ldHJpY0NvbXBhcmlzb25bXSxcblx0Y29uZmlnOiBUaHJlc2hvbGRDb25maWdcbik6IHtcblx0b3ZlcmFsbDogVGhyZXNob2xkU2V2ZXJpdHlcblx0ZmFpbHVyZXM6IChNZXRyaWNDb21wYXJpc29uICYgeyByZWFzb24/OiBzdHJpbmcgfSlbXVxuXHR3YXJuaW5nczogKE1ldHJpY0NvbXBhcmlzb24gJiB7IHJlYXNvbj86IHN0cmluZyB9KVtdXG59IHtcblx0bGV0IGZhaWx1cmVzOiAoTWV0cmljQ29tcGFyaXNvbiAmIHsgcmVhc29uPzogc3RyaW5nIH0pW10gPSBbXVxuXHRsZXQgd2FybmluZ3M6IChNZXRyaWNDb21wYXJpc29uICYgeyByZWFzb24/OiBzdHJpbmcgfSlbXSA9IFtdXG5cblx0Zm9yIChsZXQgY29tcGFyaXNvbiBvZiBjb21wYXJpc29ucykge1xuXHRcdGxldCBzZXZlcml0eSA9IGV2YWx1YXRlVGhyZXNob2xkKGNvbXBhcmlzb24sIGNvbmZpZylcblxuXHRcdGlmIChzZXZlcml0eS50aHJlc2hvbGRfc2V2ZXJpdHkgPT09ICdmYWlsdXJlJykge1xuXHRcdFx0ZmFpbHVyZXMucHVzaCh7IC4uLmNvbXBhcmlzb24sIHJlYXNvbjogc2V2ZXJpdHkucmVhc29uIH0pXG5cdFx0fSBlbHNlIGlmIChzZXZlcml0eS50aHJlc2hvbGRfc2V2ZXJpdHkgPT09ICd3YXJuaW5nJykge1xuXHRcdFx0d2FybmluZ3MucHVzaCh7IC4uLmNvbXBhcmlzb24sIHJlYXNvbjogc2V2ZXJpdHkucmVhc29uIH0pXG5cdFx0fVxuXHR9XG5cblx0bGV0IG92ZXJhbGw6IFRocmVzaG9sZFNldmVyaXR5ID0gJ3N1Y2Nlc3MnXG5cdGlmIChmYWlsdXJlcy5sZW5ndGggPiAwKSB7XG5cdFx0b3ZlcmFsbCA9ICdmYWlsdXJlJ1xuXHR9IGVsc2UgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcblx0XHRvdmVyYWxsID0gJ3dhcm5pbmcnXG5cdH1cblxuXHRyZXR1cm4geyBvdmVyYWxsLCBmYWlsdXJlcywgd2FybmluZ3MgfVxufVxuIiwKICAgICIvKipcbiAqIEFydGlmYWN0cyBkb3dubG9hZCBhbmQgcGFyc2luZ1xuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBkZWJ1ZywgZ2V0SW5wdXQsIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuZXhwb3J0IGludGVyZmFjZSBXb3JrbG9hZEFydGlmYWN0cyB7XG5cdG5hbWU6IHN0cmluZ1xuXHRsb2dzUGF0aDogc3RyaW5nXG5cdGV2ZW50c1BhdGg6IHN0cmluZ1xuXHRtZXRyaWNzUGF0aDogc3RyaW5nXG5cdG1ldGFkYXRhUGF0aDogc3RyaW5nXG59XG5cbi8qKlxuICogRG93bmxvYWQgYXJ0aWZhY3RzIGZvciBhIHdvcmtmbG93IHJ1blxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRSdW5BcnRpZmFjdHMoZGVzdGluYXRpb25QYXRoOiBzdHJpbmcpOiBQcm9taXNlPE1hcDxzdHJpbmcsIFdvcmtsb2FkQXJ0aWZhY3RzPj4ge1xuXHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJylcblx0bGV0IHdvcmtmbG93UnVuSWQgPSBwYXJzZUludChnZXRJbnB1dCgnZ2l0aHViX3J1bl9pZCcpIHx8IFN0cmluZyhjb250ZXh0LnJ1bklkKSlcblxuXHRpZiAoIXRva2VuIHx8ICF3b3JrZmxvd1J1bklkKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdHaXRIdWIgdG9rZW4gYW5kIHdvcmtmbG93IHJ1biBJRCBhcmUgcmVxdWlyZWQgdG8gZG93bmxvYWQgYXJ0aWZhY3RzJylcblx0fVxuXG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgeyBhcnRpZmFjdHMgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50Lmxpc3RBcnRpZmFjdHMoe1xuXHRcdGZpbmRCeToge1xuXHRcdFx0dG9rZW46IHRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZDogd29ya2Zsb3dSdW5JZCxcblx0XHRcdHJlcG9zaXRvcnlOYW1lOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdHJlcG9zaXRvcnlPd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdH0sXG5cdH0pXG5cblx0ZGVidWcoYEZvdW5kICR7YXJ0aWZhY3RzLmxlbmd0aH0gYXJ0aWZhY3RzIGluIHdvcmtmbG93IHJ1biAke3dvcmtmbG93UnVuSWR9YClcblxuXHQvLyBEb3dubG9hZCBlYWNoIGFydGlmYWN0IHRvIGl0cyBvd24gc3ViZGlyZWN0b3J5XG5cdGxldCBkb3dubG9hZGVkUGF0aHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0bGV0IGFydGlmYWN0RGlyID0gcGF0aC5qb2luKGRlc3RpbmF0aW9uUGF0aCwgYXJ0aWZhY3QubmFtZSlcblxuXHRcdGRlYnVnKGBEb3dubG9hZGluZyBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9Li4uYClcblxuXHRcdGxldCB7IGRvd25sb2FkUGF0aCB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQuZG93bmxvYWRBcnRpZmFjdChhcnRpZmFjdC5pZCwge1xuXHRcdFx0cGF0aDogYXJ0aWZhY3REaXIsXG5cdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0dG9rZW46IHRva2VuLFxuXHRcdFx0XHR3b3JrZmxvd1J1bklkOiB3b3JrZmxvd1J1bklkLFxuXHRcdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRcdHJlcG9zaXRvcnlPd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGFydGlmYWN0UGF0aCA9IGRvd25sb2FkUGF0aCB8fCBhcnRpZmFjdERpclxuXHRcdGRvd25sb2FkZWRQYXRocy5zZXQoYXJ0aWZhY3QubmFtZSwgYXJ0aWZhY3RQYXRoKVxuXG5cdFx0ZGVidWcoYERvd25sb2FkZWQgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfSB0byAke2FydGlmYWN0UGF0aH1gKVxuXHR9XG5cblx0Ly8gR3JvdXAgYXJ0aWZhY3RzIGJ5IHdvcmtsb2FkXG5cdGxldCBydW5BcnRpZmFjdHMgPSBuZXcgTWFwPHN0cmluZywgV29ya2xvYWRBcnRpZmFjdHM+KClcblxuXHRmb3IgKGxldCBbYXJ0aWZhY3ROYW1lLCBhcnRpZmFjdFBhdGhdIG9mIGRvd25sb2FkZWRQYXRocykge1xuXHRcdC8vIEFydGlmYWN0IG5hbWUgaXMgdGhlIHdvcmtsb2FkIG5hbWUsIGZpbGVzIGluc2lkZSBoYXZlIHdvcmtsb2FkIHByZWZpeFxuXHRcdGxldCB3b3JrbG9hZCA9IGFydGlmYWN0TmFtZVxuXG5cdFx0Ly8gTGlzdCBmaWxlcyBpbiBhcnRpZmFjdCBkaXJlY3Rvcnlcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoYXJ0aWZhY3RQYXRoKSkge1xuXHRcdFx0d2FybmluZyhgQXJ0aWZhY3QgcGF0aCBkb2VzIG5vdCBleGlzdDogJHthcnRpZmFjdFBhdGh9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0bGV0IHN0YXQgPSBmcy5zdGF0U3luYyhhcnRpZmFjdFBhdGgpXG5cdFx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG5cdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGFydGlmYWN0UGF0aCkubWFwKChmKSA9PiBwYXRoLmpvaW4oYXJ0aWZhY3RQYXRoLCBmKSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmlsZXMgPSBbYXJ0aWZhY3RQYXRoXVxuXHRcdH1cblxuXHRcdGxldCBncm91cCA9IHJ1bkFydGlmYWN0cy5nZXQod29ya2xvYWQpIHx8ICh7fSBhcyBXb3JrbG9hZEFydGlmYWN0cylcblx0XHRncm91cC5uYW1lID0gd29ya2xvYWRcblxuXHRcdGZvciAobGV0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdGxldCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSlcblxuXHRcdFx0aWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbG9ncy50eHQnKSkge1xuXHRcdFx0XHRncm91cC5sb2dzUGF0aCA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1ldmVudHMuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5ldmVudHNQYXRoID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldHJpY3MuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5tZXRyaWNzUGF0aCA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1tZXRhZGF0YS5qc29uJykpIHtcblx0XHRcdFx0Z3JvdXAubWV0YWRhdGFQYXRoID0gZmlsZVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkFydGlmYWN0cy5zZXQod29ya2xvYWQsIGdyb3VwKVxuXHR9XG5cblx0cmV0dXJuIHJ1bkFydGlmYWN0c1xufVxuIiwKICAgICIvKipcbiAqIEdpdEh1YiBDaGVja3MgQVBJIGludGVncmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuLi8uLi9zaGFyZWQvYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcyB9IGZyb20gJy4uLy4uL3NoYXJlZC90aHJlc2hvbGRzLmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDaGVja1RpdGxlKFxuXHRjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdGV2YWx1YXRpb246IFJldHVyblR5cGU8dHlwZW9mIGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzPlxuKTogc3RyaW5nIHtcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH0gY3JpdGljYWwgdGhyZXNob2xkKHMpIHZpb2xhdGVkYFxuXHR9XG5cblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyB0aHJlc2hvbGQocykgZXhjZWVkZWRgXG5cdH1cblxuXHRpZiAoY29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDApIHtcblx0XHRyZXR1cm4gYCR7Y29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50c30gaW1wcm92ZW1lbnQocykgZGV0ZWN0ZWRgXG5cdH1cblxuXHRyZXR1cm4gJ0FsbCBtZXRyaWNzIHdpdGhpbiB0aHJlc2hvbGRzJ1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDaGVja1N1bW1hcnkoXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvbixcblx0ZXZhbHVhdGlvbjogUmV0dXJuVHlwZTx0eXBlb2YgZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHM+LFxuXHRyZXBvcnRVUkw/OiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBsaW5lcyA9IFtcblx0XHRgKipNZXRyaWNzIGFuYWx5emVkOioqICR7Y29tcGFyaXNvbi5zdW1tYXJ5LnRvdGFsfWAsXG5cdFx0YC0g8J+foiBTdGFibGU6ICR7Y29tcGFyaXNvbi5zdW1tYXJ5LnN0YWJsZX1gLFxuXHRcdGAtIPCflLQgQ3JpdGljYWw6ICR7ZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGh9YCxcblx0XHRgLSDwn5+hIFdhcm5pbmdzOiAke2V2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RofWAsXG5cdFx0YC0g8J+agCBJbXByb3ZlbWVudHM6ICR7Y29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50c31gLFxuXHRcdCcnLFxuXHRdXG5cblx0aWYgKHJlcG9ydFVSTCkge1xuXHRcdGxpbmVzLnB1c2goYPCfk4ogW1ZpZXcgZGV0YWlsZWQgSFRNTCByZXBvcnRdKCR7cmVwb3J0VVJMfSlgLCAnJylcblx0fVxuXG5cdC8vIENyaXRpY2FsIGZhaWx1cmVzXG5cdGlmIChldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg4puUIENyaXRpY2FsIFRocmVzaG9sZHMgVmlvbGF0ZWQnLCAnJylcblxuXHRcdGZvciAobGV0IG1ldHJpYyBvZiBldmFsdWF0aW9uLmZhaWx1cmVzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsZXQgcmVhc29uID0gbWV0cmljLnJlYXNvbiA/IGAg4oCUICR7bWV0cmljLnJlYXNvbn1gIDogJydcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KSR7cmVhc29ufWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gV2FybmluZ3Ncblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDimqDvuI8gV2FybmluZyBUaHJlc2hvbGRzIEV4Y2VlZGVkJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgZXZhbHVhdGlvbi53YXJuaW5ncy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGV0IHJlYXNvbiA9IG1ldHJpYy5yZWFzb24gPyBgIOKAlCAke21ldHJpYy5yZWFzb259YCA6ICcnXG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSkke3JlYXNvbn1gXG5cdFx0XHQpXG5cdFx0fVxuXG5cdFx0bGluZXMucHVzaCgnJylcblx0fVxuXG5cdC8vIFRvcCBpbXByb3ZlbWVudHNcblx0bGV0IGltcHJvdmVtZW50cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5maWx0ZXIoKG0pID0+IG0uY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ2JldHRlcicpXG5cdFx0LnNvcnQoKGEsIGIpID0+IE1hdGguYWJzKGIuY2hhbmdlLnBlcmNlbnQpIC0gTWF0aC5hYnMoYS5jaGFuZ2UucGVyY2VudCkpXG5cblx0aWYgKGltcHJvdmVtZW50cy5sZW5ndGggPiAwKSB7XG5cdFx0bGluZXMucHVzaCgnIyMjIPCfmoAgVG9wIEltcHJvdmVtZW50cycsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGltcHJvdmVtZW50cy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBsaW5lcy5qb2luKCdcXG4nKVxufVxuIiwKICAgICJpbXBvcnQgeyBkZWJ1ZywgZ2V0SW5wdXQsIGluZm8gfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcbmltcG9ydCB0eXBlIHsgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi4vLi4vc2hhcmVkL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHsgZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMsIHR5cGUgVGhyZXNob2xkQ29uZmlnIH0gZnJvbSAnLi4vLi4vc2hhcmVkL3RocmVzaG9sZHMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWVudFJlcG9ydERhdGEge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdHRocmVzaG9sZHM6IFRocmVzaG9sZENvbmZpZ1xuXHRjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb25cblx0Y2hlY2tVcmw/OiBzdHJpbmdcblx0cmVwb3J0VXJsPzogc3RyaW5nXG59XG5cbi8qKlxuICogR2VuZXJhdGUgUFIgY29tbWVudCBib2R5XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUNvbW1lbnRCb2R5KHJlcG9ydHM6IENvbW1lbnRSZXBvcnREYXRhW10pOiBzdHJpbmcge1xuXHRsZXQgdG90YWxGYWlsdXJlcyA9IDBcblx0bGV0IHRvdGFsV2FybmluZ3MgPSAwXG5cblx0bGV0IHJvd3MgPSByZXBvcnRzLm1hcCgocmVwb3J0KSA9PiB7XG5cdFx0bGV0IGV2YWx1YXRpb24gPSBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcyhyZXBvcnQuY29tcGFyaXNvbi5tZXRyaWNzLCByZXBvcnQudGhyZXNob2xkcylcblxuXHRcdGlmIChldmFsdWF0aW9uLm92ZXJhbGwgPT09ICdmYWlsdXJlJykgdG90YWxGYWlsdXJlcysrXG5cdFx0aWYgKGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ3dhcm5pbmcnKSB0b3RhbFdhcm5pbmdzKytcblxuXHRcdGxldCBlbW9qaSA9XG5cdFx0XHRldmFsdWF0aW9uLm92ZXJhbGwgPT09ICdmYWlsdXJlJ1xuXHRcdFx0XHQ/ICfwn5S0J1xuXHRcdFx0XHQ6IGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ3dhcm5pbmcnXG5cdFx0XHRcdFx0PyAn8J+foSdcblx0XHRcdFx0XHQ6IHJlcG9ydC5jb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzID4gMFxuXHRcdFx0XHRcdFx0PyAn8J+agCdcblx0XHRcdFx0XHRcdDogJ/Cfn6InXG5cblx0XHRsZXQgY2hlY2tMaW5rID0gcmVwb3J0LmNoZWNrVXJsIHx8ICcjJ1xuXHRcdGxldCByZXBvcnRMaW5rID0gcmVwb3J0LnJlcG9ydFVybCB8fCAnIydcblx0XHRsZXQgY29tcCA9IHJlcG9ydC5jb21wYXJpc29uXG5cblx0XHRyZXR1cm4gYHwgJHtlbW9qaX0gfCAke2NvbXAud29ya2xvYWR9IHwgJHtjb21wLnN1bW1hcnkudG90YWx9IHwgJHtjb21wLnN1bW1hcnkucmVncmVzc2lvbnN9IHwgJHtjb21wLnN1bW1hcnkuaW1wcm92ZW1lbnRzfSB8IFtSZXBvcnRdKCR7cmVwb3J0TGlua30pIOKAoiBbQ2hlY2tdKCR7Y2hlY2tMaW5rfSkgfGBcblx0fSlcblxuXHRsZXQgc3RhdHVzRW1vamkgPSB0b3RhbEZhaWx1cmVzID4gMCA/ICfwn5S0JyA6IHRvdGFsV2FybmluZ3MgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdGxldCBzdGF0dXNUZXh0ID1cblx0XHR0b3RhbEZhaWx1cmVzID4gMFxuXHRcdFx0PyBgJHt0b3RhbEZhaWx1cmVzfSB3b3JrbG9hZHMgZmFpbGVkYFxuXHRcdFx0OiB0b3RhbFdhcm5pbmdzID4gMFxuXHRcdFx0XHQ/IGAke3RvdGFsV2FybmluZ3N9IHdvcmtsb2FkcyB3aXRoIHdhcm5pbmdzYFxuXHRcdFx0XHQ6ICdBbGwgcGFzc2VkJ1xuXG5cdGxldCBoZWFkZXIgPSBbXG5cdFx0YCMjIPCfjIsgU0xPIFRlc3QgUmVzdWx0c2AsXG5cdFx0YGAsXG5cdFx0YCoqU3RhdHVzKio6ICR7c3RhdHVzRW1vaml9ICR7cmVwb3J0cy5sZW5ndGh9IHdvcmtsb2FkcyB0ZXN0ZWQg4oCiICR7c3RhdHVzVGV4dH1gLFxuXHRcdCcnLFxuXHRdLmpvaW4oJ1xcbicpXG5cblx0bGV0IGNvbnRlbnQgPSBbXG5cdFx0J3wgfCBXb3JrbG9hZCB8IE1ldHJpY3MgfCBSZWdyZXNzaW9ucyB8IEltcHJvdmVtZW50cyB8IExpbmtzIHwnLFxuXHRcdCd8LXwtLS0tLS0tLS0tfC0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS18Jyxcblx0XHQuLi5yb3dzLFxuXHRdXG5cdFx0LmZsYXQoKVxuXHRcdC5qb2luKCdcXG4nKVxuXG5cdGxldCBmb290ZXIgPSBgXFxuLS0tXFxuKkdlbmVyYXRlZCBieSBbeWRiLXNsby1hY3Rpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb24pKmBcblxuXHRyZXR1cm4gaGVhZGVyICsgY29udGVudCArIGZvb3RlclxufVxuXG4vKipcbiAqIEZpbmQgZXhpc3RpbmcgY29tbWVudCBpbiBQUlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEV4aXN0aW5nQ29tbWVudChwdWxsOiBudW1iZXIpOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpXG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRpbmZvKGBTZWFyY2hpbmcgZm9yIGV4aXN0aW5nIFNMTyBjb21tZW50IGluIFBSICMke3B1bGx9Li4uYClcblxuXHRsZXQgeyBkYXRhOiBjb21tZW50cyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdGlzc3VlX251bWJlcjogcHVsbCxcblx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHR9KVxuXG5cdGZvciAobGV0IGNvbW1lbnQgb2YgY29tbWVudHMpIHtcblx0XHRpZiAoY29tbWVudC5ib2R5Py5pbmNsdWRlcygn8J+MiyBTTE8gVGVzdCBSZXN1bHRzJykpIHtcblx0XHRcdGluZm8oYEZvdW5kIGV4aXN0aW5nIGNvbW1lbnQ6ICR7Y29tbWVudC5pZH1gKVxuXHRcdFx0cmV0dXJuIGNvbW1lbnQuaWRcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIENyZWF0ZSBvciB1cGRhdGUgUFIgY29tbWVudFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlT3JVcGRhdGVDb21tZW50KHB1bGw6IG51bWJlciwgYm9keTogc3RyaW5nKTogUHJvbWlzZTx7IHVybDogc3RyaW5nOyBpZDogbnVtYmVyIH0+IHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpXG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXhpc3RpbmdJZCA9IGF3YWl0IGZpbmRFeGlzdGluZ0NvbW1lbnQocHVsbClcblxuXHRpZiAoZXhpc3RpbmdJZCkge1xuXHRcdGluZm8oYFVwZGF0aW5nIGV4aXN0aW5nIGNvbW1lbnQgJHtleGlzdGluZ0lkfS4uLmApXG5cblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLnVwZGF0ZUNvbW1lbnQoe1xuXHRcdFx0Y29tbWVudF9pZDogZXhpc3RpbmdJZCxcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGRlYnVnKGBDb21tZW50IHVwZGF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9IGVsc2Uge1xuXHRcdGluZm8oYENyZWF0aW5nIG5ldyBjb21tZW50Li4uYClcblxuXHRcdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMuY3JlYXRlQ29tbWVudCh7XG5cdFx0XHRpc3N1ZV9udW1iZXI6IHB1bGwsXG5cdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRkZWJ1ZyhgQ29tbWVudCBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRcdHJldHVybiB7IHVybDogZGF0YS5odG1sX3VybCEsIGlkOiBkYXRhLmlkIH1cblx0fVxufVxuIiwKICAgICIvKipcbiAqIENoYW9zIGV2ZW50cyBwYXJzaW5nIGFuZCBmb3JtYXR0aW5nXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBDaGFvc0V2ZW50IHtcblx0c2NyaXB0OiBzdHJpbmdcblx0ZXBvY2hfbXM6IG51bWJlclxuXHR0aW1lc3RhbXA6IHN0cmluZ1xuXHRkZXNjcmlwdGlvbjogc3RyaW5nXG5cdGR1cmF0aW9uX21zPzogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ybWF0dGVkRXZlbnQge1xuXHRpY29uOiBzdHJpbmdcblx0bGFiZWw6IHN0cmluZ1xuXHR0aW1lc3RhbXA6IG51bWJlciAvLyBtaWxsaXNlY29uZHMgKGVwb2NoX21zKVxuXHRkdXJhdGlvbl9tcz86IG51bWJlclxufVxuXG4vKipcbiAqIEdldCBpY29uIGZvciBldmVudCBiYXNlZCBvbiBkdXJhdGlvblxuICogRHVyYXRpb24gZXZlbnRzIChpbnRlcnZhbHMpIGdldCDij7HvuI9cbiAqIEluc3RhbnQgZXZlbnRzIGdldCDwn5ONXG4gKi9cbmZ1bmN0aW9uIGdldEV2ZW50SWNvbihoYXNEdXJhdGlvbjogYm9vbGVhbik6IHN0cmluZyB7XG5cdHJldHVybiBoYXNEdXJhdGlvbiA/ICfij7HvuI8nIDogJ/Cfk40nXG59XG5cbi8qKlxuICogRm9ybWF0IGV2ZW50cyBmb3IgdmlzdWFsaXphdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0Q2hhb3NFdmVudHMoZXZlbnRzOiBDaGFvc0V2ZW50W10pOiBGb3JtYXR0ZWRFdmVudFtdIHtcblx0cmV0dXJuIGV2ZW50cy5tYXAoKGV2ZW50KSA9PiAoe1xuXHRcdGljb246IGdldEV2ZW50SWNvbighIWV2ZW50LmR1cmF0aW9uX21zKSxcblx0XHRsYWJlbDogZXZlbnQuZGVzY3JpcHRpb24sXG5cdFx0dGltZXN0YW1wOiBldmVudC5lcG9jaF9tcyxcblx0XHRkdXJhdGlvbl9tczogZXZlbnQuZHVyYXRpb25fbXMsXG5cdH0pKVxufVxuIiwKICAgICJpbXBvcnQgeyBmb3JtYXRDaGFvc0V2ZW50cywgdHlwZSBDaGFvc0V2ZW50LCB0eXBlIEZvcm1hdHRlZEV2ZW50IH0gZnJvbSAnLi4vLi4vc2hhcmVkL2V2ZW50cy5qcydcblxuZXhwb3J0IGZ1bmN0aW9uIGxvYWRDaGFvc0V2ZW50cyhjb250ZW50OiBzdHJpbmcpOiBGb3JtYXR0ZWRFdmVudFtdIHtcblx0bGV0IGV2ZW50czogQ2hhb3NFdmVudFtdID0gW11cblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IGV2ZW50ID0gSlNPTi5wYXJzZShsaW5lKSBhcyBDaGFvc0V2ZW50XG5cdFx0XHRldmVudHMucHVzaChldmVudClcblx0XHR9IGNhdGNoIHtcblx0XHRcdC8vIFNraXAgaW52YWxpZCBsaW5lc1xuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gZm9ybWF0Q2hhb3NFdmVudHMoZXZlbnRzKVxufVxuIiwKICAgICIvKipcbiAqIEhUTUwgcmVwb3J0IGdlbmVyYXRpb24gd2l0aCBDaGFydC5qc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXZlbnRzLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMsIFJhbmdlU2VyaWVzIH0gZnJvbSAnLi4vLi4vc2hhcmVkL21ldHJpY3MuanMnXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4uLy4uL3NoYXJlZC9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBIVE1MUmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0Y3VycmVudFJlZjogc3RyaW5nXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmdcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXHRwck51bWJlcjogbnVtYmVyXG5cdHRlc3RTdGFydFRpbWU6IG51bWJlciAvLyBlcG9jaCBtc1xuXHR0ZXN0RW5kVGltZTogbnVtYmVyIC8vIGVwb2NoIG1zXG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCByZXBvcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSFRNTFJlcG9ydChkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cblx0PG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cblx0PHRpdGxlPlNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L3RpdGxlPlxuXHQ8c3R5bGU+JHtnZXRTdHlsZXMoKX08L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG5cdDxoZWFkZXI+XG5cdFx0PGgxPvCfjIsgU0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvaDE+XG5cdFx0PGRpdiBjbGFzcz1cImNvbW1pdC1pbmZvXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBjdXJyZW50XCI+XG5cdFx0XHRcdEN1cnJlbnQ6ICR7ZXNjYXBlSHRtbChkYXRhLmN1cnJlbnRSZWYpfVxuXHRcdFx0PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJ2c1wiPnZzPC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJjb21taXQgYmFzZWxpbmVcIj5cblx0XHRcdFx0QmFzZWxpbmU6ICR7ZXNjYXBlSHRtbChkYXRhLmJhc2VsaW5lUmVmKX1cblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibWV0YVwiPlxuXHRcdFx0PHNwYW4+UFIgIyR7ZGF0YS5wck51bWJlcn08L3NwYW4+XG5cdFx0XHQ8c3Bhbj5EdXJhdGlvbjogJHsoKGRhdGEudGVzdEVuZFRpbWUgLSBkYXRhLnRlc3RTdGFydFRpbWUpIC8gMTAwMCkudG9GaXhlZCgwKX1zPC9zcGFuPlxuXHRcdFx0PHNwYW4+R2VuZXJhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX08L3NwYW4+XG5cdFx0PC9kaXY+XG5cdDwvaGVhZGVyPlxuXG5cdDxzZWN0aW9uIGNsYXNzPVwic3VtbWFyeVwiPlxuXHRcdDxoMj7wn5OKIE1ldHJpY3MgT3ZlcnZpZXc8L2gyPlxuXHRcdDxkaXYgY2xhc3M9XCJzdGF0c1wiPlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZFwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkudG90YWx9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+VG90YWwgTWV0cmljczwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIGltcHJvdmVtZW50c1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPkltcHJvdmVtZW50czwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIHJlZ3Jlc3Npb25zXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5yZWdyZXNzaW9uc308L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5SZWdyZXNzaW9uczwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIHN0YWJsZVwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkuc3RhYmxlfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlN0YWJsZTwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0JHtnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShkYXRhLmNvbXBhcmlzb24pfVxuXHQ8L3NlY3Rpb24+XG5cblx0PHNlY3Rpb24gY2xhc3M9XCJjaGFydHNcIj5cblx0XHQ8aDI+8J+TiCBUaW1lIFNlcmllczwvaDI+XG5cdFx0JHtnZW5lcmF0ZUNoYXJ0cyhkYXRhLCBkYXRhLnRlc3RTdGFydFRpbWUsIGRhdGEudGVzdEVuZFRpbWUpfVxuXHQ8L3NlY3Rpb24+XG5cblx0PGZvb3Rlcj5cblx0XHQ8cD5HZW5lcmF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb25cIiB0YXJnZXQ9XCJfYmxhbmtcIj55ZGItc2xvLWFjdGlvbjwvYT48L3A+XG5cdDwvZm9vdGVyPlxuXG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydC5qcy9kaXN0L2NoYXJ0LnVtZC5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy9kaXN0L2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy5idW5kbGUubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uL2Rpc3QvY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbi5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdD5cblx0XHQke2dlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGEsIGRhdGEudGVzdFN0YXJ0VGltZSwgZGF0YS50ZXN0RW5kVGltZSl9XG5cdDwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPmBcbn1cblxuZnVuY3Rpb24gZXNjYXBlSHRtbCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gdGV4dFxuXHRcdC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG5cdFx0LnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuXHRcdC5yZXBsYWNlKC8+L2csICcmZ3Q7Jylcblx0XHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG5cdFx0LnJlcGxhY2UoLycvZywgJyYjMDM5OycpXG59XG5cbi8qKlxuICogR2V0IHJlbGV2YW50IGFnZ3JlZ2F0ZXMgZm9yIG1ldHJpYyBiYXNlZCBvbiBpdHMgdHlwZVxuICovXG5mdW5jdGlvbiBnZXRSZWxldmFudEFnZ3JlZ2F0ZXMobWV0cmljTmFtZTogc3RyaW5nKTogKCdhdmcnIHwgJ3A1MCcgfCAncDkwJyB8ICdwOTUnKVtdIHtcblx0bGV0IGxvd2VyTmFtZSA9IG1ldHJpY05hbWUudG9Mb3dlckNhc2UoKVxuXG5cdC8vIEF2YWlsYWJpbGl0eSBtZXRyaWNzOiBvbmx5IGF2ZyBhbmQgcDUwXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygndXB0aW1lJykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdzdWNjZXNzX3JhdGUnKSkge1xuXHRcdHJldHVybiBbJ2F2ZycsICdwNTAnXVxuXHR9XG5cblx0Ly8gTGF0ZW5jeS9kdXJhdGlvbiBtZXRyaWNzOiBwNTAsIHA5MCwgcDk1IChubyBhdmcpXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpIHx8XG5cdFx0bG93ZXJOYW1lLmVuZHNXaXRoKCdfbXMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZGVsYXknKVxuXHQpIHtcblx0XHRyZXR1cm4gWydwNTAnLCAncDkwJywgJ3A5NSddXG5cdH1cblxuXHQvLyBEZWZhdWx0OiBzaG93IGFsbFxuXHRyZXR1cm4gWydhdmcnLCAncDUwJywgJ3A5MCcsICdwOTUnXVxufVxuXG4vKipcbiAqIEZvcm1hdCBhZ2dyZWdhdGUgbmFtZSBmb3IgZGlzcGxheVxuICovXG5mdW5jdGlvbiBmb3JtYXRBZ2dyZWdhdGVOYW1lKGFnZzogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIGFnZyAvLyBLZWVwIHRlY2huaWNhbCBuYW1lczogcDUwLCBwOTAsIHA5NVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24pOiBzdHJpbmcge1xuXHRsZXQgcm93cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5tYXAoKG0pID0+IHtcblx0XHRcdHJldHVybiBgXG5cdFx0PHRyIGNsYXNzPVwiJHttLmNoYW5nZS5kaXJlY3Rpb259XCI+XG5cdFx0XHQ8dGQ+XG5cdFx0XHRcdDxhIGhyZWY9XCIjbWV0cmljLSR7c2FuaXRpemVJZChtLm5hbWUpfVwiIGNsYXNzPVwibWV0cmljLWxpbmtcIj5cblx0XHRcdFx0XHQke2VzY2FwZUh0bWwobS5uYW1lKX1cblx0XHRcdFx0PC9hPlxuXHRcdFx0PC90ZD5cblx0XHRcdDx0ZD4ke2Zvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKX08L3RkPlxuXHRcdFx0PHRkPiR7bS5iYXNlbGluZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2VsaW5lLnZhbHVlLCBtLm5hbWUpIDogJ04vQSd9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cImNoYW5nZS1jZWxsXCI+JHttLmJhc2VsaW5lLmF2YWlsYWJsZSA/IGZvcm1hdENoYW5nZShtLmNoYW5nZS5wZXJjZW50LCBtLmNoYW5nZS5kaXJlY3Rpb24pIDogJ04vQSd9PC90ZD5cblx0XHQ8L3RyPlxuXHRgXG5cdFx0fSlcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHRcdDx0YWJsZSBjbGFzcz1cImNvbXBhcmlzb24tdGFibGVcIj5cblx0XHRcdDx0aGVhZD5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5NZXRyaWM8L3RoPlxuXHRcdFx0XHRcdDx0aD5DdXJyZW50PC90aD5cblx0XHRcdFx0XHQ8dGg+QmFzZWxpbmU8L3RoPlxuXHRcdFx0XHRcdDx0aD5DaGFuZ2U8L3RoPlxuXHRcdFx0XHQ8L3RyPlxuXHRcdFx0PC90aGVhZD5cblx0XHRcdDx0Ym9keT5cblx0XHRcdFx0JHtyb3dzfVxuXHRcdFx0PC90Ym9keT5cblx0XHQ8L3RhYmxlPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRzKGRhdGE6IEhUTUxSZXBvcnREYXRhLCBnbG9iYWxTdGFydFRpbWU6IG51bWJlciwgZ2xvYmFsRW5kVGltZTogbnVtYmVyKTogc3RyaW5nIHtcblx0cmV0dXJuIGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKSAvLyBPbmx5IHJhbmdlIG1ldHJpY3MgaGF2ZSBjaGFydHNcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmZpbmQoKG0pID0+IG0ubmFtZSA9PT0gY29tcGFyaXNvbi5uYW1lKVxuXHRcdFx0aWYgKCFtZXRyaWMpIHJldHVybiAnJ1xuXG5cdFx0XHQvLyBTa2lwIG1ldHJpY3Mgd2l0aCBubyBkYXRhIChlbXB0eSBkYXRhIGFycmF5IG9yIG5vIHNlcmllcylcblx0XHRcdGlmICghbWV0cmljLmRhdGEgfHwgbWV0cmljLmRhdGEubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTa2lwIGlmIGFsbCBzZXJpZXMgYXJlIGVtcHR5XG5cdFx0XHRsZXQgaGFzRGF0YSA9IChtZXRyaWMuZGF0YSBhcyBSYW5nZVNlcmllc1tdKS5zb21lKChzKSA9PiBzLnZhbHVlcyAmJiBzLnZhbHVlcy5sZW5ndGggPiAwKVxuXHRcdFx0aWYgKCFoYXNEYXRhKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBGaWx0ZXIgZXZlbnRzIHRoYXQgYXJlIHJlbGV2YW50IHRvIHRoaXMgbWV0cmljJ3MgdGltZWZyYW1lXG5cdFx0XHRsZXQgcmVsZXZhbnRFdmVudHMgPSBkYXRhLmV2ZW50cy5maWx0ZXIoXG5cdFx0XHRcdChlKSA9PiBlLnRpbWVzdGFtcCA+PSBnbG9iYWxTdGFydFRpbWUgJiYgZS50aW1lc3RhbXAgPD0gZ2xvYmFsRW5kVGltZVxuXHRcdFx0KVxuXG5cdFx0XHRsZXQgZXZlbnRzVGltZWxpbmUgPSByZWxldmFudEV2ZW50cy5sZW5ndGggPiAwID8gZ2VuZXJhdGVDaGFydEV2ZW50c1RpbWVsaW5lKHJlbGV2YW50RXZlbnRzKSA6ICcnXG5cblx0XHRcdC8vIEdlbmVyYXRlIGFnZ3JlZ2F0ZXMgc3VtbWFyeSBmb3IgY2hhcnQgaGVhZGVyXG5cdFx0XHRsZXQgbWV0YVN1bW1hcnkgPSAnJ1xuXHRcdFx0aWYgKGNvbXBhcmlzb24uY3VycmVudC5hZ2dyZWdhdGVzICYmIGNvbXBhcmlzb24uYmFzZWxpbmUuYWdncmVnYXRlcykge1xuXHRcdFx0XHRsZXQgY3VycmVudEFnZyA9IGNvbXBhcmlzb24uY3VycmVudC5hZ2dyZWdhdGVzXG5cdFx0XHRcdGxldCBiYXNlQWdnID0gY29tcGFyaXNvbi5iYXNlbGluZS5hZ2dyZWdhdGVzXG5cblx0XHRcdFx0Ly8gR2V0IHJlbGV2YW50IGFnZ3JlZ2F0ZXMgZm9yIHRoaXMgbWV0cmljXG5cdFx0XHRcdGxldCByZWxldmFudEFnZ3MgPSBnZXRSZWxldmFudEFnZ3JlZ2F0ZXMoY29tcGFyaXNvbi5uYW1lKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIHRhYmxlIGhlYWRlclxuXHRcdFx0XHRsZXQgaGVhZGVyQ2VsbHMgPSByZWxldmFudEFnZ3MubWFwKChhZ2cpID0+IGA8dGg+JHtmb3JtYXRBZ2dyZWdhdGVOYW1lKGFnZyl9PC90aD5gKS5qb2luKCcnKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIGN1cnJlbnQgcm93XG5cdFx0XHRcdGxldCBjdXJyZW50Q2VsbHMgPSByZWxldmFudEFnZ3Ncblx0XHRcdFx0XHQubWFwKChhZ2cpID0+IGA8dGQ+JHtmb3JtYXRWYWx1ZShjdXJyZW50QWdnW2FnZ10sIGNvbXBhcmlzb24ubmFtZSl9PC90ZD5gKVxuXHRcdFx0XHRcdC5qb2luKCcnKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIGJhc2VsaW5lIHJvd1xuXHRcdFx0XHRsZXQgYmFzZUNlbGxzID0gcmVsZXZhbnRBZ2dzXG5cdFx0XHRcdFx0Lm1hcCgoYWdnKSA9PiBgPHRkPiR7Zm9ybWF0VmFsdWUoYmFzZUFnZ1thZ2ddLCBjb21wYXJpc29uLm5hbWUpfTwvdGQ+YClcblx0XHRcdFx0XHQuam9pbignJylcblxuXHRcdFx0XHRtZXRhU3VtbWFyeSA9IGBcblx0XHRcdFx0XHQ8dGFibGUgY2xhc3M9XCJhZ2dyZWdhdGVzLXRhYmxlXCI+XG5cdFx0XHRcdFx0XHQ8dGhlYWQ+XG5cdFx0XHRcdFx0XHRcdDx0cj5cblx0XHRcdFx0XHRcdFx0XHQ8dGg+PC90aD5cblx0XHRcdFx0XHRcdFx0XHQke2hlYWRlckNlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0PC90aGVhZD5cblx0XHRcdFx0XHRcdDx0Ym9keT5cblx0XHRcdFx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJvdy1sYWJlbFwiPkN1cnJlbnQ8L3RkPlxuXHRcdFx0XHRcdFx0XHRcdCR7Y3VycmVudENlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicm93LWxhYmVsXCI+QmFzZWxpbmU8L3RkPlxuXHRcdFx0XHRcdFx0XHRcdCR7YmFzZUNlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0PC90Ym9keT5cblx0XHRcdFx0XHQ8L3RhYmxlPlxuXHRcdFx0XHRgXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtZXRhU3VtbWFyeSA9IGBcblx0XHRcdFx0XHRDdXJyZW50OiAke2Zvcm1hdFZhbHVlKGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSwgY29tcGFyaXNvbi5uYW1lKX1cblx0XHRcdFx0XHQke2NvbXBhcmlzb24uYmFzZWxpbmUuYXZhaWxhYmxlID8gYCDigKIgQmFzZWxpbmU6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5iYXNlbGluZS52YWx1ZSwgY29tcGFyaXNvbi5uYW1lKX1gIDogJyd9XG5cdFx0XHRcdGBcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtY2FyZFwiIGlkPVwibWV0cmljLSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWhlYWRlclwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtdGl0bGUtc2VjdGlvblwiPlxuXHRcdFx0XHRcdDxoMz5cblx0XHRcdFx0XHRcdCR7ZXNjYXBlSHRtbChjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJpbmRpY2F0b3IgJHtjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb259XCI+JHtmb3JtYXRDaGFuZ2UoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCwgY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uKX08L3NwYW4+XG5cdFx0XHRcdFx0PC9oMz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1tZXRhXCI+XG5cdFx0XHRcdFx0JHttZXRhU3VtbWFyeX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1jb250YWluZXJcIj5cblx0XHRcdFx0PGNhbnZhcyBpZD1cImNoYXJ0LSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPjwvY2FudmFzPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQke2V2ZW50c1RpbWVsaW5lfVxuXHRcdDwvZGl2PlxuXHRgXG5cdFx0fSlcblx0XHQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydEV2ZW50c1RpbWVsaW5lKGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSk6IHN0cmluZyB7XG5cdGlmIChldmVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gJydcblxuXHRsZXQgZXZlbnRJdGVtcyA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSwgaWR4KSA9PiBgXG5cdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLWV2ZW50XCIgZGF0YS1ldmVudC1pZD1cIiR7aWR4fVwiIHRpdGxlPVwiJHtlc2NhcGVIdG1sKGUubGFiZWwpfVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1pY29uXCI+JHtlLmljb259PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC10aW1lXCI+JHtmb3JtYXRUaW1lc3RhbXAoZS50aW1lc3RhbXApfTwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtbGFiZWxcIj4ke2VzY2FwZUh0bWwoZS5sYWJlbCl9PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRgXG5cdFx0KVxuXHRcdC5qb2luKCcnKVxuXG5cdHJldHVybiBgXG5cdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWV2ZW50cy10aW1lbGluZVwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLXRpdGxlXCI+RXZlbnRzOjwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLWV2ZW50c1wiPlxuXHRcdFx0XHQke2V2ZW50SXRlbXN9XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0YFxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNoYXJ0U2NyaXB0cyhkYXRhOiBIVE1MUmVwb3J0RGF0YSwgZ2xvYmFsU3RhcnRUaW1lOiBudW1iZXIsIGdsb2JhbEVuZFRpbWU6IG51bWJlcik6IHN0cmluZyB7XG5cdGxldCBjaGFydFNjcmlwdHMgPSBkYXRhLmNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5maWx0ZXIoKG0pID0+IG0udHlwZSA9PT0gJ3JhbmdlJylcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmZpbmQoKG0pID0+IG0ubmFtZSA9PT0gY29tcGFyaXNvbi5uYW1lKVxuXHRcdFx0aWYgKCFtZXRyaWMpIHJldHVybiAnJ1xuXG5cdFx0XHQvLyBTa2lwIG1ldHJpY3Mgd2l0aCBubyBkYXRhXG5cdFx0XHRpZiAoIW1ldHJpYy5kYXRhIHx8IG1ldHJpYy5kYXRhLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdH1cblx0XHRcdGxldCBoYXNEYXRhID0gKG1ldHJpYy5kYXRhIGFzIFJhbmdlU2VyaWVzW10pLnNvbWUoKHMpID0+IHMudmFsdWVzICYmIHMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRpZiAoIWhhc0RhdGEpIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBnZW5lcmF0ZVNpbmdsZUNoYXJ0U2NyaXB0KFxuXHRcdFx0XHRjb21wYXJpc29uLm5hbWUsXG5cdFx0XHRcdG1ldHJpYyBhcyBDb2xsZWN0ZWRNZXRyaWMsXG5cdFx0XHRcdGRhdGEuZXZlbnRzLFxuXHRcdFx0XHRnbG9iYWxTdGFydFRpbWUsXG5cdFx0XHRcdGdsb2JhbEVuZFRpbWUsXG5cdFx0XHRcdGRhdGEuY3VycmVudFJlZixcblx0XHRcdFx0ZGF0YS5iYXNlbGluZVJlZlxuXHRcdFx0KVxuXHRcdH0pXG5cdFx0LmpvaW4oJ1xcbicpXG5cblx0cmV0dXJuIGNoYXJ0U2NyaXB0c1xufVxuXG4vKipcbiAqIEZpbHRlciBvdXRsaWVycyBmcm9tIHRpbWUgc2VyaWVzIGRhdGEgdXNpbmcgcGVyY2VudGlsZXNcbiAqIFJlbW92ZXMgdmFsdWVzIG91dHNpZGUgW3AxLCBwOTldIHJhbmdlXG4gKi9cbmZ1bmN0aW9uIGZpbHRlck91dGxpZXJzKHZhbHVlczogW251bWJlciwgc3RyaW5nXVtdKTogW251bWJlciwgc3RyaW5nXVtdIHtcblx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZXNcblxuXHQvLyBFeHRyYWN0IG51bWVyaWMgdmFsdWVzXG5cdGxldCBudW1zID0gdmFsdWVzLm1hcCgoWywgdl0pID0+IHBhcnNlRmxvYXQodikpLmZpbHRlcigobikgPT4gIWlzTmFOKG4pKVxuXHRpZiAobnVtcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZXNcblxuXHQvLyBTb3J0IGZvciBwZXJjZW50aWxlIGNhbGN1bGF0aW9uXG5cdG51bXMuc29ydCgoYSwgYikgPT4gYSAtIGIpXG5cblx0Ly8gQ2FsY3VsYXRlIHAxIGFuZCBwOTlcblx0bGV0IHAxSW5kZXggPSBNYXRoLmZsb29yKG51bXMubGVuZ3RoICogMC4wMSlcblx0bGV0IHA5OUluZGV4ID0gTWF0aC5mbG9vcihudW1zLmxlbmd0aCAqIDAuOTkpXG5cdGxldCBwMSA9IG51bXNbcDFJbmRleF1cblx0bGV0IHA5OSA9IG51bXNbcDk5SW5kZXhdXG5cblx0Ly8gRmlsdGVyIHZhbHVlcyB3aXRoaW4gW3AxLCBwOTldXG5cdHJldHVybiB2YWx1ZXMuZmlsdGVyKChbLCB2XSkgPT4ge1xuXHRcdGxldCBudW0gPSBwYXJzZUZsb2F0KHYpXG5cdFx0cmV0dXJuICFpc05hTihudW0pICYmIG51bSA+PSBwMSAmJiBudW0gPD0gcDk5XG5cdH0pXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoXG5cdG1ldHJpY05hbWU6IHN0cmluZyxcblx0bWV0cmljOiBDb2xsZWN0ZWRNZXRyaWMsXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSxcblx0Z2xvYmFsU3RhcnRUaW1lOiBudW1iZXIsXG5cdGdsb2JhbEVuZFRpbWU6IG51bWJlcixcblx0Y3VycmVudFJlZjogc3RyaW5nLFxuXHRiYXNlbGluZVJlZjogc3RyaW5nXG4pOiBzdHJpbmcge1xuXHRsZXQgY3VycmVudFNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBSYW5nZVNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpXG5cdGxldCBiYXNlbGluZVNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBSYW5nZVNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGJhc2VsaW5lUmVmKVxuXG5cdC8vIEZpbHRlciBvdXRsaWVycyBmcm9tIGJvdGggc2VyaWVzXG5cdGxldCBmaWx0ZXJlZEN1cnJlbnRWYWx1ZXMgPSBjdXJyZW50U2VyaWVzID8gZmlsdGVyT3V0bGllcnMoY3VycmVudFNlcmllcy52YWx1ZXMpIDogW11cblx0bGV0IGZpbHRlcmVkQmFzZWxpbmVWYWx1ZXMgPSBiYXNlbGluZVNlcmllcyA/IGZpbHRlck91dGxpZXJzKGJhc2VsaW5lU2VyaWVzLnZhbHVlcykgOiBbXVxuXG5cdGxldCBjdXJyZW50RGF0YSA9XG5cdFx0ZmlsdGVyZWRDdXJyZW50VmFsdWVzLmxlbmd0aCA+IDBcblx0XHRcdD8gSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWRDdXJyZW50VmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0XHQ6ICdbXSdcblxuXHRsZXQgYmFzZWxpbmVEYXRhID1cblx0XHRmaWx0ZXJlZEJhc2VsaW5lVmFsdWVzLmxlbmd0aCA+IDBcblx0XHRcdD8gSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWRCYXNlbGluZVZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdFx0OiAnW10nXG5cblx0Ly8gR2VuZXJhdGUgYW5ub3RhdGlvbnMgZm9yIHRlc3QgYm91bmRhcmllc1xuXHRsZXQgYm91bmRhcnlBbm5vdGF0aW9uczogc3RyaW5nW10gPSBbXG5cdFx0YHtcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdHhNaW46ICR7Z2xvYmFsU3RhcnRUaW1lfSxcblx0XHRcdHhNYXg6ICR7Z2xvYmFsU3RhcnRUaW1lfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnIzEwYjk4MScsXG5cdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdGJvcmRlckRhc2g6IFs1LCA1XVxuXHRcdH1gLFxuXHRcdGB7XG5cdFx0XHR0eXBlOiAnbGluZScsXG5cdFx0XHR4TWluOiAke2dsb2JhbEVuZFRpbWV9LFxuXHRcdFx0eE1heDogJHtnbG9iYWxFbmRUaW1lfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnI2VmNDQ0NCcsXG5cdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdGJvcmRlckRhc2g6IFs1LCA1XVxuXHRcdH1gLFxuXHRdXG5cblx0Ly8gU2VwYXJhdGUgZXZlbnRzIGludG8gYm94ZXMgKHdpdGggZHVyYXRpb24pIGFuZCBsaW5lcyAoaW5zdGFudClcblx0bGV0IGJveEFubm90YXRpb25zOiBzdHJpbmdbXSA9IFtdXG5cdGxldCBsaW5lQW5ub3RhdGlvbnM6IHN0cmluZ1tdID0gW11cblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdGxldCBlID0gZXZlbnRzW2ldXG5cdFx0aWYgKGUuZHVyYXRpb25fbXMpIHtcblx0XHRcdC8vIEJveCBhbm5vdGF0aW9uIGZvciBldmVudHMgd2l0aCBkdXJhdGlvbiAodGltZXN0YW1wIGFscmVhZHkgaW4gbXMpXG5cdFx0XHRsZXQgeE1heCA9IGUudGltZXN0YW1wICsgZS5kdXJhdGlvbl9tc1xuXHRcdFx0Ly8gQWRkIHNlbWktdHJhbnNwYXJlbnQgYm94IChiZWhpbmQgZ3JhcGgpXG5cdFx0XHRib3hBbm5vdGF0aW9ucy5wdXNoKGB7XG5cdFx0XHRpZDogJ2V2ZW50LWJnLSR7aX0nLFxuXHRcdFx0dHlwZTogJ2JveCcsXG5cdFx0XHRkcmF3VGltZTogJ2JlZm9yZURhdGFzZXRzRHJhdycsXG5cdFx0XHR4TWluOiAke2UudGltZXN0YW1wfSxcblx0XHRcdHhNYXg6ICR7eE1heH0sXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDI1MSwgMTQ2LCA2MCwgMC4wOCknLFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICd0cmFuc3BhcmVudCcsXG5cdFx0XHRib3JkZXJXaWR0aDogMFxuXHRcdH1gKVxuXHRcdFx0Ly8gQWRkIHRoaWNrIGhvcml6b250YWwgbGluZSBhdCBib3R0b20gKGJlaGluZCBncmFwaClcblx0XHRcdGJveEFubm90YXRpb25zLnB1c2goYHtcblx0XHRcdGlkOiAnZXZlbnQtYmFyLSR7aX0nLFxuXHRcdFx0dHlwZTogJ2JveCcsXG5cdFx0XHRkcmF3VGltZTogJ2JlZm9yZURhdGFzZXRzRHJhdycsXG5cdFx0XHR4TWluOiAke2UudGltZXN0YW1wfSxcblx0XHRcdHhNYXg6ICR7eE1heH0sXG5cdFx0XHR5TWluOiAoY3R4KSA9PiBjdHguY2hhcnQuc2NhbGVzLnkubWluLFxuXHRcdFx0eU1heDogKGN0eCkgPT4gY3R4LmNoYXJ0LnNjYWxlcy55Lm1pbiArIChjdHguY2hhcnQuc2NhbGVzLnkubWF4IC0gY3R4LmNoYXJ0LnNjYWxlcy55Lm1pbikgKiAwLjAyLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2Y5NzMxNicsXG5cdFx0XHRib3JkZXJDb2xvcjogJ3RyYW5zcGFyZW50Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAwXG5cdFx0fWApXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIExpbmUgYW5ub3RhdGlvbiBmb3IgaW5zdGFudCBldmVudHMgKHRpbWVzdGFtcCBhbHJlYWR5IGluIG1zKVxuXHRcdFx0bGluZUFubm90YXRpb25zLnB1c2goYHtcblx0XHRcdGlkOiAnZXZlbnQtbGluZS0ke2l9Jyxcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdGRyYXdUaW1lOiAnYWZ0ZXJEYXRhc2V0c0RyYXcnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcH0sXG5cdFx0XHR4TWF4OiAke2UudGltZXN0YW1wfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnI2Y5NzMxNicsXG5cdFx0XHRib3JkZXJXaWR0aDogMlxuXHRcdH1gKVxuXHRcdH1cblx0fVxuXG5cdC8vIENvbWJpbmUgYWxsIGFubm90YXRpb25zOiBib3hlcyBmaXJzdCAoYmVoaW5kKSwgdGhlbiBib3VuZGFyaWVzLCB0aGVuIGxpbmVzIChmcm9udClcblx0bGV0IGFsbEFubm90YXRpb25zID0gWy4uLmJveEFubm90YXRpb25zLCAuLi5ib3VuZGFyeUFubm90YXRpb25zLCAuLi5saW5lQW5ub3RhdGlvbnNdLmpvaW4oJyxcXG4nKVxuXG5cdHJldHVybiBgXG4oZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGN0eCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFydC0ke3Nhbml0aXplSWQobWV0cmljTmFtZSl9Jyk7XG5cdGlmICghY3R4KSByZXR1cm47XG5cblx0Y29uc3QgY2hhcnQgPSBuZXcgQ2hhcnQoY3R4LCB7XG5cdFx0dHlwZTogJ2xpbmUnLFxuXHRcdGRhdGE6IHtcblx0XHRkYXRhc2V0czogW1xuXHRcdFx0e1xuXHRcdFx0XHRsYWJlbDogJyR7ZXNjYXBlSHRtbChjdXJyZW50UmVmKX0nLFxuXHRcdFx0XHRkYXRhOiAke2N1cnJlbnREYXRhfSxcblx0XHRcdFx0Ym9yZGVyQ29sb3I6ICcjM2I4MmY2Jyxcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzNiODJmNjIwJyxcblx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRwb2ludEhvdmVyUmFkaXVzOiA0LFxuXHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdH0sXG5cdFx0XHQke1xuXHRcdFx0XHRiYXNlbGluZVNlcmllc1xuXHRcdFx0XHRcdD8gYHtcblx0XHRcdFx0bGFiZWw6ICcke2VzY2FwZUh0bWwoYmFzZWxpbmVSZWYpfScsXG5cdFx0XHRcdGRhdGE6ICR7YmFzZWxpbmVEYXRhfSxcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogJyM5NGEzYjgnLFxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM5NGEzYjgyMCcsXG5cdFx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdLFxuXHRcdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdFx0fWBcblx0XHRcdFx0XHQ6ICcnXG5cdFx0XHR9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRyZXNwb25zaXZlOiB0cnVlLFxuXHRcdFx0bWFpbnRhaW5Bc3BlY3RSYXRpbzogZmFsc2UsXG5cdFx0XHRpbnRlcmFjdGlvbjoge1xuXHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRpbnRlcnNlY3Q6IGZhbHNlXG5cdFx0XHR9LFxuXHRcdHNjYWxlczoge1xuXHRcdFx0eDoge1xuXHRcdFx0XHR0eXBlOiAndGltZScsXG5cdFx0XHRcdG1pbjogJHtnbG9iYWxTdGFydFRpbWV9LFxuXHRcdFx0XHRtYXg6ICR7Z2xvYmFsRW5kVGltZX0sXG5cdFx0XHRcdHRpbWU6IHtcblx0XHRcdFx0XHR1bml0OiAnbWludXRlJyxcblx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0czoge1xuXHRcdFx0XHRcdFx0bWludXRlOiAnSEg6bW0nXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0dGV4dDogJ1RpbWUnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcdHk6IHtcblx0XHRcdFx0XHRiZWdpbkF0WmVybzogZmFsc2UsXG5cdFx0XHRcdFx0Z3JhY2U6ICcxMCUnLFxuXHRcdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdFx0dGV4dDogJyR7ZXNjYXBlSnMobWV0cmljTmFtZSl9J1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBsdWdpbnM6IHtcblx0XHRcdFx0bGVnZW5kOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRwb3NpdGlvbjogJ3RvcCdcblx0XHRcdFx0fSxcblx0XHRcdFx0dG9vbHRpcDoge1xuXHRcdFx0XHRcdG1vZGU6ICdpbmRleCcsXG5cdFx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbm5vdGF0aW9uOiB7XG5cdFx0XHRcdFx0YW5ub3RhdGlvbnM6IFske2FsbEFubm90YXRpb25zfV1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0Ly8gU3RvcmUgY2hhcnQgcmVmZXJlbmNlIGZvciBpbnRlcmFjdGlvblxuXHRjdHguY2hhcnRJbnN0YW5jZSA9IGNoYXJ0O1xuXG5cdC8vIEFkZCBob3ZlciBoYW5kbGVycyBmb3IgdGltZWxpbmUgZXZlbnRzXG5cdGNvbnN0IGNoYXJ0Q2FyZCA9IGN0eC5jbG9zZXN0KCcuY2hhcnQtY2FyZCcpO1xuXHRpZiAoY2hhcnRDYXJkKSB7XG5cdFx0Y29uc3QgdGltZWxpbmVFdmVudHMgPSBjaGFydENhcmQucXVlcnlTZWxlY3RvckFsbCgnLnRpbWVsaW5lLWV2ZW50Jyk7XG5cdFx0dGltZWxpbmVFdmVudHMuZm9yRWFjaCgoZXZlbnRFbCkgPT4ge1xuXHRcdFx0Y29uc3QgZXZlbnRJZCA9IHBhcnNlSW50KGV2ZW50RWwuZ2V0QXR0cmlidXRlKCdkYXRhLWV2ZW50LWlkJykpO1xuXG5cdFx0XHRldmVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCAoKSA9PiB7XG5cdFx0XHRcdC8vIEFjY2VzcyBhbm5vdGF0aW9ucyBhcnJheVxuXHRcdFx0XHRjb25zdCBhbm5vdGF0aW9ucyA9IGNoYXJ0LmNvbmZpZy5vcHRpb25zLnBsdWdpbnMuYW5ub3RhdGlvbi5hbm5vdGF0aW9ucztcblxuXHRcdFx0XHQvLyBGaW5kIGFuZCB1cGRhdGUgYW5ub3RhdGlvbnMgZm9yIHRoaXMgZXZlbnRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbm5vdGF0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IGFubiA9IGFubm90YXRpb25zW2ldO1xuXHRcdFx0XHRcdGlmIChhbm4uaWQgPT09ICdldmVudC1iZy0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1MSwgMTQ2LCA2MCwgMC4zNSknO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtYmFyLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJyNmYjkyM2MnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtbGluZS0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlckNvbG9yID0gJyNmYjkyM2MnO1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlcldpZHRoID0gNDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjaGFydC51cGRhdGUoJ25vbmUnKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRldmVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG5cdFx0XHRcdC8vIEFjY2VzcyBhbm5vdGF0aW9ucyBhcnJheVxuXHRcdFx0XHRjb25zdCBhbm5vdGF0aW9ucyA9IGNoYXJ0LmNvbmZpZy5vcHRpb25zLnBsdWdpbnMuYW5ub3RhdGlvbi5hbm5vdGF0aW9ucztcblxuXHRcdFx0XHQvLyBSZXN0b3JlIGFubm90YXRpb25zIGZvciB0aGlzIGV2ZW50XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRjb25zdCBhbm4gPSBhbm5vdGF0aW9uc1tpXTtcblx0XHRcdFx0XHRpZiAoYW5uLmlkID09PSAnZXZlbnQtYmctJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTEsIDE0NiwgNjAsIDAuMDgpJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubi5pZCA9PT0gJ2V2ZW50LWJhci0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICcjZjk3MzE2Jztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubi5pZCA9PT0gJ2V2ZW50LWxpbmUtJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5ib3JkZXJDb2xvciA9ICcjZjk3MzE2Jztcblx0XHRcdFx0XHRcdGFubi5ib3JkZXJXaWR0aCA9IDI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2hhcnQudXBkYXRlKCdub25lJyk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufSkoKTtcbmBcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVJZChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvW15hLXpBLVowLTldL2csICctJylcbn1cblxuZnVuY3Rpb24gZXNjYXBlSnMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZXN0YW1wKHRpbWVzdGFtcDogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXApIC8vIHRpbWVzdGFtcCBhbHJlYWR5IGluIG1pbGxpc2Vjb25kc1xuXHQvLyBGb3JtYXQgYXMgbG9jYWwgdGltZSBISDpNTTpTU1xuXHRsZXQgaG91cnMgPSBkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cdGxldCBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cdGxldCBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cdHJldHVybiBgJHtob3Vyc306JHttaW51dGVzfToke3NlY29uZHN9YFxufVxuXG5mdW5jdGlvbiBnZXRTdHlsZXMoKTogc3RyaW5nIHtcblx0cmV0dXJuIGBcbioge1xuXHRtYXJnaW46IDA7XG5cdHBhZGRpbmc6IDA7XG5cdGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG59XG5cbmh0bWwge1xuXHRzY3JvbGwtYmVoYXZpb3I6IHNtb290aDtcbn1cblxuYm9keSB7XG5cdGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgJ0hlbHZldGljYSBOZXVlJywgQXJpYWwsIHNhbnMtc2VyaWY7XG5cdGxpbmUtaGVpZ2h0OiAxLjY7XG5cdGNvbG9yOiAjMjQyOTJmO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRwYWRkaW5nOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGJvZHkge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Y29sb3I6ICNjOWQxZDk7XG5cdH1cbn1cblxuaGVhZGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogMCBhdXRvIDQwcHg7XG5cdHBhZGRpbmc6IDMwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRoZWFkZXIge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmhlYWRlciBoMSB7XG5cdGZvbnQtc2l6ZTogMzJweDtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNvbW1pdC1pbmZvIHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxMHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuLmNvbW1pdCB7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG4uY29tbWl0LmN1cnJlbnQge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmNvbW1pdC5iYXNlbGluZSB7XG5cdGJhY2tncm91bmQ6ICNkZGY0ZmY7XG5cdGNvbG9yOiAjMDk2OWRhO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21taXQuY3VycmVudCB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjtcblx0XHRjb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuY29tbWl0LmJhc2VsaW5lIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGMyZDZiO1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbi5jb21taXQgYSB7XG5cdGNvbG9yOiBpbmhlcml0O1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5jb21taXQgYTpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG4udnMge1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLm1ldGEge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuc2VjdGlvbiB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDAgYXV0byA0MHB4O1xufVxuXG5zZWN0aW9uIGgyIHtcblx0Zm9udC1zaXplOiAyNHB4O1xuXHRtYXJnaW4tYm90dG9tOiAyMHB4O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcblx0cGFkZGluZy1ib3R0b206IDEwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0c2VjdGlvbiBoMiB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5zdGF0cyB7XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZml0LCBtaW5tYXgoMjAwcHgsIDFmcikpO1xuXHRnYXA6IDE1cHg7XG5cdG1hcmdpbi1ib3R0b206IDMwcHg7XG59XG5cbi5zdGF0LWNhcmQge1xuXHRwYWRkaW5nOiAyMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdGJvcmRlcjogMnB4IHNvbGlkICNkMGQ3ZGU7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcbn1cblxuLnN0YXQtY2FyZC5pbXByb3ZlbWVudHMge1xuXHRib3JkZXItY29sb3I6ICMxYTdmMzc7XG59XG5cbi5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRib3JkZXItY29sb3I6ICNjZjIyMmU7XG59XG5cbi5zdGF0LWNhcmQuc3RhYmxlIHtcblx0Ym9yZGVyLWNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5zdGF0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG5cdC5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0XHRib3JkZXItY29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LnN0YXQtY2FyZC5yZWdyZXNzaW9ucyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjZjg1MTQ5O1xuXHR9XG5cdC5zdGF0LWNhcmQuc3RhYmxlIHtcblx0XHRib3JkZXItY29sb3I6ICM4Yjk0OWU7XG5cdH1cbn1cblxuLnN0YXQtdmFsdWUge1xuXHRmb250LXNpemU6IDM2cHg7XG5cdGZvbnQtd2VpZ2h0OiA3MDA7XG5cdG1hcmdpbi1ib3R0b206IDVweDtcbn1cblxuLnN0YXQtbGFiZWwge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXdlaWdodDogNTAwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB7XG5cdHdpZHRoOiAxMDAlO1xuXHRib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdG92ZXJmbG93OiBoaWRkZW47XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoLFxuLmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRwYWRkaW5nOiAxMnB4IDE2cHg7XG5cdHRleHQtYWxpZ246IGxlZnQ7XG5cdGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoLFxuXHQuY29tcGFyaXNvbi10YWJsZSB0ZCB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyOmxhc3QtY2hpbGQgdGQge1xuXHRib3JkZXItYm90dG9tOiBub25lO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkMjA7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTIwO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjIwO1xuXHR9XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkMjA7XG5cdH1cbn1cblxuLmNoYW5nZS1jZWxsIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLm1ldHJpYy1saW5rIHtcblx0Y29sb3I6ICMwOTY5ZGE7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbn1cblxuLm1ldHJpYy1saW5rOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Lm1ldHJpYy1saW5rIHtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG4uY2hhcnQtY2FyZCB7XG5cdG1hcmdpbi1ib3R0b206IDQwcHg7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdGJvcmRlcjogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0cGFkZGluZzogMjBweDtcblx0c2Nyb2xsLW1hcmdpbi10b3A6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNoYXJ0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jaGFydC1oZWFkZXIge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG5cdGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0O1xuXHRnYXA6IDI0cHg7XG5cdG1hcmdpbi1ib3R0b206IDE1cHg7XG59XG5cbi5jaGFydC10aXRsZS1zZWN0aW9uIGgzIHtcblx0Zm9udC1zaXplOiAxOHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcblx0bWFyZ2luOiAwO1xufVxuXG4uaW5kaWNhdG9yIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRwYWRkaW5nOiA0cHggOHB4O1xuXHRib3JkZXItcmFkaXVzOiA0cHg7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5pbmRpY2F0b3IuYmV0dGVyIHtcblx0YmFja2dyb3VuZDogI2RmZjZkZDtcblx0Y29sb3I6ICMxYTdmMzc7XG59XG5cbi5pbmRpY2F0b3Iud29yc2Uge1xuXHRiYWNrZ3JvdW5kOiAjZmZlYmU5O1xuXHRjb2xvcjogI2NmMjIyZTtcbn1cblxuLmluZGljYXRvci5uZXV0cmFsIHtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Y29sb3I6ICM2ZTc3ODE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmluZGljYXRvci5iZXR0ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTY7XG5cdFx0Y29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LmluZGljYXRvci53b3JzZSB7XG5cdFx0YmFja2dyb3VuZDogIzg2MTgxZDtcblx0XHRjb2xvcjogI2ZmN2I3Mjtcblx0fVxuXHQuaW5kaWNhdG9yLm5ldXRyYWwge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Y29sb3I6ICM4Yjk0OWU7XG5cdH1cbn1cblxuLmNoYXJ0LW1ldGEge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmbGV4LXNocmluazogMDtcbn1cblxuLmFnZ3JlZ2F0ZXMtdGFibGUge1xuXHR3aWR0aDogYXV0bztcblx0Ym9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTtcblx0Zm9udC1zaXplOiAxM3B4O1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSB0aCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdHBhZGRpbmc6IDRweCAxMnB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGNvbG9yOiAjNjU2ZDc2O1xuXHRmb250LWZhbWlseTogJ1NGIE1vbm8nLCAnTW9uYWNvJywgJ0luY29uc29sYXRhJywgJ1JvYm90byBNb25vJywgJ0NvbnNvbGFzJywgbW9ub3NwYWNlO1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSB0ZCB7XG5cdHBhZGRpbmc6IDRweCAxMnB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGZvbnQtZmFtaWx5OiAnU0YgTW9ubycsICdNb25hY28nLCAnSW5jb25zb2xhdGEnLCAnUm9ib3RvIE1vbm8nLCAnQ29uc29sYXMnLCBtb25vc3BhY2U7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIC5yb3ctbGFiZWwge1xuXHRmb250LXdlaWdodDogNjAwO1xuXHR0ZXh0LWFsaWduOiByaWdodDtcblx0Y29sb3I6ICMxZjIzMjg7XG5cdHBhZGRpbmctcmlnaHQ6IDE2cHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmFnZ3JlZ2F0ZXMtdGFibGUgLnJvdy1sYWJlbCB7XG5cdFx0Y29sb3I6ICNlNmVkZjM7XG5cdH1cbn1cblxuLmNoYXJ0LWNvbnRhaW5lciB7XG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0aGVpZ2h0OiA0MDBweDtcbn1cblxuLmNoYXJ0LWV2ZW50cy10aW1lbGluZSB7XG5cdG1hcmdpbi10b3A6IDE1cHg7XG5cdHBhZGRpbmctdG9wOiAxNXB4O1xuXHRib3JkZXItdG9wOiAxcHggc29saWQgI2U1ZTdlYjtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY2hhcnQtZXZlbnRzLXRpbWVsaW5lIHtcblx0XHRib3JkZXItdG9wLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi50aW1lbGluZS10aXRsZSB7XG5cdGZvbnQtc2l6ZTogMTNweDtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0Y29sb3I6ICM2NTZkNzY7XG5cdG1hcmdpbi1ib3R0b206IDEwcHg7XG59XG5cbi50aW1lbGluZS1ldmVudHMge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRnYXA6IDhweDtcbn1cblxuLnRpbWVsaW5lLWV2ZW50IHtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRwYWRkaW5nOiA4cHggMTJweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogNnB4O1xuXHRmb250LXNpemU6IDEzcHg7XG5cdHRyYW5zaXRpb246IGFsbCAwLjJzO1xuXHRjdXJzb3I6IHBvaW50ZXI7XG5cdGJvcmRlcjogMnB4IHNvbGlkIHRyYW5zcGFyZW50O1xufVxuXG4udGltZWxpbmUtZXZlbnQ6aG92ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZmZmNWVkO1xuXHRib3JkZXItY29sb3I6ICNmYjkyM2M7XG5cdGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2JhKDI1MSwgMTQ2LCA2MCwgMC4yKTtcblx0dHJhbnNmb3JtOiB0cmFuc2xhdGVYKDRweCk7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LnRpbWVsaW5lLWV2ZW50IHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHQudGltZWxpbmUtZXZlbnQ6aG92ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMyZDE4MTA7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjZmI5MjNjO1xuXHRcdGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2JhKDI1MSwgMTQ2LCA2MCwgMC4zKTtcblx0fVxufVxuXG4uZXZlbnQtaWNvbiB7XG5cdGZvbnQtc2l6ZTogMTZweDtcblx0ZmxleC1zaHJpbms6IDA7XG59XG5cbi5ldmVudC10aW1lIHtcblx0Zm9udC1mYW1pbHk6ICdTRiBNb25vJywgJ01vbmFjbycsICdJbmNvbnNvbGF0YScsICdSb2JvdG8gTW9ubycsICdDb25zb2xhcycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxMnB4O1xuXHRjb2xvcjogIzY1NmQ3Njtcblx0ZmxleC1zaHJpbms6IDA7XG59XG5cbi5ldmVudC1sYWJlbCB7XG5cdGNvbG9yOiAjMWYyMzI4O1xuXHRmbGV4LWdyb3c6IDE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmV2ZW50LWxhYmVsIHtcblx0XHRjb2xvcjogI2U2ZWRmMztcblx0fVxufVxuXG5mb290ZXIge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiA2MHB4IGF1dG8gMjBweDtcblx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRwYWRkaW5nLXRvcDogMjBweDtcblx0Ym9yZGVyLXRvcDogMXB4IHNvbGlkICNkMGQ3ZGU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Zm9vdGVyIHtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuZm9vdGVyIGEge1xuXHRjb2xvcjogIzA5NjlkYTtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xufVxuXG5mb290ZXIgYTpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGZvb3RlciBhIHtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG5AbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHtcblx0Ym9keSB7XG5cdFx0cGFkZGluZzogMTBweDtcblx0fVxuXG5cdGhlYWRlciBoMSB7XG5cdFx0Zm9udC1zaXplOiAyNHB4O1xuXHR9XG5cblx0LmNoYXJ0LWNvbnRhaW5lciB7XG5cdFx0aGVpZ2h0OiAzMDBweDtcblx0fVxuXG5cdC5zdGF0cyB7XG5cdFx0Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMiwgMWZyKTtcblx0fVxufVxuYFxufVxuIiwKICAgICJpbXBvcnQgdHlwZSB7IENvbGxlY3RlZE1ldHJpYyB9IGZyb20gJy4uLy4uL3NoYXJlZC9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gbG9hZENvbGxlY3RlZE1ldHJpY3MoY29udGVudDogc3RyaW5nKTogQ29sbGVjdGVkTWV0cmljW10ge1xuXHRsZXQgbWV0cmljczogQ29sbGVjdGVkTWV0cmljW10gPSBbXVxuXHRsZXQgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJylcblxuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWVcblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgbWV0cmljID0gSlNPTi5wYXJzZShsaW5lKSBhcyBDb2xsZWN0ZWRNZXRyaWNcblx0XHRcdG1ldHJpY3MucHVzaChtZXRyaWMpXG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBTa2lwIGludmFsaWQgbGluZXNcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG1ldHJpY3Ncbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7O0FBSUEsdURBQ0EsMkNBQ0E7QUFOQTtBQUNBO0FBQ0E7OztBQ1FBLDhDQUNBO0FBSkE7QUFDQTtBQXlDQSxlQUFlLG1CQUFtQixDQUFDLGFBQXNEO0FBQUEsRUFDeEYsSUFBSSxDQUFDLGVBQWUsWUFBWSxLQUFLLE1BQU07QUFBQSxJQUMxQyxPQUFPO0FBQUEsRUFHUixJQUFJO0FBQUEsSUFDSCxJQUFJLFNBQW1CLENBQUM7QUFBQSxJQUV4QixNQUFNLGlCQUFLLE1BQU0sQ0FBQyxXQUFXLEdBQUcsR0FBRztBQUFBLE1BQ2xDLE9BQU8sT0FBTyxLQUFLLGFBQWEsT0FBTztBQUFBLE1BQ3ZDLFFBQVE7QUFBQSxNQUNSLFdBQVc7QUFBQSxRQUNWLFFBQVEsQ0FBQyxTQUFTLE9BQU8sS0FBSyxLQUFLLFNBQVMsQ0FBQztBQUFBLE1BQzlDO0FBQUEsSUFDRCxDQUFDO0FBQUEsSUFFRCxJQUFJLE9BQU8sT0FBTyxLQUFLLEVBQUU7QUFBQSxJQUd6QixPQUZhLEtBQUssTUFBTSxJQUFJO0FBQUEsSUFHM0IsT0FBTyxPQUFPO0FBQUEsSUFFZixPQURBLG9CQUFRLG9DQUFvQyxPQUFPLEtBQUssR0FBRyxHQUNwRDtBQUFBO0FBQUE7QUFPVCxTQUFTLHFCQUFxQixDQUFDLGVBQWdDLGNBQWdEO0FBQUEsRUFFOUcsT0FBTztBQUFBLElBQ04sd0JBQXdCLGFBQWEsMEJBQTBCLGNBQWM7QUFBQSxJQUM3RSxTQUFTO0FBQUEsTUFDUix3QkFBd0IsYUFBYSxTQUFTLDBCQUEwQixjQUFjLFFBQVE7QUFBQSxNQUM5Rix5QkFBeUIsYUFBYSxTQUFTLDJCQUEyQixjQUFjLFFBQVE7QUFBQSxJQUNqRztBQUFBLElBQ0EsU0FBUyxDQUFDLEdBQUksYUFBYSxXQUFXLENBQUMsR0FBSSxHQUFJLGNBQWMsV0FBVyxDQUFDLENBQUU7QUFBQSxFQUM1RTtBQUFBO0FBTUQsZUFBc0IsMEJBQTBCLEdBQTZCO0FBQUEsRUFDNUUsa0JBQU0sMkVBQTJFO0FBQUEsRUFDakYsSUFBSSxhQUFrQixhQUFRLFFBQVEsSUFBSSxrQkFBc0IsR0FDNUQsY0FBbUIsVUFBSyxZQUFZLFVBQVUsaUJBQWlCO0FBQUEsRUFFbkUsSUFBTyxjQUFXLFdBQVcsR0FBRztBQUFBLElBQy9CLElBQUksVUFBYSxnQkFBYSxhQUFhLEVBQUUsVUFBVSxRQUFRLENBQUMsR0FDNUQsU0FBUyxNQUFNLG9CQUFvQixPQUFPO0FBQUEsSUFDOUMsSUFBSTtBQUFBLE1BQVEsT0FBTztBQUFBO0FBQUEsRUFLcEIsT0FEQSxvQkFBUSw2REFBNkQsR0FDOUQ7QUFBQSxJQUNOLHdCQUF3QjtBQUFBLElBQ3hCLFNBQVM7QUFBQSxNQUNSLHdCQUF3QjtBQUFBLE1BQ3hCLHlCQUF5QjtBQUFBLElBQzFCO0FBQUEsRUFDRDtBQUFBO0FBU0QsZUFBc0IsbUJBQW1CLENBQUMsWUFBcUIsWUFBK0M7QUFBQSxFQUM3RyxJQUFJLFNBQVMsTUFBTSwyQkFBMkI7QUFBQSxFQUc5QyxJQUFJLFlBQVk7QUFBQSxJQUNmLGtCQUFNLDRDQUE0QztBQUFBLElBQ2xELElBQUksZUFBZSxNQUFNLG9CQUFvQixVQUFVO0FBQUEsSUFDdkQsSUFBSTtBQUFBLE1BQ0gsU0FBUyxzQkFBc0IsUUFBUSxZQUFZO0FBQUE7QUFBQSxFQUtyRCxJQUFJLGNBQWlCLGNBQVcsVUFBVSxHQUFHO0FBQUEsSUFDNUMsa0JBQU0sd0NBQXdDLFlBQVk7QUFBQSxJQUMxRCxJQUFJLFVBQWEsZ0JBQWEsWUFBWSxFQUFFLFVBQVUsUUFBUSxDQUFDLEdBQzNELGVBQWUsTUFBTSxvQkFBb0IsT0FBTztBQUFBLElBQ3BELElBQUk7QUFBQSxNQUNILFNBQVMsc0JBQXNCLFFBQVEsWUFBWTtBQUFBO0FBQUEsRUFJckQsT0FBTztBQUFBO0FBTVIsU0FBUyxZQUFZLENBQUMsWUFBb0IsU0FBMEI7QUFBQSxFQUVuRSxJQUFJLGVBQWUsUUFDakIsUUFBUSxPQUFPLElBQUksRUFDbkIsUUFBUSxPQUFPLEdBQUc7QUFBQSxFQUdwQixPQURZLElBQUksT0FBTyxJQUFJLGlCQUFpQixHQUFHLEVBQ2xDLEtBQUssVUFBVTtBQUFBO0FBTTdCLFNBQVMscUJBQXFCLENBQUMsWUFBb0IsUUFBaUQ7QUFBQSxFQUNuRyxJQUFJLENBQUMsT0FBTztBQUFBLElBQVMsT0FBTztBQUFBLEVBRzVCLFNBQVMsYUFBYSxPQUFPO0FBQUEsSUFDNUIsSUFBSSxVQUFVLFFBQVEsVUFBVSxTQUFTO0FBQUEsTUFDeEMsT0FBTztBQUFBLEVBS1QsU0FBUyxhQUFhLE9BQU87QUFBQSxJQUM1QixJQUFJLFVBQVUsV0FBVyxhQUFhLFlBQVksVUFBVSxPQUFPO0FBQUEsTUFDbEUsT0FBTztBQUFBLEVBSVQsT0FBTztBQUFBO0FBTUQsU0FBUyxpQkFBaUIsQ0FBQyxZQUE4QixRQUE2QztBQUFBLEVBQzVHLElBQUksWUFBWSxzQkFBc0IsV0FBVyxNQUFNLE1BQU0sR0FDekQsV0FBOEIsV0FDOUI7QUFBQSxFQUdKLElBQUk7QUFBQSxJQUVILElBQUksVUFBVSxpQkFBaUIsVUFBYSxXQUFXLFFBQVEsUUFBUSxVQUFVO0FBQUEsTUFDaEYsa0JBQU0sR0FBRyxXQUFXLDZCQUE2QixXQUFXLFFBQVEsV0FBVyxVQUFVLGVBQWUsR0FDeEcsV0FBVyxXQUNYLFNBQVMsU0FBUyxXQUFXLFFBQVEsTUFBTSxRQUFRLENBQUMsb0JBQW9CLFVBQVU7QUFBQSxJQUc5RSxTQUFJLFVBQVUsaUJBQWlCLFVBQWEsV0FBVyxRQUFRLFFBQVEsVUFBVTtBQUFBLE1BQ3JGLGtCQUFNLEdBQUcsV0FBVyw2QkFBNkIsV0FBVyxRQUFRLFdBQVcsVUFBVSxlQUFlLEdBQ3hHLFdBQVcsV0FDWCxTQUFTLFNBQVMsV0FBVyxRQUFRLE1BQU0sUUFBUSxDQUFDLG9CQUFvQixVQUFVO0FBQUEsSUFHOUUsU0FBSSxVQUFVLGdCQUFnQixVQUFhLFdBQVcsUUFBUSxRQUFRLFVBQVU7QUFBQSxNQUNwRixrQkFBTSxHQUFHLFdBQVcsNEJBQTRCLFdBQVcsUUFBUSxXQUFXLFVBQVUsY0FBYyxHQUN0RyxXQUFXLFdBQ1gsU0FBUyxTQUFTLFdBQVcsUUFBUSxNQUFNLFFBQVEsQ0FBQyxtQkFBbUIsVUFBVTtBQUFBLElBRzdFLFNBQUksVUFBVSxnQkFBZ0IsVUFBYSxXQUFXLFFBQVEsUUFBUSxVQUFVO0FBQUEsTUFDcEYsa0JBQU0sR0FBRyxXQUFXLDRCQUE0QixXQUFXLFFBQVEsV0FBVyxVQUFVLGNBQWMsR0FDdEcsV0FBVyxXQUNYLFNBQVMsU0FBUyxXQUFXLFFBQVEsTUFBTSxRQUFRLENBQUMsbUJBQW1CLFVBQVU7QUFBQTtBQUFBLEVBS25GLElBQUksQ0FBQyxNQUFNLFdBQVcsT0FBTyxPQUFPLEdBQUc7QUFBQSxJQUN0QyxJQUFJLGdCQUFnQixLQUFLLElBQUksV0FBVyxPQUFPLE9BQU8sR0FHbEQsbUJBQW1CLFdBQVcsMEJBQTBCLE9BQU8sUUFBUSx3QkFDdkUsb0JBQW9CLFdBQVcsMkJBQTJCLE9BQU8sUUFBUTtBQUFBLElBRzdFLElBQUksV0FBVyxPQUFPLGNBQWM7QUFBQSxNQUNuQyxJQUFJLGFBQWE7QUFBQSxRQUNoQixJQUFJLGdCQUFnQjtBQUFBLFVBQ25CLFdBQVcsV0FDWCxTQUFTLGNBQWMsY0FBYyxRQUFRLENBQUMsaUJBQWlCO0FBQUEsUUFDekQsU0FBSSxhQUFhLGFBQWEsZ0JBQWdCO0FBQUEsVUFDcEQsV0FBVyxXQUNYLFNBQVMsY0FBYyxjQUFjLFFBQVEsQ0FBQyxnQkFBZ0I7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQU1sRSxPQUFPO0FBQUEsSUFDTixhQUFhLFdBQVc7QUFBQSxJQUN4QixnQkFBZ0IsV0FBVztBQUFBLElBQzNCLG1CQUFtQixXQUFXO0FBQUEsSUFDOUIsb0JBQW9CO0FBQUEsSUFDcEI7QUFBQSxFQUNEO0FBQUE7QUFNTSxTQUFTLDBCQUEwQixDQUN6QyxhQUNBLFFBS0M7QUFBQSxFQUNELElBQUksV0FBdUQsQ0FBQyxHQUN4RCxXQUF1RCxDQUFDO0FBQUEsRUFFNUQsU0FBUyxjQUFjLGFBQWE7QUFBQSxJQUNuQyxJQUFJLFdBQVcsa0JBQWtCLFlBQVksTUFBTTtBQUFBLElBRW5ELElBQUksU0FBUyx1QkFBdUI7QUFBQSxNQUNuQyxTQUFTLEtBQUssS0FBSyxZQUFZLFFBQVEsU0FBUyxPQUFPLENBQUM7QUFBQSxJQUNsRCxTQUFJLFNBQVMsdUJBQXVCO0FBQUEsTUFDMUMsU0FBUyxLQUFLLEtBQUssWUFBWSxRQUFRLFNBQVMsT0FBTyxDQUFDO0FBQUE7QUFBQSxFQUkxRCxJQUFJLFVBQTZCO0FBQUEsRUFDakMsSUFBSSxTQUFTLFNBQVM7QUFBQSxJQUNyQixVQUFVO0FBQUEsRUFDSixTQUFJLFNBQVMsU0FBUztBQUFBLElBQzVCLFVBQVU7QUFBQSxFQUdYLE9BQU8sRUFBRSxTQUFTLFVBQVUsU0FBUztBQUFBOzs7QUNqUnRDLHNEQUNBLDJDQUNBO0FBTEE7QUFDQTtBQWlCQSxlQUFzQixvQkFBb0IsQ0FBQyxpQkFBa0U7QUFBQSxFQUM1RyxJQUFJLFFBQVEsc0JBQVMsY0FBYyxHQUMvQixnQkFBZ0IsU0FBUyxzQkFBUyxlQUFlLEtBQUssT0FBTyxzQkFBUSxLQUFLLENBQUM7QUFBQSxFQUUvRSxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQUEsSUFDZCxNQUFVLE1BQU0scUVBQXFFO0FBQUEsRUFHdEYsSUFBSSxpQkFBaUIsSUFBSSx5Q0FDbkIsY0FBYyxNQUFNLGVBQWUsY0FBYztBQUFBLElBQ3RELFFBQVE7QUFBQSxNQUNQO0FBQUEsTUFDQTtBQUFBLE1BQ0EsZ0JBQWdCLHNCQUFRLEtBQUs7QUFBQSxNQUM3QixpQkFBaUIsc0JBQVEsS0FBSztBQUFBLElBQy9CO0FBQUEsRUFDRCxDQUFDO0FBQUEsRUFFRCxtQkFBTSxTQUFTLFVBQVUsb0NBQW9DLGVBQWU7QUFBQSxFQUc1RSxJQUFJLGtDQUFrQixJQUFJO0FBQUEsRUFFMUIsU0FBUyxZQUFZLFdBQVc7QUFBQSxJQUMvQixJQUFJLGNBQW1CLFdBQUssaUJBQWlCLFNBQVMsSUFBSTtBQUFBLElBRTFELG1CQUFNLHdCQUF3QixTQUFTLFNBQVM7QUFBQSxJQUVoRCxNQUFNLGlCQUFpQixNQUFNLGVBQWUsaUJBQWlCLFNBQVMsSUFBSTtBQUFBLE1BQ3pFLE1BQU07QUFBQSxNQUNOLFFBQVE7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0EsZ0JBQWdCLHNCQUFRLEtBQUs7QUFBQSxRQUM3QixpQkFBaUIsc0JBQVEsS0FBSztBQUFBLE1BQy9CO0FBQUEsSUFDRCxDQUFDLEdBRUcsZUFBZSxnQkFBZ0I7QUFBQSxJQUNuQyxnQkFBZ0IsSUFBSSxTQUFTLE1BQU0sWUFBWSxHQUUvQyxtQkFBTSx1QkFBdUIsU0FBUyxXQUFXLGNBQWM7QUFBQTtBQUFBLEVBSWhFLElBQUksK0JBQWUsSUFBSTtBQUFBLEVBRXZCLFVBQVUsY0FBYyxpQkFBaUIsaUJBQWlCO0FBQUEsSUFFekQsSUFBSSxXQUFXO0FBQUEsSUFHZixJQUFJLENBQUksZUFBVyxZQUFZLEdBQUc7QUFBQSxNQUNqQyxxQkFBUSxpQ0FBaUMsY0FBYztBQUFBLE1BQ3ZEO0FBQUE7QUFBQSxJQUdELElBQUksT0FBVSxhQUFTLFlBQVksR0FDL0IsUUFBa0IsQ0FBQztBQUFBLElBRXZCLElBQUksS0FBSyxZQUFZO0FBQUEsTUFDcEIsUUFBVyxnQkFBWSxZQUFZLEVBQUUsSUFBSSxDQUFDLE1BQVcsV0FBSyxjQUFjLENBQUMsQ0FBQztBQUFBLElBRTFFO0FBQUEsY0FBUSxDQUFDLFlBQVk7QUFBQSxJQUd0QixJQUFJLFFBQVEsYUFBYSxJQUFJLFFBQVEsS0FBTSxDQUFDO0FBQUEsSUFDNUMsTUFBTSxPQUFPO0FBQUEsSUFFYixTQUFTLFFBQVEsT0FBTztBQUFBLE1BQ3ZCLElBQUksWUFBZ0IsZUFBUyxJQUFJO0FBQUEsTUFFakMsSUFBSSxVQUFTLFNBQVMsV0FBVztBQUFBLFFBQ2hDLE1BQU0sV0FBVztBQUFBLE1BQ1gsU0FBSSxVQUFTLFNBQVMsZUFBZTtBQUFBLFFBQzNDLE1BQU0sYUFBYTtBQUFBLE1BQ2IsU0FBSSxVQUFTLFNBQVMsZ0JBQWdCO0FBQUEsUUFDNUMsTUFBTSxjQUFjO0FBQUEsTUFDZCxTQUFJLFVBQVMsU0FBUyxnQkFBZ0I7QUFBQSxRQUM1QyxNQUFNLGVBQWU7QUFBQTtBQUFBLElBSXZCLGFBQWEsSUFBSSxVQUFVLEtBQUs7QUFBQTtBQUFBLEVBR2pDLE9BQU87QUFBQTs7O0FDckdELFNBQVMsa0JBQWtCLENBQ2pDLFlBQ0EsWUFDUztBQUFBLEVBQ1QsSUFBSSxXQUFXLFNBQVMsU0FBUztBQUFBLElBQ2hDLE9BQU8sR0FBRyxXQUFXLFNBQVM7QUFBQSxFQUcvQixJQUFJLFdBQVcsU0FBUyxTQUFTO0FBQUEsSUFDaEMsT0FBTyxHQUFHLFdBQVcsU0FBUztBQUFBLEVBRy9CLElBQUksV0FBVyxRQUFRLGVBQWU7QUFBQSxJQUNyQyxPQUFPLEdBQUcsV0FBVyxRQUFRO0FBQUEsRUFHOUIsT0FBTztBQUFBO0FBR0QsU0FBUyxvQkFBb0IsQ0FDbkMsWUFDQSxZQUNBLFdBQ1M7QUFBQSxFQUNULElBQUksUUFBUTtBQUFBLElBQ1gseUJBQXlCLFdBQVcsUUFBUTtBQUFBLElBQzVDLDBCQUFlLFdBQVcsUUFBUTtBQUFBLElBQ2xDLDRCQUFpQixXQUFXLFNBQVM7QUFBQSxJQUNyQyw0QkFBaUIsV0FBVyxTQUFTO0FBQUEsSUFDckMsZ0NBQXFCLFdBQVcsUUFBUTtBQUFBLElBQ3hDO0FBQUEsRUFDRDtBQUFBLEVBRUEsSUFBSTtBQUFBLElBQ0gsTUFBTSxLQUFLLDRDQUFpQyxjQUFjLEVBQUU7QUFBQSxFQUk3RCxJQUFJLFdBQVcsU0FBUyxTQUFTLEdBQUc7QUFBQSxJQUNuQyxNQUFNLEtBQUssc0NBQXFDLEVBQUU7QUFBQSxJQUVsRCxTQUFTLFVBQVUsV0FBVyxTQUFTLE1BQU0sR0FBRyxDQUFDLEdBQUc7QUFBQSxNQUNuRCxJQUFJLFNBQVMsT0FBTyxTQUFTLE1BQUssT0FBTyxXQUFXO0FBQUEsTUFDcEQsTUFBTSxLQUNMLE9BQU8sT0FBTyxXQUFXLFlBQVksT0FBTyxRQUFRLE9BQU8sT0FBTyxJQUFJLE1BQU0sYUFBYSxPQUFPLE9BQU8sU0FBUyxPQUFPLE9BQU8sU0FBUyxLQUFLLFFBQzdJO0FBQUE7QUFBQSxJQUdELE1BQU0sS0FBSyxFQUFFO0FBQUE7QUFBQSxFQUlkLElBQUksV0FBVyxTQUFTLFNBQVMsR0FBRztBQUFBLElBQ25DLE1BQU0sS0FBSyxzQ0FBcUMsRUFBRTtBQUFBLElBRWxELFNBQVMsVUFBVSxXQUFXLFNBQVMsTUFBTSxHQUFHLENBQUMsR0FBRztBQUFBLE1BQ25ELElBQUksU0FBUyxPQUFPLFNBQVMsTUFBSyxPQUFPLFdBQVc7QUFBQSxNQUNwRCxNQUFNLEtBQ0wsT0FBTyxPQUFPLFdBQVcsWUFBWSxPQUFPLFFBQVEsT0FBTyxPQUFPLElBQUksTUFBTSxhQUFhLE9BQU8sT0FBTyxTQUFTLE9BQU8sT0FBTyxTQUFTLEtBQUssUUFDN0k7QUFBQTtBQUFBLElBR0QsTUFBTSxLQUFLLEVBQUU7QUFBQTtBQUFBLEVBSWQsSUFBSSxlQUFlLFdBQVcsUUFDNUIsT0FBTyxDQUFDLE1BQU0sRUFBRSxPQUFPLGNBQWMsUUFBUSxFQUM3QyxLQUFLLENBQUMsR0FBRyxNQUFNLEtBQUssSUFBSSxFQUFFLE9BQU8sT0FBTyxJQUFJLEtBQUssSUFBSSxFQUFFLE9BQU8sT0FBTyxDQUFDO0FBQUEsRUFFeEUsSUFBSSxhQUFhLFNBQVMsR0FBRztBQUFBLElBQzVCLE1BQU0sS0FBSyxxQ0FBMEIsRUFBRTtBQUFBLElBRXZDLFNBQVMsVUFBVSxhQUFhLE1BQU0sR0FBRyxDQUFDO0FBQUEsTUFDekMsTUFBTSxLQUNMLE9BQU8sT0FBTyxXQUFXLFlBQVksT0FBTyxRQUFRLE9BQU8sT0FBTyxJQUFJLE1BQU0sYUFBYSxPQUFPLE9BQU8sU0FBUyxPQUFPLE9BQU8sU0FBUyxJQUN4STtBQUFBO0FBQUEsRUFJRixPQUFPLE1BQU0sS0FBSztBQUFBLENBQUk7QUFBQTs7O0FDdkZ2QiwrQ0FDQTtBQWVPLFNBQVMsbUJBQW1CLENBQUMsU0FBc0M7QUFBQSxFQUN6RSxJQUFJLGdCQUFnQixHQUNoQixnQkFBZ0IsR0FFaEIsT0FBTyxRQUFRLElBQUksQ0FBQyxXQUFXO0FBQUEsSUFDbEMsSUFBSSxhQUFhLDJCQUEyQixPQUFPLFdBQVcsU0FBUyxPQUFPLFVBQVU7QUFBQSxJQUV4RixJQUFJLFdBQVcsWUFBWTtBQUFBLE1BQVc7QUFBQSxJQUN0QyxJQUFJLFdBQVcsWUFBWTtBQUFBLE1BQVc7QUFBQSxJQUV0QyxJQUFJLFFBQ0gsV0FBVyxZQUFZLFlBQ3BCLGlCQUNBLFdBQVcsWUFBWSxZQUN0QixpQkFDQSxPQUFPLFdBQVcsUUFBUSxlQUFlLElBQ3hDLGlCQUNBLGdCQUVGLFlBQVksT0FBTyxZQUFZLEtBQy9CLGFBQWEsT0FBTyxhQUFhLEtBQ2pDLE9BQU8sT0FBTztBQUFBLElBRWxCLE9BQU8sS0FBSyxXQUFXLEtBQUssY0FBYyxLQUFLLFFBQVEsV0FBVyxLQUFLLFFBQVEsaUJBQWlCLEtBQUssUUFBUSwyQkFBMkIseUJBQXdCO0FBQUEsR0FDaEssR0FFRyxjQUFjLGdCQUFnQixJQUFJLGlCQUFNLGdCQUFnQixJQUFJLGlCQUFPLGdCQUNuRSxhQUNILGdCQUFnQixJQUNiLEdBQUcsbUNBQ0gsZ0JBQWdCLElBQ2YsR0FBRywwQ0FDSCxjQUVELFNBQVM7QUFBQSxJQUNaO0FBQUEsSUFDQTtBQUFBLElBQ0EsZUFBZSxlQUFlLFFBQVEsNkJBQTRCO0FBQUEsSUFDbEU7QUFBQSxFQUNELEVBQUUsS0FBSztBQUFBLENBQUksR0FFUCxVQUFVO0FBQUEsSUFDYjtBQUFBLElBQ0E7QUFBQSxJQUNBLEdBQUc7QUFBQSxFQUNKLEVBQ0UsS0FBSyxFQUNMLEtBQUs7QUFBQSxDQUFJLEdBRVAsU0FBUztBQUFBO0FBQUE7QUFBQSxFQUViLE9BQU8sU0FBUyxVQUFVO0FBQUE7QUFNM0IsZUFBc0IsbUJBQW1CLENBQUMsTUFBc0M7QUFBQSxFQUMvRSxJQUFJLFFBQVEsc0JBQVMsY0FBYyxHQUMvQixVQUFVLDBCQUFXLEtBQUs7QUFBQSxFQUU5QixrQkFBSyw2Q0FBNkMsU0FBUztBQUFBLEVBRTNELE1BQU0sTUFBTSxhQUFhLE1BQU0sUUFBUSxLQUFLLE9BQU8sYUFBYTtBQUFBLElBQy9ELGNBQWM7QUFBQSxJQUNkLE9BQU8sdUJBQVEsS0FBSztBQUFBLElBQ3BCLE1BQU0sdUJBQVEsS0FBSztBQUFBLEVBQ3BCLENBQUM7QUFBQSxFQUVELFNBQVMsV0FBVztBQUFBLElBQ25CLElBQUksUUFBUSxNQUFNLFNBQVMsK0JBQW9CO0FBQUEsTUFFOUMsT0FEQSxrQkFBSywyQkFBMkIsUUFBUSxJQUFJLEdBQ3JDLFFBQVE7QUFBQSxFQUlqQixPQUFPO0FBQUE7QUFNUixlQUFzQixxQkFBcUIsQ0FBQyxNQUFjLE1BQW9EO0FBQUEsRUFDN0csSUFBSSxRQUFRLHNCQUFTLGNBQWMsR0FDL0IsVUFBVSwwQkFBVyxLQUFLLEdBRTFCLGFBQWEsTUFBTSxvQkFBb0IsSUFBSTtBQUFBLEVBRS9DLElBQUksWUFBWTtBQUFBLElBQ2Ysa0JBQUssNkJBQTZCLGVBQWU7QUFBQSxJQUVqRCxNQUFNLFNBQVMsTUFBTSxRQUFRLEtBQUssT0FBTyxjQUFjO0FBQUEsTUFDdEQsWUFBWTtBQUFBLE1BQ1osT0FBTyx1QkFBUSxLQUFLO0FBQUEsTUFDcEIsTUFBTSx1QkFBUSxLQUFLO0FBQUEsTUFDbkI7QUFBQSxJQUNELENBQUM7QUFBQSxJQUlELE9BRkEsbUJBQU0sb0JBQW9CLEtBQUssVUFBVSxHQUVsQyxFQUFFLEtBQUssS0FBSyxVQUFXLElBQUksS0FBSyxHQUFHO0FBQUEsSUFDcEM7QUFBQSxJQUNOLGtCQUFLLHlCQUF5QjtBQUFBLElBRTlCLE1BQU0sU0FBUyxNQUFNLFFBQVEsS0FBSyxPQUFPLGNBQWM7QUFBQSxNQUN0RCxjQUFjO0FBQUEsTUFDZCxPQUFPLHVCQUFRLEtBQUs7QUFBQSxNQUNwQixNQUFNLHVCQUFRLEtBQUs7QUFBQSxNQUNuQjtBQUFBLElBQ0QsQ0FBQztBQUFBLElBSUQsT0FGQSxtQkFBTSxvQkFBb0IsS0FBSyxVQUFVLEdBRWxDLEVBQUUsS0FBSyxLQUFLLFVBQVcsSUFBSSxLQUFLLEdBQUc7QUFBQTtBQUFBOzs7QUN6RzVDLFNBQVMsWUFBWSxDQUFDLGFBQThCO0FBQUEsRUFDbkQsT0FBTyxjQUFjLE9BQU07QUFBQTtBQU1yQixTQUFTLGlCQUFpQixDQUFDLFFBQXdDO0FBQUEsRUFDekUsT0FBTyxPQUFPLElBQUksQ0FBQyxXQUFXO0FBQUEsSUFDN0IsTUFBTSxhQUFhLENBQUMsQ0FBQyxNQUFNLFdBQVc7QUFBQSxJQUN0QyxPQUFPLE1BQU07QUFBQSxJQUNiLFdBQVcsTUFBTTtBQUFBLElBQ2pCLGFBQWEsTUFBTTtBQUFBLEVBQ3BCLEVBQUU7QUFBQTs7O0FDbkNJLFNBQVMsZUFBZSxDQUFDLFNBQW1DO0FBQUEsRUFDbEUsSUFBSSxTQUF1QixDQUFDLEdBQ3hCLFFBQVEsUUFBUSxLQUFLLEVBQUUsTUFBTTtBQUFBLENBQUk7QUFBQSxFQUVyQyxTQUFTLFFBQVEsT0FBTztBQUFBLElBQ3ZCLElBQUksQ0FBQyxLQUFLLEtBQUs7QUFBQSxNQUFHO0FBQUEsSUFFbEIsSUFBSTtBQUFBLE1BQ0gsSUFBSSxRQUFRLEtBQUssTUFBTSxJQUFJO0FBQUEsTUFDM0IsT0FBTyxLQUFLLEtBQUs7QUFBQSxNQUNoQixNQUFNO0FBQUEsTUFFUDtBQUFBO0FBQUE7QUFBQSxFQUlGLE9BQU8sa0JBQWtCLE1BQU07QUFBQTs7O0FDS3pCLFNBQVMsa0JBQWtCLENBQUMsTUFBOEI7QUFBQSxFQUNoRSxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxzQkFLYyxXQUFXLEtBQUssUUFBUTtBQUFBLFVBQ3BDLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQSxpQ0FJRSxXQUFXLEtBQUssUUFBUTtBQUFBO0FBQUE7QUFBQSxlQUcvQixXQUFXLEtBQUssVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBLGdCQUl6QixXQUFXLEtBQUssV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBLGVBSTVCLEtBQUs7QUFBQSx1QkFDRyxLQUFLLGNBQWMsS0FBSyxpQkFBaUIsTUFBTSxRQUFRLENBQUM7QUFBQSx1Q0FDekQsSUFBSSxLQUFLLEdBQUUsWUFBWTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsOEJBUWYsS0FBSyxXQUFXLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQSw4QkFJeEIsS0FBSyxXQUFXLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQSw4QkFJeEIsS0FBSyxXQUFXLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQSw4QkFJeEIsS0FBSyxXQUFXLFFBQVE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUlsRCx3QkFBd0IsS0FBSyxVQUFVO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxJQUt2QyxlQUFlLE1BQU0sS0FBSyxlQUFlLEtBQUssV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsSUFXekQscUJBQXFCLE1BQU0sS0FBSyxlQUFlLEtBQUssV0FBVztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBTW5FLFNBQVMsVUFBVSxDQUFDLE1BQXNCO0FBQUEsRUFDekMsT0FBTyxLQUNMLFFBQVEsTUFBTSxPQUFPLEVBQ3JCLFFBQVEsTUFBTSxNQUFNLEVBQ3BCLFFBQVEsTUFBTSxNQUFNLEVBQ3BCLFFBQVEsTUFBTSxRQUFRLEVBQ3RCLFFBQVEsTUFBTSxRQUFRO0FBQUE7QUFNekIsU0FBUyxxQkFBcUIsQ0FBQyxZQUF1RDtBQUFBLEVBQ3JGLElBQUksWUFBWSxXQUFXLFlBQVk7QUFBQSxFQUd2QyxJQUFJLFVBQVUsU0FBUyxjQUFjLEtBQUssVUFBVSxTQUFTLFFBQVEsS0FBSyxVQUFVLFNBQVMsY0FBYztBQUFBLElBQzFHLE9BQU8sQ0FBQyxPQUFPLEtBQUs7QUFBQSxFQUlyQixJQUNDLFVBQVUsU0FBUyxTQUFTLEtBQzVCLFVBQVUsU0FBUyxVQUFVLEtBQzdCLFVBQVUsU0FBUyxNQUFNLEtBQ3pCLFVBQVUsU0FBUyxLQUFLLEtBQ3hCLFVBQVUsU0FBUyxPQUFPO0FBQUEsSUFFMUIsT0FBTyxDQUFDLE9BQU8sT0FBTyxLQUFLO0FBQUEsRUFJNUIsT0FBTyxDQUFDLE9BQU8sT0FBTyxPQUFPLEtBQUs7QUFBQTtBQU1uQyxTQUFTLG1CQUFtQixDQUFDLEtBQXFCO0FBQUEsRUFDakQsT0FBTztBQUFBO0FBR1IsU0FBUyx1QkFBdUIsQ0FBQyxZQUF3QztBQUFBLEVBa0J4RSxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxNQWpCSSxXQUFXLFFBQ3BCLElBQUksQ0FBQyxNQUFNO0FBQUEsSUFDWCxPQUFPO0FBQUEsZUFDSyxFQUFFLE9BQU87QUFBQTtBQUFBLHVCQUVELFdBQVcsRUFBRSxJQUFJO0FBQUEsT0FDakMsV0FBVyxFQUFFLElBQUk7QUFBQTtBQUFBO0FBQUEsU0FHZixZQUFZLEVBQUUsUUFBUSxPQUFPLEVBQUUsSUFBSTtBQUFBLFNBQ25DLEVBQUUsU0FBUyxZQUFZLFlBQVksRUFBRSxTQUFTLE9BQU8sRUFBRSxJQUFJLElBQUk7QUFBQSw2QkFDM0MsRUFBRSxTQUFTLFlBQVksYUFBYSxFQUFFLE9BQU8sU0FBUyxFQUFFLE9BQU8sU0FBUyxJQUFJO0FBQUE7QUFBQTtBQUFBLEdBR3RHLEVBQ0EsS0FBSyxFQUFFO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFtQlYsU0FBUyxjQUFjLENBQUMsTUFBc0IsaUJBQXlCLGVBQStCO0FBQUEsRUFDckcsT0FBTyxLQUFLLFdBQVcsUUFDckIsT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLE9BQU8sRUFDaEMsSUFBSSxDQUFDLGVBQWU7QUFBQSxJQUNwQixJQUFJLFNBQVMsS0FBSyxRQUFRLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxXQUFXLElBQUk7QUFBQSxJQUNoRSxJQUFJLENBQUM7QUFBQSxNQUFRLE9BQU87QUFBQSxJQUdwQixJQUFJLENBQUMsT0FBTyxRQUFRLE9BQU8sS0FBSyxXQUFXO0FBQUEsTUFDMUMsT0FBTztBQUFBLElBS1IsSUFBSSxDQURXLE9BQU8sS0FBdUIsS0FBSyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxTQUFTLENBQUM7QUFBQSxNQUV2RixPQUFPO0FBQUEsSUFJUixJQUFJLGlCQUFpQixLQUFLLE9BQU8sT0FDaEMsQ0FBQyxNQUFNLEVBQUUsYUFBYSxtQkFBbUIsRUFBRSxhQUFhLGFBQ3pELEdBRUksaUJBQWlCLGVBQWUsU0FBUyxJQUFJLDRCQUE0QixjQUFjLElBQUksSUFHM0YsY0FBYztBQUFBLElBQ2xCLElBQUksV0FBVyxRQUFRLGNBQWMsV0FBVyxTQUFTLFlBQVk7QUFBQSxNQUNwRSxJQUFJLGFBQWEsV0FBVyxRQUFRLFlBQ2hDLFVBQVUsV0FBVyxTQUFTLFlBRzlCLGVBQWUsc0JBQXNCLFdBQVcsSUFBSSxHQUdwRCxjQUFjLGFBQWEsSUFBSSxDQUFDLFFBQVEsT0FBTyxvQkFBb0IsR0FBRyxRQUFRLEVBQUUsS0FBSyxFQUFFLEdBR3ZGLGVBQWUsYUFDakIsSUFBSSxDQUFDLFFBQVEsT0FBTyxZQUFZLFdBQVcsTUFBTSxXQUFXLElBQUksUUFBUSxFQUN4RSxLQUFLLEVBQUUsR0FHTCxZQUFZLGFBQ2QsSUFBSSxDQUFDLFFBQVEsT0FBTyxZQUFZLFFBQVEsTUFBTSxXQUFXLElBQUksUUFBUSxFQUNyRSxLQUFLLEVBQUU7QUFBQSxNQUVULGNBQWM7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBS1I7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsVUFNQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFVBSUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLE1BTU47QUFBQSxvQkFBYztBQUFBLGdCQUNGLFlBQVksV0FBVyxRQUFRLE9BQU8sV0FBVyxJQUFJO0FBQUEsT0FDOUQsV0FBVyxTQUFTLFlBQVksZ0JBQWUsWUFBWSxXQUFXLFNBQVMsT0FBTyxXQUFXLElBQUksTUFBTTtBQUFBO0FBQUEsSUFJL0csT0FBTztBQUFBLHVDQUM2QixXQUFXLFdBQVcsSUFBSTtBQUFBO0FBQUE7QUFBQTtBQUFBLFFBSXpELFdBQVcsV0FBVyxJQUFJO0FBQUEsK0JBQ0gsV0FBVyxPQUFPLGNBQWMsYUFBYSxXQUFXLE9BQU8sU0FBUyxXQUFXLE9BQU8sU0FBUztBQUFBO0FBQUE7QUFBQTtBQUFBLE9BSTNIO0FBQUE7QUFBQTtBQUFBO0FBQUEsd0JBSWlCLFdBQVcsV0FBVyxJQUFJO0FBQUE7QUFBQSxLQUU3QztBQUFBO0FBQUE7QUFBQSxHQUdGLEVBQ0EsS0FBSyxFQUFFO0FBQUE7QUFHVixTQUFTLDJCQUEyQixDQUFDLFFBQWtDO0FBQUEsRUFDdEUsSUFBSSxPQUFPLFdBQVc7QUFBQSxJQUFHLE9BQU87QUFBQSxFQWNoQyxPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUEsTUFaVSxPQUNmLElBQ0EsQ0FBQyxHQUFHLFFBQVE7QUFBQSwrQ0FDZ0MsZUFBZSxXQUFXLEVBQUUsS0FBSztBQUFBLDhCQUNsRCxFQUFFO0FBQUEsOEJBQ0YsZ0JBQWdCLEVBQUUsU0FBUztBQUFBLCtCQUMxQixXQUFXLEVBQUUsS0FBSztBQUFBO0FBQUEsRUFHL0MsRUFDQyxLQUFLLEVBQUU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQVlWLFNBQVMsb0JBQW9CLENBQUMsTUFBc0IsaUJBQXlCLGVBQStCO0FBQUEsRUE0QjNHLE9BM0JtQixLQUFLLFdBQVcsUUFDakMsT0FBTyxDQUFDLE1BQU0sRUFBRSxTQUFTLE9BQU8sRUFDaEMsSUFBSSxDQUFDLGVBQWU7QUFBQSxJQUNwQixJQUFJLFNBQVMsS0FBSyxRQUFRLEtBQUssQ0FBQyxNQUFNLEVBQUUsU0FBUyxXQUFXLElBQUk7QUFBQSxJQUNoRSxJQUFJLENBQUM7QUFBQSxNQUFRLE9BQU87QUFBQSxJQUdwQixJQUFJLENBQUMsT0FBTyxRQUFRLE9BQU8sS0FBSyxXQUFXO0FBQUEsTUFDMUMsT0FBTztBQUFBLElBR1IsSUFBSSxDQURXLE9BQU8sS0FBdUIsS0FBSyxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsT0FBTyxTQUFTLENBQUM7QUFBQSxNQUV2RixPQUFPO0FBQUEsSUFHUixPQUFPLDBCQUNOLFdBQVcsTUFDWCxRQUNBLEtBQUssUUFDTCxpQkFDQSxlQUNBLEtBQUssWUFDTCxLQUFLLFdBQ047QUFBQSxHQUNBLEVBQ0EsS0FBSztBQUFBLENBQUk7QUFBQTtBQVNaLFNBQVMsY0FBYyxDQUFDLFFBQWdEO0FBQUEsRUFDdkUsSUFBSSxPQUFPLFdBQVc7QUFBQSxJQUFHLE9BQU87QUFBQSxFQUdoQyxJQUFJLE9BQU8sT0FBTyxJQUFJLElBQUksT0FBTyxXQUFXLENBQUMsQ0FBQyxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUM7QUFBQSxFQUN2RSxJQUFJLEtBQUssV0FBVztBQUFBLElBQUcsT0FBTztBQUFBLEVBRzlCLEtBQUssS0FBSyxDQUFDLEdBQUcsTUFBTSxJQUFJLENBQUM7QUFBQSxFQUd6QixJQUFJLFVBQVUsS0FBSyxNQUFNLEtBQUssU0FBUyxJQUFJLEdBQ3ZDLFdBQVcsS0FBSyxNQUFNLEtBQUssU0FBUyxJQUFJLEdBQ3hDLEtBQUssS0FBSyxVQUNWLE1BQU0sS0FBSztBQUFBLEVBR2YsT0FBTyxPQUFPLE9BQU8sSUFBSSxPQUFPO0FBQUEsSUFDL0IsSUFBSSxNQUFNLFdBQVcsQ0FBQztBQUFBLElBQ3RCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsS0FBSyxPQUFPLE1BQU0sT0FBTztBQUFBLEdBQzFDO0FBQUE7QUFHRixTQUFTLHlCQUF5QixDQUNqQyxZQUNBLFFBQ0EsUUFDQSxpQkFDQSxlQUNBLFlBQ0EsYUFDUztBQUFBLEVBQ1QsSUFBSSxnQkFBaUIsT0FBTyxLQUF1QixLQUFLLENBQUMsTUFBTSxFQUFFLE9BQU8sUUFBUSxVQUFVLEdBQ3RGLGlCQUFrQixPQUFPLEtBQXVCLEtBQUssQ0FBQyxNQUFNLEVBQUUsT0FBTyxRQUFRLFdBQVcsR0FHeEYsd0JBQXdCLGdCQUFnQixlQUFlLGNBQWMsTUFBTSxJQUFJLENBQUMsR0FDaEYseUJBQXlCLGlCQUFpQixlQUFlLGVBQWUsTUFBTSxJQUFJLENBQUMsR0FFbkYsY0FDSCxzQkFBc0IsU0FBUyxJQUM1QixLQUFLLFVBQVUsc0JBQXNCLElBQUksRUFBRSxHQUFHLFFBQVEsRUFBRSxHQUFHLElBQUksTUFBTSxHQUFHLFdBQVcsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUN6RixNQUVBLGVBQ0gsdUJBQXVCLFNBQVMsSUFDN0IsS0FBSyxVQUFVLHVCQUF1QixJQUFJLEVBQUUsR0FBRyxRQUFRLEVBQUUsR0FBRyxJQUFJLE1BQU0sR0FBRyxXQUFXLENBQUMsRUFBRSxFQUFFLENBQUMsSUFDMUYsTUFHQSxzQkFBZ0M7QUFBQSxJQUNuQztBQUFBO0FBQUEsV0FFUztBQUFBLFdBQ0E7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBS1Q7QUFBQTtBQUFBLFdBRVM7QUFBQSxXQUNBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxFQUtWLEdBR0ksaUJBQTJCLENBQUMsR0FDNUIsa0JBQTRCLENBQUM7QUFBQSxFQUVqQyxTQUFTLElBQUksRUFBRyxJQUFJLE9BQU8sUUFBUSxLQUFLO0FBQUEsSUFDdkMsSUFBSSxJQUFJLE9BQU87QUFBQSxJQUNmLElBQUksRUFBRSxhQUFhO0FBQUEsTUFFbEIsSUFBSSxPQUFPLEVBQUUsWUFBWSxFQUFFO0FBQUEsTUFFM0IsZUFBZSxLQUFLO0FBQUEsbUJBQ0o7QUFBQTtBQUFBO0FBQUEsV0FHUixFQUFFO0FBQUEsV0FDRjtBQUFBO0FBQUE7QUFBQTtBQUFBLElBSVAsR0FFRCxlQUFlLEtBQUs7QUFBQSxvQkFDSDtBQUFBO0FBQUE7QUFBQSxXQUdULEVBQUU7QUFBQSxXQUNGO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLElBTVA7QUFBQSxNQUdEO0FBQUEsc0JBQWdCLEtBQUs7QUFBQSxxQkFDSDtBQUFBO0FBQUE7QUFBQSxXQUdWLEVBQUU7QUFBQSxXQUNGLEVBQUU7QUFBQTtBQUFBO0FBQUEsSUFHVDtBQUFBO0FBQUEsRUFLSCxJQUFJLGlCQUFpQixDQUFDLEdBQUcsZ0JBQWdCLEdBQUcscUJBQXFCLEdBQUcsZUFBZSxFQUFFLEtBQUs7QUFBQSxDQUFLO0FBQUEsRUFFL0YsT0FBTztBQUFBO0FBQUEsOENBRXNDLFdBQVcsVUFBVTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsY0FRckQsV0FBVyxVQUFVO0FBQUEsWUFDdkI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsS0FVUixpQkFDRztBQUFBLGNBQ08sV0FBVyxXQUFXO0FBQUEsWUFDeEI7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUEsU0FVTDtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLFdBY0k7QUFBQSxXQUNBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQSxlQWlCSSxTQUFTLFVBQVU7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBLHFCQWNiO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQTZEckIsU0FBUyxVQUFVLENBQUMsS0FBcUI7QUFBQSxFQUN4QyxPQUFPLElBQUksUUFBUSxpQkFBaUIsR0FBRztBQUFBO0FBR3hDLFNBQVMsUUFBUSxDQUFDLEtBQXFCO0FBQUEsRUFDdEMsT0FBTyxJQUFJLFFBQVEsT0FBTyxNQUFNLEVBQUUsUUFBUSxNQUFNLEtBQUssRUFBRSxRQUFRLE1BQU0sTUFBSyxFQUFFLFFBQVEsT0FBTyxLQUFLO0FBQUE7QUFHakcsU0FBUyxlQUFlLENBQUMsV0FBMkI7QUFBQSxFQUNuRCxJQUFJLE9BQU8sSUFBSSxLQUFLLFNBQVMsR0FFekIsUUFBUSxLQUFLLFNBQVMsRUFBRSxTQUFTLEVBQUUsU0FBUyxHQUFHLEdBQUcsR0FDbEQsVUFBVSxLQUFLLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxHQUFHLEdBQUcsR0FDdEQsVUFBVSxLQUFLLFdBQVcsRUFBRSxTQUFTLEVBQUUsU0FBUyxHQUFHLEdBQUc7QUFBQSxFQUMxRCxPQUFPLEdBQUcsU0FBUyxXQUFXO0FBQUE7QUFHL0IsU0FBUyxTQUFTLEdBQVc7QUFBQSxFQUM1QixPQUFPO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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QUFPLG1CQUFtQixRQUFRLEdBQ2xDLFdBQWdCLFdBQUssS0FBSyxHQUFHLE9BQU8sc0JBQXNCO0FBQUEsSUFFOUQsTUFBUyxjQUFVLFVBQVUsTUFBTSxFQUFFLFVBQVUsUUFBUSxDQUFDLEdBQ3hELFVBQVUsS0FBSyxFQUFFLFVBQVUsT0FBTyxVQUFVLE1BQU0sU0FBUyxDQUFDO0FBQUEsSUFFNUQsTUFBTSxPQUFPLE1BQU0sZUFBZSxlQUFlLE9BQU8sV0FBVyxnQkFBZ0IsQ0FBQyxRQUFRLEdBQUcsS0FBSztBQUFBLE1BQ25HLGVBQWU7QUFBQSxJQUNoQixDQUFDLEdBRUcsUUFBUSx1QkFBUSxNQUFNLFNBQVM7QUFBQSxJQUNuQyxPQUFPLFlBQVksZ0NBQWdDLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQixtQkFBbUI7QUFBQTtBQUFBO0FBSWhJLGVBQWUsd0JBQXdCLENBQUMsT0FBZSxTQUEyQjtBQUFBLEVBQ2pGLGtCQUFLLDhDQUFtQztBQUFBLEVBRXhDLElBQUksT0FBTyxvQkFDVixRQUFRLElBQUksQ0FBQyxPQUFPO0FBQUEsSUFDbkIsVUFBVSxFQUFFO0FBQUEsSUFDWixZQUFZLEVBQUU7QUFBQSxJQUNkLFlBQVksRUFBRTtBQUFBLElBQ2QsVUFBVSxFQUFFO0FBQUEsSUFDWixXQUFXLEVBQUU7QUFBQSxFQUNkLEVBQUUsQ0FDSDtBQUFBLEVBQ0EsTUFBTSxzQkFBc0IsT0FBTyxJQUFJO0FBQUE7QUFHeEMsS0FBSzsiLAogICJkZWJ1Z0lkIjogIjhCM0NEODRGMUFCMzQyRDc2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
