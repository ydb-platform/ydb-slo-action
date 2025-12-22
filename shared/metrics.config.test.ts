import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'

import { test } from 'bun:test'

let hasYq = () => spawnSync('yq', ['--version'], { encoding: 'utf-8' }).status === 0

test.if(hasYq())('loadMetricConfig merges inline yaml before defaults', async () => {
	process.env['GITHUB_ACTION_PATH'] = process.cwd()

	let { loadMetricConfig } = await import('./metrics.js')

	let customYaml = [
		'default:',
		'  step: 1s',
		'metrics:',
		'  - name: custom_metric',
		'    query: sum by(ref) (some_metric_total{})',
	].join('\n')

	let config = await loadMetricConfig(customYaml)

	assert.equal(config.default.step, '1s')
	assert.equal(config.metrics[0]?.name, 'custom_metric')
	assert.ok(config.metrics.some((m) => m.name === 'read_latency_ms'))
})

test.if(hasYq())('loadMetricConfig merges file after inline (higher priority)', async () => {
	process.env['GITHUB_ACTION_PATH'] = process.cwd()

	let { loadMetricConfig } = await import('./metrics.js')

	let inlineYaml = [
		'default:',
		'  timeout: 30s',
		'metrics:',
		'  - name: inline_metric',
		'    query: sum by(ref) (inline_metric_total{})',
	].join('\n')

	let fileYaml = [
		'default:',
		'  timeout: 5s',
		'metrics:',
		'  - name: file_metric',
		'    query: sum by(ref) (file_metric_total{})',
	].join('\n')

	let dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ydb-slo-action-metrics-'))
	let filePath = path.join(dir, 'metrics.yaml')
	await fs.writeFile(filePath, fileYaml, { encoding: 'utf-8' })

	let config = await loadMetricConfig(inlineYaml, filePath)

	assert.equal(config.default.timeout, '5s')
	assert.equal(config.metrics[0]?.name, 'file_metric')
	assert.ok(config.metrics.some((m) => m.name === 'inline_metric'))
	assert.ok(config.metrics.some((m) => m.name === 'read_latency_ms'))
})
