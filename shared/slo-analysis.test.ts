import { expect, test } from 'bun:test'

import { analyzeSloWorkload } from './slo-analysis.js'
import type { CollectedMetric } from './metrics.js'
import type { ThresholdConfig } from './thresholds.js'

let thresholds: ThresholdConfig = {
	neutral_change_percent: 5,
	default: { warning_change_percent: 20, critical_change_percent: 50 },
	metrics: [{ pattern: '*', direction: 'lower_is_better', critical_max: 100 }],
}

test('attempt diagnostics cannot fail a successful logical SLO', () => {
	let metrics: CollectedMetric[] = [
		{ name: 'ydb.client.retry.duration', query: '', type: 'instant', data: [{ metric: { ref: 'current' }, value: [1, '20'] }] },
		{ name: 'ydb.client.operation.failed', role: 'diagnostic', query: '', type: 'instant', data: [{ metric: { ref: 'current' }, value: [1, '400'] }] },
	]
	let analysis = analyzeSloWorkload('table', metrics, 'current', 'baseline', { thresholdConfig: thresholds })
	expect(analysis.severity).toBe('success')
	expect(analysis.metrics.map((metric) => metric.name)).toEqual(['ydb.client.retry.duration', 'ydb.client.operation.failed'])
})

test('logical failures remain failures when diagnostic metrics look healthy', () => {
	let metrics: CollectedMetric[] = [
		{ name: 'ydb.client.retry.duration', query: '', type: 'instant', data: [{ metric: { ref: 'current' }, value: [1, '500'] }] },
		{ name: 'ydb.client.operation.failed', role: 'diagnostic', query: '', type: 'instant', data: [{ metric: { ref: 'current' }, value: [1, '0'] }] },
	]
	let analysis = analyzeSloWorkload('table', metrics, 'current', 'baseline', { thresholdConfig: thresholds })
	expect(analysis.severity).toBe('failure')
})

test('a failed data check cannot be hidden by healthy SDK duration', () => {
	let metrics: CollectedMetric[] = [
		{ name: 'ydb.client.retry.duration', query: '', type: 'instant', data: [{ metric: { ref: 'current' }, value: [1, '10'] }] },
	]
	let analysis = analyzeSloWorkload('table', metrics, 'current', 'baseline', {
		thresholdConfig: thresholds,
		sloVerdict: 'FAIL',
	})
	expect(analysis.severity).toBe('failure')
})
