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
    }), artifactPath = downloadPath || options.downloadPath;
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

//# debugId=35462975466DE16564756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsiLi4vcmVwb3J0L21haW4udHMiLCAiLi4vcmVwb3J0L2xpYi9tZXRyaWNzLnRzIiwgIi4uL3JlcG9ydC9saWIvYW5hbHlzaXMudHMiLCAiLi4vcmVwb3J0L2xpYi9hcnRpZmFjdHMudHMiLCAiLi4vcmVwb3J0L2xpYi9ldmVudHMudHMiLCAiLi4vcmVwb3J0L2xpYi9jaGVja3MudHMiLCAiLi4vcmVwb3J0L2xpYi90aHJlc2hvbGRzLnRzIiwgIi4uL3JlcG9ydC9saWIvY29tbWVudC50cyIsICIuLi9yZXBvcnQvbGliL2h0bWwudHMiLCAiLi4vcmVwb3J0L2xpYi9zdW1tYXJ5LnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWwogICAgIi8qKlxuICogU0xPIFJlcG9ydCBBY3Rpb24gLSBNYWluIE9yY2hlc3RyYXRvclxuICovXG5cbmltcG9ydCAqIGFzIGZzIGZyb20gJ25vZGU6ZnMnXG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IHsgRGVmYXVsdEFydGlmYWN0Q2xpZW50IH0gZnJvbSAnQGFjdGlvbnMvYXJ0aWZhY3QnXG5pbXBvcnQgeyBnZXRJbnB1dCwgaW5mbywgc2V0RmFpbGVkLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcbmltcG9ydCB7IGNvbnRleHQgfSBmcm9tICdAYWN0aW9ucy9naXRodWInXG5cbmltcG9ydCB7IGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MgfSBmcm9tICcuL2xpYi9hbmFseXNpcy5qcydcbmltcG9ydCB7IGRvd25sb2FkV29ya2xvYWRBcnRpZmFjdHMgfSBmcm9tICcuL2xpYi9hcnRpZmFjdHMuanMnXG5pbXBvcnQgeyBjcmVhdGVXb3JrbG9hZENoZWNrIH0gZnJvbSAnLi9saWIvY2hlY2tzLmpzJ1xuaW1wb3J0IHsgY3JlYXRlT3JVcGRhdGVDb21tZW50LCBnZW5lcmF0ZUNvbW1lbnRCb2R5IH0gZnJvbSAnLi9saWIvY29tbWVudC5qcydcbmltcG9ydCB7IGdlbmVyYXRlSFRNTFJlcG9ydCwgdHlwZSBIVE1MUmVwb3J0RGF0YSB9IGZyb20gJy4vbGliL2h0bWwuanMnXG5pbXBvcnQgeyB3cml0ZUpvYlN1bW1hcnkgfSBmcm9tICcuL2xpYi9zdW1tYXJ5LmpzJ1xuaW1wb3J0IHsgbG9hZFRocmVzaG9sZHMgfSBmcm9tICcuL2xpYi90aHJlc2hvbGRzLmpzJ1xuXG5hc3luYyBmdW5jdGlvbiBtYWluKCkge1xuXHR0cnkge1xuXHRcdGxldCBjd2QgPSBwYXRoLmpvaW4ocHJvY2Vzcy5jd2QoKSwgJy5zbG8tcmVwb3J0cycpXG5cdFx0bGV0IHRva2VuID0gZ2V0SW5wdXQoJ2dpdGh1Yl90b2tlbicpIHx8IGdldElucHV0KCd0b2tlbicpXG5cdFx0bGV0IHJ1bklkID0gcGFyc2VJbnQoZ2V0SW5wdXQoJ2dpdGh1Yl9ydW5faWQnKSB8fCBnZXRJbnB1dCgncnVuX2lkJykgfHwgU3RyaW5nKGNvbnRleHQucnVuSWQpKVxuXG5cdFx0aWYgKCF0b2tlbikge1xuXHRcdFx0c2V0RmFpbGVkKCdnaXRodWJfdG9rZW4gaXMgcmVxdWlyZWQnKVxuXHRcdFx0cmV0dXJuXG5cdFx0fVxuXG5cdFx0ZnMubWtkaXJTeW5jKGN3ZCwgeyByZWN1cnNpdmU6IHRydWUgfSlcblx0XHRpbmZvKGBXb3JraW5nIGRpcmVjdG9yeTogJHtjd2R9YClcblxuXHRcdC8vIFN0ZXAgMTogRG93bmxvYWQgYXJ0aWZhY3RzIGZyb20gY3VycmVudCBydW5cblx0XHQvLyBOT1RFOiBBcnRpZmFjdHMgYWxyZWFkeSBjb250YWluIGJvdGggY3VycmVudCBhbmQgYmFzZSBzZXJpZXMgKGNvbGxlY3RlZCBpbiBpbml0IGFjdGlvbilcblx0XHRpbmZvKCfwn5OmIERvd25sb2FkaW5nIGFydGlmYWN0cyBmcm9tIGN1cnJlbnQgcnVuLi4uJylcblx0XHRsZXQgd29ya2xvYWRzID0gYXdhaXQgZG93bmxvYWRXb3JrbG9hZEFydGlmYWN0cyh7XG5cdFx0XHR0b2tlbixcblx0XHRcdHdvcmtmbG93UnVuSWQ6IHJ1bklkLFxuXHRcdFx0cmVwb3NpdG9yeU93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRyZXBvc2l0b3J5TmFtZTogY29udGV4dC5yZXBvLnJlcG8sXG5cdFx0XHRkb3dubG9hZFBhdGg6IGN3ZCxcblx0XHR9KVxuXG5cdFx0aWYgKHdvcmtsb2Fkcy5sZW5ndGggPT09IDApIHtcblx0XHRcdHdhcm5pbmcoJ05vIHdvcmtsb2FkIGFydGlmYWN0cyBmb3VuZCBpbiBjdXJyZW50IHJ1bicpXG5cdFx0XHRyZXR1cm5cblx0XHR9XG5cblx0XHRpbmZvKGBGb3VuZCAke3dvcmtsb2Fkcy5sZW5ndGh9IHdvcmtsb2FkczogJHt3b3JrbG9hZHMubWFwKCh3KSA9PiB3Lndvcmtsb2FkKS5qb2luKCcsICcpfWApXG5cblx0XHQvLyBTdGVwIDI6IEdldCBQUiBudW1iZXIgKG9wdGlvbmFsIC0gbWF5IG5vdCBleGlzdCBmb3Igbm9uLVBSIHdvcmtmbG93cylcblx0XHRsZXQgcHJOdW1iZXIgPSB3b3JrbG9hZHNbMF0/LnB1bGxOdW1iZXJcblx0XHRpZiAocHJOdW1iZXIpIHtcblx0XHRcdGluZm8oYFByb2Nlc3NpbmcgUFIgIyR7cHJOdW1iZXJ9YClcblx0XHR9IGVsc2Uge1xuXHRcdFx0aW5mbygnTm8gUFIgYXNzb2NpYXRlZCB3aXRoIHRoaXMgcnVuIChub24tUFIgd29ya2Zsb3cpJylcblx0XHR9XG5cblx0XHQvLyBTdGVwIDM6IExvYWQgdGhyZXNob2xkcyBjb25maWd1cmF0aW9uXG5cdFx0aW5mbygn4pqZ77iPICBMb2FkaW5nIHRocmVzaG9sZHMgY29uZmlndXJhdGlvbi4uLicpXG5cdFx0bGV0IHRocmVzaG9sZHMgPSBhd2FpdCBsb2FkVGhyZXNob2xkcyhnZXRJbnB1dCgndGhyZXNob2xkc195YW1sJyksIGdldElucHV0KCd0aHJlc2hvbGRzX3lhbWxfcGF0aCcpKVxuXHRcdGluZm8oYExvYWRlZCB0aHJlc2hvbGRzOiBuZXV0cmFsX2NoYW5nZT0ke3RocmVzaG9sZHMubmV1dHJhbF9jaGFuZ2VfcGVyY2VudH0lYClcblxuXHRcdC8vIFN0ZXAgNDogQW5hbHl6ZSBtZXRyaWNzXG5cdFx0aW5mbygn8J+TiiBBbmFseXppbmcgbWV0cmljcy4uLicpXG5cdFx0bGV0IGNvbXBhcmlzb25zID0gd29ya2xvYWRzLm1hcCgodykgPT4ge1xuXHRcdFx0bGV0IGN1cnJlbnRSZWYgPSB3Lm1ldGFkYXRhPy53b3JrbG9hZF9jdXJyZW50X3JlZiB8fCAnY3VycmVudCdcblx0XHRcdGxldCBiYXNlbGluZVJlZiA9IHcubWV0YWRhdGE/Lndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZSdcblx0XHRcdHJldHVybiBjb21wYXJlV29ya2xvYWRNZXRyaWNzKFxuXHRcdFx0XHR3Lndvcmtsb2FkLFxuXHRcdFx0XHR3Lm1ldHJpY3MsXG5cdFx0XHRcdGN1cnJlbnRSZWYsXG5cdFx0XHRcdGJhc2VsaW5lUmVmLFxuXHRcdFx0XHQnYXZnJyxcblx0XHRcdFx0dGhyZXNob2xkcy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50XG5cdFx0XHQpXG5cdFx0fSlcblxuXHRcdC8vIFN0ZXAgNTogR2VuZXJhdGUgSFRNTCByZXBvcnRzXG5cdFx0aW5mbygn8J+TnSBHZW5lcmF0aW5nIEhUTUwgcmVwb3J0cy4uLicpXG5cblx0XHRsZXQgaHRtbFJlcG9ydHNQYXRoID0gcGF0aC5qb2luKGN3ZCwgJ3JlcG9ydHMnKVxuXHRcdGZzLm1rZGlyU3luYyhodG1sUmVwb3J0c1BhdGgsIHsgcmVjdXJzaXZlOiB0cnVlIH0pXG5cblx0XHRsZXQgaHRtbEZpbGVzOiBBcnJheTx7IHdvcmtsb2FkOiBzdHJpbmc7IHBhdGg6IHN0cmluZyB9PiA9IFtdXG5cblx0XHRmb3IgKGxldCBpID0gMDsgaSA8IHdvcmtsb2Fkcy5sZW5ndGg7IGkrKykge1xuXHRcdFx0bGV0IHdvcmtsb2FkID0gd29ya2xvYWRzW2ldXG5cdFx0XHRsZXQgY29tcGFyaXNvbiA9IGNvbXBhcmlzb25zW2ldXG5cblx0XHRcdC8vIFVzZSByZWZzIGZyb20gbWV0YWRhdGEgZm9yIGRpc3BsYXlcblx0XHRcdGxldCBjdXJyZW50UmVmID0gd29ya2xvYWQubWV0YWRhdGE/Lndvcmtsb2FkX2N1cnJlbnRfcmVmIHx8ICdjdXJyZW50J1xuXHRcdFx0bGV0IGJhc2VsaW5lUmVmID0gd29ya2xvYWQubWV0YWRhdGE/Lndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZWxpbmUnXG5cblx0XHRcdGxldCBodG1sRGF0YTogSFRNTFJlcG9ydERhdGEgPSB7XG5cdFx0XHRcdHdvcmtsb2FkOiB3b3JrbG9hZC53b3JrbG9hZCxcblx0XHRcdFx0Y29tcGFyaXNvbixcblx0XHRcdFx0bWV0cmljczogd29ya2xvYWQubWV0cmljcyxcblx0XHRcdFx0ZXZlbnRzOiB3b3JrbG9hZC5ldmVudHMsXG5cdFx0XHRcdGN1cnJlbnRSZWYsXG5cdFx0XHRcdGJhc2VsaW5lUmVmLFxuXHRcdFx0XHRwck51bWJlcjogcHJOdW1iZXIgfHwgMCxcblx0XHRcdFx0dGVzdFN0YXJ0VGltZTogd29ya2xvYWQubWV0YWRhdGE/LnN0YXJ0X2Vwb2NoX21zIHx8IERhdGUubm93KCkgLSAxMCAqIDYwICogMTAwMCxcblx0XHRcdFx0dGVzdEVuZFRpbWU6IHdvcmtsb2FkLm1ldGFkYXRhPy5lbmRfZXBvY2hfbXMgfHwgRGF0ZS5ub3coKSxcblx0XHRcdH1cblxuXHRcdFx0bGV0IGh0bWwgPSBnZW5lcmF0ZUhUTUxSZXBvcnQoaHRtbERhdGEpXG5cdFx0XHRsZXQgaHRtbFBhdGggPSBwYXRoLmpvaW4oaHRtbFJlcG9ydHNQYXRoLCBgJHt3b3JrbG9hZC53b3JrbG9hZH0tcmVwb3J0Lmh0bWxgKVxuXG5cdFx0XHRmcy53cml0ZUZpbGVTeW5jKGh0bWxQYXRoLCBodG1sLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRodG1sRmlsZXMucHVzaCh7IHdvcmtsb2FkOiB3b3JrbG9hZC53b3JrbG9hZCwgcGF0aDogaHRtbFBhdGggfSlcblxuXHRcdFx0aW5mbyhgR2VuZXJhdGVkIEhUTUwgcmVwb3J0IGZvciAke3dvcmtsb2FkLndvcmtsb2FkfWApXG5cdFx0fVxuXG5cdFx0Ly8gU3RlcCA2OiBVcGxvYWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0c1xuXHRcdGluZm8oJ/Cfk6QgVXBsb2FkaW5nIEhUTUwgcmVwb3J0cy4uLicpXG5cblx0XHRsZXQgYXJ0aWZhY3RDbGllbnQgPSBuZXcgRGVmYXVsdEFydGlmYWN0Q2xpZW50KClcblx0XHRsZXQgdXBsb2FkUmVzdWx0ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQudXBsb2FkQXJ0aWZhY3QoXG5cdFx0XHQnc2xvLXJlcG9ydHMnLFxuXHRcdFx0aHRtbEZpbGVzLm1hcCgoZikgPT4gZi5wYXRoKSxcblx0XHRcdGh0bWxSZXBvcnRzUGF0aCxcblx0XHRcdHtcblx0XHRcdFx0cmV0ZW50aW9uRGF5czogMzAsXG5cdFx0XHR9XG5cdFx0KVxuXG5cdFx0aW5mbyhgVXBsb2FkZWQgSFRNTCByZXBvcnRzIGFzIGFydGlmYWN0OiAke3VwbG9hZFJlc3VsdC5pZH1gKVxuXG5cdFx0Ly8gU3RlcCA3OiBDcmVhdGUgR2l0SHViIENoZWNrc1xuXHRcdGluZm8oJ+KchSBDcmVhdGluZyBHaXRIdWIgQ2hlY2tzLi4uJylcblxuXHRcdGxldCBjaGVja1VybHMgPSBuZXcgTWFwPHN0cmluZywgc3RyaW5nPigpXG5cblx0XHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0XHR0cnkge1xuXHRcdFx0XHRsZXQgY2hlY2sgPSBhd2FpdCBjcmVhdGVXb3JrbG9hZENoZWNrKHtcblx0XHRcdFx0XHR0b2tlbixcblx0XHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRcdHJlcG86IGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHRcdHNoYTogY29udGV4dC5zaGEsXG5cdFx0XHRcdFx0d29ya2xvYWQ6IGNvbXBhcmlzb24sXG5cdFx0XHRcdFx0dGhyZXNob2xkcyxcblx0XHRcdFx0fSlcblxuXHRcdFx0XHRjaGVja1VybHMuc2V0KGNvbXBhcmlzb24ud29ya2xvYWQsIGNoZWNrLnVybClcblx0XHRcdFx0aW5mbyhgQ3JlYXRlZCBjaGVjayBmb3IgJHtjb21wYXJpc29uLndvcmtsb2FkfTogJHtjaGVjay51cmx9YClcblx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdHdhcm5pbmcoYEZhaWxlZCB0byBjcmVhdGUgY2hlY2sgZm9yICR7Y29tcGFyaXNvbi53b3JrbG9hZH06ICR7U3RyaW5nKGVycm9yKX1gKVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdC8vIFN0ZXAgODogV3JpdGUgSm9iIFN1bW1hcnlcblx0XHRpbmZvKCfwn5OLIFdyaXRpbmcgSm9iIFN1bW1hcnkuLi4nKVxuXG5cdFx0Ly8gVXNlIHJlZnMgZnJvbSBmaXJzdCB3b3JrbG9hZCBmb3Igc3VtbWFyeVxuXHRcdGxldCBmaXJzdFdvcmtsb2FkID0gd29ya2xvYWRzWzBdXG5cdFx0bGV0IHN1bW1hcnlDdXJyZW50UmVmID0gZmlyc3RXb3JrbG9hZC5tZXRhZGF0YT8ud29ya2xvYWRfY3VycmVudF9yZWYgfHwgJ2N1cnJlbnQnXG5cdFx0bGV0IHN1bW1hcnlCYXNlbGluZVJlZiA9IGZpcnN0V29ya2xvYWQubWV0YWRhdGE/Lndvcmtsb2FkX2Jhc2VsaW5lX3JlZiB8fCAnYmFzZWxpbmUnXG5cblx0XHRhd2FpdCB3cml0ZUpvYlN1bW1hcnkoe1xuXHRcdFx0d29ya2xvYWRzOiBjb21wYXJpc29ucyxcblx0XHRcdGN1cnJlbnRSZWY6IHN1bW1hcnlDdXJyZW50UmVmLFxuXHRcdFx0YmFzZWxpbmVSZWY6IHN1bW1hcnlCYXNlbGluZVJlZixcblx0XHR9KVxuXG5cdFx0aW5mbygnSm9iIFN1bW1hcnkgd3JpdHRlbicpXG5cblx0XHQvLyBTdGVwIDk6IENyZWF0ZS9VcGRhdGUgUFIgY29tbWVudCAob25seSBpZiBQUiBleGlzdHMpXG5cdFx0aWYgKHByTnVtYmVyKSB7XG5cdFx0XHRpbmZvKCfwn5KsIENyZWF0aW5nL3VwZGF0aW5nIFBSIGNvbW1lbnQuLi4nKVxuXG5cdFx0XHQvLyBBcnRpZmFjdCBVUkxzIChHaXRIdWIgVUkgZG93bmxvYWQpXG5cdFx0XHRsZXQgYXJ0aWZhY3RVcmxzID0gbmV3IE1hcDxzdHJpbmcsIHN0cmluZz4oKVxuXHRcdFx0bGV0IGFydGlmYWN0QmFzZVVybCA9IGBodHRwczovL2dpdGh1Yi5jb20vJHtjb250ZXh0LnJlcG8ub3duZXJ9LyR7Y29udGV4dC5yZXBvLnJlcG99L2FjdGlvbnMvcnVucy8ke3J1bklkfS9hcnRpZmFjdHMvJHt1cGxvYWRSZXN1bHQuaWR9YFxuXG5cdFx0XHRmb3IgKGxldCBmaWxlIG9mIGh0bWxGaWxlcykge1xuXHRcdFx0XHRhcnRpZmFjdFVybHMuc2V0KGZpbGUud29ya2xvYWQsIGFydGlmYWN0QmFzZVVybClcblx0XHRcdH1cblxuXHRcdFx0bGV0IGNvbW1lbnRCb2R5ID0gZ2VuZXJhdGVDb21tZW50Qm9keSh7XG5cdFx0XHRcdHdvcmtsb2FkczogY29tcGFyaXNvbnMsXG5cdFx0XHRcdGFydGlmYWN0VXJscyxcblx0XHRcdFx0Y2hlY2tVcmxzLFxuXHRcdFx0XHRqb2JTdW1tYXJ5VXJsOiBgaHR0cHM6Ly9naXRodWIuY29tLyR7Y29udGV4dC5yZXBvLm93bmVyfS8ke2NvbnRleHQucmVwby5yZXBvfS9hY3Rpb25zL3J1bnMvJHtydW5JZH1gLFxuXHRcdFx0fSlcblxuXHRcdFx0bGV0IGNvbW1lbnQgPSBhd2FpdCBjcmVhdGVPclVwZGF0ZUNvbW1lbnQoXG5cdFx0XHRcdHRva2VuLFxuXHRcdFx0XHRjb250ZXh0LnJlcG8ub3duZXIsXG5cdFx0XHRcdGNvbnRleHQucmVwby5yZXBvLFxuXHRcdFx0XHRwck51bWJlcixcblx0XHRcdFx0Y29tbWVudEJvZHlcblx0XHRcdClcblxuXHRcdFx0aW5mbyhgUFIgY29tbWVudDogJHtjb21tZW50LnVybH1gKVxuXHRcdH0gZWxzZSB7XG5cdFx0XHRpbmZvKCdTa2lwcGluZyBQUiBjb21tZW50IChubyBQUiBhc3NvY2lhdGVkIHdpdGggdGhpcyBydW4pJylcblx0XHR9XG5cblx0XHRpbmZvKCfinIUgUmVwb3J0IGdlbmVyYXRpb24gY29tcGxldGVkIHN1Y2Nlc3NmdWxseSEnKVxuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdHNldEZhaWxlZChgUmVwb3J0IGdlbmVyYXRpb24gZmFpbGVkOiAke1N0cmluZyhlcnJvcil9YClcblx0XHR0aHJvdyBlcnJvclxuXHR9XG59XG5cbm1haW4oKVxuIiwKICAgICIvKipcbiAqIE1ldHJpY3MgcGFyc2luZyBhbmQgdHlwZXMgZm9yIHJlcG9ydCBhY3Rpb25cbiAqL1xuXG5leHBvcnQgaW50ZXJmYWNlIFNlcmllcyB7XG5cdG1ldHJpYzogUmVjb3JkPHN0cmluZywgc3RyaW5nPlxuXHR2YWx1ZXM6IFtudW1iZXIsIHN0cmluZ11bXSAvLyBbdGltZXN0YW1wIChzZWMpLCB2YWx1ZSAoZmxvYXQpXVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEluc3RhbnRTZXJpZXMge1xuXHRtZXRyaWM6IFJlY29yZDxzdHJpbmcsIHN0cmluZz5cblx0dmFsdWU6IFtudW1iZXIsIHN0cmluZ10gLy8gW3RpbWVzdGFtcCAoc2VjKSwgdmFsdWUgKGZsb2F0KV1cbn1cblxuLyoqXG4gKiBDb2xsZWN0ZWQgbWV0cmljIGZyb20gaW5pdCBhY3Rpb24gKEpTT05MIGZvcm1hdClcbiAqL1xuZXhwb3J0IGludGVyZmFjZSBDb2xsZWN0ZWRNZXRyaWMge1xuXHRuYW1lOiBzdHJpbmdcblx0cXVlcnk6IHN0cmluZ1xuXHR0eXBlOiAncmFuZ2UnIHwgJ2luc3RhbnQnXG5cdGRhdGE6IFNlcmllc1tdIHwgSW5zdGFudFNlcmllc1tdXG59XG5cbi8qKlxuICogUGFyc2VkIG1ldHJpY3MgYnkgbmFtZVxuICovXG5leHBvcnQgdHlwZSBNZXRyaWNzTWFwID0gTWFwPHN0cmluZywgQ29sbGVjdGVkTWV0cmljPlxuXG4vKipcbiAqIFBhcnNlIEpTT05MIG1ldHJpY3MgZmlsZSBpbnRvIE1ldHJpY3NNYXBcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlTWV0cmljc0pzb25sKGNvbnRlbnQ6IHN0cmluZyk6IE1ldHJpY3NNYXAge1xuXHRsZXQgbWV0cmljcyA9IG5ldyBNYXA8c3RyaW5nLCBDb2xsZWN0ZWRNZXRyaWM+KClcblx0bGV0IGxpbmVzID0gY29udGVudC50cmltKCkuc3BsaXQoJ1xcbicpXG5cblx0Zm9yIChsZXQgbGluZSBvZiBsaW5lcykge1xuXHRcdGlmICghbGluZS50cmltKCkpIGNvbnRpbnVlXG5cblx0XHR0cnkge1xuXHRcdFx0bGV0IG1ldHJpYyA9IEpTT04ucGFyc2UobGluZSkgYXMgQ29sbGVjdGVkTWV0cmljXG5cdFx0XHRtZXRyaWNzLnNldChtZXRyaWMubmFtZSwgbWV0cmljKVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gU2tpcCBpbnZhbGlkIGxpbmVzXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBtZXRyaWNzXG59XG5cbi8qKlxuICogU2VwYXJhdGUgc2VyaWVzIGJ5IHJlZiBsYWJlbCAoY3VycmVudCB2cyBiYXNlKVxuICovXG5leHBvcnQgaW50ZXJmYWNlIFNlcGFyYXRlZFNlcmllcyB7XG5cdGN1cnJlbnQ6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsXG5cdGJhc2VsaW5lOiBTZXJpZXMgfCBJbnN0YW50U2VyaWVzIHwgbnVsbFxufVxuXG5leHBvcnQgZnVuY3Rpb24gc2VwYXJhdGVCeVJlZihtZXRyaWM6IENvbGxlY3RlZE1ldHJpYywgY3VycmVudFJlZjogc3RyaW5nLCBiYXNlbGluZVJlZjogc3RyaW5nKTogU2VwYXJhdGVkU2VyaWVzIHtcblx0bGV0IGN1cnJlbnQ6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXHRsZXQgYmFzZWxpbmU6IFNlcmllcyB8IEluc3RhbnRTZXJpZXMgfCBudWxsID0gbnVsbFxuXG5cdGlmIChtZXRyaWMudHlwZSA9PT0gJ2luc3RhbnQnKSB7XG5cdFx0bGV0IGRhdGEgPSBtZXRyaWMuZGF0YSBhcyBJbnN0YW50U2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpIHx8IG51bGxcblx0XHRiYXNlbGluZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSBiYXNlbGluZVJlZikgfHwgbnVsbFxuXHR9IGVsc2Uge1xuXHRcdGxldCBkYXRhID0gbWV0cmljLmRhdGEgYXMgU2VyaWVzW11cblx0XHRjdXJyZW50ID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IGN1cnJlbnRSZWYpIHx8IG51bGxcblx0XHRiYXNlbGluZSA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSBiYXNlbGluZVJlZikgfHwgbnVsbFxuXHR9XG5cblx0cmV0dXJuIHsgY3VycmVudCwgYmFzZWxpbmUgfVxufVxuXG4vKipcbiAqIEFnZ3JlZ2F0ZSBmdW5jdGlvbiB0eXBlIGZvciByYW5nZSBtZXRyaWNzXG4gKi9cbmV4cG9ydCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uID1cblx0fCAnbGFzdCdcblx0fCAnZmlyc3QnXG5cdHwgJ2F2Zydcblx0fCAnbWluJ1xuXHR8ICdtYXgnXG5cdHwgJ3A1MCdcblx0fCAncDkwJ1xuXHR8ICdwOTUnXG5cdHwgJ3A5OSdcblx0fCAnc3VtJ1xuXHR8ICdjb3VudCdcblxuLyoqXG4gKiBDYWxjdWxhdGUgcGVyY2VudGlsZVxuICovXG5mdW5jdGlvbiBwZXJjZW50aWxlKHZhbHVlczogbnVtYmVyW10sIHA6IG51bWJlcik6IG51bWJlciB7XG5cdGxldCBzb3J0ZWQgPSBbLi4udmFsdWVzXS5zb3J0KChhLCBiKSA9PiBhIC0gYilcblx0bGV0IGluZGV4ID0gTWF0aC5jZWlsKHNvcnRlZC5sZW5ndGggKiBwKSAtIDFcblx0cmV0dXJuIHNvcnRlZFtNYXRoLm1heCgwLCBpbmRleCldXG59XG5cbi8qKlxuICogQWdncmVnYXRlIHJhbmdlIG1ldHJpYyB2YWx1ZXMgdXNpbmcgc3BlY2lmaWVkIGZ1bmN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhZ2dyZWdhdGVWYWx1ZXModmFsdWVzOiBbbnVtYmVyLCBzdHJpbmddW10sIGZuOiBBZ2dyZWdhdGVGdW5jdGlvbik6IG51bWJlciB7XG5cdGlmICh2YWx1ZXMubGVuZ3RoID09PSAwKSByZXR1cm4gTmFOXG5cblx0bGV0IG51bXMgPSB2YWx1ZXMubWFwKChbXywgdl0pID0+IHBhcnNlRmxvYXQodikpLmZpbHRlcigobikgPT4gIWlzTmFOKG4pKVxuXG5cdGlmIChudW1zLmxlbmd0aCA9PT0gMCkgcmV0dXJuIE5hTlxuXG5cdHN3aXRjaCAoZm4pIHtcblx0XHRjYXNlICdsYXN0Jzpcblx0XHRcdHJldHVybiBudW1zW251bXMubGVuZ3RoIC0gMV1cblx0XHRjYXNlICdmaXJzdCc6XG5cdFx0XHRyZXR1cm4gbnVtc1swXVxuXHRcdGNhc2UgJ2F2Zyc6XG5cdFx0XHRyZXR1cm4gbnVtcy5yZWR1Y2UoKGEsIGIpID0+IGEgKyBiLCAwKSAvIG51bXMubGVuZ3RoXG5cdFx0Y2FzZSAnbWluJzpcblx0XHRcdHJldHVybiBNYXRoLm1pbiguLi5udW1zKVxuXHRcdGNhc2UgJ21heCc6XG5cdFx0XHRyZXR1cm4gTWF0aC5tYXgoLi4ubnVtcylcblx0XHRjYXNlICdwNTAnOlxuXHRcdFx0cmV0dXJuIHBlcmNlbnRpbGUobnVtcywgMC41KVxuXHRcdGNhc2UgJ3A5MCc6XG5cdFx0XHRyZXR1cm4gcGVyY2VudGlsZShudW1zLCAwLjkpXG5cdFx0Y2FzZSAncDk1Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTUpXG5cdFx0Y2FzZSAncDk5Jzpcblx0XHRcdHJldHVybiBwZXJjZW50aWxlKG51bXMsIDAuOTkpXG5cdFx0Y2FzZSAnc3VtJzpcblx0XHRcdHJldHVybiBudW1zLnJlZHVjZSgoYSwgYikgPT4gYSArIGIsIDApXG5cdFx0Y2FzZSAnY291bnQnOlxuXHRcdFx0cmV0dXJuIG51bXMubGVuZ3RoXG5cdFx0ZGVmYXVsdDpcblx0XHRcdHJldHVybiBOYU5cblx0fVxufVxuXG4vKipcbiAqIEdldCBzaW5nbGUgdmFsdWUgZnJvbSBtZXRyaWMgKGluc3RhbnQgb3IgYWdncmVnYXRlZCByYW5nZSlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldE1ldHJpY1ZhbHVlKG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLCByZWY6IHN0cmluZywgYWdncmVnYXRlOiBBZ2dyZWdhdGVGdW5jdGlvbiA9ICdhdmcnKTogbnVtYmVyIHtcblx0bGV0IHNlcmllczogU2VyaWVzIHwgSW5zdGFudFNlcmllcyB8IG51bGwgPSBudWxsXG5cblx0aWYgKG1ldHJpYy50eXBlID09PSAnaW5zdGFudCcpIHtcblx0XHRsZXQgZGF0YSA9IG1ldHJpYy5kYXRhIGFzIEluc3RhbnRTZXJpZXNbXVxuXHRcdHNlcmllcyA9IGRhdGEuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSByZWYpIHx8IG51bGxcblx0fSBlbHNlIHtcblx0XHRsZXQgZGF0YSA9IG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdXG5cdFx0c2VyaWVzID0gZGF0YS5maW5kKChzKSA9PiBzLm1ldHJpYy5yZWYgPT09IHJlZikgfHwgbnVsbFxuXHR9XG5cblx0aWYgKCFzZXJpZXMpIHJldHVybiBOYU5cblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdpbnN0YW50Jykge1xuXHRcdGxldCBpbnN0YW50U2VyaWVzID0gc2VyaWVzIGFzIEluc3RhbnRTZXJpZXNcblx0XHRyZXR1cm4gcGFyc2VGbG9hdChpbnN0YW50U2VyaWVzLnZhbHVlWzFdKVxuXHR9IGVsc2Uge1xuXHRcdGxldCByYW5nZVNlcmllcyA9IHNlcmllcyBhcyBTZXJpZXNcblx0XHRyZXR1cm4gYWdncmVnYXRlVmFsdWVzKHJhbmdlU2VyaWVzLnZhbHVlcywgYWdncmVnYXRlKVxuXHR9XG59XG4iLAogICAgIi8qKlxuICogTWV0cmljcyBhbmFseXNpcyBhbmQgY29tcGFyaXNvblxuICovXG5cbmltcG9ydCB7IGdldE1ldHJpY1ZhbHVlLCB0eXBlIEFnZ3JlZ2F0ZUZ1bmN0aW9uLCB0eXBlIENvbGxlY3RlZE1ldHJpYywgdHlwZSBNZXRyaWNzTWFwIH0gZnJvbSAnLi9tZXRyaWNzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIE1ldHJpY0NvbXBhcmlzb24ge1xuXHRuYW1lOiBzdHJpbmdcblx0dHlwZTogJ3JhbmdlJyB8ICdpbnN0YW50J1xuXHRjdXJyZW50OiB7XG5cdFx0dmFsdWU6IG51bWJlciAvLyBhdmcgYnkgZGVmYXVsdCBmb3IgYmFja3dhcmQgY29tcGF0XG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdFx0YWdncmVnYXRlcz86IHtcblx0XHRcdGF2ZzogbnVtYmVyXG5cdFx0XHRwNTA6IG51bWJlclxuXHRcdFx0cDkwOiBudW1iZXJcblx0XHRcdHA5NTogbnVtYmVyXG5cdFx0fVxuXHR9XG5cdGJhc2VsaW5lOiB7XG5cdFx0dmFsdWU6IG51bWJlciAvLyBhdmcgYnkgZGVmYXVsdCBmb3IgYmFja3dhcmQgY29tcGF0XG5cdFx0YXZhaWxhYmxlOiBib29sZWFuXG5cdFx0YWdncmVnYXRlcz86IHtcblx0XHRcdGF2ZzogbnVtYmVyXG5cdFx0XHRwNTA6IG51bWJlclxuXHRcdFx0cDkwOiBudW1iZXJcblx0XHRcdHA5NTogbnVtYmVyXG5cdFx0fVxuXHR9XG5cdGNoYW5nZToge1xuXHRcdGFic29sdXRlOiBudW1iZXJcblx0XHRwZXJjZW50OiBudW1iZXJcblx0XHRkaXJlY3Rpb246ICdiZXR0ZXInIHwgJ3dvcnNlJyB8ICduZXV0cmFsJyB8ICd1bmtub3duJ1xuXHR9XG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya2xvYWRDb21wYXJpc29uIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRtZXRyaWNzOiBNZXRyaWNDb21wYXJpc29uW11cblx0c3VtbWFyeToge1xuXHRcdHRvdGFsOiBudW1iZXJcblx0XHRyZWdyZXNzaW9uczogbnVtYmVyXG5cdFx0aW1wcm92ZW1lbnRzOiBudW1iZXJcblx0XHRzdGFibGU6IG51bWJlclxuXHR9XG59XG5cbi8qKlxuICogSW5mZXIgbWV0cmljIGRpcmVjdGlvbiBiYXNlZCBvbiBuYW1lXG4gKi9cbmZ1bmN0aW9uIGluZmVyTWV0cmljRGlyZWN0aW9uKG5hbWU6IHN0cmluZyk6ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnIHtcblx0bGV0IGxvd2VyTmFtZSA9IG5hbWUudG9Mb3dlckNhc2UoKVxuXG5cdC8vIExvd2VyIGlzIGJldHRlclxuXHRpZiAoXG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdsYXRlbmN5JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2R1cmF0aW9uJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3RpbWUnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZGVsYXknKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZXJyb3InKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZmFpbHVyZScpXG5cdCkge1xuXHRcdHJldHVybiAnbG93ZXJfaXNfYmV0dGVyJ1xuXHR9XG5cblx0Ly8gSGlnaGVyIGlzIGJldHRlclxuXHRpZiAoXG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdhdmFpbGFiaWxpdHknKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGhyb3VnaHB1dCcpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdzdWNjZXNzJykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3FwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdycHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnb3BzJylcblx0KSB7XG5cdFx0cmV0dXJuICdoaWdoZXJfaXNfYmV0dGVyJ1xuXHR9XG5cblx0cmV0dXJuICduZXV0cmFsJ1xufVxuXG4vKipcbiAqIERldGVybWluZSBjaGFuZ2UgZGlyZWN0aW9uXG4gKi9cbmZ1bmN0aW9uIGRldGVybWluZUNoYW5nZURpcmVjdGlvbihcblx0Y3VycmVudFZhbHVlOiBudW1iZXIsXG5cdGJhc2VsaW5lVmFsdWU6IG51bWJlcixcblx0bWV0cmljRGlyZWN0aW9uOiAnbG93ZXJfaXNfYmV0dGVyJyB8ICdoaWdoZXJfaXNfYmV0dGVyJyB8ICduZXV0cmFsJyxcblx0bmV1dHJhbFRocmVzaG9sZDogbnVtYmVyID0gNS4wXG4pOiAnYmV0dGVyJyB8ICd3b3JzZScgfCAnbmV1dHJhbCcgfCAndW5rbm93bicge1xuXHRpZiAoaXNOYU4oY3VycmVudFZhbHVlKSB8fCBpc05hTihiYXNlbGluZVZhbHVlKSkge1xuXHRcdHJldHVybiAndW5rbm93bidcblx0fVxuXG5cdGxldCBjaGFuZ2VQZXJjZW50ID0gTWF0aC5hYnMoKChjdXJyZW50VmFsdWUgLSBiYXNlbGluZVZhbHVlKSAvIGJhc2VsaW5lVmFsdWUpICogMTAwKVxuXG5cdC8vIENvbnNpZGVyIGNoYW5nZSBiZWxvdyB0aHJlc2hvbGQgYXMgc3RhYmxlL25ldXRyYWxcblx0aWYgKGNoYW5nZVBlcmNlbnQgPCBuZXV0cmFsVGhyZXNob2xkKSB7XG5cdFx0cmV0dXJuICduZXV0cmFsJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2xvd2VyX2lzX2JldHRlcicpIHtcblx0XHRyZXR1cm4gY3VycmVudFZhbHVlIDwgYmFzZWxpbmVWYWx1ZSA/ICdiZXR0ZXInIDogJ3dvcnNlJ1xuXHR9XG5cblx0aWYgKG1ldHJpY0RpcmVjdGlvbiA9PT0gJ2hpZ2hlcl9pc19iZXR0ZXInKSB7XG5cdFx0cmV0dXJuIGN1cnJlbnRWYWx1ZSA+IGJhc2VsaW5lVmFsdWUgPyAnYmV0dGVyJyA6ICd3b3JzZSdcblx0fVxuXG5cdHJldHVybiAnbmV1dHJhbCdcbn1cblxuLyoqXG4gKiBDb21wYXJlIHNpbmdsZSBtZXRyaWNcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVNZXRyaWMoXG5cdG1ldHJpYzogQ29sbGVjdGVkTWV0cmljLFxuXHRjdXJyZW50UmVmOiBzdHJpbmcsXG5cdGJhc2VsaW5lUmVmOiBzdHJpbmcsXG5cdGFnZ3JlZ2F0ZTogQWdncmVnYXRlRnVuY3Rpb24gPSAnYXZnJyxcblx0bmV1dHJhbFRocmVzaG9sZD86IG51bWJlclxuKTogTWV0cmljQ29tcGFyaXNvbiB7XG5cdGxldCBjdXJyZW50VmFsdWUgPSBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsIGN1cnJlbnRSZWYsIGFnZ3JlZ2F0ZSlcblx0bGV0IGJhc2VWYWx1ZSA9IGdldE1ldHJpY1ZhbHVlKG1ldHJpYywgYmFzZWxpbmVSZWYsIGFnZ3JlZ2F0ZSlcblxuXHRsZXQgYWJzb2x1dGUgPSBjdXJyZW50VmFsdWUgLSBiYXNlVmFsdWVcblx0bGV0IHBlcmNlbnQgPSBpc05hTihiYXNlVmFsdWUpIHx8IGJhc2VWYWx1ZSA9PT0gMCA/IE5hTiA6IChhYnNvbHV0ZSAvIGJhc2VWYWx1ZSkgKiAxMDBcblxuXHRsZXQgbWV0cmljRGlyZWN0aW9uID0gaW5mZXJNZXRyaWNEaXJlY3Rpb24obWV0cmljLm5hbWUpXG5cdGxldCBkaXJlY3Rpb24gPSBkZXRlcm1pbmVDaGFuZ2VEaXJlY3Rpb24oY3VycmVudFZhbHVlLCBiYXNlVmFsdWUsIG1ldHJpY0RpcmVjdGlvbiwgbmV1dHJhbFRocmVzaG9sZClcblxuXHQvLyBDYWxjdWxhdGUgbXVsdGlwbGUgYWdncmVnYXRlcyBmb3IgcmFuZ2UgbWV0cmljc1xuXHRsZXQgY3VycmVudEFnZ3JlZ2F0ZXM6IHsgYXZnOiBudW1iZXI7IHA1MDogbnVtYmVyOyBwOTA6IG51bWJlcjsgcDk1OiBudW1iZXIgfSB8IHVuZGVmaW5lZFxuXHRsZXQgYmFzZWxpbmVBZ2dyZWdhdGVzOiB7IGF2ZzogbnVtYmVyOyBwNTA6IG51bWJlcjsgcDkwOiBudW1iZXI7IHA5NTogbnVtYmVyIH0gfCB1bmRlZmluZWRcblxuXHRpZiAobWV0cmljLnR5cGUgPT09ICdyYW5nZScpIHtcblx0XHRjdXJyZW50QWdncmVnYXRlcyA9IHtcblx0XHRcdGF2ZzogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBjdXJyZW50UmVmLCAnYXZnJyksXG5cdFx0XHRwNTA6IGdldE1ldHJpY1ZhbHVlKG1ldHJpYywgY3VycmVudFJlZiwgJ3A1MCcpLFxuXHRcdFx0cDkwOiBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsIGN1cnJlbnRSZWYsICdwOTAnKSxcblx0XHRcdHA5NTogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBjdXJyZW50UmVmLCAncDk1JyksXG5cdFx0fVxuXHRcdGJhc2VsaW5lQWdncmVnYXRlcyA9IHtcblx0XHRcdGF2ZzogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBiYXNlbGluZVJlZiwgJ2F2ZycpLFxuXHRcdFx0cDUwOiBnZXRNZXRyaWNWYWx1ZShtZXRyaWMsIGJhc2VsaW5lUmVmLCAncDUwJyksXG5cdFx0XHRwOTA6IGdldE1ldHJpY1ZhbHVlKG1ldHJpYywgYmFzZWxpbmVSZWYsICdwOTAnKSxcblx0XHRcdHA5NTogZ2V0TWV0cmljVmFsdWUobWV0cmljLCBiYXNlbGluZVJlZiwgJ3A5NScpLFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiB7XG5cdFx0bmFtZTogbWV0cmljLm5hbWUsXG5cdFx0dHlwZTogbWV0cmljLnR5cGUsXG5cdFx0Y3VycmVudDoge1xuXHRcdFx0dmFsdWU6IGN1cnJlbnRWYWx1ZSxcblx0XHRcdGF2YWlsYWJsZTogIWlzTmFOKGN1cnJlbnRWYWx1ZSksXG5cdFx0XHRhZ2dyZWdhdGVzOiBjdXJyZW50QWdncmVnYXRlcyxcblx0XHR9LFxuXHRcdGJhc2VsaW5lOiB7XG5cdFx0XHR2YWx1ZTogYmFzZVZhbHVlLFxuXHRcdFx0YXZhaWxhYmxlOiAhaXNOYU4oYmFzZVZhbHVlKSxcblx0XHRcdGFnZ3JlZ2F0ZXM6IGJhc2VsaW5lQWdncmVnYXRlcyxcblx0XHR9LFxuXHRcdGNoYW5nZToge1xuXHRcdFx0YWJzb2x1dGUsXG5cdFx0XHRwZXJjZW50LFxuXHRcdFx0ZGlyZWN0aW9uLFxuXHRcdH0sXG5cdH1cbn1cblxuLyoqXG4gKiBDb21wYXJlIGFsbCBtZXRyaWNzIGluIGEgd29ya2xvYWRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGNvbXBhcmVXb3JrbG9hZE1ldHJpY3MoXG5cdHdvcmtsb2FkOiBzdHJpbmcsXG5cdG1ldHJpY3M6IE1ldHJpY3NNYXAsXG5cdGN1cnJlbnRSZWY6IHN0cmluZyxcblx0YmFzZWxpbmVSZWY6IHN0cmluZyxcblx0YWdncmVnYXRlOiBBZ2dyZWdhdGVGdW5jdGlvbiA9ICdhdmcnLFxuXHRuZXV0cmFsVGhyZXNob2xkPzogbnVtYmVyXG4pOiBXb3JrbG9hZENvbXBhcmlzb24ge1xuXHRsZXQgY29tcGFyaXNvbnM6IE1ldHJpY0NvbXBhcmlzb25bXSA9IFtdXG5cblx0Zm9yIChsZXQgW19uYW1lLCBtZXRyaWNdIG9mIG1ldHJpY3MpIHtcblx0XHRsZXQgY29tcGFyaXNvbiA9IGNvbXBhcmVNZXRyaWMobWV0cmljLCBjdXJyZW50UmVmLCBiYXNlbGluZVJlZiwgYWdncmVnYXRlLCBuZXV0cmFsVGhyZXNob2xkKVxuXHRcdGNvbXBhcmlzb25zLnB1c2goY29tcGFyaXNvbilcblx0fVxuXG5cdC8vIENhbGN1bGF0ZSBzdW1tYXJ5XG5cdGxldCBzdGFibGUgPSBjb21wYXJpc29ucy5maWx0ZXIoKGMpID0+IGMuY2hhbmdlLmRpcmVjdGlvbiA9PT0gJ25ldXRyYWwnKS5sZW5ndGhcblx0bGV0IHJlZ3Jlc3Npb25zID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICd3b3JzZScpLmxlbmd0aFxuXHRsZXQgaW1wcm92ZW1lbnRzID0gY29tcGFyaXNvbnMuZmlsdGVyKChjKSA9PiBjLmNoYW5nZS5kaXJlY3Rpb24gPT09ICdiZXR0ZXInKS5sZW5ndGhcblxuXHRyZXR1cm4ge1xuXHRcdHdvcmtsb2FkLFxuXHRcdG1ldHJpY3M6IGNvbXBhcmlzb25zLFxuXHRcdHN1bW1hcnk6IHtcblx0XHRcdHRvdGFsOiBjb21wYXJpc29ucy5sZW5ndGgsXG5cdFx0XHRzdGFibGUsXG5cdFx0XHRyZWdyZXNzaW9ucyxcblx0XHRcdGltcHJvdmVtZW50cyxcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogRm9ybWF0IHZhbHVlIHdpdGggdW5pdCBpbmZlcmVuY2VcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdFZhbHVlKHZhbHVlOiBudW1iZXIsIG1ldHJpY05hbWU6IHN0cmluZyk6IHN0cmluZyB7XG5cdGlmIChpc05hTih2YWx1ZSkpIHJldHVybiAnTi9BJ1xuXG5cdGxldCBsb3dlck5hbWUgPSBtZXRyaWNOYW1lLnRvTG93ZXJDYXNlKClcblxuXHQvLyBMYXRlbmN5L2R1cmF0aW9uIChtcylcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygnbGF0ZW5jeScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fCBsb3dlck5hbWUuZW5kc1dpdGgoJ19tcycpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9bXNgXG5cdH1cblxuXHQvLyBUaW1lIChzZWNvbmRzKVxuXHRpZiAobG93ZXJOYW1lLmluY2x1ZGVzKCd0aW1lJykgJiYgbG93ZXJOYW1lLmVuZHNXaXRoKCdfcycpKSB7XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMil9c2Bcblx0fVxuXG5cdC8vIFBlcmNlbnRhZ2Vcblx0aWYgKGxvd2VyTmFtZS5pbmNsdWRlcygnYXZhaWxhYmlsaXR5JykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdwZXJjZW50JykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdyYXRlJykpIHtcblx0XHRyZXR1cm4gYCR7dmFsdWUudG9GaXhlZCgyKX0lYFxuXHR9XG5cblx0Ly8gVGhyb3VnaHB1dFxuXHRpZiAoXG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCd0aHJvdWdocHV0JykgfHxcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ3FwcycpIHx8XG5cdFx0bG93ZXJOYW1lLmluY2x1ZGVzKCdycHMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnb3BzJylcblx0KSB7XG5cdFx0aWYgKHZhbHVlID49IDEwMDApIHtcblx0XHRcdHJldHVybiBgJHsodmFsdWUgLyAxMDAwKS50b0ZpeGVkKDIpfWsvc2Bcblx0XHR9XG5cdFx0cmV0dXJuIGAke3ZhbHVlLnRvRml4ZWQoMCl9L3NgXG5cdH1cblxuXHQvLyBEZWZhdWx0OiAyIGRlY2ltYWwgcGxhY2VzXG5cdHJldHVybiB2YWx1ZS50b0ZpeGVkKDIpXG59XG5cbi8qKlxuICogRm9ybWF0IGNoYW5nZSBwZXJjZW50YWdlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBmb3JtYXRDaGFuZ2UocGVyY2VudDogbnVtYmVyLCBkaXJlY3Rpb246ICdiZXR0ZXInIHwgJ3dvcnNlJyB8ICduZXV0cmFsJyB8ICd1bmtub3duJyk6IHN0cmluZyB7XG5cdGlmIChpc05hTihwZXJjZW50KSkgcmV0dXJuICdOL0EnXG5cblx0bGV0IHNpZ24gPSBwZXJjZW50ID49IDAgPyAnKycgOiAnJ1xuXHRsZXQgZW1vamkgPSBkaXJlY3Rpb24gPT09ICdiZXR0ZXInID8gJ/Cfn6InIDogZGlyZWN0aW9uID09PSAnd29yc2UnID8gJ/CflLQnIDogZGlyZWN0aW9uID09PSAnbmV1dHJhbCcgPyAn4pqqJyA6ICfinZMnXG5cblx0cmV0dXJuIGAke3NpZ259JHtwZXJjZW50LnRvRml4ZWQoMSl9JSAke2Vtb2ppfWBcbn1cbiIsCiAgICAiLyoqXG4gKiBBcnRpZmFjdHMgZG93bmxvYWQgYW5kIHBhcnNpbmdcbiAqL1xuXG5pbXBvcnQgKiBhcyBmcyBmcm9tICdub2RlOmZzJ1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdub2RlOnBhdGgnXG5cbmltcG9ydCB7IERlZmF1bHRBcnRpZmFjdENsaWVudCB9IGZyb20gJ0BhY3Rpb25zL2FydGlmYWN0J1xuaW1wb3J0IHsgZGVidWcsIGluZm8sIHdhcm5pbmcgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgeyBmb3JtYXRFdmVudHMsIHBhcnNlRXZlbnRzSnNvbmwsIHR5cGUgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuL2V2ZW50cy5qcydcbmltcG9ydCB7IHBhcnNlTWV0cmljc0pzb25sLCB0eXBlIE1ldHJpY3NNYXAgfSBmcm9tICcuL21ldHJpY3MuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgVGVzdE1ldGFkYXRhIHtcblx0d29ya2xvYWQ6IHN0cmluZ1xuXHRzdGFydF90aW1lOiBzdHJpbmdcblx0c3RhcnRfZXBvY2hfbXM6IG51bWJlclxuXHRlbmRfdGltZTogc3RyaW5nXG5cdGVuZF9lcG9jaF9tczogbnVtYmVyXG5cdGR1cmF0aW9uX21zOiBudW1iZXJcblx0d29ya2xvYWRfY3VycmVudF9yZWY/OiBzdHJpbmdcblx0d29ya2xvYWRfYmFzZWxpbmVfcmVmPzogc3RyaW5nXG59XG5cbmV4cG9ydCBpbnRlcmZhY2UgV29ya2xvYWRBcnRpZmFjdHMge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdHB1bGxOdW1iZXI6IG51bWJlclxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXVxuXHRsb2dzUGF0aD86IHN0cmluZ1xuXHRtZXRhZGF0YT86IFRlc3RNZXRhZGF0YVxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEFydGlmYWN0RG93bmxvYWRPcHRpb25zIHtcblx0dG9rZW46IHN0cmluZ1xuXHR3b3JrZmxvd1J1bklkOiBudW1iZXJcblx0cmVwb3NpdG9yeU93bmVyOiBzdHJpbmdcblx0cmVwb3NpdG9yeU5hbWU6IHN0cmluZ1xuXHRkb3dubG9hZFBhdGg6IHN0cmluZ1xufVxuXG4vKipcbiAqIERvd25sb2FkIGFuZCBwYXJzZSBhcnRpZmFjdHMgZm9yIGEgd29ya2Zsb3cgcnVuXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBkb3dubG9hZFdvcmtsb2FkQXJ0aWZhY3RzKG9wdGlvbnM6IEFydGlmYWN0RG93bmxvYWRPcHRpb25zKTogUHJvbWlzZTxXb3JrbG9hZEFydGlmYWN0c1tdPiB7XG5cdGxldCBhcnRpZmFjdENsaWVudCA9IG5ldyBEZWZhdWx0QXJ0aWZhY3RDbGllbnQoKVxuXG5cdGluZm8oYExpc3RpbmcgYXJ0aWZhY3RzIGZvciB3b3JrZmxvdyBydW4gJHtvcHRpb25zLndvcmtmbG93UnVuSWR9Li4uYClcblxuXHRsZXQgeyBhcnRpZmFjdHMgfSA9IGF3YWl0IGFydGlmYWN0Q2xpZW50Lmxpc3RBcnRpZmFjdHMoe1xuXHRcdGZpbmRCeToge1xuXHRcdFx0dG9rZW46IG9wdGlvbnMudG9rZW4sXG5cdFx0XHR3b3JrZmxvd1J1bklkOiBvcHRpb25zLndvcmtmbG93UnVuSWQsXG5cdFx0XHRyZXBvc2l0b3J5T3duZXI6IG9wdGlvbnMucmVwb3NpdG9yeU93bmVyLFxuXHRcdFx0cmVwb3NpdG9yeU5hbWU6IG9wdGlvbnMucmVwb3NpdG9yeU5hbWUsXG5cdFx0fSxcblx0fSlcblxuXHRpbmZvKGBGb3VuZCAke2FydGlmYWN0cy5sZW5ndGh9IGFydGlmYWN0c2ApXG5cdGRlYnVnKFxuXHRcdGBBcnRpZmFjdHM6ICR7SlNPTi5zdHJpbmdpZnkoXG5cdFx0XHRhcnRpZmFjdHMubWFwKChhKSA9PiBhLm5hbWUpLFxuXHRcdFx0bnVsbCxcblx0XHRcdDJcblx0XHQpfWBcblx0KVxuXG5cdC8vIERvd25sb2FkIGFsbCBhcnRpZmFjdHNcblx0bGV0IGRvd25sb2FkZWRQYXRocyA9IG5ldyBNYXA8c3RyaW5nLCBzdHJpbmc+KClcblxuXHRmb3IgKGxldCBhcnRpZmFjdCBvZiBhcnRpZmFjdHMpIHtcblx0XHRpbmZvKGBEb3dubG9hZGluZyBhcnRpZmFjdCAke2FydGlmYWN0Lm5hbWV9Li4uYClcblxuXHRcdGxldCB7IGRvd25sb2FkUGF0aCB9ID0gYXdhaXQgYXJ0aWZhY3RDbGllbnQuZG93bmxvYWRBcnRpZmFjdChhcnRpZmFjdC5pZCwge1xuXHRcdFx0cGF0aDogb3B0aW9ucy5kb3dubG9hZFBhdGgsXG5cdFx0XHRmaW5kQnk6IHtcblx0XHRcdFx0dG9rZW46IG9wdGlvbnMudG9rZW4sXG5cdFx0XHRcdHdvcmtmbG93UnVuSWQ6IG9wdGlvbnMud29ya2Zsb3dSdW5JZCxcblx0XHRcdFx0cmVwb3NpdG9yeU93bmVyOiBvcHRpb25zLnJlcG9zaXRvcnlPd25lcixcblx0XHRcdFx0cmVwb3NpdG9yeU5hbWU6IG9wdGlvbnMucmVwb3NpdG9yeU5hbWUsXG5cdFx0XHR9LFxuXHRcdH0pXG5cblx0XHQvLyBkb3dubG9hZFBhdGggYWxyZWFkeSBwb2ludHMgdG8gd2hlcmUgdGhlIGFydGlmYWN0IHdhcyBleHRyYWN0ZWRcblx0XHRsZXQgYXJ0aWZhY3RQYXRoID0gZG93bmxvYWRQYXRoIHx8IG9wdGlvbnMuZG93bmxvYWRQYXRoXG5cdFx0ZG93bmxvYWRlZFBhdGhzLnNldChhcnRpZmFjdC5uYW1lLCBhcnRpZmFjdFBhdGgpXG5cblx0XHRpbmZvKGBEb3dubG9hZGVkIGFydGlmYWN0ICR7YXJ0aWZhY3QubmFtZX0gdG8gJHthcnRpZmFjdFBhdGh9YClcblx0fVxuXG5cdC8vIEdyb3VwIGZpbGVzIGJ5IHdvcmtsb2FkXG5cdGxldCB3b3JrbG9hZEZpbGVzID0gbmV3IE1hcDxcblx0XHRzdHJpbmcsXG5cdFx0e1xuXHRcdFx0cHVsbD86IHN0cmluZ1xuXHRcdFx0bWV0YT86IHN0cmluZ1xuXHRcdFx0bG9ncz86IHN0cmluZ1xuXHRcdFx0ZXZlbnRzPzogc3RyaW5nXG5cdFx0XHRtZXRyaWNzPzogc3RyaW5nXG5cdFx0XHRjaGFvc0V2ZW50cz86IHN0cmluZ1xuXHRcdH1cblx0PigpXG5cblx0Zm9yIChsZXQgW2FydGlmYWN0TmFtZSwgYXJ0aWZhY3RQYXRoXSBvZiBkb3dubG9hZGVkUGF0aHMpIHtcblx0XHQvLyBBcnRpZmFjdCBuYW1lIGlzIHRoZSB3b3JrbG9hZCBuYW1lLCBmaWxlcyBpbnNpZGUgaGF2ZSB3b3JrbG9hZCBwcmVmaXhcblx0XHRsZXQgd29ya2xvYWQgPSBhcnRpZmFjdE5hbWVcblxuXHRcdC8vIExpc3QgZmlsZXMgaW4gYXJ0aWZhY3QgZGlyZWN0b3J5XG5cdFx0aWYgKCFmcy5leGlzdHNTeW5jKGFydGlmYWN0UGF0aCkpIHtcblx0XHRcdHdhcm5pbmcoYEFydGlmYWN0IHBhdGggZG9lcyBub3QgZXhpc3Q6ICR7YXJ0aWZhY3RQYXRofWApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdGxldCBzdGF0ID0gZnMuc3RhdFN5bmMoYXJ0aWZhY3RQYXRoKVxuXHRcdGxldCBmaWxlczogc3RyaW5nW10gPSBbXVxuXG5cdFx0aWYgKHN0YXQuaXNEaXJlY3RvcnkoKSkge1xuXHRcdFx0ZmlsZXMgPSBmcy5yZWFkZGlyU3luYyhhcnRpZmFjdFBhdGgpLm1hcCgoZikgPT4gcGF0aC5qb2luKGFydGlmYWN0UGF0aCwgZikpXG5cdFx0fSBlbHNlIHtcblx0XHRcdGZpbGVzID0gW2FydGlmYWN0UGF0aF1cblx0XHR9XG5cblx0XHRsZXQgZ3JvdXAgPSB3b3JrbG9hZEZpbGVzLmdldCh3b3JrbG9hZCkgfHwge31cblxuXHRcdGZvciAobGV0IGZpbGUgb2YgZmlsZXMpIHtcblx0XHRcdGxldCBiYXNlbmFtZSA9IHBhdGguYmFzZW5hbWUoZmlsZSlcblxuXHRcdFx0aWYgKGJhc2VuYW1lLmVuZHNXaXRoKCctcHVsbC50eHQnKSkge1xuXHRcdFx0XHRncm91cC5wdWxsID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWxvZ3MudHh0JykpIHtcblx0XHRcdFx0Z3JvdXAubG9ncyA9IGZpbGVcblx0XHRcdH0gZWxzZSBpZiAoYmFzZW5hbWUuZW5kc1dpdGgoJy1tZXRhLmpzb24nKSkge1xuXHRcdFx0XHRncm91cC5tZXRhID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLWV2ZW50cy5qc29ubCcpKSB7XG5cdFx0XHRcdGdyb3VwLmNoYW9zRXZlbnRzID0gZmlsZVxuXHRcdFx0fSBlbHNlIGlmIChiYXNlbmFtZS5lbmRzV2l0aCgnLW1ldHJpY3MuanNvbmwnKSkge1xuXHRcdFx0XHRncm91cC5tZXRyaWNzID0gZmlsZVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdHdvcmtsb2FkRmlsZXMuc2V0KHdvcmtsb2FkLCBncm91cClcblx0fVxuXG5cdC8vIFBhcnNlIHdvcmtsb2FkIGRhdGFcblx0bGV0IHdvcmtsb2FkczogV29ya2xvYWRBcnRpZmFjdHNbXSA9IFtdXG5cblx0Zm9yIChsZXQgW3dvcmtsb2FkLCBmaWxlc10gb2Ygd29ya2xvYWRGaWxlcykge1xuXHRcdGlmICghZmlsZXMucHVsbCB8fCAhZmlsZXMubWV0cmljcykge1xuXHRcdFx0d2FybmluZyhgU2tpcHBpbmcgaW5jb21wbGV0ZSB3b3JrbG9hZCAke3dvcmtsb2FkfTogbWlzc2luZyByZXF1aXJlZCBmaWxlc2ApXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblxuXHRcdHRyeSB7XG5cdFx0XHRsZXQgcHVsbE51bWJlciA9IHBhcnNlSW50KGZzLnJlYWRGaWxlU3luYyhmaWxlcy5wdWxsLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pLnRyaW0oKSlcblx0XHRcdGxldCBtZXRyaWNzQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlcy5tZXRyaWNzLCB7IGVuY29kaW5nOiAndXRmLTgnIH0pXG5cdFx0XHRsZXQgbWV0cmljcyA9IHBhcnNlTWV0cmljc0pzb25sKG1ldHJpY3NDb250ZW50KVxuXG5cdFx0XHRsZXQgZXZlbnRzOiBGb3JtYXR0ZWRFdmVudFtdID0gW11cblxuXHRcdFx0Ly8gTG9hZCBldmVudHNcblx0XHRcdGlmIChmaWxlcy5jaGFvc0V2ZW50cyAmJiBmcy5leGlzdHNTeW5jKGZpbGVzLmNoYW9zRXZlbnRzKSkge1xuXHRcdFx0XHRsZXQgZXZlbnRzQ29udGVudCA9IGZzLnJlYWRGaWxlU3luYyhmaWxlcy5jaGFvc0V2ZW50cywgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0XHRsZXQgcmF3RXZlbnRzID0gcGFyc2VFdmVudHNKc29ubChldmVudHNDb250ZW50KVxuXHRcdFx0XHRldmVudHMucHVzaCguLi5mb3JtYXRFdmVudHMocmF3RXZlbnRzKSlcblx0XHRcdH1cblxuXHRcdFx0Ly8gU29ydCBldmVudHMgYnkgdGltZXN0YW1wXG5cdFx0XHRldmVudHMuc29ydCgoYSwgYikgPT4gYS50aW1lc3RhbXAgLSBiLnRpbWVzdGFtcClcblxuXHRcdFx0Ly8gTG9hZCBtZXRhZGF0YVxuXHRcdFx0bGV0IG1ldGFkYXRhOiBUZXN0TWV0YWRhdGEgfCB1bmRlZmluZWRcblx0XHRcdGlmIChmaWxlcy5tZXRhICYmIGZzLmV4aXN0c1N5bmMoZmlsZXMubWV0YSkpIHtcblx0XHRcdFx0dHJ5IHtcblx0XHRcdFx0XHRsZXQgbWV0YUNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZmlsZXMubWV0YSwgeyBlbmNvZGluZzogJ3V0Zi04JyB9KVxuXHRcdFx0XHRcdG1ldGFkYXRhID0gSlNPTi5wYXJzZShtZXRhQ29udGVudCkgYXMgVGVzdE1ldGFkYXRhXG5cdFx0XHRcdH0gY2F0Y2ggKGVycm9yKSB7XG5cdFx0XHRcdFx0d2FybmluZyhgRmFpbGVkIHRvIHBhcnNlIG1ldGFkYXRhIGZvciAke3dvcmtsb2FkfTogJHtTdHJpbmcoZXJyb3IpfWApXG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0d29ya2xvYWRzLnB1c2goe1xuXHRcdFx0XHR3b3JrbG9hZCxcblx0XHRcdFx0cHVsbE51bWJlcixcblx0XHRcdFx0bWV0cmljcyxcblx0XHRcdFx0ZXZlbnRzLFxuXHRcdFx0XHRsb2dzUGF0aDogZmlsZXMubG9ncyxcblx0XHRcdFx0bWV0YWRhdGEsXG5cdFx0XHR9KVxuXG5cdFx0XHRsZXQgdGVzdER1cmF0aW9uID0gbWV0YWRhdGEgPyBgJHsobWV0YWRhdGEuZHVyYXRpb25fbXMgLyAxMDAwKS50b0ZpeGVkKDApfXNgIDogJ3Vua25vd24nXG5cdFx0XHRpbmZvKGBQYXJzZWQgd29ya2xvYWQgJHt3b3JrbG9hZH06ICR7bWV0cmljcy5zaXplfSBtZXRyaWNzLCAke2V2ZW50cy5sZW5ndGh9IGV2ZW50cyAoJHt0ZXN0RHVyYXRpb259IHRlc3QpYClcblx0XHR9IGNhdGNoIChlcnJvcikge1xuXHRcdFx0d2FybmluZyhgRmFpbGVkIHRvIHBhcnNlIHdvcmtsb2FkICR7d29ya2xvYWR9OiAke1N0cmluZyhlcnJvcil9YClcblx0XHRcdGNvbnRpbnVlXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIHdvcmtsb2Fkc1xufVxuIiwKICAgICIvKipcbiAqIENoYW9zIGV2ZW50cyBwYXJzaW5nIGFuZCBmb3JtYXR0aW5nXG4gKi9cblxuZXhwb3J0IGludGVyZmFjZSBFdmVudCB7XG5cdHNjcmlwdDogc3RyaW5nXG5cdGVwb2NoX21zOiBudW1iZXJcblx0dGltZXN0YW1wOiBzdHJpbmdcblx0ZGVzY3JpcHRpb246IHN0cmluZ1xuXHRkdXJhdGlvbl9tcz86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIEZvcm1hdHRlZEV2ZW50IHtcblx0aWNvbjogc3RyaW5nXG5cdGxhYmVsOiBzdHJpbmdcblx0dGltZXN0YW1wOiBudW1iZXIgLy8gbWlsbGlzZWNvbmRzIChlcG9jaF9tcylcblx0ZHVyYXRpb25fbXM/OiBudW1iZXJcbn1cblxuLyoqXG4gKiBQYXJzZSBldmVudHMgSlNPTkwgZmlsZVxuICovXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VFdmVudHNKc29ubChjb250ZW50OiBzdHJpbmcpOiBFdmVudFtdIHtcblx0bGV0IGV2ZW50czogRXZlbnRbXSA9IFtdXG5cdGxldCBsaW5lcyA9IGNvbnRlbnQudHJpbSgpLnNwbGl0KCdcXG4nKVxuXG5cdGZvciAobGV0IGxpbmUgb2YgbGluZXMpIHtcblx0XHRpZiAoIWxpbmUudHJpbSgpKSBjb250aW51ZVxuXG5cdFx0dHJ5IHtcblx0XHRcdGxldCBldmVudCA9IEpTT04ucGFyc2UobGluZSkgYXMgRXZlbnRcblx0XHRcdGV2ZW50cy5wdXNoKGV2ZW50KVxuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Ly8gU2tpcCBpbnZhbGlkIGxpbmVzXG5cdFx0XHRjb250aW51ZVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBldmVudHNcbn1cblxuLyoqXG4gKiBHZXQgaWNvbiBmb3IgZXZlbnQgYmFzZWQgb24gZHVyYXRpb25cbiAqIER1cmF0aW9uIGV2ZW50cyAoaW50ZXJ2YWxzKSBnZXQg4o+x77iPXG4gKiBJbnN0YW50IGV2ZW50cyBnZXQg8J+TjVxuICovXG5mdW5jdGlvbiBnZXRFdmVudEljb24oaGFzRHVyYXRpb246IGJvb2xlYW4pOiBzdHJpbmcge1xuXHRyZXR1cm4gaGFzRHVyYXRpb24gPyAn4o+x77iPJyA6ICfwn5ONJ1xufVxuXG4vKipcbiAqIEZvcm1hdCBldmVudHMgZm9yIHZpc3VhbGl6YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGZvcm1hdEV2ZW50cyhldmVudHM6IEV2ZW50W10pOiBGb3JtYXR0ZWRFdmVudFtdIHtcblx0cmV0dXJuIGV2ZW50cy5tYXAoKGV2ZW50KSA9PiAoe1xuXHRcdGljb246IGdldEV2ZW50SWNvbighIWV2ZW50LmR1cmF0aW9uX21zKSxcblx0XHRsYWJlbDogZXZlbnQuZGVzY3JpcHRpb24sXG5cdFx0dGltZXN0YW1wOiBldmVudC5lcG9jaF9tcyxcblx0XHRkdXJhdGlvbl9tczogZXZlbnQuZHVyYXRpb25fbXMsXG5cdH0pKVxufVxuIiwKICAgICIvKipcbiAqIEdpdEh1YiBDaGVja3MgQVBJIGludGVncmF0aW9uXG4gKi9cblxuaW1wb3J0IHsgaW5mbyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnXG5pbXBvcnQgeyBnZXRPY3Rva2l0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5pbXBvcnQgeyBldmFsdWF0ZVdvcmtsb2FkVGhyZXNob2xkcywgdHlwZSBUaHJlc2hvbGRDb25maWcgfSBmcm9tICcuL3RocmVzaG9sZHMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgQ2hlY2tPcHRpb25zIHtcblx0dG9rZW46IHN0cmluZ1xuXHRvd25lcjogc3RyaW5nXG5cdHJlcG86IHN0cmluZ1xuXHRzaGE6IHN0cmluZ1xuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uXG5cdHRocmVzaG9sZHM6IFRocmVzaG9sZENvbmZpZ1xuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBDcmVhdGUgR2l0SHViIENoZWNrIGZvciB3b3JrbG9hZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gY3JlYXRlV29ya2xvYWRDaGVjayhvcHRpb25zOiBDaGVja09wdGlvbnMpOiBQcm9taXNlPHsgaWQ6IG51bWJlcjsgdXJsOiBzdHJpbmcgfT4ge1xuXHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQob3B0aW9ucy50b2tlbilcblxuXHRsZXQgbmFtZSA9IGBTTE86ICR7b3B0aW9ucy53b3JrbG9hZC53b3JrbG9hZH1gXG5cdGxldCBldmFsdWF0aW9uID0gZXZhbHVhdGVXb3JrbG9hZFRocmVzaG9sZHMob3B0aW9ucy53b3JrbG9hZC5tZXRyaWNzLCBvcHRpb25zLnRocmVzaG9sZHMpXG5cdGxldCBjb25jbHVzaW9uID0gZGV0ZXJtaW5lQ29uY2x1c2lvbkZyb21FdmFsdWF0aW9uKGV2YWx1YXRpb24ub3ZlcmFsbClcblx0bGV0IHRpdGxlID0gZ2VuZXJhdGVUaXRsZShvcHRpb25zLndvcmtsb2FkLCBldmFsdWF0aW9uKVxuXHRsZXQgc3VtbWFyeVRleHQgPSBnZW5lcmF0ZVN1bW1hcnkob3B0aW9ucy53b3JrbG9hZCwgZXZhbHVhdGlvbiwgb3B0aW9ucy5yZXBvcnRVcmwpXG5cblx0aW5mbyhgQ3JlYXRpbmcgY2hlY2sgXCIke25hbWV9XCIgd2l0aCBjb25jbHVzaW9uOiAke2NvbmNsdXNpb259YClcblxuXHRsZXQgeyBkYXRhIH0gPSBhd2FpdCBvY3Rva2l0LnJlc3QuY2hlY2tzLmNyZWF0ZSh7XG5cdFx0b3duZXI6IG9wdGlvbnMub3duZXIsXG5cdFx0cmVwbzogb3B0aW9ucy5yZXBvLFxuXHRcdG5hbWUsXG5cdFx0aGVhZF9zaGE6IG9wdGlvbnMuc2hhLFxuXHRcdHN0YXR1czogJ2NvbXBsZXRlZCcsXG5cdFx0Y29uY2x1c2lvbixcblx0XHRvdXRwdXQ6IHtcblx0XHRcdHRpdGxlLFxuXHRcdFx0c3VtbWFyeTogc3VtbWFyeVRleHQsXG5cdFx0fSxcblx0fSlcblxuXHRpbmZvKGBDaGVjayBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRyZXR1cm4geyBpZDogZGF0YS5pZCwgdXJsOiBkYXRhLmh0bWxfdXJsISB9XG59XG5cbi8qKlxuICogTWFwIHRocmVzaG9sZCBzZXZlcml0eSB0byBHaXRIdWIgQ2hlY2sgY29uY2x1c2lvblxuICovXG5mdW5jdGlvbiBkZXRlcm1pbmVDb25jbHVzaW9uRnJvbUV2YWx1YXRpb24oXG5cdHNldmVyaXR5OiAnc3VjY2VzcycgfCAnd2FybmluZycgfCAnZmFpbHVyZSdcbik6ICdzdWNjZXNzJyB8ICduZXV0cmFsJyB8ICdmYWlsdXJlJyB7XG5cdGlmIChzZXZlcml0eSA9PT0gJ2ZhaWx1cmUnKSByZXR1cm4gJ2ZhaWx1cmUnXG5cdGlmIChzZXZlcml0eSA9PT0gJ3dhcm5pbmcnKSByZXR1cm4gJ25ldXRyYWwnXG5cdHJldHVybiAnc3VjY2Vzcydcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBjaGVjayB0aXRsZVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVRpdGxlKFxuXHR3b3JrbG9hZDogV29ya2xvYWRDb21wYXJpc29uLFxuXHRldmFsdWF0aW9uOiB7IG92ZXJhbGw6IHN0cmluZzsgZmFpbHVyZXM6IGFueVtdOyB3YXJuaW5nczogYW55W10gfVxuKTogc3RyaW5nIHtcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLmZhaWx1cmVzLmxlbmd0aH0gY3JpdGljYWwgdGhyZXNob2xkKHMpIHZpb2xhdGVkYFxuXHR9XG5cblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdHJldHVybiBgJHtldmFsdWF0aW9uLndhcm5pbmdzLmxlbmd0aH0gd2FybmluZyB0aHJlc2hvbGQocykgZXhjZWVkZWRgXG5cdH1cblxuXHRpZiAod29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHMgPiAwKSB7XG5cdFx0cmV0dXJuIGAke3dvcmtsb2FkLnN1bW1hcnkuaW1wcm92ZW1lbnRzfSBpbXByb3ZlbWVudChzKSBkZXRlY3RlZGBcblx0fVxuXG5cdHJldHVybiAnQWxsIG1ldHJpY3Mgd2l0aGluIHRocmVzaG9sZHMnXG59XG5cbi8qKlxuICogR2VuZXJhdGUgY2hlY2sgc3VtbWFyeVxuICovXG5mdW5jdGlvbiBnZW5lcmF0ZVN1bW1hcnkoXG5cdHdvcmtsb2FkOiBXb3JrbG9hZENvbXBhcmlzb24sXG5cdGV2YWx1YXRpb246IHsgb3ZlcmFsbDogc3RyaW5nOyBmYWlsdXJlczogYW55W107IHdhcm5pbmdzOiBhbnlbXSB9LFxuXHRyZXBvcnRVcmw/OiBzdHJpbmdcbik6IHN0cmluZyB7XG5cdGxldCBsaW5lcyA9IFtcblx0XHRgKipNZXRyaWNzIGFuYWx5emVkOioqICR7d29ya2xvYWQuc3VtbWFyeS50b3RhbH1gLFxuXHRcdGAtIPCflLQgQ3JpdGljYWw6ICR7ZXZhbHVhdGlvbi5mYWlsdXJlcy5sZW5ndGh9YCxcblx0XHRgLSDwn5+hIFdhcm5pbmdzOiAke2V2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RofWAsXG5cdFx0YC0g8J+foiBJbXByb3ZlbWVudHM6ICR7d29ya2xvYWQuc3VtbWFyeS5pbXByb3ZlbWVudHN9YCxcblx0XHRgLSDimqogU3RhYmxlOiAke3dvcmtsb2FkLnN1bW1hcnkuc3RhYmxlfWAsXG5cdFx0JycsXG5cdF1cblxuXHRpZiAocmVwb3J0VXJsKSB7XG5cdFx0bGluZXMucHVzaChg8J+TiiBbVmlldyBkZXRhaWxlZCBIVE1MIHJlcG9ydF0oJHtyZXBvcnRVcmx9KWAsICcnKVxuXHR9XG5cblx0Ly8gQ3JpdGljYWwgZmFpbHVyZXNcblx0aWYgKGV2YWx1YXRpb24uZmFpbHVyZXMubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDinYwgQ3JpdGljYWwgVGhyZXNob2xkcyBWaW9sYXRlZCcsICcnKVxuXG5cdFx0Zm9yIChsZXQgbWV0cmljIG9mIGV2YWx1YXRpb24uZmFpbHVyZXMuc2xpY2UoMCwgNSkpIHtcblx0XHRcdGxpbmVzLnB1c2goXG5cdFx0XHRcdGAtICoqJHttZXRyaWMubmFtZX0qKjogJHtmb3JtYXRWYWx1ZShtZXRyaWMuY3VycmVudC52YWx1ZSwgbWV0cmljLm5hbWUpfSAoJHtmb3JtYXRDaGFuZ2UobWV0cmljLmNoYW5nZS5wZXJjZW50LCBtZXRyaWMuY2hhbmdlLmRpcmVjdGlvbil9KWBcblx0XHRcdClcblx0XHR9XG5cblx0XHRsaW5lcy5wdXNoKCcnKVxuXHR9XG5cblx0Ly8gV2FybmluZ3Ncblx0aWYgKGV2YWx1YXRpb24ud2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdGxpbmVzLnB1c2goJyMjIyDimqDvuI8gV2FybmluZyBUaHJlc2hvbGRzIEV4Y2VlZGVkJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgZXZhbHVhdGlvbi53YXJuaW5ncy5zbGljZSgwLCA1KSkge1xuXHRcdFx0bGluZXMucHVzaChcblx0XHRcdFx0YC0gKioke21ldHJpYy5uYW1lfSoqOiAke2Zvcm1hdFZhbHVlKG1ldHJpYy5jdXJyZW50LnZhbHVlLCBtZXRyaWMubmFtZSl9ICgke2Zvcm1hdENoYW5nZShtZXRyaWMuY2hhbmdlLnBlcmNlbnQsIG1ldHJpYy5jaGFuZ2UuZGlyZWN0aW9uKX0pYFxuXHRcdFx0KVxuXHRcdH1cblxuXHRcdGxpbmVzLnB1c2goJycpXG5cdH1cblxuXHQvLyBUb3AgaW1wcm92ZW1lbnRzXG5cdGxldCBpbXByb3ZlbWVudHMgPSB3b3JrbG9hZC5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS5jaGFuZ2UuZGlyZWN0aW9uID09PSAnYmV0dGVyJylcblx0XHQuc29ydCgoYSwgYikgPT4gTWF0aC5hYnMoYi5jaGFuZ2UucGVyY2VudCkgLSBNYXRoLmFicyhhLmNoYW5nZS5wZXJjZW50KSlcblxuXHRpZiAoaW1wcm92ZW1lbnRzLmxlbmd0aCA+IDApIHtcblx0XHRsaW5lcy5wdXNoKCcjIyMg8J+foiBUb3AgSW1wcm92ZW1lbnRzJywgJycpXG5cblx0XHRmb3IgKGxldCBtZXRyaWMgb2YgaW1wcm92ZW1lbnRzLnNsaWNlKDAsIDUpKSB7XG5cdFx0XHRsaW5lcy5wdXNoKFxuXHRcdFx0XHRgLSAqKiR7bWV0cmljLm5hbWV9Kio6ICR7Zm9ybWF0VmFsdWUobWV0cmljLmN1cnJlbnQudmFsdWUsIG1ldHJpYy5uYW1lKX0gKCR7Zm9ybWF0Q2hhbmdlKG1ldHJpYy5jaGFuZ2UucGVyY2VudCwgbWV0cmljLmNoYW5nZS5kaXJlY3Rpb24pfSlgXG5cdFx0XHQpXG5cdFx0fVxuXHR9XG5cblx0cmV0dXJuIGxpbmVzLmpvaW4oJ1xcbicpXG59XG4iLAogICAgIi8qKlxuICogVGhyZXNob2xkcyBjb25maWd1cmF0aW9uIGFuZCBldmFsdWF0aW9uXG4gKi9cblxuaW1wb3J0ICogYXMgZnMgZnJvbSAnbm9kZTpmcydcbmltcG9ydCAqIGFzIHBhdGggZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ25vZGU6dXJsJ1xuXG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYydcbmltcG9ydCB7IGRlYnVnLCB3YXJuaW5nIH0gZnJvbSAnQGFjdGlvbnMvY29yZSdcblxuaW1wb3J0IHR5cGUgeyBNZXRyaWNDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcblxuZXhwb3J0IGludGVyZmFjZSBNZXRyaWNUaHJlc2hvbGQge1xuXHRuYW1lPzogc3RyaW5nIC8vIEV4YWN0IG1ldHJpYyBuYW1lIChoaWdoZXIgcHJpb3JpdHkgdGhhbiBwYXR0ZXJuKVxuXHRwYXR0ZXJuPzogc3RyaW5nIC8vIEdsb2IgcGF0dGVybiAobG93ZXIgcHJpb3JpdHkpXG5cdGRpcmVjdGlvbj86ICdsb3dlcl9pc19iZXR0ZXInIHwgJ2hpZ2hlcl9pc19iZXR0ZXInIHwgJ25ldXRyYWwnXG5cdHdhcm5pbmdfbWluPzogbnVtYmVyXG5cdGNyaXRpY2FsX21pbj86IG51bWJlclxuXHR3YXJuaW5nX21heD86IG51bWJlclxuXHRjcml0aWNhbF9tYXg/OiBudW1iZXJcblx0d2FybmluZ19jaGFuZ2VfcGVyY2VudD86IG51bWJlclxuXHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudD86IG51bWJlclxufVxuXG5leHBvcnQgaW50ZXJmYWNlIFRocmVzaG9sZENvbmZpZyB7XG5cdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHRkZWZhdWx0OiB7XG5cdFx0d2FybmluZ19jaGFuZ2VfcGVyY2VudDogbnVtYmVyXG5cdFx0Y3JpdGljYWxfY2hhbmdlX3BlcmNlbnQ6IG51bWJlclxuXHR9XG5cdG1ldHJpY3M/OiBNZXRyaWNUaHJlc2hvbGRbXVxufVxuXG5leHBvcnQgdHlwZSBUaHJlc2hvbGRTZXZlcml0eSA9ICdzdWNjZXNzJyB8ICd3YXJuaW5nJyB8ICdmYWlsdXJlJ1xuXG4vKipcbiAqIFBhcnNlIFlBTUwgdGhyZXNob2xkcyBjb25maWdcbiAqL1xuYXN5bmMgZnVuY3Rpb24gcGFyc2VUaHJlc2hvbGRzWWFtbCh5YW1sQ29udGVudDogc3RyaW5nKTogUHJvbWlzZTxUaHJlc2hvbGRDb25maWcgfCBudWxsPiB7XG5cdGlmICgheWFtbENvbnRlbnQgfHwgeWFtbENvbnRlbnQudHJpbSgpID09PSAnJykge1xuXHRcdHJldHVybiBudWxsXG5cdH1cblxuXHR0cnkge1xuXHRcdGxldCBjaHVua3M6IHN0cmluZ1tdID0gW11cblxuXHRcdGF3YWl0IGV4ZWMoJ3lxJywgWyctbz1qc29uJywgJy4nXSwge1xuXHRcdFx0aW5wdXQ6IEJ1ZmZlci5mcm9tKHlhbWxDb250ZW50LCAndXRmLTgnKSxcblx0XHRcdHNpbGVudDogdHJ1ZSxcblx0XHRcdGxpc3RlbmVyczoge1xuXHRcdFx0XHRzdGRvdXQ6IChkYXRhKSA9PiBjaHVua3MucHVzaChkYXRhLnRvU3RyaW5nKCkpLFxuXHRcdFx0fSxcblx0XHR9KVxuXG5cdFx0bGV0IGpzb24gPSBjaHVua3Muam9pbignJylcblx0XHRsZXQgcGFyc2VkID0gSlNPTi5wYXJzZShqc29uKSBhcyBUaHJlc2hvbGRDb25maWdcblxuXHRcdHJldHVybiBwYXJzZWRcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHR3YXJuaW5nKGBGYWlsZWQgdG8gcGFyc2UgdGhyZXNob2xkcyBZQU1MOiAke1N0cmluZyhlcnJvcil9YClcblx0XHRyZXR1cm4gbnVsbFxuXHR9XG59XG5cbi8qKlxuICogTWVyZ2UgdHdvIHRocmVzaG9sZCBjb25maWdzIChjdXN0b20gZXh0ZW5kcy9vdmVycmlkZXMgZGVmYXVsdClcbiAqL1xuZnVuY3Rpb24gbWVyZ2VUaHJlc2hvbGRDb25maWdzKGRlZmF1bHRDb25maWc6IFRocmVzaG9sZENvbmZpZywgY3VzdG9tQ29uZmlnOiBUaHJlc2hvbGRDb25maWcpOiBUaHJlc2hvbGRDb25maWcge1xuXHRyZXR1cm4ge1xuXHRcdG5ldXRyYWxfY2hhbmdlX3BlcmNlbnQ6IGN1c3RvbUNvbmZpZy5uZXV0cmFsX2NoYW5nZV9wZXJjZW50ID8/IGRlZmF1bHRDb25maWcubmV1dHJhbF9jaGFuZ2VfcGVyY2VudCxcblx0XHRkZWZhdWx0OiB7XG5cdFx0XHR3YXJuaW5nX2NoYW5nZV9wZXJjZW50OlxuXHRcdFx0XHRjdXN0b21Db25maWcuZGVmYXVsdD8ud2FybmluZ19jaGFuZ2VfcGVyY2VudCA/PyBkZWZhdWx0Q29uZmlnLmRlZmF1bHQud2FybmluZ19jaGFuZ2VfcGVyY2VudCxcblx0XHRcdGNyaXRpY2FsX2NoYW5nZV9wZXJjZW50OlxuXHRcdFx0XHRjdXN0b21Db25maWcuZGVmYXVsdD8uY3JpdGljYWxfY2hhbmdlX3BlcmNlbnQgPz8gZGVmYXVsdENvbmZpZy5kZWZhdWx0LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50LFxuXHRcdH0sXG5cdFx0bWV0cmljczogWy4uLihjdXN0b21Db25maWcubWV0cmljcyB8fCBbXSksIC4uLihkZWZhdWx0Q29uZmlnLm1ldHJpY3MgfHwgW10pXSxcblx0XHQvLyBDdXN0b20gbWV0cmljcyBjb21lIGZpcnN0LCBzbyB0aGV5IGhhdmUgaGlnaGVyIHByaW9yaXR5IGluIGZpbmRNYXRjaGluZ1RocmVzaG9sZCgpXG5cdH1cbn1cblxuLyoqXG4gKiBMb2FkIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWxcbiAqL1xuYXN5bmMgZnVuY3Rpb24gbG9hZERlZmF1bHRUaHJlc2hvbGRzKCk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdGRlYnVnKCdMb2FkaW5nIGRlZmF1bHQgdGhyZXNob2xkcyBmcm9tIGRlcGxveS90aHJlc2hvbGRzLnlhbWwnKVxuXHRsZXQgYWN0aW9uUm9vdCA9IHBhdGgucmVzb2x2ZShwYXRoLmRpcm5hbWUoZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpKSwgJy4uLy4uLycpXG5cdGxldCBkZWZhdWx0UGF0aCA9IHBhdGguam9pbihhY3Rpb25Sb290LCAnZGVwbG95JywgJ3RocmVzaG9sZHMueWFtbCcpXG5cblx0aWYgKGZzLmV4aXN0c1N5bmMoZGVmYXVsdFBhdGgpKSB7XG5cdFx0bGV0IGNvbnRlbnQgPSBmcy5yZWFkRmlsZVN5bmMoZGVmYXVsdFBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjb25maWcpIHJldHVybiBjb25maWdcblx0fVxuXG5cdC8vIEZhbGxiYWNrIHRvIGhhcmRjb2RlZCBkZWZhdWx0c1xuXHR3YXJuaW5nKCdDb3VsZCBub3QgbG9hZCBkZWZhdWx0IHRocmVzaG9sZHMsIHVzaW5nIGhhcmRjb2RlZCBkZWZhdWx0cycpXG5cdHJldHVybiB7XG5cdFx0bmV1dHJhbF9jaGFuZ2VfcGVyY2VudDogNS4wLFxuXHRcdGRlZmF1bHQ6IHtcblx0XHRcdHdhcm5pbmdfY2hhbmdlX3BlcmNlbnQ6IDIwLjAsXG5cdFx0XHRjcml0aWNhbF9jaGFuZ2VfcGVyY2VudDogNTAuMCxcblx0XHR9LFxuXHR9XG59XG5cbi8qKlxuICogTG9hZCB0aHJlc2hvbGRzIGNvbmZpZ3VyYXRpb24gd2l0aCBtZXJnaW5nOlxuICogMS4gTG9hZCBkZWZhdWx0IGZyb20gZGVwbG95L3RocmVzaG9sZHMueWFtbFxuICogMi4gTWVyZ2Ugd2l0aCBjdXN0b20gWUFNTCAoaW5saW5lKSBpZiBwcm92aWRlZFxuICogMy4gTWVyZ2Ugd2l0aCBjdXN0b20gZmlsZSBpZiBwcm92aWRlZFxuICovXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRocmVzaG9sZHMoY3VzdG9tWWFtbD86IHN0cmluZywgY3VzdG9tUGF0aD86IHN0cmluZyk6IFByb21pc2U8VGhyZXNob2xkQ29uZmlnPiB7XG5cdC8vIEFsd2F5cyBsb2FkIGRlZmF1bHRzIGZpcnN0XG5cdGxldCBjb25maWcgPSBhd2FpdCBsb2FkRGVmYXVsdFRocmVzaG9sZHMoKVxuXG5cdC8vIE1lcmdlIHdpdGggY3VzdG9tIFlBTUwgKGlubGluZSlcblx0aWYgKGN1c3RvbVlhbWwpIHtcblx0XHRkZWJ1ZygnTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGlubGluZSBZQU1MJylcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjdXN0b21ZYW1sKVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHQvLyBNZXJnZSB3aXRoIGN1c3RvbSBmaWxlXG5cdGlmIChjdXN0b21QYXRoICYmIGZzLmV4aXN0c1N5bmMoY3VzdG9tUGF0aCkpIHtcblx0XHRkZWJ1ZyhgTWVyZ2luZyBjdXN0b20gdGhyZXNob2xkcyBmcm9tIGZpbGU6ICR7Y3VzdG9tUGF0aH1gKVxuXHRcdGxldCBjb250ZW50ID0gZnMucmVhZEZpbGVTeW5jKGN1c3RvbVBhdGgsIHsgZW5jb2Rpbmc6ICd1dGYtOCcgfSlcblx0XHRsZXQgY3VzdG9tQ29uZmlnID0gYXdhaXQgcGFyc2VUaHJlc2hvbGRzWWFtbChjb250ZW50KVxuXHRcdGlmIChjdXN0b21Db25maWcpIHtcblx0XHRcdGNvbmZpZyA9IG1lcmdlVGhyZXNob2xkQ29uZmlncyhjb25maWcsIGN1c3RvbUNvbmZpZylcblx0XHR9XG5cdH1cblxuXHRyZXR1cm4gY29uZmlnXG59XG5cbi8qKlxuICogTWF0Y2ggbWV0cmljIG5hbWUgYWdhaW5zdCBwYXR0ZXJuIChzdXBwb3J0cyB3aWxkY2FyZHMpXG4gKi9cbmZ1bmN0aW9uIG1hdGNoUGF0dGVybihtZXRyaWNOYW1lOiBzdHJpbmcsIHBhdHRlcm46IHN0cmluZyk6IGJvb2xlYW4ge1xuXHQvLyBDb252ZXJ0IGdsb2IgcGF0dGVybiB0byByZWdleFxuXHRsZXQgcmVnZXhQYXR0ZXJuID0gcGF0dGVyblxuXHRcdC5yZXBsYWNlKC9cXCovZywgJy4qJykgLy8gKiAtPiAuKlxuXHRcdC5yZXBsYWNlKC9cXD8vZywgJy4nKSAvLyA/IC0+IC5cblxuXHRsZXQgcmVnZXggPSBuZXcgUmVnRXhwKGBeJHtyZWdleFBhdHRlcm59JGAsICdpJylcblx0cmV0dXJuIHJlZ2V4LnRlc3QobWV0cmljTmFtZSlcbn1cblxuLyoqXG4gKiBGaW5kIG1hdGNoaW5nIHRocmVzaG9sZCBmb3IgbWV0cmljIChleGFjdCBtYXRjaCBmaXJzdCwgdGhlbiBwYXR0ZXJuKVxuICovXG5mdW5jdGlvbiBmaW5kTWF0Y2hpbmdUaHJlc2hvbGQobWV0cmljTmFtZTogc3RyaW5nLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IE1ldHJpY1RocmVzaG9sZCB8IG51bGwge1xuXHRpZiAoIWNvbmZpZy5tZXRyaWNzKSByZXR1cm4gbnVsbFxuXG5cdC8vIEZpcnN0IHBhc3M6IGV4YWN0IG1hdGNoIChoaWdoZXN0IHByaW9yaXR5KVxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLm5hbWUgJiYgdGhyZXNob2xkLm5hbWUgPT09IG1ldHJpY05hbWUpIHtcblx0XHRcdHJldHVybiB0aHJlc2hvbGRcblx0XHR9XG5cdH1cblxuXHQvLyBTZWNvbmQgcGFzczogcGF0dGVybiBtYXRjaFxuXHRmb3IgKGxldCB0aHJlc2hvbGQgb2YgY29uZmlnLm1ldHJpY3MpIHtcblx0XHRpZiAodGhyZXNob2xkLnBhdHRlcm4gJiYgbWF0Y2hQYXR0ZXJuKG1ldHJpY05hbWUsIHRocmVzaG9sZC5wYXR0ZXJuKSkge1xuXHRcdFx0cmV0dXJuIHRocmVzaG9sZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogRXZhbHVhdGUgdGhyZXNob2xkIGZvciBhIG1ldHJpYyBjb21wYXJpc29uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBldmFsdWF0ZVRocmVzaG9sZChjb21wYXJpc29uOiBNZXRyaWNDb21wYXJpc29uLCBjb25maWc6IFRocmVzaG9sZENvbmZpZyk6IFRocmVzaG9sZFNldmVyaXR5IHtcblx0Ly8gQ2FuJ3QgZXZhbHVhdGUgd2l0aG91dCBiYXNlXG5cdGlmICghY29tcGFyaXNvbi5iYXNlbGluZS5hdmFpbGFibGUpIHtcblx0XHRyZXR1cm4gJ3N1Y2Nlc3MnXG5cdH1cblxuXHRsZXQgdGhyZXNob2xkID0gZmluZE1hdGNoaW5nVGhyZXNob2xkKGNvbXBhcmlzb24ubmFtZSwgY29uZmlnKVxuXG5cdC8vIENoZWNrIGFic29sdXRlIHZhbHVlIHRocmVzaG9sZHMgZmlyc3Rcblx0aWYgKHRocmVzaG9sZCkge1xuXHRcdC8vIENoZWNrIGNyaXRpY2FsX21pblxuXHRcdGlmICh0aHJlc2hvbGQuY3JpdGljYWxfbWluICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlIDwgdGhyZXNob2xkLmNyaXRpY2FsX21pbikge1xuXHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogYmVsb3cgY3JpdGljYWxfbWluICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPCAke3RocmVzaG9sZC5jcml0aWNhbF9taW59KWApXG5cdFx0XHRyZXR1cm4gJ2ZhaWx1cmUnXG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgd2FybmluZ19taW5cblx0XHRpZiAodGhyZXNob2xkLndhcm5pbmdfbWluICE9PSB1bmRlZmluZWQgJiYgY29tcGFyaXNvbi5jdXJyZW50LnZhbHVlIDwgdGhyZXNob2xkLndhcm5pbmdfbWluKSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBiZWxvdyB3YXJuaW5nX21pbiAoJHtjb21wYXJpc29uLmN1cnJlbnQudmFsdWV9IDwgJHt0aHJlc2hvbGQud2FybmluZ19taW59KWApXG5cdFx0XHRyZXR1cm4gJ3dhcm5pbmcnXG5cdFx0fVxuXG5cdFx0Ly8gQ2hlY2sgY3JpdGljYWxfbWF4XG5cdFx0aWYgKHRocmVzaG9sZC5jcml0aWNhbF9tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQuY3JpdGljYWxfbWF4KSB7XG5cdFx0XHRkZWJ1ZyhgJHtjb21wYXJpc29uLm5hbWV9OiBhYm92ZSBjcml0aWNhbF9tYXggKCR7Y29tcGFyaXNvbi5jdXJyZW50LnZhbHVlfSA+ICR7dGhyZXNob2xkLmNyaXRpY2FsX21heH0pYClcblx0XHRcdHJldHVybiAnZmFpbHVyZSdcblx0XHR9XG5cblx0XHQvLyBDaGVjayB3YXJuaW5nX21heFxuXHRcdGlmICh0aHJlc2hvbGQud2FybmluZ19tYXggIT09IHVuZGVmaW5lZCAmJiBjb21wYXJpc29uLmN1cnJlbnQudmFsdWUgPiB0aHJlc2hvbGQud2FybmluZ19tYXgpIHtcblx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGFib3ZlIHdhcm5pbmdfbWF4ICgke2NvbXBhcmlzb24uY3VycmVudC52YWx1ZX0gPiAke3RocmVzaG9sZC53YXJuaW5nX21heH0pYClcblx0XHRcdHJldHVybiAnd2FybmluZydcblx0XHR9XG5cdH1cblxuXHQvLyBDaGVjayBjaGFuZ2UgcGVyY2VudCB0aHJlc2hvbGRzXG5cdGlmICghaXNOYU4oY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCkpIHtcblx0XHRsZXQgY2hhbmdlUGVyY2VudCA9IE1hdGguYWJzKGNvbXBhcmlzb24uY2hhbmdlLnBlcmNlbnQpXG5cblx0XHQvLyBVc2UgbWV0cmljLXNwZWNpZmljIG9yIGRlZmF1bHQgdGhyZXNob2xkc1xuXHRcdGxldCB3YXJuaW5nVGhyZXNob2xkID0gdGhyZXNob2xkPy53YXJuaW5nX2NoYW5nZV9wZXJjZW50ID8/IGNvbmZpZy5kZWZhdWx0Lndhcm5pbmdfY2hhbmdlX3BlcmNlbnRcblx0XHRsZXQgY3JpdGljYWxUaHJlc2hvbGQgPSB0aHJlc2hvbGQ/LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50ID8/IGNvbmZpZy5kZWZhdWx0LmNyaXRpY2FsX2NoYW5nZV9wZXJjZW50XG5cblx0XHQvLyBPbmx5IHRyaWdnZXIgaWYgY2hhbmdlIGlzIGluIFwid29yc2VcIiBkaXJlY3Rpb25cblx0XHRpZiAoY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uID09PSAnd29yc2UnKSB7XG5cdFx0XHRpZiAoY2hhbmdlUGVyY2VudCA+IGNyaXRpY2FsVGhyZXNob2xkKSB7XG5cdFx0XHRcdGRlYnVnKGAke2NvbXBhcmlzb24ubmFtZX06IGNyaXRpY2FsIHJlZ3Jlc3Npb24gKCR7Y2hhbmdlUGVyY2VudC50b0ZpeGVkKDEpfSUgPiAke2NyaXRpY2FsVGhyZXNob2xkfSUpYClcblx0XHRcdFx0cmV0dXJuICdmYWlsdXJlJ1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoY2hhbmdlUGVyY2VudCA+IHdhcm5pbmdUaHJlc2hvbGQpIHtcblx0XHRcdFx0ZGVidWcoYCR7Y29tcGFyaXNvbi5uYW1lfTogd2FybmluZyByZWdyZXNzaW9uICgke2NoYW5nZVBlcmNlbnQudG9GaXhlZCgxKX0lID4gJHt3YXJuaW5nVGhyZXNob2xkfSUpYClcblx0XHRcdFx0cmV0dXJuICd3YXJuaW5nJ1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdHJldHVybiAnc3VjY2Vzcydcbn1cblxuLyoqXG4gKiBFdmFsdWF0ZSBhbGwgbWV0cmljcyBhbmQgcmV0dXJuIG92ZXJhbGwgc2V2ZXJpdHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGV2YWx1YXRlV29ya2xvYWRUaHJlc2hvbGRzKFxuXHRjb21wYXJpc29uczogTWV0cmljQ29tcGFyaXNvbltdLFxuXHRjb25maWc6IFRocmVzaG9sZENvbmZpZ1xuKToge1xuXHRvdmVyYWxsOiBUaHJlc2hvbGRTZXZlcml0eVxuXHRmYWlsdXJlczogTWV0cmljQ29tcGFyaXNvbltdXG5cdHdhcm5pbmdzOiBNZXRyaWNDb21wYXJpc29uW11cbn0ge1xuXHRsZXQgZmFpbHVyZXM6IE1ldHJpY0NvbXBhcmlzb25bXSA9IFtdXG5cdGxldCB3YXJuaW5nczogTWV0cmljQ29tcGFyaXNvbltdID0gW11cblxuXHRmb3IgKGxldCBjb21wYXJpc29uIG9mIGNvbXBhcmlzb25zKSB7XG5cdFx0bGV0IHNldmVyaXR5ID0gZXZhbHVhdGVUaHJlc2hvbGQoY29tcGFyaXNvbiwgY29uZmlnKVxuXG5cdFx0aWYgKHNldmVyaXR5ID09PSAnZmFpbHVyZScpIHtcblx0XHRcdGZhaWx1cmVzLnB1c2goY29tcGFyaXNvbilcblx0XHR9IGVsc2UgaWYgKHNldmVyaXR5ID09PSAnd2FybmluZycpIHtcblx0XHRcdHdhcm5pbmdzLnB1c2goY29tcGFyaXNvbilcblx0XHR9XG5cdH1cblxuXHRsZXQgb3ZlcmFsbDogVGhyZXNob2xkU2V2ZXJpdHkgPSAnc3VjY2Vzcydcblx0aWYgKGZhaWx1cmVzLmxlbmd0aCA+IDApIHtcblx0XHRvdmVyYWxsID0gJ2ZhaWx1cmUnXG5cdH0gZWxzZSBpZiAod2FybmluZ3MubGVuZ3RoID4gMCkge1xuXHRcdG92ZXJhbGwgPSAnd2FybmluZydcblx0fVxuXG5cdHJldHVybiB7IG92ZXJhbGwsIGZhaWx1cmVzLCB3YXJuaW5ncyB9XG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIFBSIGNvbW1lbnQgZ2VuZXJhdGlvbiBhbmQgbWFuYWdlbWVudFxuICovXG5cbmltcG9ydCB7IGluZm8gfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuaW1wb3J0IHsgZ2V0T2N0b2tpdCB9IGZyb20gJ0BhY3Rpb25zL2dpdGh1YidcblxuaW1wb3J0IHR5cGUgeyBXb3JrbG9hZENvbXBhcmlzb24gfSBmcm9tICcuL2FuYWx5c2lzLmpzJ1xuXG5leHBvcnQgaW50ZXJmYWNlIENvbW1lbnREYXRhIHtcblx0d29ya2xvYWRzOiBXb3JrbG9hZENvbXBhcmlzb25bXVxuXHRhcnRpZmFjdFVybHM6IE1hcDxzdHJpbmcsIHN0cmluZz5cblx0Y2hlY2tVcmxzOiBNYXA8c3RyaW5nLCBzdHJpbmc+XG5cdGpvYlN1bW1hcnlVcmw/OiBzdHJpbmdcbn1cblxuLyoqXG4gKiBHZW5lcmF0ZSBQUiBjb21tZW50IGJvZHlcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQ29tbWVudEJvZHkoZGF0YTogQ29tbWVudERhdGEpOiBzdHJpbmcge1xuXHRsZXQgdG90YWxSZWdyZXNzaW9ucyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkucmVncmVzc2lvbnMsIDApXG5cdGxldCB0b3RhbEltcHJvdmVtZW50cyA9IGRhdGEud29ya2xvYWRzLnJlZHVjZSgoc3VtLCB3KSA9PiBzdW0gKyB3LnN1bW1hcnkuaW1wcm92ZW1lbnRzLCAwKVxuXG5cdGxldCBzdGF0dXNFbW9qaSA9IHRvdGFsUmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdGxldCBzdGF0dXNUZXh0ID0gdG90YWxSZWdyZXNzaW9ucyA+IDAgPyBgJHt0b3RhbFJlZ3Jlc3Npb25zfSByZWdyZXNzaW9uc2AgOiAnQWxsIGNsZWFyJ1xuXG5cdGxldCBoZWFkZXIgPSBgIyMg8J+MiyBTTE8gVGVzdCBSZXN1bHRzXG5cbioqU3RhdHVzKio6ICR7c3RhdHVzRW1vaml9ICR7ZGF0YS53b3JrbG9hZHMubGVuZ3RofSB3b3JrbG9hZHMgdGVzdGVkIOKAoiAke3N0YXR1c1RleHR9XG5cbiR7ZGF0YS5qb2JTdW1tYXJ5VXJsID8gYPCfk4ggW1ZpZXcgSm9iIFN1bW1hcnldKCR7ZGF0YS5qb2JTdW1tYXJ5VXJsfSkgZm9yIGRldGFpbGVkIGNvbXBhcmlzb25cXG5gIDogJyd9YFxuXG5cdGxldCB0YWJsZSA9IGBcbnwgV29ya2xvYWQgfCBNZXRyaWNzIHwgUmVncmVzc2lvbnMgfCBJbXByb3ZlbWVudHMgfCBMaW5rcyB8XG58LS0tLS0tLS0tLXwtLS0tLS0tLS18LS0tLS0tLS0tLS0tLXwtLS0tLS0tLS0tLS0tLXwtLS0tLS0tfFxuJHtkYXRhLndvcmtsb2Fkc1xuXHQubWFwKCh3KSA9PiB7XG5cdFx0bGV0IGVtb2ppID0gdy5zdW1tYXJ5LnJlZ3Jlc3Npb25zID4gMCA/ICfwn5+hJyA6IHcuc3VtbWFyeS5pbXByb3ZlbWVudHMgPiAwID8gJ/Cfn6InIDogJ+Kaqidcblx0XHRsZXQgcmVwb3J0TGluayA9IGRhdGEuYXJ0aWZhY3RVcmxzLmdldCh3Lndvcmtsb2FkKSB8fCAnIydcblx0XHRsZXQgY2hlY2tMaW5rID0gZGF0YS5jaGVja1VybHMuZ2V0KHcud29ya2xvYWQpIHx8ICcjJ1xuXG5cdFx0cmV0dXJuIGB8ICR7ZW1vaml9ICR7dy53b3JrbG9hZH0gfCAke3cuc3VtbWFyeS50b3RhbH0gfCAke3cuc3VtbWFyeS5yZWdyZXNzaW9uc30gfCAke3cuc3VtbWFyeS5pbXByb3ZlbWVudHN9IHwgW1JlcG9ydF0oJHtyZXBvcnRMaW5rfSkg4oCiIFtDaGVja10oJHtjaGVja0xpbmt9KSB8YFxuXHR9KVxuXHQuam9pbignXFxuJyl9XG5gXG5cblx0bGV0IGZvb3RlciA9IGBcXG4tLS1cXG4qR2VuZXJhdGVkIGJ5IFt5ZGItc2xvLWFjdGlvbl0oaHR0cHM6Ly9naXRodWIuY29tL3lkYi1wbGF0Zm9ybS95ZGItc2xvLWFjdGlvbikqYFxuXG5cdHJldHVybiBoZWFkZXIgKyB0YWJsZSArIGZvb3RlclxufVxuXG4vKipcbiAqIEZpbmQgZXhpc3RpbmcgU0xPIGNvbW1lbnQgaW4gUFJcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGZpbmRFeGlzdGluZ1NMT0NvbW1lbnQoXG5cdHRva2VuOiBzdHJpbmcsXG5cdG93bmVyOiBzdHJpbmcsXG5cdHJlcG86IHN0cmluZyxcblx0cHJOdW1iZXI6IG51bWJlclxuKTogUHJvbWlzZTxudW1iZXIgfCBudWxsPiB7XG5cdGxldCBvY3Rva2l0ID0gZ2V0T2N0b2tpdCh0b2tlbilcblxuXHRpbmZvKGBTZWFyY2hpbmcgZm9yIGV4aXN0aW5nIFNMTyBjb21tZW50IGluIFBSICMke3ByTnVtYmVyfS4uLmApXG5cblx0bGV0IHsgZGF0YTogY29tbWVudHMgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMubGlzdENvbW1lbnRzKHtcblx0XHRvd25lcixcblx0XHRyZXBvLFxuXHRcdGlzc3VlX251bWJlcjogcHJOdW1iZXIsXG5cdH0pXG5cblx0Zm9yIChsZXQgY29tbWVudCBvZiBjb21tZW50cykge1xuXHRcdGlmIChjb21tZW50LmJvZHk/LmluY2x1ZGVzKCfwn4yLIFNMTyBUZXN0IFJlc3VsdHMnKSkge1xuXHRcdFx0aW5mbyhgRm91bmQgZXhpc3RpbmcgY29tbWVudDogJHtjb21tZW50LmlkfWApXG5cdFx0XHRyZXR1cm4gY29tbWVudC5pZFxuXHRcdH1cblx0fVxuXG5cdHJldHVybiBudWxsXG59XG5cbi8qKlxuICogQ3JlYXRlIG9yIHVwZGF0ZSBQUiBjb21tZW50XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjcmVhdGVPclVwZGF0ZUNvbW1lbnQoXG5cdHRva2VuOiBzdHJpbmcsXG5cdG93bmVyOiBzdHJpbmcsXG5cdHJlcG86IHN0cmluZyxcblx0cHJOdW1iZXI6IG51bWJlcixcblx0Ym9keTogc3RyaW5nXG4pOiBQcm9taXNlPHsgdXJsOiBzdHJpbmc7IGlkOiBudW1iZXIgfT4ge1xuXHRsZXQgb2N0b2tpdCA9IGdldE9jdG9raXQodG9rZW4pXG5cblx0bGV0IGV4aXN0aW5nSWQgPSBhd2FpdCBmaW5kRXhpc3RpbmdTTE9Db21tZW50KHRva2VuLCBvd25lciwgcmVwbywgcHJOdW1iZXIpXG5cblx0aWYgKGV4aXN0aW5nSWQpIHtcblx0XHRpbmZvKGBVcGRhdGluZyBleGlzdGluZyBjb21tZW50ICR7ZXhpc3RpbmdJZH0uLi5gKVxuXG5cdFx0bGV0IHsgZGF0YSB9ID0gYXdhaXQgb2N0b2tpdC5yZXN0Lmlzc3Vlcy51cGRhdGVDb21tZW50KHtcblx0XHRcdG93bmVyLFxuXHRcdFx0cmVwbyxcblx0XHRcdGNvbW1lbnRfaWQ6IGV4aXN0aW5nSWQsXG5cdFx0XHRib2R5LFxuXHRcdH0pXG5cblx0XHRpbmZvKGBDb21tZW50IHVwZGF0ZWQ6ICR7ZGF0YS5odG1sX3VybH1gKVxuXG5cdFx0cmV0dXJuIHsgdXJsOiBkYXRhLmh0bWxfdXJsISwgaWQ6IGRhdGEuaWQgfVxuXHR9IGVsc2Uge1xuXHRcdGluZm8oYENyZWF0aW5nIG5ldyBjb21tZW50Li4uYClcblxuXHRcdGxldCB7IGRhdGEgfSA9IGF3YWl0IG9jdG9raXQucmVzdC5pc3N1ZXMuY3JlYXRlQ29tbWVudCh7XG5cdFx0XHRvd25lcixcblx0XHRcdHJlcG8sXG5cdFx0XHRpc3N1ZV9udW1iZXI6IHByTnVtYmVyLFxuXHRcdFx0Ym9keSxcblx0XHR9KVxuXG5cdFx0aW5mbyhgQ29tbWVudCBjcmVhdGVkOiAke2RhdGEuaHRtbF91cmx9YClcblxuXHRcdHJldHVybiB7IHVybDogZGF0YS5odG1sX3VybCEsIGlkOiBkYXRhLmlkIH1cblx0fVxufVxuIiwKICAgICIvKipcbiAqIEhUTUwgcmVwb3J0IGdlbmVyYXRpb24gd2l0aCBDaGFydC5qc1xuICovXG5cbmltcG9ydCB7IGZvcm1hdENoYW5nZSwgZm9ybWF0VmFsdWUsIHR5cGUgV29ya2xvYWRDb21wYXJpc29uIH0gZnJvbSAnLi9hbmFseXNpcy5qcydcbmltcG9ydCB0eXBlIHsgRm9ybWF0dGVkRXZlbnQgfSBmcm9tICcuL2V2ZW50cy5qcydcbmltcG9ydCB0eXBlIHsgQ29sbGVjdGVkTWV0cmljLCBNZXRyaWNzTWFwLCBTZXJpZXMgfSBmcm9tICcuL21ldHJpY3MuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgSFRNTFJlcG9ydERhdGEge1xuXHR3b3JrbG9hZDogc3RyaW5nXG5cdGN1cnJlbnRSZWY6IHN0cmluZ1xuXHRiYXNlbGluZVJlZjogc3RyaW5nXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXVxuXHRtZXRyaWNzOiBNZXRyaWNzTWFwXG5cdGNvbXBhcmlzb246IFdvcmtsb2FkQ29tcGFyaXNvblxuXHRwck51bWJlcjogbnVtYmVyXG5cdHRlc3RTdGFydFRpbWU6IG51bWJlciAvLyBlcG9jaCBtc1xuXHR0ZXN0RW5kVGltZTogbnVtYmVyIC8vIGVwb2NoIG1zXG59XG5cbi8qKlxuICogR2VuZXJhdGUgSFRNTCByZXBvcnRcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlSFRNTFJlcG9ydChkYXRhOiBIVE1MUmVwb3J0RGF0YSk6IHN0cmluZyB7XG5cdHJldHVybiBgPCFET0NUWVBFIGh0bWw+XG48aHRtbCBsYW5nPVwiZW5cIj5cbjxoZWFkPlxuXHQ8bWV0YSBjaGFyc2V0PVwiVVRGLThcIj5cblx0PG1ldGEgbmFtZT1cInZpZXdwb3J0XCIgY29udGVudD1cIndpZHRoPWRldmljZS13aWR0aCwgaW5pdGlhbC1zY2FsZT0xLjBcIj5cblx0PHRpdGxlPlNMTyBSZXBvcnQ6ICR7ZXNjYXBlSHRtbChkYXRhLndvcmtsb2FkKX08L3RpdGxlPlxuXHQ8c3R5bGU+JHtnZXRTdHlsZXMoKX08L3N0eWxlPlxuPC9oZWFkPlxuPGJvZHk+XG5cdDxoZWFkZXI+XG5cdFx0PGgxPvCfjIsgU0xPIFJlcG9ydDogJHtlc2NhcGVIdG1sKGRhdGEud29ya2xvYWQpfTwvaDE+XG5cdFx0PGRpdiBjbGFzcz1cImNvbW1pdC1pbmZvXCI+XG5cdFx0XHQ8c3BhbiBjbGFzcz1cImNvbW1pdCBjdXJyZW50XCI+XG5cdFx0XHRcdEN1cnJlbnQ6ICR7ZXNjYXBlSHRtbChkYXRhLmN1cnJlbnRSZWYpfVxuXHRcdFx0PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJ2c1wiPnZzPC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJjb21taXQgYmFzZWxpbmVcIj5cblx0XHRcdFx0QmFzZWxpbmU6ICR7ZXNjYXBlSHRtbChkYXRhLmJhc2VsaW5lUmVmKX1cblx0XHRcdDwvc3Bhbj5cblx0XHQ8L2Rpdj5cblx0XHQ8ZGl2IGNsYXNzPVwibWV0YVwiPlxuXHRcdFx0PHNwYW4+UFIgIyR7ZGF0YS5wck51bWJlcn08L3NwYW4+XG5cdFx0XHQ8c3Bhbj5EdXJhdGlvbjogJHsoKGRhdGEudGVzdEVuZFRpbWUgLSBkYXRhLnRlc3RTdGFydFRpbWUpIC8gMTAwMCkudG9GaXhlZCgwKX1zPC9zcGFuPlxuXHRcdFx0PHNwYW4+R2VuZXJhdGVkOiAke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKX08L3NwYW4+XG5cdFx0PC9kaXY+XG5cdDwvaGVhZGVyPlxuXG5cdDxzZWN0aW9uIGNsYXNzPVwic3VtbWFyeVwiPlxuXHRcdDxoMj7wn5OKIE1ldHJpY3MgT3ZlcnZpZXc8L2gyPlxuXHRcdDxkaXYgY2xhc3M9XCJzdGF0c1wiPlxuXHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtY2FyZFwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkudG90YWx9PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LWxhYmVsXCI+VG90YWwgTWV0cmljczwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIGltcHJvdmVtZW50c1wiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkuaW1wcm92ZW1lbnRzfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPkltcHJvdmVtZW50czwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIHJlZ3Jlc3Npb25zXCI+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJzdGF0LXZhbHVlXCI+JHtkYXRhLmNvbXBhcmlzb24uc3VtbWFyeS5yZWdyZXNzaW9uc308L2Rpdj5cblx0XHRcdFx0PGRpdiBjbGFzcz1cInN0YXQtbGFiZWxcIj5SZWdyZXNzaW9uczwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1jYXJkIHN0YWJsZVwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC12YWx1ZVwiPiR7ZGF0YS5jb21wYXJpc29uLnN1bW1hcnkuc3RhYmxlfTwvZGl2PlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwic3RhdC1sYWJlbFwiPlN0YWJsZTwvZGl2PlxuXHRcdFx0PC9kaXY+XG5cdFx0PC9kaXY+XG5cdFx0JHtnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShkYXRhLmNvbXBhcmlzb24pfVxuXHQ8L3NlY3Rpb24+XG5cblx0PHNlY3Rpb24gY2xhc3M9XCJjaGFydHNcIj5cblx0XHQ8aDI+8J+TiCBUaW1lIFNlcmllczwvaDI+XG5cdFx0JHtnZW5lcmF0ZUNoYXJ0cyhkYXRhLCBkYXRhLnRlc3RTdGFydFRpbWUsIGRhdGEudGVzdEVuZFRpbWUpfVxuXHQ8L3NlY3Rpb24+XG5cblx0PGZvb3Rlcj5cblx0XHQ8cD5HZW5lcmF0ZWQgYnkgPGEgaHJlZj1cImh0dHBzOi8vZ2l0aHViLmNvbS95ZGItcGxhdGZvcm0veWRiLXNsby1hY3Rpb25cIiB0YXJnZXQ9XCJfYmxhbmtcIj55ZGItc2xvLWFjdGlvbjwvYT48L3A+XG5cdDwvZm9vdGVyPlxuXG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydC5qcy9kaXN0L2NoYXJ0LnVtZC5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdCBzcmM9XCJodHRwczovL2Nkbi5qc2RlbGl2ci5uZXQvbnBtL2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy9kaXN0L2NoYXJ0anMtYWRhcHRlci1kYXRlLWZucy5idW5kbGUubWluLmpzXCI+PC9zY3JpcHQ+XG5cdDxzY3JpcHQgc3JjPVwiaHR0cHM6Ly9jZG4uanNkZWxpdnIubmV0L25wbS9jaGFydGpzLXBsdWdpbi1hbm5vdGF0aW9uL2Rpc3QvY2hhcnRqcy1wbHVnaW4tYW5ub3RhdGlvbi5taW4uanNcIj48L3NjcmlwdD5cblx0PHNjcmlwdD5cblx0XHQke2dlbmVyYXRlQ2hhcnRTY3JpcHRzKGRhdGEsIGRhdGEudGVzdFN0YXJ0VGltZSwgZGF0YS50ZXN0RW5kVGltZSl9XG5cdDwvc2NyaXB0PlxuPC9ib2R5PlxuPC9odG1sPmBcbn1cblxuZnVuY3Rpb24gZXNjYXBlSHRtbCh0ZXh0OiBzdHJpbmcpOiBzdHJpbmcge1xuXHRyZXR1cm4gdGV4dFxuXHRcdC5yZXBsYWNlKC8mL2csICcmYW1wOycpXG5cdFx0LnJlcGxhY2UoLzwvZywgJyZsdDsnKVxuXHRcdC5yZXBsYWNlKC8+L2csICcmZ3Q7Jylcblx0XHQucmVwbGFjZSgvXCIvZywgJyZxdW90OycpXG5cdFx0LnJlcGxhY2UoLycvZywgJyYjMDM5OycpXG59XG5cbi8qKlxuICogR2V0IHJlbGV2YW50IGFnZ3JlZ2F0ZXMgZm9yIG1ldHJpYyBiYXNlZCBvbiBpdHMgdHlwZVxuICovXG5mdW5jdGlvbiBnZXRSZWxldmFudEFnZ3JlZ2F0ZXMobWV0cmljTmFtZTogc3RyaW5nKTogKCdhdmcnIHwgJ3A1MCcgfCAncDkwJyB8ICdwOTUnKVtdIHtcblx0bGV0IGxvd2VyTmFtZSA9IG1ldHJpY05hbWUudG9Mb3dlckNhc2UoKVxuXG5cdC8vIEF2YWlsYWJpbGl0eSBtZXRyaWNzOiBvbmx5IGF2ZyBhbmQgcDUwXG5cdGlmIChsb3dlck5hbWUuaW5jbHVkZXMoJ2F2YWlsYWJpbGl0eScpIHx8IGxvd2VyTmFtZS5pbmNsdWRlcygndXB0aW1lJykgfHwgbG93ZXJOYW1lLmluY2x1ZGVzKCdzdWNjZXNzX3JhdGUnKSkge1xuXHRcdHJldHVybiBbJ2F2ZycsICdwNTAnXVxuXHR9XG5cblx0Ly8gTGF0ZW5jeS9kdXJhdGlvbiBtZXRyaWNzOiBwNTAsIHA5MCwgcDk1IChubyBhdmcpXG5cdGlmIChcblx0XHRsb3dlck5hbWUuaW5jbHVkZXMoJ2xhdGVuY3knKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZHVyYXRpb24nKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygndGltZScpIHx8XG5cdFx0bG93ZXJOYW1lLmVuZHNXaXRoKCdfbXMnKSB8fFxuXHRcdGxvd2VyTmFtZS5pbmNsdWRlcygnZGVsYXknKVxuXHQpIHtcblx0XHRyZXR1cm4gWydwNTAnLCAncDkwJywgJ3A5NSddXG5cdH1cblxuXHQvLyBEZWZhdWx0OiBzaG93IGFsbFxuXHRyZXR1cm4gWydhdmcnLCAncDUwJywgJ3A5MCcsICdwOTUnXVxufVxuXG4vKipcbiAqIEZvcm1hdCBhZ2dyZWdhdGUgbmFtZSBmb3IgZGlzcGxheVxuICovXG5mdW5jdGlvbiBmb3JtYXRBZ2dyZWdhdGVOYW1lKGFnZzogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIGFnZyAvLyBLZWVwIHRlY2huaWNhbCBuYW1lczogcDUwLCBwOTAsIHA5NVxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNvbXBhcmlzb25UYWJsZShjb21wYXJpc29uOiBXb3JrbG9hZENvbXBhcmlzb24pOiBzdHJpbmcge1xuXHRsZXQgcm93cyA9IGNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5tYXAoKG0pID0+IHtcblx0XHRcdHJldHVybiBgXG5cdFx0PHRyIGNsYXNzPVwiJHttLmNoYW5nZS5kaXJlY3Rpb259XCI+XG5cdFx0XHQ8dGQ+XG5cdFx0XHRcdDxhIGhyZWY9XCIjbWV0cmljLSR7c2FuaXRpemVJZChtLm5hbWUpfVwiIGNsYXNzPVwibWV0cmljLWxpbmtcIj5cblx0XHRcdFx0XHQke2VzY2FwZUh0bWwobS5uYW1lKX1cblx0XHRcdFx0PC9hPlxuXHRcdFx0PC90ZD5cblx0XHRcdDx0ZD4ke2Zvcm1hdFZhbHVlKG0uY3VycmVudC52YWx1ZSwgbS5uYW1lKX08L3RkPlxuXHRcdFx0PHRkPiR7bS5iYXNlbGluZS5hdmFpbGFibGUgPyBmb3JtYXRWYWx1ZShtLmJhc2VsaW5lLnZhbHVlLCBtLm5hbWUpIDogJ04vQSd9PC90ZD5cblx0XHRcdDx0ZCBjbGFzcz1cImNoYW5nZS1jZWxsXCI+JHttLmJhc2VsaW5lLmF2YWlsYWJsZSA/IGZvcm1hdENoYW5nZShtLmNoYW5nZS5wZXJjZW50LCBtLmNoYW5nZS5kaXJlY3Rpb24pIDogJ04vQSd9PC90ZD5cblx0XHQ8L3RyPlxuXHRgXG5cdFx0fSlcblx0XHQuam9pbignJylcblxuXHRyZXR1cm4gYFxuXHRcdDx0YWJsZSBjbGFzcz1cImNvbXBhcmlzb24tdGFibGVcIj5cblx0XHRcdDx0aGVhZD5cblx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdDx0aD5NZXRyaWM8L3RoPlxuXHRcdFx0XHRcdDx0aD5DdXJyZW50PC90aD5cblx0XHRcdFx0XHQ8dGg+QmFzZWxpbmU8L3RoPlxuXHRcdFx0XHRcdDx0aD5DaGFuZ2U8L3RoPlxuXHRcdFx0XHQ8L3RyPlxuXHRcdFx0PC90aGVhZD5cblx0XHRcdDx0Ym9keT5cblx0XHRcdFx0JHtyb3dzfVxuXHRcdFx0PC90Ym9keT5cblx0XHQ8L3RhYmxlPlxuXHRgXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlQ2hhcnRzKGRhdGE6IEhUTUxSZXBvcnREYXRhLCBnbG9iYWxTdGFydFRpbWU6IG51bWJlciwgZ2xvYmFsRW5kVGltZTogbnVtYmVyKTogc3RyaW5nIHtcblx0cmV0dXJuIGRhdGEuY29tcGFyaXNvbi5tZXRyaWNzXG5cdFx0LmZpbHRlcigobSkgPT4gbS50eXBlID09PSAncmFuZ2UnKSAvLyBPbmx5IHJhbmdlIG1ldHJpY3MgaGF2ZSBjaGFydHNcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmdldChjb21wYXJpc29uLm5hbWUpXG5cdFx0XHRpZiAoIW1ldHJpYykgcmV0dXJuICcnXG5cblx0XHRcdC8vIFNraXAgbWV0cmljcyB3aXRoIG5vIGRhdGEgKGVtcHR5IGRhdGEgYXJyYXkgb3Igbm8gc2VyaWVzKVxuXHRcdFx0aWYgKCFtZXRyaWMuZGF0YSB8fCBtZXRyaWMuZGF0YS5sZW5ndGggPT09IDApIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdC8vIFNraXAgaWYgYWxsIHNlcmllcyBhcmUgZW1wdHlcblx0XHRcdGxldCBoYXNEYXRhID0gKG1ldHJpYy5kYXRhIGFzIFNlcmllc1tdKS5zb21lKChzKSA9PiBzLnZhbHVlcyAmJiBzLnZhbHVlcy5sZW5ndGggPiAwKVxuXHRcdFx0aWYgKCFoYXNEYXRhKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBGaWx0ZXIgZXZlbnRzIHRoYXQgYXJlIHJlbGV2YW50IHRvIHRoaXMgbWV0cmljJ3MgdGltZWZyYW1lXG5cdFx0XHRsZXQgcmVsZXZhbnRFdmVudHMgPSBkYXRhLmV2ZW50cy5maWx0ZXIoXG5cdFx0XHRcdChlKSA9PiBlLnRpbWVzdGFtcCA+PSBnbG9iYWxTdGFydFRpbWUgJiYgZS50aW1lc3RhbXAgPD0gZ2xvYmFsRW5kVGltZVxuXHRcdFx0KVxuXG5cdFx0XHRsZXQgZXZlbnRzVGltZWxpbmUgPSByZWxldmFudEV2ZW50cy5sZW5ndGggPiAwID8gZ2VuZXJhdGVDaGFydEV2ZW50c1RpbWVsaW5lKHJlbGV2YW50RXZlbnRzKSA6ICcnXG5cblx0XHRcdC8vIEdlbmVyYXRlIGFnZ3JlZ2F0ZXMgc3VtbWFyeSBmb3IgY2hhcnQgaGVhZGVyXG5cdFx0XHRsZXQgbWV0YVN1bW1hcnkgPSAnJ1xuXHRcdFx0aWYgKGNvbXBhcmlzb24uY3VycmVudC5hZ2dyZWdhdGVzICYmIGNvbXBhcmlzb24uYmFzZWxpbmUuYWdncmVnYXRlcykge1xuXHRcdFx0XHRsZXQgY3VycmVudEFnZyA9IGNvbXBhcmlzb24uY3VycmVudC5hZ2dyZWdhdGVzXG5cdFx0XHRcdGxldCBiYXNlQWdnID0gY29tcGFyaXNvbi5iYXNlbGluZS5hZ2dyZWdhdGVzXG5cblx0XHRcdFx0Ly8gR2V0IHJlbGV2YW50IGFnZ3JlZ2F0ZXMgZm9yIHRoaXMgbWV0cmljXG5cdFx0XHRcdGxldCByZWxldmFudEFnZ3MgPSBnZXRSZWxldmFudEFnZ3JlZ2F0ZXMoY29tcGFyaXNvbi5uYW1lKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIHRhYmxlIGhlYWRlclxuXHRcdFx0XHRsZXQgaGVhZGVyQ2VsbHMgPSByZWxldmFudEFnZ3MubWFwKChhZ2cpID0+IGA8dGg+JHtmb3JtYXRBZ2dyZWdhdGVOYW1lKGFnZyl9PC90aD5gKS5qb2luKCcnKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIGN1cnJlbnQgcm93XG5cdFx0XHRcdGxldCBjdXJyZW50Q2VsbHMgPSByZWxldmFudEFnZ3Ncblx0XHRcdFx0XHQubWFwKChhZ2cpID0+IGA8dGQ+JHtmb3JtYXRWYWx1ZShjdXJyZW50QWdnW2FnZ10sIGNvbXBhcmlzb24ubmFtZSl9PC90ZD5gKVxuXHRcdFx0XHRcdC5qb2luKCcnKVxuXG5cdFx0XHRcdC8vIEdlbmVyYXRlIGJhc2VsaW5lIHJvd1xuXHRcdFx0XHRsZXQgYmFzZUNlbGxzID0gcmVsZXZhbnRBZ2dzXG5cdFx0XHRcdFx0Lm1hcCgoYWdnKSA9PiBgPHRkPiR7Zm9ybWF0VmFsdWUoYmFzZUFnZ1thZ2ddLCBjb21wYXJpc29uLm5hbWUpfTwvdGQ+YClcblx0XHRcdFx0XHQuam9pbignJylcblxuXHRcdFx0XHRtZXRhU3VtbWFyeSA9IGBcblx0XHRcdFx0XHQ8dGFibGUgY2xhc3M9XCJhZ2dyZWdhdGVzLXRhYmxlXCI+XG5cdFx0XHRcdFx0XHQ8dGhlYWQ+XG5cdFx0XHRcdFx0XHRcdDx0cj5cblx0XHRcdFx0XHRcdFx0XHQ8dGg+PC90aD5cblx0XHRcdFx0XHRcdFx0XHQke2hlYWRlckNlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0PC90aGVhZD5cblx0XHRcdFx0XHRcdDx0Ym9keT5cblx0XHRcdFx0XHRcdFx0PHRyPlxuXHRcdFx0XHRcdFx0XHRcdDx0ZCBjbGFzcz1cInJvdy1sYWJlbFwiPkN1cnJlbnQ8L3RkPlxuXHRcdFx0XHRcdFx0XHRcdCR7Y3VycmVudENlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0XHQ8dHI+XG5cdFx0XHRcdFx0XHRcdFx0PHRkIGNsYXNzPVwicm93LWxhYmVsXCI+QmFzZWxpbmU8L3RkPlxuXHRcdFx0XHRcdFx0XHRcdCR7YmFzZUNlbGxzfVxuXHRcdFx0XHRcdFx0XHQ8L3RyPlxuXHRcdFx0XHRcdFx0PC90Ym9keT5cblx0XHRcdFx0XHQ8L3RhYmxlPlxuXHRcdFx0XHRgXG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRtZXRhU3VtbWFyeSA9IGBcblx0XHRcdFx0XHRDdXJyZW50OiAke2Zvcm1hdFZhbHVlKGNvbXBhcmlzb24uY3VycmVudC52YWx1ZSwgY29tcGFyaXNvbi5uYW1lKX1cblx0XHRcdFx0XHQke2NvbXBhcmlzb24uYmFzZWxpbmUuYXZhaWxhYmxlID8gYCDigKIgQmFzZWxpbmU6ICR7Zm9ybWF0VmFsdWUoY29tcGFyaXNvbi5iYXNlbGluZS52YWx1ZSwgY29tcGFyaXNvbi5uYW1lKX1gIDogJyd9XG5cdFx0XHRcdGBcblx0XHRcdH1cblxuXHRcdFx0cmV0dXJuIGBcblx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtY2FyZFwiIGlkPVwibWV0cmljLSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWhlYWRlclwiPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzPVwiY2hhcnQtdGl0bGUtc2VjdGlvblwiPlxuXHRcdFx0XHRcdDxoMz5cblx0XHRcdFx0XHRcdCR7ZXNjYXBlSHRtbChjb21wYXJpc29uLm5hbWUpfVxuXHRcdFx0XHRcdFx0PHNwYW4gY2xhc3M9XCJpbmRpY2F0b3IgJHtjb21wYXJpc29uLmNoYW5nZS5kaXJlY3Rpb259XCI+JHtmb3JtYXRDaGFuZ2UoY29tcGFyaXNvbi5jaGFuZ2UucGVyY2VudCwgY29tcGFyaXNvbi5jaGFuZ2UuZGlyZWN0aW9uKX08L3NwYW4+XG5cdFx0XHRcdFx0PC9oMz5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1tZXRhXCI+XG5cdFx0XHRcdFx0JHttZXRhU3VtbWFyeX1cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQ8L2Rpdj5cblx0XHRcdDxkaXYgY2xhc3M9XCJjaGFydC1jb250YWluZXJcIj5cblx0XHRcdFx0PGNhbnZhcyBpZD1cImNoYXJ0LSR7c2FuaXRpemVJZChjb21wYXJpc29uLm5hbWUpfVwiPjwvY2FudmFzPlxuXHRcdFx0PC9kaXY+XG5cdFx0XHQke2V2ZW50c1RpbWVsaW5lfVxuXHRcdDwvZGl2PlxuXHRgXG5cdFx0fSlcblx0XHQuam9pbignJylcbn1cblxuZnVuY3Rpb24gZ2VuZXJhdGVDaGFydEV2ZW50c1RpbWVsaW5lKGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSk6IHN0cmluZyB7XG5cdGlmIChldmVudHMubGVuZ3RoID09PSAwKSByZXR1cm4gJydcblxuXHRsZXQgZXZlbnRJdGVtcyA9IGV2ZW50c1xuXHRcdC5tYXAoXG5cdFx0XHQoZSwgaWR4KSA9PiBgXG5cdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLWV2ZW50XCIgZGF0YS1ldmVudC1pZD1cIiR7aWR4fVwiIHRpdGxlPVwiJHtlc2NhcGVIdG1sKGUubGFiZWwpfVwiPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC1pY29uXCI+JHtlLmljb259PC9zcGFuPlxuXHRcdFx0PHNwYW4gY2xhc3M9XCJldmVudC10aW1lXCI+JHtmb3JtYXRUaW1lc3RhbXAoZS50aW1lc3RhbXApfTwvc3Bhbj5cblx0XHRcdDxzcGFuIGNsYXNzPVwiZXZlbnQtbGFiZWxcIj4ke2VzY2FwZUh0bWwoZS5sYWJlbCl9PC9zcGFuPlxuXHRcdDwvZGl2PlxuXHRgXG5cdFx0KVxuXHRcdC5qb2luKCcnKVxuXG5cdHJldHVybiBgXG5cdFx0PGRpdiBjbGFzcz1cImNoYXJ0LWV2ZW50cy10aW1lbGluZVwiPlxuXHRcdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLXRpdGxlXCI+RXZlbnRzOjwvZGl2PlxuXHRcdFx0PGRpdiBjbGFzcz1cInRpbWVsaW5lLWV2ZW50c1wiPlxuXHRcdFx0XHQke2V2ZW50SXRlbXN9XG5cdFx0XHQ8L2Rpdj5cblx0XHQ8L2Rpdj5cblx0YFxufVxuXG5mdW5jdGlvbiBnZW5lcmF0ZUNoYXJ0U2NyaXB0cyhkYXRhOiBIVE1MUmVwb3J0RGF0YSwgZ2xvYmFsU3RhcnRUaW1lOiBudW1iZXIsIGdsb2JhbEVuZFRpbWU6IG51bWJlcik6IHN0cmluZyB7XG5cdGxldCBjaGFydFNjcmlwdHMgPSBkYXRhLmNvbXBhcmlzb24ubWV0cmljc1xuXHRcdC5maWx0ZXIoKG0pID0+IG0udHlwZSA9PT0gJ3JhbmdlJylcblx0XHQubWFwKChjb21wYXJpc29uKSA9PiB7XG5cdFx0XHRsZXQgbWV0cmljID0gZGF0YS5tZXRyaWNzLmdldChjb21wYXJpc29uLm5hbWUpXG5cdFx0XHRpZiAoIW1ldHJpYykgcmV0dXJuICcnXG5cblx0XHRcdC8vIFNraXAgbWV0cmljcyB3aXRoIG5vIGRhdGFcblx0XHRcdGlmICghbWV0cmljLmRhdGEgfHwgbWV0cmljLmRhdGEubGVuZ3RoID09PSAwKSB7XG5cdFx0XHRcdHJldHVybiAnJ1xuXHRcdFx0fVxuXHRcdFx0bGV0IGhhc0RhdGEgPSAobWV0cmljLmRhdGEgYXMgU2VyaWVzW10pLnNvbWUoKHMpID0+IHMudmFsdWVzICYmIHMudmFsdWVzLmxlbmd0aCA+IDApXG5cdFx0XHRpZiAoIWhhc0RhdGEpIHtcblx0XHRcdFx0cmV0dXJuICcnXG5cdFx0XHR9XG5cblx0XHRcdHJldHVybiBnZW5lcmF0ZVNpbmdsZUNoYXJ0U2NyaXB0KFxuXHRcdFx0XHRjb21wYXJpc29uLm5hbWUsXG5cdFx0XHRcdG1ldHJpYyBhcyBDb2xsZWN0ZWRNZXRyaWMsXG5cdFx0XHRcdGRhdGEuZXZlbnRzLFxuXHRcdFx0XHRnbG9iYWxTdGFydFRpbWUsXG5cdFx0XHRcdGdsb2JhbEVuZFRpbWUsXG5cdFx0XHRcdGRhdGEuY3VycmVudFJlZixcblx0XHRcdFx0ZGF0YS5iYXNlbGluZVJlZlxuXHRcdFx0KVxuXHRcdH0pXG5cdFx0LmpvaW4oJ1xcbicpXG5cblx0cmV0dXJuIGNoYXJ0U2NyaXB0c1xufVxuXG4vKipcbiAqIEZpbHRlciBvdXRsaWVycyBmcm9tIHRpbWUgc2VyaWVzIGRhdGEgdXNpbmcgcGVyY2VudGlsZXNcbiAqIFJlbW92ZXMgdmFsdWVzIG91dHNpZGUgW3AxLCBwOTldIHJhbmdlXG4gKi9cbmZ1bmN0aW9uIGZpbHRlck91dGxpZXJzKHZhbHVlczogW251bWJlciwgc3RyaW5nXVtdKTogW251bWJlciwgc3RyaW5nXVtdIHtcblx0aWYgKHZhbHVlcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZXNcblxuXHQvLyBFeHRyYWN0IG51bWVyaWMgdmFsdWVzXG5cdGxldCBudW1zID0gdmFsdWVzLm1hcCgoWywgdl0pID0+IHBhcnNlRmxvYXQodikpLmZpbHRlcigobikgPT4gIWlzTmFOKG4pKVxuXHRpZiAobnVtcy5sZW5ndGggPT09IDApIHJldHVybiB2YWx1ZXNcblxuXHQvLyBTb3J0IGZvciBwZXJjZW50aWxlIGNhbGN1bGF0aW9uXG5cdG51bXMuc29ydCgoYSwgYikgPT4gYSAtIGIpXG5cblx0Ly8gQ2FsY3VsYXRlIHAxIGFuZCBwOTlcblx0bGV0IHAxSW5kZXggPSBNYXRoLmZsb29yKG51bXMubGVuZ3RoICogMC4wMSlcblx0bGV0IHA5OUluZGV4ID0gTWF0aC5mbG9vcihudW1zLmxlbmd0aCAqIDAuOTkpXG5cdGxldCBwMSA9IG51bXNbcDFJbmRleF1cblx0bGV0IHA5OSA9IG51bXNbcDk5SW5kZXhdXG5cblx0Ly8gRmlsdGVyIHZhbHVlcyB3aXRoaW4gW3AxLCBwOTldXG5cdHJldHVybiB2YWx1ZXMuZmlsdGVyKChbLCB2XSkgPT4ge1xuXHRcdGxldCBudW0gPSBwYXJzZUZsb2F0KHYpXG5cdFx0cmV0dXJuICFpc05hTihudW0pICYmIG51bSA+PSBwMSAmJiBudW0gPD0gcDk5XG5cdH0pXG59XG5cbmZ1bmN0aW9uIGdlbmVyYXRlU2luZ2xlQ2hhcnRTY3JpcHQoXG5cdG1ldHJpY05hbWU6IHN0cmluZyxcblx0bWV0cmljOiBDb2xsZWN0ZWRNZXRyaWMsXG5cdGV2ZW50czogRm9ybWF0dGVkRXZlbnRbXSxcblx0Z2xvYmFsU3RhcnRUaW1lOiBudW1iZXIsXG5cdGdsb2JhbEVuZFRpbWU6IG51bWJlcixcblx0Y3VycmVudFJlZjogc3RyaW5nLFxuXHRiYXNlbGluZVJlZjogc3RyaW5nXG4pOiBzdHJpbmcge1xuXHRsZXQgY3VycmVudFNlcmllcyA9IChtZXRyaWMuZGF0YSBhcyBTZXJpZXNbXSkuZmluZCgocykgPT4gcy5tZXRyaWMucmVmID09PSBjdXJyZW50UmVmKVxuXHRsZXQgYmFzZWxpbmVTZXJpZXMgPSAobWV0cmljLmRhdGEgYXMgU2VyaWVzW10pLmZpbmQoKHMpID0+IHMubWV0cmljLnJlZiA9PT0gYmFzZWxpbmVSZWYpXG5cblx0Ly8gRmlsdGVyIG91dGxpZXJzIGZyb20gYm90aCBzZXJpZXNcblx0bGV0IGZpbHRlcmVkQ3VycmVudFZhbHVlcyA9IGN1cnJlbnRTZXJpZXMgPyBmaWx0ZXJPdXRsaWVycyhjdXJyZW50U2VyaWVzLnZhbHVlcykgOiBbXVxuXHRsZXQgZmlsdGVyZWRCYXNlbGluZVZhbHVlcyA9IGJhc2VsaW5lU2VyaWVzID8gZmlsdGVyT3V0bGllcnMoYmFzZWxpbmVTZXJpZXMudmFsdWVzKSA6IFtdXG5cblx0bGV0IGN1cnJlbnREYXRhID1cblx0XHRmaWx0ZXJlZEN1cnJlbnRWYWx1ZXMubGVuZ3RoID4gMFxuXHRcdFx0PyBKU09OLnN0cmluZ2lmeShmaWx0ZXJlZEN1cnJlbnRWYWx1ZXMubWFwKChbdCwgdl0pID0+ICh7IHg6IHQgKiAxMDAwLCB5OiBwYXJzZUZsb2F0KHYpIH0pKSlcblx0XHRcdDogJ1tdJ1xuXG5cdGxldCBiYXNlbGluZURhdGEgPVxuXHRcdGZpbHRlcmVkQmFzZWxpbmVWYWx1ZXMubGVuZ3RoID4gMFxuXHRcdFx0PyBKU09OLnN0cmluZ2lmeShmaWx0ZXJlZEJhc2VsaW5lVmFsdWVzLm1hcCgoW3QsIHZdKSA9PiAoeyB4OiB0ICogMTAwMCwgeTogcGFyc2VGbG9hdCh2KSB9KSkpXG5cdFx0XHQ6ICdbXSdcblxuXHQvLyBHZW5lcmF0ZSBhbm5vdGF0aW9ucyBmb3IgdGVzdCBib3VuZGFyaWVzXG5cdGxldCBib3VuZGFyeUFubm90YXRpb25zOiBzdHJpbmdbXSA9IFtcblx0XHRge1xuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0eE1pbjogJHtnbG9iYWxTdGFydFRpbWV9LFxuXHRcdFx0eE1heDogJHtnbG9iYWxTdGFydFRpbWV9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjMTBiOTgxJyxcblx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdXG5cdFx0fWAsXG5cdFx0YHtcblx0XHRcdHR5cGU6ICdsaW5lJyxcblx0XHRcdHhNaW46ICR7Z2xvYmFsRW5kVGltZX0sXG5cdFx0XHR4TWF4OiAke2dsb2JhbEVuZFRpbWV9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjZWY0NDQ0Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAyLFxuXHRcdFx0Ym9yZGVyRGFzaDogWzUsIDVdXG5cdFx0fWAsXG5cdF1cblxuXHQvLyBTZXBhcmF0ZSBldmVudHMgaW50byBib3hlcyAod2l0aCBkdXJhdGlvbikgYW5kIGxpbmVzIChpbnN0YW50KVxuXHRsZXQgYm94QW5ub3RhdGlvbnM6IHN0cmluZ1tdID0gW11cblx0bGV0IGxpbmVBbm5vdGF0aW9uczogc3RyaW5nW10gPSBbXVxuXG5cdGZvciAobGV0IGkgPSAwOyBpIDwgZXZlbnRzLmxlbmd0aDsgaSsrKSB7XG5cdFx0bGV0IGUgPSBldmVudHNbaV1cblx0XHRpZiAoZS5kdXJhdGlvbl9tcykge1xuXHRcdFx0Ly8gQm94IGFubm90YXRpb24gZm9yIGV2ZW50cyB3aXRoIGR1cmF0aW9uICh0aW1lc3RhbXAgYWxyZWFkeSBpbiBtcylcblx0XHRcdGxldCB4TWF4ID0gZS50aW1lc3RhbXAgKyBlLmR1cmF0aW9uX21zXG5cdFx0XHQvLyBBZGQgc2VtaS10cmFuc3BhcmVudCBib3ggKGJlaGluZCBncmFwaClcblx0XHRcdGJveEFubm90YXRpb25zLnB1c2goYHtcblx0XHRcdGlkOiAnZXZlbnQtYmctJHtpfScsXG5cdFx0XHR0eXBlOiAnYm94Jyxcblx0XHRcdGRyYXdUaW1lOiAnYmVmb3JlRGF0YXNldHNEcmF3Jyxcblx0XHRcdHhNaW46ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0eE1heDogJHt4TWF4fSxcblx0XHRcdGJhY2tncm91bmRDb2xvcjogJ3JnYmEoMjUxLCAxNDYsIDYwLCAwLjA4KScsXG5cdFx0XHRib3JkZXJDb2xvcjogJ3RyYW5zcGFyZW50Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAwXG5cdFx0fWApXG5cdFx0XHQvLyBBZGQgdGhpY2sgaG9yaXpvbnRhbCBsaW5lIGF0IGJvdHRvbSAoYmVoaW5kIGdyYXBoKVxuXHRcdFx0Ym94QW5ub3RhdGlvbnMucHVzaChge1xuXHRcdFx0aWQ6ICdldmVudC1iYXItJHtpfScsXG5cdFx0XHR0eXBlOiAnYm94Jyxcblx0XHRcdGRyYXdUaW1lOiAnYmVmb3JlRGF0YXNldHNEcmF3Jyxcblx0XHRcdHhNaW46ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0eE1heDogJHt4TWF4fSxcblx0XHRcdHlNaW46IChjdHgpID0+IGN0eC5jaGFydC5zY2FsZXMueS5taW4sXG5cdFx0XHR5TWF4OiAoY3R4KSA9PiBjdHguY2hhcnQuc2NhbGVzLnkubWluICsgKGN0eC5jaGFydC5zY2FsZXMueS5tYXggLSBjdHguY2hhcnQuc2NhbGVzLnkubWluKSAqIDAuMDIsXG5cdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjZjk3MzE2Jyxcblx0XHRcdGJvcmRlckNvbG9yOiAndHJhbnNwYXJlbnQnLFxuXHRcdFx0Ym9yZGVyV2lkdGg6IDBcblx0XHR9YClcblx0XHR9IGVsc2Uge1xuXHRcdFx0Ly8gTGluZSBhbm5vdGF0aW9uIGZvciBpbnN0YW50IGV2ZW50cyAodGltZXN0YW1wIGFscmVhZHkgaW4gbXMpXG5cdFx0XHRsaW5lQW5ub3RhdGlvbnMucHVzaChge1xuXHRcdFx0aWQ6ICdldmVudC1saW5lLSR7aX0nLFxuXHRcdFx0dHlwZTogJ2xpbmUnLFxuXHRcdFx0ZHJhd1RpbWU6ICdhZnRlckRhdGFzZXRzRHJhdycsXG5cdFx0XHR4TWluOiAke2UudGltZXN0YW1wfSxcblx0XHRcdHhNYXg6ICR7ZS50aW1lc3RhbXB9LFxuXHRcdFx0Ym9yZGVyQ29sb3I6ICcjZjk3MzE2Jyxcblx0XHRcdGJvcmRlcldpZHRoOiAyXG5cdFx0fWApXG5cdFx0fVxuXHR9XG5cblx0Ly8gQ29tYmluZSBhbGwgYW5ub3RhdGlvbnM6IGJveGVzIGZpcnN0IChiZWhpbmQpLCB0aGVuIGJvdW5kYXJpZXMsIHRoZW4gbGluZXMgKGZyb250KVxuXHRsZXQgYWxsQW5ub3RhdGlvbnMgPSBbLi4uYm94QW5ub3RhdGlvbnMsIC4uLmJvdW5kYXJ5QW5ub3RhdGlvbnMsIC4uLmxpbmVBbm5vdGF0aW9uc10uam9pbignLFxcbicpXG5cblx0cmV0dXJuIGBcbihmdW5jdGlvbigpIHtcblx0Y29uc3QgY3R4ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NoYXJ0LSR7c2FuaXRpemVJZChtZXRyaWNOYW1lKX0nKTtcblx0aWYgKCFjdHgpIHJldHVybjtcblxuXHRjb25zdCBjaGFydCA9IG5ldyBDaGFydChjdHgsIHtcblx0XHR0eXBlOiAnbGluZScsXG5cdFx0ZGF0YToge1xuXHRcdGRhdGFzZXRzOiBbXG5cdFx0XHR7XG5cdFx0XHRcdGxhYmVsOiAnJHtlc2NhcGVIdG1sKGN1cnJlbnRSZWYpfScsXG5cdFx0XHRcdGRhdGE6ICR7Y3VycmVudERhdGF9LFxuXHRcdFx0XHRib3JkZXJDb2xvcjogJyMzYjgyZjYnLFxuXHRcdFx0XHRiYWNrZ3JvdW5kQ29sb3I6ICcjM2I4MmY2MjAnLFxuXHRcdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdHBvaW50SG92ZXJSYWRpdXM6IDQsXG5cdFx0XHRcdHRlbnNpb246IDAuMSxcblx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0fSxcblx0XHRcdCR7XG5cdFx0XHRcdGJhc2VsaW5lU2VyaWVzXG5cdFx0XHRcdFx0PyBge1xuXHRcdFx0XHRsYWJlbDogJyR7ZXNjYXBlSHRtbChiYXNlbGluZVJlZil9Jyxcblx0XHRcdFx0ZGF0YTogJHtiYXNlbGluZURhdGF9LFxuXHRcdFx0XHRcdGJvcmRlckNvbG9yOiAnIzk0YTNiOCcsXG5cdFx0XHRcdFx0YmFja2dyb3VuZENvbG9yOiAnIzk0YTNiODIwJyxcblx0XHRcdFx0XHRib3JkZXJXaWR0aDogMixcblx0XHRcdFx0XHRib3JkZXJEYXNoOiBbNSwgNV0sXG5cdFx0XHRcdFx0cG9pbnRSYWRpdXM6IDIsXG5cdFx0XHRcdFx0cG9pbnRIb3ZlclJhZGl1czogNCxcblx0XHRcdFx0XHR0ZW5zaW9uOiAwLjEsXG5cdFx0XHRcdFx0ZmlsbDogdHJ1ZVxuXHRcdFx0XHR9YFxuXHRcdFx0XHRcdDogJydcblx0XHRcdH1cblx0XHRcdF1cblx0XHR9LFxuXHRcdG9wdGlvbnM6IHtcblx0XHRcdHJlc3BvbnNpdmU6IHRydWUsXG5cdFx0XHRtYWludGFpbkFzcGVjdFJhdGlvOiBmYWxzZSxcblx0XHRcdGludGVyYWN0aW9uOiB7XG5cdFx0XHRcdG1vZGU6ICdpbmRleCcsXG5cdFx0XHRcdGludGVyc2VjdDogZmFsc2Vcblx0XHRcdH0sXG5cdFx0c2NhbGVzOiB7XG5cdFx0XHR4OiB7XG5cdFx0XHRcdHR5cGU6ICd0aW1lJyxcblx0XHRcdFx0bWluOiAke2dsb2JhbFN0YXJ0VGltZX0sXG5cdFx0XHRcdG1heDogJHtnbG9iYWxFbmRUaW1lfSxcblx0XHRcdFx0dGltZToge1xuXHRcdFx0XHRcdHVuaXQ6ICdtaW51dGUnLFxuXHRcdFx0XHRcdGRpc3BsYXlGb3JtYXRzOiB7XG5cdFx0XHRcdFx0XHRtaW51dGU6ICdISDptbSdcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHRpdGxlOiB7XG5cdFx0XHRcdFx0ZGlzcGxheTogdHJ1ZSxcblx0XHRcdFx0XHR0ZXh0OiAnVGltZSdcblx0XHRcdFx0fVxuXHRcdFx0fSxcblx0XHRcdFx0eToge1xuXHRcdFx0XHRcdGJlZ2luQXRaZXJvOiBmYWxzZSxcblx0XHRcdFx0XHRncmFjZTogJzEwJScsXG5cdFx0XHRcdFx0dGl0bGU6IHtcblx0XHRcdFx0XHRcdGRpc3BsYXk6IHRydWUsXG5cdFx0XHRcdFx0XHR0ZXh0OiAnJHtlc2NhcGVKcyhtZXRyaWNOYW1lKX0nXG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9LFxuXHRcdFx0cGx1Z2luczoge1xuXHRcdFx0XHRsZWdlbmQ6IHtcblx0XHRcdFx0XHRkaXNwbGF5OiB0cnVlLFxuXHRcdFx0XHRcdHBvc2l0aW9uOiAndG9wJ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHR0b29sdGlwOiB7XG5cdFx0XHRcdFx0bW9kZTogJ2luZGV4Jyxcblx0XHRcdFx0XHRpbnRlcnNlY3Q6IGZhbHNlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGFubm90YXRpb246IHtcblx0XHRcdFx0XHRhbm5vdGF0aW9uczogWyR7YWxsQW5ub3RhdGlvbnN9XVxuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fVxuXHR9KTtcblxuXHQvLyBTdG9yZSBjaGFydCByZWZlcmVuY2UgZm9yIGludGVyYWN0aW9uXG5cdGN0eC5jaGFydEluc3RhbmNlID0gY2hhcnQ7XG5cblx0Ly8gQWRkIGhvdmVyIGhhbmRsZXJzIGZvciB0aW1lbGluZSBldmVudHNcblx0Y29uc3QgY2hhcnRDYXJkID0gY3R4LmNsb3Nlc3QoJy5jaGFydC1jYXJkJyk7XG5cdGlmIChjaGFydENhcmQpIHtcblx0XHRjb25zdCB0aW1lbGluZUV2ZW50cyA9IGNoYXJ0Q2FyZC5xdWVyeVNlbGVjdG9yQWxsKCcudGltZWxpbmUtZXZlbnQnKTtcblx0XHR0aW1lbGluZUV2ZW50cy5mb3JFYWNoKChldmVudEVsKSA9PiB7XG5cdFx0XHRjb25zdCBldmVudElkID0gcGFyc2VJbnQoZXZlbnRFbC5nZXRBdHRyaWJ1dGUoJ2RhdGEtZXZlbnQtaWQnKSk7XG5cblx0XHRcdGV2ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VlbnRlcicsICgpID0+IHtcblx0XHRcdFx0Ly8gQWNjZXNzIGFubm90YXRpb25zIGFycmF5XG5cdFx0XHRcdGNvbnN0IGFubm90YXRpb25zID0gY2hhcnQuY29uZmlnLm9wdGlvbnMucGx1Z2lucy5hbm5vdGF0aW9uLmFubm90YXRpb25zO1xuXG5cdFx0XHRcdC8vIEZpbmQgYW5kIHVwZGF0ZSBhbm5vdGF0aW9ucyBmb3IgdGhpcyBldmVudFxuXHRcdFx0XHRmb3IgKGxldCBpID0gMDsgaSA8IGFubm90YXRpb25zLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRcdFx0Y29uc3QgYW5uID0gYW5ub3RhdGlvbnNbaV07XG5cdFx0XHRcdFx0aWYgKGFubi5pZCA9PT0gJ2V2ZW50LWJnLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJ3JnYmEoMjUxLCAxNDYsIDYwLCAwLjM1KSc7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbm4uaWQgPT09ICdldmVudC1iYXItJyArIGV2ZW50SWQpIHtcblx0XHRcdFx0XHRcdGFubi5iYWNrZ3JvdW5kQ29sb3IgPSAnI2ZiOTIzYyc7XG5cdFx0XHRcdFx0fSBlbHNlIGlmIChhbm4uaWQgPT09ICdldmVudC1saW5lLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYm9yZGVyQ29sb3IgPSAnI2ZiOTIzYyc7XG5cdFx0XHRcdFx0XHRhbm4uYm9yZGVyV2lkdGggPSA0O1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdGNoYXJ0LnVwZGF0ZSgnbm9uZScpO1xuXHRcdFx0fSk7XG5cblx0XHRcdGV2ZW50RWwuYWRkRXZlbnRMaXN0ZW5lcignbW91c2VsZWF2ZScsICgpID0+IHtcblx0XHRcdFx0Ly8gQWNjZXNzIGFubm90YXRpb25zIGFycmF5XG5cdFx0XHRcdGNvbnN0IGFubm90YXRpb25zID0gY2hhcnQuY29uZmlnLm9wdGlvbnMucGx1Z2lucy5hbm5vdGF0aW9uLmFubm90YXRpb25zO1xuXG5cdFx0XHRcdC8vIFJlc3RvcmUgYW5ub3RhdGlvbnMgZm9yIHRoaXMgZXZlbnRcblx0XHRcdFx0Zm9yIChsZXQgaSA9IDA7IGkgPCBhbm5vdGF0aW9ucy5sZW5ndGg7IGkrKykge1xuXHRcdFx0XHRcdGNvbnN0IGFubiA9IGFubm90YXRpb25zW2ldO1xuXHRcdFx0XHRcdGlmIChhbm4uaWQgPT09ICdldmVudC1iZy0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJhY2tncm91bmRDb2xvciA9ICdyZ2JhKDI1MSwgMTQ2LCA2MCwgMC4wOCknO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtYmFyLScgKyBldmVudElkKSB7XG5cdFx0XHRcdFx0XHRhbm4uYmFja2dyb3VuZENvbG9yID0gJyNmOTczMTYnO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoYW5uLmlkID09PSAnZXZlbnQtbGluZS0nICsgZXZlbnRJZCkge1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlckNvbG9yID0gJyNmOTczMTYnO1xuXHRcdFx0XHRcdFx0YW5uLmJvcmRlcldpZHRoID0gMjtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHRjaGFydC51cGRhdGUoJ25vbmUnKTtcblx0XHRcdH0pO1xuXHRcdH0pO1xuXHR9XG59KSgpO1xuYFxufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZUlkKHN0cjogc3RyaW5nKTogc3RyaW5nIHtcblx0cmV0dXJuIHN0ci5yZXBsYWNlKC9bXmEtekEtWjAtOV0vZywgJy0nKVxufVxuXG5mdW5jdGlvbiBlc2NhcGVKcyhzdHI6IHN0cmluZyk6IHN0cmluZyB7XG5cdHJldHVybiBzdHIucmVwbGFjZSgvXFxcXC9nLCAnXFxcXFxcXFwnKS5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIikucmVwbGFjZSgvXCIvZywgJ1xcXFxcIicpLnJlcGxhY2UoL1xcbi9nLCAnXFxcXG4nKVxufVxuXG5mdW5jdGlvbiBmb3JtYXRUaW1lc3RhbXAodGltZXN0YW1wOiBudW1iZXIpOiBzdHJpbmcge1xuXHRsZXQgZGF0ZSA9IG5ldyBEYXRlKHRpbWVzdGFtcCkgLy8gdGltZXN0YW1wIGFscmVhZHkgaW4gbWlsbGlzZWNvbmRzXG5cdC8vIEZvcm1hdCBhcyBsb2NhbCB0aW1lIEhIOk1NOlNTXG5cdGxldCBob3VycyA9IGRhdGUuZ2V0SG91cnMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0bGV0IG1pbnV0ZXMgPSBkYXRlLmdldE1pbnV0ZXMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0bGV0IHNlY29uZHMgPSBkYXRlLmdldFNlY29uZHMoKS50b1N0cmluZygpLnBhZFN0YXJ0KDIsICcwJylcblx0cmV0dXJuIGAke2hvdXJzfToke21pbnV0ZXN9OiR7c2Vjb25kc31gXG59XG5cbmZ1bmN0aW9uIGdldFN0eWxlcygpOiBzdHJpbmcge1xuXHRyZXR1cm4gYFxuKiB7XG5cdG1hcmdpbjogMDtcblx0cGFkZGluZzogMDtcblx0Ym94LXNpemluZzogYm9yZGVyLWJveDtcbn1cblxuaHRtbCB7XG5cdHNjcm9sbC1iZWhhdmlvcjogc21vb3RoO1xufVxuXG5ib2R5IHtcblx0Zm9udC1mYW1pbHk6IC1hcHBsZS1zeXN0ZW0sIEJsaW5rTWFjU3lzdGVtRm9udCwgJ1NlZ29lIFVJJywgUm9ib3RvLCAnSGVsdmV0aWNhIE5ldWUnLCBBcmlhbCwgc2Fucy1zZXJpZjtcblx0bGluZS1oZWlnaHQ6IDEuNjtcblx0Y29sb3I6ICMyNDI5MmY7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdHBhZGRpbmc6IDIwcHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Ym9keSB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRjb2xvcjogI2M5ZDFkOTtcblx0fVxufVxuXG5oZWFkZXIge1xuXHRtYXgtd2lkdGg6IDEyMDBweDtcblx0bWFyZ2luOiAwIGF1dG8gNDBweDtcblx0cGFkZGluZzogMzBweDtcblx0YmFja2dyb3VuZDogI2Y2ZjhmYTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRib3JkZXI6IDFweCBzb2xpZCAjZDBkN2RlO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdGhlYWRlciB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuaGVhZGVyIGgxIHtcblx0Zm9udC1zaXplOiAzMnB4O1xuXHRtYXJnaW4tYm90dG9tOiAxNXB4O1xufVxuXG4uY29tbWl0LWluZm8ge1xuXHRmb250LXNpemU6IDE2cHg7XG5cdG1hcmdpbi1ib3R0b206IDEwcHg7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTVweDtcblx0ZmxleC13cmFwOiB3cmFwO1xufVxuXG4uY29tbWl0IHtcblx0cGFkZGluZzogNHB4IDhweDtcblx0Ym9yZGVyLXJhZGl1czogNHB4O1xuXHRmb250LWZhbWlseTogJ0NvdXJpZXIgTmV3JywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDE0cHg7XG59XG5cbi5jb21taXQuY3VycmVudCB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQ7XG5cdGNvbG9yOiAjMWE3ZjM3O1xufVxuXG4uY29tbWl0LmJhc2VsaW5lIHtcblx0YmFja2dyb3VuZDogI2RkZjRmZjtcblx0Y29sb3I6ICMwOTY5ZGE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbW1pdC5jdXJyZW50IHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2O1xuXHRcdGNvbG9yOiAjM2ZiOTUwO1xuXHR9XG5cdC5jb21taXQuYmFzZWxpbmUge1xuXHRcdGJhY2tncm91bmQ6ICMwYzJkNmI7XG5cdFx0Y29sb3I6ICM1OGE2ZmY7XG5cdH1cbn1cblxuLmNvbW1pdCBhIHtcblx0Y29sb3I6IGluaGVyaXQ7XG5cdHRleHQtZGVjb3JhdGlvbjogbm9uZTtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmNvbW1pdCBhOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbi52cyB7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4ubWV0YSB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGdhcDogMTVweDtcblx0ZmxleC13cmFwOiB3cmFwO1xufVxuXG5zZWN0aW9uIHtcblx0bWF4LXdpZHRoOiAxMjAwcHg7XG5cdG1hcmdpbjogMCBhdXRvIDQwcHg7XG59XG5cbnNlY3Rpb24gaDIge1xuXHRmb250LXNpemU6IDI0cHg7XG5cdG1hcmdpbi1ib3R0b206IDIwcHg7XG5cdGJvcmRlci1ib3R0b206IDFweCBzb2xpZCAjZDBkN2RlO1xuXHRwYWRkaW5nLWJvdHRvbTogMTBweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRzZWN0aW9uIGgyIHtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLnN0YXRzIHtcblx0ZGlzcGxheTogZ3JpZDtcblx0Z3JpZC10ZW1wbGF0ZS1jb2x1bW5zOiByZXBlYXQoYXV0by1maXQsIG1pbm1heCgyMDBweCwgMWZyKSk7XG5cdGdhcDogMTVweDtcblx0bWFyZ2luLWJvdHRvbTogMzBweDtcbn1cblxuLnN0YXQtY2FyZCB7XG5cdHBhZGRpbmc6IDIwcHg7XG5cdGJhY2tncm91bmQ6ICNmNmY4ZmE7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0Ym9yZGVyOiAycHggc29saWQgI2QwZDdkZTtcblx0dGV4dC1hbGlnbjogY2VudGVyO1xufVxuXG4uc3RhdC1jYXJkLmltcHJvdmVtZW50cyB7XG5cdGJvcmRlci1jb2xvcjogIzFhN2YzNztcbn1cblxuLnN0YXQtY2FyZC5yZWdyZXNzaW9ucyB7XG5cdGJvcmRlci1jb2xvcjogI2NmMjIyZTtcbn1cblxuLnN0YXQtY2FyZC5zdGFibGUge1xuXHRib3JkZXItY29sb3I6ICM2ZTc3ODE7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LnN0YXQtY2FyZCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cblx0LnN0YXQtY2FyZC5pbXByb3ZlbWVudHMge1xuXHRcdGJvcmRlci1jb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuc3RhdC1jYXJkLnJlZ3Jlc3Npb25zIHtcblx0XHRib3JkZXItY29sb3I6ICNmODUxNDk7XG5cdH1cblx0LnN0YXQtY2FyZC5zdGFibGUge1xuXHRcdGJvcmRlci1jb2xvcjogIzhiOTQ5ZTtcblx0fVxufVxuXG4uc3RhdC12YWx1ZSB7XG5cdGZvbnQtc2l6ZTogMzZweDtcblx0Zm9udC13ZWlnaHQ6IDcwMDtcblx0bWFyZ2luLWJvdHRvbTogNXB4O1xufVxuXG4uc3RhdC1sYWJlbCB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZvbnQtd2VpZ2h0OiA1MDA7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHtcblx0d2lkdGg6IDEwMCU7XG5cdGJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7XG5cdGJhY2tncm91bmQ6ICNmZmZmZmY7XG5cdGJvcmRlcjogMXB4IHNvbGlkICNkMGQ3ZGU7XG5cdGJvcmRlci1yYWRpdXM6IDhweDtcblx0b3ZlcmZsb3c6IGhpZGRlbjtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY29tcGFyaXNvbi10YWJsZSB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdGgsXG4uY29tcGFyaXNvbi10YWJsZSB0ZCB7XG5cdHBhZGRpbmc6IDEycHggMTZweDtcblx0dGV4dC1hbGlnbjogbGVmdDtcblx0Ym9yZGVyLWJvdHRvbTogMXB4IHNvbGlkICNkMGQ3ZGU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUgdGgsXG5cdC5jb21wYXJpc29uLXRhYmxlIHRkIHtcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdGgge1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRmb250LXdlaWdodDogNjAwO1xuXHRmb250LXNpemU6IDE0cHg7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUgdGgge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdH1cbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHI6bGFzdC1jaGlsZCB0ZCB7XG5cdGJvcmRlci1ib3R0b206IG5vbmU7XG59XG5cbi5jb21wYXJpc29uLXRhYmxlIHRyLmJldHRlciB7XG5cdGJhY2tncm91bmQ6ICNkZmY2ZGQyMDtcbn1cblxuLmNvbXBhcmlzb24tdGFibGUgdHIud29yc2Uge1xuXHRiYWNrZ3JvdW5kOiAjZmZlYmU5MjA7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0LmNvbXBhcmlzb24tdGFibGUgdHIuYmV0dGVyIHtcblx0XHRiYWNrZ3JvdW5kOiAjMDMzYTE2MjA7XG5cdH1cblx0LmNvbXBhcmlzb24tdGFibGUgdHIud29yc2Uge1xuXHRcdGJhY2tncm91bmQ6ICM4NjE4MWQyMDtcblx0fVxufVxuXG4uY2hhbmdlLWNlbGwge1xuXHRmb250LXdlaWdodDogNjAwO1xufVxuXG4ubWV0cmljLWxpbmsge1xuXHRjb2xvcjogIzA5NjlkYTtcblx0dGV4dC1kZWNvcmF0aW9uOiBub25lO1xufVxuXG4ubWV0cmljLWxpbms6aG92ZXIge1xuXHR0ZXh0LWRlY29yYXRpb246IHVuZGVybGluZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQubWV0cmljLWxpbmsge1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbi5jaGFydC1jYXJkIHtcblx0bWFyZ2luLWJvdHRvbTogNDBweDtcblx0YmFja2dyb3VuZDogI2ZmZmZmZjtcblx0Ym9yZGVyOiAxcHggc29saWQgI2QwZDdkZTtcblx0Ym9yZGVyLXJhZGl1czogOHB4O1xuXHRwYWRkaW5nOiAyMHB4O1xuXHRzY3JvbGwtbWFyZ2luLXRvcDogMjBweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuY2hhcnQtY2FyZCB7XG5cdFx0YmFja2dyb3VuZDogIzBkMTExNztcblx0XHRib3JkZXItY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLmNoYXJ0LWhlYWRlciB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGp1c3RpZnktY29udGVudDogc3BhY2UtYmV0d2Vlbjtcblx0YWxpZ24taXRlbXM6IGZsZXgtc3RhcnQ7XG5cdGdhcDogMjRweDtcblx0bWFyZ2luLWJvdHRvbTogMTVweDtcbn1cblxuLmNoYXJ0LXRpdGxlLXNlY3Rpb24gaDMge1xuXHRmb250LXNpemU6IDE4cHg7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGFsaWduLWl0ZW1zOiBjZW50ZXI7XG5cdGdhcDogMTBweDtcblx0ZmxleC13cmFwOiB3cmFwO1xuXHRtYXJnaW46IDA7XG59XG5cbi5pbmRpY2F0b3Ige1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmc6IDRweCA4cHg7XG5cdGJvcmRlci1yYWRpdXM6IDRweDtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcbn1cblxuLmluZGljYXRvci5iZXR0ZXIge1xuXHRiYWNrZ3JvdW5kOiAjZGZmNmRkO1xuXHRjb2xvcjogIzFhN2YzNztcbn1cblxuLmluZGljYXRvci53b3JzZSB7XG5cdGJhY2tncm91bmQ6ICNmZmViZTk7XG5cdGNvbG9yOiAjY2YyMjJlO1xufVxuXG4uaW5kaWNhdG9yLm5ldXRyYWwge1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRjb2xvcjogIzZlNzc4MTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuaW5kaWNhdG9yLmJldHRlciB7XG5cdFx0YmFja2dyb3VuZDogIzAzM2ExNjtcblx0XHRjb2xvcjogIzNmYjk1MDtcblx0fVxuXHQuaW5kaWNhdG9yLndvcnNlIHtcblx0XHRiYWNrZ3JvdW5kOiAjODYxODFkO1xuXHRcdGNvbG9yOiAjZmY3YjcyO1xuXHR9XG5cdC5pbmRpY2F0b3IubmV1dHJhbCB7XG5cdFx0YmFja2dyb3VuZDogIzE2MWIyMjtcblx0XHRjb2xvcjogIzhiOTQ5ZTtcblx0fVxufVxuXG4uY2hhcnQtbWV0YSB7XG5cdGZvbnQtc2l6ZTogMTRweDtcblx0Y29sb3I6ICM2ZTc3ODE7XG5cdGZsZXgtc2hyaW5rOiAwO1xufVxuXG4uYWdncmVnYXRlcy10YWJsZSB7XG5cdHdpZHRoOiBhdXRvO1xuXHRib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlO1xuXHRmb250LXNpemU6IDEzcHg7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIHRoIHtcblx0Zm9udC13ZWlnaHQ6IDYwMDtcblx0cGFkZGluZzogNHB4IDEycHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Y29sb3I6ICM2NTZkNzY7XG5cdGZvbnQtZmFtaWx5OiAnU0YgTW9ubycsICdNb25hY28nLCAnSW5jb25zb2xhdGEnLCAnUm9ib3RvIE1vbm8nLCAnQ29uc29sYXMnLCBtb25vc3BhY2U7XG59XG5cbi5hZ2dyZWdhdGVzLXRhYmxlIHRkIHtcblx0cGFkZGluZzogNHB4IDEycHg7XG5cdHRleHQtYWxpZ246IGNlbnRlcjtcblx0Zm9udC1mYW1pbHk6ICdTRiBNb25vJywgJ01vbmFjbycsICdJbmNvbnNvbGF0YScsICdSb2JvdG8gTW9ubycsICdDb25zb2xhcycsIG1vbm9zcGFjZTtcbn1cblxuLmFnZ3JlZ2F0ZXMtdGFibGUgLnJvdy1sYWJlbCB7XG5cdGZvbnQtd2VpZ2h0OiA2MDA7XG5cdHRleHQtYWxpZ246IHJpZ2h0O1xuXHRjb2xvcjogIzFmMjMyODtcblx0cGFkZGluZy1yaWdodDogMTZweDtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuYWdncmVnYXRlcy10YWJsZSAucm93LWxhYmVsIHtcblx0XHRjb2xvcjogI2U2ZWRmMztcblx0fVxufVxuXG4uY2hhcnQtY29udGFpbmVyIHtcblx0cG9zaXRpb246IHJlbGF0aXZlO1xuXHRoZWlnaHQ6IDQwMHB4O1xufVxuXG4uY2hhcnQtZXZlbnRzLXRpbWVsaW5lIHtcblx0bWFyZ2luLXRvcDogMTVweDtcblx0cGFkZGluZy10b3A6IDE1cHg7XG5cdGJvcmRlci10b3A6IDFweCBzb2xpZCAjZTVlN2ViO1xufVxuXG5AbWVkaWEgKHByZWZlcnMtY29sb3Itc2NoZW1lOiBkYXJrKSB7XG5cdC5jaGFydC1ldmVudHMtdGltZWxpbmUge1xuXHRcdGJvcmRlci10b3AtY29sb3I6ICMzMDM2M2Q7XG5cdH1cbn1cblxuLnRpbWVsaW5lLXRpdGxlIHtcblx0Zm9udC1zaXplOiAxM3B4O1xuXHRmb250LXdlaWdodDogNjAwO1xuXHRjb2xvcjogIzY1NmQ3Njtcblx0bWFyZ2luLWJvdHRvbTogMTBweDtcbn1cblxuLnRpbWVsaW5lLWV2ZW50cyB7XG5cdGRpc3BsYXk6IGZsZXg7XG5cdGZsZXgtZGlyZWN0aW9uOiBjb2x1bW47XG5cdGdhcDogOHB4O1xufVxuXG4udGltZWxpbmUtZXZlbnQge1xuXHRkaXNwbGF5OiBmbGV4O1xuXHRhbGlnbi1pdGVtczogY2VudGVyO1xuXHRnYXA6IDEwcHg7XG5cdHBhZGRpbmc6IDhweCAxMnB4O1xuXHRiYWNrZ3JvdW5kOiAjZjZmOGZhO1xuXHRib3JkZXItcmFkaXVzOiA2cHg7XG5cdGZvbnQtc2l6ZTogMTNweDtcblx0dHJhbnNpdGlvbjogYWxsIDAuMnM7XG5cdGN1cnNvcjogcG9pbnRlcjtcblx0Ym9yZGVyOiAycHggc29saWQgdHJhbnNwYXJlbnQ7XG59XG5cbi50aW1lbGluZS1ldmVudDpob3ZlciB7XG5cdGJhY2tncm91bmQ6ICNmZmY1ZWQ7XG5cdGJvcmRlci1jb2xvcjogI2ZiOTIzYztcblx0Ym94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMjUxLCAxNDYsIDYwLCAwLjIpO1xuXHR0cmFuc2Zvcm06IHRyYW5zbGF0ZVgoNHB4KTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQudGltZWxpbmUtZXZlbnQge1xuXHRcdGJhY2tncm91bmQ6ICMxNjFiMjI7XG5cdFx0Ym9yZGVyLWNvbG9yOiB0cmFuc3BhcmVudDtcblx0fVxuXG5cdC50aW1lbGluZS1ldmVudDpob3ZlciB7XG5cdFx0YmFja2dyb3VuZDogIzJkMTgxMDtcblx0XHRib3JkZXItY29sb3I6ICNmYjkyM2M7XG5cdFx0Ym94LXNoYWRvdzogMCAycHggOHB4IHJnYmEoMjUxLCAxNDYsIDYwLCAwLjMpO1xuXHR9XG59XG5cbi5ldmVudC1pY29uIHtcblx0Zm9udC1zaXplOiAxNnB4O1xuXHRmbGV4LXNocmluazogMDtcbn1cblxuLmV2ZW50LXRpbWUge1xuXHRmb250LWZhbWlseTogJ1NGIE1vbm8nLCAnTW9uYWNvJywgJ0luY29uc29sYXRhJywgJ1JvYm90byBNb25vJywgJ0NvbnNvbGFzJywgbW9ub3NwYWNlO1xuXHRmb250LXNpemU6IDEycHg7XG5cdGNvbG9yOiAjNjU2ZDc2O1xuXHRmbGV4LXNocmluazogMDtcbn1cblxuLmV2ZW50LWxhYmVsIHtcblx0Y29sb3I6ICMxZjIzMjg7XG5cdGZsZXgtZ3JvdzogMTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHQuZXZlbnQtbGFiZWwge1xuXHRcdGNvbG9yOiAjZTZlZGYzO1xuXHR9XG59XG5cbmZvb3RlciB7XG5cdG1heC13aWR0aDogMTIwMHB4O1xuXHRtYXJnaW46IDYwcHggYXV0byAyMHB4O1xuXHR0ZXh0LWFsaWduOiBjZW50ZXI7XG5cdGNvbG9yOiAjNmU3NzgxO1xuXHRmb250LXNpemU6IDE0cHg7XG5cdHBhZGRpbmctdG9wOiAyMHB4O1xuXHRib3JkZXItdG9wOiAxcHggc29saWQgI2QwZDdkZTtcbn1cblxuQG1lZGlhIChwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyaykge1xuXHRmb290ZXIge1xuXHRcdGJvcmRlci1jb2xvcjogIzMwMzYzZDtcblx0fVxufVxuXG5mb290ZXIgYSB7XG5cdGNvbG9yOiAjMDk2OWRhO1xuXHR0ZXh0LWRlY29yYXRpb246IG5vbmU7XG59XG5cbmZvb3RlciBhOmhvdmVyIHtcblx0dGV4dC1kZWNvcmF0aW9uOiB1bmRlcmxpbmU7XG59XG5cbkBtZWRpYSAocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspIHtcblx0Zm9vdGVyIGEge1xuXHRcdGNvbG9yOiAjNThhNmZmO1xuXHR9XG59XG5cbkBtZWRpYSAobWF4LXdpZHRoOiA3NjhweCkge1xuXHRib2R5IHtcblx0XHRwYWRkaW5nOiAxMHB4O1xuXHR9XG5cblx0aGVhZGVyIGgxIHtcblx0XHRmb250LXNpemU6IDI0cHg7XG5cdH1cblxuXHQuY2hhcnQtY29udGFpbmVyIHtcblx0XHRoZWlnaHQ6IDMwMHB4O1xuXHR9XG5cblx0LnN0YXRzIHtcblx0XHRncmlkLXRlbXBsYXRlLWNvbHVtbnM6IHJlcGVhdCgyLCAxZnIpO1xuXHR9XG59XG5gXG59XG4iLAogICAgIi8qKlxuICogR2l0SHViIEFjdGlvbnMgSm9iIFN1bW1hcnkgZ2VuZXJhdGlvblxuICovXG5cbmltcG9ydCB7IHN1bW1hcnkgfSBmcm9tICdAYWN0aW9ucy9jb3JlJ1xuXG5pbXBvcnQgeyBmb3JtYXRDaGFuZ2UsIGZvcm1hdFZhbHVlLCB0eXBlIFdvcmtsb2FkQ29tcGFyaXNvbiB9IGZyb20gJy4vYW5hbHlzaXMuanMnXG5cbmV4cG9ydCBpbnRlcmZhY2UgU3VtbWFyeURhdGEge1xuXHR3b3JrbG9hZHM6IFdvcmtsb2FkQ29tcGFyaXNvbltdXG5cdGN1cnJlbnRSZWY6IHN0cmluZ1xuXHRiYXNlbGluZVJlZjogc3RyaW5nXG5cdGFydGlmYWN0VXJscz86IE1hcDxzdHJpbmcsIHN0cmluZz5cbn1cblxuLyoqXG4gKiBXcml0ZSBKb2IgU3VtbWFyeSB3aXRoIGFsbCB3b3JrbG9hZHNcbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHdyaXRlSm9iU3VtbWFyeShkYXRhOiBTdW1tYXJ5RGF0YSk6IFByb21pc2U8dm9pZD4ge1xuXHRzdW1tYXJ5LmFkZEhlYWRpbmcoJ/CfjIsgU0xPIFRlc3QgU3VtbWFyeScsIDEpXG5cblx0Ly8gQ29tbWl0cyBpbmZvXG5cdHN1bW1hcnkuYWRkUmF3KGBcbjxwPlxuXHQ8c3Ryb25nPkN1cnJlbnQ6PC9zdHJvbmc+ICR7ZGF0YS5jdXJyZW50UmVmfVxuXHR2c1xuXHQ8c3Ryb25nPkJhc2VsaW5lOjwvc3Ryb25nPiAke2RhdGEuYmFzZWxpbmVSZWZ9XG48L3A+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gT3ZlcmFsbCBzdGF0c1xuXHRsZXQgdG90YWxNZXRyaWNzID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS50b3RhbCwgMClcblx0bGV0IHRvdGFsUmVncmVzc2lvbnMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LnJlZ3Jlc3Npb25zLCAwKVxuXHRsZXQgdG90YWxJbXByb3ZlbWVudHMgPSBkYXRhLndvcmtsb2Fkcy5yZWR1Y2UoKHN1bSwgdykgPT4gc3VtICsgdy5zdW1tYXJ5LmltcHJvdmVtZW50cywgMClcblx0bGV0IHRvdGFsU3RhYmxlID0gZGF0YS53b3JrbG9hZHMucmVkdWNlKChzdW0sIHcpID0+IHN1bSArIHcuc3VtbWFyeS5zdGFibGUsIDApXG5cblx0c3VtbWFyeS5hZGRSYXcoYFxuPHRhYmxlPlxuXHQ8dHI+XG5cdFx0PHRkPjxzdHJvbmc+JHtkYXRhLndvcmtsb2Fkcy5sZW5ndGh9PC9zdHJvbmc+IHdvcmtsb2FkczwvdGQ+XG5cdFx0PHRkPjxzdHJvbmc+JHt0b3RhbE1ldHJpY3N9PC9zdHJvbmc+IG1ldHJpY3M8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICMxYTdmMzc7XCI+JHt0b3RhbEltcHJvdmVtZW50c308L3N0cm9uZz4gaW1wcm92ZW1lbnRzPC90ZD5cblx0XHQ8dGQ+PHN0cm9uZyBzdHlsZT1cImNvbG9yOiAjY2YyMjJlO1wiPiR7dG90YWxSZWdyZXNzaW9uc308L3N0cm9uZz4gcmVncmVzc2lvbnM8L3RkPlxuXHRcdDx0ZD48c3Ryb25nIHN0eWxlPVwiY29sb3I6ICM2ZTc3ODE7XCI+JHt0b3RhbFN0YWJsZX08L3N0cm9uZz4gc3RhYmxlPC90ZD5cblx0PC90cj5cbjwvdGFibGU+XG5cdGApXG5cblx0c3VtbWFyeS5hZGRCcmVhaygpXG5cblx0Ly8gRWFjaCB3b3JrbG9hZFxuXHRmb3IgKGxldCB3b3JrbG9hZCBvZiBkYXRhLndvcmtsb2Fkcykge1xuXHRcdGxldCBzdGF0dXNFbW9qaSA9IHdvcmtsb2FkLnN1bW1hcnkucmVncmVzc2lvbnMgPiAwID8gJ/Cfn6EnIDogJ/Cfn6InXG5cdFx0bGV0IGFydGlmYWN0VXJsID0gZGF0YS5hcnRpZmFjdFVybHM/LmdldCh3b3JrbG9hZC53b3JrbG9hZClcblxuXHRcdHN1bW1hcnkuYWRkSGVhZGluZyhgJHtzdGF0dXNFbW9qaX0gJHt3b3JrbG9hZC53b3JrbG9hZH1gLCAzKVxuXG5cdFx0aWYgKGFydGlmYWN0VXJsKSB7XG5cdFx0XHRzdW1tYXJ5LmFkZFJhdyhgPHA+PGEgaHJlZj1cIiR7YXJ0aWZhY3RVcmx9XCI+8J+TiiBWaWV3IGRldGFpbGVkIEhUTUwgcmVwb3J0PC9hPjwvcD5gKVxuXHRcdH1cblxuXHRcdC8vIE1ldHJpY3MgdGFibGVcblx0XHRzdW1tYXJ5LmFkZFRhYmxlKFtcblx0XHRcdFtcblx0XHRcdFx0eyBkYXRhOiAnTWV0cmljJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRcdHsgZGF0YTogJ0N1cnJlbnQnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQmFzZWxpbmUnLCBoZWFkZXI6IHRydWUgfSxcblx0XHRcdFx0eyBkYXRhOiAnQ2hhbmdlJywgaGVhZGVyOiB0cnVlIH0sXG5cdFx0XHRdLFxuXHRcdFx0Li4ud29ya2xvYWQubWV0cmljcy5tYXAoKG0pID0+IFtcblx0XHRcdFx0bS5uYW1lLFxuXHRcdFx0XHRmb3JtYXRWYWx1ZShtLmN1cnJlbnQudmFsdWUsIG0ubmFtZSksXG5cdFx0XHRcdG0uYmFzZWxpbmUuYXZhaWxhYmxlID8gZm9ybWF0VmFsdWUobS5iYXNlbGluZS52YWx1ZSwgbS5uYW1lKSA6ICdOL0EnLFxuXHRcdFx0XHRtLmJhc2VsaW5lLmF2YWlsYWJsZSA/IGZvcm1hdENoYW5nZShtLmNoYW5nZS5wZXJjZW50LCBtLmNoYW5nZS5kaXJlY3Rpb24pIDogJ04vQScsXG5cdFx0XHRdKSxcblx0XHRdKVxuXG5cdFx0c3VtbWFyeS5hZGRCcmVhaygpXG5cdH1cblxuXHRhd2FpdCBzdW1tYXJ5LndyaXRlKClcbn1cblxuLyoqXG4gKiBDbGVhciBleGlzdGluZyBzdW1tYXJ5XG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBjbGVhckpvYlN1bW1hcnkoKTogUHJvbWlzZTx2b2lkPiB7XG5cdHN1bW1hcnkuZW1wdHlCdWZmZXIoKVxuXHRhd2FpdCBzdW1tYXJ5LndyaXRlKClcbn1cbiIKICBdLAogICJtYXBwaW5ncyI6ICI7Ozs7Ozs7Ozs7Ozs7QUFPQSx1REFDQSwyQ0FDQTtBQUxBO0FBQ0E7OztBQzJCTyxTQUFTLGlCQUFpQixDQUFDLFNBQTZCO0FBQUEsRUFDOUQsSUFBSSwwQkFBVSxJQUFJLEtBQ2QsUUFBUSxRQUFRLEtBQUssRUFBRSxNQUFNO0FBQUEsQ0FBSTtBQUFBLEVBRXJDLFNBQVMsUUFBUSxPQUFPO0FBQUEsSUFDdkIsSUFBSSxDQUFDLEtBQUssS0FBSztBQUFBLE1BQUc7QUFBQSxJQUVsQixJQUFJO0FBQUEsTUFDSCxJQUFJLFNBQVMsS0FBSyxNQUFNLElBQUk7QUFBQSxNQUM1QixRQUFRLElBQUksT0FBTyxNQUFNLE1BQU07QUFBQSxNQUM5QixNQUFNO0FBQUEsTUFFUDtBQUFBO0FBQUE7QUFBQSxFQUlGLE9BQU87QUFBQTtBQStDUixTQUFTLFVBQVUsQ0FBQyxRQUFrQixHQUFtQjtBQUFBLEVB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QVc7QUFBQTtBQUcvQixTQUFTLFNBQVMsR0FBVztBQUFBLEVBQzVCLE9BQU87QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBO0FBQUE7QUFBQTtBQUFBOzs7QUN6bEJSO0FBY0EsZUFBc0IsZUFBZSxDQUFDLE1BQWtDO0FBQUEsRUFDdkUscUJBQVEsV0FBVyxpQ0FBc0IsQ0FBQyxHQUcxQyxxQkFBUSxPQUFPO0FBQUE7QUFBQSw2QkFFYSxLQUFLO0FBQUE7QUFBQSw4QkFFSixL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VUFBVSx5QkFBeUI7QUFBQSxJQVcxRSxJQVRBLE1BQU0sZ0JBQWdCO0FBQUEsTUFDckIsV0FBVztBQUFBLE1BQ1gsWUFBWTtBQUFBLE1BQ1osYUFBYTtBQUFBLElBQ2QsQ0FBQyxHQUVELGtCQUFLLHFCQUFxQixHQUd0QixVQUFVO0FBQUEsTUFDYixrQkFBSyw4Q0FBbUM7QUFBQSxNQUd4QyxJQUFJLCtCQUFlLElBQUksS0FDbkIsa0JBQWtCLHNCQUFzQix1QkFBUSxLQUFLLFNBQVMsdUJBQVEsS0FBSyxxQkFBcUIsbUJBQW1CLGFBQWE7QUFBQSxNQUVwSSxTQUFTLFFBQVE7QUFBQSxRQUNoQixhQUFhLElBQUksS0FBSyxVQUFVLGVBQWU7QUFBQSxNQUdoRCxJQUFJLGNBQWMsb0JBQW9CO0FBQUEsUUFDckMsV0FBVztBQUFBLFFBQ1g7QUFBQSxRQUNBO0FBQUEsUUFDQSxlQUFlLHNCQUFzQix1QkFBUSxLQUFLLFNBQVMsdUJBQVEsS0FBSyxxQkFBcUI7QUFBQSxNQUM5RixDQUFDLEdBRUcsVUFBVSxNQUFNLHNCQUNuQixPQUNBLHVCQUFRLEtBQUssT0FDYix1QkFBUSxLQUFLLE1BQ2IsVUFDQSxXQUNEO0FBQUEsTUFFQSxrQkFBSyxlQUFlLFFBQVEsS0FBSztBQUFBLE1BRWpDO0FBQUEsd0JBQUssc0RBQXNEO0FBQUEsSUFHNUQsa0JBQUssNkNBQTRDO0FBQUEsSUFDaEQsT0FBTyxPQUFPO0FBQUEsSUFFZixNQURBLHVCQUFVLDZCQUE2QixPQUFPLEtBQUssR0FBRyxHQUNoRDtBQUFBO0FBQUE7QUFJUixLQUFLOyIsCiAgImRlYnVnSWQiOiAiMzU0NjI5NzU0NjZERTE2NTY0NzU2RTIxNjQ3NTZFMjEiLAogICJuYW1lcyI6IFtdCn0=
