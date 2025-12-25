import {
  __toESM,
  require_core,
  require_exec
} from "./main-h98689qs.js";

// shared/metrics.ts
var import_core = __toESM(require_core(), 1), import_exec = __toESM(require_exec(), 1);
import * as fs from "node:fs";
import * as path from "node:path";
async function parseMetricsYaml(yamlContent) {
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
    return import_core.warning(`Failed to parse metrics YAML: ${String(error)}`), null;
  }
}
function mergeMetricConfigs(defaultConfig, customConfig) {
  return {
    default: {
      step: customConfig.default?.step ?? defaultConfig.default.step,
      timeout: customConfig.default?.timeout ?? defaultConfig.default.timeout
    },
    metrics: [...customConfig.metrics || [], ...defaultConfig.metrics || []]
  };
}
async function loadDefaultMetricConfig() {
  import_core.debug("Loading default metrics from GITHUB_ACTION_PATH/deploy/metrics.yaml");
  let actionRoot = path.resolve(process.env.GITHUB_ACTION_PATH), defaultPath = path.join(actionRoot, "deploy", "metrics.yaml");
  if (fs.existsSync(defaultPath)) {
    let content = fs.readFileSync(defaultPath, { encoding: "utf-8" }), config = await parseMetricsYaml(content);
    if (config)
      return config;
  }
  return import_core.warning("Could not load default metrics, using hardcoded defaults"), {
    default: {
      step: "500ms",
      timeout: "30s"
    },
    metrics: []
  };
}
async function loadMetricConfig(customYaml, customPath) {
  let config = await loadDefaultMetricConfig();
  if (customYaml) {
    import_core.debug("Merging custom metrics from inline YAML");
    let customConfig = await parseMetricsYaml(customYaml);
    if (customConfig)
      config = mergeMetricConfigs(config, customConfig);
  }
  if (customPath && fs.existsSync(customPath)) {
    import_core.debug(`Merging custom metrics from file: ${customPath}`);
    let content = fs.readFileSync(customPath, { encoding: "utf-8" }), customConfig = await parseMetricsYaml(content);
    if (customConfig)
      config = mergeMetricConfigs(config, customConfig);
  }
  return config;
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
  let series = metric.data.find((s) => s.metric.ref === ref) || null;
  if (!series)
    return NaN;
  if (metric.type === "instant")
    return parseFloat(series.value[1]);
  return aggregateValues(series.values, aggregate);
}

// shared/analysis.ts
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
  let currentValue = getMetricValue(metric, currentRef, aggregate), baselineValue = getMetricValue(metric, baselineRef, aggregate), absolute = currentValue - baselineValue, percent = isNaN(baselineValue) || baselineValue === 0 ? NaN : absolute / baselineValue * 100, metricDirection = inferMetricDirection(metric.name), direction = determineChangeDirection(currentValue, baselineValue, metricDirection, neutralThreshold), currentAggregates, baselineAggregates;
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
      value: baselineValue,
      available: !isNaN(baselineValue),
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
  for (let metric of metrics) {
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

export { loadMetricConfig, compareWorkloadMetrics, formatValue, formatChange };
