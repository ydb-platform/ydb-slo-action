/**
 * Shared thresholds configuration and evaluation
 *
 * This module was copied from report/lib/thresholds.ts and adapted to live
 * under shared/lib so both `init` and `report` can import it.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { exec } from '@actions/exec'
import { debug, warning } from '@actions/core'

import type { MetricComparison } from './analysis.js'

export interface MetricThreshold {
	name?: string // Exact metric name (higher priority than pattern)
	pattern?: string // Glob pattern (lower priority)
	direction?: 'lower_is_better' | 'higher_is_better' | 'neutral'
	warning_min?: number
	critical_min?: number
	warning_max?: number
	critical_max?: number
	warning_change_percent?: number
	critical_change_percent?: number
}

export interface ThresholdConfig {
	neutral_change_percent: number
	default: {
		warning_change_percent: number
		critical_change_percent: number
	}
	metrics?: MetricThreshold[]
}

export type ThresholdSeverity = 'success' | 'warning' | 'failure'

export type EvaluatedThreshold = {
	metric_name: string
	threshold_name?: string
	threshold_pattern?: string
	threshold_severity: ThresholdSeverity
	reason?: string
}

/**
 * Parse YAML thresholds config using `yq`
 */
async function parseThresholdsYaml(yamlContent: string): Promise<ThresholdConfig | null> {
	if (!yamlContent || yamlContent.trim() === '') {
		return null
	}

	try {
		let chunks: string[] = []

		await exec('yq', ['-o=json', '.'], {
			input: Buffer.from(yamlContent, 'utf-8'),
			silent: true,
			listeners: {
				stdout: (data) => chunks.push(data.toString()),
			},
		})

		let json = chunks.join('')
		let parsed = JSON.parse(json) as ThresholdConfig

		return parsed
	} catch (error) {
		warning(`Failed to parse thresholds YAML: ${String(error)}`)
		return null
	}
}

/**
 * Merge two threshold configs (custom extends/overrides default)
 */
function mergeThresholdConfigs(defaultConfig: ThresholdConfig, customConfig: ThresholdConfig): ThresholdConfig {
	// prettier-ignore
	return {
		neutral_change_percent: customConfig.neutral_change_percent ?? defaultConfig.neutral_change_percent,
		default: {
			warning_change_percent: customConfig.default?.warning_change_percent ?? defaultConfig.default.warning_change_percent,
			critical_change_percent: customConfig.default?.critical_change_percent ?? defaultConfig.default.critical_change_percent,
		},
		metrics: [...(customConfig.metrics || []), ...(defaultConfig.metrics || [])],
	}
}

/**
 * Load default thresholds from deploy/thresholds.yaml
 */
export async function loadDefaultThresholdConfig(): Promise<ThresholdConfig> {
	debug('Loading default thresholds from GITHUB_ACTION_PATH/deploy/thresholds.yaml')
	let actionRoot = path.resolve(process.env['GITHUB_ACTION_PATH']!)
	let defaultPath = path.join(actionRoot, 'deploy', 'thresholds.yaml')

	if (fs.existsSync(defaultPath)) {
		let content = fs.readFileSync(defaultPath, { encoding: 'utf-8' })
		let config = await parseThresholdsYaml(content)
		if (config) return config
	}

	// Fallback to hardcoded defaults
	warning('Could not load default thresholds, using hardcoded defaults')
	return {
		neutral_change_percent: 5.0,
		default: {
			warning_change_percent: 20.0,
			critical_change_percent: 50.0,
		},
	}
}

/**
 * Load thresholds configuration with merging:
 * 1. Load default from deploy/thresholds.yaml
 * 2. Merge with custom YAML (inline) if provided
 * 3. Merge with custom file if provided
 */
export async function loadThresholdConfig(customYaml?: string, customPath?: string): Promise<ThresholdConfig> {
	let config = await loadDefaultThresholdConfig()

	// Merge with custom YAML (inline)
	if (customYaml) {
		debug('Merging custom thresholds from inline YAML')
		let customConfig = await parseThresholdsYaml(customYaml)
		if (customConfig) {
			config = mergeThresholdConfigs(config, customConfig)
		}
	}

	// Merge with custom file
	if (customPath && fs.existsSync(customPath)) {
		debug(`Merging custom thresholds from file: ${customPath}`)
		let content = fs.readFileSync(customPath, { encoding: 'utf-8' })
		let customConfig = await parseThresholdsYaml(content)
		if (customConfig) {
			config = mergeThresholdConfigs(config, customConfig)
		}
	}

	debug(`Loaded thresholds config: ${JSON.stringify(config, null, 2)}`)
	return config
}

/**
 * Match metric name against pattern (supports wildcards)
 */
