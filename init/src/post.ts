import * as fs from 'node:fs'
import * as path from 'node:path'

import { exec } from '@actions/exec'
import { debug, getInput, getState, info, warning } from '@actions/core'
import { DefaultArtifactClient } from '@actions/artifact'

import { collectPrometheus } from './prometheus'
import { defaultMetrics } from './metrics'
;(async function post() {
	let cwd = getState('cwd')
	let sdk = getState('sdk')
	let pull = getState('pull')
	let warmup = parseInt(getInput('warmup_seconds') || '0')

	let end = new Date()
	let start = new Date(getState('start'))

	let artifactClient = new DefaultArtifactClient()

	info('Collecting metrics for head ref...')
	let adjStart = new Date(start.getTime() + warmup * 1000) // skip first warmup seconds
	let metrics = await collectPrometheus(adjStart, end, defaultMetrics)
	info(`Metrics collected for head ref: ${Object.keys(metrics)}`)
	debug(`Head ref metrics: ${Object.keys(metrics)}`)

	if (!Object.keys(metrics).length) {
		warning('No metrics collected.')
		return
	}

	{
		info('Writing metrics...')
		let metricsPath = path.join(cwd, `${sdk}-metrics.json`)
		fs.writeFileSync(metricsPath, JSON.stringify(metrics), { encoding: 'utf-8' })
		info(`Metrics written to ${metricsPath}`)

		info('Upload metrics as an artifact...')
		let { id } = await artifactClient.uploadArtifact(`${sdk}-metrics.json`, [metricsPath], cwd, {
			retentionDays: pull ? 1 : 30,
		})
		info(`Metrics uploaded as an artifact ${id}`)
	}

	info('Stopping YDB...')
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `down`], { cwd })

	info(`YDB stopped at ${end}`)

	let duration = end.getTime() - start.getTime()
	info(`YDB SLO Test duration: ${duration}ms.`)

	debug('Cleaning up temp directory...')
	fs.rmSync(cwd, { recursive: true })
})()
