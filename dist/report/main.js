import {
  require_artifact
} from "../main-xnwmdgz4.js";
import {
  createWorkloadCheck
} from "./lib/checks.js";
import {
  compareWorkloadMetrics,
  formatChange,
  formatValue,
  parseMetricsJsonl
} from "./lib/analysis.js";
import {
  loadThresholds
} from "./lib/thresholds.js";
import {
  require_core
} from "../main-gq2p93nb.js";
import {
  require_github
} from "../github-jgav07sj.js";
import"../main-2h1wxd0e.js";
import"../main-zqznhazw.js";
import {
  __require,
  __toESM
} from "../main-ynsbc1hx.js";

// report/main.ts
var import_artifact2 = __toESM(require_artifact(), 1), import_core4 = __toESM(require_core(), 1), import_github2 = __toESM(require_github(), 1);
import * as fs2 from "node:fs";
import * as path2 from "node:path";

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

// report/lib/comment.ts
var import_core2 = __toESM(require_core(), 1), import_github = __toESM(require_github(), 1);
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
  let octokit = import_github.getOctokit(token);
  import_core2.info(`Searching for existing SLO comment in PR #${prNumber}...`);
  let { data: comments } = await octokit.rest.issues.listComments({
    owner,
    repo,
    issue_number: prNumber
  });
  for (let comment of comments)
    if (comment.body?.includes("\uD83C\uDF0B SLO Test Results"))
      return import_core2.info(`Found existing comment: ${comment.id}`), comment.id;
  return null;
}
async function createOrUpdateComment(token, owner, repo, prNumber, body) {
  let octokit = import_github.getOctokit(token), existingId = await findExistingSLOComment(token, owner, repo, prNumber);
  if (existingId) {
    import_core2.info(`Updating existing comment ${existingId}...`);
    let { data } = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: existingId,
      body
    });
    return import_core2.info(`Comment updated: ${data.html_url}`), { url: data.html_url, id: data.id };
  } else {
    import_core2.info("Creating new comment...");
    let { data } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body
    });
    return import_core2.info(`Comment created: ${data.html_url}`), { url: data.html_url, id: data.id };
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
var import_core3 = __toESM(require_core(), 1);
async function writeJobSummary(data) {
  import_core3.summary.addHeading("\uD83C\uDF0B SLO Test Summary", 1), import_core3.summary.addRaw(`
<p>
	<strong>Current:</strong> <a href="${data.commits.current.url}">${data.commits.current.short}</a>
	vs
	<strong>Base:</strong> <a href="${data.commits.base.url}">${data.commits.base.short}</a>
</p>
	`), import_core3.summary.addBreak();
  let totalMetrics = data.workloads.reduce((sum, w) => sum + w.summary.total, 0), totalRegressions = data.workloads.reduce((sum, w) => sum + w.summary.regressions, 0), totalImprovements = data.workloads.reduce((sum, w) => sum + w.summary.improvements, 0), totalStable = data.workloads.reduce((sum, w) => sum + w.summary.stable, 0);
  import_core3.summary.addRaw(`
<table>
	<tr>
		<td><strong>${data.workloads.length}</strong> workloads</td>
		<td><strong>${totalMetrics}</strong> metrics</td>
		<td><strong style="color: #1a7f37;">${totalImprovements}</strong> improvements</td>
		<td><strong style="color: #cf222e;">${totalRegressions}</strong> regressions</td>
		<td><strong style="color: #6e7781;">${totalStable}</strong> stable</td>
	</tr>
</table>
	`), import_core3.summary.addBreak();
  for (let workload of data.workloads) {
    let statusEmoji = workload.summary.regressions > 0 ? "\uD83D\uDFE1" : "\uD83D\uDFE2", artifactUrl = data.artifactUrls?.get(workload.workload);
    if (import_core3.summary.addHeading(`${statusEmoji} ${workload.workload}`, 3), artifactUrl)
      import_core3.summary.addRaw(`<p><a href="${artifactUrl}">\uD83D\uDCCA View detailed HTML report</a></p>`);
    import_core3.summary.addTable([
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
    ]), import_core3.summary.addBreak();
  }
  await import_core3.summary.write();
}

// report/main.ts
async function main() {
  try {
    let cwd = path2.join(process.cwd(), ".slo-reports"), token = import_core4.getInput("github_token") || import_core4.getInput("token"), runId = parseInt(import_core4.getInput("github_run_id") || import_core4.getInput("run_id") || String(import_github2.context.runId));
    if (!token) {
      import_core4.setFailed("github_token is required");
      return;
    }
    fs2.mkdirSync(cwd, { recursive: !0 }), import_core4.info(`Working directory: ${cwd}`), import_core4.info("\uD83D\uDCE6 Downloading artifacts from current run...");
    let workloads = await downloadWorkloadArtifacts({
      token,
      workflowRunId: runId,
      repositoryOwner: import_github2.context.repo.owner,
      repositoryName: import_github2.context.repo.repo,
      downloadPath: cwd
    });
    if (workloads.length === 0) {
      import_core4.warning("No workload artifacts found in current run");
      return;
    }
    import_core4.info(`Found ${workloads.length} workloads: ${workloads.map((w) => w.workload).join(", ")}`);
    let prNumber = workloads[0]?.pullNumber;
    if (!prNumber) {
      import_core4.setFailed("Pull request number not found in artifacts");
      return;
    }
    import_core4.info(`Processing PR #${prNumber}`);
    let { getOctokit: getOctokit2 } = await import("../github-jgav07sj.js"), octokit = getOctokit2(token);
    import_core4.info("Fetching PR information...");
    let { data: pr } = await octokit.rest.pulls.get({
      owner: import_github2.context.repo.owner,
      repo: import_github2.context.repo.repo,
      pull_number: prNumber
    });
    import_core4.info(`PR: ${pr.title}`), import_core4.info(`Base branch: ${pr.base.ref}`), import_core4.info(`Head SHA: ${pr.head.sha}`), import_core4.info("⚙️  Loading thresholds configuration...");
    let thresholds = await loadThresholds(import_core4.getInput("thresholds_yaml"), import_core4.getInput("thresholds_yaml_path"));
    import_core4.info(`Loaded thresholds: neutral_change=${thresholds.neutral_change_percent}%`), import_core4.info("\uD83D\uDCCA Analyzing metrics...");
    let comparisons = workloads.map((w) => compareWorkloadMetrics(w.workload, w.metrics, "avg", thresholds.neutral_change_percent));
    import_core4.info("\uD83D\uDCDD Generating HTML reports...");
    let htmlReportsPath = path2.join(cwd, "reports");
    fs2.mkdirSync(htmlReportsPath, { recursive: !0 });
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
            url: `https://github.com/${import_github2.context.repo.owner}/${import_github2.context.repo.repo}/commit/${pr.head.sha}`,
            short: pr.head.sha.substring(0, 7)
          },
          base: {
            sha: pr.base.sha,
            url: `https://github.com/${import_github2.context.repo.owner}/${import_github2.context.repo.repo}/commit/${pr.base.sha}`,
            short: pr.base.sha.substring(0, 7)
          }
        },
        meta: {
          prNumber,
          generatedAt: (/* @__PURE__ */ new Date()).toISOString()
        }
      }, html = generateHTMLReport(htmlData), htmlPath = path2.join(htmlReportsPath, `${workload.workload}-report.html`);
      fs2.writeFileSync(htmlPath, html, { encoding: "utf-8" }), htmlFiles.push({ workload: workload.workload, path: htmlPath }), import_core4.info(`Generated HTML report for ${workload.workload}`);
    }
    import_core4.info("\uD83D\uDCE4 Uploading HTML reports...");
    let uploadResult = await new import_artifact2.DefaultArtifactClient().uploadArtifact("slo-reports", htmlFiles.map((f) => f.path), htmlReportsPath, {
      retentionDays: 30
    });
    import_core4.info(`Uploaded HTML reports as artifact: ${uploadResult.id}`), import_core4.info("✅ Creating GitHub Checks...");
    let checkUrls = /* @__PURE__ */ new Map;
    for (let comparison of comparisons)
      try {
        let check = await createWorkloadCheck({
          token,
          owner: import_github2.context.repo.owner,
          repo: import_github2.context.repo.repo,
          sha: pr.head.sha,
          workload: comparison,
          thresholds
        });
        checkUrls.set(comparison.workload, check.url), import_core4.info(`Created check for ${comparison.workload}: ${check.url}`);
      } catch (error) {
        import_core4.warning(`Failed to create check for ${comparison.workload}: ${String(error)}`);
      }
    import_core4.info("\uD83D\uDCCB Writing Job Summary..."), await writeJobSummary({
      workloads: comparisons,
      commits: {
        current: {
          sha: pr.head.sha,
          url: `https://github.com/${import_github2.context.repo.owner}/${import_github2.context.repo.repo}/commit/${pr.head.sha}`,
          short: pr.head.sha.substring(0, 7)
        },
        base: {
          sha: pr.base.sha,
          url: `https://github.com/${import_github2.context.repo.owner}/${import_github2.context.repo.repo}/commit/${pr.base.sha}`,
          short: pr.base.sha.substring(0, 7)
        }
      }
    }), import_core4.info("Job Summary written"), import_core4.info("\uD83D\uDCAC Creating/updating PR comment...");
    let artifactUrls = /* @__PURE__ */ new Map, artifactBaseUrl = `https://github.com/${import_github2.context.repo.owner}/${import_github2.context.repo.repo}/actions/runs/${runId}/artifacts/${uploadResult.id}`;
    for (let file of htmlFiles)
      artifactUrls.set(file.workload, artifactBaseUrl);
    let commentBody = generateCommentBody({
      workloads: comparisons,
      artifactUrls,
      checkUrls,
      jobSummaryUrl: `https://github.com/${import_github2.context.repo.owner}/${import_github2.context.repo.repo}/actions/runs/${runId}`
    }), comment = await createOrUpdateComment(token, import_github2.context.repo.owner, import_github2.context.repo.repo, prNumber, commentBody);
    import_core4.info(`PR comment: ${comment.url}`), import_core4.info("✅ Report generation completed successfully!");
  } catch (error) {
    throw import_core4.setFailed(`Report generation failed: ${String(error)}`), error;
  }
}
main();

