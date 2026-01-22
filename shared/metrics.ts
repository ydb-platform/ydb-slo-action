import * as fs from 'node:fs'
import * as path from 'node:path'

import { debug, warning } from '@actions/core'
import { exec } from '@actions/exec'

export type MetricType = 'range' | 'instant'

export interface MetricDefinition {
	name: string
	query: string
	type?: MetricType
	step?: string
	round?: number
}

export interface MetricConfig {
	default: {
		step?: string
		timeout?: string
	}
	metrics: MetricDefinition[]
}

export interface RangeSeries {
	metric: Record<string, string>
	values: [number, string][] // [timestamp (sec), value (float)]
}

export interface InstantSeries {
	metric: Record<string, string>
	value: [number, string] // [timestamp (sec), value (float)]
}

export interface SeparatedSeries {
	current: RangeSeries | InstantSeries | null
	baseline: RangeSeries | InstantSeries | null
}

/**
 * Collected metric from init action (JSONL format)
 */
export type CollectedMetric = {
	name: string
	query: string
	round?: number
} & (
	| {
			type: 'range'
			data: RangeSeries[]
	  }
	| {
			type: 'instant'
			data: InstantSeries[]
	  }
)

/**
 * Parse YAML metrics config using `yq`
 */
export async function parseMetricsYaml(yamlContent: string): Promise<MetricConfig | null> {
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
		let parsed = JSON.parse(json) as MetricConfig

		return parsed
	} catch (error) {
		warning(`Failed to parse metrics YAML: ${String(error)}`)
		return null
	}
}

/**
 * Merge two metric configs (custom extends/overrides default)
 */
function mergeMetricConfigs(defaultConfig: MetricConfig, customConfig: MetricConfig): MetricConfig {
	let mergedByName = new Map<string, MetricDefinition>()

	// Start with defaults
	for (let metric of defaultConfig.metrics || []) {
		mergedByName.set(metric.name, metric)
	}

	// Overlay custom, merging fields so custom can override only what it needs (e.g. `round`)
	for (let metric of customConfig.metrics || []) {
		let base = mergedByName.get(metric.name)
		mergedByName.set(metric.name, base ? { ...base, ...metric } : metric)
	}

	// Preserve order: custom metrics first, then remaining defaults
	let metrics: MetricDefinition[] = []
	let seen = new Set<string>()

	for (let metric of customConfig.metrics || []) {
		let merged = mergedByName.get(metric.name)
		if (!merged) continue
		metrics.push(merged)
		seen.add(metric.name)
	}

	for (let metric of defaultConfig.metrics || []) {
		if (seen.has(metric.name)) continue
		metrics.push(metric)
	}

	// prettier-ignore
	return {
		default: {
			step: customConfig.default?.step ?? defaultConfig.default.step,
			timeout: customConfig.default?.timeout ?? defaultConfig.default.timeout,
		},
		metrics,
	}
}

/**
 * Load default metrics from deploy/metrics.yaml
 */
export async function loadDefaultMetricConfig(): Promise<MetricConfig> {
	debug('Loading default metrics from GITHUB_ACTION_PATH/deploy/metrics.yaml')
	let actionRoot = path.resolve(process.env['GITHUB_ACTION_PATH']!)
	let defaultPath = path.join(actionRoot, 'deploy', 'metrics.yaml')

	if (fs.existsSync(defaultPath)) {
		let content = fs.readFileSync(defaultPath, { encoding: 'utf-8' })
		let config = await parseMetricsYaml(content)
		if (config) return config
	}

	// Fallback to hardcoded defaults
	warning('Could not load default metrics, using hardcoded defaults')
	return {
		default: {
			step: '500ms',
			timeout: '30s',
		},
		metrics: [],
	}
}

/**
 * Load metrics configuration with merging:
 * 1. Load default from deploy/metrics.yaml
 * 2. Merge with custom YAML (inline) if provided
 * 3. Merge with custom file if provided
 */
