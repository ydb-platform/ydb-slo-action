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

// report/lib/artifacts.ts
var import_artifact = __toESM(require_artifact(), 1), import_core = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
async function downloadRunArtifacts(destinationPath) {
  let token = import_core.getInput("github_token"), workflowRunId = parseInt(import_core.getInput("github_run_id") || String(import_github.context.runId));
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
  import_core.debug(`Found ${artifacts.length} artifacts in workflow run ${workflowRunId}`);
  let downloadedPaths = /* @__PURE__ */ new Map;
  for (let artifact of artifacts) {
    let artifactDir = path.join(destinationPath, artifact.name);
    import_core.debug(`Downloading artifact ${artifact.name}...`);
    let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
      path: artifactDir,
      findBy: {
        token,
        workflowRunId,
        repositoryName: import_github.context.repo.repo,
        repositoryOwner: import_github.context.repo.owner
      }
    }), artifactPath = downloadPath || artifactDir;
    downloadedPaths.set(artifact.name, artifactPath), import_core.debug(`Downloaded artifact ${artifact.name} to ${artifactPath}`);
  }
  let runArtifacts = /* @__PURE__ */ new Map;
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
    let group = runArtifacts.get(workload) || {};
    group.name = workload;
    for (let file of files) {
      let basename2 = path.basename(file);
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
    `- \uD83D\uDD34 Critical: ${evaluation.failures.length}`,
    `- \uD83D\uDFE1 Warnings: ${evaluation.warnings.length}`,
    `- \uD83D\uDFE2 Improvements: ${comparison.summary.improvements}`,
    `- ⚪ Stable: ${comparison.summary.stable}`,
    ""
  ];
  if (reportURL)
    lines.push(`\uD83D\uDCCA [View detailed HTML report](${reportURL})`, "");
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
  let improvements = comparison.metrics.filter((m) => m.change.direction === "better").sort((a, b) => Math.abs(b.change.percent) - Math.abs(a.change.percent));
  if (improvements.length > 0) {
    lines.push("### \uD83D\uDFE2 Top Improvements", "");
    for (let metric of improvements.slice(0, 5))
      lines.push(`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`);
  }
  return lines.join(`
`);
}

