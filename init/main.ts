import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { debug, getInput, info, saveState, setFailed } from '@actions/core'
import { exec } from '@actions/exec'

import { getPullRequestNumber } from './lib/github.js'

async function main() {
	let cwd = path.join(process.cwd(), '.slo')
	let workload = getInput('workload_name') || 'unspecified'

	saveState('cwd', cwd)
	saveState('workload', workload)

	fs.mkdirSync(cwd, { recursive: true })

	let prNumber = await getPullRequestNumber()
	if (!prNumber) {
		setFailed('Pull request number not found')
		return
	}

	saveState('pull', prNumber)

	{
		let pullPath = path.join(cwd, `${workload}-pull.txt`)
		saveState('pull_info_path', pullPath)
		fs.writeFileSync(pullPath, prNumber.toFixed(0), { encoding: 'utf-8' })

		debug(`Pull request information saved to ${pullPath}`)
	}

	{
		let actionRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../')
		let deployPath = path.join(actionRoot, 'deploy')

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
		await exec(`docker`, [`compose`, `-f`, `compose.yml`, `up`, `--quiet-pull`, `-d`], { cwd })
	}

	let start = new Date()
	info(`YDB started at ${start}`)
	saveState('start', start.toISOString())
}

main()
