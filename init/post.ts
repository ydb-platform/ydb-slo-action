import * as fs from 'node:fs'
import * as path from 'node:path'

import { exec } from '@actions/exec'
import { debug, getState, info, warning } from '@actions/core'
import { DefaultArtifactClient } from '@actions/artifact'

async function post() {
	let cwd = getState('cwd')
	let workload = getState('workload')

	let start = new Date(getState('start'))
	let finish = new Date()
	let duration = finish.getTime() - start.getTime()

	/**
	 * Stop docker compose
	 */
	{
		await exec(`docker`, [`compose`, `-f`, `compose.yml`, `down`], { cwd })
	}

	let metricsFilePath = getState('telemetry_metrics_file') || path.join(cwd, 'metrics.jsonl')

	/**
	 * Persist telemetry metrics
	 */
	{
		if (fs.existsSync(metricsFilePath)) {
			let artifactClient = new DefaultArtifactClient()
			let { id } = await artifactClient.uploadArtifact(`${workload}-metrics.jsonl`, [metricsFilePath], cwd, {
				retentionDays: 1,
			})

			debug(`Metrics artifact id: ${id}`)
		} else {
			warning(`Metrics file not found at ${metricsFilePath}`)
		}
	}

	/**
	 * Cleanup
	 */
	{
		fs.rmSync(cwd, { recursive: true })
		debug(`Removed .slo workspace: ${cwd}`)

		let seconds = (duration / 1000).toFixed(1)
		info(`YDB SLO Test duration: ${seconds}s`)
	}
}

post()
