import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'

import { afterEach, beforeEach, test } from 'bun:test'

import { loadMetricConfig } from './metrics.js'

let hasYq = () => spawnSync('yq', ['--version'], { encoding: 'utf-8' }).status === 0
let previousPath: string | undefined

beforeEach(() => {
	previousPath = process.env['GITHUB_ACTION_PATH']
	process.env['GITHUB_ACTION_PATH'] = process.cwd()
})

afterEach(() => {
	if (previousPath === undefined) Reflect.deleteProperty(process.env, 'GITHUB_ACTION_PATH')
	else process.env['GITHUB_ACTION_PATH'] = previousPath
})

test.if(hasYq())('default configuration collects the existing workload metrics', async () => {
	let config = await loadMetricConfig()

	assert.equal(config.default.step, '5s')
	assert.equal(config.metrics.length, 12)
	assert.ok(config.metrics.every((metric) => metric.query.includes('sdk_')))
	assert.ok(
		config.metrics.some(
			(metric) =>
				metric.name === 'read_throughput' && metric.query.includes('sdk_operations_total')
		)
	)
	assert.ok(
		config.metrics.some(
			(metric) =>
				metric.name === 'write_latency_p99_ms' &&
				metric.query.includes('sdk_operation_latency_p99_seconds')
		)
	)
	for (let name of ['read_retry_attempts', 'write_retry_attempts']) {
		assert.equal(config.metrics.find((metric) => metric.name === name)?.role, 'diagnostic')
	}
})

test.if(hasYq())('loadMetricConfig merges inline yaml before defaults', async () => {
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
	assert.ok(config.metrics.some((metric) => metric.name === 'read_throughput'))
})

test.if(hasYq())('loadMetricConfig merges file after inline (higher priority)', async () => {
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

	try {
		let config = await loadMetricConfig(inlineYaml, filePath)

		assert.equal(config.default.timeout, '5s')
		assert.equal(config.metrics[0]?.name, 'file_metric')
		assert.ok(config.metrics.some((metric) => metric.name === 'inline_metric'))
		assert.ok(config.metrics.some((metric) => metric.name === 'read_throughput'))
	} finally {
		await fs.rm(dir, { recursive: true })
	}
})

test.if(hasYq())('loadMetricConfig disables a default metric by name', async () => {
	let customYaml = [
		'metrics:',
		'  - name: read_retry_attempts',
		'    disabled: true',
		'  - name: write_retry_attempts',
		'    disabled: true',
	].join('\n')

	let config = await loadMetricConfig(customYaml)

	assert.ok(!config.metrics.some((metric) => metric.name === 'read_retry_attempts'))
	assert.ok(!config.metrics.some((metric) => metric.name === 'write_retry_attempts'))
	assert.ok(config.metrics.some((metric) => metric.name === 'read_throughput'))
})

test.if(hasYq())('loadMetricConfig lets a higher-priority file re-enable a metric', async () => {
	let inlineYaml = ['metrics:', '  - name: read_retry_attempts', '    disabled: true'].join('\n')
	let fileYaml = ['metrics:', '  - name: read_retry_attempts', '    disabled: false'].join('\n')
	let dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ydb-slo-action-metrics-'))
	let filePath = path.join(dir, 'metrics.yaml')
	await fs.writeFile(filePath, fileYaml, { encoding: 'utf-8' })

	try {
		let config = await loadMetricConfig(inlineYaml, filePath)
		let metric = config.metrics.find((candidate) => candidate.name === 'read_retry_attempts')

		assert.equal(metric?.disabled, false)
		assert.match(metric?.query || '', /sdk_retry_attempts_total/)
	} finally {
		await fs.rm(dir, { recursive: true })
	}
})
