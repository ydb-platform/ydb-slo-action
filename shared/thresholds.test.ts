import * as assert from 'node:assert/strict'

import { test } from 'bun:test'

import type { MetricComparison } from './analysis.js'
import { evaluateThreshold, evaluateWorkloadThresholds, type ThresholdConfig } from './thresholds.js'

test('evaluateThreshold uses default change thresholds for regressions', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
	}

	let comparison: MetricComparison = {
		name: 'some_metric',
		type: 'instant',
		current: { value: 120, available: true },
		baseline: { value: 100, available: true },
		change: { absolute: 20, percent: 20, direction: 'worse' },
	}

	let evaluated = evaluateThreshold(comparison, config)
	assert.equal(evaluated.threshold_severity, 'warning')
	assert.ok(evaluated.reason?.includes('Regression'))
})

test('evaluateThreshold does not trigger on improvements even if percent is high', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
	}

	let comparison: MetricComparison = {
		name: 'some_metric',
		type: 'instant',
		current: { value: 50, available: true },
		baseline: { value: 100, available: true },
		change: { absolute: -50, percent: -50, direction: 'better' },
	}

	let evaluated = evaluateThreshold(comparison, config)
	assert.equal(evaluated.threshold_severity, 'success')
})

test('evaluateWorkloadThresholds aggregates overall severity', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
		metrics: [
			{
				name: 'abs_max_metric',
				critical_max: 10,
			},
		],
	}

	let comparisons: MetricComparison[] = [
		{
			name: 'abs_max_metric',
			type: 'instant',
			current: { value: 11, available: true },
			baseline: { value: 9, available: true },
			change: { absolute: 2, percent: 22.22, direction: 'worse' },
		},
		{
			name: 'ok_metric',
			type: 'instant',
			current: { value: 1, available: true },
			baseline: { value: 1, available: true },
			change: { absolute: 0, percent: 0, direction: 'neutral' },
		},
	]

	let result = evaluateWorkloadThresholds(comparisons, config)
	assert.equal(result.overall, 'failure')
	assert.equal(result.failures.length, 1)
	assert.equal(result.failures[0].name, 'abs_max_metric')
})
