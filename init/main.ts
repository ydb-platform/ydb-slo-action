import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
	debug,
	error,
	getInput,
	info,
	saveState,
	setFailed,
	setOutput,
} from '@actions/core'
import { exec } from '@actions/exec'

import { getComposeProfiles, getContainerIp } from './lib/docker.js'
import { getPullRequestNumber } from './lib/github.js'
import { extraArtifactsPath } from './lib/artifacts.js'
import { waitForWorkloads } from './lib/workloads.js'

process.env['GITHUB_ACTION_PATH'] ??= fileURLToPath(new URL('../..', import.meta.url))

async function main() {
	let cwd = path.join(process.cwd(), '.slo')
	let workload = getInput('workload_name') || 'unspecified'
	let composeFile = getInput('bridge_mode') === 'true' ? 'compose.bridge.yml' : 'compose.yml'

	saveState('cwd', cwd)
	saveState('compose_file', composeFile)
	saveState('pull', await getPullRequestNumber())
	saveState('commit', process.env['GITHUB_SHA'])
	saveState('workload', workload)

	fs.mkdirSync(cwd, { recursive: true })
	fs.mkdirSync(extraArtifactsPath(cwd), { recursive: true })

	await copyAssets(cwd)

	try {
		await deployInfra(cwd, workload, composeFile)
	} catch (err) {
		saveState('failed', 'cluster')
		error(err as Error)
		process.exit(1)
	}

	try {
		await waitForWorkloads(cwd)
	} catch (err) {
		saveState('failed', 'workload')
		error(err as Error)
		process.exit(1)
	}
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

async function deployInfra(cwd: string, workload: string, composeFile: string): Promise<void> {
	let profiles = await getComposeProfiles(
		cwd,
		getInput('disable_compose_profiles').split(','),
		composeFile
	)

	let workloadDuration = getInput('workload_duration') || '60'
	let workloadCurrentRef = getInput('workload_current_ref') || 'current'
	let workloadCurrentImage = getInput('workload_current_image')
	let workloadCurrentCommand = getInput('workload_current_command') || ''
	let workloadBaselineRef = getInput('workload_baseline_ref') || 'baseline'
	let workloadBaselineImage = getInput('workload_baseline_image') || ''
	let workloadBaselineCommand = getInput('workload_baseline_command') || ''

	profiles = profiles.filter(
		(profile) => profile !== 'workload-current' && profile !== 'workload-baseline'
	)

	if (workloadCurrentImage) {
		profiles.push('workload-current')
	}
	if (workloadBaselineImage) {
		profiles.push('workload-baseline')
	}

	let started = false
	for (let attempt = 1; attempt <= 3; attempt++) {
		try {
			await exec(
				`docker`,
				[`compose`, `-f`, composeFile, `up`, `--quiet-pull`, `--quiet-build`, `--detach`],
				{
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
				}
			)
		} catch (err) {
			info(`Failed to start YDB cluster: (${attempt} / 3). ${new String(err)}`)
			continue
		}

		started = true
		break
	}

	if (!started) {
		throw new Error('Failed to start YDB cluster.')
	}

	debug(`Ran ${composeFile} with profiles: ${profiles.join(', ')}`)

	if (profiles.includes('telemetry')) {
		let prometheusIp = await getContainerIp('ydb-prometheus')
		setOutput('ydb-prometheus-url', `http://${prometheusIp}:9090`)
		setOutput('ydb-prometheus-otlp', `http://${prometheusIp}:9090/api/v1/otlp`)
	}
}

await main()
process.exit(0)
