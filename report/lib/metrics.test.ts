import * as assert from 'node:assert/strict'

import { test } from 'bun:test'

import { loadCollectedMetrics } from './metrics.js'
import type { CollectedMetric } from '../../shared/metrics.js'

test('loadCollectedMetrics parses JSONL and skips invalid lines', () => {
	let content = [
		'{"name":"m1","query":"q1","type":"instant","data":[{"metric":{"ref":"current"},"value":[1,"1"]}]}',
		'not-json',
		'',
		'{"name":"m2","query":"q2","type":"range","data":[{"metric":{"ref":"current"},"values":[[1,"1"],[2,"2"]]}]}',
	].join('\n')

	let metrics = loadCollectedMetrics(content)
	assert.equal(metrics.length, 2)

	let [m1, m2] = metrics as CollectedMetric[]
	assert.equal(m1.name, 'm1')
	assert.equal(m1.type, 'instant')
	assert.equal(m2.name, 'm2')
	assert.equal(m2.type, 'range')
})
