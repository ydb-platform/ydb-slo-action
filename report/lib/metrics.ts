/**
 * Metrics parsing and types for report action
 */

export interface Series {
	metric: Record<string, string>
	values: [number, string][] // [timestamp (sec), value (float)]
}

export interface InstantSeries {
	metric: Record<string, string>
	value: [number, string] // [timestamp (sec), value (float)]
}

/**
 * Collected metric from init action (JSONL format)
 */
export interface CollectedMetric {
	name: string
	query: string
	type: 'range' | 'instant'
	data: Series[] | InstantSeries[]
}

/**
 * Parsed metrics by name
 */
export type MetricsMap = Map<string, CollectedMetric>

/**
 * Parse JSONL metrics file into MetricsMap
 */
export function parseMetricsJsonl(content: string): MetricsMap {
	let metrics = new Map<string, CollectedMetric>()
	let lines = content.trim().split('\n')

	for (let line of lines) {
		if (!line.trim()) continue

		try {
			let metric = JSON.parse(line) as CollectedMetric
			metrics.set(metric.name, metric)
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return metrics
}

/**
 * Separate series by ref label (current vs base)
 */
export interface SeparatedSeries {
	current: Series | InstantSeries | null
	base: Series | InstantSeries | null
}

export function separateByRef(metric: CollectedMetric): SeparatedSeries {
	let current: Series | InstantSeries | null = null
	let base: Series | InstantSeries | null = null

	if (metric.type === 'instant') {
		let data = metric.data as InstantSeries[]
		current = data.find((s) => s.metric.ref === 'current') || null
		base = data.find((s) => s.metric.ref === 'base') || null
	} else {
		let data = metric.data as Series[]
		current = data.find((s) => s.metric.ref === 'current') || null
		base = data.find((s) => s.metric.ref === 'base') || null
	}

	return { current, base }
}

/**
 * Aggregate function type for range metrics
 */
export type AggregateFunction = 'last' | 'first' | 'avg' | 'min' | 'max' | 'p50' | 'p95' | 'p99' | 'sum' | 'count'

/**
 * Calculate percentile
 */
function percentile(values: number[], p: number): number {
	let sorted = [...values].sort((a, b) => a - b)
	let index = Math.ceil(sorted.length * p) - 1
	return sorted[Math.max(0, index)]
}

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
export function getMetricValue(
	metric: CollectedMetric,
	ref: 'current' | 'base',
	aggregate: AggregateFunction = 'avg'
): number {
	let separated = separateByRef(metric)
	let series = ref === 'current' ? separated.current : separated.base

	if (!series) return NaN

	if (metric.type === 'instant') {
		let instantSeries = series as InstantSeries
		return parseFloat(instantSeries.value[1])
	} else {
		let rangeSeries = series as Series
		return aggregateValues(rangeSeries.values, aggregate)
	}
}
