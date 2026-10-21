import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import { summary } from '@actions/core'
import * as actionsExec from '@actions/exec'
import { spyOn, test } from 'bun:test'

import * as docker from './docker.js'
import * as metrics from './metrics.js'
import * as prometheus from './prometheus.js'
import { SloRunError, validateWorkloads } from './slo.js'
import type { SloVerdict } from '../../shared/slo-result.js'

let cases: {
	name: string
	schema: string
	baseline: boolean
	missingRef?: string
	missingOperation?: string
	failures: string[]
	verdict: SloVerdict
}[] = [
	{
		name: 'legacy current and baseline observations pass',
		schema: 'legacy_table',
		baseline: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'legacy comparison without baseline is invalid',
		schema: 'legacy_table',
		baseline: false,
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'missing legacy baseline observations are invalid',
		schema: 'legacy_table',
		baseline: true,
		missingRef: 'main',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'legacy observations require writes as well as reads',
		schema: 'legacy_table',
		baseline: true,
		missingOperation: 'write',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'process failure overrides healthy legacy observations',
		schema: 'legacy_table',
		baseline: true,
		failures: ['current exited 1'],
		verdict: 'FAIL',
	},
	{
		name: 'native Topic observations still pass',
		schema: 'native',
		baseline: false,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'missing native Topic observations are invalid',
		schema: 'native',
		baseline: false,
		missingRef: 'feature',
		failures: [],
		verdict: 'INVALID',
	},
]

for (let fixture of cases) {
	test(fixture.name, async () => {
		let cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'ydb-slo-gate-'))
		await fs.mkdir(path.join(cwd, 'extra'))
		let inputs = {
			GITHUB_ACTION_PATH: process.cwd(),
			INPUT_METRICS_SCHEMA: fixture.schema,
			INPUT_WORKLOAD_CURRENT_REF: 'feature',
			INPUT_WORKLOAD_BASELINE_REF: 'main',
		}
		let previous = Object.fromEntries(Object.keys(inputs).map((key) => [key, process.env[key]]))
		Object.assign(process.env, inputs)
		let originalExec = actionsExec.exec
		let execSpy = spyOn(actionsExec, 'exec').mockImplementation(
			async (command, args, options) =>
				command === 'docker' ? 1 : originalExec(command, args, options)
		)
		let ipSpy = spyOn(docker, 'getContainerIp').mockResolvedValue('127.0.0.1')
		let collectSpy = spyOn(metrics, 'collectMetricsFromPrometheus').mockResolvedValue([])
		let summarySpy = spyOn(summary, 'write').mockResolvedValue(summary)
		let querySpy = spyOn(prometheus, 'queryInstant').mockImplementation(async ({ query }) => {
			let ref = ['feature', 'main'].find((candidate) => query.includes(`ref="${candidate}"`))
			let result: prometheus.PrometheusInstantValue[] = []
			if (ref && ref !== fixture.missingRef) {
				if (fixture.schema === 'legacy_table' && query.includes('sdk_operations_total')) {
					result = ['read', 'write']
						.filter((operation) => operation !== fixture.missingOperation)
						.map((operation) => ({
							metric: { operation_type: operation },
							value: [600, '100'],
						}))
				} else if (
					fixture.schema === 'native' &&
					query.includes('ydb_topic_writer_written_messages_total')
				) {
					result = [{ metric: {}, value: [600, '100'] }]
				}
			}
			return { status: 'success', data: { resultType: 'vector', result } }
		})
		try {
			let workloads = [{ name: 'current', container: 'current', ref: 'feature' }]
			if (fixture.baseline)
				workloads.push({ name: 'baseline', container: 'baseline', ref: 'main' })
			let running = validateWorkloads(cwd, workloads, {
				start: new Date(0),
				finish: new Date(600_000),
				failures: fixture.failures,
			})
			if (fixture.verdict === 'PASS') await running
			else await assert.rejects(running, SloRunError)
			let result = JSON.parse(
				await fs.readFile(path.join(cwd, 'extra', 'slo-verdict.json'), 'utf8')
			)
			assert.equal(result.verdict, fixture.verdict)
		} finally {
			execSpy.mockRestore()
			ipSpy.mockRestore()
			collectSpy.mockRestore()
			querySpy.mockRestore()
			summarySpy.mockRestore()
			summary.emptyBuffer()
			for (let [key, value] of Object.entries(previous)) {
				if (value === undefined) delete process.env[key]
				else process.env[key] = value
			}
			await fs.rm(cwd, { recursive: true })
		}
	})
}
