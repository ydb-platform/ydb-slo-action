import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { spawnSync } from 'node:child_process'

import { test } from 'bun:test'

let hasYq = () => spawnSync('yq', ['--version'], { encoding: 'utf-8' }).status === 0

test.if(hasYq())(
	'legacy Table schema collects old paired metrics without native Topic requirements',
	async () => {
		let previousPath = process.env['GITHUB_ACTION_PATH']
		let previousSchema = process.env['INPUT_METRICS_SCHEMA']
		process.env['GITHUB_ACTION_PATH'] = process.cwd()
		process.env['INPUT_METRICS_SCHEMA'] = 'legacy_table'
		try {
			let { loadMetricConfig } = await import('./metrics.js')
			let config = await loadMetricConfig()
			assert.equal(config.default.step, '5s')
			assert.ok(
				config.metrics.some(
					(metric) =>
						metric.name === 'read_throughput' &&
						metric.query.includes('sdk_operations_total')
				)
			)
			assert.ok(
				config.metrics.some(
					(metric) =>
						metric.name === 'write_latency_p99_ms' &&
						metric.query.includes('sdk_operation_latency_p99_seconds')
				)
			)
			assert.ok(config.metrics.every((metric) => !metric.query.includes('ydb_topic_')))
		} finally {
			if (previousPath === undefined)
				Reflect.deleteProperty(process.env, 'GITHUB_ACTION_PATH')
			else process.env['GITHUB_ACTION_PATH'] = previousPath
			if (previousSchema === undefined) delete process.env['INPUT_METRICS_SCHEMA']
			else process.env['INPUT_METRICS_SCHEMA'] = previousSchema
		}
	}
)

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
	assert.ok(config.metrics.some((m) => m.name === 'ydb.client.operation.duration'))
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
	assert.ok(config.metrics.some((m) => m.name === 'ydb.client.operation.duration'))
})

test.if(hasYq())('loadMetricConfig disables a default metric by name', async () => {
	process.env['GITHUB_ACTION_PATH'] = process.cwd()

	let { loadMetricConfig } = await import('./metrics.js')

	let customYaml = [
		'metrics:',
		'  - name: ydb.client.retry.attempts',
		'    disabled: true',
		'  - name: ydb.client.operation.failed',
		'    disabled: true',
	].join('\n')

	let config = await loadMetricConfig(customYaml)

	assert.ok(!config.metrics.some((m) => m.name === 'ydb.client.retry.attempts'))
	assert.ok(!config.metrics.some((m) => m.name === 'ydb.client.operation.failed'))
	assert.ok(config.metrics.some((m) => m.name === 'ydb.client.operation.duration'))
})

test.if(hasYq())('loadMetricConfig lets a higher-priority file re-enable a metric', async () => {
	process.env['GITHUB_ACTION_PATH'] = process.cwd()

	let { loadMetricConfig } = await import('./metrics.js')

	let inlineYaml = ['metrics:', '  - name: ydb.client.retry.attempts', '    disabled: true'].join(
		'\n'
	)
	let fileYaml = ['metrics:', '  - name: ydb.client.retry.attempts', '    disabled: false'].join(
		'\n'
	)

	let dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ydb-slo-action-metrics-'))
	let filePath = path.join(dir, 'metrics.yaml')
	await fs.writeFile(filePath, fileYaml, { encoding: 'utf-8' })

	let config = await loadMetricConfig(inlineYaml, filePath)
	let metric = config.metrics.find((m) => m.name === 'ydb.client.retry.attempts')

	assert.equal(metric?.disabled, false)
	assert.match(metric?.query || '', /ydb_client_retry_attempts_bucket/)
})
