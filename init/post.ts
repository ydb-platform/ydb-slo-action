import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, getState, info, warning } from '@actions/core'

import { uploadArtifacts, type ArtifactFile } from './lib/artifacts.js'
import { collectChaosEvents, collectComposeLogs, getContainerIp, stopCompose } from './lib/docker.js'
import { collectMetrics, parseMetricsYaml, type MetricDefinition } from './lib/metrics.js'

async function post() {
	let cwd = getState('cwd')
	let workload = getState('workload')

	let start = new Date(getState('start'))
	let finish = new Date()
	let duration = finish.getTime() - start.getTime()

	let pullPath = getState('pull_info_path')
	let logsPath = path.join(cwd, `${workload}-logs.txt`)
	let metaPath = path.join(cwd, `${workload}-meta.json`)
	let eventsPath = path.join(cwd, `${workload}-events.jsonl`)
	let metricsPath = path.join(cwd, `${workload}-metrics.jsonl`)

	let prometheusIp = await getContainerIp('prometheus', cwd)
	let prometheusUrl = prometheusIp ? `http://${prometheusIp}:9090` : 'http://localhost:9090'
	debug(`Prometheus URL: ${prometheusUrl}`)

	let actionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../')
	let defaultMetricsPath = path.join(actionRoot, 'deploy', 'metrics.yaml')

	let metricsYaml = fs.readFileSync(defaultMetricsPath, { encoding: 'utf-8' })
	let customMetricsYaml = getInput('metrics_yaml')

	if (getInput('metrics_yaml_path')) {
		let customMetricsPath = getInput('metrics_yaml_path')
		if (!fs.existsSync(customMetricsPath)) {
			warning(`Custom metrics file not found: ${customMetricsPath}`)
		} else {
			customMetricsYaml = fs.readFileSync(customMetricsPath, { encoding: 'utf-8' })
		}
	}

	{
		info('Collecting logs...')
		let logs = await collectComposeLogs(cwd)

		fs.writeFileSync(logsPath, logs, { encoding: 'utf-8' })
	}

	{
		info('Collecting chaos events...')
		let events = await collectChaosEvents(cwd)
		let content = events.map((e) => JSON.stringify(e)).join('\n')
		fs.writeFileSync(eventsPath, content, { encoding: 'utf-8' })
	}

	{
		info('Collecting metrics...')

		let metricsDef: MetricDefinition[] = []

		if (metricsYaml) {
			let defaultMetrics = await parseMetricsYaml(metricsYaml)
			metricsDef.push(...defaultMetrics)
		}

		if (customMetricsYaml) {
			let customMetrics = await parseMetricsYaml(customMetricsYaml)
			metricsDef.push(...customMetrics)
		}

		let metrics = await collectMetrics({
			url: prometheusUrl,
			start: start,
			finish: finish,
			metrics: metricsDef,
			timeout: 30000,
		})

		let content = metrics.map((m) => JSON.stringify(m)).join('\n')
		fs.writeFileSync(metricsPath, content, { encoding: 'utf-8' })
	}

	{
		info('Stopping YDB services...')
		await stopCompose(cwd)
	}

	{
		info('Saving test metadata...')

		let metadata: Record<string, any> = {
			workload,
			start_time: start.toISOString(),
			start_epoch_ms: start.getTime(),
			end_time: finish.toISOString(),
			end_epoch_ms: finish.getTime(),
			duration_ms: duration,
		}

		// Add baseline and current refs from inputs
		let currentRef = getInput('workload_current_ref')
		let baselineRef = getInput('workload_baseline_ref')

		if (currentRef) {
			metadata.workload_current_ref = currentRef
			debug(`Workload current ref: ${currentRef}`)
		}

		if (baselineRef) {
			metadata.workload_baseline_ref = baselineRef
			debug(`Workload baseline ref: ${baselineRef}`)
		}

		fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), { encoding: 'utf-8' })
	}

	{
		info('Uploading artifacts...')

		let artifacts: ArtifactFile[] = [
			{ name: `${workload}-pull.txt`, path: pullPath },
			{ name: `${workload}-logs.txt`, path: logsPath },
			{ name: `${workload}-meta.json`, path: metaPath },
			{ name: `${workload}-events.jsonl`, path: eventsPath },
			{ name: `${workload}-metrics.jsonl`, path: metricsPath },
		]

		await uploadArtifacts(workload, artifacts, cwd)
	}

	info(`YDB SLO Test duration: ${(duration / 1000).toFixed(1)}s`)
}

post()
