import {
  require_github
} from "../main-pk20nx4h.js";
import {
  require_artifact
} from "../main-jyvyvnh7.js";
import {
  __toESM,
  require_core,
  require_exec
} from "../main-vn0vc56g.js";

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
    case "p90":
      return percentile(nums, 0.9);
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
  let series = null;
  if (metric.type === "instant")
    series = metric.data.find((s) => s.metric.ref === ref) || null;
  else
    series = metric.data.find((s) => s.metric.ref === ref) || null;
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
function determineChangeDirection(currentValue, baselineValue, metricDirection, neutralThreshold = 5) {
  if (isNaN(currentValue) || isNaN(baselineValue))
    return "unknown";
  if (Math.abs((currentValue - baselineValue) / baselineValue * 100) < neutralThreshold)
    return "neutral";
  if (metricDirection === "lower_is_better")
    return currentValue < baselineValue ? "better" : "worse";
  if (metricDirection === "higher_is_better")
    return currentValue > baselineValue ? "better" : "worse";
  return "neutral";
}
function compareMetric(metric, currentRef, baselineRef, aggregate = "avg", neutralThreshold) {
  let currentValue = getMetricValue(metric, currentRef, aggregate), baseValue = getMetricValue(metric, baselineRef, aggregate), absolute = currentValue - baseValue, percent = isNaN(baseValue) || baseValue === 0 ? NaN : absolute / baseValue * 100, metricDirection = inferMetricDirection(metric.name), direction = determineChangeDirection(currentValue, baseValue, metricDirection, neutralThreshold), currentAggregates, baselineAggregates;
  if (metric.type === "range")
    currentAggregates = {
      avg: getMetricValue(metric, currentRef, "avg"),
      p50: getMetricValue(metric, currentRef, "p50"),
      p90: getMetricValue(metric, currentRef, "p90"),
      p95: getMetricValue(metric, currentRef, "p95")
    }, baselineAggregates = {
      avg: getMetricValue(metric, baselineRef, "avg"),
      p50: getMetricValue(metric, baselineRef, "p50"),
      p90: getMetricValue(metric, baselineRef, "p90"),
      p95: getMetricValue(metric, baselineRef, "p95")
    };
  return {
    name: metric.name,
    type: metric.type,
    current: {
      value: currentValue,
      available: !isNaN(currentValue),
      aggregates: currentAggregates
    },
    baseline: {
      value: baseValue,
      available: !isNaN(baseValue),
      aggregates: baselineAggregates
    },
    change: {
      absolute,
      percent,
      direction
    }
  };
}
function compareWorkloadMetrics(workload, metrics, currentRef, baselineRef, aggregate = "avg", neutralThreshold) {
  let comparisons = [];
  for (let [_name, metric] of metrics) {
    let comparison = compareMetric(metric, currentRef, baselineRef, aggregate, neutralThreshold);
    comparisons.push(comparison);
  }
  let stable = comparisons.filter((c) => c.change.direction === "neutral").length, regressions = comparisons.filter((c) => c.change.direction === "worse").length, improvements = comparisons.filter((c) => c.change.direction === "better").length;
  return {
    workload,
    metrics: comparisons,
    summary: {
      total: comparisons.length,
      stable,
      regressions,
      improvements
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
function getEventIcon(hasDuration) {
  return hasDuration ? "⏱️" : "\uD83D\uDCCD";
}
function formatEvents(events) {
  return events.map((event) => ({
    icon: getEventIcon(!!event.duration_ms),
    label: event.description,
    timestamp: event.epoch_ms,
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
      else if (basename2.endsWith("-logs.txt"))
        group.logs = file;
      else if (basename2.endsWith("-meta.json"))
        group.meta = file;
      else if (basename2.endsWith("-events.jsonl"))
        group.chaosEvents = file;
      else if (basename2.endsWith("-metrics.jsonl"))
        group.metrics = file;
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
      if (files.chaosEvents && fs.existsSync(files.chaosEvents)) {
        let eventsContent = fs.readFileSync(files.chaosEvents, { encoding: "utf-8" }), rawEvents = parseEventsJsonl(eventsContent);
        events.push(...formatEvents(rawEvents));
      }
      events.sort((a, b) => a.timestamp - b.timestamp);
      let metadata;
      if (files.meta && fs.existsSync(files.meta))
        try {
          let metaContent = fs.readFileSync(files.meta, { encoding: "utf-8" });
          metadata = JSON.parse(metaContent);
        } catch (error) {
          import_core.warning(`Failed to parse metadata for ${workload}: ${String(error)}`);
        }
      workloads.push({
        workload,
        pullNumber,
        metrics,
        events,
        logsPath: files.logs,
        metadata
      });
      let testDuration = metadata ? `${(metadata.duration_ms / 1000).toFixed(0)}s` : "unknown";
      import_core.info(`Parsed workload ${workload}: ${metrics.size} metrics, ${events.length} events (${testDuration} test)`);
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
  if (!comparison.baseline.available)
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
    let metric = data.metrics.get(comparison.name);
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
    let metric = data.metrics.get(comparison.name);
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

// report/lib/summary.ts
var import_core5 = __toESM(require_core(), 1);
async function writeJobSummary(data) {
  import_core5.summary.addHeading("\uD83C\uDF0B SLO Test Summary", 1), import_core5.summary.addRaw(`
<p>
	<strong>Current:</strong> ${data.currentRef}
	vs
	<strong>Baseline:</strong> ${data.baselineRef}
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
        { data: "Baseline", header: !0 },
        { data: "Change", header: !0 }
      ],
      ...workload.metrics.map((m) => [
        m.name,
        formatValue(m.current.value, m.name),
        m.baseline.available ? formatValue(m.baseline.value, m.name) : "N/A",
        m.baseline.available ? formatChange(m.change.percent, m.change.direction) : "N/A"
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
    if (prNumber)
      import_core6.info(`Processing PR #${prNumber}`);
    else
      import_core6.info("No PR associated with this run (non-PR workflow)");
    import_core6.info("⚙️  Loading thresholds configuration...");
    let thresholds = await loadThresholds(import_core6.getInput("thresholds_yaml"), import_core6.getInput("thresholds_yaml_path"));
    import_core6.info(`Loaded thresholds: neutral_change=${thresholds.neutral_change_percent}%`), import_core6.info("\uD83D\uDCCA Analyzing metrics...");
    let comparisons = workloads.map((w) => {
      let currentRef = w.metadata?.workload_current_ref || "current", baselineRef = w.metadata?.workload_baseline_ref || "base";
      return compareWorkloadMetrics(w.workload, w.metrics, currentRef, baselineRef, "avg", thresholds.neutral_change_percent);
    });
    import_core6.info("\uD83D\uDCDD Generating HTML reports...");
    let htmlReportsPath = path3.join(cwd, "reports");
    fs3.mkdirSync(htmlReportsPath, { recursive: !0 });
    let htmlFiles = [];
    for (let i = 0;i < workloads.length; i++) {
      let workload = workloads[i], comparison = comparisons[i], currentRef = workload.metadata?.workload_current_ref || "current", baselineRef = workload.metadata?.workload_baseline_ref || "baseline", htmlData = {
        workload: workload.workload,
        comparison,
        metrics: workload.metrics,
        events: workload.events,
        currentRef,
        baselineRef,
        prNumber: prNumber || 0,
        testStartTime: workload.metadata?.start_epoch_ms || Date.now() - 600000,
        testEndTime: workload.metadata?.end_epoch_ms || Date.now()
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
          sha: import_github3.context.sha,
          workload: comparison,
          thresholds
        });
        checkUrls.set(comparison.workload, check.url), import_core6.info(`Created check for ${comparison.workload}: ${check.url}`);
      } catch (error) {
        import_core6.warning(`Failed to create check for ${comparison.workload}: ${String(error)}`);
      }
    import_core6.info("\uD83D\uDCCB Writing Job Summary...");
    let firstWorkload = workloads[0], summaryCurrentRef = firstWorkload.metadata?.workload_current_ref || "current", summaryBaselineRef = firstWorkload.metadata?.workload_baseline_ref || "baseline";
    if (await writeJobSummary({
      workloads: comparisons,
      currentRef: summaryCurrentRef,
      baselineRef: summaryBaselineRef
    }), import_core6.info("Job Summary written"), prNumber) {
      import_core6.info("\uD83D\uDCAC Creating/updating PR comment...");
      let artifactUrls = /* @__PURE__ */ new Map, artifactBaseUrl = `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/actions/runs/${runId}/artifacts/${uploadResult.id}`;
      for (let file of htmlFiles)
        artifactUrls.set(file.workload, artifactBaseUrl);
      let commentBody = generateCommentBody({
        workloads: comparisons,
        artifactUrls,
        checkUrls,
        jobSummaryUrl: `https://github.com/${import_github3.context.repo.owner}/${import_github3.context.repo.repo}/actions/runs/${runId}`
      }), comment = await createOrUpdateComment(token, import_github3.context.repo.owner, import_github3.context.repo.repo, prNumber, commentBody);
      import_core6.info(`PR comment: ${comment.url}`);
    } else
      import_core6.info("Skipping PR comment (no PR associated with this run)");
    import_core6.info("✅ Report generation completed successfully!");
  } catch (error) {
    throw import_core6.setFailed(`Report generation failed: ${String(error)}`), error;
  }
}
main();

//# debugId=2514D8664AB482D864756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9tZXRyaWNzLnRzIiwgIi4uL3JlcG9ydC9saWIvYW5hbHlzaXMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIiwgIi4uL3JlcG9ydC9saWIvY29tbWVudC50cyIsICIuLi9yZXBvcnQvbGliL2h0bWwudHMiLCAiLi4vcmVwb3J0L2xpYi9zdW1tYXJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgIi8qKlxuICogU0xPIFJlcG9ydCBBY3Rpb24gLSBNYWluIE9yY2hlc3RyYXRvclxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBnZXRJbnB1dCwgaW5mbywgc2V0RmFpbGVkLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmltcG9ydCB7IGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MgfSBmcm9tICcuL2xpYi9hbmFseXNpcy5qcydcbmltcG9ydCB7IGRvd25sb2FkV29ya2xvYWRBcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBjcmVhdGVXb3JrbG9hZENoZWNrIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyB3cml0ZUpvYlN1bW1hcnkgfSBmcm9tICcuL2xpYi9zdW1tYXJ5LmpzJ1xuaW1wb3J0IHsgbG9hZFRocmVzaG9sZHMgfSBmcm9tICcuL2xpYi90aHJlc2hvbGRzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHR0cnkge1xuXHRcdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8tcmVwb3J0cycpXG5cdFx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IGdldElucHV0KCd0b2tlbicpXG5cdFx0bGV0IHJ1bklkID0gcGFyc2VJbnQoZ2V0SW5wdXQoJ2dpdGh1Yl9ydW5faWQnKSB8fCBnZXRJbnB1dCgncnVuX2lkJykgfHwgU3RyaW5nKGNvbnRleHQucnVuSWQpKVxuXG5cdFx0aWYgKCF0b2tlbikge1xuXHRcdFx0c2V0RmFpbGVkKCdnaXRodWJfdG9rZW4gaXMgcmVxdWlyZWQnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblx0XHRpbmZvKGBXb3JraW5nIGRpcmVjdG9yeTogJHtjd2R9YClcblxuXHRcdC8vIFN0ZXAgMTogRG93bmxvYWQgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW5cblx0XHQvLyBOT1RFOiBBcnRpZmFjdHMgYWxyZWFkeSBjb250YWluIGJvdGggY3VycmVudCBhbmQgYmFzZSBzZXJpZXMgKGNvbGxlY3RlZCBpbiBpbml0IGFjdGlvbilcblx0XHRpbmZvKCfwn5OmIERvd25sb2FkaW5nIGFydGlmYWN0cyBmcm9tIGN1cnJlbnQgcnVuLi4uJylcblx0XHRsZXQgd29ya2xvYWRzID0gYXdhaXQgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyh7XG5cdFx0XHR0b2tlbixcblx0XHRcdHdvcmtmbG93UnVuSWQ6IHJ1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRkb3dubG9hZFBhdGg6IGN3ZCxcblx0XHR9KVxuXG5cdFx0aWYgKHdvcmtsb2Fkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHdhcm5pbmcoJ05vIHdvcmtsb2FkIGFydGlmYWN0cyBmb3VuZCBpbiBjdXJyZW50IHJ1bicpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRpbmZvKGBGb3VuZCAke3dvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkczogJHt3b3JrbG9hZHMubWFwKCh3KSA9PiB3Lndvcmtsb2FkKS5qb2luKCcsICcpfWApXG5cblx0XHQvLyBTdGVwIDI6IEdldCBQUiBudW1iZXIgKG9wdGlvbmFsIC0gbWF5IG5vdCBleGlzdCBmb3Igbm9uLVBSIHdvcmtmbG93cylcblx0XHRsZXQgcHJOdW1iZXIgPSB3b3JrbG9hZHNbMF0/LnB1bGxOdW1iZXJcblx0XHRpZiAocHJOdW1iZXIpIHtcblx0XHRcdGluZm8oYFByb2Nlc3NpbmcgUFIgIyR7cHJOdW1iZXJ9YClcblx0XHR9IGVsc2Uge1xuXHRcdFx0aW5mbygnTm8gUFIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcnVuIChub24tUFIgd29ya2Zsb3cpJylcblx0XHR9XG5cblx0XHQvLyBTdGVwIDM6IExvYWQgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uXG5cdFx0aW5mbygn4pqZ77iPICBMb2FkaW5nIHRocmVzaG9sZHMgY29uZmlndXJhdGlvbi4uLicpXG5cdFx0bGV0IHRocmVzaG9sZHMgPSBhd2FpdCBsb2FkVGhyZXNob2xkcyhnZXRJbnB1dCgndGhyZXNob2xkc195YW1sJyksIGdldElucHV0KCd0aHJlc2hvbGRzX3lhbWxfcGF0aCcpKVxuXHRcdGluZm8oYExvYWRlZCB0aHJlc2hvbGRzOiBuZXV0cmFsX2NoYW5nZT0ke3RocmVzaG9sZHMubmV1dHJhbF9jaGFuZ2VfcGVyY2VudH0lYClcblxuXHRcdC8vIFN0ZXAgNDogQW5hbHl6ZSBtZXRyaWNzXG5cdFx0aW5mbygn8J+TiiBBbmFseXppbmcgbWV0cmljcy4uLicpXG5cdFx0bGV0IGNvbXBhcmlzb25zID0gd29ya2xvYWRzLm1hcCgodykgPT4ge1xuXHRcdFx0bGV0IGN1cnJlbnRSZWYgPSB3Lm1ldGFkYXRhPy53b3JrbG9hZF9jdXJyZW50X3JlZiB8fCAnY3VycmVudCdcblx0XHRcdGxldCBiYXNlbGluZVJlZiA9IHcubWV0YWRhdGE/Lndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZSdcblx0XHRcdHJldHVybiBjb21wYXJlV29ya2xvYWRNZXRyaWNzKFxuXHRcdFx0XHR3Lndvcmtsb2FkLFxuXHRcdFx0XHR3Lm1ldHJpY3MsXG5cdFx0XHRcdGN1cnJlbnRSZWYsXG5cdFx0XHRcdGJhc2VsaW5lUmVmLFxuXHRcdFx0XHQnYXZnJyxcblx0XHRcdFx0dGhyZXNob2xkcy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50XG5cdFx0XHQpXG5cdFx0fSlcblxuXHRcdC8vIFN0ZXAgNTogR2VuZXJhdGUgSFRNTCByZXBvcnRzXG5cdFx0aW5mbygn8J+TnSBHZW5lcmF0aW5nIEhUTUwgcmVwb3J0cy4uLicpXG5cblx0XHRsZXQgaHRtbFJlcG9ydHNQYXRoID0gcGF0aC5qb2luKGN3ZCwgJ3JlcG9ydHMnKVxuXHRcdGZzLm1rZGlyU3luYyhodG1sUmVwb3J0c1BhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0XHRsZXQgaHRtbEZpbGVzOiBBcnJheTx7IHdvcmtsb2FkOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9PiA9IFtdXG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHdvcmtsb2Fkcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGV0IHdvcmtsb2FkID0gd29ya2xvYWRzW2ldXG5cdFx0XHRsZXQgY29tcGFyaXNvbiA9IGNvbXBhcmlzb25zW2ldXG5cblx0XHRcdC8vIFVzZSByZWZzIGZyb20gbWV0YWRhdGEgZm9yIGRpc3BsYXlcblx0XHRcdGxldCBjdXJyZW50UmVmID0gd29ya2xvYWQubWV0YWRhdGE/Lndvcmtsb2FkX2N1cnJlbnRfcmVmIHx8ICdjdXJyZW50J1xuXHRcdFx0bGV0IGJhc2VsaW5lUmVmID0gd29ya2xvYWQubWV0YWRhdGE/Lndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZWxpbmUnXG5cblx0XHRcdGxldCBodG1sRGF0YTogSFRNTFJlcG9ydERhdGEgPSB7XG5cdFx0XHRcdHdvcmtsb2FkOiB3b3JrbG9hZC53b3JrbG9hZCxcblx0XHRcdFx0Y29tcGFyaXNvbixcblx0XHRcdFx0bWV0cmljczogd29ya2xvYWQubWV0cmljcyxcblx0XHRcdFx0ZXZlbnRzOiB3b3JrbG9hZC5ldmVudHMsXG5cdFx0XHRcdGN1cnJlbnRSZWYsXG5cdFx0XHRcdGJhc2VsaW5lUmVmLFxuXHRcdFx0XHRwck51bWJlcjogcHJOdW1iZXIgfHwgMCxcblx0XHRcdFx0dGVzdFN0YXJ0VGltZTogd29ya2xvYWQubWV0YWRhdGE/LnN0YXJ0X2Vwb2NoX21zIHx8IERhdGUubm93KCkgLSAxMCAqIDYwICogMTAwMCxcblx0XHRcdFx0dGVzdEVuZFRpbWU6IHdvcmtsb2FkLm1ldGFkYXRhPy5lbmRfZXBvY2hfbXMgfHwgRGF0ZS5ub3coKSxcblx0XHRcdH1cblxuXHRcdFx0bGV0IGh0bWwgPSBnZW5lcmF0ZUhUTUxSZXBvcnQoaHRtbERhdGEpXG5cdFx0XHRsZXQgaHRtbFBhdGggPSBwYXRoLmpvaW4oaHRtbFJlcG9ydHNQYXRoLCBgJHt3b3JrbG9hZC53b3JrbG9hZH0tcmVwb3J0Lmh0bWxgKVxuXG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKGh0bWxQYXRoLCBodG1sLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRodG1sRmlsZXMucHVzaCh7IHdvcmtsb2FkOiB3b3JrbG9hZC53b3JrbG9hZCwgcGF0aDogaHRtbFBhdGggfSlcblxuXHRcdFx0aW5mbyhgR2VuZXJhdGVkIEhUTUwgcmVwb3J0IGZvciAke3dvcmtsb2FkLndvcmtsb2FkfWApXG5cdFx0fVxuXG5cdFx0Ly8gU3RlcCA2OiBVcGxvYWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0c1xuXHRcdGluZm8oJ/Cfk6QgVXBsb2FkaW5nIEhUTUwgcmVwb3J0cy4uLicpXG5cblx0XHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblx0XHRsZXQgdXBsb2FkUmVzdWx0ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQudXBsb2FkQXJ0aWZhY3QoXG5cdFx0XHQnc2xvLXJlcG9ydHMnLFxuXHRcdFx0aHRtbEZpbGVzLm1hcCgoZikgPT4gZi5wYXRoKSxcblx0XHRcdGh0bWxSZXBvcnRzUGF0aCxcblx0XHRcdHtcblx0XHRcdFx0cmV0ZW50aW9uRGF5czogMzAsXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0OiAke3VwbG9hZFJlc3VsdC5pZH1gKVxuXG5cdFx0Ly8gU3RlcCA3OiBDcmVhdGUgR2l0SHViIENoZWNrc1xuXHRcdGluZm8oJ+KchSBDcmVhdGluZyBHaXRIdWIgQ2hlY2tzLi4uJylcblxuXHRcdGxldCBjaGVja1VybHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0XHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsZXQgY2hlY2sgPSBhd2FpdCBjcmVhdGVXb3JrbG9hZENoZWNrKHtcblx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHRcdHNoYTogY29udGV4dC5zaGEsXG5cdFx0XHRcdFx0d29ya2xvYWQ6IGNvbXBhcmlzb24sXG5cdFx0XHRcdFx0dGhyZXNob2xkcyxcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRjaGVja1VybHMuc2V0KGNvbXBhcmlzb24ud29ya2xvYWQsIGNoZWNrLnVybClcblx0XHRcdFx0aW5mbyhgQ3JlYXRlZCBjaGVjayBmb3IgJHtjb21wYXJpc29uLndvcmtsb2FkfTogJHtjaGVjay51cmx9YClcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdHdhcm5pbmcoYEZhaWxlZCB0byBjcmVhdGUgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFN0ZXAgODogV3JpdGUgSm9iIFN1bW1hcnlcblx0XHRpbmZvKCfwn5OLIFdyaXRpbmcgSm9iIFN1bW1hcnkuLi4nKVxuXG5cdFx0Ly8gVXNlIHJlZnMgZnJvbSBmaXJzdCB3b3JrbG9hZCBmb3Igc3VtbWFyeVxuXHRcdGxldCBmaXJzdFdvcmtsb2FkID0gd29ya2xvYWRzWzBdXG5cdFx0bGV0IHN1bW1hcnlDdXJyZW50UmVmID0gZmlyc3RXb3JrbG9hZC5tZXRhZGF0YT8ud29ya2xvYWRfY3VycmVudF9yZWYgfHwgJ2N1cnJlbnQnXG5cdFx0bGV0IHN1bW1hcnlCYXNlbGluZVJlZiA9IGZpcnN0V29ya2xvYWQubWV0YWRhdGE/Lndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZWxpbmUnXG5cblx0XHRhd2FpdCB3cml0ZUpvYlN1bW1hcnkoe1xuXHRcdFx0d29ya2xvYWRzOiBjb21wYXJpc29ucyxcblx0XHRcdGN1cnJlbnRSZWY6IHN1bW1hcnlDdXJyZW50UmVmLFxuXHRcdFx0YmFzZWxpbmVSZWY6IHN1bW1hcnlCYXNlbGluZVJlZixcblx0XHR9KVxuXG5cdFx0aW5mbygnSm9iIFN1bW1hcnkgd3JpdHRlbicpXG5cblx0XHQvLyBTdGVwIDk6IENyZWF0ZS9VcGRhdGUgUFIgY29tbWVudCAob25seSBpZiBQUiBleGlzdHMpXG5cdFx0aWYgKHByTnVtYmVyKSB7XG5cdFx0XHRpbmZvKCfwn5KsIENyZWF0aW5nL3VwZGF0aW5nIFBSIGNvbW1lbnQuLi4nKVxuXG5cdFx0XHQvLyBBcnRpZmFjdCBVUkxzIChHaXRIdWIgVUkgZG93bmxvYWQpXG5cdFx0XHRsZXQgYXJ0aWZhY3RVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRcdFx0bGV0IGFydGlmYWN0QmFzZVVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2FjdGlvbnMvcnVucy8ke3J1bklkfS9hcnRpZmFjdHMvJHt1cGxvYWRSZXN1bHQuaWR9YFxuXG5cdFx0XHRmb3IgKGxldCBmaWxlIG9mIGh0bWxGaWxlcykge1xuXHRcdFx0XHRhcnRpZmFjdFVybHMuc2V0KGZpbGUud29ya2xvYWQsIGFydGlmYWN0QmFzZVVybClcblx0XHRcdH1cblxuXHRcdFx0bGV0IGNvbW1lbnRCb2R5ID0gZ2VuZXJhdGVDb21tZW50Qm9keSh7XG5cdFx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRcdGFydGlmYWN0VXJscyxcblx0XHRcdFx0Y2hlY2tVcmxzLFxuXHRcdFx0XHRqb2JTdW1tYXJ5VXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH1gLFxuXHRcdFx0fSlcblxuXHRcdFx0bGV0IGNvbW1lbnQgPSBhd2FpdCBjcmVhdGVPclVwZGF0ZUNvbW1lbnQoXG5cdFx0XHRcdHRva2VuLFxuXHRcdFx0XHRjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRcdGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHRwck51bWJlcixcblx0XHRcdFx0Y29tbWVudEJvZHlcblx0XHRcdClcblxuXHRcdFx0aW5mbyhgUFIgY29tbWVudDogJHtjb21tZW50LnVybH1gKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpbmZvKCdTa2lwcGluZyBQUiBjb21tZW50IChubyBQUiBhc3NvY2lhdGVkIHdpdGggdGhpcyBydW4pJylcblx0XHR9XG5cblx0XHRpbmZvKCfinIUgUmVwb3J0IGdlbmVyYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHNldEZhaWxlZChgUmVwb3J0IGdlbmVyYXRpb24gZmFpbGVkOiAke1N0cmluZyhlcnJvcil9YClcblx0XHR0aHJvdyBlcnJvclxuXHR9XG59XG5cbm1haW4oKVxuIiwKICAgICIvKipcbiAqIE1ldHJpY3MgcGFyc2luZyBhbmQgdHlwZXMgZm9yIHJlcG9ydCBhY3Rpb25cbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcmllcyB7XG5cdG1ldHJpYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR2YWx1ZXM6IFtudW1iZXIsIHN0cmluZ11bXSAvLyBbdGltZXN0YW1wIChzZWMpLCB2YWx1ZSAoZmxvYXQpXVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluc3RhbnRTZXJpZXMge1xuXHRtZXRyaWM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0dmFsdWU6IFtudW1iZXIsIHN0cmluZ10gLy8gW3RpbWVzdGFtcCAoc2VjKSwgdmFsdWUgKGZsb2F0KV1cbn1cblxuLyoqXG4gKiBDb2xsZWN0ZWQgbWV0cmljIGZyb20gaW5pdCBhY3Rpb24gKEpTT05MIGZvcm1hdClcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0ZWRNZXRyaWMge1xuXHRuYW1lOiBzdHJpbmdcblx0cXVlcnk6IHN0cmluZ1xuXHR0eXBlOiAncmFuZ2UnIHwgJ2luc3RhbnQnXG5cdGRhdGE6IFNlcmllc1tdIHwgSW5zdGFudFNlcmllc1tdXG59XG5cbi8qKlxuICogUGFyc2VkIG1ldHJpY3MgYnkgbmFtZVxuICovXG5leHBvcnQgdHlwZSBNZXRyaWNzTWFwID0gTWFwPHN0cmluZywgQ29sbGVjdGVkTWV0cmljPlxuXG4vKipcbiAqIFBhcnNlIEpTT05MIG1ldHJpY3MgZmlsZSBpbnRvIE1ldHJpY3NNYXBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWV0cmljc0pzb25sKGNvbnRlbnQ6IHN0cmluZyk6IE1ldHJpY3NNYXAge1xuXHRsZXQgbWV0cmljcyA9IG5ldyBNYXA8c3RyaW5nLCBDb2xsZWN0ZWRNZXRyaWM+KClcblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IG1ldHJpYyA9IEpTT04ucGFyc2UobGluZSkgYXMgQ29sbGVjdGVkTWV0cmljXG5cdFx0XHRtZXRyaWNzLnNldChtZXRyaWMubmFtZSwgbWV0cmljKVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gU2tpcCBpbnZhbGlkIGxpbmVzXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBtZXRyaWNzXG59XG5cbi8qKlxuICogU2VwYXJhdGUgc2VyaWVzIGJ5IHJlZiBsYWJlbCAoY3VycmVudCB2cyBiYXNlKVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcGFyYXRlZFNlcmllcyB7XG5cdGN1cnJlbnQ6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsXG5cdGJhc2VsaW5lOiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VwYXJhdGVCeVJlZihtZXRyaWM6IENvbGxlY3RlZE1ldHJpYywgY3VycmVudFJlZjogc3RyaW5nLCBiYXNlbGluZVJlZjogc3RyaW5nKTogU2VwYXJhdGVkU2VyaWVzIHtcblx0bGV0IGN1cnJlbnQ6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXHRsZXQgYmFzZWxpbmU6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXG5cdGlmIChtZXRyaWMudHlwZSA9PT0gJ2luc3RhbnQnKSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBJbnN0YW50U2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpIHx8IG51bGxcblx0XHRiYXNlbGluZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSBiYXNlbGluZVJlZikgfHwgbnVsbFxuXHR9IGVsc2Uge1xuXHRcdGxldCBkYXRhID0gbWV0cmljLmRhdGEgYXMgU2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpIHx8IG51bGxcblx0XHRiYXNlbGluZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSBiYXNlbGluZVJlZikgfHwgbnVsbFxuXHR9XG5cblx0cmV0dXJuIHsgY3VycmVudCwgYmFzZWxpbmUgfVxufVxuXG4vKipcbiAqIEFnZ3JlZ2F0ZSBmdW5jdGlvbiB0eXBlIGZvciByYW5nZSBtZXRyaWNzXG4gKi9cbmV4cG9ydCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uID1cblx0fCAnbGFzdCdcblx0fCAnZmlyc3QnXG5cdHwgJ2F2Zydcblx0fCAnbWluJ1xuXHR8ICdtYXgnXG5cdHwgJ3A1MCdcblx0fCAncDkwJ1xuXHR8ICdwOTUnXG5cdHwgJ3A5OSdcblx0fCAnc3VtJ1xuXHR8ICdjb3VudCdcblxuLyoqXG4gKiBDYWxjdWxhdGUgcGVyY2VudGlsZVxuICovXG5mdW5jdGlvbiBwZXJjZW50aWxlKHZhbHVlczogbnVtYmVyW10sIHA6IG51bWJlcik6IG51bWJlciB7XG5cdGxldCBzb3J0ZWQgPSBbLi4udmFsdWVzXS5zb3J0KChhLCBiKSA9PiBhIC0gYilcblx0bGV0IGluZGV4ID0gTWF0aC5jZWlsKHNvcnRlZC5sZW5ndGggKiBwKSAtIDFcblx0cmV0dXJuIHNvcnRlZFtNYXRoLm1heCgwLCBpbmRleCldXG59XG5cbi8qKlxuICogQWdncmVnYXRlIHJhbmdlIG1ldHJpYyB2YWx1ZXMgdXNpbmcgc3BlY2lmaWVkIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZ2dyZWdhdGVWYWx1ZXModmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10sIGZuOiBBZ2dyZWdhdGVGdW5jdGlvbik6IG51bWJlciB7XG5cdGlmICh2YWx1ZXMubGVuZ3RoID09PSAwKSByZXR1cm4gTmFOXG5cblx0bGV0IG51bXMgPSB2YWx1ZXMubWFwKChbXywgdl0pID0+IHBhcnNlRmxvYXQodikpLmZpbHRlcigobikgPT4gIWlzTmFOKG4pKVxuXG5cdGlmIChudW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIE5hTlxuXG5cdHN3aXRjaCAoZm4pIHtcblx0XHRjYXNlICdsYXN0Jzpcblx0XHRcdHJldHVybiBudW1zW251bXMubGVuZ3RoIC0gMV1cblx0XHRjYXNlICdmaXJzdCc6XG5cdFx0XHRyZXR1cm4gbnVtc1swXVxuXHRcdGNhc2UgJ2F2Zyc6XG5cdFx0XHRyZXR1cm4gbnVtcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIG51bXMubGVuZ3RoXG5cdFx0Y2FzZSAnbWluJzpcblx0XHRcdHJldHVybiBNYXRoLm1pbiguLi5udW1zKVxuXHRcdGNhc2UgJ21heCc6XG5cdFx0XHRyZXR1cm4gTWF0aC5tYXgoLi4ubnVtcylcblx0XHRjYXNlICdwNTAnOlxuXHRcdFx0cmV0dXJuIHBlcmNlbnRpbGUobnVtcywgMC41KVxuXHRcdGNhc2UgJ3A5MCc6XG5cdFx0XHRyZXR1cm4gcGVyY2VudGlsZShudW1zLCAwLjkpXG5cdFx0Y2FzZSAncDk1Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTUpXG5cdFx0Y2FzZSAncDk5Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTkpXG5cdFx0Y2FzZSAnc3VtJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApXG5cdFx0Y2FzZSAnY291bnQnOlxuXHRcdFx0cmV0dXJuIG51bXMubGVuZ3RoXG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiBOYU5cblx0fVxufVxuXG4vKipcbiAqIEdldCBzaW5nbGUgdmFsdWUgZnJvbSBtZXRyaWMgKGluc3RhbnQgb3IgYWdncmVnYXRlZCByYW5nZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldHJpY1ZhbHVlKG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLCByZWY6IHN0cmluZywgYWdncmVnYXRlOiBBZ2dyZWdhdGVGdW5jdGlvbiA9ICdhdmcnKTogbnVtYmVyIHtcblx0bGV0IHNlcmllczogU2VyaWVzIHwgSW5zdGFudFNlcmllcyB8IG51bGwgPSBudWxsXG5cblx0aWYgKG1ldHJpYy50eXBlID09PSAnaW5zdGFudCcpIHtcblx0XHRsZXQgZGF0YSA9IG1ldHJpYy5kYXRhIGFzIEluc3RhbnRTZXJpZXNbXVxuXHRcdHNlcmllcyA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSByZWYpIHx8IG51bGxcblx0fSBlbHNlIHtcblx0XHRsZXQgZGF0YSA9IG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdXG5cdFx0c2VyaWVzID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IHJlZikgfHwgbnVsbFxuXHR9XG5cblx0aWYgKCFzZXJpZXMpIHJldHVybiBOYU5cblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdpbnN0YW50Jykge1xuXHRcdGxldCBpbnN0YW50U2VyaWVzID0gc2VyaWVzIGFzIEluc3RhbnRTZXJpZXNcblx0XHRyZXR1cm4gcGFyc2VGbG9hdChpbnN0YW50U2VyaWVzLnZhbHVlWzFdKVxuXHR9IGVsc2Uge1xuXHRcdGxldCByYW5nZVNlcmllcyA9IHNlcmllcyBhcyBTZXJpZXNcblx0XHRyZXR1cm4gYWdncmVnYXRlVmFsdWVzKHJhbmdlU2VyaWVzLnZhbHVlcywgYWdncmVnYXRlKVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogTWV0cmljcyBhbmFseXNpcyBhbmQgY29tcGFyaXNvblxuICovXG5cbmltcG9ydCB7IGdldE1ldHJpY1ZhbHVlLCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uLCB0eXBlIENvbGxlY3RlZE1ldHJpYywgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0NvbXBhcmlzb24ge1xuXHRuYW1lOiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRjdXJyZW50OiB7XG5cdFx0dmFsdWU6IG51bWJlciAvLyBhdmcgYnkgZGVmYXVsdCBmb3IgYmFja3dhcmQgY29tcGF0XG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdFx0YWdncmVnYXRlcz86IHtcblx0XHRcdGF2ZzogbnVtYmVyXG5cdFx0XHRwNTA6IG51bWJlclxuXHRcdFx0cDkwOiBudW1iZXJcblx0XHRcdHA5NTogbnVtYmVyXG5cdFx0fVxuXHR9XG5cdGJhc2VsaW5lOiB7XG5cdFx0dmFsdWU6IG51bWJlciAvLyBhdmcgYnkgZGVmYXVsdCBmb3IgYmFja3dhcmQgY29tcGF0XG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdFx0YWdncmVnYXRlcz86IHtcblx0XHRcdGF2ZzogbnVtYmVyXG5cdFx0XHRwNTA6IG51bWJlclxuXHRcdFx0cDkwOiBudW1iZXJcblx0XHRcdHA5NTogbnVtYmVyXG5cdFx0fVxuXHR9XG5cdGNoYW5nZToge1xuXHRcdGFic29sdXRlOiBudW1iZXJcblx0XHRwZXJjZW50OiBudW1iZXJcblx0XHRkaXJlY3Rpb246ICdiZXR0ZXInIHwgJ3dvcnNlJyB8ICduZXV0cmFsJyB8ICd1bmtub3duJ1xuXHR9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya2xvYWRDb21wYXJpc29uIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRtZXRyaWNzOiBNZXRyaWNDb21wYXJpc29uW11cblx0c3VtbWFyeToge1xuXHRcdHRvdGFsOiBudW1iZXJcblx0XHRyZWdyZXNzaW9uczogbnVtYmVyXG5cdFx0aW1wcm92ZW1lbnRzOiBudW1iZXJcblx0XHRzdGFibGU6IG51bWJlclxuXHR9XG59XG5cbi8qKlxuICogSW5mZXIgbWV0cmljIGRpcmVjdGlvbiBiYXNlZCBvbiBuYW1lXG4gKi9cbmZ1bmN0aW9uIGluZmVyTWV0cmljRGlyZWN0aW9uKG5hbWU6IHN0cmluZyk6ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnIHtcblx0bGV0IGxvd2VyTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuXG5cdC8vIExvd2VyIGlzIGJldHRlclxuXHRpZiAoXG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdsYXRlbmN5JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2R1cmF0aW9uJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3RpbWUnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZGVsYXknKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZXJyb3InKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZmFpbHVyZScpXG5cdCkge1xuXHRcdHJldHVybiAnbG93ZXJfaXNfYmV0dGVyJ1xuXHR9XG5cblx0Ly8gSGlnaGVyIGlzIGJldHRlclxuXHRpZiAoXG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdhdmFpbGFiaWxpdHknKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGhyb3VnaHB1dCcpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdzdWNjZXNzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3FwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdycHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnb3BzJylcblx0KSB7XG5cdFx0cmV0dXJuICdoaWdoZXJfaXNfYmV0dGVyJ1xuXHR9XG5cblx0cmV0dXJuICduZXV0cmFsJ1xufVxuXG4vKipcbiAqIERldGVybWluZSBjaGFuZ2UgZGlyZWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGRldGVybWluZUNoYW5nZURpcmVjdGlvbihcblx0Y3VycmVudFZhbHVlOiBudW1iZXIsXG5cdGJhc2VsaW5lVmFsdWU6IG51bWJlcixcblx0bWV0cmljRGlyZWN0aW9uOiAnbG93ZXJfaXNfYmV0dGVyJyB8ICdoaWdoZXJfaXNfYmV0dGVyJyB8ICduZXV0cmFsJyxcblx0bmV1dHJhbFRocmVzaG9sZDogbnVtYmVyID0gNS4wXG4pOiAnYmV0dGVyJyB8ICd3b3JzZScgfCAnbmV1dHJhbCcgfCAndW5rbm93bicge1xuXHRpZiAoaXNOYU4oY3VycmVudFZhbHVlKSB8fCBpc05hTihiYXNlbGluZVZhbHVlKSkge1xuXHRcdHJldHVybiAndW5rbm93bidcblx0fVxuXG5cdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoKChjdXJyZW50VmFsdWUgLSBiYXNlbGluZVZhbHVlKSAvIGJhc2VsaW5lVmFsdWUpICogMTAwKVxuXG5cdC8vIENvbnNpZGVyIGNoYW5nZSBiZWxvdyB0aHJlc2hvbGQgYXMgc3RhYmxlL25ldXRyYWxcblx0aWYgKGNoYW5nZVBlcmNlbnQgPCBuZXV0cmFsVGhyZXNob2xkKSB7XG5cdFx0cmV0dXJuICduZXV0cmFsJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2xvd2VyX2lzX2JldHRlcicpIHtcblx0XHRyZXR1cm4gY3VycmVudFZhbHVlIDwgYmFzZWxpbmVWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2hpZ2hlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA+IGJhc2VsaW5lVmFsdWUgPyAnYmV0dGVyJyA6ICd3b3JzZSdcblx0fVxuXG5cdHJldHVybiAnbmV1dHJhbCdcbn1cblxuLyoqXG4gKiBDb21wYXJlIHNpbmdsZSBtZXRyaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVNZXRyaWMoXG5cdG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLFxuXHRjdXJyZW50UmVmOiBzdHJpbmcsXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmcsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJyxcblx0bmV1dHJhbFRocmVzaG9sZD86IG51bWJlclxuKTogTWV0cmljQ29tcGFyaXNvbiB7XG5cdGxldCBjdXJyZW50VmFsdWUgPSBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsIGN1cnJlbnRSZWYsIGFnZ3JlZ2F0ZSlcblx0bGV0IGJhc2VWYWx1ZSA9IGdldE1ldHJpY1ZhbHVlKG1ldHJpYywgYmFzZWxpbmVSZWYsIGFnZ3JlZ2F0ZSlcblxuXHRsZXQgYWJzb2x1dGUgPSBjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWVcblx0bGV0IHBlcmNlbnQgPSBpc05hTihiYXNlVmFsdWUpIHx8IGJhc2VWYWx1ZSA9PT0gMCA/IE5hTiA6IChhYnNvbHV0ZSAvIGJhc2VWYWx1ZSkgKiAxMDBcblxuXHRsZXQgbWV0cmljRGlyZWN0aW9uID0gaW5mZXJNZXRyaWNEaXJlY3Rpb24obWV0cmljLm5hbWUpXG5cdGxldCBkaXJlY3Rpb24gPSBkZXRlcm1pbmVDaGFuZ2VEaXJlY3Rpb24oY3VycmVudFZhbHVlLCBiYXNlVmFsdWUsIG1ldHJpY0RpcmVjdGlvbiwgbmV1dHJhbFRocmVzaG9sZClcblxuXHQvLyBDYWxjdWxhdGUgbXVsdGlwbGUgYWdncmVnYXRlcyBmb3IgcmFuZ2UgbWV0cmljc1xuXHRsZXQgY3VycmVudEFnZ3JlZ2F0ZXM6IHsgYXZnOiBudW1iZXI7IHA1MDogbnVtYmVyOyBwOTA6IG51bWJlcjsgcDk1OiBudW1iZXIgfSB8IHVuZGVmaW5lZFxuXHRsZXQgYmFzZWxpbmVBZ2dyZWdhdGVzOiB7IGF2ZzogbnVtYmVyOyBwNTA6IG51bWJlcjsgcDkwOiBudW1iZXI7IHA5NTogbnVtYmVyIH0gfCB1bmRlZmluZWRcblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdyYW5nZScpIHtcblx0XHRjdXJyZW50QWdncmVnYXRlcyA9IHtcblx0XHRcdGF2ZzogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBjdXJyZW50UmVmLCAnYXZnJyksXG5cdFx0XHRwNTA6IGdldE1ldHJpY1ZhbHVlKG1ldHJpYywgY3VycmVudFJlZiwgJ3A1MCcpLFxuXHRcdFx0cDkwOiBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsIGN1cnJlbnRSZWYsICdwOTAnKSxcblx0XHRcdHA5NTogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBjdXJyZW50UmVmLCAncDk1JyksXG5cdFx0fVxuXHRcdGJhc2VsaW5lQWdncmVnYXRlcyA9IHtcblx0XHRcdGF2ZzogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBiYXNlbGluZVJlZiwgJ2F2ZycpLFxuXHRcdFx0cDUwOiBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsIGJhc2VsaW5lUmVmLCAncDUwJyksXG5cdFx0XHRwOTA6IGdldE1ldHJpY1ZhbHVlKG1ldHJpYywgYmFzZWxpbmVSZWYsICdwOTAnKSxcblx0XHRcdHA5NTogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBiYXNlbGluZVJlZiwgJ3A5NScpLFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bmFtZTogbWV0cmljLm5hbWUsXG5cdFx0dHlwZTogbWV0cmljLnR5cGUsXG5cdFx0Y3VycmVudDoge1xuXHRcdFx0dmFsdWU6IGN1cnJlbnRWYWx1ZSxcblx0XHRcdGF2YWlsYWJsZTogIWlzTmFOKGN1cnJlbnRWYWx1ZSksXG5cdFx0XHRhZ2dyZWdhdGVzOiBjdXJyZW50QWdncmVnYXRlcyxcblx0XHR9LFxuXHRcdGJhc2VsaW5lOiB7XG5cdFx0XHR2YWx1ZTogYmFzZVZhbHVlLFxuXHRcdFx0YXZhaWxhYmxlOiAhaXNOYU4oYmFzZVZhbHVlKSxcblx0XHRcdGFnZ3JlZ2F0ZXM6IGJhc2VsaW5lQWdncmVnYXRlcyxcblx0XHR9LFxuXHRcdGNoYW5nZToge1xuXHRcdFx0YWJzb2x1dGUsXG5cdFx0XHRwZXJjZW50LFxuXHRcdFx0ZGlyZWN0aW9uLFxuXHRcdH0sXG5cdH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIGFsbCBtZXRyaWNzIGluIGEgd29ya2xvYWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MoXG5cdHdvcmtsb2FkOiBzdHJpbmcsXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXAsXG5cdGN1cnJlbnRSZWY6IHN0cmluZyxcblx0YmFzZWxpbmVSZWY6IHN0cmluZyxcblx0YWdncmVnYXRlOiBBZ2dyZWdhdGVGdW5jdGlvbiA9ICdhdmcnLFxuXHRuZXV0cmFsVGhyZXNob2xkPzogbnVtYmVyXG4pOiBXb3JrbG9hZENvbXBhcmlzb24ge1xuXHRsZXQgY29tcGFyaXNvbnM6IE1ldHJpY0NvbXBhcmlzb25bXSA9IFtdXG5cblx0Zm9yIChsZXQgW19uYW1lLCBtZXRyaWNdIG9mIG1ldHJpY3MpIHtcblx0XHRsZXQgY29tcGFyaXNvbiA9IGNvbXBhcmVNZXRyaWMobWV0cmljLCBjdXJyZW50UmVmLCBiYXNlbGluZVJlZiwgYWdncmVnYXRlLCBuZXV0cmFsVGhyZXNob2xkKVxuXHRcdGNvbXBhcmlzb25zLnB1c2goY29tcGFyaXNvbilcblx0fVxuXG5cdC8vIENhbGN1bGF0ZSBzdW1tYXJ5XG5cdGxldCBzdGFibGUgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ25ldXRyYWwnKS5sZW5ndGhcblx0bGV0IHJlZ3Jlc3Npb25zID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICd3b3JzZScpLmxlbmd0aFxuXHRsZXQgaW1wcm92ZW1lbnRzID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICdiZXR0ZXInKS5sZW5ndGhcblxuXHRyZXR1cm4ge1xuXHRcdHdvcmtsb2FkLFxuXHRcdG1ldHJpY3M6IGNvbXBhcmlzb25zLFxuXHRcdHN1bW1hcnk6IHtcblx0XHRcdHRvdGFsOiBjb21wYXJpc29ucy5sZW5ndGgsXG5cdFx0XHRzdGFibGUsXG5cdFx0XHRyZWdyZXNzaW9ucyxcblx0XHRcdGltcHJvdmVtZW50cyxcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogRm9ybWF0IHZhbHVlIHdpdGggdW5pdCBpbmZlcmVuY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHZhbHVlOiBudW1iZXIsIG1ldHJpY05hbWU6IHN0cmluZyk6IHN0cmluZyB7XG5cdGlmIChpc05hTih2YWx1ZSkpIHJldHVybiAnTi9BJ1xuXG5cdGxldCBsb3dlck5hbWUgPSBtZXRyaWNOYW1lLnRvTG93ZXJDYXNlKClcblxuXHQvLyBMYXRlbmN5L2R1cmF0aW9uIChtcylcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygnbGF0ZW5jeScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fCBsb3dlck5hbWUuZW5kc1dpdGgoJ19tcycpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9bXNgXG5cdH1cblxuXHQvLyBUaW1lIChzZWNvbmRzKVxuXHRpZiAobG93ZXJOYW1lLmluY2x1ZGVzKCd0aW1lJykgJiYgbG93ZXJOYW1lLmVuZHNXaXRoKCdfcycpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9c2Bcblx0fVxuXG5cdC8vIFBlcmNlbnRhZ2Vcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygnYXZhaWxhYmlsaXR5JykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdwZXJjZW50JykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdyYXRlJykpIHtcblx0XHRyZXR1cm4gYCR7dmFsdWUudG9GaXhlZCgyKX0lYFxuXHR9XG5cblx0Ly8gVGhyb3VnaHB1dFxuXHRpZiAoXG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aHJvdWdocHV0JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3FwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdycHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnb3BzJylcblx0KSB7XG5cdFx0aWYgKHZhbHVlID49IDEwMDApIHtcblx0XHRcdHJldHVybiBgJHsodmFsdWUgLyAxMDAwKS50b0ZpeGVkKDIpfWsvc2Bcblx0XHR9XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMCl9L3NgXG5cdH1cblxuXHQvLyBEZWZhdWx0OiAyIGRlY2ltYWwgcGxhY2VzXG5cdHJldHVybiB2YWx1ZS50b0ZpeGVkKDIpXG59XG5cbi8qKlxuICogRm9ybWF0IGNoYW5nZSBwZXJjZW50YWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDaGFuZ2UocGVyY2VudDogbnVtYmVyLCBkaXJlY3Rpb246ICdiZXR0ZXInIHwgJ3dvcnNlJyB8ICduZXV0cmFsJyB8ICd1bmtub3duJyk6IHN0cmluZyB7XG5cdGlmIChpc05hTihwZXJjZW50KSkgcmV0dXJuICdOL0EnXG5cblx0bGV0IHNpZ24gPSBwZXJjZW50ID49IDAgPyAnKycgOiAnJ1xuXHRsZXQgZW1vamkgPSBkaXJlY3Rpb24gPT09ICdiZXR0ZXInID8gJ/Cfn6InIDogZGlyZWN0aW9uID09PSAnd29yc2UnID8gJ/CflLQnIDogZGlyZWN0aW9uID09PSAnbmV1dHJhbCcgPyAn4pqqJyA6ICfinZMnXG5cblx0cmV0dXJuIGAke3NpZ259JHtwZXJjZW50LnRvRml4ZWQoMSl9JSAke2Vtb2ppfWBcbn1cbiIsCiAgICAiLyoqXG4gKiBBcnRpZmFjdHMgZG93bmxvYWQgYW5kIHBhcnNpbmdcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgZGVidWcsIGluZm8sIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgeyBmb3JtYXRFdmVudHMsIHBhcnNlRXZlbnRzSnNvbmwsIHR5cGUgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuL2V2ZW50cy5qcydcbmltcG9ydCB7IHBhcnNlTWV0cmljc0pzb25sLCB0eXBlIE1ldHJpY3NNYXAgfSBmcm9tICcuL21ldHJpY3MuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVzdE1ldGFkYXRhIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRzdGFydF90aW1lOiBzdHJpbmdcblx0c3RhcnRfZXBvY2hfbXM6IG51bWJlclxuXHRlbmRfdGltZTogc3RyaW5nXG5cdGVuZF9lcG9jaF9tczogbnVtYmVyXG5cdGR1cmF0aW9uX21zOiBudW1iZXJcblx0d29ya2xvYWRfY3VycmVudF9yZWY/OiBzdHJpbmdcblx0d29ya2xvYWRfYmFzZWxpbmVfcmVmPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya2xvYWRBcnRpZmFjdHMge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdHB1bGxOdW1iZXI6IG51bWJlclxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXVxuXHRsb2dzUGF0aD86IHN0cmluZ1xuXHRtZXRhZGF0YT86IFRlc3RNZXRhZGF0YVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFydGlmYWN0RG93bmxvYWRPcHRpb25zIHtcblx0dG9rZW46IHN0cmluZ1xuXHR3b3JrZmxvd1J1bklkOiBudW1iZXJcblx0cmVwb3NpdG9yeU93bmVyOiBzdHJpbmdcblx0cmVwb3NpdG9yeU5hbWU6IHN0cmluZ1xuXHRkb3dubG9hZFBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIERvd25sb2FkIGFuZCBwYXJzZSBhcnRpZmFjdHMgZm9yIGEgd29ya2Zsb3cgcnVuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFdvcmtsb2FkQXJ0aWZhY3RzKG9wdGlvbnM6IEFydGlmYWN0RG93bmxvYWRPcHRpb25zKTogUHJvbWlzZTxXb3JrbG9hZEFydGlmYWN0c1tdPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXG5cdGluZm8oYExpc3RpbmcgYXJ0aWZhY3RzIGZvciB3b3JrZmxvdyBydW4gJHtvcHRpb25zLndvcmtmbG93UnVuSWR9Li4uYClcblxuXHRsZXQgeyBhcnRpZmFjdHMgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50Lmxpc3RBcnRpZmFjdHMoe1xuXHRcdGZpbmRCeToge1xuXHRcdFx0dG9rZW46IG9wdGlvbnMudG9rZW4sXG5cdFx0XHR3b3JrZmxvd1J1bklkOiBvcHRpb25zLndvcmtmbG93UnVuSWQsXG5cdFx0XHRyZXBvc2l0b3J5T3duZXI6IG9wdGlvbnMucmVwb3NpdG9yeU93bmVyLFxuXHRcdFx0cmVwb3NpdG9yeU5hbWU6IG9wdGlvbnMucmVwb3NpdG9yeU5hbWUsXG5cdFx0fSxcblx0fSlcblxuXHRpbmZvKGBGb3VuZCAke2FydGlmYWN0cy5sZW5ndGh9IGFydGlmYWN0c2ApXG5cdGRlYnVnKFxuXHRcdGBBcnRpZmFjdHM6ICR7SlNPTi5zdHJpbmdpZnkoXG5cdFx0XHRhcnRpZmFjdHMubWFwKChhKSA9PiBhLm5hbWUpLFxuXHRcdFx0bnVsbCxcblx0XHRcdDJcblx0XHQpfWBcblx0KVxuXG5cdC8vIERvd25sb2FkIGFsbCBhcnRpZmFjdHNcblx0bGV0IGRvd25sb2FkZWRQYXRocyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcblxuXHRmb3IgKGxldCBhcnRpZmFjdCBvZiBhcnRpZmFjdHMpIHtcblx0XHRpbmZvKGBEb3dubG9hZGluZyBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9Li4uYClcblxuXHRcdGxldCB7IGRvd25sb2FkUGF0aCB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQuZG93bmxvYWRBcnRpZmFjdChhcnRpZmFjdC5pZCwge1xuXHRcdFx0cGF0aDogb3B0aW9ucy5kb3dubG9hZFBhdGgsXG5cdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0dG9rZW46IG9wdGlvbnMudG9rZW4sXG5cdFx0XHRcdHdvcmtmbG93UnVuSWQ6IG9wdGlvbnMud29ya2Zsb3dSdW5JZCxcblx0XHRcdFx0cmVwb3NpdG9yeU93bmVyOiBvcHRpb25zLnJlcG9zaXRvcnlPd25lcixcblx0XHRcdFx0cmVwb3NpdG9yeU5hbWU6IG9wdGlvbnMucmVwb3NpdG9yeU5hbWUsXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRsZXQgYXJ0aWZhY3RQYXRoID0gcGF0aC5qb2luKGRvd25sb2FkUGF0aCB8fCBvcHRpb25zLmRvd25sb2FkUGF0aCwgYXJ0aWZhY3QubmFtZSlcblx0XHRkb3dubG9hZGVkUGF0aHMuc2V0KGFydGlmYWN0Lm5hbWUsIGFydGlmYWN0UGF0aClcblxuXHRcdGluZm8oYERvd25sb2FkZWQgYXJ0aWZhY3QgJHthcnRpZmFjdC5uYW1lfSB0byAke2FydGlmYWN0UGF0aH1gKVxuXHR9XG5cblx0Ly8gR3JvdXAgZmlsZXMgYnkgd29ya2xvYWRcblx0bGV0IHdvcmtsb2FkRmlsZXMgPSBuZXcgTWFwPFxuXHRcdHN0cmluZyxcblx0XHR7XG5cdFx0XHRwdWxsPzogc3RyaW5nXG5cdFx0XHRtZXRhPzogc3RyaW5nXG5cdFx0XHRsb2dzPzogc3RyaW5nXG5cdFx0XHRldmVudHM/OiBzdHJpbmdcblx0XHRcdG1ldHJpY3M/OiBzdHJpbmdcblx0XHRcdGNoYW9zRXZlbnRzPzogc3RyaW5nXG5cdFx0fVxuXHQ+KClcblxuXHRmb3IgKGxldCBbYXJ0aWZhY3ROYW1lLCBhcnRpZmFjdFBhdGhdIG9mIGRvd25sb2FkZWRQYXRocykge1xuXHRcdC8vIEFydGlmYWN0IG5hbWUgaXMgdGhlIHdvcmtsb2FkIG5hbWUsIGZpbGVzIGluc2lkZSBoYXZlIHdvcmtsb2FkIHByZWZpeFxuXHRcdGxldCB3b3JrbG9hZCA9IGFydGlmYWN0TmFtZVxuXG5cdFx0Ly8gTGlzdCBmaWxlcyBpbiBhcnRpZmFjdCBkaXJlY3Rvcnlcblx0XHRpZiAoIWZzLmV4aXN0c1N5bmMoYXJ0aWZhY3RQYXRoKSkge1xuXHRcdFx0d2FybmluZyhgQXJ0aWZhY3QgcGF0aCBkb2VzIG5vdCBleGlzdDogJHthcnRpZmFjdFBhdGh9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0bGV0IHN0YXQgPSBmcy5zdGF0U3luYyhhcnRpZmFjdFBhdGgpXG5cdFx0bGV0IGZpbGVzOiBzdHJpbmdbXSA9IFtdXG5cblx0XHRpZiAoc3RhdC5pc0RpcmVjdG9yeSgpKSB7XG5cdFx0XHRmaWxlcyA9IGZzLnJlYWRkaXJTeW5jKGFydGlmYWN0UGF0aCkubWFwKChmKSA9PiBwYXRoLmpvaW4oYXJ0aWZhY3RQYXRoLCBmKSlcblx0XHR9IGVsc2Uge1xuXHRcdFx0ZmlsZXMgPSBbYXJ0aWZhY3RQYXRoXVxuXHRcdH1cblxuXHRcdGxldCBncm91cCA9IHdvcmtsb2FkRmlsZXMuZ2V0KHdvcmtsb2FkKSB8fCB7fVxuXG5cdFx0Zm9yIChsZXQgZmlsZSBvZiBmaWxlcykge1xuXHRcdFx0bGV0IGJhc2VuYW1lID0gcGF0aC5iYXNlbmFtZShmaWxlKVxuXG5cdFx0XHRpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1wdWxsLnR4dCcpKSB7XG5cdFx0XHRcdGdyb3VwLnB1bGwgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbG9ncy50eHQnKSkge1xuXHRcdFx0XHRncm91cC5sb2dzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldGEuanNvbicpKSB7XG5cdFx0XHRcdGdyb3VwLm1ldGEgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctZXZlbnRzLmpzb25sJykpIHtcblx0XHRcdFx0Z3JvdXAuY2hhb3NFdmVudHMgPSBmaWxlXG5cdFx0XHR9IGVsc2UgaWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctbWV0cmljcy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLm1ldHJpY3MgPSBmaWxlXG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0d29ya2xvYWRGaWxlcy5zZXQod29ya2xvYWQsIGdyb3VwKVxuXHR9XG5cblx0Ly8gUGFyc2Ugd29ya2xvYWQgZGF0YVxuXHRsZXQgd29ya2xvYWRzOiBXb3JrbG9hZEFydGlmYWN0c1tdID0gW11cblxuXHRmb3IgKGxldCBbd29ya2xvYWQsIGZpbGVzXSBvZiB3b3JrbG9hZEZpbGVzKSB7XG5cdFx0aWYgKCFmaWxlcy5wdWxsIHx8ICFmaWxlcy5tZXRyaWNzKSB7XG5cdFx0XHR3YXJuaW5nKGBTa2lwcGluZyBpbmNvbXBsZXRlIHdvcmtsb2FkICR7d29ya2xvYWR9OiBtaXNzaW5nIHJlcXVpcmVkIGZpbGVzYClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBwdWxsTnVtYmVyID0gcGFyc2VJbnQoZnMucmVhZEZpbGVTeW5jKGZpbGVzLnB1bGwsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSkudHJpbSgpKVxuXHRcdFx0bGV0IG1ldHJpY3NDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVzLm1ldHJpY3MsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRcdGxldCBtZXRyaWNzID0gcGFyc2VNZXRyaWNzSnNvbmwobWV0cmljc0NvbnRlbnQpXG5cblx0XHRcdGxldCBldmVudHM6IEZvcm1hdHRlZEV2ZW50W10gPSBbXVxuXG5cdFx0XHQvLyBMb2FkIGV2ZW50c1xuXHRcdFx0aWYgKGZpbGVzLmNoYW9zRXZlbnRzICYmIGZzLmV4aXN0c1N5bmMoZmlsZXMuY2hhb3NFdmVudHMpKSB7XG5cdFx0XHRcdGxldCBldmVudHNDb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGZpbGVzLmNoYW9zRXZlbnRzLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRcdGxldCByYXdFdmVudHMgPSBwYXJzZUV2ZW50c0pzb25sKGV2ZW50c0NvbnRlbnQpXG5cdFx0XHRcdGV2ZW50cy5wdXNoKC4uLmZvcm1hdEV2ZW50cyhyYXdFdmVudHMpKVxuXHRcdFx0fVxuXG5cdFx0XHQvLyBTb3J0IGV2ZW50cyBieSB0aW1lc3RhbXBcblx0XHRcdGV2ZW50cy5zb3J0KChhLCBiKSA9PiBhLnRpbWVzdGFtcCAtIGIudGltZXN0YW1wKVxuXG5cdFx0XHQvLyBMb2FkIG1ldGFkYXRhXG5cdFx0XHRsZXQgbWV0YWRhdGE6IFRlc3RNZXRhZGF0YSB8IHVuZGVmaW5lZFxuXHRcdFx0aWYgKGZpbGVzLm1ldGEgJiYgZnMuZXhpc3RzU3luYyhmaWxlcy5tZXRhKSkge1xuXHRcdFx0XHR0cnkge1xuXHRcdFx0XHRcdGxldCBtZXRhQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlcy5tZXRhLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRcdFx0bWV0YWRhdGEgPSBKU09OLnBhcnNlKG1ldGFDb250ZW50KSBhcyBUZXN0TWV0YWRhdGFcblx0XHRcdFx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRcdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2UgbWV0YWRhdGEgZm9yICR7d29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHR3b3JrbG9hZHMucHVzaCh7XG5cdFx0XHRcdHdvcmtsb2FkLFxuXHRcdFx0XHRwdWxsTnVtYmVyLFxuXHRcdFx0XHRtZXRyaWNzLFxuXHRcdFx0XHRldmVudHMsXG5cdFx0XHRcdGxvZ3NQYXRoOiBmaWxlcy5sb2dzLFxuXHRcdFx0XHRtZXRhZGF0YSxcblx0XHRcdH0pXG5cblx0XHRcdGxldCB0ZXN0RHVyYXRpb24gPSBtZXRhZGF0YSA/IGAkeyhtZXRhZGF0YS5kdXJhdGlvbl9tcyAvIDEwMDApLnRvRml4ZWQoMCl9c2AgOiAndW5rbm93bidcblx0XHRcdGluZm8oYFBhcnNlZCB3b3JrbG9hZCAke3dvcmtsb2FkfTogJHttZXRyaWNzLnNpemV9IG1ldHJpY3MsICR7ZXZlbnRzLmxlbmd0aH0gZXZlbnRzICgke3Rlc3REdXJhdGlvbn0gdGVzdClgKVxuXHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2Ugd29ya2xvYWQgJHt3b3JrbG9hZH06ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdFx0Y29udGludWVcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gd29ya2xvYWRzXG59XG4iLAogICAgIi8qKlxuICogQ2hhb3MgZXZlbnRzIHBhcnNpbmcgYW5kIGZvcm1hdHRpbmdcbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIEV2ZW50IHtcblx0c2NyaXB0OiBzdHJpbmdcblx0ZXBvY2hfbXM6IG51bWJlclxuXHR0aW1lc3RhbXA6IHN0cmluZ1xuXHRkZXNjcmlwdGlvbjogc3RyaW5nXG5cdGR1cmF0aW9uX21zPzogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgRm9ybWF0dGVkRXZlbnQge1xuXHRpY29uOiBzdHJpbmdcblx0bGFiZWw6IHN0cmluZ1xuXHR0aW1lc3RhbXA6IG51bWJlciAvLyBtaWxsaXNlY29uZHMgKGVwb2NoX21zKVxuXHRkdXJhdGlvbl9tcz86IG51bWJlclxufVxuXG4vKipcbiAqIFBhcnNlIGV2ZW50cyBKU09OTCBmaWxlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZUV2ZW50c0pzb25sKGNvbnRlbnQ6IHN0cmluZyk6IEV2ZW50W10ge1xuXHRsZXQgZXZlbnRzOiBFdmVudFtdID0gW11cblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IGV2ZW50ID0gSlNPTi5wYXJzZShsaW5lKSBhcyBFdmVudFxuXHRcdFx0ZXZlbnRzLnB1c2goZXZlbnQpXG5cdFx0fSBjYXRjaCB7XG5cdFx0XHQvLyBTa2lwIGludmFsaWQgbGluZXNcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGV2ZW50c1xufVxuXG4vKipcbiAqIEdldCBpY29uIGZvciBldmVudCBiYXNlZCBvbiBkdXJhdGlvblxuICogRHVyYXRpb24gZXZlbnRzIChpbnRlcnZhbHMpIGdldCDij7HvuI9cbiAqIEluc3RhbnQgZXZlbnRzIGdldCDwn5ONXG4gKi9cbmZ1bmN0aW9uIGdldEV2ZW50SWNvbihoYXNEdXJhdGlvbjogYm9vbGVhbik6IHN0cmluZyB7XG5cdHJldHVybiBoYXNEdXJhdGlvbiA/ICfij7HvuI8nIDogJ/Cfk40nXG59XG5cbi8qKlxuICogRm9ybWF0IGV2ZW50cyBmb3IgdmlzdWFsaXphdGlvblxuICovXG5leHBvcnQgZnVuY3Rpb24gZm9ybWF0RXZlbnRzKGV2ZW50czogRXZlbnRbXSk6IEZvcm1hdHRlZEV2ZW50W10ge1xuXHRyZXR1cm4gZXZlbnRzLm1hcCgoZXZlbnQpID0+ICh7XG5cdFx0aWNvbjogZ2V0RXZlbnRJY29uKCEhZXZlbnQuZHVyYXRpb25fbXMpLFxuXHRcdGxhYmVsOiBldmVudC5kZXNjcmlwdGlvbixcblx0XHR0aW1lc3RhbXA6IGV2ZW50LmVwb2NoX21zLFxuXHRcdGR1cmF0aW9uX21zOiBldmVudC5kdXJhdGlvbl9tcyxcblx0fSkpXG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIENoZWNrcyBBUEkgaW50ZWdyYXRpb25cbiAqL1xuXG5pbXBvcnQgeyBpbmZvIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGdldE9jdG9raXQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcbmltcG9ydCB7IGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzLCB0eXBlIFRocmVzaG9sZENvbmZpZyB9IGZyb20gJy4vdGhyZXNob2xkcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBDaGVja09wdGlvbnMge1xuXHR0b2tlbjogc3RyaW5nXG5cdG93bmVyOiBzdHJpbmdcblx0cmVwbzogc3RyaW5nXG5cdHNoYTogc3RyaW5nXG5cdHdvcmtsb2FkOiBXb3JrbG9hZENvbXBhcmlzb25cblx0dGhyZXNob2xkczogVGhyZXNob2xkQ29uZmlnXG5cdHJlcG9ydFVybD86IHN0cmluZ1xufVxuXG4vKipcbiAqIENyZWF0ZSBHaXRIdWIgQ2hlY2sgZm9yIHdvcmtsb2FkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVXb3JrbG9hZENoZWNrKG9wdGlvbnM6IENoZWNrT3B0aW9ucyk6IFByb21pc2U8eyBpZDogbnVtYmVyOyB1cmw6IHN0cmluZyB9PiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdChvcHRpb25zLnRva2VuKVxuXG5cdGxldCBuYW1lID0gYFNMTzogJHtvcHRpb25zLndvcmtsb2FkLndvcmtsb2FkfWBcblx0bGV0IGV2YWx1YXRpb24gPSBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcyhvcHRpb25zLndvcmtsb2FkLm1ldHJpY3MsIG9wdGlvbnMudGhyZXNob2xkcylcblx0bGV0IGNvbmNsdXNpb24gPSBkZXRlcm1pbmVDb25jbHVzaW9uRnJvbUV2YWx1YXRpb24oZXZhbHVhdGlvbi5vdmVyYWxsKVxuXHRsZXQgdGl0bGUgPSBnZW5lcmF0ZVRpdGxlKG9wdGlvbnMud29ya2xvYWQsIGV2YWx1YXRpb24pXG5cdGxldCBzdW1tYXJ5VGV4dCA9IGdlbmVyYXRlU3VtbWFyeShvcHRpb25zLndvcmtsb2FkLCBldmFsdWF0aW9uLCBvcHRpb25zLnJlcG9ydFVybClcblxuXHRpbmZvKGBDcmVhdGluZyBjaGVjayBcIiR7bmFtZX1cIiB3aXRoIGNvbmNsdXNpb246ICR7Y29uY2x1c2lvbn1gKVxuXG5cdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5jaGVja3MuY3JlYXRlKHtcblx0XHRvd25lcjogb3B0aW9ucy5vd25lcixcblx0XHRyZXBvOiBvcHRpb25zLnJlcG8sXG5cdFx0bmFtZSxcblx0XHRoZWFkX3NoYTogb3B0aW9ucy5zaGEsXG5cdFx0c3RhdHVzOiAnY29tcGxldGVkJyxcblx0XHRjb25jbHVzaW9uLFxuXHRcdG91dHB1dDoge1xuXHRcdFx0dGl0bGUsXG5cdFx0XHRzdW1tYXJ5OiBzdW1tYXJ5VGV4dCxcblx0XHR9LFxuXHR9KVxuXG5cdGluZm8oYENoZWNrIGNyZWF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdHJldHVybiB7IGlkOiBkYXRhLmlkLCB1cmw6IGRhdGEuaHRtbF91cmwhIH1cbn1cblxuLyoqXG4gKiBNYXAgdGhyZXNob2xkIHNldmVyaXR5IHRvIEdpdEh1YiBDaGVjayBjb25jbHVzaW9uXG4gKi9cbmZ1bmN0aW9uIGRldGVybWluZUNvbmNsdXNpb25Gcm9tRXZhbHVhdGlvbihcblx0c2V2ZXJpdHk6ICdzdWNjZXNzJyB8ICd3YXJuaW5nJyB8ICdmYWlsdXJlJ1xuKTogJ3N1Y2Nlc3MnIHwgJ25ldXRyYWwnIHwgJ2ZhaWx1cmUnIHtcblx0aWYgKHNldmVyaXR5ID09PSAnZmFpbHVyZScpIHJldHVybiAnZmFpbHVyZSdcblx0aWYgKHNldmVyaXR5ID09PSAnd2FybmluZycpIHJldHVybiAnbmV1dHJhbCdcblx0cmV0dXJuICdzdWNjZXNzJ1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIGNoZWNrIHRpdGxlXG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlVGl0bGUoXG5cdHdvcmtsb2FkOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdGV2YWx1YXRpb246IHsgb3ZlcmFsbDogc3RyaW5nOyBmYWlsdXJlczogYW55W107IHdhcm5pbmdzOiBhbnlbXSB9XG4pOiBzdHJpbmcge1xuXHRpZiAoZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGggPiAwKSB7XG5cdFx0cmV0dXJuIGAke2V2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RofSBjcml0aWNhbCB0aHJlc2hvbGQocykgdmlvbGF0ZWRgXG5cdH1cblxuXHRpZiAoZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0cmV0dXJuIGAke2V2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RofSB3YXJuaW5nIHRocmVzaG9sZChzKSBleGNlZWRlZGBcblx0fVxuXG5cdGlmICh3b3JrbG9hZC5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDApIHtcblx0XHRyZXR1cm4gYCR7d29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHN9IGltcHJvdmVtZW50KHMpIGRldGVjdGVkYFxuXHR9XG5cblx0cmV0dXJuICdBbGwgbWV0cmljcyB3aXRoaW4gdGhyZXNob2xkcydcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBjaGVjayBzdW1tYXJ5XG4gKi9cbmZ1bmN0aW9uIGdlbmVyYXRlU3VtbWFyeShcblx0d29ya2xvYWQ6IFdvcmtsb2FkQ29tcGFyaXNvbixcblx0ZXZhbHVhdGlvbjogeyBvdmVyYWxsOiBzdHJpbmc7IGZhaWx1cmVzOiBhbnlbXTsgd2FybmluZ3M6IGFueVtdIH0sXG5cdHJlcG9ydFVybD86IHN0cmluZ1xuKTogc3RyaW5nIHtcblx0bGV0IGxpbmVzID0gW1xuXHRcdGAqKk1ldHJpY3MgYW5hbHl6ZWQ6KiogJHt3b3JrbG9hZC5zdW1tYXJ5LnRvdGFsfWAsXG5cdFx0YC0g8J+UtCBDcml0aWNhbDogJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH1gLFxuXHRcdGAtIPCfn6EgV2FybmluZ3M6ICR7ZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGh9YCxcblx0XHRgLSDwn5+iIEltcHJvdmVtZW50czogJHt3b3JrbG9hZC5zdW1tYXJ5LmltcHJvdmVtZW50c31gLFxuXHRcdGAtIOKaqiBTdGFibGU6ICR7d29ya2xvYWQuc3VtbWFyeS5zdGFibGV9YCxcblx0XHQnJyxcblx0XVxuXG5cdGlmIChyZXBvcnRVcmwpIHtcblx0XHRsaW5lcy5wdXNoKGDwn5OKIFtWaWV3IGRldGFpbGVkIEhUTUwgcmVwb3J0XSgke3JlcG9ydFVybH0pYCwgJycpXG5cdH1cblxuXHQvLyBDcml0aWNhbCBmYWlsdXJlc1xuXHRpZiAoZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGggPiAwKSB7XG5cdFx0bGluZXMucHVzaCgnIyMjIOKdjCBDcml0aWNhbCBUaHJlc2hvbGRzIFZpb2xhdGVkJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgZXZhbHVhdGlvbi5mYWlsdXJlcy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdGxpbmVzLnB1c2goJycpXG5cdH1cblxuXHQvLyBXYXJuaW5nc1xuXHRpZiAoZXZhbHVhdGlvbi53YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0bGluZXMucHVzaCgnIyMjIOKaoO+4jyBXYXJuaW5nIFRocmVzaG9sZHMgRXhjZWVkZWQnLCAnJylcblxuXHRcdGZvciAobGV0IG1ldHJpYyBvZiBldmFsdWF0aW9uLndhcm5pbmdzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSlgXG5cdFx0XHQpXG5cdFx0fVxuXG5cdFx0bGluZXMucHVzaCgnJylcblx0fVxuXG5cdC8vIFRvcCBpbXByb3ZlbWVudHNcblx0bGV0IGltcHJvdmVtZW50cyA9IHdvcmtsb2FkLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLmNoYW5nZS5kaXJlY3Rpb24gPT09ICdiZXR0ZXInKVxuXHRcdC5zb3J0KChhLCBiKSA9PiBNYXRoLmFicyhiLmNoYW5nZS5wZXJjZW50KSAtIE1hdGguYWJzKGEuY2hhbmdlLnBlcmNlbnQpKVxuXG5cdGlmIChpbXByb3ZlbWVudHMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDwn5+iIFRvcCBJbXByb3ZlbWVudHMnLCAnJylcblxuXHRcdGZvciAobGV0IG1ldHJpYyBvZiBpbXByb3ZlbWVudHMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gbGluZXMuam9pbignXFxuJylcbn1cbiIsCiAgICAiLyoqXG4gKiBUaHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gYW5kIGV2YWx1YXRpb25cbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmltcG9ydCB7IGV4ZWMgfSBmcm9tICdAYWN0aW9ucy9leGVjJ1xuaW1wb3J0IHsgZGVidWcsIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgdHlwZSB7IE1ldHJpY0NvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY1RocmVzaG9sZCB7XG5cdG5hbWU/OiBzdHJpbmcgLy8gRXhhY3QgbWV0cmljIG5hbWUgKGhpZ2hlciBwcmlvcml0eSB0aGFuIHBhdHRlcm4pXG5cdHBhdHRlcm4/OiBzdHJpbmcgLy8gR2xvYiBwYXR0ZXJuIChsb3dlciBwcmlvcml0eSlcblx0ZGlyZWN0aW9uPzogJ2xvd2VyX2lzX2JldHRlcicgfCAnaGlnaGVyX2lzX2JldHRlcicgfCAnbmV1dHJhbCdcblx0d2FybmluZ19taW4/OiBudW1iZXJcblx0Y3JpdGljYWxfbWluPzogbnVtYmVyXG5cdHdhcm5pbmdfbWF4PzogbnVtYmVyXG5cdGNyaXRpY2FsX21heD86IG51bWJlclxuXHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50PzogbnVtYmVyXG5cdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50PzogbnVtYmVyXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgVGhyZXNob2xkQ29uZmlnIHtcblx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdGRlZmF1bHQ6IHtcblx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OiBudW1iZXJcblx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdH1cblx0bWV0cmljcz86IE1ldHJpY1RocmVzaG9sZFtdXG59XG5cbmV4cG9ydCB0eXBlIFRocmVzaG9sZFNldmVyaXR5ID0gJ3N1Y2Nlc3MnIHwgJ3dhcm5pbmcnIHwgJ2ZhaWx1cmUnXG5cbi8qKlxuICogUGFyc2UgWUFNTCB0aHJlc2hvbGRzIGNvbmZpZ1xuICovXG5hc3luYyBmdW5jdGlvbiBwYXJzZVRocmVzaG9sZHNZYW1sKHlhbWxDb250ZW50OiBzdHJpbmcpOiBQcm9taXNlPFRocmVzaG9sZENvbmZpZyB8IG51bGw+IHtcblx0aWYgKCF5YW1sQ29udGVudCB8fCB5YW1sQ29udGVudC50cmltKCkgPT09ICcnKSB7XG5cdFx0cmV0dXJuIG51bGxcblx0fVxuXG5cdHRyeSB7XG5cdFx0bGV0IGNodW5rczogc3RyaW5nW10gPSBbXVxuXG5cdFx0YXdhaXQgZXhlYygneXEnLCBbJy1vPWpzb24nLCAnLiddLCB7XG5cdFx0XHRpbnB1dDogQnVmZmVyLmZyb20oeWFtbENvbnRlbnQsICd1dGYtOCcpLFxuXHRcdFx0c2lsZW50OiB0cnVlLFxuXHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdHN0ZG91dDogKGRhdGEpID0+IGNodW5rcy5wdXNoKGRhdGEudG9TdHJpbmcoKSksXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHRsZXQganNvbiA9IGNodW5rcy5qb2luKCcnKVxuXHRcdGxldCBwYXJzZWQgPSBKU09OLnBhcnNlKGpzb24pIGFzIFRocmVzaG9sZENvbmZpZ1xuXG5cdFx0cmV0dXJuIHBhcnNlZFxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHdhcm5pbmcoYEZhaWxlZCB0byBwYXJzZSB0aHJlc2hvbGRzIFlBTUw6ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdHJldHVybiBudWxsXG5cdH1cbn1cblxuLyoqXG4gKiBNZXJnZSB0d28gdGhyZXNob2xkIGNvbmZpZ3MgKGN1c3RvbSBleHRlbmRzL292ZXJyaWRlcyBkZWZhdWx0KVxuICovXG5mdW5jdGlvbiBtZXJnZVRocmVzaG9sZENvbmZpZ3MoZGVmYXVsdENvbmZpZzogVGhyZXNob2xkQ29uZmlnLCBjdXN0b21Db25maWc6IFRocmVzaG9sZENvbmZpZyk6IFRocmVzaG9sZENvbmZpZyB7XG5cdHJldHVybiB7XG5cdFx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogY3VzdG9tQ29uZmlnLm5ldXRyYWxfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50LFxuXHRcdGRlZmF1bHQ6IHtcblx0XHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6XG5cdFx0XHRcdGN1c3RvbUNvbmZpZy5kZWZhdWx0Py53YXJuaW5nX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcuZGVmYXVsdC53YXJuaW5nX2NoYW5nZV9wZXJjZW50LFxuXHRcdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6XG5cdFx0XHRcdGN1c3RvbUNvbmZpZy5kZWZhdWx0Py5jcml0aWNhbF9jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLmRlZmF1bHQuY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQsXG5cdFx0fSxcblx0XHRtZXRyaWNzOiBbLi4uKGN1c3RvbUNvbmZpZy5tZXRyaWNzIHx8IFtdKSwgLi4uKGRlZmF1bHRDb25maWcubWV0cmljcyB8fCBbXSldLFxuXHRcdC8vIEN1c3RvbSBtZXRyaWNzIGNvbWUgZmlyc3QsIHNvIHRoZXkgaGF2ZSBoaWdoZXIgcHJpb3JpdHkgaW4gZmluZE1hdGNoaW5nVGhyZXNob2xkKClcblx0fVxufVxuXG4vKipcbiAqIExvYWQgZGVmYXVsdCB0aHJlc2hvbGRzIGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbFxuICovXG5hc3luYyBmdW5jdGlvbiBsb2FkRGVmYXVsdFRocmVzaG9sZHMoKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWc+IHtcblx0ZGVidWcoJ0xvYWRpbmcgZGVmYXVsdCB0aHJlc2hvbGRzIGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbCcpXG5cdGxldCBhY3Rpb25Sb290ID0gcGF0aC5yZXNvbHZlKHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpLCAnLi4vLi4vJylcblx0bGV0IGRlZmF1bHRQYXRoID0gcGF0aC5qb2luKGFjdGlvblJvb3QsICdkZXBsb3knLCAndGhyZXNob2xkcy55YW1sJylcblxuXHRpZiAoZnMuZXhpc3RzU3luYyhkZWZhdWx0UGF0aCkpIHtcblx0XHRsZXQgY29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhkZWZhdWx0UGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGxldCBjb25maWcgPSBhd2FpdCBwYXJzZVRocmVzaG9sZHNZYW1sKGNvbnRlbnQpXG5cdFx0aWYgKGNvbmZpZykgcmV0dXJuIGNvbmZpZ1xuXHR9XG5cblx0Ly8gRmFsbGJhY2sgdG8gaGFyZGNvZGVkIGRlZmF1bHRzXG5cdHdhcm5pbmcoJ0NvdWxkIG5vdCBsb2FkIGRlZmF1bHQgdGhyZXNob2xkcywgdXNpbmcgaGFyZGNvZGVkIGRlZmF1bHRzJylcblx0cmV0dXJuIHtcblx0XHRuZXV0cmFsX2NoYW5nZV9wZXJjZW50OiA1LjAsXG5cdFx0ZGVmYXVsdDoge1xuXHRcdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogMjAuMCxcblx0XHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OiA1MC4wLFxuXHRcdH0sXG5cdH1cbn1cblxuLyoqXG4gKiBMb2FkIHRocmVzaG9sZHMgY29uZmlndXJhdGlvbiB3aXRoIG1lcmdpbmc6XG4gKiAxLiBMb2FkIGRlZmF1bHQgZnJvbSBkZXBsb3kvdGhyZXNob2xkcy55YW1sXG4gKiAyLiBNZXJnZSB3aXRoIGN1c3RvbSBZQU1MIChpbmxpbmUpIGlmIHByb3ZpZGVkXG4gKiAzLiBNZXJnZSB3aXRoIGN1c3RvbSBmaWxlIGlmIHByb3ZpZGVkXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkVGhyZXNob2xkcyhjdXN0b21ZYW1sPzogc3RyaW5nLCBjdXN0b21QYXRoPzogc3RyaW5nKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWc+IHtcblx0Ly8gQWx3YXlzIGxvYWQgZGVmYXVsdHMgZmlyc3Rcblx0bGV0IGNvbmZpZyA9IGF3YWl0IGxvYWREZWZhdWx0VGhyZXNob2xkcygpXG5cblx0Ly8gTWVyZ2Ugd2l0aCBjdXN0b20gWUFNTCAoaW5saW5lKVxuXHRpZiAoY3VzdG9tWWFtbCkge1xuXHRcdGRlYnVnKCdNZXJnaW5nIGN1c3RvbSB0aHJlc2hvbGRzIGZyb20gaW5saW5lIFlBTUwnKVxuXHRcdGxldCBjdXN0b21Db25maWcgPSBhd2FpdCBwYXJzZVRocmVzaG9sZHNZYW1sKGN1c3RvbVlhbWwpXG5cdFx0aWYgKGN1c3RvbUNvbmZpZykge1xuXHRcdFx0Y29uZmlnID0gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGNvbmZpZywgY3VzdG9tQ29uZmlnKVxuXHRcdH1cblx0fVxuXG5cdC8vIE1lcmdlIHdpdGggY3VzdG9tIGZpbGVcblx0aWYgKGN1c3RvbVBhdGggJiYgZnMuZXhpc3RzU3luYyhjdXN0b21QYXRoKSkge1xuXHRcdGRlYnVnKGBNZXJnaW5nIGN1c3RvbSB0aHJlc2hvbGRzIGZyb20gZmlsZTogJHtjdXN0b21QYXRofWApXG5cdFx0bGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoY3VzdG9tUGF0aCwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdGxldCBjdXN0b21Db25maWcgPSBhd2FpdCBwYXJzZVRocmVzaG9sZHNZYW1sKGNvbnRlbnQpXG5cdFx0aWYgKGN1c3RvbUNvbmZpZykge1xuXHRcdFx0Y29uZmlnID0gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGNvbmZpZywgY3VzdG9tQ29uZmlnKVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBjb25maWdcbn1cblxuLyoqXG4gKiBNYXRjaCBtZXRyaWMgbmFtZSBhZ2FpbnN0IHBhdHRlcm4gKHN1cHBvcnRzIHdpbGRjYXJkcylcbiAqL1xuZnVuY3Rpb24gbWF0Y2hQYXR0ZXJuKG1ldHJpY05hbWU6IHN0cmluZywgcGF0dGVybjogc3RyaW5nKTogYm9vbGVhbiB7XG5cdC8vIENvbnZlcnQgZ2xvYiBwYXR0ZXJuIHRvIHJlZ2V4XG5cdGxldCByZWdleFBhdHRlcm4gPSBwYXR0ZXJuXG5cdFx0LnJlcGxhY2UoL1xcKi9nLCAnLionKSAvLyAqIC0+IC4qXG5cdFx0LnJlcGxhY2UoL1xcPy9nLCAnLicpIC8vID8gLT4gLlxuXG5cdGxldCByZWdleCA9IG5ldyBSZWdFeHAoYF4ke3JlZ2V4UGF0dGVybn0kYCwgJ2knKVxuXHRyZXR1cm4gcmVnZXgudGVzdChtZXRyaWNOYW1lKVxufVxuXG4vKipcbiAqIEZpbmQgbWF0Y2hpbmcgdGhyZXNob2xkIGZvciBtZXRyaWMgKGV4YWN0IG1hdGNoIGZpcnN0LCB0aGVuIHBhdHRlcm4pXG4gKi9cbmZ1bmN0aW9uIGZpbmRNYXRjaGluZ1RocmVzaG9sZChtZXRyaWNOYW1lOiBzdHJpbmcsIGNvbmZpZzogVGhyZXNob2xkQ29uZmlnKTogTWV0cmljVGhyZXNob2xkIHwgbnVsbCB7XG5cdGlmICghY29uZmlnLm1ldHJpY3MpIHJldHVybiBudWxsXG5cblx0Ly8gRmlyc3QgcGFzczogZXhhY3QgbWF0Y2ggKGhpZ2hlc3QgcHJpb3JpdHkpXG5cdGZvciAobGV0IHRocmVzaG9sZCBvZiBjb25maWcubWV0cmljcykge1xuXHRcdGlmICh0aHJlc2hvbGQubmFtZSAmJiB0aHJlc2hvbGQubmFtZSA9PT0gbWV0cmljTmFtZSkge1xuXHRcdFx0cmV0dXJuIHRocmVzaG9sZFxuXHRcdH1cblx0fVxuXG5cdC8vIFNlY29uZCBwYXNzOiBwYXR0ZXJuIG1hdGNoXG5cdGZvciAobGV0IHRocmVzaG9sZCBvZiBjb25maWcubWV0cmljcykge1xuXHRcdGlmICh0aHJlc2hvbGQucGF0dGVybiAmJiBtYXRjaFBhdHRlcm4obWV0cmljTmFtZSwgdGhyZXNob2xkLnBhdHRlcm4pKSB7XG5cdFx0XHRyZXR1cm4gdGhyZXNob2xkXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSB0aHJlc2hvbGQgZm9yIGEgbWV0cmljIGNvbXBhcmlzb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlVGhyZXNob2xkKGNvbXBhcmlzb246IE1ldHJpY0NvbXBhcmlzb24sIGNvbmZpZzogVGhyZXNob2xkQ29uZmlnKTogVGhyZXNob2xkU2V2ZXJpdHkge1xuXHQvLyBDYW4ndCBldmFsdWF0ZSB3aXRob3V0IGJhc2Vcblx0aWYgKCFjb21wYXJpc29uLmJhc2VsaW5lLmF2YWlsYWJsZSkge1xuXHRcdHJldHVybiAnc3VjY2Vzcydcblx0fVxuXG5cdGxldCB0aHJlc2hvbGQgPSBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQoY29tcGFyaXNvbi5uYW1lLCBjb25maWcpXG5cblx0Ly8gQ2hlY2sgYWJzb2x1dGUgdmFsdWUgdGhyZXNob2xkcyBmaXJzdFxuXHRpZiAodGhyZXNob2xkKSB7XG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWluXG5cdFx0aWYgKHRocmVzaG9sZC5jcml0aWNhbF9taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQuY3JpdGljYWxfbWluKSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBiZWxvdyBjcml0aWNhbF9taW4gKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA8ICR7dGhyZXNob2xkLmNyaXRpY2FsX21pbn0pYClcblx0XHRcdHJldHVybiAnZmFpbHVyZSdcblx0XHR9XG5cblx0XHQvLyBDaGVjayB3YXJuaW5nX21pblxuXHRcdGlmICh0aHJlc2hvbGQud2FybmluZ19taW4gIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPCB0aHJlc2hvbGQud2FybmluZ19taW4pIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGJlbG93IHdhcm5pbmdfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC53YXJuaW5nX21pbn0pYClcblx0XHRcdHJldHVybiAnd2FybmluZydcblx0XHR9XG5cblx0XHQvLyBDaGVjayBjcml0aWNhbF9tYXhcblx0XHRpZiAodGhyZXNob2xkLmNyaXRpY2FsX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC5jcml0aWNhbF9tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIGNyaXRpY2FsX21heCAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9ID4gJHt0aHJlc2hvbGQuY3JpdGljYWxfbWF4fSlgKVxuXHRcdFx0cmV0dXJuICdmYWlsdXJlJ1xuXHRcdH1cblxuXHRcdC8vIENoZWNrIHdhcm5pbmdfbWF4XG5cdFx0aWYgKHRocmVzaG9sZC53YXJuaW5nX21heCAhPT0gdW5kZWZpbmVkICYmIGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSA+IHRocmVzaG9sZC53YXJuaW5nX21heCkge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYWJvdmUgd2FybmluZ19tYXggKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA+ICR7dGhyZXNob2xkLndhcm5pbmdfbWF4fSlgKVxuXHRcdFx0cmV0dXJuICd3YXJuaW5nJ1xuXHRcdH1cblx0fVxuXG5cdC8vIENoZWNrIGNoYW5nZSBwZXJjZW50IHRocmVzaG9sZHNcblx0aWYgKCFpc05hTihjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50KSkge1xuXHRcdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudClcblxuXHRcdC8vIFVzZSBtZXRyaWMtc3BlY2lmaWMgb3IgZGVmYXVsdCB0aHJlc2hvbGRzXG5cdFx0bGV0IHdhcm5pbmdUaHJlc2hvbGQgPSB0aHJlc2hvbGQ/Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudFxuXHRcdGxldCBjcml0aWNhbFRocmVzaG9sZCA9IHRocmVzaG9sZD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gY29uZmlnLmRlZmF1bHQuY3JpdGljYWxfY2hhbmdlX3BlcmNlbnRcblxuXHRcdC8vIE9ubHkgdHJpZ2dlciBpZiBjaGFuZ2UgaXMgaW4gXCJ3b3JzZVwiIGRpcmVjdGlvblxuXHRcdGlmIChjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb24gPT09ICd3b3JzZScpIHtcblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gY3JpdGljYWxUaHJlc2hvbGQpIHtcblx0XHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogY3JpdGljYWwgcmVncmVzc2lvbiAoJHtjaGFuZ2VQZXJjZW50LnRvRml4ZWQoMSl9JSA+ICR7Y3JpdGljYWxUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRyZXR1cm4gJ2ZhaWx1cmUnXG5cdFx0XHR9XG5cblx0XHRcdGlmIChjaGFuZ2VQZXJjZW50ID4gd2FybmluZ1RocmVzaG9sZCkge1xuXHRcdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiB3YXJuaW5nIHJlZ3Jlc3Npb24gKCR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDEpfSUgPiAke3dhcm5pbmdUaHJlc2hvbGR9JSlgKVxuXHRcdFx0XHRyZXR1cm4gJ3dhcm5pbmcnXG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuICdzdWNjZXNzJ1xufVxuXG4vKipcbiAqIEV2YWx1YXRlIGFsbCBtZXRyaWNzIGFuZCByZXR1cm4gb3ZlcmFsbCBzZXZlcml0eVxuICovXG5leHBvcnQgZnVuY3Rpb24gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMoXG5cdGNvbXBhcmlzb25zOiBNZXRyaWNDb21wYXJpc29uW10sXG5cdGNvbmZpZzogVGhyZXNob2xkQ29uZmlnXG4pOiB7XG5cdG92ZXJhbGw6IFRocmVzaG9sZFNldmVyaXR5XG5cdGZhaWx1cmVzOiBNZXRyaWNDb21wYXJpc29uW11cblx0d2FybmluZ3M6IE1ldHJpY0NvbXBhcmlzb25bXVxufSB7XG5cdGxldCBmYWlsdXJlczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblx0bGV0IHdhcm5pbmdzOiBNZXRyaWNDb21wYXJpc29uW10gPSBbXVxuXG5cdGZvciAobGV0IGNvbXBhcmlzb24gb2YgY29tcGFyaXNvbnMpIHtcblx0XHRsZXQgc2V2ZXJpdHkgPSBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uLCBjb25maWcpXG5cblx0XHRpZiAoc2V2ZXJpdHkgPT09ICdmYWlsdXJlJykge1xuXHRcdFx0ZmFpbHVyZXMucHVzaChjb21wYXJpc29uKVxuXHRcdH0gZWxzZSBpZiAoc2V2ZXJpdHkgPT09ICd3YXJuaW5nJykge1xuXHRcdFx0d2FybmluZ3MucHVzaChjb21wYXJpc29uKVxuXHRcdH1cblx0fVxuXG5cdGxldCBvdmVyYWxsOiBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJ1xuXHRpZiAoZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdG92ZXJhbGwgPSAnZmFpbHVyZSdcblx0fSBlbHNlIGlmICh3YXJuaW5ncy5sZW5ndGggPiAwKSB7XG5cdFx0b3ZlcmFsbCA9ICd3YXJuaW5nJ1xuXHR9XG5cblx0cmV0dXJuIHsgb3ZlcmFsbCwgZmFpbHVyZXMsIHdhcm5pbmdzIH1cbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgUFIgY29tbWVudCBnZW5lcmF0aW9uIGFuZCBtYW5hZ2VtZW50XG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgdHlwZSB7IFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ29tbWVudERhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGFydGlmYWN0VXJsczogTWFwPHN0cmluZywgc3RyaW5nPlxuXHRjaGVja1VybHM6IE1hcDxzdHJpbmcsIHN0cmluZz5cblx0am9iU3VtbWFyeVVybD86IHN0cmluZ1xufVxuXG4vKipcbiAqIEdlbmVyYXRlIFBSIGNvbW1lbnQgYm9keVxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVDb21tZW50Qm9keShkYXRhOiBDb21tZW50RGF0YSk6IHN0cmluZyB7XG5cdGxldCB0b3RhbFJlZ3Jlc3Npb25zID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5yZWdyZXNzaW9ucywgMClcblx0bGV0IHRvdGFsSW1wcm92ZW1lbnRzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5pbXByb3ZlbWVudHMsIDApXG5cblx0bGV0IHN0YXR1c0Vtb2ppID0gdG90YWxSZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0bGV0IHN0YXR1c1RleHQgPSB0b3RhbFJlZ3Jlc3Npb25zID4gMCA/IGAke3RvdGFsUmVncmVzc2lvbnN9IHJlZ3Jlc3Npb25zYCA6ICdBbGwgY2xlYXInXG5cblx0bGV0IGhlYWRlciA9IGAjIyDwn4yLIFNMTyBUZXN0IFJlc3VsdHNcblxuKipTdGF0dXMqKjogJHtzdGF0dXNFbW9qaX0gJHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkcyB0ZXN0ZWQg4oCiICR7c3RhdHVzVGV4dH1cblxuJHtkYXRhLmpvYlN1bW1hcnlVcmwgPyBg8J+TiCBbVmlldyBKb2IgU3VtbWFyeV0oJHtkYXRhLmpvYlN1bW1hcnlVcmx9KSBmb3IgZGV0YWlsZWQgY29tcGFyaXNvblxcbmAgOiAnJ31gXG5cblx0bGV0IHRhYmxlID0gYFxufCBXb3JrbG9hZCB8IE1ldHJpY3MgfCBSZWdyZXNzaW9ucyB8IEltcHJvdmVtZW50cyB8IExpbmtzIHxcbnwtLS0tLS0tLS0tfC0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tfC0tLS0tLS0tLS0tLS0tfC0tLS0tLS18XG4ke2RhdGEud29ya2xvYWRzXG5cdC5tYXAoKHcpID0+IHtcblx0XHRsZXQgZW1vamkgPSB3LnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogdy5zdW1tYXJ5LmltcHJvdmVtZW50cyA+IDAgPyAn8J+foicgOiAn4pqqJ1xuXHRcdGxldCByZXBvcnRMaW5rID0gZGF0YS5hcnRpZmFjdFVybHMuZ2V0KHcud29ya2xvYWQpIHx8ICcjJ1xuXHRcdGxldCBjaGVja0xpbmsgPSBkYXRhLmNoZWNrVXJscy5nZXQody53b3JrbG9hZCkgfHwgJyMnXG5cblx0XHRyZXR1cm4gYHwgJHtlbW9qaX0gJHt3Lndvcmtsb2FkfSB8ICR7dy5zdW1tYXJ5LnRvdGFsfSB8ICR7dy5zdW1tYXJ5LnJlZ3Jlc3Npb25zfSB8ICR7dy5zdW1tYXJ5LmltcHJvdmVtZW50c30gfCBbUmVwb3J0XSgke3JlcG9ydExpbmt9KSDigKIgW0NoZWNrXSgke2NoZWNrTGlua30pIHxgXG5cdH0pXG5cdC5qb2luKCdcXG4nKX1cbmBcblxuXHRsZXQgZm9vdGVyID0gYFxcbi0tLVxcbipHZW5lcmF0ZWQgYnkgW3lkYi1zbG8tYWN0aW9uXShodHRwczovL2dpdGh1Yi5jb20veWRiLXBsYXRmb3JtL3lkYi1zbG8tYWN0aW9uKSpgXG5cblx0cmV0dXJuIGhlYWRlciArIHRhYmxlICsgZm9vdGVyXG59XG5cbi8qKlxuICogRmluZCBleGlzdGluZyBTTE8gY29tbWVudCBpbiBQUlxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gZmluZEV4aXN0aW5nU0xPQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyXG4pOiBQcm9taXNlPG51bWJlciB8IG51bGw+IHtcblx0bGV0IG9jdG9raXQgPSBnZXRPY3Rva2l0KHRva2VuKVxuXG5cdGluZm8oYFNlYXJjaGluZyBmb3IgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFIgIyR7cHJOdW1iZXJ9Li4uYClcblxuXHRsZXQgeyBkYXRhOiBjb21tZW50cyB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5saXN0Q29tbWVudHMoe1xuXHRcdG93bmVyLFxuXHRcdHJlcG8sXG5cdFx0aXNzdWVfbnVtYmVyOiBwck51bWJlcixcblx0fSlcblxuXHRmb3IgKGxldCBjb21tZW50IG9mIGNvbW1lbnRzKSB7XG5cdFx0aWYgKGNvbW1lbnQuYm9keT8uaW5jbHVkZXMoJ/CfjIsgU0xPIFRlc3QgUmVzdWx0cycpKSB7XG5cdFx0XHRpbmZvKGBGb3VuZCBleGlzdGluZyBjb21tZW50OiAke2NvbW1lbnQuaWR9YClcblx0XHRcdHJldHVybiBjb21tZW50LmlkXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIG51bGxcbn1cblxuLyoqXG4gKiBDcmVhdGUgb3IgdXBkYXRlIFBSIGNvbW1lbnRcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNyZWF0ZU9yVXBkYXRlQ29tbWVudChcblx0dG9rZW46IHN0cmluZyxcblx0b3duZXI6IHN0cmluZyxcblx0cmVwbzogc3RyaW5nLFxuXHRwck51bWJlcjogbnVtYmVyLFxuXHRib2R5OiBzdHJpbmdcbik6IFByb21pc2U8eyB1cmw6IHN0cmluZzsgaWQ6IG51bWJlciB9PiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRsZXQgZXhpc3RpbmdJZCA9IGF3YWl0IGZpbmRFeGlzdGluZ1NMT0NvbW1lbnQodG9rZW4sIG93bmVyLCByZXBvLCBwck51bWJlcilcblxuXHRpZiAoZXhpc3RpbmdJZCkge1xuXHRcdGluZm8oYFVwZGF0aW5nIGV4aXN0aW5nIGNvbW1lbnQgJHtleGlzdGluZ0lkfS4uLmApXG5cblx0XHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuaXNzdWVzLnVwZGF0ZUNvbW1lbnQoe1xuXHRcdFx0b3duZXIsXG5cdFx0XHRyZXBvLFxuXHRcdFx0Y29tbWVudF9pZDogZXhpc3RpbmdJZCxcblx0XHRcdGJvZHksXG5cdFx0fSlcblxuXHRcdGluZm8oYENvbW1lbnQgdXBkYXRlZDogJHtkYXRhLmh0bWxfdXJsfWApXG5cblx0XHRyZXR1cm4geyB1cmw6IGRhdGEuaHRtbF91cmwhLCBpZDogZGF0YS5pZCB9XG5cdH0gZWxzZSB7XG5cdFx0aW5mbyhgQ3JlYXRpbmcgbmV3IGNvbW1lbnQuLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy5jcmVhdGVDb21tZW50KHtcblx0XHRcdG93bmVyLFxuXHRcdFx0cmVwbyxcblx0XHRcdGlzc3VlX251bWJlcjogcHJOdW1iZXIsXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRpbmZvKGBDb21tZW50IGNyZWF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogSFRNTCByZXBvcnQgZ2VuZXJhdGlvbiB3aXRoIENoYXJ0LmpzXG4gKi9cblxuaW1wb3J0IHsgZm9ybWF0Q2hhbmdlLCBmb3JtYXRWYWx1ZSwgdHlwZSBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuaW1wb3J0IHR5cGUgeyBGb3JtYXR0ZWRFdmVudCB9IGZyb20gJy4vZXZlbnRzLmpzJ1xuaW1wb3J0IHR5cGUgeyBDb2xsZWN0ZWRNZXRyaWMsIE1ldHJpY3NNYXAsIFNlcmllcyB9IGZyb20gJy4vbWV0cmljcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBIVE1MUmVwb3J0RGF0YSB7XG5cdHdvcmtsb2FkOiBzdHJpbmdcblx0Y3VycmVudFJlZjogc3RyaW5nXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmdcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXBcblx0Y29tcGFyaXNvbjogV29ya2xvYWRDb21wYXJpc29uXG5cdHByTnVtYmVyOiBudW1iZXJcblx0dGVzdFN0YXJ0VGltZTogbnVtYmVyIC8vIGVwb2NoIG1zXG5cdHRlc3RFbmRUaW1lOiBudW1iZXIgLy8gZXBvY2ggbXNcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBIVE1MIHJlcG9ydFxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVIVE1MUmVwb3J0KGRhdGE6IEhUTUxSZXBvcnREYXRhKTogc3RyaW5nIHtcblx0cmV0dXJuIGA8IURPQ1RZUEUgaHRtbD5cbjxodG1sIGxhbmc9XCJlblwiPlxuPGhlYWQ+XG5cdDxtZXRhIGNoYXJzZXQ9XCJVVEYtOFwiPlxuXHQ8bWV0YSBuYW1lPVwidmlld3BvcnRcIiBjb250ZW50PVwid2lkdGg9ZGV2aWNlLXdpZHRoLCBpbml0aWFsLXNjYWxlPTEuMFwiPlxuXHQ8dGl0bGU+U0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvdGl0bGU+XG5cdDxzdHlsZT4ke2dldFN0eWxlcygpfTwvc3R5bGU+XG48L2hlYWQ+XG48Ym9keT5cblx0PGhlYWRlcj5cblx0XHQ8aDE+8J+MiyBTTE8gUmVwb3J0OiAke2VzY2FwZUh0bWwoZGF0YS53b3JrbG9hZCl9PC9oMT5cblx0XHQ8ZGl2IGNsYXNzPVwiY29tbWl0LWluZm9cIj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiY29tbWl0IGN1cnJlbnRcIj5cblx0XHRcdFx0Q3VycmVudDogJHtlc2NhcGVIdG1sKGRhdGEuY3VycmVudFJlZil9XG5cdFx0XHQ8L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cInZzXCI+dnM8L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBiYXNlbGluZVwiPlxuXHRcdFx0XHRCYXNlbGluZTogJHtlc2NhcGVIdG1sKGRhdGEuYmFzZWxpbmVSZWYpfVxuXHRcdFx0PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRcdDxkaXYgY2xhc3M9XCJtZXRhXCI+XG5cdFx0XHQ8c3Bhbj5QUiAjJHtkYXRhLnByTnVtYmVyfTwvc3Bhbj5cblx0XHRcdDxzcGFuPkR1cmF0aW9uOiAkeygoZGF0YS50ZXN0RW5kVGltZSAtIGRhdGEudGVzdFN0YXJ0VGltZSkgLyAxMDAwKS50b0ZpeGVkKDApfXM8L3NwYW4+XG5cdFx0XHQ8c3Bhbj5HZW5lcmF0ZWQ6ICR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpfTwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0PC9oZWFkZXI+XG5cblx0PHNlY3Rpb24gY2xhc3M9XCJzdW1tYXJ5XCI+XG5cdFx0PGgyPvCfk4ogTWV0cmljcyBPdmVydmlldzwvaDI+XG5cdFx0PGRpdiBjbGFzcz1cInN0YXRzXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS50b3RhbH08L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5Ub3RhbCBNZXRyaWNzPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgaW1wcm92ZW1lbnRzXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5pbXByb3ZlbWVudHN9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+SW1wcm92ZW1lbnRzPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgcmVncmVzc2lvbnNcIj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtdmFsdWVcIj4ke2RhdGEuY29tcGFyaXNvbi5zdW1tYXJ5LnJlZ3Jlc3Npb25zfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlJlZ3Jlc3Npb25zPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWNhcmQgc3RhYmxlXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5zdGFibGV9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+U3RhYmxlPC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0XHQke2dlbmVyYXRlQ29tcGFyaXNvblRhYmxlKGRhdGEuY29tcGFyaXNvbil9XG5cdDwvc2VjdGlvbj5cblxuXHQ8c2VjdGlvbiBjbGFzcz1cImNoYXJ0c1wiPlxuXHRcdDxoMj7wn5OIIFRpbWUgU2VyaWVzPC9oMj5cblx0XHQke2dlbmVyYXRlQ2hhcnRzKGRhdGEsIGRhdGEudGVzdFN0YXJ0VGltZSwgZGF0YS50ZXN0RW5kVGltZSl9XG5cdDwvc2VjdGlvbj5cblxuXHQ8Zm9vdGVyPlxuXHRcdDxwPkdlbmVyYXRlZCBieSA8YSBocmVmPVwiaHR0cHM6Ly9naXRodWIuY29tL3lkYi1wbGF0Zm9ybS95ZGItc2xvLWFjdGlvblwiIHRhcmdldD1cIl9ibGFua1wiPnlkYi1zbG8tYWN0aW9uPC9hPjwvcD5cblx0PC9mb290ZXI+XG5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0LmpzL2Rpc3QvY2hhcnQudW1kLm1pbi5qc1wiPjwvc2NyaXB0PlxuXHQ8c2NyaXB0IHNyYz1cImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9ucG0vY2hhcnRqcy1hZGFwdGVyLWRhdGUtZm5zL2Rpc3QvY2hhcnRqcy1hZGFwdGVyLWRhdGUtZm5zLmJ1bmRsZS5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtcGx1Z2luLWFubm90YXRpb24vZGlzdC9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uLm1pbi5qc1wiPjwvc2NyaXB0PlxuXHQ8c2NyaXB0PlxuXHRcdCR7Z2VuZXJhdGVDaGFydFNjcmlwdHMoZGF0YSwgZGF0YS50ZXN0U3RhcnRUaW1lLCBkYXRhLnRlc3RFbmRUaW1lKX1cblx0PC9zY3JpcHQ+XG48L2JvZHk+XG48L2h0bWw+YFxufVxuXG5mdW5jdGlvbiBlc2NhcGVIdG1sKHRleHQ6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiB0ZXh0XG5cdFx0LnJlcGxhY2UoLyYvZywgJyZhbXA7Jylcblx0XHQucmVwbGFjZSgvPC9nLCAnJmx0OycpXG5cdFx0LnJlcGxhY2UoLz4vZywgJyZndDsnKVxuXHRcdC5yZXBsYWNlKC9cIi9nLCAnJnF1b3Q7Jylcblx0XHQucmVwbGFjZSgvJy9nLCAnJiMwMzk7Jylcbn1cblxuLyoqXG4gKiBHZXQgcmVsZXZhbnQgYWdncmVnYXRlcyBmb3IgbWV0cmljIGJhc2VkIG9uIGl0cyB0eXBlXG4gKi9cbmZ1bmN0aW9uIGdldFJlbGV2YW50QWdncmVnYXRlcyhtZXRyaWNOYW1lOiBzdHJpbmcpOiAoJ2F2ZycgfCAncDUwJyB8ICdwOTAnIHwgJ3A5NScpW10ge1xuXHRsZXQgbG93ZXJOYW1lID0gbWV0cmljTmFtZS50b0xvd2VyQ2FzZSgpXG5cblx0Ly8gQXZhaWxhYmlsaXR5IG1ldHJpY3M6IG9ubHkgYXZnIGFuZCBwNTBcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygnYXZhaWxhYmlsaXR5JykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCd1cHRpbWUnKSB8fCBsb3dlck5hbWUuaW5jbHVkZXMoJ3N1Y2Nlc3NfcmF0ZScpKSB7XG5cdFx0cmV0dXJuIFsnYXZnJywgJ3A1MCddXG5cdH1cblxuXHQvLyBMYXRlbmN5L2R1cmF0aW9uIG1ldHJpY3M6IHA1MCwgcDkwLCBwOTUgKG5vIGF2Zylcblx0aWYgKFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnbGF0ZW5jeScpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkdXJhdGlvbicpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aW1lJykgfHxcblx0XHRsb3dlck5hbWUuZW5kc1dpdGgoJ19tcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdkZWxheScpXG5cdCkge1xuXHRcdHJldHVybiBbJ3A1MCcsICdwOTAnLCAncDk1J11cblx0fVxuXG5cdC8vIERlZmF1bHQ6IHNob3cgYWxsXG5cdHJldHVybiBbJ2F2ZycsICdwNTAnLCAncDkwJywgJ3A5NSddXG59XG5cbi8qKlxuICogRm9ybWF0IGFnZ3JlZ2F0ZSBuYW1lIGZvciBkaXNwbGF5XG4gKi9cbmZ1bmN0aW9uIGZvcm1hdEFnZ3JlZ2F0ZU5hbWUoYWdnOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gYWdnIC8vIEtlZXAgdGVjaG5pY2FsIG5hbWVzOiBwNTAsIHA5MCwgcDk1XG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ29tcGFyaXNvblRhYmxlKGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvbik6IHN0cmluZyB7XG5cdGxldCByb3dzID0gY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0Lm1hcCgobSkgPT4ge1xuXHRcdFx0cmV0dXJuIGBcblx0XHQ8dHIgY2xhc3M9XCIke20uY2hhbmdlLmRpcmVjdGlvbn1cIj5cblx0XHRcdDx0ZD5cblx0XHRcdFx0PGEgaHJlZj1cIiNtZXRyaWMtJHtzYW5pdGl6ZUlkKG0ubmFtZSl9XCIgY2xhc3M9XCJtZXRyaWMtbGlua1wiPlxuXHRcdFx0XHRcdCR7ZXNjYXBlSHRtbChtLm5hbWUpfVxuXHRcdFx0XHQ8L2E+XG5cdFx0XHQ8L3RkPlxuXHRcdFx0PHRkPiR7Zm9ybWF0VmFsdWUobS5jdXJyZW50LnZhbHVlLCBtLm5hbWUpfTwvdGQ+XG5cdFx0XHQ8dGQ+JHttLmJhc2VsaW5lLmF2YWlsYWJsZSA/IGZvcm1hdFZhbHVlKG0uYmFzZWxpbmUudmFsdWUsIG0ubmFtZSkgOiAnTi9BJ308L3RkPlxuXHRcdFx0PHRkIGNsYXNzPVwiY2hhbmdlLWNlbGxcIj4ke20uYmFzZWxpbmUuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJ308L3RkPlxuXHRcdDwvdHI+XG5cdGBcblx0XHR9KVxuXHRcdC5qb2luKCcnKVxuXG5cdHJldHVybiBgXG5cdFx0PHRhYmxlIGNsYXNzPVwiY29tcGFyaXNvbi10YWJsZVwiPlxuXHRcdFx0PHRoZWFkPlxuXHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0PHRoPk1ldHJpYzwvdGg+XG5cdFx0XHRcdFx0PHRoPkN1cnJlbnQ8L3RoPlxuXHRcdFx0XHRcdDx0aD5CYXNlbGluZTwvdGg+XG5cdFx0XHRcdFx0PHRoPkNoYW5nZTwvdGg+XG5cdFx0XHRcdDwvdHI+XG5cdFx0XHQ8L3RoZWFkPlxuXHRcdFx0PHRib2R5PlxuXHRcdFx0XHQke3Jvd3N9XG5cdFx0XHQ8L3Rib2R5PlxuXHRcdDwvdGFibGU+XG5cdGBcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydHMoZGF0YTogSFRNTFJlcG9ydERhdGEsIGdsb2JhbFN0YXJ0VGltZTogbnVtYmVyLCBnbG9iYWxFbmRUaW1lOiBudW1iZXIpOiBzdHJpbmcge1xuXHRyZXR1cm4gZGF0YS5jb21wYXJpc29uLm1ldHJpY3Ncblx0XHQuZmlsdGVyKChtKSA9PiBtLnR5cGUgPT09ICdyYW5nZScpIC8vIE9ubHkgcmFuZ2UgbWV0cmljcyBoYXZlIGNoYXJ0c1xuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0Ly8gU2tpcCBtZXRyaWNzIHdpdGggbm8gZGF0YSAoZW1wdHkgZGF0YSBhcnJheSBvciBubyBzZXJpZXMpXG5cdFx0XHRpZiAoIW1ldHJpYy5kYXRhIHx8IG1ldHJpYy5kYXRhLmxlbmd0aCA9PT0gMCkge1xuXHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdH1cblxuXHRcdFx0Ly8gU2tpcCBpZiBhbGwgc2VyaWVzIGFyZSBlbXB0eVxuXHRcdFx0bGV0IGhhc0RhdGEgPSAobWV0cmljLmRhdGEgYXMgU2VyaWVzW10pLnNvbWUoKHMpID0+IHMudmFsdWVzICYmIHMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRpZiAoIWhhc0RhdGEpIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdC8vIEZpbHRlciBldmVudHMgdGhhdCBhcmUgcmVsZXZhbnQgdG8gdGhpcyBtZXRyaWMncyB0aW1lZnJhbWVcblx0XHRcdGxldCByZWxldmFudEV2ZW50cyA9IGRhdGEuZXZlbnRzLmZpbHRlcihcblx0XHRcdFx0KGUpID0+IGUudGltZXN0YW1wID49IGdsb2JhbFN0YXJ0VGltZSAmJiBlLnRpbWVzdGFtcCA8PSBnbG9iYWxFbmRUaW1lXG5cdFx0XHQpXG5cblx0XHRcdGxldCBldmVudHNUaW1lbGluZSA9IHJlbGV2YW50RXZlbnRzLmxlbmd0aCA+IDAgPyBnZW5lcmF0ZUNoYXJ0RXZlbnRzVGltZWxpbmUocmVsZXZhbnRFdmVudHMpIDogJydcblxuXHRcdFx0Ly8gR2VuZXJhdGUgYWdncmVnYXRlcyBzdW1tYXJ5IGZvciBjaGFydCBoZWFkZXJcblx0XHRcdGxldCBtZXRhU3VtbWFyeSA9ICcnXG5cdFx0XHRpZiAoY29tcGFyaXNvbi5jdXJyZW50LmFnZ3JlZ2F0ZXMgJiYgY29tcGFyaXNvbi5iYXNlbGluZS5hZ2dyZWdhdGVzKSB7XG5cdFx0XHRcdGxldCBjdXJyZW50QWdnID0gY29tcGFyaXNvbi5jdXJyZW50LmFnZ3JlZ2F0ZXNcblx0XHRcdFx0bGV0IGJhc2VBZ2cgPSBjb21wYXJpc29uLmJhc2VsaW5lLmFnZ3JlZ2F0ZXNcblxuXHRcdFx0XHQvLyBHZXQgcmVsZXZhbnQgYWdncmVnYXRlcyBmb3IgdGhpcyBtZXRyaWNcblx0XHRcdFx0bGV0IHJlbGV2YW50QWdncyA9IGdldFJlbGV2YW50QWdncmVnYXRlcyhjb21wYXJpc29uLm5hbWUpXG5cblx0XHRcdFx0Ly8gR2VuZXJhdGUgdGFibGUgaGVhZGVyXG5cdFx0XHRcdGxldCBoZWFkZXJDZWxscyA9IHJlbGV2YW50QWdncy5tYXAoKGFnZykgPT4gYDx0aD4ke2Zvcm1hdEFnZ3JlZ2F0ZU5hbWUoYWdnKX08L3RoPmApLmpvaW4oJycpXG5cblx0XHRcdFx0Ly8gR2VuZXJhdGUgY3VycmVudCByb3dcblx0XHRcdFx0bGV0IGN1cnJlbnRDZWxscyA9IHJlbGV2YW50QWdnc1xuXHRcdFx0XHRcdC5tYXAoKGFnZykgPT4gYDx0ZD4ke2Zvcm1hdFZhbHVlKGN1cnJlbnRBZ2dbYWdnXSwgY29tcGFyaXNvbi5uYW1lKX08L3RkPmApXG5cdFx0XHRcdFx0LmpvaW4oJycpXG5cblx0XHRcdFx0Ly8gR2VuZXJhdGUgYmFzZWxpbmUgcm93XG5cdFx0XHRcdGxldCBiYXNlQ2VsbHMgPSByZWxldmFudEFnZ3Ncblx0XHRcdFx0XHQubWFwKChhZ2cpID0+IGA8dGQ+JHtmb3JtYXRWYWx1ZShiYXNlQWdnW2FnZ10sIGNvbXBhcmlzb24ubmFtZSl9PC90ZD5gKVxuXHRcdFx0XHRcdC5qb2luKCcnKVxuXG5cdFx0XHRcdG1ldGFTdW1tYXJ5ID0gYFxuXHRcdFx0XHRcdDx0YWJsZSBjbGFzcz1cImFnZ3JlZ2F0ZXMtdGFibGVcIj5cblx0XHRcdFx0XHRcdDx0aGVhZD5cblx0XHRcdFx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdFx0XHRcdDx0aD48L3RoPlxuXHRcdFx0XHRcdFx0XHRcdCR7aGVhZGVyQ2VsbHN9XG5cdFx0XHRcdFx0XHRcdDwvdHI+XG5cdFx0XHRcdFx0XHQ8L3RoZWFkPlxuXHRcdFx0XHRcdFx0PHRib2R5PlxuXHRcdFx0XHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicm93LWxhYmVsXCI+Q3VycmVudDwvdGQ+XG5cdFx0XHRcdFx0XHRcdFx0JHtjdXJyZW50Q2VsbHN9XG5cdFx0XHRcdFx0XHRcdDwvdHI+XG5cdFx0XHRcdFx0XHRcdDx0cj5cblx0XHRcdFx0XHRcdFx0XHQ8dGQgY2xhc3M9XCJyb3ctbGFiZWxcIj5CYXNlbGluZTwvdGQ+XG5cdFx0XHRcdFx0XHRcdFx0JHtiYXNlQ2VsbHN9XG5cdFx0XHRcdFx0XHRcdDwvdHI+XG5cdFx0XHRcdFx0XHQ8L3Rib2R5PlxuXHRcdFx0XHRcdDwvdGFibGU+XG5cdFx0XHRcdGBcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdG1ldGFTdW1tYXJ5ID0gYFxuXHRcdFx0XHRcdEN1cnJlbnQ6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlLCBjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdCR7Y29tcGFyaXNvbi5iYXNlbGluZS5hdmFpbGFibGUgPyBgIOKAoiBCYXNlbGluZTogJHtmb3JtYXRWYWx1ZShjb21wYXJpc29uLmJhc2VsaW5lLnZhbHVlLCBjb21wYXJpc29uLm5hbWUpfWAgOiAnJ31cblx0XHRcdFx0YFxuXHRcdFx0fVxuXG5cdFx0XHRyZXR1cm4gYFxuXHRcdDxkaXYgY2xhc3M9XCJjaGFydC1jYXJkXCIgaWQ9XCJtZXRyaWMtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtaGVhZGVyXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC10aXRsZS1zZWN0aW9uXCI+XG5cdFx0XHRcdFx0PGgzPlxuXHRcdFx0XHRcdFx0JHtlc2NhcGVIdG1sKGNvbXBhcmlzb24ubmFtZSl9XG5cdFx0XHRcdFx0XHQ8c3BhbiBjbGFzcz1cImluZGljYXRvciAke2NvbXBhcmlzb24uY2hhbmdlLmRpcmVjdGlvbn1cIj4ke2Zvcm1hdENoYW5nZShjb21wYXJpc29uLmNoYW5nZS5wZXJjZW50LCBjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb24pfTwvc3Bhbj5cblx0XHRcdFx0XHQ8L2gzPlxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LW1ldGFcIj5cblx0XHRcdFx0XHQke21ldGFTdW1tYXJ5fVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdDwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWNvbnRhaW5lclwiPlxuXHRcdFx0XHQ8Y2FudmFzIGlkPVwiY2hhcnQtJHtzYW5pdGl6ZUlkKGNvbXBhcmlzb24ubmFtZSl9XCI+PC9jYW52YXM+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdCR7ZXZlbnRzVGltZWxpbmV9XG5cdFx0PC9kaXY+XG5cdGBcblx0XHR9KVxuXHRcdC5qb2luKCcnKVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNoYXJ0RXZlbnRzVGltZWxpbmUoZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdKTogc3RyaW5nIHtcblx0aWYgKGV2ZW50cy5sZW5ndGggPT09IDApIHJldHVybiAnJ1xuXG5cdGxldCBldmVudEl0ZW1zID0gZXZlbnRzXG5cdFx0Lm1hcChcblx0XHRcdChlLCBpZHgpID0+IGBcblx0XHQ8ZGl2IGNsYXNzPVwidGltZWxpbmUtZXZlbnRcIiBkYXRhLWV2ZW50LWlkPVwiJHtpZHh9XCIgdGl0bGU9XCIke2VzY2FwZUh0bWwoZS5sYWJlbCl9XCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LWljb25cIj4ke2UuaWNvbn08L3NwYW4+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImV2ZW50LXRpbWVcIj4ke2Zvcm1hdFRpbWVzdGFtcChlLnRpbWVzdGFtcCl9PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1sYWJlbFwiPiR7ZXNjYXBlSHRtbChlLmxhYmVsKX08L3NwYW4+XG5cdFx0PC9kaXY+XG5cdGBcblx0XHQpXG5cdFx0LmpvaW4oJycpXG5cblx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtZXZlbnRzLXRpbWVsaW5lXCI+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwidGltZWxpbmUtdGl0bGVcIj5FdmVudHM6PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwidGltZWxpbmUtZXZlbnRzXCI+XG5cdFx0XHRcdCR7ZXZlbnRJdGVtc31cblx0XHRcdDwvZGl2PlxuXHRcdDwvZGl2PlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGE6IEhUTUxSZXBvcnREYXRhLCBnbG9iYWxTdGFydFRpbWU6IG51bWJlciwgZ2xvYmFsRW5kVGltZTogbnVtYmVyKTogc3RyaW5nIHtcblx0bGV0IGNoYXJ0U2NyaXB0cyA9IGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKVxuXHRcdC5tYXAoKGNvbXBhcmlzb24pID0+IHtcblx0XHRcdGxldCBtZXRyaWMgPSBkYXRhLm1ldHJpY3MuZ2V0KGNvbXBhcmlzb24ubmFtZSlcblx0XHRcdGlmICghbWV0cmljKSByZXR1cm4gJydcblxuXHRcdFx0Ly8gU2tpcCBtZXRyaWNzIHdpdGggbm8gZGF0YVxuXHRcdFx0aWYgKCFtZXRyaWMuZGF0YSB8fCBtZXRyaWMuZGF0YS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cdFx0XHRsZXQgaGFzRGF0YSA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuc29tZSgocykgPT4gcy52YWx1ZXMgJiYgcy52YWx1ZXMubGVuZ3RoID4gMClcblx0XHRcdGlmICghaGFzRGF0YSkge1xuXHRcdFx0XHRyZXR1cm4gJydcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoXG5cdFx0XHRcdGNvbXBhcmlzb24ubmFtZSxcblx0XHRcdFx0bWV0cmljIGFzIENvbGxlY3RlZE1ldHJpYyxcblx0XHRcdFx0ZGF0YS5ldmVudHMsXG5cdFx0XHRcdGdsb2JhbFN0YXJ0VGltZSxcblx0XHRcdFx0Z2xvYmFsRW5kVGltZSxcblx0XHRcdFx0ZGF0YS5jdXJyZW50UmVmLFxuXHRcdFx0XHRkYXRhLmJhc2VsaW5lUmVmXG5cdFx0XHQpXG5cdFx0fSlcblx0XHQuam9pbignXFxuJylcblxuXHRyZXR1cm4gY2hhcnRTY3JpcHRzXG59XG5cbi8qKlxuICogRmlsdGVyIG91dGxpZXJzIGZyb20gdGltZSBzZXJpZXMgZGF0YSB1c2luZyBwZXJjZW50aWxlc1xuICogUmVtb3ZlcyB2YWx1ZXMgb3V0c2lkZSBbcDEsIHA5OV0gcmFuZ2VcbiAqL1xuZnVuY3Rpb24gZmlsdGVyT3V0bGllcnModmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10pOiBbbnVtYmVyLCBzdHJpbmddW10ge1xuXHRpZiAodmFsdWVzLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlc1xuXG5cdC8vIEV4dHJhY3QgbnVtZXJpYyB2YWx1ZXNcblx0bGV0IG51bXMgPSB2YWx1ZXMubWFwKChbLCB2XSkgPT4gcGFyc2VGbG9hdCh2KSkuZmlsdGVyKChuKSA9PiAhaXNOYU4obikpXG5cdGlmIChudW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIHZhbHVlc1xuXG5cdC8vIFNvcnQgZm9yIHBlcmNlbnRpbGUgY2FsY3VsYXRpb25cblx0bnVtcy5zb3J0KChhLCBiKSA9PiBhIC0gYilcblxuXHQvLyBDYWxjdWxhdGUgcDEgYW5kIHA5OVxuXHRsZXQgcDFJbmRleCA9IE1hdGguZmxvb3IobnVtcy5sZW5ndGggKiAwLjAxKVxuXHRsZXQgcDk5SW5kZXggPSBNYXRoLmZsb29yKG51bXMubGVuZ3RoICogMC45OSlcblx0bGV0IHAxID0gbnVtc1twMUluZGV4XVxuXHRsZXQgcDk5ID0gbnVtc1twOTlJbmRleF1cblxuXHQvLyBGaWx0ZXIgdmFsdWVzIHdpdGhpbiBbcDEsIHA5OV1cblx0cmV0dXJuIHZhbHVlcy5maWx0ZXIoKFssIHZdKSA9PiB7XG5cdFx0bGV0IG51bSA9IHBhcnNlRmxvYXQodilcblx0XHRyZXR1cm4gIWlzTmFOKG51bSkgJiYgbnVtID49IHAxICYmIG51bSA8PSBwOTlcblx0fSlcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVTaW5nbGVDaGFydFNjcmlwdChcblx0bWV0cmljTmFtZTogc3RyaW5nLFxuXHRtZXRyaWM6IENvbGxlY3RlZE1ldHJpYyxcblx0ZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdLFxuXHRnbG9iYWxTdGFydFRpbWU6IG51bWJlcixcblx0Z2xvYmFsRW5kVGltZTogbnVtYmVyLFxuXHRjdXJyZW50UmVmOiBzdHJpbmcsXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBjdXJyZW50U2VyaWVzID0gKG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdKS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpXG5cdGxldCBiYXNlbGluZVNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSBiYXNlbGluZVJlZilcblxuXHQvLyBGaWx0ZXIgb3V0bGllcnMgZnJvbSBib3RoIHNlcmllc1xuXHRsZXQgZmlsdGVyZWRDdXJyZW50VmFsdWVzID0gY3VycmVudFNlcmllcyA/IGZpbHRlck91dGxpZXJzKGN1cnJlbnRTZXJpZXMudmFsdWVzKSA6IFtdXG5cdGxldCBmaWx0ZXJlZEJhc2VsaW5lVmFsdWVzID0gYmFzZWxpbmVTZXJpZXMgPyBmaWx0ZXJPdXRsaWVycyhiYXNlbGluZVNlcmllcy52YWx1ZXMpIDogW11cblxuXHRsZXQgY3VycmVudERhdGEgPVxuXHRcdGZpbHRlcmVkQ3VycmVudFZhbHVlcy5sZW5ndGggPiAwXG5cdFx0XHQ/IEpTT04uc3RyaW5naWZ5KGZpbHRlcmVkQ3VycmVudFZhbHVlcy5tYXAoKFt0LCB2XSkgPT4gKHsgeDogdCAqIDEwMDAsIHk6IHBhcnNlRmxvYXQodikgfSkpKVxuXHRcdFx0OiAnW10nXG5cblx0bGV0IGJhc2VsaW5lRGF0YSA9XG5cdFx0ZmlsdGVyZWRCYXNlbGluZVZhbHVlcy5sZW5ndGggPiAwXG5cdFx0XHQ/IEpTT04uc3RyaW5naWZ5KGZpbHRlcmVkQmFzZWxpbmVWYWx1ZXMubWFwKChbdCwgdl0pID0+ICh7IHg6IHQgKiAxMDAwLCB5OiBwYXJzZUZsb2F0KHYpIH0pKSlcblx0XHRcdDogJ1tdJ1xuXG5cdC8vIEdlbmVyYXRlIGFubm90YXRpb25zIGZvciB0ZXN0IGJvdW5kYXJpZXNcblx0bGV0IGJvdW5kYXJ5QW5ub3RhdGlvbnM6IHN0cmluZ1tdID0gW1xuXHRcdGB7XG5cdFx0XHR0eXBlOiAnbGluZScsXG5cdFx0XHR4TWluOiAke2dsb2JhbFN0YXJ0VGltZX0sXG5cdFx0XHR4TWF4OiAke2dsb2JhbFN0YXJ0VGltZX0sXG5cdFx0XHRib3JkZXJDb2xvcjogJyMxMGI5ODEnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRib3JkZXJEYXNoOiBbNSwgNV1cblx0XHR9YCxcblx0XHRge1xuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0eE1pbjogJHtnbG9iYWxFbmRUaW1lfSxcblx0XHRcdHhNYXg6ICR7Z2xvYmFsRW5kVGltZX0sXG5cdFx0XHRib3JkZXJDb2xvcjogJyNlZjQ0NDQnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDIsXG5cdFx0XHRib3JkZXJEYXNoOiBbNSwgNV1cblx0XHR9YCxcblx0XVxuXG5cdC8vIFNlcGFyYXRlIGV2ZW50cyBpbnRvIGJveGVzICh3aXRoIGR1cmF0aW9uKSBhbmQgbGluZXMgKGluc3RhbnQpXG5cdGxldCBib3hBbm5vdGF0aW9uczogc3RyaW5nW10gPSBbXVxuXHRsZXQgbGluZUFubm90YXRpb25zOiBzdHJpbmdbXSA9IFtdXG5cblx0Zm9yIChsZXQgaSA9IDA7IGkgPCBldmVudHMubGVuZ3RoOyBpKyspIHtcblx0XHRsZXQgZSA9IGV2ZW50c1tpXVxuXHRcdGlmIChlLmR1cmF0aW9uX21zKSB7XG5cdFx0XHQvLyBCb3ggYW5ub3RhdGlvbiBmb3IgZXZlbnRzIHdpdGggZHVyYXRpb24gKHRpbWVzdGFtcCBhbHJlYWR5IGluIG1zKVxuXHRcdFx0bGV0IHhNYXggPSBlLnRpbWVzdGFtcCArIGUuZHVyYXRpb25fbXNcblx0XHRcdC8vIEFkZCBzZW1pLXRyYW5zcGFyZW50IGJveCAoYmVoaW5kIGdyYXBoKVxuXHRcdFx0Ym94QW5ub3RhdGlvbnMucHVzaChge1xuXHRcdFx0aWQ6ICdldmVudC1iZy0ke2l9Jyxcblx0XHRcdHR5cGU6ICdib3gnLFxuXHRcdFx0ZHJhd1RpbWU6ICdiZWZvcmVEYXRhc2V0c0RyYXcnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcH0sXG5cdFx0XHR4TWF4OiAke3hNYXh9LFxuXHRcdFx0YmFja2dyb3VuZENvbG9yOiAncmdiYSgyNTEsIDE0NiwgNjAsIDAuMDgpJyxcblx0XHRcdGJvcmRlckNvbG9yOiAndHJhbnNwYXJlbnQnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDBcblx0XHR9YClcblx0XHRcdC8vIEFkZCB0aGljayBob3Jpem9udGFsIGxpbmUgYXQgYm90dG9tIChiZWhpbmQgZ3JhcGgpXG5cdFx0XHRib3hBbm5vdGF0aW9ucy5wdXNoKGB7XG5cdFx0XHRpZDogJ2V2ZW50LWJhci0ke2l9Jyxcblx0XHRcdHR5cGU6ICdib3gnLFxuXHRcdFx0ZHJhd1RpbWU6ICdiZWZvcmVEYXRhc2V0c0RyYXcnLFxuXHRcdFx0eE1pbjogJHtlLnRpbWVzdGFtcH0sXG5cdFx0XHR4TWF4OiAke3hNYXh9LFxuXHRcdFx0eU1pbjogKGN0eCkgPT4gY3R4LmNoYXJ0LnNjYWxlcy55Lm1pbixcblx0XHRcdHlNYXg6IChjdHgpID0+IGN0eC5jaGFydC5zY2FsZXMueS5taW4gKyAoY3R4LmNoYXJ0LnNjYWxlcy55Lm1heCAtIGN0eC5jaGFydC5zY2FsZXMueS5taW4pICogMC4wMixcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJyNmOTczMTYnLFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICd0cmFuc3BhcmVudCcsXG5cdFx0XHRib3JkZXJXaWR0aDogMFxuXHRcdH1gKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHQvLyBMaW5lIGFubm90YXRpb24gZm9yIGluc3RhbnQgZXZlbnRzICh0aW1lc3RhbXAgYWxyZWFkeSBpbiBtcylcblx0XHRcdGxpbmVBbm5vdGF0aW9ucy5wdXNoKGB7XG5cdFx0XHRpZDogJ2V2ZW50LWxpbmUtJHtpfScsXG5cdFx0XHR0eXBlOiAnbGluZScsXG5cdFx0XHRkcmF3VGltZTogJ2FmdGVyRGF0YXNldHNEcmF3Jyxcblx0XHRcdHhNaW46ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0eE1heDogJHtlLnRpbWVzdGFtcH0sXG5cdFx0XHRib3JkZXJDb2xvcjogJyNmOTczMTYnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDJcblx0XHR9YClcblx0XHR9XG5cdH1cblxuXHQvLyBDb21iaW5lIGFsbCBhbm5vdGF0aW9uczogYm94ZXMgZmlyc3QgKGJlaGluZCksIHRoZW4gYm91bmRhcmllcywgdGhlbiBsaW5lcyAoZnJvbnQpXG5cdGxldCBhbGxBbm5vdGF0aW9ucyA9IFsuLi5ib3hBbm5vdGF0aW9ucywgLi4uYm91bmRhcnlBbm5vdGF0aW9ucywgLi4ubGluZUFubm90YXRpb25zXS5qb2luKCcsXFxuJylcblxuXHRyZXR1cm4gYFxuKGZ1bmN0aW9uKCkge1xuXHRjb25zdCBjdHggPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY2hhcnQtJHtzYW5pdGl6ZUlkKG1ldHJpY05hbWUpfScpO1xuXHRpZiAoIWN0eCkgcmV0dXJuO1xuXG5cdGNvbnN0IGNoYXJ0ID0gbmV3IENoYXJ0KGN0eCwge1xuXHRcdHR5cGU6ICdsaW5lJyxcblx0XHRkYXRhOiB7XG5cdFx0ZGF0YXNldHM6IFtcblx0XHRcdHtcblx0XHRcdFx0bGFiZWw6ICcke2VzY2FwZUh0bWwoY3VycmVudFJlZil9Jyxcblx0XHRcdFx0ZGF0YTogJHtjdXJyZW50RGF0YX0sXG5cdFx0XHRcdGJvcmRlckNvbG9yOiAnIzNiODJmNicsXG5cdFx0XHRcdGJhY2tncm91bmRDb2xvcjogJyMzYjgyZjYyMCcsXG5cdFx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0XHRwb2ludFJhZGl1czogMixcblx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0dGVuc2lvbjogMC4xLFxuXHRcdFx0XHRmaWxsOiB0cnVlXG5cdFx0XHR9LFxuXHRcdFx0JHtcblx0XHRcdFx0YmFzZWxpbmVTZXJpZXNcblx0XHRcdFx0XHQ/IGB7XG5cdFx0XHRcdGxhYmVsOiAnJHtlc2NhcGVIdG1sKGJhc2VsaW5lUmVmKX0nLFxuXHRcdFx0XHRkYXRhOiAke2Jhc2VsaW5lRGF0YX0sXG5cdFx0XHRcdFx0Ym9yZGVyQ29sb3I6ICcjOTRhM2I4Jyxcblx0XHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjOTRhM2I4MjAnLFxuXHRcdFx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0XHRcdGJvcmRlckRhc2g6IFs1LCA1XSxcblx0XHRcdFx0XHRwb2ludFJhZGl1czogMixcblx0XHRcdFx0XHRwb2ludEhvdmVyUmFkaXVzOiA0LFxuXHRcdFx0XHRcdHRlbnNpb246IDAuMSxcblx0XHRcdFx0XHRmaWxsOiB0cnVlXG5cdFx0XHRcdH1gXG5cdFx0XHRcdFx0OiAnJ1xuXHRcdFx0fVxuXHRcdFx0XVxuXHRcdH0sXG5cdFx0b3B0aW9uczoge1xuXHRcdFx0cmVzcG9uc2l2ZTogdHJ1ZSxcblx0XHRcdG1haW50YWluQXNwZWN0UmF0aW86IGZhbHNlLFxuXHRcdFx0aW50ZXJhY3Rpb246IHtcblx0XHRcdFx0bW9kZTogJ2luZGV4Jyxcblx0XHRcdFx0aW50ZXJzZWN0OiBmYWxzZVxuXHRcdFx0fSxcblx0XHRzY2FsZXM6IHtcblx0XHRcdHg6IHtcblx0XHRcdFx0dHlwZTogJ3RpbWUnLFxuXHRcdFx0XHRtaW46ICR7Z2xvYmFsU3RhcnRUaW1lfSxcblx0XHRcdFx0bWF4OiAke2dsb2JhbEVuZFRpbWV9LFxuXHRcdFx0XHR0aW1lOiB7XG5cdFx0XHRcdFx0dW5pdDogJ21pbnV0ZScsXG5cdFx0XHRcdFx0ZGlzcGxheUZvcm1hdHM6IHtcblx0XHRcdFx0XHRcdG1pbnV0ZTogJ0hIOm1tJ1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSxcblx0XHRcdFx0dGl0bGU6IHtcblx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdHRleHQ6ICdUaW1lJ1xuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0XHR5OiB7XG5cdFx0XHRcdFx0YmVnaW5BdFplcm86IGZhbHNlLFxuXHRcdFx0XHRcdGdyYWNlOiAnMTAlJyxcblx0XHRcdFx0XHR0aXRsZToge1xuXHRcdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHRcdHRleHQ6ICcke2VzY2FwZUpzKG1ldHJpY05hbWUpfSdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0sXG5cdFx0XHRwbHVnaW5zOiB7XG5cdFx0XHRcdGxlZ2VuZDoge1xuXHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0cG9zaXRpb246ICd0b3AnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRvb2x0aXA6IHtcblx0XHRcdFx0XHRtb2RlOiAnaW5kZXgnLFxuXHRcdFx0XHRcdGludGVyc2VjdDogZmFsc2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0YW5ub3RhdGlvbjoge1xuXHRcdFx0XHRcdGFubm90YXRpb25zOiBbJHthbGxBbm5vdGF0aW9uc31dXG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9XG5cdH0pO1xuXG5cdC8vIFN0b3JlIGNoYXJ0IHJlZmVyZW5jZSBmb3IgaW50ZXJhY3Rpb25cblx0Y3R4LmNoYXJ0SW5zdGFuY2UgPSBjaGFydDtcblxuXHQvLyBBZGQgaG92ZXIgaGFuZGxlcnMgZm9yIHRpbWVsaW5lIGV2ZW50c1xuXHRjb25zdCBjaGFydENhcmQgPSBjdHguY2xvc2VzdCgnLmNoYXJ0LWNhcmQnKTtcblx0aWYgKGNoYXJ0Q2FyZCkge1xuXHRcdGNvbnN0IHRpbWVsaW5lRXZlbnRzID0gY2hhcnRDYXJkLnF1ZXJ5U2VsZWN0b3JBbGwoJy50aW1lbGluZS1ldmVudCcpO1xuXHRcdHRpbWVsaW5lRXZlbnRzLmZvckVhY2goKGV2ZW50RWwpID0+IHtcblx0XHRcdGNvbnN0IGV2ZW50SWQgPSBwYXJzZUludChldmVudEVsLmdldEF0dHJpYnV0ZSgnZGF0YS1ldmVudC1pZCcpKTtcblxuXHRcdFx0ZXZlbnRFbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWVudGVyJywgKCkgPT4ge1xuXHRcdFx0XHQvLyBBY2Nlc3MgYW5ub3RhdGlvbnMgYXJyYXlcblx0XHRcdFx0Y29uc3QgYW5ub3RhdGlvbnMgPSBjaGFydC5jb25maWcub3B0aW9ucy5wbHVnaW5zLmFubm90YXRpb24uYW5ub3RhdGlvbnM7XG5cblx0XHRcdFx0Ly8gRmluZCBhbmQgdXBkYXRlIGFubm90YXRpb25zIGZvciB0aGlzIGV2ZW50XG5cdFx0XHRcdGZvciAobGV0IGkgPSAwOyBpIDwgYW5ub3RhdGlvbnMubGVuZ3RoOyBpKyspIHtcblx0XHRcdFx0XHRjb25zdCBhbm4gPSBhbm5vdGF0aW9uc1tpXTtcblx0XHRcdFx0XHRpZiAoYW5uLmlkID09PSAnZXZlbnQtYmctJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5iYWNrZ3JvdW5kQ29sb3IgPSAncmdiYSgyNTEsIDE0NiwgNjAsIDAuMzUpJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubi5pZCA9PT0gJ2V2ZW50LWJhci0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICcjZmI5MjNjJztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKGFubi5pZCA9PT0gJ2V2ZW50LWxpbmUtJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5ib3JkZXJDb2xvciA9ICcjZmI5MjNjJztcblx0XHRcdFx0XHRcdGFubi5ib3JkZXJXaWR0aCA9IDQ7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cblx0XHRcdFx0Y2hhcnQudXBkYXRlKCdub25lJyk7XG5cdFx0XHR9KTtcblxuXHRcdFx0ZXZlbnRFbC5hZGRFdmVudExpc3RlbmVyKCdtb3VzZWxlYXZlJywgKCkgPT4ge1xuXHRcdFx0XHQvLyBBY2Nlc3MgYW5ub3RhdGlvbnMgYXJyYXlcblx0XHRcdFx0Y29uc3QgYW5ub3RhdGlvbnMgPSBjaGFydC5jb25maWcub3B0aW9ucy5wbHVnaW5zLmFubm90YXRpb24uYW5ub3RhdGlvbnM7XG5cblx0XHRcdFx0Ly8gUmVzdG9yZSBhbm5vdGF0aW9ucyBmb3IgdGhpcyBldmVudFxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFubm90YXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Y29uc3QgYW5uID0gYW5ub3RhdGlvbnNbaV07XG5cdFx0XHRcdFx0aWYgKGFubi5pZCA9PT0gJ2V2ZW50LWJnLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMjUxLCAxNDYsIDYwLCAwLjA4KSc7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbm4uaWQgPT09ICdldmVudC1iYXItJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5iYWNrZ3JvdW5kQ29sb3IgPSAnI2Y5NzMxNic7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbm4uaWQgPT09ICdldmVudC1saW5lLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYm9yZGVyQ29sb3IgPSAnI2Y5NzMxNic7XG5cdFx0XHRcdFx0XHRhbm4uYm9yZGVyV2lkdGggPSAyO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNoYXJ0LnVwZGF0ZSgnbm9uZScpO1xuXHRcdFx0fSk7XG5cdFx0fSk7XG5cdH1cbn0pKCk7XG5gXG59XG5cbmZ1bmN0aW9uIHNhbml0aXplSWQoc3RyOiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gc3RyLnJlcGxhY2UoL1teYS16QS1aMC05XS9nLCAnLScpXG59XG5cbmZ1bmN0aW9uIGVzY2FwZUpzKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC9cXFxcL2csICdcXFxcXFxcXCcpLnJlcGxhY2UoLycvZywgXCJcXFxcJ1wiKS5yZXBsYWNlKC9cIi9nLCAnXFxcXFwiJykucmVwbGFjZSgvXFxuL2csICdcXFxcbicpXG59XG5cbmZ1bmN0aW9uIGZvcm1hdFRpbWVzdGFtcCh0aW1lc3RhbXA6IG51bWJlcik6IHN0cmluZyB7XG5cdGxldCBkYXRlID0gbmV3IERhdGUodGltZXN0YW1wKSAvLyB0aW1lc3RhbXAgYWxyZWFkeSBpbiBtaWxsaXNlY29uZHNcblx0Ly8gRm9ybWF0IGFzIGxvY2FsIHRpbWUgSEg6TU06U1Ncblx0bGV0IGhvdXJzID0gZGF0ZS5nZXRIb3VycygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKVxuXHRsZXQgbWludXRlcyA9IGRhdGUuZ2V0TWludXRlcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKVxuXHRsZXQgc2Vjb25kcyA9IGRhdGUuZ2V0U2Vjb25kcygpLnRvU3RyaW5nKCkucGFkU3RhcnQoMiwgJzAnKVxuXHRyZXR1cm4gYCR7aG91cnN9OiR7bWludXRlc306JHtzZWNvbmRzfWBcbn1cblxuZnVuY3Rpb24gZ2V0U3R5bGVzKCk6IHN0cmluZyB7XG5cdHJldHVybiBgXG4qIHtcblx0bWFyZ2luOiAwO1xuXHRwYWRkaW5nOiAwO1xuXHRib3gtc2l6aW5nOiBib3JkZXItYm94O1xufVxuXG5odG1sIHtcblx0c2Nyb2xsLWJlaGF2aW9yOiBzbW9vdGg7XG59XG5cbmJvZHkge1xuXHRmb250LWZhbWlseTogLWFwcGxlLXN5c3RlbSwgQmxpbmtNYWNTeXN0ZW1Gb250LCAnU2Vnb2UgVUknLCBSb2JvdG8sICdIZWx2ZXRpY2EgTmV1ZScsIEFyaWFsLCBzYW5zLXNlcmlmO1xuXHRsaW5lLWhlaWdodDogMS42O1xuXHRjb2xvcjogIzI0MjkyZjtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0cGFkZGluZzogMjBweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRib2R5IHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGNvbG9yOiAjYzlkMWQ5O1xuXHR9XG59XG5cbmhlYWRlciB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDAgYXV0byA0MHB4O1xuXHRwYWRkaW5nOiAzMHB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdGJvcmRlcjogMXB4IHNvbGlkICNkMGQ3ZGU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0aGVhZGVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG5oZWFkZXIgaDEge1xuXHRmb250LXNpemU6IDMycHg7XG5cdG1hcmdpbi1ib3R0b206IDE1cHg7XG59XG5cbi5jb21taXQtaW5mbyB7XG5cdGZvbnQtc2l6ZTogMTZweDtcblx0bWFyZ2luLWJvdHRvbTogMTBweDtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxNXB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG59XG5cbi5jb21taXQge1xuXHRwYWRkaW5nOiA0cHggOHB4O1xuXHRib3JkZXItcmFkaXVzOiA0cHg7XG5cdGZvbnQtZmFtaWx5OiAnQ291cmllciBOZXcnLCBtb25vc3BhY2U7XG5cdGZvbnQtc2l6ZTogMTRweDtcbn1cblxuLmNvbW1pdC5jdXJyZW50IHtcblx0YmFja2dyb3VuZDogI2RmZjZkZDtcblx0Y29sb3I6ICMxYTdmMzc7XG59XG5cbi5jb21taXQuYmFzZWxpbmUge1xuXHRiYWNrZ3JvdW5kOiAjZGRmNGZmO1xuXHRjb2xvcjogIzA5NjlkYTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tbWl0LmN1cnJlbnQge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTY7XG5cdFx0Y29sb3I6ICMzZmI5NTA7XG5cdH1cblx0LmNvbW1pdC5iYXNlbGluZSB7XG5cdFx0YmFja2dyb3VuZDogIzBjMmQ2Yjtcblx0XHRjb2xvcjogIzU4YTZmZjtcblx0fVxufVxuXG4uY29tbWl0IGEge1xuXHRjb2xvcjogaW5oZXJpdDtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4uY29tbWl0IGE6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuLnZzIHtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5tZXRhIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0ZGlzcGxheTogZmxleDtcblx0Z2FwOiAxNXB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG59XG5cbnNlY3Rpb24ge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcbn1cblxuc2VjdGlvbiBoMiB7XG5cdGZvbnQtc2l6ZTogMjRweDtcblx0bWFyZ2luLWJvdHRvbTogMjBweDtcblx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdHBhZGRpbmctYm90dG9tOiAxMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdHNlY3Rpb24gaDIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uc3RhdHMge1xuXHRkaXNwbGF5OiBncmlkO1xuXHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdChhdXRvLWZpdCwgbWlubWF4KDIwMHB4LCAxZnIpKTtcblx0Z2FwOiAxNXB4O1xuXHRtYXJnaW4tYm90dG9tOiAzMHB4O1xufVxuXG4uc3RhdC1jYXJkIHtcblx0cGFkZGluZzogMjBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDJweCBzb2xpZCAjZDBkN2RlO1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG59XG5cbi5zdGF0LWNhcmQuaW1wcm92ZW1lbnRzIHtcblx0Ym9yZGVyLWNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uc3RhdC1jYXJkLnJlZ3Jlc3Npb25zIHtcblx0Ym9yZGVyLWNvbG9yOiAjY2YyMjJlO1xufVxuXG4uc3RhdC1jYXJkLnN0YWJsZSB7XG5cdGJvcmRlci1jb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuc3RhdC1jYXJkIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxuXHQuc3RhdC1jYXJkLmltcHJvdmVtZW50cyB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5zdGF0LWNhcmQucmVncmVzc2lvbnMge1xuXHRcdGJvcmRlci1jb2xvcjogI2Y4NTE0OTtcblx0fVxuXHQuc3RhdC1jYXJkLnN0YWJsZSB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjOGI5NDllO1xuXHR9XG59XG5cbi5zdGF0LXZhbHVlIHtcblx0Zm9udC1zaXplOiAzNnB4O1xuXHRmb250LXdlaWdodDogNzAwO1xuXHRtYXJnaW4tYm90dG9tOiA1cHg7XG59XG5cbi5zdGF0LWxhYmVsIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0Zm9udC13ZWlnaHQ6IDUwMDtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUge1xuXHR3aWR0aDogMTAwJTtcblx0Ym9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRvdmVyZmxvdzogaGlkZGVuO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jb21wYXJpc29uLXRhYmxlIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0aCxcbi5jb21wYXJpc29uLXRhYmxlIHRkIHtcblx0cGFkZGluZzogMTJweCAxNnB4O1xuXHR0ZXh0LWFsaWduOiBsZWZ0O1xuXHRib3JkZXItYm90dG9tOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0aCxcblx0LmNvbXBhcmlzb24tdGFibGUgdGQge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0aCB7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdGZvbnQtc2l6ZTogMTRweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0aCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0fVxufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0cjpsYXN0LWNoaWxkIHRkIHtcblx0Ym9yZGVyLWJvdHRvbTogbm9uZTtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHIuYmV0dGVyIHtcblx0YmFja2dyb3VuZDogI2RmZjZkZDIwO1xufVxuXG4uY29tcGFyaXNvbi10YWJsZSB0ci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTkyMDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB0ci5iZXR0ZXIge1xuXHRcdGJhY2tncm91bmQ6ICMwMzNhMTYyMDtcblx0fVxuXHQuY29tcGFyaXNvbi10YWJsZSB0ci53b3JzZSB7XG5cdFx0YmFja2dyb3VuZDogIzg2MTgxZDIwO1xuXHR9XG59XG5cbi5jaGFuZ2UtY2VsbCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG59XG5cbi5tZXRyaWMtbGluayB7XG5cdGNvbG9yOiAjMDk2OWRhO1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG59XG5cbi5tZXRyaWMtbGluazpob3ZlciB7XG5cdHRleHQtZGVjb3JhdGlvbjogdW5kZXJsaW5lO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5tZXRyaWMtbGluayB7XG5cdFx0Y29sb3I6ICM1OGE2ZmY7XG5cdH1cbn1cblxuLmNoYXJ0LWNhcmQge1xuXHRtYXJnaW4tYm90dG9tOiA0MHB4O1xuXHRiYWNrZ3JvdW5kOiAjZmZmZmZmO1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRib3JkZXItcmFkaXVzOiA4cHg7XG5cdHBhZGRpbmc6IDIwcHg7XG5cdHNjcm9sbC1tYXJnaW4tdG9wOiAyMHB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jaGFydC1jYXJkIHtcblx0XHRiYWNrZ3JvdW5kOiAjMGQxMTE3O1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4uY2hhcnQtaGVhZGVyIHtcblx0ZGlzcGxheTogZmxleDtcblx0anVzdGlmeS1jb250ZW50OiBzcGFjZS1iZXR3ZWVuO1xuXHRhbGlnbi1pdGVtczogZmxleC1zdGFydDtcblx0Z2FwOiAyNHB4O1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY2hhcnQtdGl0bGUtc2VjdGlvbiBoMyB7XG5cdGZvbnQtc2l6ZTogMThweDtcblx0ZGlzcGxheTogZmxleDtcblx0YWxpZ24taXRlbXM6IGNlbnRlcjtcblx0Z2FwOiAxMHB4O1xuXHRmbGV4LXdyYXA6IHdyYXA7XG5cdG1hcmdpbjogMDtcbn1cblxuLmluZGljYXRvciB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4uaW5kaWNhdG9yLmJldHRlciB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uaW5kaWNhdG9yLndvcnNlIHtcblx0YmFja2dyb3VuZDogI2ZmZWJlOTtcblx0Y29sb3I6ICNjZjIyMmU7XG59XG5cbi5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGNvbG9yOiAjNmU3NzgxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5pbmRpY2F0b3IuYmV0dGVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5pbmRpY2F0b3Iud29yc2Uge1xuXHRcdGJhY2tncm91bmQ6ICM4NjE4MWQ7XG5cdFx0Y29sb3I6ICNmZjdiNzI7XG5cdH1cblx0LmluZGljYXRvci5uZXV0cmFsIHtcblx0XHRiYWNrZ3JvdW5kOiAjMTYxYjIyO1xuXHRcdGNvbG9yOiAjOGI5NDllO1xuXHR9XG59XG5cbi5jaGFydC1tZXRhIHtcblx0Zm9udC1zaXplOiAxNHB4O1xuXHRjb2xvcjogIzZlNzc4MTtcblx0ZmxleC1zaHJpbms6IDA7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIHtcblx0d2lkdGg6IGF1dG87XG5cdGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XG5cdGZvbnQtc2l6ZTogMTNweDtcbn1cblxuLmFnZ3JlZ2F0ZXMtdGFibGUgdGgge1xuXHRmb250LXdlaWdodDogNjAwO1xuXHRwYWRkaW5nOiA0cHggMTJweDtcblx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHRjb2xvcjogIzY1NmQ3Njtcblx0Zm9udC1mYW1pbHk6ICdTRiBNb25vJywgJ01vbmFjbycsICdJbmNvbnNvbGF0YScsICdSb2JvdG8gTW9ubycsICdDb25zb2xhcycsIG1vbm9zcGFjZTtcbn1cblxuLmFnZ3JlZ2F0ZXMtdGFibGUgdGQge1xuXHRwYWRkaW5nOiA0cHggMTJweDtcblx0dGV4dC1hbGlnbjogY2VudGVyO1xuXHRmb250LWZhbWlseTogJ1NGIE1vbm8nLCAnTW9uYWNvJywgJ0luY29uc29sYXRhJywgJ1JvYm90byBNb25vJywgJ0NvbnNvbGFzJywgbW9ub3NwYWNlO1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSAucm93LWxhYmVsIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0dGV4dC1hbGlnbjogcmlnaHQ7XG5cdGNvbG9yOiAjMWYyMzI4O1xuXHRwYWRkaW5nLXJpZ2h0OiAxNnB4O1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5hZ2dyZWdhdGVzLXRhYmxlIC5yb3ctbGFiZWwge1xuXHRcdGNvbG9yOiAjZTZlZGYzO1xuXHR9XG59XG5cbi5jaGFydC1jb250YWluZXIge1xuXHRwb3NpdGlvbjogcmVsYXRpdmU7XG5cdGhlaWdodDogNDAwcHg7XG59XG5cbi5jaGFydC1ldmVudHMtdGltZWxpbmUge1xuXHRtYXJnaW4tdG9wOiAxNXB4O1xuXHRwYWRkaW5nLXRvcDogMTVweDtcblx0Ym9yZGVyLXRvcDogMXB4IHNvbGlkICNlNWU3ZWI7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNoYXJ0LWV2ZW50cy10aW1lbGluZSB7XG5cdFx0Ym9yZGVyLXRvcC1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG4udGltZWxpbmUtdGl0bGUge1xuXHRmb250LXNpemU6IDEzcHg7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdGNvbG9yOiAjNjU2ZDc2O1xuXHRtYXJnaW4tYm90dG9tOiAxMHB4O1xufVxuXG4udGltZWxpbmUtZXZlbnRzIHtcblx0ZGlzcGxheTogZmxleDtcblx0ZmxleC1kaXJlY3Rpb246IGNvbHVtbjtcblx0Z2FwOiA4cHg7XG59XG5cbi50aW1lbGluZS1ldmVudCB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTBweDtcblx0cGFkZGluZzogOHB4IDEycHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDZweDtcblx0Zm9udC1zaXplOiAxM3B4O1xuXHR0cmFuc2l0aW9uOiBhbGwgMC4ycztcblx0Y3Vyc29yOiBwb2ludGVyO1xuXHRib3JkZXI6IDJweCBzb2xpZCB0cmFuc3BhcmVudDtcbn1cblxuLnRpbWVsaW5lLWV2ZW50OmhvdmVyIHtcblx0YmFja2dyb3VuZDogI2ZmZjVlZDtcblx0Ym9yZGVyLWNvbG9yOiAjZmI5MjNjO1xuXHRib3gtc2hhZG93OiAwIDJweCA4cHggcmdiYSgyNTEsIDE0NiwgNjAsIDAuMik7XG5cdHRyYW5zZm9ybTogdHJhbnNsYXRlWCg0cHgpO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC50aW1lbGluZS1ldmVudCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6IHRyYW5zcGFyZW50O1xuXHR9XG5cblx0LnRpbWVsaW5lLWV2ZW50OmhvdmVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMmQxODEwO1xuXHRcdGJvcmRlci1jb2xvcjogI2ZiOTIzYztcblx0XHRib3gtc2hhZG93OiAwIDJweCA4cHggcmdiYSgyNTEsIDE0NiwgNjAsIDAuMyk7XG5cdH1cbn1cblxuLmV2ZW50LWljb24ge1xuXHRmb250LXNpemU6IDE2cHg7XG5cdGZsZXgtc2hyaW5rOiAwO1xufVxuXG4uZXZlbnQtdGltZSB7XG5cdGZvbnQtZmFtaWx5OiAnU0YgTW9ubycsICdNb25hY28nLCAnSW5jb25zb2xhdGEnLCAnUm9ib3RvIE1vbm8nLCAnQ29uc29sYXMnLCBtb25vc3BhY2U7XG5cdGZvbnQtc2l6ZTogMTJweDtcblx0Y29sb3I6ICM2NTZkNzY7XG5cdGZsZXgtc2hyaW5rOiAwO1xufVxuXG4uZXZlbnQtbGFiZWwge1xuXHRjb2xvcjogIzFmMjMyODtcblx0ZmxleC1ncm93OiAxO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5ldmVudC1sYWJlbCB7XG5cdFx0Y29sb3I6ICNlNmVkZjM7XG5cdH1cbn1cblxuZm9vdGVyIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogNjBweCBhdXRvIDIwcHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0cGFkZGluZy10b3A6IDIwcHg7XG5cdGJvcmRlci10b3A6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGZvb3RlciB7XG5cdFx0Ym9yZGVyLWNvbG9yOiAjMzAzNjNkO1xuXHR9XG59XG5cbmZvb3RlciBhIHtcblx0Y29sb3I6ICMwOTY5ZGE7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcbn1cblxuZm9vdGVyIGE6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIgYSB7XG5cdFx0Y29sb3I6ICM1OGE2ZmY7XG5cdH1cbn1cblxuQG1lZGlhIChtYXgtd2lkdGg6IDc2OHB4KSB7XG5cdGJvZHkge1xuXHRcdHBhZGRpbmc6IDEwcHg7XG5cdH1cblxuXHRoZWFkZXIgaDEge1xuXHRcdGZvbnQtc2l6ZTogMjRweDtcblx0fVxuXG5cdC5jaGFydC1jb250YWluZXIge1xuXHRcdGhlaWdodDogMzAwcHg7XG5cdH1cblxuXHQuc3RhdHMge1xuXHRcdGdyaWQtdGVtcGxhdGUtY29sdW1uczogcmVwZWF0KDIsIDFmcik7XG5cdH1cbn1cbmBcbn1cbiIsCiAgICAiLyoqXG4gKiBHaXRIdWIgQWN0aW9ucyBKb2IgU3VtbWFyeSBnZW5lcmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgc3VtbWFyeSB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5cbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBTdW1tYXJ5RGF0YSB7XG5cdHdvcmtsb2FkczogV29ya2xvYWRDb21wYXJpc29uW11cblx0Y3VycmVudFJlZjogc3RyaW5nXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmdcblx0YXJ0aWZhY3RVcmxzPzogTWFwPHN0cmluZywgc3RyaW5nPlxufVxuXG4vKipcbiAqIFdyaXRlIEpvYiBTdW1tYXJ5IHdpdGggYWxsIHdvcmtsb2Fkc1xuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gd3JpdGVKb2JTdW1tYXJ5KGRhdGE6IFN1bW1hcnlEYXRhKTogUHJvbWlzZTx2b2lkPiB7XG5cdHN1bW1hcnkuYWRkSGVhZGluZygn8J+MiyBTTE8gVGVzdCBTdW1tYXJ5JywgMSlcblxuXHQvLyBDb21taXRzIGluZm9cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHA+XG5cdDxzdHJvbmc+Q3VycmVudDo8L3N0cm9uZz4gJHtkYXRhLmN1cnJlbnRSZWZ9XG5cdHZzXG5cdDxzdHJvbmc+QmFzZWxpbmU6PC9zdHJvbmc+ICR7ZGF0YS5iYXNlbGluZVJlZn1cbjwvcD5cblx0YClcblxuXHRzdW1tYXJ5LmFkZEJyZWFrKClcblxuXHQvLyBPdmVyYWxsIHN0YXRzXG5cdGxldCB0b3RhbE1ldHJpY3MgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnRvdGFsLCAwKVxuXHRsZXQgdG90YWxSZWdyZXNzaW9ucyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkucmVncmVzc2lvbnMsIDApXG5cdGxldCB0b3RhbEltcHJvdmVtZW50cyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkuaW1wcm92ZW1lbnRzLCAwKVxuXHRsZXQgdG90YWxTdGFibGUgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnN0YWJsZSwgMClcblxuXHRzdW1tYXJ5LmFkZFJhdyhgXG48dGFibGU+XG5cdDx0cj5cblx0XHQ8dGQ+PHN0cm9uZz4ke2RhdGEud29ya2xvYWRzLmxlbmd0aH08L3N0cm9uZz4gd29ya2xvYWRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZz4ke3RvdGFsTWV0cmljc308L3N0cm9uZz4gbWV0cmljczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmcgc3R5bGU9XCJjb2xvcjogIzFhN2YzNztcIj4ke3RvdGFsSW1wcm92ZW1lbnRzfTwvc3Ryb25nPiBpbXByb3ZlbWVudHM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICNjZjIyMmU7XCI+JHt0b3RhbFJlZ3Jlc3Npb25zfTwvc3Ryb25nPiByZWdyZXNzaW9uczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmcgc3R5bGU9XCJjb2xvcjogIzZlNzc4MTtcIj4ke3RvdGFsU3RhYmxlfTwvc3Ryb25nPiBzdGFibGU8L3RkPlxuXHQ8L3RyPlxuPC90YWJsZT5cblx0YClcblxuXHRzdW1tYXJ5LmFkZEJyZWFrKClcblxuXHQvLyBFYWNoIHdvcmtsb2FkXG5cdGZvciAobGV0IHdvcmtsb2FkIG9mIGRhdGEud29ya2xvYWRzKSB7XG5cdFx0bGV0IHN0YXR1c0Vtb2ppID0gd29ya2xvYWQuc3VtbWFyeS5yZWdyZXNzaW9ucyA+IDAgPyAn8J+foScgOiAn8J+foidcblx0XHRsZXQgYXJ0aWZhY3RVcmwgPSBkYXRhLmFydGlmYWN0VXJscz8uZ2V0KHdvcmtsb2FkLndvcmtsb2FkKVxuXG5cdFx0c3VtbWFyeS5hZGRIZWFkaW5nKGAke3N0YXR1c0Vtb2ppfSAke3dvcmtsb2FkLndvcmtsb2FkfWAsIDMpXG5cblx0XHRpZiAoYXJ0aWZhY3RVcmwpIHtcblx0XHRcdHN1bW1hcnkuYWRkUmF3KGA8cD48YSBocmVmPVwiJHthcnRpZmFjdFVybH1cIj7wn5OKIFZpZXcgZGV0YWlsZWQgSFRNTCByZXBvcnQ8L2E+PC9wPmApXG5cdFx0fVxuXG5cdFx0Ly8gTWV0cmljcyB0YWJsZVxuXHRcdHN1bW1hcnkuYWRkVGFibGUoW1xuXHRcdFx0W1xuXHRcdFx0XHR7IGRhdGE6ICdNZXRyaWMnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQ3VycmVudCcsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdCYXNlbGluZScsIGhlYWRlcjogdHJ1ZSB9LFxuXHRcdFx0XHR7IGRhdGE6ICdDaGFuZ2UnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdF0sXG5cdFx0XHQuLi53b3JrbG9hZC5tZXRyaWNzLm1hcCgobSkgPT4gW1xuXHRcdFx0XHRtLm5hbWUsXG5cdFx0XHRcdGZvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKSxcblx0XHRcdFx0bS5iYXNlbGluZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2VsaW5lLnZhbHVlLCBtLm5hbWUpIDogJ04vQScsXG5cdFx0XHRcdG0uYmFzZWxpbmUuYXZhaWxhYmxlID8gZm9ybWF0Q2hhbmdlKG0uY2hhbmdlLnBlcmNlbnQsIG0uY2hhbmdlLmRpcmVjdGlvbikgOiAnTi9BJyxcblx0XHRcdF0pLFxuXHRcdF0pXG5cblx0XHRzdW1tYXJ5LmFkZEJyZWFrKClcblx0fVxuXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuXG4vKipcbiAqIENsZWFyIGV4aXN0aW5nIHN1bW1hcnlcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGNsZWFySm9iU3VtbWFyeSgpOiBQcm9taXNlPHZvaWQ+IHtcblx0c3VtbWFyeS5lbXB0eUJ1ZmZlcigpXG5cdGF3YWl0IHN1bW1hcnkud3JpdGUoKVxufVxuIgogIF0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7OztBQU9BLHVEQUNBLDJDQUNBO0FBTEE7QUFDQTs7O0FDMkJPLFNBQVMsaUJBQWlCLENBQUMsU0FBNkI7QUFBQSxFQUM5RCxJQUFJLDBCQUFVLElBQUksS0FDZCxRQUFRLFFBQVEsS0FBSyxFQUFFLE1BQU07QUFBQSxDQUFJO0FBQUEsRUFFckMsU0FBUyxRQUFRLE9BQU87QUFBQSxJQUN2QixJQUFJLENBQUMsS0FBSyxLQUFLO0FBQUEsTUFBRztBQUFBLElBRWxCLElBQUk7QUFBQSxNQUNILElBQUksU0FBUyxLQUFLLE1BQU0sSUFBSTtBQUFBLE1BQzVCLFFBQVEsSUFBSSxPQUFPLE1BQU0sTUFBTTtBQUFBLE1BQzlCLE1BQU07QUFBQSxNQUVQO0FBQUE7QUFBQTtBQUFBLEVBSUYsT0FBTztBQUFBO0FBK0NSLFNBQVMsVUFBVSxDQUFDLFFBQWtCLEdBQW1CO0FBQUEsRUFDeEQsSUFBSSxTQUFTLENBQUMsR0FBRyxNQUFNLEVBQUUsS0FBSyxDQUFDLEdB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QUFXO0FBQUEsRUFDNUIsT0FBTztBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7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VEEsTUFBTSxnQkFBZ0I7QUFBQSxNQUNyQixXQUFXO0FBQUEsTUFDWCxZQUFZO0FBQUEsTUFDWixhQUFhO0FBQUEsSUFDZCxDQUFDLEdBRUQsa0JBQUsscUJBQXFCLEdBR3RCLFVBQVU7QUFBQSxNQUNiLGtCQUFLLDhDQUFtQztBQUFBLE1BR3hDLElBQUksK0JBQWUsSUFBSSxLQUNuQixrQkFBa0Isc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQixtQkFBbUIsYUFBYTtBQUFBLE1BRXBJLFNBQVMsUUFBUTtBQUFBLFFBQ2hCLGFBQWEsSUFBSSxLQUFLLFVBQVUsZUFBZTtBQUFBLE1BR2hELElBQUksY0FBYyxvQkFBb0I7QUFBQSxRQUNyQyxXQUFXO0FBQUEsUUFDWDtBQUFBLFFBQ0E7QUFBQSxRQUNBLGVBQWUsc0JBQXNCLHVCQUFRLEtBQUssU0FBUyx1QkFBUSxLQUFLLHFCQUFxQjtBQUFBLE1BQzlGLENBQUMsR0FFRyxVQUFVLE1BQU0sc0JBQ25CLE9BQ0EsdUJBQVEsS0FBSyxPQUNiLHVCQUFRLEtBQUssTUFDYixVQUNBLFdBQ0Q7QUFBQSxNQUVBLGtCQUFLLGVBQWUsUUFBUSxLQUFLO0FBQUEsTUFFakM7QUFBQSx3QkFBSyxzREFBc0Q7QUFBQSxJQUc1RCxrQkFBSyw2Q0FBNEM7QUFBQSxJQUNoRCxPQUFPLE9BQU87QUFBQSxJQUVmLE1BREEsdUJBQVUsNkJBQTZCLE9BQU8sS0FBSyxHQUFHLEdBQ2hEO0FBQUE7QUFBQTtBQUlSLEtBQUs7IiwKICAiZGVidWdJZCI6ICIyNTE0RDg2NjRBQjQ4MkQ4NjQ3NTZFMjE2NDc1NkUyMSIsCiAgIm5hbWVzIjogW10KfQ==
