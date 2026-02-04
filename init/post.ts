import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, getState, info } from '@actions/core'
import { exec } from '@actions/exec'

import { compareWorkloadMetrics } from '../shared/analysis.js'
import { loadMetricConfig, type CollectedMetric } from '../shared/metrics.js'
import { collectAlertsFromPrometheus } from './lib/alerts.js'
import { collectComposeLogs, getComposeProfiles, getContainerIp } from './lib/docker.js'
import { uploadArtifacts } from './lib/github.js'
import { collectMetricsFromPrometheus } from './lib/metrics.js'
import { writeJobSummary } from './lib/summary.js'

process.env['GITHUB_ACTION_PATH'] ??= fileURLToPath(new URL('../..', import.meta.url))

async function post() {
	let cwd = getState('cwd')
	let workload = getState('workload')

	let logsPath = path.join(cwd, `${workload}-logs.txt`)
	let alertsPath = path.join(cwd, `${workload}-alerts.jsonl`)
	let metricsPath = path.join(cwd, `${workload}-metrics.jsonl`)
	let metadataPath = path.join(cwd, `${workload}-metadata.json`)

	let logsContent = await collectLogs()
	await fs.writeFile(logsPath, logsContent, { encoding: 'utf-8' })

	let alertsContent = await collectAlerts()
	await fs.writeFile(alertsPath, alertsContent, { encoding: 'utf-8' })

	let metricsContent = await collectMetrics()
	await fs.writeFile(metricsPath, metricsContent, { encoding: 'utf-8' })

	let metadataContent = await collectMetadata()
	await fs.writeFile(metadataPath, metadataContent, { encoding: 'utf-8' })

	let profiles = await getComposeProfiles(cwd)
	await exec(`docker`, [`compose`, `-f`, `compose.yml`, `down`], {
		cwd: path.resolve(process.env['GITHUB_ACTION_PATH'], 'deploy'),
		env: {
			...process.env,
			COMPOSE_PROFILES: profiles.join(','),
		},
	})

	await uploadArtifacts(workload, [logsPath, alertsPath, metricsPath, metadataPath], cwd)
	await writeWorkloadSummary(metricsContent)
}

async function collectLogs(): Promise<string> {
	info('Collecting logs...')
	let cwd = getState('cwd')
	let profiles = await getComposeProfiles(cwd, getInput('disable_compose_profiles').split(','))
	let content = await collectComposeLogs(cwd, profiles)

	return content
}

async function collectAlerts(): Promise<string> {
	info('Collecting alerts from Prometheus...')

	let start = new Date(getState('start'))
	let finish = getState('finish') ? new Date(getState('finish')) : new Date()

	let prometheusIp = await getContainerIp('ydb-prometheus')
	let prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : 'http://prometheus:9090'
	debug(`Prometheus URL for alerts: ${prometheusUrl}`)

	let alerts = await collectAlertsFromPrometheus(prometheusUrl, start, finish)
	let content = alerts.map((a) => JSON.stringify(a)).join('\n')
	return content
}

async function collectMetrics(): Promise<string> {
	info('Collecting metrics...')

	let start = new Date(getState('start'))
	let finish = getState('finish') ? new Date(getState('finish')) : new Date()

	let prometheusIp = await getContainerIp('ydb-prometheus')
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
	let finish = getState('finish') ? new Date(getState('finish')) : new Date()
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
