import {
  debug,
  exec,
  warning
} from "./main-st7zz2z8.js";

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
function evaluateThreshold(comparison, config) {
  let threshold = findMatchingThreshold(comparison.name, config), severity = "success", reason;
  if (threshold) {
    if (threshold.critical_min !== void 0 && comparison.current.value < threshold.critical_min)
      debug(`${comparison.name}: below critical_min (${comparison.current.value} < ${threshold.critical_min})`), severity = "failure", reason = `Value ${comparison.current.value.toFixed(2)} < critical min ${threshold.critical_min}`;
    else if (threshold.critical_max !== void 0 && comparison.current.value > threshold.critical_max)
      debug(`${comparison.name}: above critical_max (${comparison.current.value} > ${threshold.critical_max})`), severity = "failure", reason = `Value ${comparison.current.value.toFixed(2)} > critical max ${threshold.critical_max}`;
    else if (threshold.warning_min !== void 0 && comparison.current.value < threshold.warning_min)
      debug(`${comparison.name}: below warning_min (${comparison.current.value} < ${threshold.warning_min})`), severity = "warning", reason = `Value ${comparison.current.value.toFixed(2)} < warning min ${threshold.warning_min}`;
    else if (threshold.warning_max !== void 0 && comparison.current.value > threshold.warning_max)
      debug(`${comparison.name}: above warning_max (${comparison.current.value} > ${threshold.warning_max})`), severity = "warning", reason = `Value ${comparison.current.value.toFixed(2)} > warning max ${threshold.warning_max}`;
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

export { loadThresholdConfig, evaluateWorkloadThresholds };
