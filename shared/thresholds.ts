/**
 * Shared thresholds configuration and evaluation
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { exec } from '@actions/exec'
import { debug, warning } from '@actions/core'

export type MetricDirection = 'lower_is_better' | 'higher_is_better' | 'neutral'
export type Severity = 'success' | 'warning' | 'failure'

export interface AbsoluteCheck {
	severity: Severity
	value: number
	violations: string[]
}

export interface RelativeCheck {
	severity: Severity
	pairedRatio: number
	changePercent: number
	concordance: number
	violations: string[]
}

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

export type ThresholdSeverity = Severity

// ---------------------------------------------------------------------------
// YAML parsing and loading (unchanged)
// ---------------------------------------------------------------------------

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

function mergeThresholdConfigs(
	defaultConfig: ThresholdConfig,
	customConfig: ThresholdConfig
): ThresholdConfig {
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

export async function loadDefaultThresholdConfig(): Promise<ThresholdConfig> {
	debug('Loading default thresholds from GITHUB_ACTION_PATH/deploy/thresholds.yaml')
	let actionRoot = path.resolve(process.env['GITHUB_ACTION_PATH']!)
	let defaultPath = path.join(actionRoot, 'deploy', 'thresholds.yaml')

	if (fs.existsSync(defaultPath)) {
		let content = fs.readFileSync(defaultPath, { encoding: 'utf-8' })
		let config = await parseThresholdsYaml(content)
		if (config) return config
	}

	warning('Could not load default thresholds, using hardcoded defaults')
	return {
		neutral_change_percent: 5.0,
		default: {
			warning_change_percent: 20.0,
			critical_change_percent: 50.0,
		},
	}
}

export async function loadThresholdConfig(
	customYaml?: string,
	customPath?: string
): Promise<ThresholdConfig> {
	let config = await loadDefaultThresholdConfig()

	if (customYaml) {
		debug('Merging custom thresholds from inline YAML')
		let customConfig = await parseThresholdsYaml(customYaml)
		if (customConfig) {
			config = mergeThresholdConfigs(config, customConfig)
		}
	}

	if (customPath && fs.existsSync(customPath)) {
		debug(`Merging custom thresholds from file: ${customPath}`)
		let content = fs.readFileSync(customPath, { encoding: 'utf-8' })
		let customConfig = await parseThresholdsYaml(content)
		if (customConfig) {
			config = mergeThresholdConfigs(config, customConfig)
		}
	}

	return config
}

// ---------------------------------------------------------------------------
// Pattern matching (unchanged)
// ---------------------------------------------------------------------------

function matchPattern(metricName: string, pattern: string): boolean {
	let regexPattern = pattern.replace(/\*/g, '.*').replace(/\?/g, '.')

	let regex = new RegExp(`^${regexPattern}$`, 'i')
	return regex.test(metricName)
}

export function findMatchingThreshold(
	metricName: string,
	config: ThresholdConfig
): MetricThreshold | null {
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

// ---------------------------------------------------------------------------
// New evaluation functions
// ---------------------------------------------------------------------------

export function evaluateAbsoluteThreshold(
	metricName: string,
	currentValue: number,
	direction: MetricDirection,
	config: ThresholdConfig
): AbsoluteCheck {
	let violations: string[] = []
	let threshold = findMatchingThreshold(metricName, config)

	if (!threshold || isNaN(currentValue)) {
		return { severity: 'success', value: currentValue, violations }
	}

	let checkMin = direction !== 'lower_is_better'
	let checkMax = direction !== 'higher_is_better'

	// Critical min
	if (checkMin && threshold.critical_min !== undefined && currentValue < threshold.critical_min) {
		violations.push(`Value ${currentValue.toFixed(2)} < critical min ${threshold.critical_min}`)
	}
	// Critical max
	if (checkMax && threshold.critical_max !== undefined && currentValue > threshold.critical_max) {
		violations.push(`Value ${currentValue.toFixed(2)} > critical max ${threshold.critical_max}`)
	}
	// Warning min
	if (checkMin && threshold.warning_min !== undefined && currentValue < threshold.warning_min) {
		violations.push(`Value ${currentValue.toFixed(2)} < warning min ${threshold.warning_min}`)
	}
	// Warning max
	if (checkMax && threshold.warning_max !== undefined && currentValue > threshold.warning_max) {
		violations.push(`Value ${currentValue.toFixed(2)} > warning max ${threshold.warning_max}`)
	}

	let severity: Severity = 'success'
	if (
		(checkMin &&
			threshold.critical_min !== undefined &&
			currentValue < threshold.critical_min) ||
		(checkMax && threshold.critical_max !== undefined && currentValue > threshold.critical_max)
	) {
		severity = 'failure'
	} else if (violations.length > 0) {
		severity = 'warning'
	}

	return { severity, value: currentValue, violations }
}

export function evaluateRelativeThreshold(
	metricName: string,
	changePercent: number,
	concordance: number,
	direction: MetricDirection,
	config: ThresholdConfig
): RelativeCheck {
	let violations: string[] = []
	let threshold = findMatchingThreshold(metricName, config)

	let warningThreshold =
		threshold?.warning_change_percent ?? config.default.warning_change_percent
	let criticalThreshold =
		threshold?.critical_change_percent ?? config.default.critical_change_percent
	let neutralThreshold = config.neutral_change_percent

	let absChange = Math.abs(changePercent)

	// Determine if the change is in the "worse" direction
	let isWorse = false
	if (direction === 'lower_is_better' && changePercent > 0) isWorse = true
	if (direction === 'higher_is_better' && changePercent < 0) isWorse = true

	// Only flag regressions (worse direction) beyond neutral threshold
	let severity: Severity = 'success'
	if (isWorse && absChange > neutralThreshold) {
		if (absChange >= criticalThreshold) {
			severity = 'failure'
			violations.push(`Regression ${absChange.toFixed(1)}% >= critical ${criticalThreshold}%`)
		} else if (absChange >= warningThreshold) {
			severity = 'warning'
			violations.push(`Regression ${absChange.toFixed(1)}% >= warning ${warningThreshold}%`)
		}
	}

	return {
		severity,
		pairedRatio: 1 + changePercent / 100,
		changePercent,
		concordance,
		violations,
	}
}
