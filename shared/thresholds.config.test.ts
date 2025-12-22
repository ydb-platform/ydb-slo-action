import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as path from 'node:path'

import { test } from 'bun:test'

let hasYq = () => {
	let result = spawnSync('yq', ['--version'], { encoding: 'utf-8' })
	return result.status === 0
}

test.if(hasYq())('loadThresholdConfig merges custom thresholds before default', async () => {
	process.env['GITHUB_ACTION_PATH'] = path.resolve(import.meta.dir, '..')

	let { evaluateThreshold, loadThresholdConfig } = await import('./thresholds.js')

	let customYaml = [
		'metrics:',
		'  - pattern: "*custom_metric*"',
		'    direction: lower_is_better',
		'    critical_max: 0',
	].join('\n')

	let config = await loadThresholdConfig(customYaml)

	assert.equal(config.metrics?.[0]?.pattern, '*custom_metric*')

	let evaluated = evaluateThreshold(
		{
			name: 'custom_metric',
			type: 'instant',
			current: { value: 1, available: true },
			baseline: { value: 0, available: true },
			change: { absolute: 1, percent: NaN, direction: 'unknown' },
		},
		config
	)

	assert.equal(evaluated.threshold_severity, 'failure')
})
