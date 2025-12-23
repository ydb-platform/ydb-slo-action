/**
 * Shared metrics analysis and comparison
 *
 * Copied from report/lib/analysis.ts and adjusted to import from shared/metrics.ts
 */

import { debug } from '@actions/core'
import { getMetricValue, type AggregateFunction, type CollectedMetric } from './metrics.js'

export interface MetricComparison {
	name: string
	type: 'range' | 'instant'
	current: {
		value: number
		available: boolean
		aggregates?: {
			avg: number
			p50: number
			p90: number
			p95: number
		}
	}
	baseline: {
		value: number
		available: boolean
		aggregates?: {
			avg: number
			p50: number
			p90: number
			p95: number
		}
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
		stable: number
		regressions: number
		improvements: number
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
	baselineValue: number,
	metricDirection: 'lower_is_better' | 'higher_is_better' | 'neutral',
	neutralThreshold: number = 5.0
): 'better' | 'worse' | 'neutral' | 'unknown' {
	if (isNaN(currentValue) || isNaN(baselineValue)) {
		return 'unknown'
	}

	let changePercent = Math.abs(((currentValue - baselineValue) / baselineValue) * 100)

	// Consider change below threshold as stable/neutral
	if (changePercent < neutralThreshold) {
		return 'neutral'
	}

	if (metricDirection === 'lower_is_better') {
		return currentValue < baselineValue ? 'better' : 'worse'
	}

	if (metricDirection === 'higher_is_better') {
		return currentValue > baselineValue ? 'better' : 'worse'
	}

	return 'neutral'
}

/**
 * Compare single metric
 */
export function compareMetric(
	metric: CollectedMetric,
	currentRef: string,
	baselineRef: string,
	aggregate: AggregateFunction = 'avg',
	neutralThreshold?: number
): MetricComparison {
	debug(
		`Comparing metric "${metric.name}" of type "${metric.type}" between refs "${currentRef}" and "${baselineRef}" using aggregate "${aggregate}"`
	)
	let currentValue = getMetricValue(metric, currentRef, aggregate)
	let baselineValue = getMetricValue(metric, baselineRef, aggregate)

	let absolute = currentValue - baselineValue
	let percent = isNaN(baselineValue) || baselineValue === 0 ? NaN : (absolute / baselineValue) * 100

	let metricDirection = inferMetricDirection(metric.name)
	let direction = determineChangeDirection(currentValue, baselineValue, metricDirection, neutralThreshold)

	// Calculate multiple aggregates for range metrics
	let currentAggregates: { avg: number; p50: number; p90: number; p95: number } | undefined
	let baselineAggregates: { avg: number; p50: number; p90: number; p95: number } | undefined

	if (metric.type === 'range') {
		currentAggregates = {
			avg: getMetricValue(metric, currentRef, 'avg'),
			p50: getMetricValue(metric, currentRef, 'p50'),
			p90: getMetricValue(metric, currentRef, 'p90'),
			p95: getMetricValue(metric, currentRef, 'p95'),
		}
		baselineAggregates = {
			avg: getMetricValue(metric, baselineRef, 'avg'),
			p50: getMetricValue(metric, baselineRef, 'p50'),
			p90: getMetricValue(metric, baselineRef, 'p90'),
			p95: getMetricValue(metric, baselineRef, 'p95'),
		}
	}

	return {
		name: metric.name,
		type: metric.type,
		current: {
			value: currentValue,
			available: !isNaN(currentValue),
			aggregates: currentAggregates,
		},
		baseline: {
			value: baselineValue,
			available: !isNaN(baselineValue),
			aggregates: baselineAggregates,
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
	metrics: CollectedMetric[],
	currentRef: string,
	baselineRef: string,
	aggregate: AggregateFunction = 'avg',
	neutralThreshold?: number
): WorkloadComparison {
	let comparisons: MetricComparison[] = []

	for (let metric of metrics) {
		let comparison = compareMetric(metric, currentRef, baselineRef, aggregate, neutralThreshold)
		comparisons.push(comparison)
	}

	// Calculate summary
	let stable = comparisons.filter((c) => c.change.direction === 'neutral').length
	let regressions = comparisons.filter((c) => c.change.direction === 'worse').length
	let improvements = comparisons.filter((c) => c.change.direction === 'better').length

	return {
		workload,
		metrics: comparisons,
		summary: {
			total: comparisons.length,
			stable,
			regressions,
			improvements,
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
