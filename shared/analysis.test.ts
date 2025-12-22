import * as assert from 'node:assert/strict'

import { test } from 'bun:test'

import { compareMetric, formatChange, formatValue } from './analysis.js'
import type { CollectedMetric } from './metrics.js'

test('compareMetric marks lower_is_better regression as worse', () => {
	let metric: CollectedMetric = {
		name: 'request_latency_ms',
		query: 'fake',
		type: 'range',
		data: [
			{
				metric: { ref: 'current' },
				values: [
					[1, '120'],
					[2, '80'],
				],
			},
			{
				metric: { ref: 'baseline' },
				values: [
					[1, '60'],
					[2, '40'],
				],
			},
		],
	}

	let comparison = compareMetric(metric, 'current', 'baseline', 'avg', 0)
	assert.equal(comparison.change.direction, 'worse')
	assert.ok(comparison.change.percent > 0)
	assert.ok(comparison.current.available)
	assert.ok(comparison.baseline.available)
})

test('compareMetric marks higher_is_better improvement as better', () => {
	let metric: CollectedMetric = {
		name: 'request_throughput_ops',
		query: 'fake',
		type: 'range',
		data: [
			{
				metric: { ref: 'current' },
				values: [
					[1, '110'],
					[2, '130'],
				],
			},
			{
				metric: { ref: 'baseline' },
				values: [
					[1, '90'],
					[2, '100'],
				],
			},
		],
	}

	let comparison = compareMetric(metric, 'current', 'baseline', 'avg', 0)
	assert.equal(comparison.change.direction, 'better')
	assert.ok(comparison.change.percent > 0)
})

test('compareMetric treats small changes as neutral', () => {
	let metric: CollectedMetric = {
		name: 'something_neutral',
		query: 'fake',
		type: 'instant',
		data: [
			{ metric: { ref: 'current' }, value: [1, '100'] },
			{ metric: { ref: 'baseline' }, value: [1, '102'] },
		],
	}

	let comparison = compareMetric(metric, 'current', 'baseline', 'avg', 5)
	assert.equal(comparison.change.direction, 'neutral')
})

test('formatValue and formatChange produce stable strings', () => {
	assert.equal(formatValue(12.3456, 'latency_ms'), '12.35ms')
	assert.equal(formatValue(1200, 'throughput_ops'), '1.20k/s')
	assert.equal(formatValue(NaN, 'whatever'), 'N/A')

	assert.equal(formatChange(10.04, 'better'), '+10.0% 🟢')
	assert.equal(formatChange(-10.04, 'worse'), '-10.0% 🔴')
	assert.equal(formatChange(NaN, 'neutral'), 'N/A')
})