// report/lib/comment.ts
var import_core2 = __toESM(require_core(), 1), import_github2 = __toESM(require_github(), 1);
function generateCommentBody(checkUrls, reportUrls, comparisons) {
  let totalRegressions = comparisons.reduce((sum, w) => sum + w.summary.regressions, 0), totalImprovements = comparisons.reduce((sum, w) => sum + w.summary.improvements, 0), statusEmoji = totalRegressions > 0 ? "\uD83D\uDFE1" : totalImprovements > 0 ? "\uD83D\uDFE2" : "⚪", statusText = totalRegressions > 0 ? `${totalRegressions} regressions` : totalImprovements > 0 ? `${totalImprovements} improvements` : "All clear", header = [
    "## \uD83C\uDF0B SLO Test Results",
    "",
    `**Status**: ${statusEmoji} ${comparisons.length} workloads tested • ${statusText}`
  ].join(`
`), content = [
    "| | Workload | Metrics | Regressions | Improvements | Links |",
    "|-|----------|---------|-------------|--------------|-------|",
    comparisons.map((comp) => {
      let emoji = comp.summary.regressions > 0 ? "\uD83D\uDFE1" : comp.summary.improvements > 0 ? "\uD83D\uDFE2" : "⚪", checkLink = checkUrls.get(comp.workload) || "#", reportLink = reportUrls.get(comp.workload) || "#";
      return `| ${emoji} | ${comp.workload} | ${comp.summary.total} | ${comp.summary.regressions} | ${comp.summary.improvements} | [Report](${reportLink}) • [Check](${checkLink}) |`;
    })
  ].flat().join(`
`), footer = `
---
*Generated by [ydb-slo-action](https://github.com/ydb-platform/ydb-slo-action)*`;
  return header + content + footer;
}
async function findExistingComment(pull) {
  let token = import_core2.getInput("github_token"), octokit = import_github2.getOctokit(token);
  import_core2.info(`Searching for existing SLO comment in PR #${pull}...`);
  let { data: comments } = await octokit.rest.issues.listComments({
    issue_number: pull,
    owner: import_github2.context.repo.owner,
    repo: import_github2.context.repo.repo
  });
  for (let comment of comments)
    if (comment.body?.includes("\uD83C\uDF0B SLO Test Results"))
      return import_core2.info(`Found existing comment: ${comment.id}`), comment.id;
  return null;
}
async function createOrUpdateComment(pull, body) {
  let token = import_core2.getInput("github_token"), octokit = import_github2.getOctokit(token), existingId = await findExistingComment(pull);
  if (existingId) {
    import_core2.info(`Updating existing comment ${existingId}...`);
    let { data } = await octokit.rest.issues.updateComment({
      comment_id: existingId,
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      body
    });
    return import_core2.debug(`Comment updated: ${data.html_url}`), { url: data.html_url, id: data.id };
  } else {
    import_core2.info("Creating new comment...");
    let { data } = await octokit.rest.issues.createComment({
      issue_number: pull,
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      body
    });
    return import_core2.debug(`Comment created: ${data.html_url}`), { url: data.html_url, id: data.id };
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

// shared/thresholds.ts
var import_exec = __toESM(require_exec(), 1), import_core3 = __toESM(require_core(), 1);
import * as fs2 from "node:fs";
import * as path2 from "node:path";
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
    return import_core3.warning(`Failed to parse thresholds YAML: ${String(error)}`), null;
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
  import_core3.debug("Loading default thresholds from GITHUB_ACTION_PATH/deploy/thresholds.yaml");
  let actionRoot = path2.resolve(process.env.GITHUB_ACTION_PATH), defaultPath = path2.join(actionRoot, "deploy", "thresholds.yaml");
  if (fs2.existsSync(defaultPath)) {
    let content = fs2.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseThresholdsYaml(content);
    if (config)
      return config;
  }
  return import_core3.warning("Could not load default thresholds, using hardcoded defaults"), {
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
    import_core3.debug("Merging custom thresholds from inline YAML");
    let customConfig = await parseThresholdsYaml(customYaml);
    if (customConfig)
      config = mergeThresholdConfigs(config, customConfig);
  }
  if (customPath && fs2.existsSync(customPath)) {
    import_core3.debug(`Merging custom thresholds from file: ${customPath}`);
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
  let threshold = findMatchingThreshold(comparison.name, config), severity = "success";
  if (threshold) {
    if (threshold.critical_min !== void 0 && comparison.current.value < threshold.critical_min)
      import_core3.debug(`${comparison.name}: below critical_min (${comparison.current.value} < ${threshold.critical_min})`), severity = "failure";
    if (threshold.warning_min !== void 0 && comparison.current.value < threshold.warning_min)
      import_core3.debug(`${comparison.name}: below warning_min (${comparison.current.value} < ${threshold.warning_min})`), severity = "warning";
    if (threshold.critical_max !== void 0 && comparison.current.value > threshold.critical_max)
      import_core3.debug(`${comparison.name}: above critical_max (${comparison.current.value} > ${threshold.critical_max})`), severity = "failure";
    if (threshold.warning_max !== void 0 && comparison.current.value > threshold.warning_max)
      import_core3.debug(`${comparison.name}: above warning_max (${comparison.current.value} > ${threshold.warning_max})`), severity = "warning";
  }
  if (!isNaN(comparison.change.percent)) {
    let changePercent = Math.abs(comparison.change.percent), warningThreshold = threshold?.warning_change_percent ?? config.default.warning_change_percent, criticalThreshold = threshold?.critical_change_percent ?? config.default.critical_change_percent;
    if (comparison.change.direction === "worse") {
      if (changePercent > criticalThreshold)
        import_core3.debug(`${comparison.name}: critical regression (${changePercent.toFixed(1)}% > ${criticalThreshold}%)`), severity = "failure";
      if (changePercent > warningThreshold)
        import_core3.debug(`${comparison.name}: warning regression (${changePercent.toFixed(1)}% > ${warningThreshold}%)`), severity = "warning";
    }
  }
  return {
    metric_name: comparison.name,
    threshold_name: threshold?.name,
    threshold_pattern: threshold?.pattern,
    threshold_severity: severity
  };
}
function evaluateWorkloadThresholds(comparisons, config) {
  let failures = [], warnings = [];
  for (let comparison of comparisons) {
    let severity = evaluateThreshold(comparison, config);
    if (severity.threshold_severity === "failure")
      failures.push(comparison);
    else if (severity.threshold_severity === "warning")
      warnings.push(comparison);
  }
  let overall = "success";
  if (failures.length > 0)
    overall = "failure";
  else if (warnings.length > 0)
    overall = "warning";
  return { overall, failures, warnings };
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

// report/main.ts
async function main() {
  let cwd = path3.join(process.cwd(), ".slo-reports");
  await fs3.mkdir(cwd, { recursive: !0 });
  let runArtifacts = await downloadRunArtifacts(cwd);
  if (import_core4.info(`Found ${runArtifacts.size} workloads: ${[...runArtifacts.keys()].join(", ")}`), runArtifacts.size === 0) {
    import_core4.setFailed("No workload artifacts found in current run");
    return;
  }
  let pull = import_github3.context.issue.number, reports = [], thresholds = await loadThresholdConfig();
  for (let [, artifact] of runArtifacts) {
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
  let checkUrls = /* @__PURE__ */ new Map, reportUrls = /* @__PURE__ */ new Map, comparisons = [];
  for (let report of reports) {
    if (report.checkUrl)
      checkUrls.set(report.workload, report.checkUrl);
    if (report.reportUrl)
      reportUrls.set(report.workload, report.reportUrl);
    comparisons.push(report.comparison);
  }
  let body = generateCommentBody(checkUrls, reportUrls, comparisons);
  await createOrUpdateComment(issue, body);
}
main();

//# debugId=1FAB76C948958FBC64756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi9jb21tZW50LnRzIiwgIi4uL3JlcG9ydC9saWIvaHRtbC50cyIsICIuLi9zaGFyZWQvdGhyZXNob2xkcy50cyIsICIuLi9yZXBvcnQvbGliL21ldHJpY3MudHMiLCAiLi4vc2hhcmVkL2V2ZW50cy50cyIsICIuLi9yZXBvcnQvbGliL2V2ZW50cy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICAgICJpbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzL3Byb21pc2VzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvLCBzZXRGYWlsZWQgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCwgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHsgY29tcGFyZVdvcmtsb2FkTWV0cmljcywgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuLi9zaGFyZWQvYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBkb3dubG9hZFJ1bkFydGlmYWN0cyB9IGZyb20gJy4vbGliL2FydGlmYWN0cy5qcydcbmltcG9ydCB7IGdlbmVyYXRlQ2hlY2tTdW1tYXJ5LCBnZW5lcmF0ZUNoZWNrVGl0bGUgfSBmcm9tICcuL2xpYi9jaGVja3MuanMnXG5pbXBvcnQgeyBjcmVhdGVPclVwZGF0ZUNvbW1lbnQsIGdlbmVyYXRlQ29tbWVudEJvZHkgfSBmcm9tICcuL2xpYi9jb21tZW50LmpzJ1xuaW1wb3J0IHsgZ2VuZXJhdGVIVE1MUmVwb3J0LCB0eXBlIEhUTUxSZXBvcnREYXRhIH0gZnJvbSAnLi9saWIvaHRtbC5qcydcbmltcG9ydCB7IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzLCBsb2FkVGhyZXNob2xkQ29uZmlnLCB0eXBlIFRocmVzaG9sZENvbmZpZyB9IGZyb20gJy4uL3NoYXJlZC90aHJlc2hvbGRzLmpzJ1xuaW1wb3J0IHsgbG9hZENvbGxlY3RlZE1ldHJpY3MgfSBmcm9tICcuL2xpYi9tZXRyaWNzLmpzJ1xuaW1wb3J0IHR5cGUgeyBUZXN0TWV0YWRhdGEgfSBmcm9tICcuLi9zaGFyZWQvbWV0YWRhdGEuanMnXG5pbXBvcnQgdHlwZSB7IENvbGxlY3RlZE1ldHJpYyB9IGZyb20gJy4uL3NoYXJlZC9tZXRyaWNzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4uL3NoYXJlZC9ldmVudHMuanMnXG5pbXBvcnQgeyBsb2FkQ2hhb3NFdmVudHMgfSBmcm9tICcuL2xpYi9ldmVudHMuanMnXG5cbnR5cGUgV29ya2xvYWRSZXBvcnQgPSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdXG5cdG1ldGFkYXRhOiBUZXN0TWV0YWRhdGFcblx0dGhyZXNob2xkczogVGhyZXNob2xkQ29uZmlnXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXG5cdGNoZWNrVXJsPzogc3RyaW5nXG5cdHJlcG9ydFVybD86IHN0cmluZ1xufVxuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHRsZXQgY3dkID0gcGF0aC5qb2luKHByb2Nlc3MuY3dkKCksICcuc2xvLXJlcG9ydHMnKVxuXHRhd2FpdCBmcy5ta2Rpcihjd2QsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0bGV0IHJ1bkFydGlmYWN0cyA9IGF3YWl0IGRvd25sb2FkUnVuQXJ0aWZhY3RzKGN3ZClcblx0aW5mbyhgRm91bmQgJHtydW5BcnRpZmFjdHMuc2l6ZX0gd29ya2xvYWRzOiAke1suLi5ydW5BcnRpZmFjdHMua2V5cygpXS5qb2luKCcsICcpfWApXG5cblx0aWYgKHJ1bkFydGlmYWN0cy5zaXplID09PSAwKSB7XG5cdFx0c2V0RmFpbGVkKCdObyB3b3JrbG9hZCBhcnRpZmFjdHMgZm91bmQgaW4gY3VycmVudCBydW4nKVxuXHRcdHJldHVyblxuXHR9XG5cblx0bGV0IHB1bGwgPSBjb250ZXh0Lmlzc3VlLm51bWJlclxuXHRsZXQgcmVwb3J0czogV29ya2xvYWRSZXBvcnRbXSA9IFtdXG5cdGxldCB0aHJlc2hvbGRzID0gYXdhaXQgbG9hZFRocmVzaG9sZENvbmZpZygpXG5cblx0Zm9yIChsZXQgWywgYXJ0aWZhY3RdIG9mIHJ1bkFydGlmYWN0cykge1xuXHRcdGxldCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10gPSBsb2FkQ2hhb3NFdmVudHMoYXdhaXQgZnMucmVhZEZpbGUoYXJ0aWZhY3QuZXZlbnRzUGF0aCwgJ3V0Zi04JykpXG5cdFx0bGV0IG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdID0gbG9hZENvbGxlY3RlZE1ldHJpY3MoYXdhaXQgZnMucmVhZEZpbGUoYXJ0aWZhY3QubWV0cmljc1BhdGgsICd1dGYtOCcpKVxuXHRcdGxldCBtZXRhZGF0YSA9IEpTT04ucGFyc2UoYXdhaXQgZnMucmVhZEZpbGUoYXJ0aWZhY3QubWV0YWRhdGFQYXRoLCAndXRmLTgnKSkgYXMgVGVzdE1ldGFkYXRhXG5cblx0XHRpZiAobWV0YWRhdGEucHVsbCAmJiBtZXRhZGF0YS5wdWxsICE9PSBwdWxsKSB7XG5cdFx0XHRwdWxsID0gbWV0YWRhdGEucHVsbFxuXHRcdH1cblxuXHRcdGxldCBjb21wYXJpc29uID0gY29tcGFyZVdvcmtsb2FkTWV0cmljcyhcblx0XHRcdG1ldGFkYXRhLndvcmtsb2FkLFxuXHRcdFx0bWV0cmljcyxcblx0XHRcdG1ldGFkYXRhLndvcmtsb2FkX2N1cnJlbnRfcmVmIHx8ICdjdXJyZW50Jyxcblx0XHRcdG1ldGFkYXRhLndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZWxpbmUnLFxuXHRcdFx0J2F2ZycsXG5cdFx0XHR0aHJlc2hvbGRzLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnRcblx0XHQpXG5cblx0XHRsZXQgcmVwb3J0OiBXb3JrbG9hZFJlcG9ydCA9IHtcblx0XHRcdHdvcmtsb2FkOiBtZXRhZGF0YS53b3JrbG9hZCxcblx0XHRcdGV2ZW50cyxcblx0XHRcdG1ldHJpY3MsXG5cdFx0XHRtZXRhZGF0YSxcblx0XHRcdHRocmVzaG9sZHMsXG5cdFx0XHRjb21wYXJpc29uLFxuXHRcdH1cblxuXHRcdGxldCBjaGVjayA9IGF3YWl0IGNyZWF0ZVdvcmtsb2FkQ2hlY2soYFNMTzogJHttZXRhZGF0YS53b3JrbG9hZH1gLCBtZXRhZGF0YS5jb21taXQhLCBjb21wYXJpc29uLCB0aHJlc2hvbGRzKVxuXHRcdHJlcG9ydC5jaGVja1VybCA9IGNoZWNrLnVybFxuXG5cdFx0cmVwb3J0cy5wdXNoKHJlcG9ydClcblx0fVxuXG5cdGF3YWl0IGNyZWF0ZVdvcmtsb2FkSFRNTFJlcG9ydChjd2QsIHJlcG9ydHMpXG5cblx0aWYgKHB1bGwpIHtcblx0XHRhd2FpdCBjcmVhdGVQdWxsUmVxdWVzdENvbW1lbnQocHVsbCwgcmVwb3J0cylcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrbG9hZENoZWNrKFxuXHRuYW1lOiBzdHJpbmcsXG5cdGNvbW1pdDogc3RyaW5nLFxuXHRjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdHRocmVzaG9sZHM6IFRocmVzaG9sZENvbmZpZyxcblx0cmVwb3J0VVJMPzogc3RyaW5nXG4pIHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpXG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXZhbHVhdGlvbiA9IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKGNvbXBhcmlzb24ubWV0cmljcywgdGhyZXNob2xkcylcblx0bGV0IGNvbmNsdXNpb246ICdzdWNjZXNzJyB8ICduZXV0cmFsJyB8ICdmYWlsdXJlJyA9ICdzdWNjZXNzJ1xuXHRpZiAoZXZhbHVhdGlvbi5vdmVyYWxsID09PSAnZmFpbHVyZScpIGNvbmNsdXNpb24gPSAnZmFpbHVyZSdcblx0aWYgKGV2YWx1YXRpb24ub3ZlcmFsbCA9PT0gJ3dhcm5pbmcnKSBjb25jbHVzaW9uID0gJ25ldXRyYWwnXG5cblx0bGV0IHRpdGxlID0gZ2VuZXJhdGVDaGVja1RpdGxlKGNvbXBhcmlzb24sIGV2YWx1YXRpb24pXG5cdGxldCBzdW1tYXJ5ID0gZ2VuZXJhdGVDaGVja1N1bW1hcnkoY29tcGFyaXNvbiwgZXZhbHVhdGlvbiwgcmVwb3J0VVJMKVxuXG5cdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5jaGVja3MuY3JlYXRlKHtcblx0XHRuYW1lLFxuXHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0aGVhZF9zaGE6IGNvbW1pdCEsXG5cdFx0c3RhdHVzOiAnY29tcGxldGVkJyxcblx0XHRjb25jbHVzaW9uLFxuXHRcdG91dHB1dDoge1xuXHRcdFx0dGl0bGUsXG5cdFx0XHRzdW1tYXJ5LFxuXHRcdH0sXG5cdH0pXG5cblx0ZGVidWcoYENyZWF0ZWQgY2hlY2sgXCIke25hbWV9XCIgd2l0aCBjb25jbHVzaW9uOiAke2NvbmNsdXNpb259LCB1cmw6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdHJldHVybiB7IGlkOiBkYXRhLmlkLCB1cmw6IGRhdGEuaHRtbF91cmwhIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya2xvYWRIVE1MUmVwb3J0KGN3ZDogc3RyaW5nLCByZXBvcnRzOiBXb3JrbG9hZFJlcG9ydFtdKSB7XG5cdGluZm8oJ/Cfk50gR2VuZXJhdGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgaHRtbEZpbGVzOiBBcnJheTx7IHdvcmtsb2FkOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9PiA9IFtdXG5cblx0Zm9yIChsZXQgcmVwb3J0IG9mIHJlcG9ydHMpIHtcblx0XHRsZXQgaHRtbERhdGE6IEhUTUxSZXBvcnREYXRhID0ge1xuXHRcdFx0d29ya2xvYWQ6IHJlcG9ydC53b3JrbG9hZCxcblx0XHRcdGNvbXBhcmlzb246IHJlcG9ydC5jb21wYXJpc29uLFxuXHRcdFx0bWV0cmljczogcmVwb3J0Lm1ldHJpY3MsXG5cdFx0XHRldmVudHM6IHJlcG9ydC5ldmVudHMsXG5cdFx0XHRjdXJyZW50UmVmOiByZXBvcnQubWV0YWRhdGEud29ya2xvYWRfY3VycmVudF9yZWYgfHwgJ2N1cnJlbnQnLFxuXHRcdFx0YmFzZWxpbmVSZWY6IHJlcG9ydC5tZXRhZGF0YS53b3JrbG9hZF9iYXNlbGluZV9yZWYgfHwgJ2Jhc2VsaW5lJyxcblx0XHRcdHByTnVtYmVyOiByZXBvcnQubWV0YWRhdGEucHVsbCEsXG5cdFx0XHR0ZXN0U3RhcnRUaW1lOiByZXBvcnQubWV0YWRhdGE/LnN0YXJ0X2Vwb2NoX21zIHx8IERhdGUubm93KCkgLSAxMCAqIDYwICogMTAwMCxcblx0XHRcdHRlc3RFbmRUaW1lOiByZXBvcnQubWV0YWRhdGE/LmZpbmlzaF9lcG9jaF9tcyB8fCBEYXRlLm5vdygpLFxuXHRcdH1cblxuXHRcdGxldCBodG1sID0gZ2VuZXJhdGVIVE1MUmVwb3J0KGh0bWxEYXRhKVxuXHRcdGxldCBodG1sUGF0aCA9IHBhdGguam9pbihjd2QsIGAke3JlcG9ydC53b3JrbG9hZH0tcmVwb3J0Lmh0bWxgKVxuXG5cdFx0YXdhaXQgZnMud3JpdGVGaWxlKGh0bWxQYXRoLCBodG1sLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0aHRtbEZpbGVzLnB1c2goeyB3b3JrbG9hZDogcmVwb3J0Lndvcmtsb2FkLCBwYXRoOiBodG1sUGF0aCB9KVxuXG5cdFx0bGV0IHsgaWQgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50LnVwbG9hZEFydGlmYWN0KHJlcG9ydC53b3JrbG9hZCArICctaHRtbC1yZXBvcnQnLCBbaHRtbFBhdGhdLCBjd2QsIHtcblx0XHRcdHJldGVudGlvbkRheXM6IDMwLFxuXHRcdH0pXG5cblx0XHRsZXQgcnVuSWQgPSBjb250ZXh0LnJ1bklkLnRvU3RyaW5nKClcblx0XHRyZXBvcnQucmVwb3J0VXJsID0gYGh0dHBzOi8vYXBpLmdpdGh1Yi5jb20vcmVwb3MvJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2FjdGlvbnMvcnVucy8ke3J1bklkfS9hcnRpZmFjdHMvJHtpZH1gXG5cdH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gY3JlYXRlUHVsbFJlcXVlc3RDb21tZW50KGlzc3VlOiBudW1iZXIsIHJlcG9ydHM6IFdvcmtsb2FkUmVwb3J0W10pIHtcblx0aW5mbygn8J+SrCBDcmVhdGluZy91cGRhdGluZyBQUiBjb21tZW50Li4uJylcblxuXHRsZXQgY2hlY2tVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRsZXQgcmVwb3J0VXJscyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcblx0bGV0IGNvbXBhcmlzb25zOiBXb3JrbG9hZENvbXBhcmlzb25bXSA9IFtdXG5cblx0Zm9yIChsZXQgcmVwb3J0IG9mIHJlcG9ydHMpIHtcblx0XHRpZiAocmVwb3J0LmNoZWNrVXJsKSB7XG5cdFx0XHRjaGVja1VybHMuc2V0KHJlcG9ydC53b3JrbG9hZCwgcmVwb3J0LmNoZWNrVXJsKVxuXHRcdH1cblxuXHRcdGlmIChyZXBvcnQucmVwb3J0VXJsKSB7XG5cdFx0XHRyZXBvcnRVcmxzLnNldChyZXBvcnQud29ya2xvYWQsIHJlcG9ydC5yZXBvcnRVcmwpXG5cdFx0fVxuXG5cdFx0Y29tcGFyaXNvbnMucHVzaChyZXBvcnQuY29tcGFyaXNvbilcblx0fVxuXG5cdGxldCBib2R5ID0gZ2VuZXJhdGVDb21tZW50Qm9keShjaGVja1VybHMsIHJlcG9ydFVybHMsIGNvbXBhcmlzb25zKVxuXHRhd2FpdCBjcmVhdGVPclVwZGF0ZUNvbW1lbnQoaXNzdWUsIGJvZHkpXG59XG5cbm1haW4oKVxuIiwKICAgICIvKipcbiAqIEFydGlmYWN0cyBkb3dubG9hZCBhbmQgcGFyc2luZ1xuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBkZWJ1ZywgZ2V0SW5wdXQsIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuZXhwb3J0IGludGVyZmFjZSBXb3JrbG9hZEFydGlmYWN0cyB7XG5cdG5hbWU6IHN0cmluZ1xuXHRsb2dzUGF0aDogc3RyaW5nXG5cdGV2ZW50c1BhdGg6IHN0cmluZ1xuXHRtZXRyaWNzUGF0aDogc3RyaW5nXG5cdG1ldGFkYXRhUGF0aDogc3RyaW5nXG59XG5cbi8qKlxuICogRG93bmxvYWQgYXJ0aWZhY3RzIGZvciBhIHdvcmtmbG93IHJ1blxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRSdW5BcnRpZmFjdHMoZGVzdGluYXRpb25QYXRoOiBzdHJpbmcpOiBQcm9taXNlPE1hcDxzdHJpbmcsIFdvcmtsb2FkQXJ0aWZhY3RzPj4ge1xuXHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJylcblx0bGV0IHdvcmtmbG93UnVuSWQgPSBwYXJzZUludChnZXRJbnB1dCgnZ2l0aHViX3J1bl9pZCcpIHx8IFN0cmluZyhjb250ZXh0LnJ1bklkKSlcblxuXHRpZiAoIXRva2VuIHx8ICF3b3JrZmxvd1J1bklkKSB7XG5cdFx0dGhyb3cgbmV3IEVycm9yKCdHaXRIdWIgdG9rZW4gYW5kIHdvcmtmbG93IHJ1biBJRCBhcmUgcmVxdWlyZWQgdG8gZG93bmxvYWQgYXJ0aWZhY3RzJylcblx0fVxuXG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXHRsZXQgeyBhcnRpZmFjdHMgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50Lmxpc3RBcnRpZmFjdHMoe1xuXHRcdGZpbmRCeToge1xuXHRcdFx0dG9rZW46IHRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZDogd29ya2Zsb3dSdW5JZCxcblx0XHRcdHJlcG9zaXRvcnlOYW1lOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdHJlcG9zaXRvcnlPd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdH0sXG5cdH0pXG5cblx0ZGVidWcoYEZvdW5kICR7YXJ0aWZhY3RzLmxlbmd0aH0gYXJ0aWZhY3RzIGluIHdvcmtmbG93IHJ1biAke3dvcmtmbG93UnVuSWR9YClcblxuXHQvLyBEb3dubG9hZCBlYWNoIGFydGlmYWN0IHRvIGl0cyBvd24gc3ViZGlyZWN0b3J5XG5cdGxldCBkb3dubG9hZGVkUGF0aHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0Zm9yIChsZXQgYXJ0aWZhY3Qgb2YgYXJ0aWZhY3RzKSB7XG5cdFx0bGV0IGFydGlmYWN0RGlyID0gcGF0aC5qb2luKGRlc3RpbmF0aW9uUGF0aCwgYXJ0aWZhY3QubmFtZSlcblxuXHRcdGRlYnVnKGBEb3dubG9hZGluZyBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9Li4uYClcblxuXHRcdGxldCB7IGRvd25sb2FkUGF0aCB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQuZG93bmxvYWRBcnRpZmFjdChhcnRpZmFjdC5pZCwge1xuXHRcdFx0cGF0aDogYXJ0aWZhY3REaXIsXG5cdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0dG9rZW46IHRva2VuLFxuXHRcdFx0XHR3b3JrZmxvd1J1bklkOiB3b3JrZmxvd1J1bklkLFxuXHRcdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRcdHJlcG9zaXRvcnlPd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGFydGlmYWN0UGF0aCA9IGRvd25sb2FkUGF0aCB8fCBhcnRpZmFjdERpclxuXHRcdGRvd25sb2FkZWRQYXRocy5zZXQoYXJ0aWZhY3QubmFtZSwgYXJ0aWZhY3RQYXRoKVxuXG5cdFx0ZGVidWcoYERvd25sb2FkZWQgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfSB0byAke2FydGlmYWN0UGF0aH1gKVxuXHR9XG5cblx0Ly8gR3JvdXAgYXJ0aWZhY3RzIGJ5IHdvcmtsb2FkXG5cdGxldCBydW5BcnRpZmFjdHMgPSBuZXcgTWFwPHN0cmluZywgV29ya2xvYWRBcnRpZmFjdHM+KClcblxuXHRmb3IgKGxldCBbYXJ0aWZhY3ROYW1lLCBhcnRpZmFjdFBhdGhdIG9mIGRvd25sb2FkZWRQYXRocykge1xuXHRcdC8vIEFydGlmYWN0IG5hbWUgaXMgdGhlIHdvcmtsb2FkIG5hbWUsIGZpbGVzIGluc2lkZSBoYXZlIHdvcmtsb2FkIHByZWZpeFxuXHRcdGxldCB3b3JrbG9hZCA9IGFydGlmYWN0TmFtZVxuXG5cdFx0Ly8gTGlzdCBmaWxlcyBpbiBhcnRpZmFjdCBkaXJlY3Rvcnlcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoYXJ0aWZhY3RQYXRoKSkge1xuXHRcdFx0d2FybmluZyhgQXJ0aWZhY3QgcGF0aCBkb2VzIG5vdCBleGlzdDogJHthcnRpZmFjdFBhdGh9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0bGV0IHN0YXQgPSBmcy5zdGF0U3luYyhhcnRpZmFjdFBhdGgpXG5cdFx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG5cdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGFydGlmYWN0UGF0aCkubWFwKChmKSA9PiBwYXRoLmpvaW4oYXJ0aWZhY3RQYXRoLCBmKSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmlsZXMgPSBbYXJ0aWZhY3RQYXRoXVxuXHRcdH1cblxuXHRcdGxldCBncm91cCA9IHJ1bkFydGlmYWN0cy5nZXQod29ya2xvYWQpIHx8ICh7fSBhcyBXb3JrbG9hZEFydGlmYWN0cylcblx0XHRncm91cC5uYW1lID0gd29ya2xvYWRcblxuXHRcdGZvciAobGV0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdGxldCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSlcblxuXHRcdFx0aWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbG9ncy50eHQnKSkge1xuXHRcdFx0XHRncm91cC5sb2dzUGF0aCA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1ldmVudHMuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5ldmVudHNQYXRoID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldHJpY3MuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5tZXRyaWNzUGF0aCA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1tZXRhZGF0YS5qc29uJykpIHtcblx0XHRcdFx0Z3JvdXAubWV0YWRhdGFQYXRoID0gZmlsZVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHJ1bkFydGlmYWN0cy5zZXQod29ya2xvYWQsIGdyb3VwKVxuXHR9XG5cblx0cmV0dXJuIHJ1bkFydGlmYWN0c1xufVxuIiwKICAgICIvKipcbiAqIEdpdEh1YiBDaGVja3MgQVBJIGludGVncmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuLi8uLi9zaGFyZWQvYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcyB9IGZyb20gJy4uLy4uL3NoYXJlZC90aHJlc2hvbGRzLmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDaGVja1RpdGxlKFxuXHRjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdGV2YWx1YXRpb246IFJldHVyblR5cGU8dHlwZW9mIGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzPlxuKTogc3RyaW5nIHtcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH0gY3JpdGljYWwgdGhyZXNob2xkKHMpIHZpb2xhdGVkYFxuXHR9XG5cblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyB0aHJlc2hvbGQocykgZXhjZWVkZWRgXG5cdH1cblxuXHRpZiAoY29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDApIHtcblx0XHRyZXR1cm4gYCR7Y29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50c30gaW1wcm92ZW1lbnQocykgZGV0ZWN0ZWRgXG5cdH1cblxuXHRyZXR1cm4gJ0FsbCBtZXRyaWNzIHdpdGhpbiB0aHJlc2hvbGRzJ1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDaGVja1N1bW1hcnkoXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvbixcblx0ZXZhbHVhdGlvbjogUmV0dXJuVHlwZTx0eXBlb2YgZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHM+LFxuXHRyZXBvcnRVUkw/OiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBsaW5lcyA9IFtcblx0XHRgKipNZXRyaWNzIGFuYWx5emVkOioqICR7Y29tcGFyaXNvbi5zdW1tYXJ5LnRvdGFsfWAsXG5cdFx0YC0g8J+UtCBDcml0aWNhbDogJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH1gLFxuXHRcdGAtIPCfn6EgV2FybmluZ3M6ICR7ZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGh9YCxcblx0XHRgLSDwn5+iIEltcHJvdmVtZW50czogJHtjb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzfWAsXG5cdFx0YC0g4pqqIFN0YWJsZTogJHtjb21wYXJpc29uLnN1bW1hcnkuc3RhYmxlfWAsXG5cdFx0JycsXG5cdF1cblxuXHRpZiAocmVwb3J0VVJMKSB7XG5cdFx0bGluZXMucHVzaChg8J+TiiBbVmlldyBkZXRhaWxlZCBIVE1MIHJlcG9ydF0oJHtyZXBvcnRVUkx9KWAsICcnKVxuXHR9XG5cblx0Ly8gQ3JpdGljYWwgZmFpbHVyZXNcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDinYwgQ3JpdGljYWwgVGhyZXNob2xkcyBWaW9sYXRlZCcsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGV2YWx1YXRpb24uZmFpbHVyZXMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gV2FybmluZ3Ncblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDimqDvuI8gV2FybmluZyBUaHJlc2hvbGRzIEV4Y2VlZGVkJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgZXZhbHVhdGlvbi53YXJuaW5ncy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdGxpbmVzLnB1c2goJycpXG5cdH1cblxuXHQvLyBUb3AgaW1wcm92ZW1lbnRzXG5cdGxldCBpbXByb3ZlbWVudHMgPSBjb21wYXJpc29uLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLmNoYW5nZS5kaXJlY3Rpb24gPT09ICdiZXR0ZXInKVxuXHRcdC5zb3J0KChhLCBiKSA9PiBNYXRoLmFicyhiLmNoYW5nZS5wZXJjZW50KSAtIE1hdGguYWJzKGEuY2hhbmdlLnBlcmNlbnQpKVxuXG5cdGlmIChpbXByb3ZlbWVudHMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDwn5+iIFRvcCBJbXByb3ZlbWVudHMnLCAnJylcblxuXHRcdGZvciAobGV0IG1ldHJpYyBvZiBpbXByb3ZlbWVudHMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbGluZXMuam9pbignXFxuJylcbn1cbiIsCiAgICAiaW1wb3J0IHsgZGVidWcsIGdldElucHV0LCBpbmZvIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQsIGdldE9jdG9raXQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5pbXBvcnQgdHlwZSB7IFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4uLy4uL3NoYXJlZC9hbmFseXNpcy5qcydcblxuLyoqXG4gKiBHZW5lcmF0ZSBQUiBjb21tZW50IGJvZHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29tbWVudEJvZHkoXG5cdGNoZWNrVXJsczogTWFwPHN0cmluZywgc3RyaW5nPixcblx0cmVwb3J0VXJsczogTWFwPHN0cmluZywgc3RyaW5nPixcblx0Y29tcGFyaXNvbnM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG4pOiBzdHJpbmcge1xuXHRsZXQgdG90YWxSZWdyZXNzaW9ucyA9IGNvbXBhcmlzb25zLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkucmVncmVzc2lvbnMsIDApXG5cdGxldCB0b3RhbEltcHJvdmVtZW50cyA9IGNvbXBhcmlzb25zLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkuaW1wcm92ZW1lbnRzLCAwKVxuXG5cdGxldCBzdGF0dXNFbW9qaSA9IHRvdGFsUmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogdG90YWxJbXByb3ZlbWVudHMgPiAwID8gJ/Cfn6InIDogJ+Kaqidcblx0bGV0IHN0YXR1c1RleHQgPVxuXHRcdHRvdGFsUmVncmVzc2lvbnMgPiAwXG5cdFx0XHQ/IGAke3RvdGFsUmVncmVzc2lvbnN9IHJlZ3Jlc3Npb25zYFxuXHRcdFx0OiB0b3RhbEltcHJvdmVtZW50cyA+IDBcblx0XHRcdFx0PyBgJHt0b3RhbEltcHJvdmVtZW50c30gaW1wcm92ZW1lbnRzYFxuXHRcdFx0XHQ6ICdBbGwgY2xlYXInXG5cblx0bGV0IGhlYWRlciA9IFtcblx0XHRgIyMg8J+MiyBTTE8gVGVzdCBSZXN1bHRzYCxcblx0XHRgYCxcblx0XHRgKipTdGF0dXMqKjogJHtzdGF0dXNFbW9qaX0gJHtjb21wYXJpc29ucy5sZW5ndGh9IHdvcmtsb2FkcyB0ZXN0ZWQg4oCiICR7c3RhdHVzVGV4dH1gLFxuXHRdLmpvaW4oJ1xcbicpXG5cblx0bGV0IGNvbnRlbnQgPSBbXG5cdFx0J3wgfCBXb3JrbG9hZCB8IE1ldHJpY3MgfCBSZWdyZXNzaW9ucyB8IEltcHJvdmVtZW50cyB8IExpbmtzIHwnLFxuXHRcdCd8LXwtLS0tLS0tLS0tfC0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS18Jyxcblx0XHRjb21wYXJpc29ucy5tYXAoKGNvbXApID0+IHtcblx0XHRcdGxldCBlbW9qaSA9IGNvbXAuc3VtbWFyeS5yZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiBjb21wLnN1bW1hcnkuaW1wcm92ZW1lbnRzID4gMCA/ICfwn5+iJyA6ICfimqonXG5cdFx0XHRsZXQgY2hlY2tMaW5rID0gY2hlY2tVcmxzLmdldChjb21wLndvcmtsb2FkKSB8fCAnIydcblx0XHRcdGxldCByZXBvcnRMaW5rID0gcmVwb3J0VXJscy5nZXQoY29tcC53b3JrbG9hZCkgfHwgJyMnXG5cblx0XHRcdHJldHVybiBgfCAke2Vtb2ppfSB8ICR7Y29tcC53b3JrbG9hZH0gfCAke2NvbXAuc3VtbWFyeS50b3RhbH0gfCAke2NvbXAuc3VtbWFyeS5yZWdyZXNzaW9uc30gfCAke2NvbXAuc3VtbWFyeS5pbXByb3ZlbWVudHN9IHwgW1JlcG9ydF0oJHtyZXBvcnRMaW5rfSkg4oCiIFtDaGVja10oJHtjaGVja0xpbmt9KSB8YFxuXHRcdH0pLFxuXHRdXG5cdFx0LmZsYXQoKVxuXHRcdC5qb2luKCdcXG4nKVxuXG5cdGxldCBmb290ZXIgPSBgXFxuLS0tXFxuKkdlbmVyYXRlZCBieSBbeWRiLXNsby1hY3Rpb25dKGh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb24pKmBcblxuXHRyZXR1cm4gaGVhZGVyICsgY29udGVudCArIGZvb3RlclxufVxuXG4vKipcbiAqIEZpbmQgZXhpc3RpbmcgY29tbWVudCBpbiBQUlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEV4aXN0aW5nQ29tbWVudChwdWxsOiBudW1iZXIpOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpXG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRpbmZvKGBTZWFyY2hpbmcgZm9yIGV4aXN0aW5nIFNMTyBjb21tZW50IGluIFBSICMke3B1bGx9Li4uYClcblxuXHRsZXQgeyBkYXRhOiBjb21tZW50cyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdGlzc3VlX251bWJlcjogcHVsbCxcblx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHR9KVxuXG5cdGZvciAobGV0IGNvbW1lbnQgb2YgY29tbWVudHMpIHtcblx0XHRpZiAoY29tbWVudC5ib2R5Py5pbmNsdWRlcygn8J+MiyBTTE8gVGVzdCBSZXN1bHRzJykpIHtcblx0XHRcdGluZm8oYEZvdW5kIGV4aXN0aW5nIGNvbW1lbnQ6ICR7Y29tbWVudC5pZH1gKVxuXHRcdFx0cmV0dXJuIGNvbW1lbnQuaWRcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbnVsbFxufVxuXG4vKipcbiAqIENyZWF0ZSBvciB1cGRhdGUgUFIgY29tbWVudFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlT3JVcGRhdGVDb21tZW50KHB1bGw6IG51bWJlciwgYm9keTogc3RyaW5nKTogUHJvbWlzZTx7IHVybDogc3RyaW5nOyBpZDogbnVtYmVyIH0+IHtcblx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpXG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXhpc3RpbmdJZCA9IGF3YWl0IGZpbmRFeGlzdGluZ0NvbW1lbnQocHVsbClcblxuXHRpZiAoZXhpc3RpbmdJZCkge1xuXHRcdGluZm8oYFVwZGF0aW5nIGV4aXN0aW5nIGNvbW1lbnQgJHtleGlzdGluZ0lkfS4uLmApXG5cblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLnVwZGF0ZUNvbW1lbnQoe1xuXHRcdFx0Y29tbWVudF9pZDogZXhpc3RpbmdJZCxcblx0XHRcdG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGRlYnVnKGBDb21tZW50IHVwZGF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9IGVsc2Uge1xuXHRcdGluZm8oYENyZWF0aW5nIG5ldyBjb21tZW50Li4uYClcblxuXHRcdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMuY3JlYXRlQ29tbWVudCh7XG5cdFx0XHRpc3N1ZV9udW1iZXI6IHB1bGwsXG5cdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRkZWJ1ZyhgQ29tbWVudCBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRcdHJldHVybiB7IHVybDogZGF0YS5odG1sX3VybCEsIGlkOiBkYXRhLmlkIH1cblx0fVxufVxuIiwKICAgICIvKipcbiAqIEhUTUwgcmVwb3J0IGdlbmVyYXRpb24gd2l0aCBDaGFydC5qc1xuICovXG5cbmltcG9ydCB0eXBlIHsgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuLi8uLi9zaGFyZWQvZXZlbnRzLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMsIFJhbmdlU2VyaWVzIH0gZnJvbSAnLi4vLi4vc2hhcmVkL21ldHJpY3MuanMnXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4uLy4uL3NoYXJlZC9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBIVE1MUmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0Y3VycmVudFJlZjogc3RyaW5nXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmdcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdG1ldHJpY3M6IENvbGxlY3RlZE1ldHJpY1tdXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXHRwck51bWJlcjogbnVtYmVyXG5cdHRlc3RTdGFydFRpbWU6IG51bWJlciAvLyBlcG9jaCBtc1xuXHR0ZXN0RW5kVGltZTogbnVtYmVyIC8vIGVwb2NoIG1zXG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCByZXBvcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSFRNTFJlcG9ydChkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cblx0PG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cblx0PHRpdGxlPlNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L3RpdGxlPlxuXHQ8c3R5bGU+JHtnZXRTdHlsZXMoKX08L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG5cdDxoZWFkZXI+XG5cdFx0PGgxPvCfjIsgU0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvaDE+XG5cdFx0PGRpdiBjbGFzcz1cImNvbW1pdC1pbmZvXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBjdXJyZW50XCI+XG5cdFx0XHRcdEN1cnJlbnQ6ICR7ZXNjYXBlSHRtbChkYXRhLmN1cnJlbnRSZWYpfVxuXHRcdFx0PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJ2c1wiPnZzPC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJjb21taXQgYmFzZWxpbmVcIj5cblx0XHRcdFx0QmFzZWxpbmU6ICR7ZXNjYXBlSHRtbChkYXRhLmJhc2VsaW5lUmVmKX1cblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibWV0YVwiPlxuXHRcdFx0PHNwYW4+UFIgIyR7ZGF0YS5wck51bWJlcn08L3NwYW4+XG5cdFx0XHQ8c3Bhbj5EdXJhdGlvbjogJHsoKGRhdGEudGVzdEVuZFRpbWUgLSBkYXRhLnRlc3RTdGFydFRpbWUpIC8gMTAwMCkudG9GaXhlZCgwKX1zPC9zcGFuPlxuXHRcdFx0PHNwYW4+R2VuZXJhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX08L3NwYW4+XG5cdFx0PC9kaXY+XG5cdDwvaGVhZGVyPlxuXG5cdDxzZWN0aW9uIGNsYXNzPVwic3VtbWFyeVwiPlxuXHRcdDxoMj7wn5OKIE1ldHJpY3MgT3ZlcnZpZXc8L2gyPlxuXHRcdDxkaXYgY2xhc3M9XCJzdGF0c1wiPlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZFwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkudG90YWx9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+VG90YWwgTWV0cmljczwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIGltcHJvdmVtZW50c1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPkltcHJvdmVtZW50czwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIHJlZ3Jlc3Npb25zXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5yZWdyZXNzaW9uc308L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5SZWdyZXNzaW9uczwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIHN0YWJsZVwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkuc3RhYmxlfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlN0YWJsZTwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0JHtnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShkYXRhLmNvbXBhcmlzb24pfVxuXHQ8L3NlY3Rpb24+XG5cblx0PHNlY3Rpb24gY2xhc3M9XCJjaGFydHNcIj5cblx0XHQ8aDI+8J+TiCBUaW1lIFNlcmllczwvaDI+XG5cdFx0JHtnZW5lcmF0ZUNoYXJ0cyhkYXRhLCBkYXRhLnRlc3RTdGFydFRpbWUsIGRhdGEudGVzdEVuZFRpbWUpfVxuXHQ8L3NlY3Rpb24+XG5cblx0PGZvb3Rlcj5cblx0XHQ8cD5HZW5lcmF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb25cIiB0YXJnZXQ9XCJfYmxhbmtcIj55ZGItc2xvLWFjdGlvbjwvYT48L3A+XG5cdDwvZm9vdGVyPlxuXG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydC5qcy9kaXN0L2NoYXJ0LnVtZC5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy9kaXN0L2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy5idW5kbGUubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uL2Rpc3QvY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbi5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdD5cblx0XHQke2dlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGEsIGRhdGEudGVzdFN0YXJ0VGltZSwgZGF0YS50ZXN0RW5kVGltZSl9XG5cdDwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPmBcbn1cblxuZnVuY3Rpb24gZXNjYXBlSHRtbCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gdGV4dFxuXHRcdC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG5cdFx0LnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuXHRcdC5yZXBsYWNlKC8+L2csICcmZ3Q7Jylcblx0XHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG5cdFx0LnJlcGxhY2UoLycvZywgJyYjMDM5OycpXG59XG5cbi8qKlxuICogR2V0IHJlbGV2YW50IGFnZ3JlZ2F0ZXMgZm9yIG1ldHJpYyBiYXNlZCBvbiBpdHMgdHlwZVxuICovXG5mdW5jdGlvbiBnZXRSZWxldmFudEFnZ3JlZ2F0ZXMobWV0cmljTmFtZTogc3RyaW5nKTogKCdhdmcnIHwgJ3A1MCcgfCAncDkwJyB8ICdwOTUnKVtdIHtcblx0bGV0IGxvd2VyTmFtZSA9IG1ldHJpY05hbWUudG9Mb3dlckNhc2UoKVxuXG5cdC8vIEF2YWlsYWJpbGl0eSBtZXRyaWNzOiBvbmx5IGF2ZyBhbmQgcDUwXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygndXB0aW1lJykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdzdWNjZXNzX3JhdGUnKSkge1xuXHRcdHJldHVybiBbJ2F2ZycsICdwNTAnXVxuXHR9XG5cblx0Ly8gTGF0ZW5jeS9kdXJhdGlvbiBtZXRyaWNzOiBwNTAsIHA5MCwgcDk1IChubyBhdmcpXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpIHx8XG5cdFx0bG93ZXJOYW1lLmVuZHNXaXRoKCdfbXMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZGVsYXknKVxuXHQpIHtcblx0XHRyZXR1cm4gWydwNTAnLCAncDkwJywgJ3A5NSddXG5cdH1cblxuXHQvLyBEZWZhdWx0OiBzaG93IGFsbFxuXHRyZXR1cm4gWydhdmcnLCAncDUwJywgJ3A5MCcsICdwOTUnXVxufVxuXG4vKipcbiAqIEZvcm1hdCBhZ2dyZWdhdGUgbmFtZSBmb3IgZGlzcGxheVxuICovXG5mdW5jdGlvbiBmb3JtYXRBZ2dyZWdhdGVOYW1lKGFnZzogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIGFnZyAvLyBLZWVwIHRlY2huaWNhbCBuYW1lczogcDUwLCBwOTAsIHA5NVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24pOiBzdHJpbmcge1xuXHRsZXQgcm93cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5tYXAoKG0pID0+IHtcblx0XHRcdHJldHVybiBgXG5cdFx0PHRyIGNsYXNzPVwiJHttLmNoYW5nZS5kaXJlY3Rpb259XCI+XG5cdFx0XHQ8dGQ+XG5cdFx0XHRcdDxhIGhyZWY9XCIjbWV0cmljLSR7c2FuaXRpemVJZChtLm5hbWUpfVwiIGNsYXNzPVwibWV0cmljLWxpbmtcIj5cblx0XHRcdFx0XHQke2VzY2FwZUh0bWwobS5uYW1lKX1cblx0XHRcdFx0PC9hPlxuXHRcdFx0PC90ZD5cblx0XHRcdDx0ZD4ke2Zvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKX08L3RkPlxuXHRcdFx0PHRkPiR7bS5iYXNlbGluZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2VsaW5lLnZhbHVlLCBtLm5hbWUpIDogJ04vQSd9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cImNoYW5nZS1jZWxsXCI+JHttLmJhc2VsaW5lLmF2YWlsYWJsZSA/IGZvcm1hdENoYW5nZShtLmNoYW5nZS5wZXJjZW50LCBtLmNoYW5nZS5kaXJlY3Rpb24pIDogJ04vQSd9PC90ZD5cblx0XHQ8L3RyPlxuXHRgXG5cdFx0fSlcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHRcdDx0YWJsZSBjbGFzcz1cImNvbXBhcmlzb24tdGFibGVcIj5cblx0XHRcdDx0aGVhZD5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5NZXRyaWM8L3RoPlxuXHRcdFx0XHRcdDx0aD5DdXJyZW50PC90aD5cblx0XHRcdFx0XHQ8dGg+QmFzZWxpbmU8L3RoPlxuXHRcdFx0XHRcdDx0aD5DaGFuZ2U8L3RoPlxuXHRcdFx0XHQ8L3RyPlxuXHRcdFx0PC90aGVhZD5cblx0XHRcdDx0Ym9keT5cblx0XHRcdFx0JHtyb3dzfVxuXHRcdFx0PC90Ym9keT5cblx0XHQ8L3RhYmxlPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRzKGRhdGE6IEhUTUxSZXBvcnREYXRhLCBnbG9iYWxTdGFydFRpbWU6IG51bWJlciwgZ2xvYmFsRW5kVGltZTogbnVtYmVyKTogc3RyaW5nIHtcblx0cmV0dXJuIGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKSAvLyBPbmx5IHJhbmdlIG1ldHJpY3MgaGF2ZSBjaGFydHNcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmZpbmQoKG0pID0+IG0ubmFtZSA9PT0gY29tcGFyaXNvbi5uYW1lKVxuXHRcdFx0aWYgKCFtZXRyaWMpIHJldHVybiAnJ1xuXG5cdFx0XHQvLyBTa2lwIG1ldHJpY3Mgd2l0aCBubyBkYXRhIChlbXB0eSBkYXRhIGFycmF5IG9yIG5vIHNlcmllcylcblx0XHRcdGlmICghbWV0cmljLmRhdGEgfHwgbWV0cmljLmRhdGEubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBTa2lwIGlmIGFsbCBzZXJpZXMgYXJlIGVtcHR5XG5cdFx0XHRsZXQgaGFzRGF0YSA9IChtZXRyaWMuZGF0YSBhcyBSYW5nZVNlcmllc1tdKS5zb21lKChzKSA9PiBzLnZhbHVlcyAmJiBzLnZhbHVlcy5sZW5ndGggPiAwKVxuXHRcdFx0aWYgKCFoYXNEYXRhKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBGaWx0ZXIgZXZlbnRzIHRoYXQgYXJlIHJlbGV2YW50IHRvIHRoaXMgbWV0cmljJ3MgdGltZWZyYW1lXG5cdFx0XHRsZXQgcmVsZXZhbnRFdmVudHMgPSBkYXRhLmV2ZW50cy5maWx0ZXIoXG5cdFx0XHRcdChlKSA9PiBlLnRpbWVzdGFtcCA+PSBnbG9iYWxTdGFydFRpbWUgJiYgZS50aW1lc3RhbXAgPD0gZ2xvYmFsRW5kVGltZVxuXHRcdFx0KVxuXG5cdFx0XHRsZXQgZXZlbnRzVGltZWxpbmUgPSByZWxldmFudEV2ZW50cy5sZW5ndGggPiAwID8gZ2VuZXJhdGVDaGFydEV2ZW50c1RpbWVsaW5lKHJlbGV2YW50RXZlbnRzKSA6ICcnXG5cblx0XHRcdC8vIEdlbmVyYXRlIGFnZ3JlZ2F0ZXMgc3VtbWFyeSBmb3IgY2hhcnQgaGVhZGVyXG5cdFx0XHRsZXQgbWV0YVN1bW1hcnkgPSAnJ1xuXHRcdFx0aWYgKGNvbXBhcmlzb24uY3VycmVudC5hZ2dyZWdhdGVzICYmIGNvbXBhcmlzb24uYmFzZWxpbmUuYWdncmVnYXRlcykge1xuXHRcdFx0XHRsZXQgY3VycmVudEFnZyA9IGNvbXBhcmlzb24uY3VycmVudC5hZ2dyZWdhdGVzXG5cdFx0XHRcdGxldCBiYXNlQWdnID0gY29tcGFyaXNvbi5iYXNlbGluZS5hZ2dyZWdhdGVzXG5cblx0XHRcdFx0Ly8gR2V0IHJlbGV2YW50IGFnZ3JlZ2F0ZXMgZm9yIHRoaXMgbWV0cmljXG5cdFx0XHRcdGxldCByZWxldmFudEFnZ3MgPSBnZXRSZWxldmFudEFnZ3JlZ2F0ZXMoY29tcGFyaXNvbi5uYW1lKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIHRhYmxlIGhlYWRlclxuXHRcdFx0XHRsZXQgaGVhZGVyQ2VsbHMgPSByZWxldmFudEFnZ3MubWFwKChhZ2cpID0+IGA8dGg+JHtmb3JtYXRBZ2dyZWdhdGVOYW1lKGFnZyl9PC90aD5gKS5qb2luKCcnKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIGN1cnJlbnQgcm93XG5cdFx0XHRcdGxldCBjdXJyZW50Q2VsbHMgPSByZWxldmFudEFnZ3Ncblx0XHRcdFx0XHQubWFwKChhZ2cpID0+IGA8dGQ+JHtmb3JtYXRWYWx1ZShjdXJyZW50QWdnW2FnZ10sIGNvbXBhcmlzb24ubmFtZSl9PC90ZD5gKVxuXHRcdFx0XHRcdC5qb2luKCcnKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIGJhc2VsaW5lIHJvd1xuXHRcdFx0XHRsZXQgYmFzZUNlbGxzID0gcmVsZXZhbnRBZ2dzXG5cdFx0XHRcdFx0Lm1hcCgoYWdnKSA9PiBgPHRkPiR7Zm9ybWF0VmFsdWUoYmFzZUFnZ1thZ2ddLCBjb21wYXJpc29uLm5hbWUpfTwvdGQ+YClcblx0XHRcdFx0XHQuam9pbignJylcblxuXHRcdFx0XHRtZXRhU3VtbWFyeSA9IGBcblx0XHRcdFx0XHQ8dGFibGUgY2xhc3M9XCJhZ2dyZWdhdGVzLXRhYmxlXCI+XG5cdFx0XHRcdFx0XHQ8dGhlYWQ+XG5cdFx0XHRcdFx0XHRcdDx0cj5cblx0XHRcdFx0XHRcdFx0XHQ8dGg+PC90aD5cblx0XHRcdFx0XHRcdFx0XHQke2hlYWRlckNlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0PC90aGVhZD5cblx0XHRcdFx0XHRcdDx0Ym9keT5cblx0XHRcdFx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJvdy1sYWJlbFwiPkN1cnJlbnQ8L3RkPlxuXHRcdFx0XHRcdFx0XHRcdCR7Y3VycmVudENlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicm93LWxhYmVsXCI+QmFzZWxpbmU8L3RkPlxuXHRcdFx0XHRcdFx0XHRcdCR7YmFzZUNlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0PC90Ym9keT5cblx0XHRcdFx0XHQ8L3RhYmxlPlxuXHRcdFx0XHRgXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtZXRhU3VtbWFyeSA9IGBcblx0XHRcdFx0XHRDdXJyZW50OiAke2Zvcm1hdFZhbHVlKGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSwgY29tcGFyaXNvbi5uYW1lKX1cblx0XHRcdFx0XHQke2NvbXBhcmlzb24uYmFzZWxpbmUuYXZhaWxhYmxlID8gYCDigKIgQmFzZWxpbmU6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5iYXNlbGluZS52YWx1ZSwgY29tcGFyaXNvbi5uYW1lKX1gIDogJyd9XG5cdFx0XHRcdGBcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtY2FyZFwiIGlkPVwibWV0cmljLSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWhlYWRlclwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtdGl0bGUtc2VjdGlvblwiPlxuXHRcdFx0XHRcdDxoMz5cblx0XHRcdFx0XHRcdCR7ZXNjYXBlSHRtbChjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJpbmRpY2F0b3IgJHtjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb259XCI+JHtmb3JtYXRDaGFuZ2UoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCwgY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uKX08L3NwYW4+XG5cdFx0XHRcdFx0PC9oMz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1tZXRhXCI+XG5cdFx0XHRcdFx0JHttZXRhU3VtbWFyeX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1jb250YWluZXJcIj5cblx0XHRcdFx0PGNhbnZhcyBpZD1cImNoYXJ0LSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPjwvY2FudmFzPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQke2V2ZW50c1RpbWVsaW5lfVxuXHRcdDwvZGl2PlxuXHRgXG5cdFx0fSlcblx0XHQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydEV2ZW50c1RpbWVsaW5lKGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSk6IHN0cmluZyB7XG5cdGlmIChldmVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gJydcblxuXHRsZXQgZXZlbnRJdGVtcyA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSwgaWR4KSA9PiBgXG5cdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLWV2ZW50XCIgZGF0YS1ldmVudC1pZD1cIiR7aWR4fVwiIHRpdGxlPVwiJHtlc2NhcGVIdG1sKGUubGFiZWwpfVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1pY29uXCI+JHtlLmljb259PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC10aW1lXCI+JHtmb3JtYXRUaW1lc3RhbXAoZS50aW1lc3RhbXApfTwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtbGFiZWxcIj4ke2VzY2FwZUh0bWwoZS5sYWJlbCl9PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRgXG5cdFx0KVxuXHRcdC5qb2luKCcnKVxuXG5cdHJldHVybiBgXG5cdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWV2ZW50cy10aW1lbGluZVwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLXRpdGxlXCI+RXZlbnRzOjwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLWV2ZW50c1wiPlxuXHRcdFx0XHQke2V2ZW50SXRlbXN9XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0YFxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNoYXJ0U2NyaXB0cyhkYXRhOiBIVE1MUmVwb3J0RGF0YSwgZ2xvYmFsU3RhcnRUaW1lOiBudW1iZXIsIGdsb2JhbEVuZFRpbWU6IG51bWJlcik6IHN0cmluZyB7XG5cdGxldCBjaGFydFNjcmlwdHMgPSBkYXRhLmNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5maWx0ZXIoKG0pID0+IG0udHlwZSA9PT0gJ3JhbmdlJylcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmZpbmQoKG0pID0+IG0ubmFtZSA9PT0gY29tcGFyaXNvbi5uYW1lKVxuXHRcdFx0aWYgKCFtZXRyaWMpIHJldHVybiAnJ1xuXG5cdFx0XHQvLyBTa2lwIG1ldHJpY3Mgd2l0aCBubyBkYXRhXG5cdFx0XHRpZiAoIW1ldHJpYy5kYXRhIHx8IG1ldHJpYy5kYXRhLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdH1cblx0XHRcdGxldCBoYXNEYXRhID0gKG1ldHJpYy5kYXRhIGFzIFJhbmdlU2VyaWVzW10pLnNvbWUoKHMpID0+IHMudmFsdWVzICYmIHMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRpZiAoIWhhc0RhdGEpIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBnZW5lcmF0ZVNpbmdsZUNoYXJ0U2NyaXB0KFxuXHRcdFx0XHRjb21wYXJpc29uLm5hbWUsXG5cdFx0XHRcdG1ldHJpYyBhcyBDb2xsZWN0ZWRNZXRyaWMsXG5cdFx0XHRcdGRhdGEuZXZlbnRzLFxuXHRcdFx0XHRnbG9iYWxTdGFydFRpbWUsXG5cdFx0XHRcdGdsb2JhbEVuZFRpbWUsXG5cdFx0XHRcdGRhdGEuY3VycmVudFJlZixcblx0XHRcdFx0ZGF0YS5iYXNlbGluZVJlZlxuXHRcdFx0KVxuXHRcdH0pXG5cdFx0LmpvaW4oJ1xcbicpXG5cblx0cmV0dXJuIGNoYXJ0U2NyaXB0c1xufVxuXG4vKipcbiAqIEZpbHRlciBvdXRsaWVycyBmcm9tIHRpbWUgc2VyaWVzIGRhdGEgdXNpbmcgcGVyY2VudGlsZXNcbiAqIFJlbW92ZXMgdmFsdWVzIG91dHNpZGUgW3AxLCBwOTldIHJhbmdlXG4gKi9cbmZ1bmN0aW9uIGZpbHRlck91dGxpZXJzKHZhbHVlczogW251bWJlciwgc3RyaW5nXVtdKTogW251bWJlciwgc3RyaW5nXVtdIHtcblx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZXNcblxuXHQvLyBFeHRyYWN0IG51bWVyaWMgdmFsdWVzXG5cdGxldCBudW1zID0gdmFsdWVzLm1hcCgoWywgdl0pID0+IHBhcnNlRmxvYXQodikpLmZpbHRlcigobikgPT4gIWlzTmFOKG4pKVxuXHRpZiAobnVtcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZXNcblxuXHQvLyBTb3J0IGZvciBwZXJjZW50aWxlIGNhbGN1bGF0aW9uXG5cdG51bXMuc29ydCgoYSwgYikgPT4gYSAtIGIpXG5cblx0Ly8gQ2FsY3VsYXRlIHAxIGFuZCBwOTlcblx0bGV0IHAxSW5kZXggPSBNYXRoLmZsb29yKG51bXMubGVuZ3RoICogMC4wMSlcblx0bGV0IHA5OUluZGV4ID0gTWF0aC5mbG9vcihudW1zLmxlbmd0aCAqIDAuOTkpXG5cdGxldCBwMSA9IG51bXNbcDFJbmRleF1cblx0bGV0IHA5OSA9IG51bXNbcDk5SW5kZXhdXG5cblx0Ly8gRmlsdGVyIHZhbHVlcyB3aXRoaW4gW3AxLCBwOTldXG5cdHJldHVybiB2YWx1ZXMuZmlsdGVyKChbLCB2XSkgPT4ge1xuXHRcdGxldCBudW0gPSBwYXJzZUZsb2F0KHYpXG5cdFx0cmV0dXJuICFpc05hTihudW0pICYmIG51bSA+PSBwMSAmJiBudW0gPD0gcDk5XG5cdH0pXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoXG5cdG1ldHJpY05hbWU6IHN0cmluZyxcblx0bWV0cmljOiBDb2xsZWN0ZWRNZXRyaWMsXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSxcblx0Z2xvYmFsU3RhcnRUaW1lOiBudW1iZXIsXG5cdGdsb2JhbEVuZFRpbWU6IG51bWJlcixcblx0Y3VycmVudFJlZjogc3RyaW5nLFxuXHRiYXNlbGluZVJlZjogc3RyaW5nXG4pOiBzdHJpbmcge1xuXHRsZXQgY3VycmVudFNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBSYW5nZVNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpXG5cdGxldCBiYXNlbGluZVNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBSYW5nZVNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGJhc2VsaW5lUmVmKVxuXG5cdC8vIEZpbHRlciBvdXRsaWVycyBmcm9tIGJvdGggc2VyaWVzXG5cdGxldCBmaWx0ZXJlZEN1cnJlbnRWYWx1ZXMgPSBjdXJyZW50U2VyaWVzID8gZmlsdGVyT3V0bGllcnMoY3VycmVudFNlcmllcy52YWx1ZXMpIDogW11cblx0bGV0IGZpbHRlcmVkQmFzZWxpbmVWYWx1ZXMgPSBiYXNlbGluZVNlcmllcyA/IGZpbHRlck91dGxpZXJzKGJhc2VsaW5lU2VyaWVzLnZhbHVlcykgOiBbXVxuXG5cdGxldCBjdXJyZW50RGF0YSA9XG5cdFx0ZmlsdGVyZWRDdXJyZW50VmFsdWVzLmxlbmd0aCA+IDBcblx0XHRcdD8gSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWRDdXJyZW50VmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0XHQ6ICdbXSdcblxuXHRsZXQgYmFzZWxpbmVEYXRhID1cblx0XHRmaWx0ZXJlZEJhc2VsaW5lVmFsdWVzLmxlbmd0aCA+IDBcblx0XHRcdD8gSlNPTi5zdHJpbmdpZnkoZmlsdGVyZWRCYXNlbGluZVZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdFx0OiAnW10nXG5cblx0Ly8gR2VuZXJhdGUgYW5ub3RhdGlvbnMgZm9yIHRlc3QgYm91bmRhcmllc1xuXHRsZXQgYm91bmRhcnlBbm5vdGF0aW9uczogc3RyaW5nW10gPSBbXG5cdFx0YHtcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdHhNaW46ICR7Z2xvYmFsU3RhcnRUaW1lfSxcblx0XHRcdHhNYXg6ICR7Z2xvYmFsU3RhcnRUaW1lfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnIzEwYjk4MScsXG5cdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdGJvcmRlckRhc2g6IFs1LCA1XVxuXHRcdH1gLFxuXHRcdGB7XG5cdFx0XHR0eXBlOiAnbGluZScsXG5cdFx0XHR4TWluOiAke2dsb2JhbEVuZFRpbWV9LFxuXHRcdFx0eE1heDogJHtnbG9iYWxFbmRUaW1lfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnI2VmNDQ0NCcsXG5cdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdGJvcmRlckRhc2g6IFs1LCA1XVxuXHRcdH1gLFxuXHRdXG5cblx0Ly8gU2VwYXJhdGUgZXZlbnRzIGludG8gYm94ZXMgKHdpdGggZHVyYXRpb24pIGFuZCBsaW5lcyAoaW5zdGFudClcblx0bGV0IGJveEFubm90YXRpb25zOiBzdHJpbmdbXSA9IFtdXG5cdGxldCBsaW5lQW5ub3RhdGlvbnM6IHN0cmluZ1tdID0gW11cblxuXHRmb3IgKGxldCBpID0gMDsgaSA8IGV2ZW50cy5sZW5ndGg7IGkrKykge1xuXHRcdGxldCBlID0gZXZlbnRzW2ldXG5cdFx0aWYgKGUuZHVyYXRpb25fbXMpIHtcblx0XHRcdC8vIEJveCBhbm5vdGF0aW9uIGZvciBldmVudHMgd2l0aCBkdXJhdGlvbiAodGltZXN0YW1wIGFscmVhZHkgaW4gbXMpXG5cdFx0XHRsZXQgeE1heCA9IGUudGltZXN0YW1wICsgZS5kdXJhdGlvbl9tc1xuXHRcdFx0Ly8gQWRkIHNlbWktdHJhbnNwYXJlbnQgYm94IChiZWhpbmQgZ3JhcGgpXG5cdFx0XHRib3hBbm5vdGF0aW9ucy5wdXNoKGB7XG5cdFx0XHRpZDogJ2V2ZW50LWJnLSR7aX0nLFxuXHRcdFx0dHlwZTogJ2JveCcsXG5cdFx0XHRkcmF3VGltZTogJ2JlZm9yZURhdGFzZXRzRHJhdycsXG5cdFx0XHR4TWluOiAke2UudGltZXN0YW1wfSxcblx0XHRcdHhNYXg6ICR7eE1heH0sXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICdyZ2JhKDI1MSwgMTQ2LCA2MCwgMC4wOCknLFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICd0cmFuc3BhcmVudCcsXG5cdFx0XHRib3JkZXJXaWR0aDogMFxuXHRcdH1gKVxuXHRcdFx0Ly8gQWRkIHRoaWNrIGhvcml6b250YWwgbGluZSBhdCBib3R0b20gKGJlaGluZCBncmFwaClcblx0XHRcdGJveEFubm90YXRpb25zLnB1c2goYHtcblx0XHRcdGlkOiAnZXZlbnQtYmFyLSR7aX0nLFxuXHRcdFx0dHlwZTogJ2JveCcsXG5cdFx0XHRkcmF3VGltZTogJ2JlZm9yZURhdGFzZXRzRHJhdycsXG5cdFx0XHR4TWluOiAke2UudGltZXN0YW1wfSxcblx0XHRcdHhNYXg6ICR7eE1heH0sXG5cdFx0XHR5TWluOiAoY3R4KSA9PiBjdHguY2hhcnQuc2NhbGVzLnkubWluLFxuXHRcdFx0eU1heDogKGN0eCkgPT4gY3R4LmNoYXJ0LnNjYWxlcy55Lm1pbiArIChjdHguY2hhcnQuc2NhbGVzLnkubWF4IC0gY3R4LmNoYXJ0LnNjYWxlcy55Lm1pbikgKiAwLjAyLFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAnI2Y5NzMxNicsXG5cdFx0XHRib3JkZXJDb2xvcjogJ3RyYW5zcGFyZW50Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAwXG5cdFx0fWApXG5cdFx0fSBlbHNlIHtcblx0XHRcdC8vIExpbmUgYW5ub3RhdGlvbiBmb3IgaW5zdGFudCBldmVudHMgKHRpbWVzdGFtcCBhbHJlYWR5IGluIG1zKVxuXHRcdFx0bGluZUFubm90YXRpb25zLnB1c2goYHtcblx0XHRcdGlkOiAnZXZlbnQtbGluZS0ke2l9Jyxcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdGRyYXdUaW1lOiAnYWZ0ZXJEYXRhc2V0c0RyYXcnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcH0sXG5cdFx0XHR4TWF4OiAke2UudGltZXN0YW1wfSxcblx0XHRcdGJvcmRlckNvbG9yOiAnI2Y5NzMxNicsXG5cdFx0XHRib3JkZXJXaWR0aDogMlxuXHRcdH1gKVxuXHRcdH1cblx0fVxuXG5cdC8vIENvbWJpbmUgYWxsIGFubm90YXRpb25zOiBib3hlcyBmaXJzdCAoYmVoaW5kKSwgdGhlbiBib3VuZGFyaWVzLCB0aGVuIGxpbmVzIChmcm9udClcblx0bGV0IGFsbEFubm90YXRpb25zID0gWy4uLmJveEFubm90YXRpb25zLCAuLi5ib3VuZGFyeUFubm90YXRpb25zLCAuLi5saW5lQW5ub3RhdGlvbnNdLmpvaW4oJyxcXG4nKVxuXG5cdHJldHVybiBgXG4oZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGN0eCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFydC0ke3Nhbml0aXplSWQobWV0cmljTmFtZSl9Jyk7XG5cdGlmICghY3R4KSByZXR1cm47XG5cblx0Y29uc3QgY2hhcnQgPSBuZXcgQ2hhcnQoY3R4LCB7XG5cdFx0dHlwZTogJ2xpbmUnLFxuXHRcdGRhdGE6IHtcblx0XHRkYXRhc2V0czogW1xuXHRcdFx0e1xuXHRcdFx0XHRsYWJlbDogJyR7ZXNjYXBlSHRtbChjdXJyZW50UmVmKX0nLFxuXHRcdFx0XHRkYXRhOiAke2N1cnJlbnREYXRhfSxcblx0XHRcdFx0Ym9yZGVyQ29sb3I6ICcjM2I4MmY2Jyxcblx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzNiODJmNjIwJyxcblx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRwb2ludEhvdmVyUmFkaXVzOiA0LFxuXHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdH0sXG5cdFx0XHQke1xuXHRcdFx0XHRiYXNlbGluZVNlcmllc1xuXHRcdFx0XHRcdD8gYHtcblx0XHRcdFx0bGFiZWw6ICcke2VzY2FwZUh0bWwoYmFzZWxpbmVSZWYpfScsXG5cdFx0XHRcdGRhdGE6ICR7YmFzZWxpbmVEYXRhfSxcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogJyM5NGEzYjgnLFxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyM5NGEzYjgyMCcsXG5cdFx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdLFxuXHRcdFx0XHRcdHBvaW50UmFkaXVzOiAyLFxuXHRcdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRcdGZpbGw6IHRydWVcblx0XHRcdFx0fWBcblx0XHRcdFx0XHQ6ICcnXG5cdFx0XHR9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRyZXNwb25zaXZlOiB0cnVlLFxuXHRcdFx0bWFpbnRhaW5Bc3BlY3RSYXRpbzogZmFsc2UsXG5cdFx0XHRpbnRlcmFjdGlvbjoge1xuXHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRpbnRlcnNlY3Q6IGZhbHNlXG5cdFx0XHR9LFxuXHRcdHNjYWxlczoge1xuXHRcdFx0eDoge1xuXHRcdFx0XHR0eXBlOiAndGltZScsXG5cdFx0XHRcdG1pbjogJHtnbG9iYWxTdGFydFRpbWV9LFxuXHRcdFx0XHRtYXg6ICR7Z2xvYmFsRW5kVGltZX0sXG5cdFx0XHRcdHRpbWU6IHtcblx0XHRcdFx0XHR1bml0OiAnbWludXRlJyxcblx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0czoge1xuXHRcdFx0XHRcdFx0bWludXRlOiAnSEg6bW0nXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0dGV4dDogJ1RpbWUnXG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRcdHk6IHtcblx0XHRcdFx0XHRiZWdpbkF0WmVybzogZmFsc2UsXG5cdFx0XHRcdFx0Z3JhY2U6ICcxMCUnLFxuXHRcdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdFx0dGV4dDogJyR7ZXNjYXBlSnMobWV0cmljTmFtZSl9J1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBsdWdpbnM6IHtcblx0XHRcdFx0bGVnZW5kOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRwb3NpdGlvbjogJ3RvcCdcblx0XHRcdFx0fSxcblx0XHRcdFx0dG9vbHRpcDoge1xuXHRcdFx0XHRcdG1vZGU6ICdpbmRleCcsXG5cdFx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbm5vdGF0aW9uOiB7XG5cdFx0XHRcdFx0YW5ub3RhdGlvbnM6IFske2FsbEFubm90YXRpb25zfV1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG5cblx0Ly8gU3RvcmUgY2hhcnQgcmVmZXJlbmNlIGZvciBpbnRlcmFjdGlvblxuXHRjdHguY2hhcnRJbnN0YW5jZSA9IGNoYXJ0O1xuXG5cdC8vIEFkZCBob3ZlciBoYW5kbGVycyBmb3IgdGltZWxpbmUgZXZlbnRzXG5cdGNvbnN0IGNoYXJ0Q2FyZCA9IGN0eC5jbG9zZXN0KCcuY2hhcnQtY2FyZCcpO1xuXHRpZiAoY2hhcnRDYXJkKSB7XG5cdFx0Y29uc3QgdGltZWxpbmVFdmVudHMgPSBjaGFydENhcmQucXVlcnlTZWxlY3RvckFsbCgnLnRpbWVsaW5lLWV2ZW50Jyk7XG5cdFx0dGltZWxpbmVFdmVudHMuZm9yRWFjaCgoZXZlbnRFbCkgPT4ge1xuXHRcdFx0Y29uc3QgZXZlbnRJZCA9IHBhcnNlSW50KGV2ZW50RWwuZ2V0QXR0cmlidXRlKCdkYXRhLWV2ZW50LWlkJykpO1xuXG5cdFx0XHRldmVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlZW50ZXInLCAoKSA9PiB7XG5cdFx0XHRcdC8vIEFjY2VzcyBhbm5vdGF0aW9ucyBhcnJheVxuXHRcdFx0XHRjb25zdCBhbm5vdGF0aW9ucyA9IGNoYXJ0LmNvbmZpZy5vcHRpb25zLnBsdWdpbnMuYW5ub3RhdGlvbi5hbm5vdGF0aW9ucztcblxuXHRcdFx0XHQvLyBGaW5kIGFuZCB1cGRhdGUgYW5ub3RhdGlvbnMgZm9yIHRoaXMgZXZlbnRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbm5vdGF0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IGFubiA9IGFubm90YXRpb25zW2ldO1xuXHRcdFx0XHRcdGlmIChhbm4uaWQgPT09ICdldmVudC1iZy0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1MSwgMTQ2LCA2MCwgMC4zNSknO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtYmFyLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJyNmYjkyM2MnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtbGluZS0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlckNvbG9yID0gJyNmYjkyM2MnO1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlcldpZHRoID0gNDtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjaGFydC51cGRhdGUoJ25vbmUnKTtcblx0XHRcdH0pO1xuXG5cdFx0XHRldmVudEVsLmFkZEV2ZW50TGlzdGVuZXIoJ21vdXNlbGVhdmUnLCAoKSA9PiB7XG5cdFx0XHRcdC8vIEFjY2VzcyBhbm5vdGF0aW9ucyBhcnJheVxuXHRcdFx0XHRjb25zdCBhbm5vdGF0aW9ucyA9IGNoYXJ0LmNvbmZpZy5vcHRpb25zLnBsdWdpbnMuYW5ub3RhdGlvbi5hbm5vdGF0aW9ucztcblxuXHRcdFx0XHQvLyBSZXN0b3JlIGFubm90YXRpb25zIGZvciB0aGlzIGV2ZW50XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRjb25zdCBhbm4gPSBhbm5vdGF0aW9uc1tpXTtcblx0XHRcdFx0XHRpZiAoYW5uLmlkID09PSAnZXZlbnQtYmctJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTEsIDE0NiwgNjAsIDAuMDgpJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubi5pZCA9PT0gJ2V2ZW50LWJhci0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICcjZjk3MzE2Jztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubi5pZCA9PT0gJ2V2ZW50LWxpbmUtJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5ib3JkZXJDb2xvciA9ICcjZjk3MzE2Jztcblx0XHRcdFx0XHRcdGFubi5ib3JkZXJXaWR0aCA9IDI7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2hhcnQudXBkYXRlKCdub25lJyk7XG5cdFx0XHR9KTtcblx0XHR9KTtcblx0fVxufSkoKTtcbmBcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVJZChzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvW15hLXpBLVowLTldL2csICctJylcbn1cblxuZnVuY3Rpb24gZXNjYXBlSnMoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1xcXFwvZywgJ1xcXFxcXFxcJykucmVwbGFjZSgvJy9nLCBcIlxcXFwnXCIpLnJlcGxhY2UoL1wiL2csICdcXFxcXCInKS5yZXBsYWNlKC9cXG4vZywgJ1xcXFxuJylcbn1cblxuZnVuY3Rpb24gZm9ybWF0VGltZXN0YW1wKHRpbWVzdGFtcDogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IGRhdGUgPSBuZXcgRGF0ZSh0aW1lc3RhbXApIC8vIHRpbWVzdGFtcCBhbHJlYWR5IGluIG1pbGxpc2Vjb25kc1xuXHQvLyBGb3JtYXQgYXMgbG9jYWwgdGltZSBISDpNTTpTU1xuXHRsZXQgaG91cnMgPSBkYXRlLmdldEhvdXJzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cdGxldCBtaW51dGVzID0gZGF0ZS5nZXRNaW51dGVzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cdGxldCBzZWNvbmRzID0gZGF0ZS5nZXRTZWNvbmRzKCkudG9TdHJpbmcoKS5wYWRTdGFydCgyLCAnMCcpXG5cdHJldHVybiBgJHtob3Vyc306JHttaW51dGVzfToke3NlY29uZHN9YFxufVxuXG5mdW5jdGlvbiBnZXRTdHlsZXMoKTogc3RyaW5nIHtcblx0cmV0dXJuIGBcbioge1xuXHRtYXJnaW46IDA7XG5cdHBhZGRpbmc6IDA7XG5cdGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG59XG5cbmh0bWwge1xuXHRzY3JvbGwtYmVoYXZpb3I6IHNtb290aDtcbn1cblxuYm9keSB7XG5cdGZvbnQtZmFtaWx5OiAtYXBwbGUtc3lzdGVtLCBCbGlua01hY1N5c3RlbUZvbnQsICdTZWdvZSBVSScsIFJvYm90bywgJ0hlbHZldGljYSBOZXVlJywgQXJpYWwsIHNhbnMtc2VyaWY7XG5cdGxpbmUtaGVpZ2h0OiAxLjY7XG5cdGNvbG9yOiAjMjQyOTJmO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRwYWRkaW5nOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGJvZHkge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Y29sb3I6ICNjOWQxZDk7XG5cdH1cbn1cblxuaGVhZGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogMCBhdXRvIDQwcHg7XG5cdHBhZGRpbmc6IDMwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRoZWFkZXIge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmhlYWRlciBoMSB7XG5cdGZvbnQtc2l6ZTogMzJweDtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNvbW1pdC1pbmZvIHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxMHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuLmNvbW1pdCB7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC1mYW1pbHk6ICdDb3VyaWVyIE5ldycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG4uY29tbWl0LmN1cnJlbnQge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmNvbW1pdC5iYXNlbGluZSB7XG5cdGJhY2tncm91bmQ6ICNkZGY0ZmY7XG5cdGNvbG9yOiAjMDk2OWRhO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21taXQuY3VycmVudCB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjtcblx0XHRjb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuY29tbWl0LmJhc2VsaW5lIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGMyZDZiO1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbi5jb21taXQgYSB7XG5cdGNvbG9yOiBpbmhlcml0O1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5jb21taXQgYTpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG4udnMge1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLm1ldGEge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuc2VjdGlvbiB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDAgYXV0byA0MHB4O1xufVxuXG5zZWN0aW9uIGgyIHtcblx0Zm9udC1zaXplOiAyNHB4O1xuXHRtYXJnaW4tYm90dG9tOiAyMHB4O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcblx0cGFkZGluZy1ib3R0b206IDEwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0c2VjdGlvbiBoMiB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5zdGF0cyB7XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZml0LCBtaW5tYXgoMjAwcHgsIDFmcikpO1xuXHRnYXA6IDE1cHg7XG5cdG1hcmdpbi1ib3R0b206IDMwcHg7XG59XG5cbi5zdGF0LWNhcmQge1xuXHRwYWRkaW5nOiAyMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdGJvcmRlcjogMnB4IHNvbGlkICNkMGQ3ZGU7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcbn1cblxuLnN0YXQtY2FyZC5pbXByb3ZlbWVudHMge1xuXHRib3JkZXItY29sb3I6ICMxYTdmMzc7XG59XG5cbi5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRib3JkZXItY29sb3I6ICNjZjIyMmU7XG59XG5cbi5zdGF0LWNhcmQuc3RhYmxlIHtcblx0Ym9yZGVyLWNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5zdGF0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG5cdC5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0XHRib3JkZXItY29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LnN0YXQtY2FyZC5yZWdyZXNzaW9ucyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjZjg1MTQ5O1xuXHR9XG5cdC5zdGF0LWNhcmQuc3RhYmxlIHtcblx0XHRib3JkZXItY29sb3I6ICM4Yjk0OWU7XG5cdH1cbn1cblxuLnN0YXQtdmFsdWUge1xuXHRmb250LXNpemU6IDM2cHg7XG5cdGZvbnQtd2VpZ2h0OiA3MDA7XG5cdG1hcmdpbi1ib3R0b206IDVweDtcbn1cblxuLnN0YXQtbGFiZWwge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXdlaWdodDogNTAwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB7XG5cdHdpZHRoOiAxMDAlO1xuXHRib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdG92ZXJmbG93OiBoaWRkZW47XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoLFxuLmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRwYWRkaW5nOiAxMnB4IDE2cHg7XG5cdHRleHQtYWxpZ246IGxlZnQ7XG5cdGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoLFxuXHQuY29tcGFyaXNvbi10YWJsZSB0ZCB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyOmxhc3QtY2hpbGQgdGQge1xuXHRib3JkZXItYm90dG9tOiBub25lO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkMjA7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTIwO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjIwO1xuXHR9XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkMjA7XG5cdH1cbn1cblxuLmNoYW5nZS1jZWxsIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLm1ldHJpYy1saW5rIHtcblx0Y29sb3I6ICMwOTY5ZGE7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbn1cblxuLm1ldHJpYy1saW5rOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Lm1ldHJpYy1saW5rIHtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG4uY2hhcnQtY2FyZCB7XG5cdG1hcmdpbi1ib3R0b206IDQwcHg7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdGJvcmRlcjogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0cGFkZGluZzogMjBweDtcblx0c2Nyb2xsLW1hcmdpbi10b3A6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNoYXJ0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jaGFydC1oZWFkZXIge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRqdXN0aWZ5LWNvbnRlbnQ6IHNwYWNlLWJldHdlZW47XG5cdGFsaWduLWl0ZW1zOiBmbGV4LXN0YXJ0O1xuXHRnYXA6IDI0cHg7XG5cdG1hcmdpbi1ib3R0b206IDE1cHg7XG59XG5cbi5jaGFydC10aXRsZS1zZWN0aW9uIGgzIHtcblx0Zm9udC1zaXplOiAxOHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcblx0bWFyZ2luOiAwO1xufVxuXG4uaW5kaWNhdG9yIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRwYWRkaW5nOiA0cHggOHB4O1xuXHRib3JkZXItcmFkaXVzOiA0cHg7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5pbmRpY2F0b3IuYmV0dGVyIHtcblx0YmFja2dyb3VuZDogI2RmZjZkZDtcblx0Y29sb3I6ICMxYTdmMzc7XG59XG5cbi5pbmRpY2F0b3Iud29yc2Uge1xuXHRiYWNrZ3JvdW5kOiAjZmZlYmU5O1xuXHRjb2xvcjogI2NmMjIyZTtcbn1cblxuLmluZGljYXRvci5uZXV0cmFsIHtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Y29sb3I6ICM2ZTc3ODE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmluZGljYXRvci5iZXR0ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTY7XG5cdFx0Y29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LmluZGljYXRvci53b3JzZSB7XG5cdFx0YmFja2dyb3VuZDogIzg2MTgxZDtcblx0XHRjb2xvcjogI2ZmN2I3Mjtcblx0fVxuXHQuaW5kaWNhdG9yLm5ldXRyYWwge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Y29sb3I6ICM4Yjk0OWU7XG5cdH1cbn1cblxuLmNoYXJ0LW1ldGEge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmbGV4LXNocmluazogMDtcbn1cblxuLmFnZ3JlZ2F0ZXMtdGFibGUge1xuXHR3aWR0aDogYXV0bztcblx0Ym9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTtcblx0Zm9udC1zaXplOiAxM3B4O1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSB0aCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdHBhZGRpbmc6IDRweCAxMnB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGNvbG9yOiAjNjU2ZDc2O1xuXHRmb250LWZhbWlseTogJ1NGIE1vbm8nLCAnTW9uYWNvJywgJ0luY29uc29sYXRhJywgJ1JvYm90byBNb25vJywgJ0NvbnNvbGFzJywgbW9ub3NwYWNlO1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSB0ZCB7XG5cdHBhZGRpbmc6IDRweCAxMnB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGZvbnQtZmFtaWx5OiAnU0YgTW9ubycsICdNb25hY28nLCAnSW5jb25zb2xhdGEnLCAnUm9ib3RvIE1vbm8nLCAnQ29uc29sYXMnLCBtb25vc3BhY2U7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIC5yb3ctbGFiZWwge1xuXHRmb250LXdlaWdodDogNjAwO1xuXHR0ZXh0LWFsaWduOiByaWdodDtcblx0Y29sb3I6ICMxZjIzMjg7XG5cdHBhZGRpbmctcmlnaHQ6IDE2cHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmFnZ3JlZ2F0ZXMtdGFibGUgLnJvdy1sYWJlbCB7XG5cdFx0Y29sb3I6ICNlNmVkZjM7XG5cdH1cbn1cblxuLmNoYXJ0LWNvbnRhaW5lciB7XG5cdHBvc2l0aW9uOiByZWxhdGl2ZTtcblx0aGVpZ2h0OiA0MDBweDtcbn1cblxuLmNoYXJ0LWV2ZW50cy10aW1lbGluZSB7XG5cdG1hcmdpbi10b3A6IDE1cHg7XG5cdHBhZGRpbmctdG9wOiAxNXB4O1xuXHRib3JkZXItdG9wOiAxcHggc29saWQgI2U1ZTdlYjtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY2hhcnQtZXZlbnRzLXRpbWVsaW5lIHtcblx0XHRib3JkZXItdG9wLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi50aW1lbGluZS10aXRsZSB7XG5cdGZvbnQtc2l6ZTogMTNweDtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0Y29sb3I6ICM2NTZkNzY7XG5cdG1hcmdpbi1ib3R0b206IDEwcHg7XG59XG5cbi50aW1lbGluZS1ldmVudHMge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRmbGV4LWRpcmVjdGlvbjogY29sdW1uO1xuXHRnYXA6IDhweDtcbn1cblxuLnRpbWVsaW5lLWV2ZW50IHtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRwYWRkaW5nOiA4cHggMTJweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogNnB4O1xuXHRmb250LXNpemU6IDEzcHg7XG5cdHRyYW5zaXRpb246IGFsbCAwLjJzO1xuXHRjdXJzb3I6IHBvaW50ZXI7XG5cdGJvcmRlcjogMnB4IHNvbGlkIHRyYW5zcGFyZW50O1xufVxuXG4udGltZWxpbmUtZXZlbnQ6aG92ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZmZmNWVkO1xuXHRib3JkZXItY29sb3I6ICNmYjkyM2M7XG5cdGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2JhKDI1MSwgMTQ2LCA2MCwgMC4yKTtcblx0dHJhbnNmb3JtOiB0cmFuc2xhdGVYKDRweCk7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LnRpbWVsaW5lLWV2ZW50IHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogdHJhbnNwYXJlbnQ7XG5cdH1cblxuXHQudGltZWxpbmUtZXZlbnQ6aG92ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMyZDE4MTA7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjZmI5MjNjO1xuXHRcdGJveC1zaGFkb3c6IDAgMnB4IDhweCByZ2JhKDI1MSwgMTQ2LCA2MCwgMC4zKTtcblx0fVxufVxuXG4uZXZlbnQtaWNvbiB7XG5cdGZvbnQtc2l6ZTogMTZweDtcblx0ZmxleC1zaHJpbms6IDA7XG59XG5cbi5ldmVudC10aW1lIHtcblx0Zm9udC1mYW1pbHk6ICdTRiBNb25vJywgJ01vbmFjbycsICdJbmNvbnNvbGF0YScsICdSb2JvdG8gTW9ubycsICdDb25zb2xhcycsIG1vbm9zcGFjZTtcblx0Zm9udC1zaXplOiAxMnB4O1xuXHRjb2xvcjogIzY1NmQ3Njtcblx0ZmxleC1zaHJpbms6IDA7XG59XG5cbi5ldmVudC1sYWJlbCB7XG5cdGNvbG9yOiAjMWYyMzI4O1xuXHRmbGV4LWdyb3c6IDE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmV2ZW50LWxhYmVsIHtcblx0XHRjb2xvcjogI2U2ZWRmMztcblx0fVxufVxuXG5mb290ZXIge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiA2MHB4IGF1dG8gMjBweDtcblx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRwYWRkaW5nLXRvcDogMjBweDtcblx0Ym9yZGVyLXRvcDogMXB4IHNvbGlkICNkMGQ3ZGU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Zm9vdGVyIHtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuZm9vdGVyIGEge1xuXHRjb2xvcjogIzA5NjlkYTtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xufVxuXG5mb290ZXIgYTpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGZvb3RlciBhIHtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG5AbWVkaWEgKG1heC13aWR0aDogNzY4cHgpIHtcblx0Ym9keSB7XG5cdFx0cGFkZGluZzogMTBweDtcblx0fVxuXG5cdGhlYWRlciBoMSB7XG5cdFx0Zm9udC1zaXplOiAyNHB4O1xuXHR9XG5cblx0LmNoYXJ0LWNvbnRhaW5lciB7XG5cdFx0aGVpZ2h0OiAzMDBweDtcblx0fVxuXG5cdC5zdGF0cyB7XG5cdFx0Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoMiwgMWZyKTtcblx0fVxufVxuYFxufVxuIiwKICAgICIvKipcbiAqIFNoYXJlZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gYW5kIGV2YWx1YXRpb25cbiAqXG4gKiBUaGlzIG1vZHVsZSB3YXMgY29waWVkIGZyb20gcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIGFuZCBhZGFwdGVkIHRvIGxpdmVcbiAqIHVuZGVyIHNoYXJlZC9saWIgc28gYm90aCBgaW5pdGAgYW5kIGByZXBvcnRgIGNhbiBpbXBvcnQgaXQuXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBNZXRyaWNDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBNZXRyaWNUaHJlc2hvbGQge1xuXHRuYW1lPzogc3RyaW5nIC8vIEV4YWN0IG1ldHJpYyBuYW1lIChoaWdoZXIgcHJpb3JpdHkgdGhhbiBwYXR0ZXJuKVxuXHRwYXR0ZXJuPzogc3RyaW5nIC8vIEdsb2IgcGF0dGVybiAobG93ZXIgcHJpb3JpdHkpXG5cdGRpcmVjdGlvbj86ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnXG5cdHdhcm5pbmdfbWluPzogbnVtYmVyXG5cdGNyaXRpY2FsX21pbj86IG51bWJlclxuXHR3YXJuaW5nX21heD86IG51bWJlclxuXHRjcml0aWNhbF9tYXg/OiBudW1iZXJcblx0d2FybmluZ19jaGFuZ2VfcGVyY2VudD86IG51bWJlclxuXHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudD86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVzaG9sZENvbmZpZyB7XG5cdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRkZWZhdWx0OiB7XG5cdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHR9XG5cdG1ldHJpY3M/OiBNZXRyaWNUaHJlc2hvbGRbXVxufVxuXG5leHBvcnQgdHlwZSBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJyB8ICd3YXJuaW5nJyB8ICdmYWlsdXJlJ1xuXG5leHBvcnQgdHlwZSBFdmFsdWF0ZWRUaHJlc2hvbGQgPSB7XG5cdG1ldHJpY19uYW1lOiBzdHJpbmdcblx0dGhyZXNob2xkX25hbWU/OiBzdHJpbmdcblx0dGhyZXNob2xkX3BhdHRlcm4/OiBzdHJpbmdcblx0dGhyZXNob2xkX3NldmVyaXR5OiBUaHJlc2hvbGRTZXZlcml0eVxufVxuXG4vKipcbiAqIFBhcnNlIFlBTUwgdGhyZXNob2xkcyBjb25maWcgdXNpbmcgYHlxYFxuICovXG5hc3luYyBmdW5jdGlvbiBwYXJzZVRocmVzaG9sZHNZYW1sKHlhbWxDb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRocmVzaG9sZENvbmZpZyB8IG51bGw+IHtcblx0aWYgKCF5YW1sQ29udGVudCB8fCB5YW1sQ29udGVudC50cmltKCkgPT09ICcnKSB7XG5cdFx0cmV0dXJuIG51bGxcblx0fVxuXG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0YXdhaXQgZXhlYygneXEnLCBbJy1vPWpzb24nLCAnLiddLCB7XG5cdFx0XHRpbnB1dDogQnVmZmVyLmZyb20oeWFtbENvbnRlbnQsICd1dGYtOCcpLFxuXHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRsZXQganNvbiA9IGNodW5rcy5qb2luKCcnKVxuXHRcdGxldCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb24pIGFzIFRocmVzaG9sZENvbmZpZ1xuXG5cdFx0cmV0dXJuIHBhcnNlZFxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHdhcm5pbmcoYEZhaWxlZCB0byBwYXJzZSB0aHJlc2hvbGRzIFlBTUw6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdHJldHVybiBudWxsXG5cdH1cbn1cblxuLyoqXG4gKiBNZXJnZSB0d28gdGhyZXNob2xkIGNvbmZpZ3MgKGN1c3RvbSBleHRlbmRzL292ZXJyaWRlcyBkZWZhdWx0KVxuICovXG5mdW5jdGlvbiBtZXJnZVRocmVzaG9sZENvbmZpZ3MoZGVmYXVsdENvbmZpZzogVGhyZXNob2xkQ29uZmlnLCBjdXN0b21Db25maWc6IFRocmVzaG9sZENvbmZpZyk6IFRocmVzaG9sZENvbmZpZyB7XG5cdC8vIHByZXR0aWVyLWlnbm9yZVxuXHRyZXR1cm4ge1xuXHRcdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IGN1c3RvbUNvbmZpZy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcubmV1dHJhbF9jaGFuZ2VfcGVyY2VudCxcblx0XHRkZWZhdWx0OiB7XG5cdFx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OiBjdXN0b21Db25maWcuZGVmYXVsdD8ud2FybmluZ19jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudCxcblx0XHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OiBjdXN0b21Db25maWcuZGVmYXVsdD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5kZWZhdWx0LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50LFxuXHRcdH0sXG5cdFx0bWV0cmljczogWy4uLihjdXN0b21Db25maWcubWV0cmljcyB8fCBbXSksIC4uLihkZWZhdWx0Q29uZmlnLm1ldHJpY3MgfHwgW10pXSxcblx0fVxufVxuXG4vKipcbiAqIExvYWQgZGVmYXVsdCB0aHJlc2hvbGRzIGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZERlZmF1bHRUaHJlc2hvbGRDb25maWcoKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWc+IHtcblx0ZGVidWcoJ0xvYWRpbmcgZGVmYXVsdCB0aHJlc2hvbGRzIGZyb20gR0lUSFVCX0FDVElPTl9QQVRIL2RlcGxveS90aHJlc2hvbGRzLnlhbWwnKVxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwcm9jZXNzLmVudlsnR0lUSFVCX0FDVElPTl9QQVRIJ10hKVxuXHRsZXQgZGVmYXVsdFBhdGggPSBwYXRoLmpvaW4oYWN0aW9uUm9vdCwgJ2RlcGxveScsICd0aHJlc2hvbGRzLnlhbWwnKVxuXG5cdGlmIChmcy5leGlzdHNTeW5jKGRlZmF1bHRQYXRoKSkge1xuXHRcdGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGRlZmF1bHRQYXRoLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0bGV0IGNvbmZpZyA9IGF3YWl0IHBhcnNlVGhyZXNob2xkc1lhbWwoY29udGVudClcblx0XHRpZiAoY29uZmlnKSByZXR1cm4gY29uZmlnXG5cdH1cblxuXHQvLyBGYWxsYmFjayB0byBoYXJkY29kZWQgZGVmYXVsdHNcblx0d2FybmluZygnQ291bGQgbm90IGxvYWQgZGVmYXVsdCB0aHJlc2hvbGRzLCB1c2luZyBoYXJkY29kZWQgZGVmYXVsdHMnKVxuXHRyZXR1cm4ge1xuXHRcdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IDUuMCxcblx0XHRkZWZhdWx0OiB7XG5cdFx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OiAyMC4wLFxuXHRcdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IDUwLjAsXG5cdFx0fSxcblx0fVxufVxuXG4vKipcbiAqIExvYWQgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uIHdpdGggbWVyZ2luZzpcbiAqIDEuIExvYWQgZGVmYXVsdCBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWxcbiAqIDIuIE1lcmdlIHdpdGggY3VzdG9tIFlBTUwgKGlubGluZSkgaWYgcHJvdmlkZWRcbiAqIDMuIE1lcmdlIHdpdGggY3VzdG9tIGZpbGUgaWYgcHJvdmlkZWRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUaHJlc2hvbGRDb25maWcoY3VzdG9tWWFtbD86IHN0cmluZywgY3VzdG9tUGF0aD86IHN0cmluZyk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdGxldCBjb25maWcgPSBhd2FpdCBsb2FkRGVmYXVsdFRocmVzaG9sZENvbmZpZygpXG5cblx0Ly8gTWVyZ2Ugd2l0aCBjdXN0b20gWUFNTCAoaW5saW5lKVxuXHRpZiAoY3VzdG9tWWFtbCkge1xuXHRcdGRlYnVnKCdNZXJnaW5nIGN1c3RvbSB0aHJlc2hvbGRzIGZyb20gaW5saW5lIFlBTUwnKVxuXHRcdGxldCBjdXN0b21Db25maWcgPSBhd2FpdCBwYXJzZVRocmVzaG9sZHNZYW1sKGN1c3RvbVlhbWwpXG5cdFx0aWYgKGN1c3RvbUNvbmZpZykge1xuXHRcdFx0Y29uZmlnID0gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGNvbmZpZywgY3VzdG9tQ29uZmlnKVxuXHRcdH1cblx0fVxuXG5cdC8vIE1lcmdlIHdpdGggY3VzdG9tIGZpbGVcblx0aWYgKGN1c3RvbVBhdGggJiYgZnMuZXhpc3RzU3luYyhjdXN0b21QYXRoKSkge1xuXHRcdGRlYnVnKGBNZXJnaW5nIGN1c3RvbSB0aHJlc2hvbGRzIGZyb20gZmlsZTogJHtjdXN0b21QYXRofWApXG5cdFx0bGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoY3VzdG9tUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGxldCBjdXN0b21Db25maWcgPSBhd2FpdCBwYXJzZVRocmVzaG9sZHNZYW1sKGNvbnRlbnQpXG5cdFx0aWYgKGN1c3RvbUNvbmZpZykge1xuXHRcdFx0Y29uZmlnID0gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGNvbmZpZywgY3VzdG9tQ29uZmlnKVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBjb25maWdcbn1cblxuLyoqXG4gKiBNYXRjaCBtZXRyaWMgbmFtZSBhZ2FpbnN0IHBhdHRlcm4gKHN1cHBvcnRzIHdpbGRjYXJkcylcbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJuKG1ldHJpY05hbWU6IHN0cmluZywgcGF0dGVybjogc3RyaW5nKTogYm9vbGVhbiB7XG5cdC8vIENvbnZlcnQgZ2xvYiBwYXR0ZXJuIHRvIHJlZ2V4XG5cdGxldCByZWdleFBhdHRlcm4gPSBwYXR0ZXJuXG5cdFx0LnJlcGxhY2UoL1xcKi9nLCAnLionKSAvLyAqIC0+IC4qXG5cdFx0LnJlcGxhY2UoL1xcPy9nLCAnLicpIC8vID8gLT4gLlxuXG5cdGxldCByZWdleCA9IG5ldyBSZWdFeHAoYF4ke3JlZ2V4UGF0dGVybn0kYCwgJ2knKVxuXHRyZXR1cm4gcmVnZXgudGVzdChtZXRyaWNOYW1lKVxufVxuXG4vKipcbiAqIEZpbmQgbWF0Y2hpbmcgdGhyZXNob2xkIGZvciBtZXRyaWMgKGV4YWN0IG1hdGNoIGZpcnN0LCB0aGVuIHBhdHRlcm4pXG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1RocmVzaG9sZChtZXRyaWNOYW1lOiBzdHJpbmcsIGNvbmZpZzogVGhyZXNob2xkQ29uZmlnKTogTWV0cmljVGhyZXNob2xkIHwgbnVsbCB7XG5cdGlmICghY29uZmlnLm1ldHJpY3MpIHJldHVybiBudWxsXG5cblx0Ly8gRmlyc3QgcGFzczogZXhhY3QgbWF0Y2ggKGhpZ2hlc3QgcHJpb3JpdHkpXG5cdGZvciAobGV0IHRocmVzaG9sZCBvZiBjb25maWcubWV0cmljcykge1xuXHRcdGlmICh0aHJlc2hvbGQubmFtZSAmJiB0aHJlc2hvbGQubmFtZSA9PT0gbWV0cmljTmFtZSkge1xuXHRcdFx0cmV0dXJuIHRocmVzaG9sZFxuXHRcdH1cblx0fVxuXG5cdC8vIFNlY29uZCBwYXNzOiBwYXR0ZXJuIG1hdGNoXG5cdGZvciAobGV0IHRocmVzaG9sZCBvZiBjb25maWcubWV0cmljcykge1xuXHRcdGlmICh0aHJlc2hvbGQucGF0dGVybiAmJiBtYXRjaFBhdHRlcm4obWV0cmljTmFtZSwgdGhyZXNob2xkLnBhdHRlcm4pKSB7XG5cdFx0XHRyZXR1cm4gdGhyZXNob2xkXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSB0aHJlc2hvbGQgZm9yIGEgbWV0cmljIGNvbXBhcmlzb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlVGhyZXNob2xkKGNvbXBhcmlzb246IE1ldHJpY0NvbXBhcmlzb24sIGNvbmZpZzogVGhyZXNob2xkQ29uZmlnKTogRXZhbHVhdGVkVGhyZXNob2xkIHtcblx0bGV0IHRocmVzaG9sZCA9IGZpbmRNYXRjaGluZ1RocmVzaG9sZChjb21wYXJpc29uLm5hbWUsIGNvbmZpZylcblx0bGV0IHNldmVyaXR5OiBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJ1xuXG5cdC8vIENoZWNrIGFic29sdXRlIHZhbHVlIHRocmVzaG9sZHMgZmlyc3Rcblx0aWYgKHRocmVzaG9sZCkge1xuXHRcdC8vIENoZWNrIGNyaXRpY2FsX21pblxuXHRcdGlmICh0aHJlc2hvbGQuY3JpdGljYWxfbWluICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlIDwgdGhyZXNob2xkLmNyaXRpY2FsX21pbikge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYmVsb3cgY3JpdGljYWxfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC5jcml0aWNhbF9taW59KWApXG5cdFx0XHRzZXZlcml0eSA9ICdmYWlsdXJlJ1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHdhcm5pbmdfbWluXG5cdFx0aWYgKHRocmVzaG9sZC53YXJuaW5nX21pbiAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA8IHRocmVzaG9sZC53YXJuaW5nX21pbikge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYmVsb3cgd2FybmluZ19taW4gKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA8ICR7dGhyZXNob2xkLndhcm5pbmdfbWlufSlgKVxuXHRcdFx0c2V2ZXJpdHkgPSAnd2FybmluZydcblx0XHR9XG5cblx0XHQvLyBDaGVjayBjcml0aWNhbF9tYXhcblx0XHRpZiAodGhyZXNob2xkLmNyaXRpY2FsX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC5jcml0aWNhbF9tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIGNyaXRpY2FsX21heCAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9ID4gJHt0aHJlc2hvbGQuY3JpdGljYWxfbWF4fSlgKVxuXHRcdFx0c2V2ZXJpdHkgPSAnZmFpbHVyZSdcblx0XHR9XG5cblx0XHQvLyBDaGVjayB3YXJuaW5nX21heFxuXHRcdGlmICh0aHJlc2hvbGQud2FybmluZ19tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQud2FybmluZ19tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIHdhcm5pbmdfbWF4ICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPiAke3RocmVzaG9sZC53YXJuaW5nX21heH0pYClcblx0XHRcdHNldmVyaXR5ID0gJ3dhcm5pbmcnXG5cdFx0fVxuXHR9XG5cblx0Ly8gQ2hlY2sgY2hhbmdlIHBlcmNlbnQgdGhyZXNob2xkc1xuXHRpZiAoIWlzTmFOKGNvbXBhcmlzb24uY2hhbmdlLnBlcmNlbnQpKSB7XG5cdFx0bGV0IGNoYW5nZVBlcmNlbnQgPSBNYXRoLmFicyhjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50KVxuXG5cdFx0Ly8gVXNlIG1ldHJpYy1zcGVjaWZpYyBvciBkZWZhdWx0IHRocmVzaG9sZHNcblx0XHRsZXQgd2FybmluZ1RocmVzaG9sZCA9IHRocmVzaG9sZD8ud2FybmluZ19jaGFuZ2VfcGVyY2VudCA/PyBjb25maWcuZGVmYXVsdC53YXJuaW5nX2NoYW5nZV9wZXJjZW50XG5cdFx0bGV0IGNyaXRpY2FsVGhyZXNob2xkID0gdGhyZXNob2xkPy5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudCA/PyBjb25maWcuZGVmYXVsdC5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudFxuXG5cdFx0Ly8gT25seSB0cmlnZ2VyIGlmIGNoYW5nZSBpcyBpbiBcIndvcnNlXCIgZGlyZWN0aW9uXG5cdFx0aWYgKGNvbXBhcmlzb24uY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ3dvcnNlJykge1xuXHRcdFx0aWYgKGNoYW5nZVBlcmNlbnQgPiBjcml0aWNhbFRocmVzaG9sZCkge1xuXHRcdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBjcml0aWNhbCByZWdyZXNzaW9uICgke2NoYW5nZVBlcmNlbnQudG9GaXhlZCgxKX0lID4gJHtjcml0aWNhbFRocmVzaG9sZH0lKWApXG5cdFx0XHRcdHNldmVyaXR5ID0gJ2ZhaWx1cmUnXG5cdFx0XHR9XG5cblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gd2FybmluZ1RocmVzaG9sZCkge1xuXHRcdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiB3YXJuaW5nIHJlZ3Jlc3Npb24gKCR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDEpfSUgPiAke3dhcm5pbmdUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRzZXZlcml0eSA9ICd3YXJuaW5nJ1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bWV0cmljX25hbWU6IGNvbXBhcmlzb24ubmFtZSxcblx0XHR0aHJlc2hvbGRfbmFtZTogdGhyZXNob2xkPy5uYW1lLFxuXHRcdHRocmVzaG9sZF9wYXR0ZXJuOiB0aHJlc2hvbGQ/LnBhdHRlcm4sXG5cdFx0dGhyZXNob2xkX3NldmVyaXR5OiBzZXZlcml0eSxcblx0fVxufVxuXG4vKipcbiAqIEV2YWx1YXRlIGFsbCBtZXRyaWNzIGFuZCByZXR1cm4gb3ZlcmFsbCBzZXZlcml0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMoXG5cdGNvbXBhcmlzb25zOiBNZXRyaWNDb21wYXJpc29uW10sXG5cdGNvbmZpZzogVGhyZXNob2xkQ29uZmlnXG4pOiB7XG5cdG92ZXJhbGw6IFRocmVzaG9sZFNldmVyaXR5XG5cdGZhaWx1cmVzOiBNZXRyaWNDb21wYXJpc29uW11cblx0d2FybmluZ3M6IE1ldHJpY0NvbXBhcmlzb25bXVxufSB7XG5cdGxldCBmYWlsdXJlczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblx0bGV0IHdhcm5pbmdzOiBNZXRyaWNDb21wYXJpc29uW10gPSBbXVxuXG5cdGZvciAobGV0IGNvbXBhcmlzb24gb2YgY29tcGFyaXNvbnMpIHtcblx0XHRsZXQgc2V2ZXJpdHkgPSBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uLCBjb25maWcpXG5cblx0XHRpZiAoc2V2ZXJpdHkudGhyZXNob2xkX3NldmVyaXR5ID09PSAnZmFpbHVyZScpIHtcblx0XHRcdGZhaWx1cmVzLnB1c2goY29tcGFyaXNvbilcblx0XHR9IGVsc2UgaWYgKHNldmVyaXR5LnRocmVzaG9sZF9zZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSB7XG5cdFx0XHR3YXJuaW5ncy5wdXNoKGNvbXBhcmlzb24pXG5cdFx0fVxuXHR9XG5cblx0bGV0IG92ZXJhbGw6IFRocmVzaG9sZFNldmVyaXR5ID0gJ3N1Y2Nlc3MnXG5cdGlmIChmYWlsdXJlcy5sZW5ndGggPiAwKSB7XG5cdFx0b3ZlcmFsbCA9ICdmYWlsdXJlJ1xuXHR9IGVsc2UgaWYgKHdhcm5pbmdzLmxlbmd0aCA+IDApIHtcblx0XHRvdmVyYWxsID0gJ3dhcm5pbmcnXG5cdH1cblxuXHRyZXR1cm4geyBvdmVyYWxsLCBmYWlsdXJlcywgd2FybmluZ3MgfVxufVxuIiwKICAgICJpbXBvcnQgdHlwZSB7IENvbGxlY3RlZE1ldHJpYyB9IGZyb20gJy4uLy4uL3NoYXJlZC9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgZnVuY3Rpb24gbG9hZENvbGxlY3RlZE1ldHJpY3MoY29udGVudDogc3RyaW5nKTogQ29sbGVjdGVkTWV0cmljW10ge1xuXHRsZXQgbWV0cmljczogQ29sbGVjdGVkTWV0cmljW10gPSBbXVxuXHRsZXQgbGluZXMgPSBjb250ZW50LnRyaW0oKS5zcGxpdCgnXFxuJylcblxuXHRmb3IgKGxldCBsaW5lIG9mIGxpbmVzKSB7XG5cdFx0aWYgKCFsaW5lLnRyaW0oKSkgY29udGludWVcblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgbWV0cmljID0gSlNPTi5wYXJzZShsaW5lKSBhcyBDb2xsZWN0ZWRNZXRyaWNcblx0XHRcdG1ldHJpY3MucHVzaChtZXRyaWMpXG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBTa2lwIGludmFsaWQgbGluZXNcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG1ldHJpY3Ncbn1cbiIsCiAgICAiLyoqXG4gKiBDaGFvcyBldmVudHMgcGFyc2luZyBhbmQgZm9ybWF0dGluZ1xuICovXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hhb3NFdmVudCB7XG5cdHNjcmlwdDogc3RyaW5nXG5cdGVwb2NoX21zOiBudW1iZXJcblx0dGltZXN0YW1wOiBzdHJpbmdcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xuXHRkdXJhdGlvbl9tcz86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZvcm1hdHRlZEV2ZW50IHtcblx0aWNvbjogc3RyaW5nXG5cdGxhYmVsOiBzdHJpbmdcblx0dGltZXN0YW1wOiBudW1iZXIgLy8gbWlsbGlzZWNvbmRzIChlcG9jaF9tcylcblx0ZHVyYXRpb25fbXM/OiBudW1iZXJcbn1cblxuLyoqXG4gKiBHZXQgaWNvbiBmb3IgZXZlbnQgYmFzZWQgb24gZHVyYXRpb25cbiAqIER1cmF0aW9uIGV2ZW50cyAoaW50ZXJ2YWxzKSBnZXQg4o+x77iPXG4gKiBJbnN0YW50IGV2ZW50cyBnZXQg8J+TjVxuICovXG5mdW5jdGlvbiBnZXRFdmVudEljb24oaGFzRHVyYXRpb246IGJvb2xlYW4pOiBzdHJpbmcge1xuXHRyZXR1cm4gaGFzRHVyYXRpb24gPyAn4o+x77iPJyA6ICfwn5ONJ1xufVxuXG4vKipcbiAqIEZvcm1hdCBldmVudHMgZm9yIHZpc3VhbGl6YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdENoYW9zRXZlbnRzKGV2ZW50czogQ2hhb3NFdmVudFtdKTogRm9ybWF0dGVkRXZlbnRbXSB7XG5cdHJldHVybiBldmVudHMubWFwKChldmVudCkgPT4gKHtcblx0XHRpY29uOiBnZXRFdmVudEljb24oISFldmVudC5kdXJhdGlvbl9tcyksXG5cdFx0bGFiZWw6IGV2ZW50LmRlc2NyaXB0aW9uLFxuXHRcdHRpbWVzdGFtcDogZXZlbnQuZXBvY2hfbXMsXG5cdFx0ZHVyYXRpb25fbXM6IGV2ZW50LmR1cmF0aW9uX21zLFxuXHR9KSlcbn1cbiIsCiAgICAiaW1wb3J0IHsgZm9ybWF0Q2hhb3NFdmVudHMsIHR5cGUgQ2hhb3NFdmVudCwgdHlwZSBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4uLy4uL3NoYXJlZC9ldmVudHMuanMnXG5cbmV4cG9ydCBmdW5jdGlvbiBsb2FkQ2hhb3NFdmVudHMoY29udGVudDogc3RyaW5nKTogRm9ybWF0dGVkRXZlbnRbXSB7XG5cdGxldCBldmVudHM6IENoYW9zRXZlbnRbXSA9IFtdXG5cdGxldCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKVxuXG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAoIWxpbmUudHJpbSgpKSBjb250aW51ZVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBldmVudCA9IEpTT04ucGFyc2UobGluZSkgYXMgQ2hhb3NFdmVudFxuXHRcdFx0ZXZlbnRzLnB1c2goZXZlbnQpXG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBTa2lwIGludmFsaWQgbGluZXNcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGZvcm1hdENoYW9zRXZlbnRzKGV2ZW50cylcbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7O0FBR0EsdURBQ0EsMkNBQ0E7QUFMQTtBQUNBOzs7QUNNQSxzREFDQSwwQ0FDQTtBQUxBO0FBQ0E7QUFpQkEsZUFBc0Isb0JBQW9CLENBQUMsaUJBQWtFO0FBQUEsRUFDNUcsSUFBSSxRQUFRLHFCQUFTLGNBQWMsR0FDL0IsZ0JBQWdCLFNBQVMscUJBQVMsZUFBZSxLQUFLLE9BQU8sc0JBQVEsS0FBSyxDQUFDO0FBQUEsRUFFL0UsSUFBSSxDQUFDLFNBQVMsQ0FBQztBQUFBLElBQ2QsTUFBVSxNQUFNLHFFQUFxRTtBQUFBLEVBR3RGLElBQUksaUJB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QUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtB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QUNoQixDQUFDLEdBRUcsUUFBUSx1QkFBUSxNQUFNLFNBQVM7QUFBQSxJQUNuQyxPQUFPLFlBQVksZ0NBQWdDLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQixtQkFBbUI7QUFBQTtBQUFBO0FBSWhJLGVBQWUsd0JBQXdCLENBQUMsT0FBZSxTQUEyQjtBQUFBLEVBQ2pGLGtCQUFLLDhDQUFtQztBQUFBLEVBRXhDLElBQUksNEJBQVksSUFBSSxLQUNoQiw2QkFBYSxJQUFJLEtBQ2pCLGNBQW9DLENBQUM7QUFBQSxFQUV6QyxTQUFTLFVBQVUsU0FBUztBQUFBLElBQzNCLElBQUksT0FBTztBQUFBLE1BQ1YsVUFBVSxJQUFJLE9BQU8sVUFBVSxPQUFPLFFBQVE7QUFBQSxJQUcvQyxJQUFJLE9BQU87QUFBQSxNQUNWLFdBQVcsSUFBSSxPQUFPLFVBQVUsT0FBTyxTQUFTO0FBQUEsSUFHakQsWUFBWSxLQUFLLE9BQU8sVUFBVTtBQUFBO0FBQUEsRUFHbkMsSUFBSSxPQUFPLG9CQUFvQixXQUFXLFlBQVksV0FBVztBQUFBLEVBQ2pFLE1BQU0sc0JBQXNCLE9BQU8sSUFBSTtBQUFBO0FBR3hDLEtBQUs7IiwKICAiZGVidWdJZCI6ICIxRkFCNzZDOTQ4OTU4RkJDNjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
