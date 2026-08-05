import * as assert from 'node:assert/strict'

import { test } from 'bun:test'
import { spawnSync } from 'node:child_process'

import {
	type ThresholdConfig,
	evaluateAbsoluteThreshold,
	evaluateRelativeThreshold,
} from './thresholds.js'

let hasYq = () => {
	let result = spawnSync('yq', ['--version'], { encoding: 'utf-8' })
	return result.status === 0
}

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

test('mergeWorkloadThresholds: empty YAML returns base unchanged', async () => {
	let { mergeWorkloadThresholds } = await import('./thresholds.js')

	let base = {
		neutral_change_percent: 5,
		default: { warning_change_percent: 20, critical_change_percent: 50 },
		metrics: [],
	}

	let merged = await mergeWorkloadThresholds(base, '')

	assert.equal(merged, base) // same reference, no parse attempted
})

test.if(hasYq())('mergeWorkloadThresholds: per-scenario override wins over base', async () => {
	let { mergeWorkloadThresholds } = await import('./thresholds.js')

	let base = {
		neutral_change_percent: 5,
		default: { warning_change_percent: 20, critical_change_percent: 50 },
		metrics: [{ pattern: '*_latency_p99_ms', direction: 'lower_is_better', critical_max: 10 }],
	}

	let perScenario = [
		'metrics:',
		'  - pattern: "*_latency_p99_ms"',
		'    direction: lower_is_better',
		'    critical_max: 50',
	].join('\n')

	let merged = await mergeWorkloadThresholds(base, perScenario)

	// base ceiling 10 would FAIL at 30; per-scenario raises it to 50 → success
	let evaluated = evaluateAbsoluteThreshold('read_latency_p99_ms', 30, 'lower_is_better', merged)
	assert.equal(evaluated.severity, 'success')
})

test.if(hasYq())(
	'mergeWorkloadThresholds: per-scenario pattern overrides base exact rule',
	async () => {
		let { mergeWorkloadThresholds } = await import('./thresholds.js')

		let base = {
			neutral_change_percent: 5,
			default: { warning_change_percent: 20, critical_change_percent: 50 },
			metrics: [
				{ name: 'read_latency_p99_ms', direction: 'lower_is_better', critical_max: 10 },
			],
		}

		let perScenario = [
			'metrics:',
			'  - pattern: "*_latency_p99_ms"',
			'    direction: lower_is_better',
			'    critical_max: 50',
		].join('\n')

		let merged = await mergeWorkloadThresholds(base, perScenario)

		let evaluated = evaluateAbsoluteThreshold(
			'read_latency_p99_ms',
			30,
			'lower_is_better',
			merged
		)
		assert.equal(evaluated.severity, 'success')
	}
)

test.if(hasYq())('mergeWorkloadThresholds: base rules not overridden still apply', async () => {
	let { mergeWorkloadThresholds } = await import('./thresholds.js')

	let base = {
		neutral_change_percent: 5,
		default: { warning_change_percent: 20, critical_change_percent: 50 },
		metrics: [{ name: 'read_latency_p99_ms', direction: 'lower_is_better', critical_max: 10 }],
	}

	// per-scenario touches a DIFFERENT metric
	let perScenario = [
		'metrics:',
		'  - name: write_latency_p99_ms',
		'    direction: lower_is_better',
		'    critical_max: 99',
	].join('\n')

	let merged = await mergeWorkloadThresholds(base, perScenario)

	let evaluated = evaluateAbsoluteThreshold('read_latency_p99_ms', 30, 'lower_is_better', merged)
	assert.equal(evaluated.severity, 'failure') // inherited base rule still gates
})
