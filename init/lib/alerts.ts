import { debug } from '@actions/core'
import type { CollectedAlert } from '../../shared/alerts.js'
import { queryRange, safeStep, type PrometheusRangeValue } from './prometheus.js'

/**
 * Collect alerts from Prometheus ALERTS metric.
 *
 * Queries the ALERTS{alertstate="firing"} metric and converts
 * time series data into alert intervals with start/end times.
 */
export async function collectAlertsFromPrometheus(
	url: string,
	start: Date,
	end: Date,
	preferredStepSeconds: number = 15
): Promise<CollectedAlert[]> {
	const query = 'ALERTS{alertstate="firing"}'
	const step = safeStep(start, end, preferredStepSeconds)

	debug(`Querying alerts: ${query} (step=${step})`)

	const response = await queryRange({
		url,
		query,
		start: start.getTime() / 1000,
		end: end.getTime() / 1000,
		step,
	})

	if (response.status !== 'success' || !response.data) {
		debug(`No alerts data: ${response.error || 'empty response'}`)
		return []
	}

	const alerts = parseAlertsFromRange(response.data.result, step)

	debug(`Collected ${alerts.length} alerts`)

	return alerts
}

/**
 * Parse Prometheus range result into alerts.
 *
 * Converts time series where value=1 into alerts with epoch_ms and duration_ms.
 * Consecutive points with value=1 are merged into single alerts.
 */
export function parseAlertsFromRange(results: PrometheusRangeValue[], step: string): CollectedAlert[] {
	const alerts: CollectedAlert[] = []
	const stepMs = parseStepToMs(step)

	for (const series of results) {
		const { alertname, alertstate, ...labels } = series.metric

		if (!alertname) continue

		// Find intervals where alert is firing (value = 1)
		const intervals = findFiringIntervals(series.values, stepMs)

		for (const interval of intervals) {
			alerts.push({
				alertname,
				epoch_ms: interval.start,
				duration_ms: interval.end - interval.start,
				labels,
			})
		}
	}

	return alerts
}

interface TimeInterval {
	start: number // epoch ms
	end: number // epoch ms
}

/**
 * Find continuous intervals where alert is firing.
 *
 * Groups consecutive timestamps with value=1 into intervals.
 * Gap tolerance is 2x step to handle minor scrape delays.
 */
function findFiringIntervals(values: Array<[number, string]>, stepMs: number): TimeInterval[] {
	const intervals: TimeInterval[] = []
	const gapTolerance = stepMs * 2

	let currentInterval: TimeInterval | null = null

	for (const [timestamp, value] of values) {
		const ts = timestamp * 1000 // convert to ms
		const isFiring = value === '1'

		if (isFiring) {
			if (currentInterval === null) {
				// Start new interval
				currentInterval = { start: ts, end: ts }
			} else if (ts - currentInterval.end <= gapTolerance) {
				// Extend current interval
				currentInterval.end = ts
			} else {
				// Gap too large, close current and start new
				intervals.push(currentInterval)
				currentInterval = { start: ts, end: ts }
			}
		} else {
			if (currentInterval !== null) {
				// Close current interval
				intervals.push(currentInterval)
				currentInterval = null
			}
		}
	}

	// Close any remaining interval
	if (currentInterval !== null) {
		intervals.push(currentInterval)
	}

	return intervals
}

/**
 * Parse Prometheus step string to milliseconds
 */
function parseStepToMs(step: string): number {
	const match = step.match(/^(\d+)([smhd])$/)

	if (!match) {
		return 15000 // default 15s
	}

	const value = parseInt(match[1], 10)
	const unit = match[2]

	switch (unit) {
		case 's':
			return value * 1000
		case 'm':
			return value * 60 * 1000
		case 'h':
			return value * 60 * 60 * 1000
		case 'd':
			return value * 24 * 60 * 60 * 1000
		default:
			return 15000
	}
}
