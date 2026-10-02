import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { getInput, info, saveState, setOutput, summary } from '@actions/core'
import { exec } from '@actions/exec'

import { evaluateSloResult, parseSloResult, type SloCheck } from '../../shared/slo-result.js'
import { analyzeSloWorkload } from '../../shared/slo-analysis.js'
import { loadMetricConfig } from '../../shared/metrics.js'
import { loadThresholdConfig } from '../../shared/thresholds.js'
import { extraArtifactsPath } from './artifacts.js'
import { getContainerIp } from './docker.js'
import { queryInstant } from './prometheus.js'
import { collectMetricsFromPrometheus } from './metrics.js'

export type SloWorkload = {
	readonly name: string
	readonly container: string
	readonly ref: string
}

export type SloWindow = {
	readonly start: Date
	readonly finish: Date
	readonly failures: readonly string[]
}

export class SloRunError extends Error {
	constructor(readonly checks: readonly SloCheck[]) {
		super(checks.filter((check) => check.verdict !== 'PASS').map((check) => `${check.id}: ${check.verdict}: ${check.detail}`).join('\n'))
	}
}

export async function validateWorkloads(
	cwd: string,
	workloads: readonly SloWorkload[],
	window: SloWindow
): Promise<void> {
	let thresholds = await loadThresholdConfig(getInput('thresholds_yaml'), getInput('thresholds_yaml_path'))
	let checks: SloCheck[] = window.failures.map((detail) => ({ id: 'process', verdict: 'FAIL', detail }))
	let prometheusIp = await getContainerIp('ydb-prometheus')

	for (let workload of workloads) {
		let resultPath = path.join(extraArtifactsPath(cwd), `${workload.name}-slo-result.json`)
		try {
			let resultExit = await exec('docker', ['cp', `${workload.container}:/tmp/slo-result.json`, resultPath], {
				ignoreReturnCode: true,
			})
			if (resultExit !== 0) {
				if (!prometheusIp) {
					checks.push({ id: workload.name, verdict: 'INVALID', detail: 'Prometheus is unavailable' })
					continue
				}
				let seconds = Math.max(1, Math.ceil((window.finish.getTime() - window.start.getTime()) / 1000))
				let at = window.finish.getTime() / 1000
				let selector = `{ref=${JSON.stringify(workload.ref)},__name__=~"ydb_client_operation_duration_seconds_count|ydb_topic_writer_written_messages_total|ydb_topic_reader_delivered_messages_total"}`
				let response = await queryInstant({
					url: `http://${prometheusIp}:9090`,
					query: `sum(max_over_time(${selector}[${seconds}s] @ ${at}))`,
				})
				let count = Number(response.data?.result[0]?.value[1])
				let observed = response.status === 'success' && Number.isFinite(count) && count > 0
				checks.push({
					id: workload.name,
					verdict: observed ? 'PASS' : 'INVALID',
					detail: observed ? 'Native SDK observations collected' : 'Missing SDK observations',
				})
				continue
			}
			let result = parseSloResult(await fs.readFile(resultPath, 'utf8'))
			let check = evaluateSloResult(result, workload.ref, thresholds)
			checks.push({ ...check, id: workload.name })
			if (check.verdict !== 'PASS') continue

			if (!prometheusIp) {
				checks.push({ id: `${workload.name}/telemetry`, verdict: 'INVALID', detail: 'Prometheus is unavailable' })
				continue
			}
			let selector = `{ref=${JSON.stringify(workload.ref)},run_id=${JSON.stringify(result.runId)}}`
			let sdkMetrics = result.kind === 'table'
				? ['ydb_client_operation_duration_seconds_count']
				: ['ydb_topic_writer_written_messages_total', 'ydb_topic_reader_delivered_messages_total']
			let required = sdkMetrics
			for (let metric of required) {
				let seconds = Math.max(1, Math.ceil((window.finish.getTime() - window.start.getTime()) / 1000))
				let at = window.finish.getTime() / 1000
				let response = await queryInstant({
					url: `http://${prometheusIp}:9090`,
					query: `sum(max_over_time(${metric}${selector}[${seconds}s] @ ${at}))`,
				})
				let count = Number(response.data?.result[0]?.value[1])
				if (response.status !== 'success' || !Number.isFinite(count) || count <= 0) {
					checks.push({ id: `${workload.name}/telemetry`, verdict: 'INVALID', detail: `Missing SDK observations: ${metric}` })
				}
			}
		} catch (error) {
			if (!(error instanceof Error)) throw error
			checks.push({ id: workload.name, verdict: 'INVALID', detail: error.message })
		}
	}

	if (workloads.length === 0) {
		checks.push({ id: 'workload', verdict: 'INVALID', detail: 'No workload executed' })
	}
	if (prometheusIp) {
		let config = await loadMetricConfig(getInput('metrics_yaml'), getInput('metrics_yaml_path'))
		let metrics = await collectMetricsFromPrometheus(
			`http://${prometheusIp}:9090`, window.start, window.finish, config
		)
		let analysis = analyzeSloWorkload(
			getInput('workload_name'), metrics.filter((metric) => metric.role !== 'diagnostic'),
			getInput('workload_current_ref') || 'current',
			getInput('workload_baseline_ref') || 'baseline',
			{ thresholdConfig: thresholds }
		)
		for (let metric of analysis.metrics) {
			if (metric.severity !== 'failure') continue
			checks.push({
				id: metric.name,
				verdict: 'FAIL',
				detail: [...metric.absoluteCheck.violations, ...(metric.relativeCheck?.violations ?? [])].join('; '),
			})
		}
	}
	let verdict = checks.some((check) => check.verdict === 'FAIL')
		? 'FAIL'
		: checks.some((check) => check.verdict === 'INVALID') ? 'INVALID' : 'PASS'
	let result = { schemaVersion: 3, verdict, checks }
	saveState('slo_verdict', JSON.stringify(result))
	setOutput('slo-verdict', verdict)
	await fs.writeFile(path.join(extraArtifactsPath(cwd), 'slo-verdict.json'), JSON.stringify(result, null, 2))
	summary.addHeading(`SLO V3: ${verdict}`)
	for (let check of checks) {
		info(`${check.id}: ${check.verdict}: ${check.detail}`)
		summary.addRaw(`${check.id}: **${check.verdict}** — ${check.detail}\n\n`)
	}
	await summary.write()
	if (verdict !== 'PASS') throw new SloRunError(checks)
}
