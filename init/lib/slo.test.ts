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
import type { SloResult, SloVerdict } from '../../shared/slo-result.js'

let cases: {
	name: string
	type: string
	baseline: boolean
	missingRef?: string
	missingOperation?: string
	operationTypes?: string[]
	structuredResult?: boolean
	conventionOnly?: boolean
	failedCheck?: boolean
	failures: string[]
	verdict: SloVerdict
}[] = [
	{
		name: 'current and baseline observations pass',
		type: 'table',
		baseline: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'comparison without baseline is invalid',
		type: 'table',
		baseline: false,
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'missing baseline observations are invalid',
		type: 'table',
		baseline: true,
		missingRef: 'main',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'observations require writes as well as reads',
		type: 'table',
		baseline: true,
		missingOperation: 'write',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'process failure overrides healthy observations',
		type: 'table',
		baseline: true,
		failures: ['current exited 1'],
		verdict: 'FAIL',
	},
	{
		name: 'Topic current and baseline observations pass',
		type: 'topic',
		baseline: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Topic can run without a baseline',
		type: 'topic',
		baseline: false,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Topic validates a supplied baseline',
		type: 'topic',
		baseline: true,
		missingRef: 'main',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic requires successful reads',
		type: 'topic',
		baseline: false,
		missingOperation: 'read',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic process failures remain fatal',
		type: 'topic',
		baseline: false,
		failures: ['current exited 1'],
		verdict: 'FAIL',
	},
	{
		name: 'Topic accepts verified results with matching telemetry',
		type: 'topic',
		baseline: true,
		structuredResult: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Topic results require successful writes in telemetry',
		type: 'topic',
		baseline: false,
		structuredResult: true,
		missingOperation: 'write',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic results preserve failed data checks',
		type: 'topic',
		baseline: false,
		structuredResult: true,
		failedCheck: true,
		failures: [],
		verdict: 'FAIL',
	},
	{
		name: 'Topic results require matching telemetry',
		type: 'topic',
		baseline: false,
		structuredResult: true,
		missingRef: 'feature',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic transaction observations pass',
		type: 'topic_tx',
		baseline: false,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Topic transactions validate both supplied workloads',
		type: 'topic_tx',
		baseline: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Topic transactions require supplied baseline telemetry',
		type: 'topic_tx',
		baseline: true,
		missingRef: 'main',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic transactions require successful transaction observations',
		type: 'topic_tx',
		baseline: false,
		missingOperation: 'transaction',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic transaction process failures remain fatal',
		type: 'topic_tx',
		baseline: false,
		failures: ['current exited 1'],
		verdict: 'FAIL',
	},
	{
		name: 'Topic read and write counters do not prove a transaction',
		type: 'topic_tx',
		baseline: false,
		operationTypes: ['read', 'write'],
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic transaction counters do not prove separate reads and writes',
		type: 'topic',
		baseline: false,
		operationTypes: ['transaction'],
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Topic transaction results require matching transaction telemetry',
		type: 'topic_tx',
		baseline: false,
		structuredResult: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Topic transaction results reject absent transaction telemetry',
		type: 'topic_tx',
		baseline: false,
		structuredResult: true,
		missingOperation: 'transaction',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'Table results require successful reads and writes in matching telemetry',
		type: 'table',
		baseline: true,
		structuredResult: true,
		failures: [],
		verdict: 'PASS',
	},
	{
		name: 'Table results cannot hide missing write telemetry',
		type: 'table',
		baseline: true,
		structuredResult: true,
		missingOperation: 'write',
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'convention counters cannot substitute Table workload observations',
		type: 'table',
		baseline: true,
		conventionOnly: true,
		failures: [],
		verdict: 'INVALID',
	},
	{
		name: 'convention counters cannot substitute Topic workload observations',
		type: 'topic',
		baseline: false,
		conventionOnly: true,
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
			INPUT_WORKLOAD_TYPE: fixture.type,
			INPUT_WORKLOAD_CURRENT_REF: 'feature',
			INPUT_WORKLOAD_BASELINE_REF: 'main',
		}
		let previous = Object.fromEntries(Object.keys(inputs).map((key) => [key, process.env[key]]))
		Object.assign(process.env, inputs)
		let originalExec = actionsExec.exec
		let execSpy = spyOn(actionsExec, 'exec').mockImplementation(
			async (command, args, options) => {
				if (command !== 'docker') return originalExec(command, args, options)
				if (!fixture.structuredResult) return 1
				let resultPath = args?.[2]
				if (resultPath === undefined)
					throw new TypeError('Missing Docker result destination')
				let ref = args?.[1]?.startsWith('baseline:') ? 'main' : 'feature'
				let checkVerdict: SloVerdict = fixture.failedCheck ? 'FAIL' : 'PASS'
				let result: SloResult = {
					schemaVersion: 3,
					ref,
					runId: `${ref}-run`,
					kind: fixture.type === 'table' ? 'table' : 'topic',
					verdict: 'PASS',
					checks: (fixture.type === 'table' ? ['T01', 'T02'] : ['P01', 'P02', 'P03']).map(
						(id) => ({
							id,
							verdict: checkVerdict,
							detail: '',
						})
					),
					operations: [
						{ type: 'read', success: 100, error: 0 },
						{ type: 'write', success: 100, error: 0 },
					],
				}
				await fs.writeFile(resultPath, JSON.stringify(result))
				return 0
			}
		)
		let ipSpy = spyOn(docker, 'getContainerIp').mockResolvedValue('127.0.0.1')
		let collectSpy = spyOn(metrics, 'collectMetricsFromPrometheus').mockResolvedValue([])
		let summarySpy = spyOn(summary, 'write').mockResolvedValue(summary)
		let querySpy = spyOn(prometheus, 'queryInstant').mockImplementation(async ({ query }) => {
			let ref = ['feature', 'main'].find((candidate) => query.includes(`ref="${candidate}"`))
			let result: prometheus.PrometheusInstantValue[] = []
			if (ref && ref !== fixture.missingRef) {
				if (
					!fixture.conventionOnly &&
					query.includes('sdk_operations_total') &&
					query.includes('operation_status="success"') &&
					query.includes(' by(operation_type)') &&
					(!fixture.structuredResult || query.includes(`run_id="${ref}-run"`))
				) {
					let operations =
						fixture.operationTypes ??
						(fixture.type === 'topic_tx' ? ['transaction'] : ['read', 'write'])
					result = operations
						.filter((operation) => operation !== fixture.missingOperation)
						.map((operation) => ({
							metric: { operation_type: operation },
							value: [600, '100'],
						}))
				} else if (fixture.conventionOnly && !query.includes('sdk_operations_total')) {
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
