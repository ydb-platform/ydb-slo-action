import * as fs from 'node:fs'
import * as path from 'node:path'
import { debug, getInput, info, saveState } from '@actions/core'
import { exec } from '@actions/exec'
import { generateComposeFile, prometheusConfig, ydbConfig } from '../configs'
import { context } from '@actions/github'
import { getPullRequestNumber } from '../help/pulls'

(async function main() {
	debug(JSON.stringify(context, null, 4))

	let cwd = path.join(process.cwd(), ".slo")
	saveState("cwd", cwd)

	debug("Creating working directory...")
	fs.mkdirSync(cwd, { recursive: true })

	{
		info('Aquire pull request number...')
		let prNumber = await getPullRequestNumber() || -1
		info(`Pull request number: ${prNumber}`)
		saveState("issue", prNumber)
	}

	{
		info("Creating ydb config...")
		let configPath = path.join(cwd, "ydb.yaml")
		let configContent = ydbConfig
		fs.writeFileSync(configPath, configContent, { encoding: "utf-8" })
		info(`Created config for ydb: ${configPath}`)
	}

	{
		info("Creating prometheus config...")
		let configPath = path.join(cwd, "prometheus.yml")
		let configContent = prometheusConfig
		fs.writeFileSync(configPath, configContent, { encoding: "utf-8" })
		info(`Created config for prometheus: ${configPath}`)
	}

	{
		info("Creating compose config...")
		let composePath = path.join(cwd, "compose.yaml")
		let composeContent = generateComposeFile(parseInt(getInput("YDB_DATABASE_NODE_COUNT", { required: true })))
		fs.writeFileSync(composePath, composeContent, { encoding: "utf-8" })
		info(`Created compose.yaml: ${composePath}`)
	}

	info("Starting YDB...")
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `up`, `--quiet-pull`, `-d`], { cwd })

	let start = new Date()
	info(`YDB started at ${start}`)
	saveState("start", start.toISOString())
})()
