import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, getState, info, summary, warning } from '@actions/core'
import { exec } from '@actions/exec'

import { analyzeWorkload } from '../shared/analysis.js'
import { type CollectedMetric, loadMetricConfig } from '../shared/metrics.js'
import { collectAlertsFromPrometheus } from './lib/alerts.js'
import { collectExtraArtifacts } from './lib/artifacts.js'
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
	let thresholdsPath = path.join(cwd, `${workload}-thresholds.yaml`)

	let metricsContent = ''
	let extraArtifactPaths: string[] = []

	try {
		// Per-artifact best-effort: an unavailable source yields an empty file,
		// never a thrown error and never a skipped sibling artifact.
		await persist(logsPath, collectLogs)
		await persist(alertsPath, collectAlerts)
		metricsContent = await persist(metricsPath, collectMetrics)
		await persist(metadataPath, collectMetadata)
	} finally {
		await teardown(cwd)
	}

	try {
		extraArtifactPaths = await collectExtraArtifacts(cwd)
	} catch (err) {
		warning(`Failed to collect extra artifacts: ${err}`)
	}

	let thresholdsContent = await persist(thresholdsPath, collectThresholds)
	let uploads = [logsPath, alertsPath, metricsPath, metadataPath, ...extraArtifactPaths]
	if (thresholdsContent.trim()) {
		uploads.push(thresholdsPath)
	}

	try {
		await uploadArtifacts(workload, uploads, cwd)
	} catch (err) {
		warning(`Artifact upload failed: ${err}`)
	}

	try {
		if (getState('failed')) {
			await writeFailedSummary()
		} else {
			await writeWorkloadSummary(metricsContent)
		}
	} catch (err) {
		warning(`Writing job summary failed: ${err}`)
	}
}

/**
 * Collect best-effort and write to disk. Never throws. A collector that cannot
 * reach its source returns an empty string, so the file is always written.
 */
async function persist(filePath: string, collect: () => Promise<string>): Promise<string> {
	let content = ''

	try {
		content = await collect()
	} catch (err) {
		warning(`Failed to collect ${path.basename(filePath)}: ${err}`)
	}

	try {
		await fs.writeFile(filePath, content, { encoding: 'utf-8' })
	} catch (err) {
		warning(`Failed to write ${path.basename(filePath)}: ${err}`)
	}

	return content
}

/** Tear down the compose project. Never throws — cleanup must always run. */
async function teardown(cwd: string): Promise<void> {
	info('Tearing down infrastructure...')

	try {
		let profiles = await getComposeProfiles(
			cwd,
			getInput('disable_compose_profiles').split(',')
		)
		await exec(`docker`, [`compose`, `-f`, `compose.yml`, `down`], {
			cwd: path.resolve(process.env['GITHUB_ACTION_PATH'], 'deploy'),
			env: {
				...process.env,
				COMPOSE_PROFILES: profiles.join(','),
			},
		})
	} catch (err) {
		warning(`Teardown (docker compose down) failed: ${err}`)
	}
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

	let start = getState('start')
	let finish = getState('finish')
	let prometheusIp = await getContainerIp('ydb-prometheus')

	if (!prometheusIp || !start || !finish) {
		info('Skipping alerts: Prometheus is not available or no time window exists')
		return ''
	}

	let prometheusUrl = `http://${prometheusIp}:9090`
	debug(`Prometheus URL for alerts: ${prometheusUrl}`)

	try {
		let alerts = await collectAlertsFromPrometheus(
			prometheusUrl,
			new Date(start),
			new Date(finish)
		)
		return alerts.map((a) => JSON.stringify(a)).join('\n')
	} catch (err) {
		warning(`Failed to collect alerts: ${err}`)
		return ''
	}
}

async function collectMetrics(): Promise<string> {
	info('Collecting metrics...')

	let start = getState('start')
	let finish = getState('finish')
	let prometheusIp = await getContainerIp('ydb-prometheus')

	if (!prometheusIp || !start || !finish) {
		info('Skipping metrics: Prometheus is not available or no time window exists')
		return ''
	}

	let prometheusUrl = `http://${prometheusIp}:9090`
	debug(`Prometheus URL: ${prometheusUrl}`)

	let config = await loadMetricConfig(getInput('metrics_yaml'), getInput('metrics_yaml_path'))
	let metrics = await collectMetricsFromPrometheus(
		prometheusUrl,
		new Date(start),
		new Date(finish),
		config
	)

	return metrics.map((m) => JSON.stringify(m)).join('\n')
}

async function collectThresholds(): Promise<string> {
	info('Collecting thresholds...')

	let inline = getInput('thresholds_yaml')
	if (inline) {
		debug('Using inline per-scenario thresholds_yaml')
		return inline
	}

	let inputPath = getInput('thresholds_yaml_path')
	if (inputPath) {
		try {
			debug(`Reading per-scenario thresholds from ${inputPath}`)
			return await fs.readFile(inputPath, { encoding: 'utf-8' })
		} catch (error) {
			warning(`Could not read thresholds_yaml_path "${inputPath}": ${String(error)}`)
		}
	}

	return ''
}

async function collectMetadata(): Promise<string> {
	info('Saving metadata...')

	let pull = getState('pull')
	let commit = getState('commit')
	let failed = getState('failed') as '' | 'cluster' | 'workload'

	let startState = getState('start')
	let finishState = getState('finish')
	let start = startState ? new Date(startState) : undefined
	let finish = finishState ? new Date(finishState) : undefined

	let workload = getState('workload')
	let workload_current_ref = getInput('workload_current_ref')
	let workload_baseline_ref = getInput('workload_baseline_ref')

	let content = JSON.stringify({
		pull,
		commit,
		failed,
		repo_url:
			process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY
				? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}`
				: undefined,
		repo_full_name: process.env.GITHUB_REPOSITORY,
		run_id: process.env.GITHUB_RUN_ID,
		run_url:
			process.env.GITHUB_SERVER_URL &&
			process.env.GITHUB_REPOSITORY &&
			process.env.GITHUB_RUN_ID
				? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
				: undefined,
		workload,
		workload_current_ref,
		workload_baseline_ref,
		start_time: start?.toISOString(),
		start_epoch_ms: start?.getTime(),
		finish_time: finish?.toISOString(),
		finish_epoch_ms: finish?.getTime(),
		duration_ms: start && finish ? finish.getTime() - start.getTime() : undefined,
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

	let analysis = analyzeWorkload(workload, metrics, currentRef, baselineRef)

	await writeJobSummary(analysis)
}

async function writeFailedSummary() {
	let workload = getState('workload')
	let failed = getState('failed') as '' | 'cluster' | 'workload'

	summary.addHeading(`Failed ${workload} (${failed || 'unknown'}).`)
	summary.addRaw(
		`See the \`${workload}-logs.txt\` artifact attached to this run for full logs.`,
		true
	)

	await summary.write()
}

post()