//# debugId=145021002095D17864756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jb21tZW50LnRzIiwgIi4uL3JlcG9ydC9saWIvaHRtbC50cyIsICIuLi9yZXBvcnQvbGliL3N1bW1hcnkudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbCiAgICAiLyoqXG4gKiBTTE8gUmVwb3J0IEFjdGlvbiAtIE1haW4gT3JjaGVzdHJhdG9yXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuXG5pbXBvcnQgeyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQgfSBmcm9tICdAYWN0aW9ucy9hcnRpZmFjdCdcbmltcG9ydCB7IGdldElucHV0LCBpbmZvLCBzZXRGYWlsZWQsIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgY29udGV4dCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHsgY29tcGFyZVdvcmtsb2FkTWV0cmljcyB9IGZyb20gJy4vbGliL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHsgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyB9IGZyb20gJy4vbGliL2FydGlmYWN0cy5qcydcbmltcG9ydCB7IGNyZWF0ZVdvcmtsb2FkQ2hlY2sgfSBmcm9tICcuL2xpYi9jaGVja3MuanMnXG5pbXBvcnQgeyBjcmVhdGVPclVwZGF0ZUNvbW1lbnQsIGdlbmVyYXRlQ29tbWVudEJvZHkgfSBmcm9tICcuL2xpYi9jb21tZW50LmpzJ1xuaW1wb3J0IHsgZ2VuZXJhdGVIVE1MUmVwb3J0LCB0eXBlIEhUTUxSZXBvcnREYXRhIH0gZnJvbSAnLi9saWIvaHRtbC5qcydcbmltcG9ydCB7IHdyaXRlSm9iU3VtbWFyeSB9IGZyb20gJy4vbGliL3N1bW1hcnkuanMnXG5pbXBvcnQgeyBsb2FkVGhyZXNob2xkcyB9IGZyb20gJy4vbGliL3RocmVzaG9sZHMuanMnXG5cbmFzeW5jIGZ1bmN0aW9uIG1haW4oKSB7XG5cdHRyeSB7XG5cdFx0bGV0IGN3ZCA9IHBhdGguam9pbihwcm9jZXNzLmN3ZCgpLCAnLnNsby1yZXBvcnRzJylcblx0XHRsZXQgdG9rZW4gPSBnZXRJbnB1dCgnZ2l0aHViX3Rva2VuJykgfHwgZ2V0SW5wdXQoJ3Rva2VuJylcblx0XHRsZXQgcnVuSWQgPSBwYXJzZUludChnZXRJbnB1dCgnZ2l0aHViX3J1bl9pZCcpIHx8IGdldElucHV0KCdydW5faWQnKSB8fCBTdHJpbmcoY29udGV4dC5ydW5JZCkpXG5cblx0XHRpZiAoIXRva2VuKSB7XG5cdFx0XHRzZXRGYWlsZWQoJ2dpdGh1Yl90b2tlbiBpcyByZXF1aXJlZCcpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRmcy5ta2RpclN5bmMoY3dkLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXHRcdGluZm8oYFdvcmtpbmcgZGlyZWN0b3J5OiAke2N3ZH1gKVxuXG5cdFx0Ly8gU3RlcCAxOiBEb3dubG9hZCBhcnRpZmFjdHMgZnJvbSBjdXJyZW50IHJ1blxuXHRcdC8vIE5PVEU6IEFydGlmYWN0cyBhbHJlYWR5IGNvbnRhaW4gYm90aCBjdXJyZW50IGFuZCBiYXNlIHNlcmllcyAoY29sbGVjdGVkIGluIGluaXQgYWN0aW9uKVxuXHRcdGluZm8oJ/Cfk6YgRG93bmxvYWRpbmcgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW4uLi4nKVxuXHRcdGxldCB3b3JrbG9hZHMgPSBhd2FpdCBkb3dubG9hZFdvcmtsb2FkQXJ0aWZhY3RzKHtcblx0XHRcdHRva2VuLFxuXHRcdFx0d29ya2Zsb3dSdW5JZDogcnVuSWQsXG5cdFx0XHRyZXBvc2l0b3J5T3duZXI6IGNvbnRleHQucmVwby5vd25lcixcblx0XHRcdHJlcG9zaXRvcnlOYW1lOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdGRvd25sb2FkUGF0aDogY3dkLFxuXHRcdH0pXG5cblx0XHRpZiAod29ya2xvYWRzLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0d2FybmluZygnTm8gd29ya2xvYWQgYXJ0aWZhY3RzIGZvdW5kIGluIGN1cnJlbnQgcnVuJylcblx0XHRcdHJldHVyblxuXHRcdH1cblxuXHRcdGluZm8oYEZvdW5kICR7d29ya2xvYWRzLmxlbmd0aH0gd29ya2xvYWRzOiAke3dvcmtsb2Fkcy5tYXAoKHcpID0+IHcud29ya2xvYWQpLmpvaW4oJywgJyl9YClcblxuXHRcdC8vIFN0ZXAgMjogR2V0IFBSIGluZm9ybWF0aW9uXG5cdFx0bGV0IHByTnVtYmVyID0gd29ya2xvYWRzWzBdPy5wdWxsTnVtYmVyXG5cdFx0aWYgKCFwck51bWJlcikge1xuXHRcdFx0c2V0RmFpbGVkKCdQdWxsIHJlcXVlc3QgbnVtYmVyIG5vdCBmb3VuZCBpbiBhcnRpZmFjdHMnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0aW5mbyhgUHJvY2Vzc2luZyBQUiAjJHtwck51bWJlcn1gKVxuXG5cdFx0Ly8gR2V0IFBSIGRldGFpbHMgZm9yIGNvbW1pdCBpbmZvXG5cdFx0bGV0IHsgZ2V0T2N0b2tpdCB9ID0gYXdhaXQgaW1wb3J0KCdAYWN0aW9ucy9naXRodWInKVxuXHRcdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRcdGluZm8oJ0ZldGNoaW5nIFBSIGluZm9ybWF0aW9uLi4uJylcblx0XHRsZXQgeyBkYXRhOiBwciB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0LnB1bGxzLmdldCh7XG5cdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0cmVwbzogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRwdWxsX251bWJlcjogcHJOdW1iZXIsXG5cdFx0fSlcblxuXHRcdGluZm8oYFBSOiAke3ByLnRpdGxlfWApXG5cdFx0aW5mbyhgQmFzZSBicmFuY2g6ICR7cHIuYmFzZS5yZWZ9YClcblx0XHRpbmZvKGBIZWFkIFNIQTogJHtwci5oZWFkLnNoYX1gKVxuXG5cdFx0Ly8gU3RlcCAzOiBMb2FkIHRocmVzaG9sZHMgY29uZmlndXJhdGlvblxuXHRcdGluZm8oJ+Kame+4jyAgTG9hZGluZyB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24uLi4nKVxuXHRcdGxldCB0aHJlc2hvbGRzID0gYXdhaXQgbG9hZFRocmVzaG9sZHMoZ2V0SW5wdXQoJ3RocmVzaG9sZHNfeWFtbCcpLCBnZXRJbnB1dCgndGhyZXNob2xkc195YW1sX3BhdGgnKSlcblx0XHRpbmZvKGBMb2FkZWQgdGhyZXNob2xkczogbmV1dHJhbF9jaGFuZ2U9JHt0aHJlc2hvbGRzLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnR9JWApXG5cblx0XHQvLyBTdGVwIDQ6IEFuYWx5emUgbWV0cmljcyAoYWxyZWFkeSBjb250YWluIGN1cnJlbnQgYW5kIGJhc2Ugc2VyaWVzIHdpdGggcmVmIGxhYmVsKVxuXHRcdGluZm8oJ/Cfk4ogQW5hbHl6aW5nIG1ldHJpY3MuLi4nKVxuXHRcdGxldCBjb21wYXJpc29ucyA9IHdvcmtsb2Fkcy5tYXAoKHcpID0+XG5cdFx0XHRjb21wYXJlV29ya2xvYWRNZXRyaWNzKHcud29ya2xvYWQsIHcubWV0cmljcywgJ2F2ZycsIHRocmVzaG9sZHMubmV1dHJhbF9jaGFuZ2VfcGVyY2VudClcblx0XHQpXG5cblx0XHQvLyBTdGVwIDU6IEdlbmVyYXRlIEhUTUwgcmVwb3J0c1xuXHRcdGluZm8oJ/Cfk50gR2VuZXJhdGluZyBIVE1MIHJlcG9ydHMuLi4nKVxuXG5cdFx0bGV0IGh0bWxSZXBvcnRzUGF0aCA9IHBhdGguam9pbihjd2QsICdyZXBvcnRzJylcblx0XHRmcy5ta2RpclN5bmMoaHRtbFJlcG9ydHNQYXRoLCB7IHJlY3Vyc2l2ZTogdHJ1ZSB9KVxuXG5cdFx0bGV0IGh0bWxGaWxlczogQXJyYXk8eyB3b3JrbG9hZDogc3RyaW5nOyBwYXRoOiBzdHJpbmcgfT4gPSBbXVxuXG5cdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCB3b3JrbG9hZHMubGVuZ3RoOyBpKyspIHtcblx0XHRcdGxldCB3b3JrbG9hZCA9IHdvcmtsb2Fkc1tpXVxuXHRcdFx0bGV0IGNvbXBhcmlzb24gPSBjb21wYXJpc29uc1tpXVxuXG5cdFx0XHRsZXQgaHRtbERhdGE6IEhUTUxSZXBvcnREYXRhID0ge1xuXHRcdFx0XHR3b3JrbG9hZDogd29ya2xvYWQud29ya2xvYWQsXG5cdFx0XHRcdGNvbXBhcmlzb24sXG5cdFx0XHRcdG1ldHJpY3M6IHdvcmtsb2FkLm1ldHJpY3MsXG5cdFx0XHRcdGV2ZW50czogd29ya2xvYWQuZXZlbnRzLFxuXHRcdFx0XHRjb21taXRzOiB7XG5cdFx0XHRcdFx0Y3VycmVudDoge1xuXHRcdFx0XHRcdFx0c2hhOiBwci5oZWFkLnNoYSxcblx0XHRcdFx0XHRcdHVybDogYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2NvbnRleHQucmVwby5vd25lcn0vJHtjb250ZXh0LnJlcG8ucmVwb30vY29tbWl0LyR7cHIuaGVhZC5zaGF9YCxcblx0XHRcdFx0XHRcdHNob3J0OiBwci5oZWFkLnNoYS5zdWJzdHJpbmcoMCwgNyksXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRiYXNlOiB7XG5cdFx0XHRcdFx0XHRzaGE6IHByLmJhc2Uuc2hhLFxuXHRcdFx0XHRcdFx0dXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9jb21taXQvJHtwci5iYXNlLnNoYX1gLFxuXHRcdFx0XHRcdFx0c2hvcnQ6IHByLmJhc2Uuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRtZXRhOiB7XG5cdFx0XHRcdFx0cHJOdW1iZXIsXG5cdFx0XHRcdFx0Z2VuZXJhdGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcblx0XHRcdFx0fSxcblx0XHRcdH1cblxuXHRcdFx0bGV0IGh0bWwgPSBnZW5lcmF0ZUhUTUxSZXBvcnQoaHRtbERhdGEpXG5cdFx0XHRsZXQgaHRtbFBhdGggPSBwYXRoLmpvaW4oaHRtbFJlcG9ydHNQYXRoLCBgJHt3b3JrbG9hZC53b3JrbG9hZH0tcmVwb3J0Lmh0bWxgKVxuXG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKGh0bWxQYXRoLCBodG1sLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRodG1sRmlsZXMucHVzaCh7IHdvcmtsb2FkOiB3b3JrbG9hZC53b3JrbG9hZCwgcGF0aDogaHRtbFBhdGggfSlcblxuXHRcdFx0aW5mbyhgR2VuZXJhdGVkIEhUTUwgcmVwb3J0IGZvciAke3dvcmtsb2FkLndvcmtsb2FkfWApXG5cdFx0fVxuXG5cdFx0Ly8gU3RlcCA2OiBVcGxvYWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0c1xuXHRcdGluZm8oJ/Cfk6QgVXBsb2FkaW5nIEhUTUwgcmVwb3J0cy4uLicpXG5cblx0XHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblx0XHRsZXQgdXBsb2FkUmVzdWx0ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQudXBsb2FkQXJ0aWZhY3QoXG5cdFx0XHQnc2xvLXJlcG9ydHMnLFxuXHRcdFx0aHRtbEZpbGVzLm1hcCgoZikgPT4gZi5wYXRoKSxcblx0XHRcdGh0bWxSZXBvcnRzUGF0aCxcblx0XHRcdHtcblx0XHRcdFx0cmV0ZW50aW9uRGF5czogMzAsXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0OiAke3VwbG9hZFJlc3VsdC5pZH1gKVxuXG5cdFx0Ly8gU3RlcCA3OiBDcmVhdGUgR2l0SHViIENoZWNrc1xuXHRcdGluZm8oJ+KchSBDcmVhdGluZyBHaXRIdWIgQ2hlY2tzLi4uJylcblxuXHRcdGxldCBjaGVja1VybHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0XHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsZXQgY2hlY2sgPSBhd2FpdCBjcmVhdGVXb3JrbG9hZENoZWNrKHtcblx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHRcdHNoYTogcHIuaGVhZC5zaGEsXG5cdFx0XHRcdFx0d29ya2xvYWQ6IGNvbXBhcmlzb24sXG5cdFx0XHRcdFx0dGhyZXNob2xkcyxcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRjaGVja1VybHMuc2V0KGNvbXBhcmlzb24ud29ya2xvYWQsIGNoZWNrLnVybClcblx0XHRcdFx0aW5mbyhgQ3JlYXRlZCBjaGVjayBmb3IgJHtjb21wYXJpc29uLndvcmtsb2FkfTogJHtjaGVjay51cmx9YClcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdHdhcm5pbmcoYEZhaWxlZCB0byBjcmVhdGUgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFN0ZXAgODogV3JpdGUgSm9iIFN1bW1hcnlcblx0XHRpbmZvKCfwn5OLIFdyaXRpbmcgSm9iIFN1bW1hcnkuLi4nKVxuXG5cdFx0YXdhaXQgd3JpdGVKb2JTdW1tYXJ5KHtcblx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRjb21taXRzOiB7XG5cdFx0XHRcdGN1cnJlbnQ6IHtcblx0XHRcdFx0XHRzaGE6IHByLmhlYWQuc2hhLFxuXHRcdFx0XHRcdHVybDogYGh0dHBzOi8vZ2l0aHViLmNvbS8ke2NvbnRleHQucmVwby5vd25lcn0vJHtjb250ZXh0LnJlcG8ucmVwb30vY29tbWl0LyR7cHIuaGVhZC5zaGF9YCxcblx0XHRcdFx0XHRzaG9ydDogcHIuaGVhZC5zaGEuc3Vic3RyaW5nKDAsIDcpLFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRiYXNlOiB7XG5cdFx0XHRcdFx0c2hhOiBwci5iYXNlLnNoYSxcblx0XHRcdFx0XHR1cmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2NvbW1pdC8ke3ByLmJhc2Uuc2hhfWAsXG5cdFx0XHRcdFx0c2hvcnQ6IHByLmJhc2Uuc2hhLnN1YnN0cmluZygwLCA3KSxcblx0XHRcdFx0fSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGluZm8oJ0pvYiBTdW1tYXJ5IHdyaXR0ZW4nKVxuXG5cdFx0Ly8gU3RlcCA5OiBDcmVhdGUvVXBkYXRlIFBSIGNvbW1lbnRcblx0XHRpbmZvKCfwn5KsIENyZWF0aW5nL3VwZGF0aW5nIFBSIGNvbW1lbnQuLi4nKVxuXG5cdFx0Ly8gQXJ0aWZhY3QgVVJMcyAoR2l0SHViIFVJIGRvd25sb2FkKVxuXHRcdGxldCBhcnRpZmFjdFVybHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cdFx0bGV0IGFydGlmYWN0QmFzZVVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2FjdGlvbnMvcnVucy8ke3J1bklkfS9hcnRpZmFjdHMvJHt1cGxvYWRSZXN1bHQuaWR9YFxuXG5cdFx0Zm9yIChsZXQgZmlsZSBvZiBodG1sRmlsZXMpIHtcblx0XHRcdGFydGlmYWN0VXJscy5zZXQoZmlsZS53b3JrbG9hZCwgYXJ0aWZhY3RCYXNlVXJsKVxuXHRcdH1cblxuXHRcdGxldCBjb21tZW50Qm9keSA9IGdlbmVyYXRlQ29tbWVudEJvZHkoe1xuXHRcdFx0d29ya2xvYWRzOiBjb21wYXJpc29ucyxcblx0XHRcdGFydGlmYWN0VXJscyxcblx0XHRcdGNoZWNrVXJscyxcblx0XHRcdGpvYlN1bW1hcnlVcmw6IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2FjdGlvbnMvcnVucy8ke3J1bklkfWAsXG5cdFx0fSlcblxuXHRcdGxldCBjb21tZW50ID0gYXdhaXQgY3JlYXRlT3JVcGRhdGVDb21tZW50KHRva2VuLCBjb250ZXh0LnJlcG8ub3duZXIsIGNvbnRleHQucmVwby5yZXBvLCBwck51bWJlciwgY29tbWVudEJvZHkpXG5cblx0XHRpbmZvKGBQUiBjb21tZW50OiAke2NvbW1lbnQudXJsfWApXG5cblx0XHRpbmZvKCfinIUgUmVwb3J0IGdlbmVyYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHNldEZhaWxlZChgUmVwb3J0IGdlbmVyYXRpb24gZmFpbGVkOiAke1N0cmluZyhlcnJvcil9YClcblx0XHR0aHJvdyBlcnJvclxuXHR9XG59XG5cbm1haW4oKVxuIiwKICAgICIvKipcbiAqIEFydGlmYWN0cyBkb3dubG9hZCBhbmQgcGFyc2luZ1xuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBkZWJ1ZywgaW5mbywgd2FybmluZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB0eXBlIHsgRG9ja2VyRXZlbnQgfSBmcm9tICcuL2V2ZW50cy5qcydcbmltcG9ydCB7IGZvcm1hdEV2ZW50cywgcGFyc2VFdmVudHNKc29ubCwgdHlwZSBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHsgcGFyc2VNZXRyaWNzSnNvbmwsIHR5cGUgTWV0cmljc01hcCB9IGZyb20gJy4vbWV0cmljcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBXb3JrbG9hZEFydGlmYWN0cyB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0cHVsbE51bWJlcjogbnVtYmVyXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXBcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdGxvZ3NQYXRoPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgQXJ0aWZhY3REb3dubG9hZE9wdGlvbnMge1xuXHR0b2tlbjogc3RyaW5nXG5cdHdvcmtmbG93UnVuSWQ6IG51bWJlclxuXHRyZXBvc2l0b3J5T3duZXI6IHN0cmluZ1xuXHRyZXBvc2l0b3J5TmFtZTogc3RyaW5nXG5cdGRvd25sb2FkUGF0aDogc3RyaW5nXG59XG5cbi8qKlxuICogRG93bmxvYWQgYW5kIHBhcnNlIGFydGlmYWN0cyBmb3IgYSB3b3JrZmxvdyBydW5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkV29ya2xvYWRBcnRpZmFjdHMob3B0aW9uczogQXJ0aWZhY3REb3dubG9hZE9wdGlvbnMpOiBQcm9taXNlPFdvcmtsb2FkQXJ0aWZhY3RzW10+IHtcblx0bGV0IGFydGlmYWN0Q2xpZW50ID0gbmV3IERlZmF1bHRBcnRpZmFjdENsaWVudCgpXG5cblx0aW5mbyhgTGlzdGluZyBhcnRpZmFjdHMgZm9yIHdvcmtmbG93IHJ1biAke29wdGlvbnMud29ya2Zsb3dSdW5JZH0uLi5gKVxuXG5cdGxldCB7IGFydGlmYWN0cyB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQubGlzdEFydGlmYWN0cyh7XG5cdFx0ZmluZEJ5OiB7XG5cdFx0XHR0b2tlbjogb3B0aW9ucy50b2tlbixcblx0XHRcdHdvcmtmbG93UnVuSWQ6IG9wdGlvbnMud29ya2Zsb3dSdW5JZCxcblx0XHRcdHJlcG9zaXRvcnlPd25lcjogb3B0aW9ucy5yZXBvc2l0b3J5T3duZXIsXG5cdFx0XHRyZXBvc2l0b3J5TmFtZTogb3B0aW9ucy5yZXBvc2l0b3J5TmFtZSxcblx0XHR9LFxuXHR9KVxuXG5cdGluZm8oYEZvdW5kICR7YXJ0aWZhY3RzLmxlbmd0aH0gYXJ0aWZhY3RzYClcblx0ZGVidWcoXG5cdFx0YEFydGlmYWN0czogJHtKU09OLnN0cmluZ2lmeShcblx0XHRcdGFydGlmYWN0cy5tYXAoKGEpID0+IGEubmFtZSksXG5cdFx0XHRudWxsLFxuXHRcdFx0MlxuXHRcdCl9YFxuXHQpXG5cblx0Ly8gRG93bmxvYWQgYWxsIGFydGlmYWN0c1xuXHRsZXQgZG93bmxvYWRlZFBhdGhzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXG5cdGZvciAobGV0IGFydGlmYWN0IG9mIGFydGlmYWN0cykge1xuXHRcdGluZm8oYERvd25sb2FkaW5nIGFydGlmYWN0ICR7YXJ0aWZhY3QubmFtZX0uLi5gKVxuXG5cdFx0bGV0IHsgZG93bmxvYWRQYXRoIH0gPSBhd2FpdCBhcnRpZmFjdENsaWVudC5kb3dubG9hZEFydGlmYWN0KGFydGlmYWN0LmlkLCB7XG5cdFx0XHRwYXRoOiBvcHRpb25zLmRvd25sb2FkUGF0aCxcblx0XHRcdGZpbmRCeToge1xuXHRcdFx0XHR0b2tlbjogb3B0aW9ucy50b2tlbixcblx0XHRcdFx0d29ya2Zsb3dSdW5JZDogb3B0aW9ucy53b3JrZmxvd1J1bklkLFxuXHRcdFx0XHRyZXBvc2l0b3J5T3duZXI6IG9wdGlvbnMucmVwb3NpdG9yeU93bmVyLFxuXHRcdFx0XHRyZXBvc2l0b3J5TmFtZTogb3B0aW9ucy5yZXBvc2l0b3J5TmFtZSxcblx0XHRcdH0sXG5cdFx0fSlcblxuXHRcdGxldCBhcnRpZmFjdFBhdGggPSBwYXRoLmpvaW4oZG93bmxvYWRQYXRoIHx8IG9wdGlvbnMuZG93bmxvYWRQYXRoLCBhcnRpZmFjdC5uYW1lKVxuXHRcdGRvd25sb2FkZWRQYXRocy5zZXQoYXJ0aWZhY3QubmFtZSwgYXJ0aWZhY3RQYXRoKVxuXG5cdFx0aW5mbyhgRG93bmxvYWRlZCBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9IHRvICR7YXJ0aWZhY3RQYXRofWApXG5cdH1cblxuXHQvLyBHcm91cCBmaWxlcyBieSB3b3JrbG9hZFxuXHRsZXQgd29ya2xvYWRGaWxlcyA9IG5ldyBNYXA8XG5cdFx0c3RyaW5nLFxuXHRcdHtcblx0XHRcdHB1bGw/OiBzdHJpbmdcblx0XHRcdG1ldHJpY3M/OiBzdHJpbmdcblx0XHRcdGV2ZW50cz86IHN0cmluZ1xuXHRcdFx0bG9ncz86IHN0cmluZ1xuXHRcdH1cblx0PigpXG5cblx0Zm9yIChsZXQgW2FydGlmYWN0TmFtZSwgYXJ0aWZhY3RQYXRoXSBvZiBkb3dubG9hZGVkUGF0aHMpIHtcblx0XHQvLyBBcnRpZmFjdCBuYW1lIGlzIHRoZSB3b3JrbG9hZCBuYW1lLCBmaWxlcyBpbnNpZGUgaGF2ZSB3b3JrbG9hZCBwcmVmaXhcblx0XHRsZXQgd29ya2xvYWQgPSBhcnRpZmFjdE5hbWVcblxuXHRcdC8vIExpc3QgZmlsZXMgaW4gYXJ0aWZhY3QgZGlyZWN0b3J5XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0UGF0aCkpIHtcblx0XHRcdHdhcm5pbmcoYEFydGlmYWN0IHBhdGggZG9lcyBub3QgZXhpc3Q6ICR7YXJ0aWZhY3RQYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoYXJ0aWZhY3RQYXRoKVxuXHRcdGxldCBmaWxlczogc3RyaW5nW10gPSBbXVxuXG5cdFx0aWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuXHRcdFx0ZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhhcnRpZmFjdFBhdGgpLm1hcCgoZikgPT4gcGF0aC5qb2luKGFydGlmYWN0UGF0aCwgZikpXG5cdFx0fSBlbHNlIHtcblx0XHRcdGZpbGVzID0gW2FydGlmYWN0UGF0aF1cblx0XHR9XG5cblx0XHRsZXQgZ3JvdXAgPSB3b3JrbG9hZEZpbGVzLmdldCh3b3JrbG9hZCkgfHwge31cblxuXHRcdGZvciAobGV0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdGxldCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSlcblxuXHRcdFx0aWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctcHVsbC50eHQnKSkge1xuXHRcdFx0XHRncm91cC5wdWxsID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldHJpY3MuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5tZXRyaWNzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWV2ZW50cy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLmV2ZW50cyA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1sb2dzLnR4dCcpKSB7XG5cdFx0XHRcdGdyb3VwLmxvZ3MgPSBmaWxlXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0d29ya2xvYWRGaWxlcy5zZXQod29ya2xvYWQsIGdyb3VwKVxuXHR9XG5cblx0Ly8gUGFyc2Ugd29ya2xvYWQgZGF0YVxuXHRsZXQgd29ya2xvYWRzOiBXb3JrbG9hZEFydGlmYWN0c1tdID0gW11cblxuXHRmb3IgKGxldCBbd29ya2xvYWQsIGZpbGVzXSBvZiB3b3JrbG9hZEZpbGVzKSB7XG5cdFx0aWYgKCFmaWxlcy5wdWxsIHx8ICFmaWxlcy5tZXRyaWNzKSB7XG5cdFx0XHR3YXJuaW5nKGBTa2lwcGluZyBpbmNvbXBsZXRlIHdvcmtsb2FkICR7d29ya2xvYWR9OiBtaXNzaW5nIHJlcXVpcmVkIGZpbGVzYClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBwdWxsTnVtYmVyID0gcGFyc2VJbnQoZnMucmVhZEZpbGVTeW5jKGZpbGVzLnB1bGwsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSkudHJpbSgpKVxuXHRcdFx0bGV0IG1ldHJpY3NDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVzLm1ldHJpY3MsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRcdGxldCBtZXRyaWNzID0gcGFyc2VNZXRyaWNzSnNvbmwobWV0cmljc0NvbnRlbnQpXG5cblx0XHRcdGxldCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10gPSBbXVxuXHRcdFx0aWYgKGZpbGVzLmV2ZW50cyAmJiBmcy5leGlzdHNTeW5jKGZpbGVzLmV2ZW50cykpIHtcblx0XHRcdFx0bGV0IGV2ZW50c0NvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZXMuZXZlbnRzLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRcdGxldCByYXdFdmVudHMgPSBwYXJzZUV2ZW50c0pzb25sKGV2ZW50c0NvbnRlbnQpXG5cdFx0XHRcdGV2ZW50cyA9IGZvcm1hdEV2ZW50cyhyYXdFdmVudHMpXG5cdFx0XHR9XG5cblx0XHRcdHdvcmtsb2Fkcy5wdXNoKHtcblx0XHRcdFx0d29ya2xvYWQsXG5cdFx0XHRcdHB1bGxOdW1iZXIsXG5cdFx0XHRcdG1ldHJpY3MsXG5cdFx0XHRcdGV2ZW50cyxcblx0XHRcdFx0bG9nc1BhdGg6IGZpbGVzLmxvZ3MsXG5cdFx0XHR9KVxuXG5cdFx0XHRpbmZvKGBQYXJzZWQgd29ya2xvYWQgJHt3b3JrbG9hZH06ICR7bWV0cmljcy5zaXplfSBtZXRyaWNzLCAke2V2ZW50cy5sZW5ndGh9IGV2ZW50c2ApXG5cdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdHdhcm5pbmcoYEZhaWxlZCB0byBwYXJzZSB3b3JrbG9hZCAke3dvcmtsb2FkfTogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB3b3JrbG9hZHNcbn1cbiIsCiAgICAiLyoqXG4gKiBEb2NrZXIgZXZlbnRzIHBhcnNpbmcgYW5kIGZvcm1hdHRpbmdcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIERvY2tlckV2ZW50IHtcblx0dGltZTogbnVtYmVyXG5cdEFjdGlvbjogc3RyaW5nXG5cdFR5cGU6IHN0cmluZ1xuXHRBY3Rvcjoge1xuXHRcdElEOiBzdHJpbmdcblx0XHRBdHRyaWJ1dGVzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+XG5cdH1cblx0W2tleTogc3RyaW5nXTogdW5rbm93blxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZvcm1hdHRlZEV2ZW50IHtcblx0dGltZXN0YW1wOiBudW1iZXJcblx0YWN0aW9uOiBzdHJpbmdcblx0dHlwZTogc3RyaW5nXG5cdGxhYmVsOiBzdHJpbmdcblx0aWNvbjogc3RyaW5nXG5cdGNvbG9yOiBzdHJpbmdcblx0YWN0b3I6IHN0cmluZ1xufVxuXG4vKipcbiAqIFBhcnNlIGV2ZW50cyBKU09OTCBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV2ZW50c0pzb25sKGNvbnRlbnQ6IHN0cmluZyk6IERvY2tlckV2ZW50W10ge1xuXHRsZXQgZXZlbnRzOiBEb2NrZXJFdmVudFtdID0gW11cblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IGV2ZW50ID0gSlNPTi5wYXJzZShsaW5lKSBhcyBEb2NrZXJFdmVudFxuXHRcdFx0ZXZlbnRzLnB1c2goZXZlbnQpXG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBTa2lwIGludmFsaWQgbGluZXNcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV2ZW50c1xufVxuXG4vKipcbiAqIEdldCBpY29uIGZvciBldmVudCBhY3Rpb25cbiAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRJY29uKGFjdGlvbjogc3RyaW5nLCBhdHRyaWJ1dGVzPzogUmVjb3JkPHN0cmluZywgc3RyaW5nPik6IHN0cmluZyB7XG5cdGxldCBpY29uczogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHtcblx0XHRwYXVzZTogJ+KPuO+4jycsXG5cdFx0dW5wYXVzZTogJ+KWtu+4jycsXG5cdFx0c3RvcDogJ+KPue+4jycsXG5cdFx0c3RhcnQ6ICfilrbvuI8nLFxuXHRcdHJlc3RhcnQ6ICfwn5SEJyxcblx0XHRkaWU6ICfwn5KkJyxcblx0XHRjcmVhdGU6ICfwn4aVJyxcblx0XHRkZXN0cm95OiAn8J+Xke+4jycsXG5cdH1cblxuXHRpZiAoYWN0aW9uID09PSAna2lsbCcpIHtcblx0XHRyZXR1cm4gYXR0cmlidXRlcz8uc2lnbmFsID09PSAnU0lHS0lMTCcgPyAn8J+SgCcgOiAn4pqhJ1xuXHR9XG5cblx0cmV0dXJuIGljb25zW2FjdGlvbl0gfHwgJ/Cfk4wnXG59XG5cbi8qKlxuICogR2V0IGNvbG9yIGZvciBldmVudCBhY3Rpb25cbiAqL1xuZnVuY3Rpb24gZ2V0RXZlbnRDb2xvcihhY3Rpb246IHN0cmluZyk6IHN0cmluZyB7XG5cdGxldCBjb2xvcnM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7XG5cdFx0cGF1c2U6ICcjZjU5ZTBiJywgLy8gb3JhbmdlXG5cdFx0dW5wYXVzZTogJyMxMGI5ODEnLCAvLyBncmVlblxuXHRcdHN0b3A6ICcjZWY0NDQ0JywgLy8gcmVkXG5cdFx0c3RhcnQ6ICcjMTBiOTgxJywgLy8gZ3JlZW5cblx0XHRraWxsOiAnI2RjMjYyNicsIC8vIGRhcmsgcmVkXG5cdFx0cmVzdGFydDogJyNmNTllMGInLCAvLyBvcmFuZ2Vcblx0XHRkaWU6ICcjNmI3MjgwJywgLy8gZ3JheVxuXHRcdGNyZWF0ZTogJyMzYjgyZjYnLCAvLyBibHVlXG5cdFx0ZGVzdHJveTogJyNlZjQ0NDQnLCAvLyByZWRcblx0fVxuXG5cdHJldHVybiBjb2xvcnNbYWN0aW9uXSB8fCAnIzZiNzI4MCdcbn1cblxuLyoqXG4gKiBGb3JtYXQgZXZlbnQgbGFiZWxcbiAqL1xuZnVuY3Rpb24gZm9ybWF0RXZlbnRMYWJlbChldmVudDogRG9ja2VyRXZlbnQpOiBzdHJpbmcge1xuXHQvLyBUcnkgdG8gZ2V0IGZyaWVuZGx5IG5hbWUgZnJvbSBjb21wb3NlIGxhYmVsc1xuXHRsZXQgbmFtZSA9IGV2ZW50LkFjdG9yLkF0dHJpYnV0ZXMubmFtZSB8fCBldmVudC5BY3Rvci5JRC5zdWJzdHJpbmcoMCwgMTIpXG5cdGxldCBub2RlVHlwZSA9IGV2ZW50LkFjdG9yLkF0dHJpYnV0ZXNbJ3lkYi5ub2RlLnR5cGUnXVxuXHRsZXQgc2VydmljZSA9IGV2ZW50LkFjdG9yLkF0dHJpYnV0ZXNbJ2NvbS5kb2NrZXIuY29tcG9zZS5zZXJ2aWNlJ11cblxuXHQvLyBVc2UgWURCIG5vZGUgdHlwZSBpZiBhdmFpbGFibGUgKGUuZy4sIFwiZGF0YWJhc2VcIiwgXCJzdG9yYWdlXCIpXG5cdGxldCBkaXNwbGF5TmFtZSA9IG5hbWVcblx0aWYgKG5vZGVUeXBlKSB7XG5cdFx0ZGlzcGxheU5hbWUgPSBgJHtub2RlVHlwZX0gKCR7bmFtZX0pYFxuXHR9IGVsc2UgaWYgKHNlcnZpY2UpIHtcblx0XHRkaXNwbGF5TmFtZSA9IHNlcnZpY2Vcblx0fVxuXG5cdGxldCBhY3Rpb24gPSBldmVudC5BY3Rpb25cblxuXHRpZiAoYWN0aW9uID09PSAna2lsbCcgJiYgZXZlbnQuQWN0b3IuQXR0cmlidXRlcy5zaWduYWwpIHtcblx0XHRyZXR1cm4gYCR7YWN0aW9ufSAke2Rpc3BsYXlOYW1lfSAoJHtldmVudC5BY3Rvci5BdHRyaWJ1dGVzLnNpZ25hbH0pYFxuXHR9XG5cblx0cmV0dXJuIGAke2FjdGlvbn0gJHtkaXNwbGF5TmFtZX1gXG59XG5cbi8qKlxuICogRm9ybWF0IGV2ZW50cyBmb3IgdmlzdWFsaXphdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RXZlbnRzKGV2ZW50czogRG9ja2VyRXZlbnRbXSk6IEZvcm1hdHRlZEV2ZW50W10ge1xuXHRyZXR1cm4gZXZlbnRzLm1hcCgoZXZlbnQpID0+ICh7XG5cdFx0dGltZXN0YW1wOiBldmVudC50aW1lLFxuXHRcdGFjdGlvbjogZXZlbnQuQWN0aW9uLFxuXHRcdHR5cGU6IGV2ZW50LlR5cGUsXG5cdFx0bGFiZWw6IGZvcm1hdEV2ZW50TGFiZWwoZXZlbnQpLFxuXHRcdGljb246IGdldEV2ZW50SWNvbihldmVudC5BY3Rpb24sIGV2ZW50LkFjdG9yLkF0dHJpYnV0ZXMpLFxuXHRcdGNvbG9yOiBnZXRFdmVudENvbG9yKGV2ZW50LkFjdGlvbiksXG5cdFx0YWN0b3I6IGV2ZW50LkFjdG9yLkF0dHJpYnV0ZXMubmFtZSB8fCBldmVudC5BY3Rvci5JRC5zdWJzdHJpbmcoMCwgMTIpLFxuXHR9KSlcbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgUFIgY29tbWVudCBnZW5lcmF0aW9uIGFuZCBtYW5hZ2VtZW50XG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgdHlwZSB7IFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWVudERhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGFydGlmYWN0VXJsczogTWFwPHN0cmluZywgc3RyaW5nPlxuXHRjaGVja1VybHM6IE1hcDxzdHJpbmcsIHN0cmluZz5cblx0am9iU3VtbWFyeVVybD86IHN0cmluZ1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIFBSIGNvbW1lbnQgYm9keVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDb21tZW50Qm9keShkYXRhOiBDb21tZW50RGF0YSk6IHN0cmluZyB7XG5cdGxldCB0b3RhbFJlZ3Jlc3Npb25zID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5yZWdyZXNzaW9ucywgMClcblx0bGV0IHRvdGFsSW1wcm92ZW1lbnRzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5pbXByb3ZlbWVudHMsIDApXG5cblx0bGV0IHN0YXR1c0Vtb2ppID0gdG90YWxSZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0bGV0IHN0YXR1c1RleHQgPSB0b3RhbFJlZ3Jlc3Npb25zID4gMCA/IGAke3RvdGFsUmVncmVzc2lvbnN9IHJlZ3Jlc3Npb25zYCA6ICdBbGwgY2xlYXInXG5cblx0bGV0IGhlYWRlciA9IGAjIyDwn4yLIFNMTyBUZXN0IFJlc3VsdHNcblxuKipTdGF0dXMqKjogJHtzdGF0dXNFbW9qaX0gJHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkcyB0ZXN0ZWQg4oCiICR7c3RhdHVzVGV4dH1cblxuJHtkYXRhLmpvYlN1bW1hcnlVcmwgPyBg8J+TiCBbVmlldyBKb2IgU3VtbWFyeV0oJHtkYXRhLmpvYlN1bW1hcnlVcmx9KSBmb3IgZGV0YWlsZWQgY29tcGFyaXNvblxcbmAgOiAnJ31gXG5cblx0bGV0IHRhYmxlID0gYFxufCBXb3JrbG9hZCB8IE1ldHJpY3MgfCBSZWdyZXNzaW9ucyB8IEltcHJvdmVtZW50cyB8IExpbmtzIHxcbnwtLS0tLS0tLS0tfC0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS18XG4ke2RhdGEud29ya2xvYWRzXG5cdC5tYXAoKHcpID0+IHtcblx0XHRsZXQgZW1vamkgPSB3LnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogdy5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDAgPyAn8J+foicgOiAn4pqqJ1xuXHRcdGxldCByZXBvcnRMaW5rID0gZGF0YS5hcnRpZmFjdFVybHMuZ2V0KHcud29ya2xvYWQpIHx8ICcjJ1xuXHRcdGxldCBjaGVja0xpbmsgPSBkYXRhLmNoZWNrVXJscy5nZXQody53b3JrbG9hZCkgfHwgJyMnXG5cblx0XHRyZXR1cm4gYHwgJHtlbW9qaX0gJHt3Lndvcmtsb2FkfSB8ICR7dy5zdW1tYXJ5LnRvdGFsfSB8ICR7dy5zdW1tYXJ5LnJlZ3Jlc3Npb25zfSB8ICR7dy5zdW1tYXJ5LmltcHJvdmVtZW50c30gfCBbUmVwb3J0XSgke3JlcG9ydExpbmt9KSDigKIgW0NoZWNrXSgke2NoZWNrTGlua30pIHxgXG5cdH0pXG5cdC5qb2luKCdcXG4nKX1cbmBcblxuXHRsZXQgZm9vdGVyID0gYFxcbi0tLVxcbipHZW5lcmF0ZWQgYnkgW3lkYi1zbG8tYWN0aW9uXShodHRwczovL2dpdGh1Yi5jb20veWRiLXBsYXRmb3JtL3lkYi1zbG8tYWN0aW9uKSpgXG5cblx0cmV0dXJuIGhlYWRlciArIHRhYmxlICsgZm9vdGVyXG59XG5cbi8qKlxuICogRmluZCBleGlzdGluZyBTTE8gY29tbWVudCBpbiBQUlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEV4aXN0aW5nU0xPQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyXG4pOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXG5cdGluZm8oYFNlYXJjaGluZyBmb3IgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFIgIyR7cHJOdW1iZXJ9Li4uYClcblxuXHRsZXQgeyBkYXRhOiBjb21tZW50cyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdG93bmVyLFxuXHRcdHJlcG8sXG5cdFx0aXNzdWVfbnVtYmVyOiBwck51bWJlcixcblx0fSlcblxuXHRmb3IgKGxldCBjb21tZW50IG9mIGNvbW1lbnRzKSB7XG5cdFx0aWYgKGNvbW1lbnQuYm9keT8uaW5jbHVkZXMoJ/CfjIsgU0xPIFRlc3QgUmVzdWx0cycpKSB7XG5cdFx0XHRpbmZvKGBGb3VuZCBleGlzdGluZyBjb21tZW50OiAke2NvbW1lbnQuaWR9YClcblx0XHRcdHJldHVybiBjb21tZW50LmlkXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBDcmVhdGUgb3IgdXBkYXRlIFBSIGNvbW1lbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZU9yVXBkYXRlQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyLFxuXHRib2R5OiBzdHJpbmdcbik6IFByb21pc2U8eyB1cmw6IHN0cmluZzsgaWQ6IG51bWJlciB9PiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXhpc3RpbmdJZCA9IGF3YWl0IGZpbmRFeGlzdGluZ1NMT0NvbW1lbnQodG9rZW4sIG93bmVyLCByZXBvLCBwck51bWJlcilcblxuXHRpZiAoZXhpc3RpbmdJZCkge1xuXHRcdGluZm8oYFVwZGF0aW5nIGV4aXN0aW5nIGNvbW1lbnQgJHtleGlzdGluZ0lkfS4uLmApXG5cblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLnVwZGF0ZUNvbW1lbnQoe1xuXHRcdFx0b3duZXIsXG5cdFx0XHRyZXBvLFxuXHRcdFx0Y29tbWVudF9pZDogZXhpc3RpbmdJZCxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGluZm8oYENvbW1lbnQgdXBkYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cblx0XHRyZXR1cm4geyB1cmw6IGRhdGEuaHRtbF91cmwhLCBpZDogZGF0YS5pZCB9XG5cdH0gZWxzZSB7XG5cdFx0aW5mbyhgQ3JlYXRpbmcgbmV3IGNvbW1lbnQuLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcblx0XHRcdG93bmVyLFxuXHRcdFx0cmVwbyxcblx0XHRcdGlzc3VlX251bWJlcjogcHJOdW1iZXIsXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRpbmZvKGBDb21tZW50IGNyZWF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogSFRNTCByZXBvcnQgZ2VuZXJhdGlvbiB3aXRoIENoYXJ0LmpzXG4gKi9cblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMsIE1ldHJpY3NNYXAsIFNlcmllcyB9IGZyb20gJy4vbWV0cmljcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBIVE1MUmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXBcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdGNvbW1pdHM6IHtcblx0XHRjdXJyZW50OiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdFx0YmFzZTogeyBzaGE6IHN0cmluZzsgdXJsOiBzdHJpbmc7IHNob3J0OiBzdHJpbmcgfVxuXHR9XG5cdG1ldGE6IHtcblx0XHRwck51bWJlcjogbnVtYmVyXG5cdFx0Z2VuZXJhdGVkQXQ6IHN0cmluZ1xuXHRcdHRlc3REdXJhdGlvbj86IHN0cmluZ1xuXHR9XG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCByZXBvcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSFRNTFJlcG9ydChkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cblx0PG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cblx0PHRpdGxlPlNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L3RpdGxlPlxuXHQ8c3R5bGU+JHtnZXRTdHlsZXMoKX08L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG5cdDxoZWFkZXI+XG5cdFx0PGgxPvCfjIsgU0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvaDE+XG5cdFx0PGRpdiBjbGFzcz1cImNvbW1pdC1pbmZvXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBjdXJyZW50XCI+XG5cdFx0XHRcdEN1cnJlbnQ6IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5jdXJyZW50LnVybH1cIiB0YXJnZXQ9XCJfYmxhbmtcIj4ke2RhdGEuY29tbWl0cy5jdXJyZW50LnNob3J0fTwvYT5cblx0XHRcdDwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwidnNcIj52czwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiY29tbWl0IGJhc2VcIj5cblx0XHRcdFx0QmFzZTogPGEgaHJlZj1cIiR7ZGF0YS5jb21taXRzLmJhc2UudXJsfVwiIHRhcmdldD1cIl9ibGFua1wiPiR7ZGF0YS5jb21taXRzLmJhc2Uuc2hvcnR9PC9hPlxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJtZXRhXCI+XG5cdFx0XHQ8c3Bhbj5QUiAjJHtkYXRhLm1ldGEucHJOdW1iZXJ9PC9zcGFuPlxuXHRcdFx0JHtkYXRhLm1ldGEudGVzdER1cmF0aW9uID8gYDxzcGFuPkR1cmF0aW9uOiAke2RhdGEubWV0YS50ZXN0RHVyYXRpb259PC9zcGFuPmAgOiAnJ31cblx0XHRcdDxzcGFuPkdlbmVyYXRlZDogJHtkYXRhLm1ldGEuZ2VuZXJhdGVkQXR9PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHQ8L2hlYWRlcj5cblxuXHQ8c2VjdGlvbiBjbGFzcz1cInN1bW1hcnlcIj5cblx0XHQ8aDI+8J+TiiBNZXRyaWNzIE92ZXJ2aWV3PC9oMj5cblx0XHQ8ZGl2IGNsYXNzPVwic3RhdHNcIj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmRcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnRvdGFsfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlRvdGFsIE1ldHJpY3M8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCBpbXByb3ZlbWVudHNcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LmltcHJvdmVtZW50c308L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5JbXByb3ZlbWVudHM8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCByZWdyZXNzaW9uc1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkucmVncmVzc2lvbnN9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+UmVncmVzc2lvbnM8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZCBzdGFibGVcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnN0YWJsZX08L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5TdGFibGU8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRcdCR7Z2VuZXJhdGVDb21wYXJpc29uVGFibGUoZGF0YS5jb21wYXJpc29uKX1cblx0PC9zZWN0aW9uPlxuXG5cdDxzZWN0aW9uIGNsYXNzPVwiY2hhcnRzXCI+XG5cdFx0PGgyPvCfk4ggVGltZSBTZXJpZXM8L2gyPlxuXHRcdCR7Z2VuZXJhdGVDaGFydHMoZGF0YSl9XG5cdDwvc2VjdGlvbj5cblxuXHQke2RhdGEuZXZlbnRzLmxlbmd0aCA+IDAgPyBnZW5lcmF0ZUV2ZW50c1NlY3Rpb24oZGF0YS5ldmVudHMpIDogJyd9XG5cblx0PGZvb3Rlcj5cblx0XHQ8cD5HZW5lcmF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb25cIiB0YXJnZXQ9XCJfYmxhbmtcIj55ZGItc2xvLWFjdGlvbjwvYT48L3A+XG5cdDwvZm9vdGVyPlxuXG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydC5qc0A0LjQuMC9kaXN0L2NoYXJ0LnVtZC5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtYWRhcHRlci1kYXRlLWZuc0AzLjAuMC9kaXN0L2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy5idW5kbGUubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uQDMuMC4xL2Rpc3QvY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbi5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdD5cblx0XHQke2dlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGEpfVxuXHQ8L3NjcmlwdD5cbjwvYm9keT5cbjwvaHRtbD5gXG59XG5cbmZ1bmN0aW9uIGVzY2FwZUh0bWwodGV4dDogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHRleHRcblx0XHQucmVwbGFjZSgvJi9nLCAnJmFtcDsnKVxuXHRcdC5yZXBsYWNlKC88L2csICcmbHQ7Jylcblx0XHQucmVwbGFjZSgvPi9nLCAnJmd0OycpXG5cdFx0LnJlcGxhY2UoL1wiL2csICcmcXVvdDsnKVxuXHRcdC5yZXBsYWNlKC8nL2csICcmIzAzOTsnKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24pOiBzdHJpbmcge1xuXHRsZXQgcm93cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5tYXAoXG5cdFx0XHQobSkgPT4gYFxuXHRcdDx0ciBjbGFzcz1cIiR7bS5jaGFuZ2UuZGlyZWN0aW9ufVwiPlxuXHRcdFx0PHRkPiR7ZXNjYXBlSHRtbChtLm5hbWUpfTwvdGQ+XG5cdFx0XHQ8dGQ+JHtmb3JtYXRWYWx1ZShtLmN1cnJlbnQudmFsdWUsIG0ubmFtZSl9PC90ZD5cblx0XHRcdDx0ZD4ke20uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2UudmFsdWUsIG0ubmFtZSkgOiAnTi9BJ308L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2hhbmdlLWNlbGxcIj4ke20uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRDaGFuZ2UobS5jaGFuZ2UucGVyY2VudCwgbS5jaGFuZ2UuZGlyZWN0aW9uKSA6ICdOL0EnfTwvdGQ+XG5cdFx0PC90cj5cblx0YFxuXHRcdClcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHRcdDx0YWJsZSBjbGFzcz1cImNvbXBhcmlzb24tdGFibGVcIj5cblx0XHRcdDx0aGVhZD5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5NZXRyaWM8L3RoPlxuXHRcdFx0XHRcdDx0aD5DdXJyZW50PC90aD5cblx0XHRcdFx0XHQ8dGg+QmFzZTwvdGg+XG5cdFx0XHRcdFx0PHRoPkNoYW5nZTwvdGg+XG5cdFx0XHRcdDwvdHI+XG5cdFx0XHQ8L3RoZWFkPlxuXHRcdFx0PHRib2R5PlxuXHRcdFx0XHQke3Jvd3N9XG5cdFx0XHQ8L3Rib2R5PlxuXHRcdDwvdGFibGU+XG5cdGBcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydHMoZGF0YTogSFRNTFJlcG9ydERhdGEpOiBzdHJpbmcge1xuXHRyZXR1cm4gZGF0YS5jb21wYXJpc29uLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLnR5cGUgPT09ICdyYW5nZScpIC8vIE9ubHkgcmFuZ2UgbWV0cmljcyBoYXZlIGNoYXJ0c1xuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtY2FyZFwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWhlYWRlclwiPlxuXHRcdFx0XHQ8aDM+XG5cdFx0XHRcdFx0JHtlc2NhcGVIdG1sKGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJpbmRpY2F0b3IgJHtjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb259XCI+JHtmb3JtYXRDaGFuZ2UoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCwgY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uKX08L3NwYW4+XG5cdFx0XHRcdDwvaDM+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1tZXRhXCI+XG5cdFx0XHRcdFx0Q3VycmVudDogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmN1cnJlbnQudmFsdWUsIGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0JHtjb21wYXJpc29uLmJhc2UuYXZhaWxhYmxlID8gYCDigKIgQmFzZTogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmJhc2UudmFsdWUsIGNvbXBhcmlzb24ubmFtZSl9YCA6ICcnfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWNvbnRhaW5lclwiPlxuXHRcdFx0XHQ8Y2FudmFzIGlkPVwiY2hhcnQtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+PC9jYW52YXM+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0YFxuXHRcdH0pXG5cdFx0LmpvaW4oJycpXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlRXZlbnRzU2VjdGlvbihldmVudHM6IEZvcm1hdHRlZEV2ZW50W10pOiBzdHJpbmcge1xuXHRsZXQgZXZlbnRzTGlzdCA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSkgPT4gYFxuXHRcdDxkaXYgY2xhc3M9XCJldmVudC1pdGVtXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LW1hcmtlclwiIHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogJHtlLmNvbG9yfVwiPjwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtaWNvblwiPiR7ZS5pY29ufTwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtdGltZVwiPiR7Zm9ybWF0VGltZXN0YW1wKGUudGltZXN0YW1wKX08L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LWxhYmVsXCI+JHtlc2NhcGVIdG1sKGUubGFiZWwpfTwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0YFxuXHRcdClcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHQ8c2VjdGlvbiBjbGFzcz1cImV2ZW50cy1zZWN0aW9uXCI+XG5cdFx0PGgyPvCfk40gRXZlbnRzIFRpbWVsaW5lPC9oMj5cblx0XHQ8ZGl2IGNsYXNzPVwiZXZlbnRzLWxpc3RcIj5cblx0XHRcdCR7ZXZlbnRzTGlzdH1cblx0XHQ8L2Rpdj5cblx0PC9zZWN0aW9uPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGE6IEhUTUxSZXBvcnREYXRhKTogc3RyaW5nIHtcblx0bGV0IGNoYXJ0U2NyaXB0cyA9IGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKVxuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0cmV0dXJuIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoY29tcGFyaXNvbi5uYW1lLCBtZXRyaWMgYXMgQ29sbGVjdGVkTWV0cmljLCBkYXRhLmV2ZW50cylcblx0XHR9KVxuXHRcdC5qb2luKCdcXG4nKVxuXG5cdHJldHVybiBjaGFydFNjcmlwdHNcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTaW5nbGVDaGFydFNjcmlwdChtZXRyaWNOYW1lOiBzdHJpbmcsIG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10pOiBzdHJpbmcge1xuXHRsZXQgY3VycmVudFNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSAnY3VycmVudCcpXG5cdGxldCBiYXNlU2VyaWVzID0gKG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09ICdiYXNlJylcblxuXHRsZXQgY3VycmVudERhdGEgPSBjdXJyZW50U2VyaWVzXG5cdFx0PyBKU09OLnN0cmluZ2lmeShjdXJyZW50U2VyaWVzLnZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdDogJ1tdJ1xuXG5cdGxldCBiYXNlRGF0YSA9IGJhc2VTZXJpZXNcblx0XHQ/IEpTT04uc3RyaW5naWZ5KGJhc2VTZXJpZXMudmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0OiAnW10nXG5cblx0bGV0IGFubm90YXRpb25zID0gZXZlbnRzXG5cdFx0Lm1hcChcblx0XHRcdChlKSA9PiBge1xuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0eE1heDogJHtlLnRpbWVzdGFtcCAqIDEwMDB9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcke2UuY29sb3J9Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdLFxuXHRcdFx0bGFiZWw6IHtcblx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0Y29udGVudDogJyR7ZS5pY29ufScsXG5cdFx0XHRcdHBvc2l0aW9uOiAnc3RhcnQnLFxuXHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcke2UuY29sb3J9Jyxcblx0XHRcdFx0Y29sb3I6ICcjZmZmJyxcblx0XHRcdFx0Zm9udDogeyBzaXplOiAxNCB9LFxuXHRcdFx0XHRwYWRkaW5nOiA0XG5cdFx0XHR9XG5cdFx0fWBcblx0XHQpXG5cdFx0LmpvaW4oJyxcXG4nKVxuXG5cdHJldHVybiBgXG4oZnVuY3Rpb24oKSB7XG5cdGNvbnN0IGN0eCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCdjaGFydC0ke3Nhbml0aXplSWQobWV0cmljTmFtZSl9Jyk7XG5cdGlmICghY3R4KSByZXR1cm47XG5cblx0bmV3IENoYXJ0KGN0eCwge1xuXHRcdHR5cGU6ICdsaW5lJyxcblx0XHRkYXRhOiB7XG5cdFx0XHRkYXRhc2V0czogW1xuXHRcdFx0XHR7XG5cdFx0XHRcdFx0bGFiZWw6ICdDdXJyZW50Jyxcblx0XHRcdFx0XHRkYXRhOiAke2N1cnJlbnREYXRhfSxcblx0XHRcdFx0XHRib3JkZXJDb2xvcjogJyMzYjgyZjYnLFxuXHRcdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMzYjgyZjYyMCcsXG5cdFx0XHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHQke1xuXHRcdFx0XHRcdGJhc2VTZXJpZXNcblx0XHRcdFx0XHRcdD8gYHtcblx0XHRcdFx0XHRsYWJlbDogJ0Jhc2UnLFxuXHRcdFx0XHRcdGRhdGE6ICR7YmFzZURhdGF9LFxuXHRcdFx0XHRcdGJvcmRlckNvbG9yOiAnIzk0YTNiOCcsXG5cdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzk0YTNiODIwJyxcblx0XHRcdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdFx0XHRib3JkZXJEYXNoOiBbNSwgNV0sXG5cdFx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0XHR9YFxuXHRcdFx0XHRcdFx0OiAnJ1xuXHRcdFx0XHR9XG5cdFx0XHRdXG5cdFx0fSxcblx0XHRvcHRpb25zOiB7XG5cdFx0XHRyZXNwb25zaXZlOiB0cnVlLFxuXHRcdFx0bWFpbnRhaW5Bc3BlY3RSYXRpbzogZmFsc2UsXG5cdFx0XHRpbnRlcmFjdGlvbjoge1xuXHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRpbnRlcnNlY3Q6IGZhbHNlXG5cdFx0XHR9LFxuXHRcdFx0c2NhbGVzOiB7XG5cdFx0XHRcdHg6IHtcblx0XHRcdFx0XHR0eXBlOiAndGltZScsXG5cdFx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdFx0dW5pdDogJ21pbnV0ZScsXG5cdFx0XHRcdFx0XHRkaXNwbGF5Rm9ybWF0czoge1xuXHRcdFx0XHRcdFx0XHRtaW51dGU6ICdISDptbSdcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdFx0dGV4dDogJ1RpbWUnXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9LFxuXHRcdFx0XHR5OiB7XG5cdFx0XHRcdFx0YmVnaW5BdFplcm86IGZhbHNlLFxuXHRcdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdFx0dGV4dDogJyR7ZXNjYXBlSnMobWV0cmljTmFtZSl9J1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdHBsdWdpbnM6IHtcblx0XHRcdFx0bGVnZW5kOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRwb3NpdGlvbjogJ3RvcCdcblx0XHRcdFx0fSxcblx0XHRcdFx0dG9vbHRpcDoge1xuXHRcdFx0XHRcdG1vZGU6ICdpbmRleCcsXG5cdFx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRhbm5vdGF0aW9uOiB7XG5cdFx0XHRcdFx0YW5ub3RhdGlvbnM6IFske2Fubm90YXRpb25zfV1cblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblx0fSk7XG59KSgpO1xuYFxufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUlkKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJy0nKVxufVxuXG5mdW5jdGlvbiBlc2NhcGVKcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIikucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAodGltZXN0YW1wOiBudW1iZXIpOiBzdHJpbmcge1xuXHRsZXQgZGF0ZSA9IG5ldyBEYXRlKHRpbWVzdGFtcCAqIDEwMDApXG5cdHJldHVybiBkYXRlLnRvSVNPU3RyaW5nKCkuc3Vic3RyaW5nKDExLCAxOSlcbn1cblxuZnVuY3Rpb24gZ2V0U3R5bGVzKCk6IHN0cmluZyB7XG5cdHJldHVybiBgXG4qIHtcblx0bWFyZ2luOiAwO1xuXHRwYWRkaW5nOiAwO1xuXHRib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuXG5ib2R5IHtcblx0Zm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCAnSGVsdmV0aWNhIE5ldWUnLCBBcmlhbCwgc2Fucy1zZXJpZjtcblx0bGluZS1oZWlnaHQ6IDEuNjtcblx0Y29sb3I6ICMyNDI5MmY7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdHBhZGRpbmc6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Ym9keSB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRjb2xvcjogI2M5ZDFkOTtcblx0fVxufVxuXG5oZWFkZXIge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcblx0cGFkZGluZzogMzBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGhlYWRlciB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuaGVhZGVyIGgxIHtcblx0Zm9udC1zaXplOiAzMnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY29tbWl0LWluZm8ge1xuXHRmb250LXNpemU6IDE2cHg7XG5cdG1hcmdpbi1ib3R0b206IDEwcHg7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTVweDtcblx0ZmxleC13cmFwOiB3cmFwO1xufVxuXG4uY29tbWl0IHtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDE0cHg7XG59XG5cbi5jb21taXQuY3VycmVudCB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uY29tbWl0LmJhc2Uge1xuXHRiYWNrZ3JvdW5kOiAjZGRmNGZmO1xuXHRjb2xvcjogIzA5NjlkYTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tbWl0LmN1cnJlbnQge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTY7XG5cdFx0Y29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LmNvbW1pdC5iYXNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGMyZDZiO1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbi5jb21taXQgYSB7XG5cdGNvbG9yOiBpbmhlcml0O1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5jb21taXQgYTpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG4udnMge1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLm1ldGEge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRnYXA6IDE1cHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuc2VjdGlvbiB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDAgYXV0byA0MHB4O1xufVxuXG5zZWN0aW9uIGgyIHtcblx0Zm9udC1zaXplOiAyNHB4O1xuXHRtYXJnaW4tYm90dG9tOiAyMHB4O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcblx0cGFkZGluZy1ib3R0b206IDEwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0c2VjdGlvbiBoMiB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5zdGF0cyB7XG5cdGRpc3BsYXk6IGdyaWQ7XG5cdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KGF1dG8tZml0LCBtaW5tYXgoMjAwcHgsIDFmcikpO1xuXHRnYXA6IDE1cHg7XG5cdG1hcmdpbi1ib3R0b206IDMwcHg7XG59XG5cbi5zdGF0LWNhcmQge1xuXHRwYWRkaW5nOiAyMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdGJvcmRlcjogMnB4IHNvbGlkICNkMGQ3ZGU7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcbn1cblxuLnN0YXQtY2FyZC5pbXByb3ZlbWVudHMge1xuXHRib3JkZXItY29sb3I6ICMxYTdmMzc7XG59XG5cbi5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRib3JkZXItY29sb3I6ICNjZjIyMmU7XG59XG5cbi5zdGF0LWNhcmQuc3RhYmxlIHtcblx0Ym9yZGVyLWNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5zdGF0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG5cdC5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0XHRib3JkZXItY29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LnN0YXQtY2FyZC5yZWdyZXNzaW9ucyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjZjg1MTQ5O1xuXHR9XG5cdC5zdGF0LWNhcmQuc3RhYmxlIHtcblx0XHRib3JkZXItY29sb3I6ICM4Yjk0OWU7XG5cdH1cbn1cblxuLnN0YXQtdmFsdWUge1xuXHRmb250LXNpemU6IDM2cHg7XG5cdGZvbnQtd2VpZ2h0OiA3MDA7XG5cdG1hcmdpbi1ib3R0b206IDVweDtcbn1cblxuLnN0YXQtbGFiZWwge1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXdlaWdodDogNTAwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB7XG5cdHdpZHRoOiAxMDAlO1xuXHRib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdG92ZXJmbG93OiBoaWRkZW47XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoLFxuLmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRwYWRkaW5nOiAxMnB4IDE2cHg7XG5cdHRleHQtYWxpZ246IGxlZnQ7XG5cdGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoLFxuXHQuY29tcGFyaXNvbi10YWJsZSB0ZCB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0Zm9udC1zaXplOiAxNHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRoIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHR9XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyOmxhc3QtY2hpbGQgdGQge1xuXHRib3JkZXItYm90dG9tOiBub25lO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkMjA7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTIwO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjIwO1xuXHR9XG5cdC5jb21wYXJpc29uLXRhYmxlIHRyLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkMjA7XG5cdH1cbn1cblxuLmNoYW5nZS1jZWxsIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmNoYXJ0LWNhcmQge1xuXHRtYXJnaW4tYm90dG9tOiA0MHB4O1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdHBhZGRpbmc6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNoYXJ0LWNhcmQge1xuXHRcdGJhY2tncm91bmQ6ICMwZDExMTc7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbi5jaGFydC1oZWFkZXIge1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY2hhcnQtaGVhZGVyIGgzIHtcblx0Zm9udC1zaXplOiAxOHB4O1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdGZsZXgtd3JhcDogd3JhcDtcbn1cblxuLmluZGljYXRvciB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4uaW5kaWNhdG9yLmJldHRlciB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uaW5kaWNhdG9yLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTtcblx0Y29sb3I6ICNjZjIyMmU7XG59XG5cbi5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5pbmRpY2F0b3IuYmV0dGVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5pbmRpY2F0b3Iud29yc2Uge1xuXHRcdGJhY2tncm91bmQ6ICM4NjE4MWQ7XG5cdFx0Y29sb3I6ICNmZjdiNzI7XG5cdH1cblx0LmluZGljYXRvci5uZXV0cmFsIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGNvbG9yOiAjOGI5NDllO1xuXHR9XG59XG5cbi5jaGFydC1tZXRhIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0bWFyZ2luLXRvcDogNXB4O1xufVxuXG4uY2hhcnQtY29udGFpbmVyIHtcblx0cG9zaXRpb246IHJlbGF0aXZlO1xuXHRoZWlnaHQ6IDQwMHB4O1xufVxuXG4uZXZlbnRzLXNlY3Rpb24ge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiA0MHB4IGF1dG87XG59XG5cbi5ldmVudHMtbGlzdCB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG5cdGdhcDogMTBweDtcbn1cblxuLmV2ZW50LWl0ZW0ge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdHBhZGRpbmc6IDEwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDZweDtcblx0Ym9yZGVyLWxlZnQ6IDNweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5ldmVudC1pdGVtIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uZXZlbnQtbWFya2VyIHtcblx0d2lkdGg6IDEycHg7XG5cdGhlaWdodDogMTJweDtcblx0Ym9yZGVyLXJhZGl1czogNTAlO1xufVxuXG4uZXZlbnQtaWNvbiB7XG5cdGZvbnQtc2l6ZTogMThweDtcbn1cblxuLmV2ZW50LXRpbWUge1xuXHRmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDE0cHg7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRtaW4td2lkdGg6IDgwcHg7XG59XG5cbi5ldmVudC1sYWJlbCB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0ZmxleDogMTtcbn1cblxuZm9vdGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogNjBweCBhdXRvIDIwcHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0cGFkZGluZy10b3A6IDIwcHg7XG5cdGJvcmRlci10b3A6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGZvb3RlciB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmZvb3RlciBhIHtcblx0Y29sb3I6ICMwOTY5ZGE7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbn1cblxuZm9vdGVyIGE6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIgYSB7XG5cdFx0Y29sb3I6ICM1OGE2ZmY7XG5cdH1cbn1cblxuQG1lZGlhIChtYXgtd2lkdGg6IDc2OHB4KSB7XG5cdGJvZHkge1xuXHRcdHBhZGRpbmc6IDEwcHg7XG5cdH1cblxuXHRoZWFkZXIgaDEge1xuXHRcdGZvbnQtc2l6ZTogMjRweDtcblx0fVxuXG5cdC5jaGFydC1jb250YWluZXIge1xuXHRcdGhlaWdodDogMzAwcHg7XG5cdH1cblxuXHQuc3RhdHMge1xuXHRcdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDIsIDFmcik7XG5cdH1cbn1cbmBcbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgQWN0aW9ucyBKb2IgU3VtbWFyeSBnZW5lcmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgc3VtbWFyeSB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBTdW1tYXJ5RGF0YSB7XG5cdHdvcmtsb2FkczogV29ya2xvYWRDb21wYXJpc29uW11cblx0Y29tbWl0czoge1xuXHRcdGN1cnJlbnQ6IHsgc2hhOiBzdHJpbmc7IHVybDogc3RyaW5nOyBzaG9ydDogc3RyaW5nIH1cblx0XHRiYXNlOiB7IHNoYTogc3RyaW5nOyB1cmw6IHN0cmluZzsgc2hvcnQ6IHN0cmluZyB9XG5cdH1cblx0YXJ0aWZhY3RVcmxzPzogTWFwPHN0cmluZywgc3RyaW5nPlxufVxuXG4vKipcbiAqIFdyaXRlIEpvYiBTdW1tYXJ5IHdpdGggYWxsIHdvcmtsb2Fkc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVKb2JTdW1tYXJ5KGRhdGE6IFN1bW1hcnlEYXRhKTogUHJvbWlzZTx2b2lkPiB7XG5cdHN1bW1hcnkuYWRkSGVhZGluZygn8J+MiyBTTE8gVGVzdCBTdW1tYXJ5JywgMSlcblxuXHQvLyBDb21taXRzIGluZm9cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHA+XG5cdDxzdHJvbmc+Q3VycmVudDo8L3N0cm9uZz4gPGEgaHJlZj1cIiR7ZGF0YS5jb21taXRzLmN1cnJlbnQudXJsfVwiPiR7ZGF0YS5jb21taXRzLmN1cnJlbnQuc2hvcnR9PC9hPlxuXHR2c1xuXHQ8c3Ryb25nPkJhc2U6PC9zdHJvbmc+IDxhIGhyZWY9XCIke2RhdGEuY29tbWl0cy5iYXNlLnVybH1cIj4ke2RhdGEuY29tbWl0cy5iYXNlLnNob3J0fTwvYT5cbjwvcD5cblx0YClcblxuXHRzdW1tYXJ5LmFkZEJyZWFrKClcblxuXHQvLyBPdmVyYWxsIHN0YXRzXG5cdGxldCB0b3RhbE1ldHJpY3MgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnRvdGFsLCAwKVxuXHRsZXQgdG90YWxSZWdyZXNzaW9ucyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkucmVncmVzc2lvbnMsIDApXG5cdGxldCB0b3RhbEltcHJvdmVtZW50cyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkuaW1wcm92ZW1lbnRzLCAwKVxuXHRsZXQgdG90YWxTdGFibGUgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnN0YWJsZSwgMClcblxuXHRzdW1tYXJ5LmFkZFJhdyhgXG48dGFibGU+XG5cdDx0cj5cblx0XHQ8dGQ+PHN0cm9uZz4ke2RhdGEud29ya2xvYWRzLmxlbmd0aH08L3N0cm9uZz4gd29ya2xvYWRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZz4ke3RvdGFsTWV0cmljc308L3N0cm9uZz4gbWV0cmljczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmcgc3R5bGU9XCJjb2xvcjogIzFhN2YzNztcIj4ke3RvdGFsSW1wcm92ZW1lbnRzfTwvc3Ryb25nPiBpbXByb3ZlbWVudHM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICNjZjIyMmU7XCI+JHt0b3RhbFJlZ3Jlc3Npb25zfTwvc3Ryb25nPiByZWdyZXNzaW9uczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmcgc3R5bGU9XCJjb2xvcjogIzZlNzc4MTtcIj4ke3RvdGFsU3RhYmxlfTwvc3Ryb25nPiBzdGFibGU8L3RkPlxuXHQ8L3RyPlxuPC90YWJsZT5cblx0YClcblxuXHRzdW1tYXJ5LmFkZEJyZWFrKClcblxuXHQvLyBFYWNoIHdvcmtsb2FkXG5cdGZvciAobGV0IHdvcmtsb2FkIG9mIGRhdGEud29ya2xvYWRzKSB7XG5cdFx0bGV0IHN0YXR1c0Vtb2ppID0gd29ya2xvYWQuc3VtbWFyeS5yZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0XHRsZXQgYXJ0aWZhY3RVcmwgPSBkYXRhLmFydGlmYWN0VXJscz8uZ2V0KHdvcmtsb2FkLndvcmtsb2FkKVxuXG5cdFx0c3VtbWFyeS5hZGRIZWFkaW5nKGAke3N0YXR1c0Vtb2ppfSAke3dvcmtsb2FkLndvcmtsb2FkfWAsIDMpXG5cblx0XHRpZiAoYXJ0aWZhY3RVcmwpIHtcblx0XHRcdHN1bW1hcnkuYWRkUmF3KGA8cD48YSBocmVmPVwiJHthcnRpZmFjdFVybH1cIj7wn5OKIFZpZXcgZGV0YWlsZWQgSFRNTCByZXBvcnQ8L2E+PC9wPmApXG5cdFx0fVxuXG5cdFx0Ly8gTWV0cmljcyB0YWJsZVxuXHRcdHN1bW1hcnkuYWRkVGFibGUoW1xuXHRcdFx0W1xuXHRcdFx0XHR7IGRhdGE6ICdNZXRyaWMnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQ3VycmVudCcsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdCYXNlJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRcdHsgZGF0YTogJ0NoYW5nZScsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XSxcblx0XHRcdC4uLndvcmtsb2FkLm1ldHJpY3MubWFwKChtKSA9PiBbXG5cdFx0XHRcdG0ubmFtZSxcblx0XHRcdFx0Zm9ybWF0VmFsdWUobS5jdXJyZW50LnZhbHVlLCBtLm5hbWUpLFxuXHRcdFx0XHRtLmJhc2UuYXZhaWxhYmxlID8gZm9ybWF0VmFsdWUobS5iYXNlLnZhbHVlLCBtLm5hbWUpIDogJ04vQScsXG5cdFx0XHRcdG0uYmFzZS5hdmFpbGFibGUgPyBmb3JtYXRDaGFuZ2UobS5jaGFuZ2UucGVyY2VudCwgbS5jaGFuZ2UuZGlyZWN0aW9uKSA6ICdOL0EnLFxuXHRcdFx0XSksXG5cdFx0XSlcblxuXHRcdHN1bW1hcnkuYWRkQnJlYWsoKVxuXHR9XG5cblx0YXdhaXQgc3VtbWFyeS53cml0ZSgpXG59XG5cbi8qKlxuICogQ2xlYXIgZXhpc3Rpbmcgc3VtbWFyeVxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY2xlYXJKb2JTdW1tYXJ5KCk6IFByb21pc2U8dm9pZD4ge1xuXHRzdW1tYXJ5LmVtcHR5QnVmZmVy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QUFBQSxFQUN0QyxPQUFPLElBQUksUUFBUSxPQUFPLE1BQU0sRUFBRSxRQUFRLE1BQU0sS0FBSyxFQUFFLFFBQVEsTUFBTSxNQUFLLEVBQUUsUUFBUSxPQUFPLEtBQUs7QUFBQTtBQUdqRyxTQUFTLGVBQWUsQ0FBQyxXQUEyQjtBQUFBLEVBRW5ELE9BRFcsSUFBSSxLQUFLLFlBQVksSUFBSSxFQUN4QixZQUFZLEVBQUUsVUFBVSxJQUFJLEVBQUU7QUFBQTtBQUczQyxTQUFTLFNBQVMsR0FBVztBQUFBLEVBQzVCLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFB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QUNWO0FBQUEsUUFDRCxDQUFDO0FBQUEsUUFFRCxVQUFVLElBQUksV0FBVyxVQUFVLE1BQU0sR0FBRyxHQUM1QyxrQkFBSyxxQkFBcUIsV0FBVyxhQUFhLE1BQU0sS0FBSztBQUFBLFFBQzVELE9BQU8sT0FBTztBQUFBLFFBQ2YscUJBQVEsOEJBQThCLFdBQVcsYUFBYSxPQUFPLEtBQUssR0FBRztBQUFBO0FBQUEsSUFLL0Usa0JBQUsscUNBQTBCLEdBRS9CLE1BQU0sZ0JBQWdCO0FBQUEsTUFDckIsV0FBVztBQUFBLE1BQ1gsU0FBUztBQUFBLFFBQ1IsU0FBUztBQUFBLFVBQ1IsS0FBSyxHQUFHLEtBQUs7QUFBQSxVQUNiLEtBQUssc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLGVBQWUsR0FBRyxLQUFLO0FBQUEsVUFDckYsT0FBTyxHQUFHLEtBQUssSUFBSSxVQUFVLEdBQUcsQ0FBQztBQUFBLFFBQ2xDO0FBQUEsUUFDQSxNQUFNO0FBQUEsVUFDTCxLQUFLLEdBQUcsS0FBSztBQUFBLFVBQ2IsS0FBSyxzQkFBc0IsdUJBQVEsS0FBSyxTQUFTLHVCQUFRLEtBQUssZUFBZSxHQUFHLEtBQUs7QUFBQSxVQUNyRixPQUFPLEdBQUcsS0FBSyxJQUFJLFVBQVUsR0FBRyxDQUFDO0FBQUEsUUFDbEM7QUFBQSxNQUNEO0FBQUEsSUFDRCxDQUFDLEdBRUQsa0JBQUsscUJBQXFCLEdBRzFCLGtCQUFLLDhDQUFtQztBQUFBLElBR3hDLElBQUksK0JBQWUsSUFBSSxLQUNuQixrQkFBa0Isc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQixtQkFBbUIsYUFBYTtBQUFBLElBRXBJLFNBQVMsUUFBUTtBQUFBLE1BQ2hCLGFBQWEsSUFBSSxLQUFLLFVBQVUsZUFBZTtBQUFBLElBR2hELElBQUksY0FBYyxvQkFBb0I7QUFBQSxNQUNyQyxXQUFXO0FBQUEsTUFDWDtBQUFBLE1BQ0E7QUFBQSxNQUNBLGVBQWUsc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQjtBQUFBLElBQzlGLENBQUMsR0FFRyxVQUFVLE1BQU0sc0JBQXNCLE9BQU8sdUJBQVEsS0FBSyxPQUFPLHVCQUFRLEtBQUssTUFBTSxVQUFVLFdBQVc7QUFBQSxJQUU3RyxrQkFBSyxlQUFlLFFBQVEsS0FBSyxHQUVqQyxrQkFBSyw2Q0FBNEM7QUFBQSxJQUNoRCxPQUFPLE9BQU87QUFBQSxJQUVmLE1BREEsdUJBQVUsNkJBQTZCLE9BQU8sS0FBSyxHQUFHLEdBQ2hEO0FBQUE7QUFBQTtBQUlSLEtBQUs7IiwKICAiZGVidWdJZCI6ICIxNDUwMjEwMDIwOTVEMTc4NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
