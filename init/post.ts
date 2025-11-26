import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, getState, info } from '@actions/core'
import { exec } from '@actions/exec'

import { compareWorkloadMetrics } from '../shared/analysis.js'
import { loadMetricConfig, type CollectedMetric } from '../shared/metrics.js'
import { collectComposeLogs, copyFromContainer, getContainerIp } from './lib/docker.js'
import { uploadArtifacts } from './lib/github.js'
import { collectMetricsFromPrometheus } from './lib/metrics.js'
import { writeJobSummary } from './lib/summary.js'

process.env['GITHUB_ACTION_PATH'] ??= fileURLToPath(new URL('../..', import.meta.url))

async function post() {
	let cwd = getState('cwd')
	let workload = getState('workload')

	let logsPath = path.join(cwd, `${workload}-logs.txt`)
	let eventsPath = path.join(cwd, `${workload}-events.jsonl`)
	let metricsPath = path.join(cwd, `${workload}-metrics.jsonl`)
	let metadataPath = path.join(cwd, `${workload}-metadata.json`)

	let logsContent = await collectLogs()
	await fs.writeFile(logsPath, logsContent, { encoding: 'utf-8' })

	let eventsContent = await collectEvents()
	await fs.writeFile(eventsPath, eventsContent, { encoding: 'utf-8' })

	let metricsContent = await collectMetrics()
	await fs.writeFile(metricsPath, metricsContent, { encoding: 'utf-8' })

	let metadataContent = await collectMetadata()
	await fs.writeFile(metadataPath, metadataContent, { encoding: 'utf-8' })

	await exec(`docker`, [`compose`, `-f`, `compose.yml`, `down`], {
		cwd: path.resolve(process.env['GITHUB_ACTION_PATH'], 'deploy'),
	})

	await uploadArtifacts(workload, [logsPath, eventsPath, metricsPath, metadataPath], cwd)
	await writeWorkloadSummary(metricsContent)
}

async function collectLogs(): Promise<string> {
	info('Collecting logs...')
	let cwd = getState('cwd')
	let content = await collectComposeLogs(cwd)

	return content
}

async function collectEvents(): Promise<string> {
	info('Collecting events...')

	let content = await copyFromContainer({
		container: 'ydb-chaos-monkey',
		sourcePath: '/var/log/chaos-events.jsonl',
	})

	return content || ''
}

async function collectMetrics(): Promise<string> {
	info('Collecting metrics...')

	let start = new Date(getState('start'))
	let finish = new Date()

	let prometheusIp = await getContainerIp('prometheus')
	let prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : 'http://prometheus:9090'
	debug(`Prometheus URL: ${prometheusUrl}`)

	let config = await loadMetricConfig(getInput('metrics_yaml'), getInput('metrics_yaml_path'))
	let metrics = await collectMetricsFromPrometheus(prometheusUrl, start, finish, config)
	let content = metrics.map((m) => JSON.stringify(m)).join('\n')

	return content
}

async function collectMetadata(): Promise<string> {
	info('Saving metadata...')

	let pull = getState('pull')
	let commit = getState('commit')
	let start = new Date(getState('start'))
	let finish = new Date()
	let duration = finish.getTime() - start.getTime()

	let workload = getState('workload')
	let workload_current_ref = getInput('workload_current_ref')
	let workload_baseline_ref = getInput('workload_baseline_ref')

	let content = JSON.stringify({
		pull,
		commit,
		workload,
		workload_current_ref,
		workload_baseline_ref,
		start_time: start.toISOString(),
		start_epoch_ms: start.getTime(),
		finish_time: finish.toISOString(),
		finish_epoch_ms: finish.getTime(),
		duration_ms: duration,
	})

	return content
}

async function writeWorkloadSummary(metricsContent: string) {
	info('Writing Job Summary...')

	let workload = getState('workload')
	let currentRef = getInput('workload_current_ref')
	let baselineRef = getInput('workload_baseline_ref')

	let metrics = metricsContent
		.split('\n')
		.filter((line) => line.trim().length > 0)
		.map((line) => JSON.parse(line)) as CollectedMetric[]

	let comparison = compareWorkloadMetrics(workload, metrics, currentRef, baselineRef, 'avg')

	await writeJobSummary(comparison)
}

post()
