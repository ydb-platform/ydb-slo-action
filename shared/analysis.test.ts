import * as assert from 'node:assert/strict'

import { test } from 'bun:test'

import {
	alignSeries,
	analyzeMetric,
	analyzeWorkload,
	computeConcordance,
	computePairedRatio,
	formatChange,
	formatValue,
	inferDirection,
} from './analysis.js'
import type { CollectedMetric, RangeSeries } from './metrics.js'

test('inferDirection recognizes latency as lower_is_better', () => {
	assert.equal(inferDirection('read_latency_p95_ms'), 'lower_is_better')
})

test('inferDirection recognizes attempts as lower_is_better', () => {
	assert.equal(inferDirection('read_attempts'), 'lower_is_better')
})

test('inferDirection recognizes throughput as higher_is_better', () => {
	assert.equal(inferDirection('read_throughput'), 'higher_is_better')
})

test('inferDirection returns neutral for unknown names', () => {
	assert.equal(inferDirection('some_metric'), 'neutral')
})

test('alignSeries aligns by timestamp', () => {
	let current: RangeSeries = {
		metric: { ref: 'current' },
		values: [
			[1, '10'],
			[2, '20'],
			[3, '30'],
		],
	}
	let baseline: RangeSeries = {
		metric: { ref: 'baseline' },
		values: [
			[1, '10'],
			[2, '20'],
			[4, '40'], // no match for ts=3
		],
	}

	let aligned = alignSeries(current, baseline)
	assert.equal(aligned.length, 2) // only ts=1 and ts=2 match
	assert.equal(aligned[0].ratio, 1.0)
	assert.equal(aligned[1].ratio, 1.0)
})

test('computePairedRatio returns ~1.0 for identical data', () => {
	let current: RangeSeries = {
		metric: { ref: 'current' },
		values: [
			[1, '100'],
			[2, '100'],
			[3, '100'],
		],
	}
	let baseline: RangeSeries = {
		metric: { ref: 'baseline' },
		values: [
			[1, '100'],
			[2, '100'],
			[3, '100'],
		],
	}

	let aligned = alignSeries(current, baseline)
	let ratio = computePairedRatio(aligned)
	assert.equal(ratio, 1.0)
})

test('computeConcordance is ~0.5 for identical data', () => {
	let current: RangeSeries = {
		metric: { ref: 'current' },
		values: [
			[1, '100'],
			[2, '100'],
		],
	}
	let baseline: RangeSeries = {
		metric: { ref: 'baseline' },
		values: [
			[1, '100'],
			[2, '100'],
		],
	}

	let aligned = alignSeries(current, baseline)
	let conc = computeConcordance(aligned, 'lower_is_better')
	assert.equal(conc, 0) // none are worse when equal
})

test('computeConcordance detects worse direction for lower_is_better', () => {
	let current: RangeSeries = {
		metric: { ref: 'current' },
		values: [
			[1, '200'],
			[2, '200'],
		],
	}
	let baseline: RangeSeries = {
		metric: { ref: 'baseline' },
		values: [
			[1, '100'],
			[2, '100'],
		],
	}

	let aligned = alignSeries(current, baseline)
	let conc = computeConcordance(aligned, 'lower_is_better')
	assert.equal(conc, 1.0) // all points are worse
})

test('analyzeMetric detects regression in latency', () => {
	let metric: CollectedMetric = {
		name: 'read_latency_p95_ms',
		query: 'fake',
		type: 'range',
		data: [
			{
				metric: { ref: 'current' },
				values: [
					[1, '200'],
					[2, '200'],
					[3, '200'],
				],
			},
			{
				metric: { ref: 'baseline' },
				values: [
					[1, '100'],
					[2, '100'],
					[3, '100'],
				],
			},
		],
	}

	let result = analyzeMetric(metric, 'current', 'baseline')
	assert.ok(result.relativeCheck)
	assert.ok(result.relativeCheck.changePercent > 90) // ~100% increase
	assert.equal(result.relativeCheck.concordance, 1.0) // all worse
	assert.equal(result.direction, 'lower_is_better')
})

test('analyzeMetric produces visualization for range metrics', () => {
	let metric: CollectedMetric = {
		name: 'read_latency_p50_ms',
		query: 'fake',
		type: 'range',
		data: [
			{
				metric: { ref: 'current' },
				values: [
					[1, '10'],
					[2, '12'],
					[3, '11'],
				],
			},
			{
				metric: { ref: 'baseline' },
				values: [
					[1, '10'],
					[2, '11'],
					[3, '10'],
				],
			},
		],
	}

	let result = analyzeMetric(metric, 'current', 'baseline')
	assert.ok(result.visualization)
	assert.ok(result.visualization.emaCurrent.length > 0)
	assert.ok(result.visualization.currentHistogram.counts.length > 0)
})

test('analyzeWorkload produces forest plot entries', () => {
	let metrics: CollectedMetric[] = [
		{
			name: 'read_latency_p95_ms',
			query: 'fake',
			type: 'range',
			data: [
				{
					metric: { ref: 'current' },
					values: [
						[1, '100'],
						[2, '100'],
					],
				},
				{
					metric: { ref: 'baseline' },
					values: [
						[1, '100'],
						[2, '100'],
					],
				},
			],
		},
	]

	let result = analyzeWorkload('test', metrics, 'current', 'baseline')
	assert.equal(result.workload, 'test')
	assert.equal(result.metrics.length, 1)
	assert.equal(result.forestPlot.length, 1)
	assert.ok(Math.abs(result.forestPlot[0].changePercent) < 1) // ~0% change
})

test('analyzeWorkload detects retries cross-metric', () => {
	let metrics: CollectedMetric[] = [
		{
			name: 'read_attempts',
			query: 'fake',
			unit: 'ops/s',
			type: 'range',
			data: [
				{
					metric: { ref: 'current' },
					values: [
						[1, '5'],
						[2, '5'],
					],
				},
				{
					metric: { ref: 'baseline' },
					values: [
						[1, '0'],
						[2, '0'],
					],
				},
			],
		},
		{
			name: 'read_throughput',
			query: 'fake',
			unit: 'ops/s',
			type: 'range',
			data: [
				{
					metric: { ref: 'current' },
					values: [
						[1, '100'],
						[2, '100'],
					],
				},
				{
					metric: { ref: 'baseline' },
					values: [
						[1, '100'],
						[2, '100'],
					],
				},
			],
		},
	]

	let result = analyzeWorkload('test', metrics, 'current', 'baseline')
	let attemptsMetric = result.metrics.find((m) => m.name === 'read_attempts')
	assert.ok(attemptsMetric?.retriesCheck)
	assert.equal(attemptsMetric.retriesCheck.retryRate, 0.05) // 5/100
	assert.equal(attemptsMetric.retriesCheck.severity, 'failure') // > 1%
})

test('formatValue and formatChange produce stable strings', () => {
	assert.equal(formatValue(12.3456, 'latency_ms'), '12.35ms')
	assert.equal(formatValue(1200, 'throughput_ops'), '1.20k/s')
	assert.equal(formatValue(NaN, 'whatever'), 'N/A')

	assert.equal(formatChange(10.04, 'success'), '+10.0% ✅')
	assert.equal(formatChange(-10.04, 'failure'), '-10.0% 🔴')
	assert.equal(formatChange(NaN, 'success'), 'N/A')
})
