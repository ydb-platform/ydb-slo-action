import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getState, info, warning } from '@actions/core'
import { exec } from '@actions/exec'

async function post() {
	let cwd = getState('cwd')
	let workload = getState('workload')

	let start = new Date(getState('start'))
	let finish = new Date()
	let duration = finish.getTime() - start.getTime()

	const artifactClient = new DefaultArtifactClient()
	let composeLogsPath = path.join(cwd, `${workload}-compose.log`)
	let metricsFilePath = getState('telemetry_metrics_file') || path.join(cwd, 'metrics.jsonl')
	let pullInfoPath = getState('pull_info_path')

	/**
	 * Collect docker compose logs
	 */
	{
		const chunks: string[] = []

		try {
			await exec(`docker`, [`compose`, `-f`, `compose.yml`, `logs`, `--no-color`], {
				cwd,
				silent: true,
				listeners: {
					stdout: (data) => chunks.push(data.toString()),
					stderr: (data) => chunks.push(data.toString()),
				},
			})

			fs.writeFileSync(composeLogsPath, chunks.join(''), { encoding: 'utf-8' })
			debug(`docker compose logs saved to ${composeLogsPath}`)
		} catch (error) {
			warning(`Failed to collect docker compose logs: ${String(error)}`)
			composeLogsPath = ''
		}
	}

	/**
	 * Stop docker compose
	 */
	{
		await exec(`docker`, [`compose`, `-f`, `compose.yml`, `down`], { cwd })
	}

	/**
	 * Persist telemetry metrics
	 */
	{
		if (!metricsFilePath || !fs.existsSync(metricsFilePath)) {
			warning(`Metrics file not found at ${metricsFilePath}`)
			metricsFilePath = ''
		}
	}

	/**
	 * Upload artifacts
	 */
	{
		const artifacts = [
			pullInfoPath ? { name: `${workload}-pull.txt`, path: pullInfoPath } : null,
			composeLogsPath ? { name: `${workload}-compose.log`, path: composeLogsPath } : null,
			metricsFilePath ? { name: `${workload}-metrics.jsonl`, path: metricsFilePath } : null,
		].filter(Boolean) as { name: string; path: string }[]

		for (const artifact of artifacts) {
			if (!fs.existsSync(artifact.path)) {
				warning(`Artifact source missing: ${artifact.path}`)
				continue
			}

			let { id } = await artifactClient.uploadArtifact(artifact.name, [artifact.path], cwd, {
				retentionDays: 1,
			})

			info(`Uploaded artifact ${artifact.name} (id: ${id})`)
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