export async function loadMetricConfig(customYaml?: string, customPath?: string): Promise<MetricConfig> {
	let config = await loadDefaultMetricConfig()

	// Merge with custom YAML (inline)
	if (customYaml) {
		debug('Merging custom metrics from inline YAML')
		let customConfig = await parseMetricsYaml(customYaml)
		if (customConfig) {
			config = mergeMetricConfigs(config, customConfig)
		}
	}

	// Merge with custom file
	if (customPath && fs.existsSync(customPath)) {
		debug(`Merging custom metrics from file: ${customPath}`)
		let content = fs.readFileSync(customPath, { encoding: 'utf-8' })
		let customConfig = await parseMetricsYaml(content)
		if (customConfig) {
			config = mergeMetricConfigs(config, customConfig)
		}
	}

	return config
}

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
	let sorted = [...values].sort((a, b) => a - b)
	let index = Math.ceil(sorted.length * p) - 1
	return sorted[Math.max(0, index)]
}

/**
 * Aggregate function type for range metrics
 */
export type AggregateFunction =
	| 'last'
	| 'first'
	| 'avg'
	| 'min'
	| 'max'
	| 'p50'
	| 'p90'
	| 'p95'
	| 'p99'
	| 'sum'
	| 'count'

/**
 * Aggregate range metric values using specified function
 */
function decimalsFromStep(step: number): number {
	let s = String(step)

	// Handle scientific notation like 1e-6
	let exp = s.match(/e-(\d+)$/i)
	if (exp) return parseInt(exp[1]!, 10)

	let dot = s.indexOf('.')
	if (dot === -1) return 0

	return s.length - dot - 1
}

function roundNumberToStep(value: number, step: number): number {
	if (!Number.isFinite(value)) return value
	if (!Number.isFinite(step) || step <= 0) return value

	// Round to nearest step, then normalize representation to avoid binary float tails.
	let rounded = Math.round(value / step) * step
	let decimals = decimalsFromStep(step)

	if (decimals > 0) {
		rounded = parseFloat(rounded.toFixed(decimals))
	}

	return Object.is(rounded, -0) ? 0 : rounded
}

export function aggregateValues(values: [number, string][], fn: AggregateFunction, roundStep?: number): number {
	if (values.length === 0) return NaN

	let nums = values.map(([_, v]) => parseFloat(v)).filter((n) => !isNaN(n))

	if (nums.length === 0) return NaN

	let result: number
	switch (fn) {
		case 'last':
			result = nums[nums.length - 1]
			break
		case 'first':
			result = nums[0]
			break
		case 'avg':
			result = nums.reduce((a, b) => a + b, 0) / nums.length
			break
		case 'min':
			result = Math.min(...nums)
			break
		case 'max':
			result = Math.max(...nums)
			break
		case 'p50':
			result = percentile(nums, 0.5)
			break
		case 'p90':
			result = percentile(nums, 0.9)
			break
		case 'p95':
			result = percentile(nums, 0.95)
			break
		case 'p99':
			result = percentile(nums, 0.99)
			break
		case 'sum':
			result = nums.reduce((a, b) => a + b, 0)
			break
		case 'count':
			result = nums.length
			break
		default:
			return NaN
	}

	return roundStep !== undefined ? roundNumberToStep(result, roundStep) : result
}

/**
 * Get single value from metric (instant or aggregated range)
 */
export function getMetricValue(metric: CollectedMetric, ref: string, aggregate: AggregateFunction = 'avg'): number {
	let series = metric.data.find((s) => s.metric.ref === ref) || null

	if (!series) return NaN

	if (metric.type === 'instant') {
		let v = parseFloat((series as InstantSeries).value[1])
		return metric.round !== undefined ? roundNumberToStep(v, metric.round) : v
	}

	return aggregateValues((series as RangeSeries).values, aggregate, metric.round)
}

/**
 * Separate series by ref label (current vs baseline)
 */
export function separateByRef(metric: CollectedMetric, currentRef: string, baselineRef: string): SeparatedSeries {
	let current: RangeSeries | InstantSeries | null = null
	let baseline: RangeSeries | InstantSeries | null = null

	current = metric.data.find((s) => s.metric.ref === currentRef) || null
	baseline = metric.data.find((s) => s.metric.ref === baselineRef) || null

	return { current, baseline }
}
