import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec } from "@actions/exec"
import { debug, getInput, getState, saveState } from "@actions/core"
import { DefaultArtifactClient } from '@actions/artifact'
import { collectPrometheus } from '../metrics/prometheus'
import { defaultMetrics } from '../metrics/default'
import { renderReport } from '../report/default'
import { context, getOctokit } from '@actions/github'
import { getCurrentWorkflowRuns } from '../workflow/workflow'

(async function post() {
	let cwd = getState("cwd")
	let sdk = getInput("sdk_name", { required: true })

	let end = new Date()
	let start = new Date(getState("start"))
	saveState("end", end.toISOString())

	let pullNumber = parseInt(getState("issue"))
	let isPullRequest = pullNumber >= 0

	let artifactClient = new DefaultArtifactClient()

	debug("Collecting metrics for head ref...")
	let metrics = await collectPrometheus(start, end, defaultMetrics.metrics)
	debug(`Head ref metrics: ${Object.keys(metrics)}`)

	{
		debug("Writing metrics...")
		let metricsPath = path.join(cwd, `${sdk}-metrics.json`)
		fs.writeFileSync(metricsPath, JSON.stringify(metrics), { encoding: "utf-8" })
		debug(`Metrics written to ${metricsPath}`)

		debug("Upload metrics as an artifact...")
		let { id } = await artifactClient.uploadArtifact(`${sdk}-metrics.json`, [metricsPath], cwd, { retentionDays: 1 })
		debug(`Metrics uploaded as an artifact ${id}`)
	}

	if (!isPullRequest) {
		debug("Not a pull request.")
	} else {
		// debug(`Pull request number: ${pullNumber}`)

		// debug("Fetching information about pull request...")
		// let { data: pr } = await getOctokit(getInput("token", { required: true })).rest.pulls.get({
		// 	owner: context.repo.owner,
		// 	repo: context.repo.repo,
		// 	pull_number: pullNumber,
		// })

		// debug(`Fetching information about previous runs for base branch...`)
		// let runs = await getCurrentWorkflowRuns(pr.base.ref)
		// debug(`Found ${runs.length} completed and successfull runs for default branch.`)

		// debug(`Finding latest run...`)
		// let latestRun = runs[0]
		// debug(`Latest run: ${JSON.stringify(latestRun, null, 4)}`)

		// debug(`Finding latest run artifacts...`)
		// let { data: { artifacts } } = await getOctokit(getInput("token", { required: true })).rest.actions.listWorkflowRunArtifacts({
		// 	owner: context.repo.owner,
		// 	repo: context.repo.repo,
		// 	run_id: latestRun.id,
		// })

		// debug(`Found ${artifacts.length} artifacts: ${JSON.stringify(artifacts, null, 4)}`)

		// debug("Collecting metrics for base ref...")
	}

	debug("Rendering report...")
	let report = renderReport(sdk, metrics)
	debug(`Report: ${report}`)

	{
		debug("Writing report...")
		let reportPath = path.join(cwd, `${sdk}-report.md`)
		fs.writeFileSync(reportPath, report, { encoding: "utf-8" })
		debug(`Report written to ${reportPath}`)

		debug("Upload report as an artifact...")
		let { id } = await artifactClient.uploadArtifact(`${sdk}-report.md`, [reportPath], cwd, { retentionDays: 1 })
		debug(`Report uploaded as an artifact ${id}`)
	}

	{
		debug("Writing pull number...")
		let pullPath = path.join(cwd, `${sdk}-pull.txt`)
		fs.writeFileSync(pullPath, pullNumber.toFixed(0), { encoding: "utf-8" })
		debug(`Pull number written to ${pullPath}`)

		debug("Upload pull number as an artifact...")
		let { id } = await artifactClient.uploadArtifact(`${sdk}-pull.txt`, [pullPath], cwd, { retentionDays: 1 })
		debug(`Pull number uploaded as an artifact ${id}`)
	}

	debug("Stopping YDB...")
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `down`], { cwd })

	debug(`YDB stopped at ${end}`)

	let duration = end.getTime() - start.getTime()
	debug(`YDB SLO Test duration: ${duration}ms.`)

	debug("Cleaning up temp directory...")
	fs.rmSync(cwd, { recursive: true });
})()
