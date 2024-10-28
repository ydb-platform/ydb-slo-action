import * as fs from 'node:fs'
import * as path from 'node:path'
import { debug, getInput, saveState, setFailed } from '@actions/core'
import { exec } from '@actions/exec'
import { generateComposeFile, prometheusConfig, ydbConfig } from '../configs'
import { context } from '@actions/github'
import { getPullRequestNumber } from '../help/pulls'

(async function main() {
	debug(JSON.stringify(context, null, 4))

	let cwd = path.join(process.cwd(), ".slo")
	saveState("CWD", cwd)

	debug("Creating working directory...")
	fs.mkdirSync(cwd, { recursive: true })

	{
		debug('Aquire pull request number...')
		let prNumber = await getPullRequestNumber()
		saveState("PRN", prNumber)
		if (!prNumber) {
			setFailed('Pull Request number could not be determined.');
			return
		}
		debug(`Pull request number: ${prNumber}`)
	}

	{
		debug("Creating ydb config...")
		let configPath = path.join(cwd, "ydb.yaml")
		let configContent = ydbConfig
		fs.writeFileSync(configPath, configContent, { encoding: "utf-8" })
		debug(`Created config for ydb: ${configPath}`)
	}

	{
		debug("Creating prometheus config...")
		let configPath = path.join(cwd, "prometheus.yml")
		let configContent = prometheusConfig
		fs.writeFileSync(configPath, configContent, { encoding: "utf-8" })
		debug(`Created config for prometheus: ${configPath}`)
	}

	{
		debug("Creating compose config...")
		let composePath = path.join(cwd, "compose.yaml")
		let composeContent = generateComposeFile(parseInt(getInput("YDB_DATABASE_NODE_COUNT", { required: true })))
		fs.writeFileSync(composePath, composeContent, { encoding: "utf-8" })
		debug(`Created compose.yaml: ${composePath}`)
	}

	debug("Starting YDB...")
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `up`, `--quiet-pull`, `-d`], { cwd })

	let start = new Date()
	debug(`YDB started at ${start}`)
	saveState("YDB_START_TIME", start.toISOString())
})()
