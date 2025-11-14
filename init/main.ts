import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, info, saveState } from '@actions/core'
import { exec } from '@actions/exec'

import prometheusConfig from './cfg/otel-collector.yml' with { type: 'text' }
import ydbConfig from './cfg/ydb-config.yml' with { type: 'text' }
import chaos from './chaos.sh' with { type: 'text' }

import { generateComposeFile } from './configs.js'
import { HOST, PROMETHEUS_PUSHGATEWAY_PORT } from './constants.js'
import { getPullRequestNumber } from './pulls.js'

async function main() {
	let cwd = path.join(process.cwd(), '.slo')
	let workload = getInput('workload_name') || getInput('sdk_name') || 'unspecified'

	saveState('cwd', cwd)
	saveState('workload', workload)

	debug('Creating working directory...')
	fs.mkdirSync(cwd, { recursive: true })

	PR: {
		info('Aquire pull request number...')
		let prNumber = (await getPullRequestNumber()) || -1
		info(`Pull request number: ${prNumber}`)

		if (prNumber < 0) {
			break PR
		}

		saveState('pull', prNumber)

		info('Writing pull number...')
		let pullPath = path.join(cwd, `${workload}-pull.txt`)
		fs.writeFileSync(pullPath, prNumber.toFixed(0), { encoding: 'utf-8' })
		info(`Pull number written to ${pullPath}`)

		let artifactClient = new DefaultArtifactClient()

		info('Upload pull number as an artifact...')
		let { id } = await artifactClient.uploadArtifact(`${workload}-pull.txt`, [pullPath], cwd, { retentionDays: 1 })
		info(`Pull number uploaded as an artifact ${id}`)
	}

	{
		info('Creating ydb config...')
		let configPath = path.join(cwd, 'ydb.yaml')
		let configContent = ydbConfig.replaceAll('${{ host }}', HOST)

		fs.writeFileSync(configPath, configContent, { encoding: 'utf-8' })
		info(`Created config for ydb: ${configPath}`)
	}

	{
		info('Creating prometheus config...')
		let configPath = path.join(cwd, 'prometheus.yml')
		let configContent = prometheusConfig.replace('${{ pushgateway }}', `${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`)

		fs.writeFileSync(configPath, configContent, { encoding: 'utf-8' })
		info(`Created config for prometheus: ${configPath}`)
	}

	{
		info('Creating chaos script...')
		let scriptPath = path.join(cwd, 'chaos.sh')

		fs.writeFileSync(scriptPath, chaos, { encoding: 'utf-8', mode: 0o755 })
		info(`Created chaos script: ${scriptPath}`)
	}

	{
		info('Creating compose config...')
		let composePath = path.join(cwd, 'compose.yaml')
		let composeContent = generateComposeFile(parseInt(getInput('ydb_database_node_count', { required: true })))

		fs.writeFileSync(composePath, composeContent, { encoding: 'utf-8' })
		info(`Created compose.yaml: ${composePath}`)
	}

	info('Starting YDB...')
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `up`, `--quiet-pull`, `-d`], { cwd })

	let start = new Date()
	info(`YDB started at ${start}`)
	saveState('start', start.toISOString())
}

main()
