/**
 * Metrics analysis and comparison
 */

import {
	aggregateValues,
	getMetricValue,
	separateByRef,
	type AggregateFunction,
	type CollectedMetric,
	type MetricsMap,
} from './metrics.js'

export interface MetricComparison {
	name: string
	type: 'range' | 'instant'
	current: {
		value: number
		available: boolean
	}
	base: {
		value: number
		available: boolean
	}
	change: {
		absolute: number
		percent: number
		direction: 'better' | 'worse' | 'neutral' | 'unknown'
	}
}

export interface WorkloadComparison {
	workload: string
	metrics: MetricComparison[]
	summary: {
		total: number
		regressions: number
		improvements: number
		stable: number
	}
}

/**
 * Infer metric direction based on name
 */
function inferMetricDirection(name: string): 'lower_is_better' | 'higher_is_better' | 'neutral' {
	let lowerName = name.toLowerCase()

	// Lower is better
	if (
		lowerName.includes('latency') ||
		lowerName.includes('duration') ||
		lowerName.includes('time') ||
		lowerName.includes('delay') ||
		lowerName.includes('error') ||
		lowerName.includes('failure')
	) {
		return 'lower_is_better'
	}

	// Higher is better
	if (
		lowerName.includes('availability') ||
		lowerName.includes('throughput') ||
		lowerName.includes('success') ||
		lowerName.includes('qps') ||
		lowerName.includes('rps') ||
		lowerName.includes('ops')
	) {
		return 'higher_is_better'
	}

	return 'neutral'
}

/**
 * Determine change direction
 */
function determineChangeDirection(
	currentValue: number,
	baseValue: number,
	metricDirection: 'lower_is_better' | 'higher_is_better' | 'neutral'
): 'better' | 'worse' | 'neutral' | 'unknown' {
	if (isNaN(currentValue) || isNaN(baseValue)) {
		return 'unknown'
	}

	let changePercent = Math.abs(((currentValue - baseValue) / baseValue) * 100)

	// Consider < 5% as stable/neutral
	if (changePercent < 5) {
		return 'neutral'
	}

	if (metricDirection === 'lower_is_better') {
		return currentValue < baseValue ? 'better' : 'worse'
	}

	if (metricDirection === 'higher_is_better') {
		return currentValue > baseValue ? 'better' : 'worse'
	}

	return 'neutral'
}

/**
 * Compare single metric
 */
export function compareMetric(metric: CollectedMetric, aggregate: AggregateFunction = 'avg'): MetricComparison {
	let currentValue = getMetricValue(metric, 'current', aggregate)
	let baseValue = getMetricValue(metric, 'base', aggregate)

	let absolute = currentValue - baseValue
	let percent = isNaN(baseValue) || baseValue === 0 ? NaN : (absolute / baseValue) * 100

	let metricDirection = inferMetricDirection(metric.name)
	let direction = determineChangeDirection(currentValue, baseValue, metricDirection)

	return {
		name: metric.name,
		type: metric.type,
		current: {
			value: currentValue,
			available: !isNaN(currentValue),
		},
		base: {
			value: baseValue,
			available: !isNaN(baseValue),
		},
		change: {
			absolute,
			percent,
			direction,
		},
	}
}

/**
 * Compare all metrics in a workload
 */
export function compareWorkloadMetrics(
	workload: string,
	metrics: MetricsMap,
	aggregate: AggregateFunction = 'avg'
): WorkloadComparison {
	let comparisons: MetricComparison[] = []

	for (let [name, metric] of metrics) {
		let comparison = compareMetric(metric, aggregate)
		comparisons.push(comparison)
	}

	// Calculate summary
	let regressions = comparisons.filter((c) => c.change.direction === 'worse').length
	let improvements = comparisons.filter((c) => c.change.direction === 'better').length
	let stable = comparisons.filter((c) => c.change.direction === 'neutral').length

	return {
		workload,
		metrics: comparisons,
		summary: {
			total: comparisons.length,
			regressions,
			improvements,
			stable,
		},
	}
}

/**
 * Format value with unit inference
 */
export function formatValue(value: number, metricName: string): string {
	if (isNaN(value)) return 'N/A'

	let lowerName = metricName.toLowerCase()

	// Latency/duration (ms)
	if (lowerName.includes('latency') || lowerName.includes('duration') || lowerName.endsWith('_ms')) {
		return `${value.toFixed(2)}ms`
	}

	// Time (seconds)
	if (lowerName.includes('time') && lowerName.endsWith('_s')) {
		return `${value.toFixed(2)}s`
	}

	// Percentage
	if (lowerName.includes('availability') || lowerName.includes('percent') || lowerName.includes('rate')) {
		return `${value.toFixed(2)}%`
	}

	// Throughput
	if (
		lowerName.includes('throughput') ||
		lowerName.includes('qps') ||
		lowerName.includes('rps') ||
		lowerName.includes('ops')
	) {
		if (value >= 1000) {
			return `${(value / 1000).toFixed(2)}k/s`
		}
		return `${value.toFixed(0)}/s`
	}

	// Default: 2 decimal places
	return value.toFixed(2)
}

/**
 * Format change percentage
 */
export function formatChange(percent: number, direction: 'better' | 'worse' | 'neutral' | 'unknown'): string {
	if (isNaN(percent)) return 'N/A'

	let sign = percent >= 0 ? '+' : ''
	let emoji = direction === 'better' ? '🟢' : direction === 'worse' ? '🔴' : direction === 'neutral' ? '⚪' : '❓'

	return `${sign}${percent.toFixed(1)}% ${emoji}`
}
