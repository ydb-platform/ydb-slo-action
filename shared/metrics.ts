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
	// prettier-ignore
	return {
		default: {
			step: customConfig.default?.step ?? defaultConfig.default.step,
			timeout: customConfig.default?.timeout ?? defaultConfig.default.timeout,
		},
		metrics: [...(customConfig.metrics || []), ...(defaultConfig.metrics || [])],
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
export function aggregateValues(values: [number, string][], fn: AggregateFunction): number {
	if (values.length === 0) return NaN

	let nums = values.map(([_, v]) => parseFloat(v)).filter((n) => !isNaN(n))

	if (nums.length === 0) return NaN

	switch (fn) {
		case 'last':
			return nums[nums.length - 1]
		case 'first':
			return nums[0]
		case 'avg':
			return nums.reduce((a, b) => a + b, 0) / nums.length
		case 'min':
			return Math.min(...nums)
		case 'max':
			return Math.max(...nums)
		case 'p50':
			return percentile(nums, 0.5)
		case 'p90':
			return percentile(nums, 0.9)
		case 'p95':
			return percentile(nums, 0.95)
		case 'p99':
			return percentile(nums, 0.99)
		case 'sum':
			return nums.reduce((a, b) => a + b, 0)
		case 'count':
			return nums.length
		default:
			return NaN
	}
}

/**
 * Get single value from metric (instant or aggregated range)
 */
export function getMetricValue(metric: CollectedMetric, ref: string, aggregate: AggregateFunction = 'avg'): number {
	let series = metric.data.find((s) => s.metric.ref === ref) || null

	if (!series) return NaN

	if (metric.type === 'instant') {
		return parseFloat((series as InstantSeries).value[1])
	}

	return aggregateValues((series as RangeSeries).values, aggregate)
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
