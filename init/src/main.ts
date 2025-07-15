import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, info, saveState } from '@actions/core'
import { exec } from '@actions/exec'

import chaosDep from './cfg/chaos/compose.yaml' with { type: 'text' }
import chaosSrc from './cfg/chaos/run-chaos.sh' with { type: 'text' }
import promDep from './cfg/prom/compose.yaml' with { type: 'text' }
import promCfg from './cfg/prom/prometheus.yml' with { type: 'text' }
import ydbDep from './cfg/ydb/compose.yaml' with { type: 'text' }
import ydbCfg from './cfg/ydb/ydb-config.yml' with { type: 'text' }
import ydbDockerfile from './cfg/ydb/Dockerfile' with { type: 'text' }
import ydbEntrypoint from './cfg/ydb/entrypoint.sh' with { type: 'text' }

import { getPullRequestNumber } from './pulls'
import { HOST, PROMETHEUS_PUSHGATEWAY_PORT } from './constants'

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
		info('Writing ydb deployment configs...')
		let configPath = path.join(cwd, 'ydb-config.yaml')
		let configContent = ydbCfg.replaceAll('{{ host }}', HOST)

		let deploymentPath = path.join(cwd, 'compose.ydb.yaml')
		let deploymentContent = ydbDep.replaceAll('{{ host }}', HOST)

		let dockerFilePath = path.join(cwd, 'Dockerfile')
		let dockerFileContent = ydbDockerfile.replaceAll('{{ host }}', HOST)

		let entrypointPath = path.join(cwd, 'entrypoint.sh')
		let entrypointContent = ydbEntrypoint.replaceAll('{{ host }}', HOST)

		fs.writeFileSync(dockerFilePath, dockerFileContent, { encoding: 'utf-8' })
		fs.writeFileSync(entrypointPath, entrypointContent, { encoding: 'utf-8', mode: 0o755 })
		fs.writeFileSync(configPath, configContent, { encoding: 'utf-8' })
		fs.writeFileSync(deploymentPath, deploymentContent, { encoding: 'utf-8' })
		info(`Created config for ydb: ${configPath}`)
		info(`Created deployment for ydb: ${deploymentPath}`)
		info(`Created Dockerfile for ydb: ${dockerFilePath}`)
		info(`Created entrypoint for ydb: ${entrypointPath}`)
	}

	{
		info('Creating prometheus deployment configs...')
		let configPath = path.join(cwd, 'prometheus.yml')
		let configContent = promCfg.replace('{{ pushgateway }}', `${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`)

		let deploymentPath = path.join(cwd, 'compose.prometheus.yaml')
		let deploymentContent = promDep.replace('{{ pushgateway }}', `${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`)

		fs.writeFileSync(configPath, configContent, { encoding: 'utf-8' })
		fs.writeFileSync(deploymentPath, deploymentContent, { encoding: 'utf-8' })
		info(`Created config for prometheus: ${configPath}`)
		info(`Created deployment for prometheus: ${deploymentPath}`)
	}

	{
		info('Creating chaos testing deployment configs...')
		let scriptPath = path.join(cwd, 'run-chaos.sh')
		let scriptContent = chaosSrc.replace('{{ host }}', HOST)

		let deploymentPath = path.join(cwd, 'compose.chaos.yaml')
		let deploymentContent = chaosDep.replace('{{ host }}', HOST)

		fs.writeFileSync(scriptPath, scriptContent, { encoding: 'utf-8', mode: 0o755 })
		fs.writeFileSync(deploymentPath, deploymentContent, { encoding: 'utf-8' })
		info(`Created chaos script: ${scriptPath}`)
		info(`Created deployment for chaos: ${deploymentPath}`)
	}

	info('Starting YDB...')
	await exec(
		`docker`,
		[
			`compose`,
			`-f`,
			`compose.ydb.yaml`,
			`-f`,
			`compose.chaos.yaml`,
			`-f`,
			`compose.prometheus.yaml`,
			`up`,
			`--quiet-pull`,
			`-d`,
		],
		{ cwd }
	)

	let start = new Date()
	info(`YDB started at ${start}`)
	saveState('start', start.toISOString())
}

main()
