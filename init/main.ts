import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, info, saveState, setFailed, setOutput } from '@actions/core'
import { exec } from '@actions/exec'

import { getComposeProfiles, getContainerIp, waitForContainerCompletion } from './lib/docker.js'
import { getPullRequestNumber } from './lib/github.js'

process.env['GITHUB_ACTION_PATH'] ??= fileURLToPath(new URL('../..', import.meta.url))

async function main() {
	let cwd = path.join(process.cwd(), '.slo')
	let workload = getInput('workload_name') || 'unspecified'

	saveState('cwd', cwd)
	saveState('pull', await getPullRequestNumber())
	saveState('commit', process.env['GITHUB_SHA'])
	saveState('workload', workload)

	fs.mkdirSync(cwd, { recursive: true })

	await copyAssets(cwd)
	await deployInfra(cwd, workload)
	await waitForWorkloads()
}

async function copyAssets(cwd: string): Promise<void> {
	let deployPath = path.join(process.env['GITHUB_ACTION_PATH']!, 'deploy')

	if (!fs.existsSync(deployPath)) {
		setFailed(`Deploy assets not found at ${deployPath}`)
		return
	}

	for (let entry of fs.readdirSync(deployPath)) {
		let src = path.join(deployPath, entry)
		let dest = path.join(cwd, entry)
		fs.cpSync(src, dest, { recursive: true })
	}

	debug(`Deploy assets copied to ${cwd}`)
}

async function deployInfra(cwd: string, workload: string): Promise<void> {
	let profiles = await getComposeProfiles(cwd)
	let disableProfiles = getInput('disable_compose_profiles') || ''
	profiles = profiles.filter((profile: string) => !disableProfiles.includes(profile))

	let workloadDuration = getInput('workload_duration') || '60'
	let workloadCurrentRef = getInput('workload_current_ref') || 'current'
	let workloadCurrentImage = getInput('workload_current_image')
	let workloadCurrentCommand = getInput('workload_current_command') || ''
	let workloadBaselineRef = getInput('workload_baseline_ref') || 'baseline'
	let workloadBaselineImage = getInput('workload_baseline_image') || ''
	let workloadBaselineCommand = getInput('workload_baseline_command') || ''

	if (workloadCurrentImage) {
		profiles.push('workload-current')
	}
	if (workloadBaselineImage) {
		profiles.push('workload-baseline')
	}

	await exec(`docker`, [`compose`, `up`, `--quiet-pull`, `--quiet-build`, `--detach`], {
		cwd,
		env: {
			...process.env,
			COMPOSE_PROFILES: profiles.join(','),
			WORKLOAD_NAME: workload,
			WORKLOAD_DURATION: workloadDuration,
			WORKLOAD_CURRENT_REF: workloadCurrentRef,
			WORKLOAD_CURRENT_IMAGE: workloadCurrentImage,
			WORKLOAD_CURRENT_COMMAND: workloadCurrentCommand,
			WORKLOAD_BASELINE_REF: workloadBaselineRef,
			WORKLOAD_BASELINE_IMAGE: workloadBaselineImage,
			WORKLOAD_BASELINE_COMMAND: workloadBaselineCommand,
		},
	})

	debug(`Ran with profiles: ${profiles.join(', ')}`)

	if (profiles.includes('telemetry')) {
		let prometheusIp = await getContainerIp('ydb-prometheus')
		setOutput('ydb-prometheus-url', `http://${prometheusIp}:9090`)
		setOutput('ydb-prometheus-otlp', `http://${prometheusIp}:9090/api/v1/otlp`)
	}
}

async function waitForWorkloads(): Promise<void> {
	let start = new Date()
	saveState('start', start.toISOString())
	info(`Workloads started at ${start}`)

	let workloadCurrentImage = getInput('workload_current_image')
	let workloadBaselineImage = getInput('workload_baseline_image') || ''
	let workloadDuration = parseInt(getInput('workload_duration') || '60', 10)
	let workloadTimeoutMs = (workloadDuration + 30) * 1000

	debug(`Workload configuration: duration=${workloadDuration}s, timeout=${workloadTimeoutMs}ms`)

	let workloadsToWait: { name: string; container: string }[] = []

	if (workloadCurrentImage) {
		workloadsToWait.push({ name: 'current', container: 'ydb-workload-current' })
	}
	if (workloadBaselineImage) {
		workloadsToWait.push({ name: 'baseline', container: 'ydb-workload-baseline' })
	}

	if (workloadsToWait.length > 0) {
		info(`Waiting for ${workloadsToWait.length} workload(s) to complete...`)
		info(`  - ${workloadsToWait.map((w) => w.name).join(', ')}`)
		info(`  - Timeout: ${workloadTimeoutMs / 1000}s (workload duration + 30s buffer)`)

		try {
			await Promise.all(
				workloadsToWait.map((w) =>
					waitForContainerCompletion({
						container: w.container,
						timeoutMs: workloadTimeoutMs,
					})
				)
			)
			info('All workloads completed successfully')
		} catch (error) {
			setFailed(`Workload failed: ${error}`)
			throw error
		}
	}

	let finish = new Date()
	saveState('finish', finish.toISOString())
	info(`Workloads finished at ${finish}`)
}

main()
