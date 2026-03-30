import * as assert from 'node:assert/strict'

import { test } from 'bun:test'

import {
	type ThresholdConfig,
	evaluateAbsoluteThreshold,
	evaluateRelativeThreshold,
} from './thresholds.js'

test('evaluateRelativeThreshold flags regression beyond warning threshold', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
	}

	let result = evaluateRelativeThreshold(
		'some_latency_metric',
		15,
		0.8,
		'lower_is_better',
		config
	)
	assert.equal(result.severity, 'warning')
	assert.ok(result.violations.length > 0)
})

test('evaluateRelativeThreshold flags critical regression', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
	}

	let result = evaluateRelativeThreshold(
		'some_latency_metric',
		25,
		0.9,
		'lower_is_better',
		config
	)
	assert.equal(result.severity, 'failure')
})

test('evaluateRelativeThreshold does not trigger on improvements', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
	}

	// lower_is_better: negative change = improvement
	let result = evaluateRelativeThreshold(
		'some_latency_metric',
		-50,
		0.1,
		'lower_is_better',
		config
	)
	assert.equal(result.severity, 'success')
})

test('evaluateRelativeThreshold treats small changes as neutral', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 10,
			critical_change_percent: 20,
		},
	}

	let result = evaluateRelativeThreshold(
		'some_latency_metric',
		3,
		0.55,
		'lower_is_better',
		config
	)
	assert.equal(result.severity, 'success')
})

test('evaluateAbsoluteThreshold flags below critical_min', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 20,
			critical_change_percent: 50,
		},
		metrics: [
			{
				pattern: '*_availability',
				direction: 'higher_is_better',
				critical_min: 95.0,
				warning_min: 99.0,
			},
		],
	}

	let result = evaluateAbsoluteThreshold('read_availability', 90.0, 'higher_is_better', config)
	assert.equal(result.severity, 'failure')
	assert.ok(result.violations.length > 0)
})

test('evaluateAbsoluteThreshold flags below warning_min', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 20,
			critical_change_percent: 50,
		},
		metrics: [
			{
				pattern: '*_availability',
				direction: 'higher_is_better',
				critical_min: 95.0,
				warning_min: 99.0,
			},
		],
	}

	let result = evaluateAbsoluteThreshold('read_availability', 97.0, 'higher_is_better', config)
	assert.equal(result.severity, 'warning')
})

test('evaluateAbsoluteThreshold succeeds when above thresholds', () => {
	let config: ThresholdConfig = {
		neutral_change_percent: 5,
		default: {
			warning_change_percent: 20,
			critical_change_percent: 50,
		},
		metrics: [
			{
				pattern: '*_availability',
				direction: 'higher_is_better',
				critical_min: 95.0,
				warning_min: 99.0,
			},
		],
	}

	let result = evaluateAbsoluteThreshold('read_availability', 99.9, 'higher_is_better', config)
	assert.equal(result.severity, 'success')
})
