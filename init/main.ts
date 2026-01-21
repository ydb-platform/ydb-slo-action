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
	let disableProfiles = getInput('disable_compose_profiles') || ''

	saveState('cwd', cwd)
	saveState('pull', await getPullRequestNumber())
	saveState('commit', process.env['GITHUB_SHA'])
	saveState('workload', workload)

	fs.mkdirSync(cwd, { recursive: true })

	{
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

	{
		let profiles = await getComposeProfiles(cwd)
		profiles = profiles.filter((profile: string) => !disableProfiles.includes(profile))

		await exec(`docker`, [`compose`, `up`, `--quiet-pull`, `--quiet-build`, `--detach`], {
			cwd,
			env: {
				...process.env,
				COMPOSE_PROFILES: profiles.join(','),
			},
		})

		debug(`Ran with profiles: ${profiles.join(', ')}`)

		info('Waiting for database readiness check to complete...')
		await waitForContainerCompletion({
			container: 'ydb-database-readiness',
		})
		info('All database nodes are ready')

		// prettier-ignore
		let ydbStorageIps = [
			await getContainerIp('ydb-storage-1')
		]

		let ydbDatabaseIps = [
			await getContainerIp('ydb-database-1'),
			await getContainerIp('ydb-database-2'),
			await getContainerIp('ydb-database-3'),
			await getContainerIp('ydb-database-4'),
			await getContainerIp('ydb-database-5'),
		]

		if (profiles.includes('chaos')) {
			ydbDatabaseIps.push(await getContainerIp('ydb-blackhole'))
		}

		setOutput('ydb-storage-ips', ydbStorageIps.filter(Boolean).join(','))
		setOutput('ydb-database-ips', ydbDatabaseIps.filter(Boolean).join(','))

		if (profiles.includes('telemetry')) {
			let prometheusIp = await getContainerIp('ydb-prometheus')
			setOutput('ydb-prometheus-url', `http://${prometheusIp}:9090`)
			setOutput('ydb-prometheus-otlp', `http://${prometheusIp}:9090/api/v1/otlp/v1/metrics`)
		}
	}

	let start = new Date()
	info(`YDB started at ${start}`)
	saveState('start', start.toISOString())
}

main()
