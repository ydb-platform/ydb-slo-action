import * as assert from 'node:assert/strict'
import { test } from 'bun:test'

import { parseAlertsFromRange } from './alerts.js'
import type { PrometheusRangeValue } from './prometheus.js'

test('parseAlertsFromRange: single continuous alert interval', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [
				[1000, '1'],
				[1015, '1'],
				[1030, '1'],
				[1045, '1'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 1)
	assert.equal(alerts[0].alertname, 'ChaosFaultActive')
	assert.equal(alerts[0].epoch_ms, 1000 * 1000) // 1000s -> ms
	assert.equal(alerts[0].duration_ms, 45 * 1000) // 1045 - 1000 = 45s
	assert.equal(alerts[0].labels.fault, 'kill-node')
	assert.equal(alerts[0].labels.node, 'ydb-database-1')
})

test('parseAlertsFromRange: two separate intervals with gap', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'sigkill',
				node: 'ydb-database-2',
			},
			values: [
				// First interval: 1000-1030
				[1000, '1'],
				[1015, '1'],
				[1030, '1'],
				// Gap (no firing)
				[1045, '0'],
				[1060, '0'],
				// Second interval: 1075-1105
				[1075, '1'],
				[1090, '1'],
				[1105, '1'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 2)
	assert.equal(alerts[0].epoch_ms, 1000 * 1000)
	assert.equal(alerts[0].duration_ms, 30 * 1000) // 1030 - 1000
	assert.equal(alerts[1].epoch_ms, 1075 * 1000)
	assert.equal(alerts[1].duration_ms, 30 * 1000) // 1105 - 1075
})

test('parseAlertsFromRange: merges within gap tolerance (2x step)', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'network-partition',
				node: 'ydb-database-3',
			},
			values: [
				[1000, '1'],
				[1015, '1'],
				// Missing 1030 (scrape delay), but within 2x step tolerance
				[1045, '1'],
				[1060, '1'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 1)
	assert.equal(alerts[0].epoch_ms, 1000 * 1000)
	assert.equal(alerts[0].duration_ms, 60 * 1000) // 1060 - 1000
})

test('parseAlertsFromRange: splits when gap exceeds tolerance', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'pause-unpause',
				node: 'ydb-database-4',
			},
			values: [
				[1000, '1'],
				[1015, '1'],
				// Large gap (> 2x step of 15s = 30s)
				[1060, '1'],
				[1075, '1'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 2)
	assert.equal(alerts[0].duration_ms, 15 * 1000) // 1015 - 1000
	assert.equal(alerts[1].duration_ms, 15 * 1000) // 1075 - 1060
})

test('parseAlertsFromRange: multiple series produce multiple alerts', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [
				[1000, '1'],
				[1015, '1'],
			],
		},
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-2',
			},
			values: [
				[1020, '1'],
				[1035, '1'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 2)
	assert.equal(alerts[0].labels.node, 'ydb-database-1')
	assert.equal(alerts[1].labels.node, 'ydb-database-2')
})

test('parseAlertsFromRange: empty values returns no alerts', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 0)
})

test('parseAlertsFromRange: all zeros returns no alerts', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [
				[1000, '0'],
				[1015, '0'],
				[1030, '0'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 0)
})

test('parseAlertsFromRange: excludes alertstate from labels', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
				severity: 'info',
			},
			values: [[1000, '1']],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 1)
	assert.equal(alerts[0].labels.fault, 'kill-node')
	assert.equal(alerts[0].labels.severity, 'info')
	assert.equal(alerts[0].labels.alertstate, undefined)
})

test('parseAlertsFromRange: single point has zero duration', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [[1000, '1']],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 1)
	assert.equal(alerts[0].duration_ms, 0)
})

test('parseAlertsFromRange: handles 1m step', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				alertname: 'ChaosFaultActive',
				alertstate: 'firing',
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [
				[1000, '1'],
				[1060, '1'],
				[1120, '1'],
			],
		},
	]

	let alerts = parseAlertsFromRange(results, '1m')

	assert.equal(alerts.length, 1)
	assert.equal(alerts[0].duration_ms, 120 * 1000) // 1120 - 1000
})

test('parseAlertsFromRange: skips series without alertname', () => {
	let results: PrometheusRangeValue[] = [
		{
			metric: {
				fault: 'kill-node',
				node: 'ydb-database-1',
			},
			values: [[1000, '1']],
		},
	]

	let alerts = parseAlertsFromRange(results, '15s')

	assert.equal(alerts.length, 0)
})