function matchPattern(metricName: string, pattern: string): boolean {
	// Convert glob pattern to regex
	let regexPattern = pattern
		.replace(/\*/g, '.*') // * -> .*
		.replace(/\?/g, '.') // ? -> .

	let regex = new RegExp(`^${regexPattern}$`, 'i')
	return regex.test(metricName)
}

/**
 * Find matching threshold for metric (exact match first, then pattern)
 */
function findMatchingThreshold(metricName: string, config: ThresholdConfig): MetricThreshold | null {
	if (!config.metrics) return null

	// First pass: exact match (highest priority)
	for (let threshold of config.metrics) {
		if (threshold.name && threshold.name === metricName) {
			return threshold
		}
	}

	// Second pass: pattern match
	for (let threshold of config.metrics) {
		if (threshold.pattern && matchPattern(metricName, threshold.pattern)) {
			return threshold
		}
	}

	return null
}

/**
 * Evaluate threshold for a metric comparison
 */
export function evaluateThreshold(comparison: MetricComparison, config: ThresholdConfig): EvaluatedThreshold {
	let threshold = findMatchingThreshold(comparison.name, config)
	let severity: ThresholdSeverity = 'success'
	let reason: string | undefined

	// Check absolute value thresholds first
	if (threshold) {
		// Check critical_min
		if (threshold.critical_min !== undefined && comparison.current.value < threshold.critical_min) {
			debug(`${comparison.name}: below critical_min (${comparison.current.value} < ${threshold.critical_min})`)
			severity = 'failure'
			reason = `Value ${comparison.current.value.toFixed(2)} < critical min ${threshold.critical_min}`
		}
		// Check critical_max
		else if (threshold.critical_max !== undefined && comparison.current.value > threshold.critical_max) {
			debug(`${comparison.name}: above critical_max (${comparison.current.value} > ${threshold.critical_max})`)
			severity = 'failure'
			reason = `Value ${comparison.current.value.toFixed(2)} > critical max ${threshold.critical_max}`
		}
		// Check warning_min
		else if (threshold.warning_min !== undefined && comparison.current.value < threshold.warning_min) {
			debug(`${comparison.name}: below warning_min (${comparison.current.value} < ${threshold.warning_min})`)
			severity = 'warning'
			reason = `Value ${comparison.current.value.toFixed(2)} < warning min ${threshold.warning_min}`
		}
		// Check warning_max
		else if (threshold.warning_max !== undefined && comparison.current.value > threshold.warning_max) {
			debug(`${comparison.name}: above warning_max (${comparison.current.value} > ${threshold.warning_max})`)
			severity = 'warning'
			reason = `Value ${comparison.current.value.toFixed(2)} > warning max ${threshold.warning_max}`
		}
	}

	// Check change percent thresholds
	if (!isNaN(comparison.change.percent)) {
		let changePercent = Math.abs(comparison.change.percent)

		// Use metric-specific or default thresholds
		let warningThreshold = threshold?.warning_change_percent ?? config.default.warning_change_percent
		let criticalThreshold = threshold?.critical_change_percent ?? config.default.critical_change_percent

		// Only trigger if change is in "worse" direction
		if (comparison.change.direction === 'worse') {
			if (severity !== 'failure') {
				if (changePercent > criticalThreshold) {
					severity = 'failure'
					reason = `Regression ${changePercent.toFixed(2)}% > critical ${criticalThreshold}%`
				} else if (severity !== 'warning' && changePercent > warningThreshold) {
					severity = 'warning'
					reason = `Regression ${changePercent.toFixed(2)}% > warning ${warningThreshold}%`
				}
			}
		}
	}

	return {
		metric_name: comparison.name,
		threshold_name: threshold?.name,
		threshold_pattern: threshold?.pattern,
		threshold_severity: severity,
		reason,
	}
}

/**
 * Evaluate all metrics and return overall severity
 */
export function evaluateWorkloadThresholds(
	comparisons: MetricComparison[],
	config: ThresholdConfig
): {
	overall: ThresholdSeverity
	failures: (MetricComparison & { reason?: string })[]
	warnings: (MetricComparison & { reason?: string })[]
} {
	let failures: (MetricComparison & { reason?: string })[] = []
	let warnings: (MetricComparison & { reason?: string })[] = []

	for (let comparison of comparisons) {
		let severity = evaluateThreshold(comparison, config)

		if (severity.threshold_severity === 'failure') {
			failures.push({ ...comparison, reason: severity.reason })
		} else if (severity.threshold_severity === 'warning') {
			warnings.push({ ...comparison, reason: severity.reason })
		}
	}

	let overall: ThresholdSeverity = 'success'
	if (failures.length > 0) {
		overall = 'failure'
	} else if (warnings.length > 0) {
		overall = 'warning'
	}

	return { overall, failures, warnings }
}
