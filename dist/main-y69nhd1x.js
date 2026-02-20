import {
  debug,
  exec,
  warning
} from "./main-qx9yp3g6.js";

// shared/thresholds.ts
import * as fs from "node:fs";
import * as path from "node:path";
async function parseThresholdsYaml(yamlContent) {
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
    return warning(`Failed to parse thresholds YAML: ${String(error)}`), null;
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
  debug("Loading default thresholds from GITHUB_ACTION_PATH/deploy/thresholds.yaml");
  let actionRoot = path.resolve(process.env.GITHUB_ACTION_PATH), defaultPath = path.join(actionRoot, "deploy", "thresholds.yaml");
  if (fs.existsSync(defaultPath)) {
    let content = fs.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseThresholdsYaml(content);
    if (config)
      return config;
  }
  return warning("Could not load default thresholds, using hardcoded defaults"), {
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
    debug("Merging custom thresholds from inline YAML");
    let customConfig = await parseThresholdsYaml(customYaml);
    if (customConfig)
      config = mergeThresholdConfigs(config, customConfig);
  }
  if (customPath && fs.existsSync(customPath)) {
    debug(`Merging custom thresholds from file: ${customPath}`);
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
function evaluateAbsoluteThreshold(metricName, currentValue, direction, config) {
  let violations = [], threshold = findMatchingThreshold(metricName, config);
  if (!threshold || isNaN(currentValue))
    return { severity: "success", value: currentValue, violations };
  let checkMin = direction !== "lower_is_better", checkMax = direction !== "higher_is_better";
  if (checkMin && threshold.critical_min !== void 0 && currentValue < threshold.critical_min)
    violations.push(`Value ${currentValue.toFixed(2)} < critical min ${threshold.critical_min}`);
  if (checkMax && threshold.critical_max !== void 0 && currentValue > threshold.critical_max)
    violations.push(`Value ${currentValue.toFixed(2)} > critical max ${threshold.critical_max}`);
  if (checkMin && threshold.warning_min !== void 0 && currentValue < threshold.warning_min)
    violations.push(`Value ${currentValue.toFixed(2)} < warning min ${threshold.warning_min}`);
  if (checkMax && threshold.warning_max !== void 0 && currentValue > threshold.warning_max)
    violations.push(`Value ${currentValue.toFixed(2)} > warning max ${threshold.warning_max}`);
  let severity = "success";
  if (checkMin && threshold.critical_min !== void 0 && currentValue < threshold.critical_min || checkMax && threshold.critical_max !== void 0 && currentValue > threshold.critical_max)
    severity = "failure";
  else if (violations.length > 0)
    severity = "warning";
  return { severity, value: currentValue, violations };
}
function evaluateRelativeThreshold(metricName, changePercent, concordance, direction, config) {
  let violations = [], threshold = findMatchingThreshold(metricName, config), warningThreshold = threshold?.warning_change_percent ?? config.default.warning_change_percent, criticalThreshold = threshold?.critical_change_percent ?? config.default.critical_change_percent, neutralThreshold = config.neutral_change_percent, absChange = Math.abs(changePercent), isWorse = !1;
  if (direction === "lower_is_better" && changePercent > 0)
    isWorse = !0;
  if (direction === "higher_is_better" && changePercent < 0)
    isWorse = !0;
  let severity = "success";
  if (isWorse && absChange > neutralThreshold) {
    if (absChange >= criticalThreshold)
      severity = "failure", violations.push(`Regression ${absChange.toFixed(1)}% >= critical ${criticalThreshold}%`);
    else if (absChange >= warningThreshold)
      severity = "warning", violations.push(`Regression ${absChange.toFixed(1)}% >= warning ${warningThreshold}%`);
  }
  return {
    severity,
    pairedRatio: 1 + changePercent / 100,
    changePercent,
    concordance,
    violations
  };
}

// shared/stats.ts
function percentile(sorted, p) {
  if (sorted.length === 0)
    return NaN;
  let index = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, index)];
}
function trimmedMean(values, trimFraction = 0.1) {
  if (values.length === 0)
    return NaN;
  let sorted = [...values].sort((a, b) => a - b), trimCount = Math.floor(sorted.length * trimFraction);
  if (sorted.length - 2 * trimCount <= 0)
    return sorted.reduce((a, b) => a + b, 0) / sorted.length;
  let trimmed = sorted.slice(trimCount, sorted.length - trimCount);
  return trimmed.reduce((a, b) => a + b, 0) / trimmed.length;
}
function ema(values, alpha = 0.15) {
  if (values.length === 0)
    return [];
  let result = [values[0]];
  for (let i = 1;i < values.length; i++)
    result.push(alpha * values[i] + (1 - alpha) * result[i - 1]);
  return result;
}
function histogram(values, targetBuckets = 20, forceMin, forceMax) {
  if (values.length === 0)
    return { edges: [], counts: [] };
  let min = forceMin ?? Math.min(...values), max = forceMax ?? Math.max(...values);
  if (min === max)
    return { edges: [min, min + 1], counts: [values.length] };
  let bucketWidth = (max - min) / targetBuckets, edges = [];
  for (let i = 0;i <= targetBuckets; i++)
    edges.push(min + i * bucketWidth);
  let counts = Array(targetBuckets).fill(0);
  for (let v of values) {
    let idx = Math.min(Math.floor((v - min) / bucketWidth), targetBuckets - 1);
    counts[idx]++;
  }
  return { edges, counts };
}
function fiveNumberSummary(values) {
  if (values.length === 0)
    return [NaN, NaN, NaN, NaN, NaN];
  let sorted = [...values].sort((a, b) => a - b);
  return [
    sorted[0],
    percentile(sorted, 0.25),
    percentile(sorted, 0.5),
    percentile(sorted, 0.75),
    sorted[sorted.length - 1]
  ];
}

