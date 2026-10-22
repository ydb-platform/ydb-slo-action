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
		{
			name: 'read_latency_p95_ms',
			query: '',
			type: 'instant',
			data: [{ metric: { ref: 'current' }, value: [1, '20'] }],
		},
		{
			name: 'read_retry_attempts',
			role: 'diagnostic',
			query: '',
			type: 'instant',
			data: [{ metric: { ref: 'current' }, value: [1, '400'] }],
		},
		{
			name: 'write_retry_attempts',
			role: 'diagnostic',
			query: '',
			type: 'instant',
			data: [{ metric: { ref: 'current' }, value: [1, '0'] }],
		},
		{
			name: 'empty_diagnostic',
			role: 'diagnostic',
			query: '',
			type: 'range',
			data: [{ metric: { ref: 'current' }, values: [[1, 'NaN']] }],
		},
		{
			name: 'baseline_only_diagnostic',
			role: 'diagnostic',
			query: '',
			type: 'range',
			data: [{ metric: { ref: 'baseline' }, values: [[1, '5']] }],
		},
	]
	let analysis = analyzeSloWorkload('table', metrics, 'current', 'baseline', {
		thresholdConfig: thresholds,
	})
	expect(analysis.severity).toBe('success')
	expect(analysis.metrics.map((metric) => metric.name)).toEqual([
		'read_latency_p95_ms',
		'read_retry_attempts',
		'write_retry_attempts',
		'baseline_only_diagnostic',
	])
})

test('logical failures remain failures when diagnostic metrics look healthy', () => {
	let metrics: CollectedMetric[] = [
		{
			name: 'read_latency_p95_ms',
			query: '',
			type: 'instant',
			data: [{ metric: { ref: 'current' }, value: [1, '500'] }],
		},
		{
			name: 'read_retry_attempts',
			role: 'diagnostic',
			query: '',
			type: 'instant',
			data: [{ metric: { ref: 'current' }, value: [1, '0'] }],
		},
	]
	let analysis = analyzeSloWorkload('table', metrics, 'current', 'baseline', {
		thresholdConfig: thresholds,
	})
	expect(analysis.severity).toBe('failure')
})

test('a failed data check cannot be hidden by healthy workload metrics', () => {
	let metrics: CollectedMetric[] = [
		{
			name: 'read_latency_p95_ms',
			query: '',
			type: 'instant',
			data: [{ metric: { ref: 'current' }, value: [1, '10'] }],
		},
	]
	let analysis = analyzeSloWorkload('table', metrics, 'current', 'baseline', {
		thresholdConfig: thresholds,
		sloVerdict: 'FAIL',
	})
	expect(analysis.severity).toBe('failure')
})
