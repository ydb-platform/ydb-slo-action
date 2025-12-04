import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, info, saveState, setFailed } from '@actions/core'
import { exec } from '@actions/exec'

import { getComposeProfiles } from './lib/docker.js'
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
	}

	let start = new Date()
	info(`YDB started at ${start}`)
	saveState('start', start.toISOString())
}

main()