// shared/analysis.ts
function inferDirection(name) {
  let lower = name.toLowerCase();
  if (lower.includes("latency") || lower.includes("duration") || lower.includes("time") || lower.includes("delay") || lower.includes("error") || lower.includes("failure") || lower.includes("attempts"))
    return "lower_is_better";
  if (lower.includes("availability") || lower.includes("throughput") || lower.includes("success") || lower.includes("qps") || lower.includes("rps") || lower.includes("ops"))
    return "higher_is_better";
  return "neutral";
}
function alignSeries(current, baseline) {
  let baselineMap = /* @__PURE__ */ new Map;
  for (let [ts, val] of baseline.values)
    baselineMap.set(ts, parseFloat(val));
  let aligned = [];
  for (let [ts, val] of current.values) {
    let bv = baselineMap.get(ts);
    if (bv === void 0)
      continue;
    let cv = parseFloat(val);
    if (isNaN(cv) || isNaN(bv))
      continue;
    let ratio = bv !== 0 ? cv / bv : NaN, deltaPercent = bv !== 0 ? (cv - bv) / bv * 100 : NaN;
    aligned.push({ timestamp: ts, current: cv, baseline: bv, ratio, deltaPercent });
  }
  return aligned;
}
function computePairedRatio(aligned, trimFraction = 0.1) {
  let ratios = aligned.map((p) => p.ratio).filter((r) => isFinite(r));
  return trimmedMean(ratios, trimFraction);
}
function computeConcordance(aligned, direction) {
  if (aligned.length === 0)
    return 0;
  let worseCount = 0;
  for (let p of aligned)
    if (direction === "lower_is_better" && p.current > p.baseline)
      worseCount++;
    else if (direction === "higher_is_better" && p.current < p.baseline)
      worseCount++;
  return worseCount / aligned.length;
}
function buildRefSummary(values, trimFraction) {
  if (values.length === 0)
    return { trimmedMean: NaN, mean: NaN, median: NaN, p95: NaN, p99: NaN, count: 0 };
  let sorted = [...values].sort((a, b) => a - b);
  return {
    trimmedMean: trimmedMean(values, trimFraction),
    mean: values.reduce((a, b) => a + b, 0) / values.length,
    median: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    p99: percentile(sorted, 0.99),
    count: values.length
  };
}
function buildVisualization(aligned, currentVals, baselineVals, emaAlpha = 0.15) {
  let histMin = Math.min(Math.min(...currentVals), Math.min(...baselineVals)), histMax = Math.max(Math.max(...currentVals), Math.max(...baselineVals));
  return {
    aligned,
    emaCurrent: ema(currentVals, emaAlpha),
    emaBaseline: ema(baselineVals, emaAlpha),
    currentHistogram: histogram(currentVals, 20, histMin, histMax),
    baselineHistogram: histogram(baselineVals, 20, histMin, histMax),
    currentBox: fiveNumberSummary(currentVals),
    baselineBox: fiveNumberSummary(baselineVals)
  };
}
function worstSeverity(...severities) {
  if (severities.some((s) => s === "failure"))
    return "failure";
  if (severities.some((s) => s === "warning"))
    return "warning";
  return "success";
}
function extractValues(metric, ref) {
  let series = metric.data.find((s) => s.metric.ref === ref);
  if (!series)
    return [];
  if (metric.type === "instant") {
    let v = parseFloat(series.value[1]);
    return isNaN(v) ? [] : [v];
  }
  return series.values.map(([_, v]) => parseFloat(v)).filter((n) => !isNaN(n));
}
function resolveRelativeThresholds(metricName, config) {
  let matched = findMatchingThreshold(metricName, config);
  return {
    warningChangePercent: matched?.warning_change_percent ?? config.default.warning_change_percent,
    criticalChangePercent: matched?.critical_change_percent ?? config.default.critical_change_percent,
    neutralChangePercent: config.neutral_change_percent
  };
}
function analyzeMetric(metric, currentRef, baselineRef, options = {}) {
  let { trimPercent = 0.1, emaAlpha = 0.15, thresholdConfig } = options, direction = inferDirection(metric.name), currentVals = extractValues(metric, currentRef), baselineVals = extractValues(metric, baselineRef), current = buildRefSummary(currentVals, trimPercent), baseline = buildRefSummary(baselineVals, trimPercent), absoluteCheck = { severity: "success", value: current.trimmedMean, violations: [] }, absoluteThresholds;
  if (thresholdConfig) {
    absoluteCheck = evaluateAbsoluteThreshold(metric.name, current.trimmedMean, direction, thresholdConfig);
    let matched = findMatchingThreshold(metric.name, thresholdConfig);
    if (matched) {
      let t = {};
      if (matched.warning_min != null)
        t.warningMin = matched.warning_min;
      if (matched.critical_min != null)
        t.criticalMin = matched.critical_min;
      if (matched.warning_max != null)
        t.warningMax = matched.warning_max;
      if (matched.critical_max != null)
        t.criticalMax = matched.critical_max;
      if (Object.keys(t).length > 0)
        absoluteThresholds = t;
    }
  }
  let relativeCheck, visualization, forestEntry;
  if (metric.type === "range" && currentVals.length > 0 && baselineVals.length > 0) {
    let currentSeries = metric.data.find((s) => s.metric.ref === currentRef), baselineSeries = metric.data.find((s) => s.metric.ref === baselineRef);
    if (currentSeries && baselineSeries) {
      let aligned = alignSeries(currentSeries, baselineSeries);
      if (aligned.length > 0) {
        let pairedRatio = computePairedRatio(aligned, trimPercent), changePercent = (pairedRatio - 1) * 100, concordance = computeConcordance(aligned, direction), relSeverity = "success", violations = [];
        if (thresholdConfig) {
          let check = evaluateRelativeThreshold(metric.name, changePercent, concordance, direction, thresholdConfig);
          relSeverity = check.severity, violations = check.violations;
        }
        relativeCheck = { severity: relSeverity, pairedRatio, changePercent, concordance, violations };
        let sortedRatios = [...aligned.map((p) => p.ratio).filter((r) => isFinite(r))].sort((a, b) => a - b);
        forestEntry = {
          name: metric.name,
          changePercent,
          concordance,
          iqrLow: (percentile(sortedRatios, 0.25) - 1) * 100,
          iqrHigh: (percentile(sortedRatios, 0.75) - 1) * 100,
          severity: relSeverity
        };
      }
      visualization = buildVisualization(aligned, currentVals, baselineVals, emaAlpha);
    }
  }
  let severity = worstSeverity(absoluteCheck.severity, relativeCheck?.severity);
  return {
    name: metric.name,
    title: metric.title,
    unit: metric.unit,
    direction,
    type: metric.type,
    current,
    baseline,
    absoluteCheck,
    absoluteThresholds,
    relativeCheck,
    relativeThresholds: thresholdConfig ? resolveRelativeThresholds(metric.name, thresholdConfig) : void 0,
    severity,
    visualization,
    _forestEntry: forestEntry
  };
}
function analyzeWorkload(workload, metrics, currentRef, baselineRef, options = {}) {
  let analyses = [];
  for (let metric of metrics) {
    let analysis = analyzeMetric(metric, currentRef, baselineRef, options);
    analyses.push(analysis);
  }
  let attemptsPairs = [
    ["read_attempts", "read_throughput"],
    ["write_attempts", "write_throughput"]
  ];
  for (let [attemptsName, throughputName] of attemptsPairs) {
    let attemptsMetric = analyses.find((a) => a.name === attemptsName), throughputMetric = analyses.find((a) => a.name === throughputName);
    if (attemptsMetric && throughputMetric) {
      let currentAttempts = attemptsMetric.current.trimmedMean, baselineAttempts = attemptsMetric.baseline.trimmedMean, currentThroughput = throughputMetric.current.trimmedMean, retryRate = currentThroughput > 0 ? currentAttempts / currentThroughput : 0, retriesSeverity = "success", reason;
      if (baselineAttempts === 0 && currentAttempts > 0)
        retriesSeverity = "warning", reason = "Retries appeared (baseline had none)";
      if (retryRate > 0.01)
        retriesSeverity = "failure", reason = `Retry rate ${(retryRate * 100).toFixed(2)}% > 1%`;
      attemptsMetric.retriesCheck = {
        severity: retriesSeverity,
        currentTotal: currentAttempts,
        baselineTotal: baselineAttempts,
        retryRate,
        reason
      }, attemptsMetric.severity = worstSeverity(attemptsMetric.severity, retriesSeverity);
    }
  }
  let forestPlot = [], cleanAnalyses = [];
  for (let a of analyses) {
    if (a._forestEntry)
      forestPlot.push(a._forestEntry);
    let { _forestEntry, ...clean } = a;
    cleanAnalyses.push(clean);
  }
  let success = cleanAnalyses.filter((a) => a.severity === "success").length, warnings = cleanAnalyses.filter((a) => a.severity === "warning").length, failures = cleanAnalyses.filter((a) => a.severity === "failure").length, overallSeverity = worstSeverity(...cleanAnalyses.map((a) => a.severity));
  return {
    workload,
    metrics: cleanAnalyses,
    forestPlot,
    severity: overallSeverity,
    summary: { total: cleanAnalyses.length, success, warnings, failures }
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

export { loadThresholdConfig, analyzeWorkload, formatValue };
