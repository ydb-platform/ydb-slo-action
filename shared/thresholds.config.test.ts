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

	let { evaluateAbsoluteThreshold, loadThresholdConfig } = await import('./thresholds.js')

	let customYaml = [
		'metrics:',
		'  - pattern: "*custom_metric*"',
		'    direction: lower_is_better',
		'    critical_max: 0',
	].join('\n')

	let config = await loadThresholdConfig(customYaml)

	assert.equal(config.metrics?.[0]?.pattern, '*custom_metric*')

	let evaluated = evaluateAbsoluteThreshold('custom_metric', 1, 'lower_is_better', config)

	assert.equal(evaluated.severity, 'failure')
})
