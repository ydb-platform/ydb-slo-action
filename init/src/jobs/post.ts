import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec } from "@actions/exec"
import { debug, getInput, getState, info, saveState, warning } from "@actions/core"
import { DefaultArtifactClient } from '@actions/artifact'
import { collectPrometheus } from '../metrics/prometheus'
import { defaultMetrics } from '../metrics/default'
import { renderReport } from '../report/default'
import { context, getOctokit } from '@actions/github'
import { getCurrentWorkflowRuns } from '../workflow/workflow'
import type { Series } from '../report/chart'

(async function post() {
	let cwd = getState("cwd")
	let sdk = getInput("sdk_name", { required: true })
	let warmup = parseInt(getInput("warmup_seconds") || '0')

	let end = new Date()
	let start = new Date(getState("start"))
	saveState("end", end.toISOString())

	let pullNumber = parseInt(getState("issue"))
	let isPullRequest = pullNumber >= 0

	let artifactClient = new DefaultArtifactClient()

	info("Collecting metrics for head ref...")
	let adjStart = new Date(start.getTime() + warmup * 1000) // skip first warmup seconds
	let metrics = await collectPrometheus(adjStart, end, defaultMetrics.metrics)
	info(`Metrics collected for head ref: ${Object.keys(metrics)}`)
	debug(`Head ref metrics: ${Object.keys(metrics)}`)

	{
		info("Writing metrics...")
		let metricsPath = path.join(cwd, `${sdk}-metrics.json`)
		fs.writeFileSync(metricsPath, JSON.stringify(metrics), { encoding: "utf-8" })
		info(`Metrics written to ${metricsPath}`)

		info("Upload metrics as an artifact...")
		let { id } = await artifactClient.uploadArtifact(`${sdk}-metrics.json`, [metricsPath], cwd, { retentionDays: isPullRequest ? 1 : 30 })
		info(`Metrics uploaded as an artifact ${id}`)
	}

	PR:
	if (!isPullRequest) {
		warning("Not a pull request.")
	}
	else {
		debug(`Pull request number: ${pullNumber}`)

		info("Fetching information about pull request...")
		let { data: pr } = await getOctokit(getInput("github_token", { required: true })).rest.pulls.get({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: pullNumber,
		})
		info(`Pull request information fetched: ${pr.html_url}`)
		debug(`Pull request information: ${JSON.stringify(pr, null, 4)}`)

		info(`Fetching information about previous runs for base branch...`)
		let runs = await getCurrentWorkflowRuns(pr.base.ref)
		info(`Found ${runs.length} completed and successful runs for default branch.`)
		debug(`Previous runs for base branch: ${JSON.stringify(runs.map(run => ({ id: run.id, upd: run.updated_at })), null, 4)}`)

		if (runs.length === 0) {
			warning("No previous runs found.")
			break PR
		}

		info(`Finding latest run...`)
		let latestRun = runs[0]
		info(`Latest run: ${latestRun.url}`)
		debug(`Latest run: ${JSON.stringify(latestRun, null, 4)}`)

		info(`Finding latest run artifacts...`)
		let { data: { artifacts } } = await getOctokit(getInput("github_token", { required: true })).rest.actions.listWorkflowRunArtifacts({
			owner: context.repo.owner,
			repo: context.repo.repo,
			run_id: latestRun.id,
		})
		info(`Found ${artifacts.length} artifacts.`)
		debug(`Latest run artifacts: ${JSON.stringify(artifacts, null, 4)}`)

		let artifact = artifacts.find(artifact => artifact.name === `${sdk}-metrics.json`)
		if (!artifact || artifact.expired) {
			warning("Metrics for base ref not found or expired.")
		} else {
			debug(`Metrics artifact: ${JSON.stringify(artifact, null, 4)}`)

			info(`Downloading artifact ${artifact.id}...`)
			let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
				path: cwd,
				findBy: {
					token: getInput("github_token", { required: true }),
					workflowRunId: latestRun.workflow_id,
					repositoryOwner: context.repo.owner,
					repositoryName: context.repo.repo,
				}
			});

			info(`Downloaded artifact ${artifact.name} to ${downloadPath}`)

			info(`Extracting metrics from artifact ${artifact.id}...`)
			let baseMetrics = JSON.parse(fs.readFileSync(path.join(cwd, artifact.name), { encoding: "utf-8" })) as Record<string, Series[]>

			info(`Metrics extracted from artifact ${artifact.id}: ${Object.keys(baseMetrics)}`)
			debug(`Base metrics: ${JSON.stringify(baseMetrics, null, 4)}`)

			info(`Merging metrics...`)
			for (let [name, baseSeries] of Object.entries(baseMetrics)) {
				if (!metrics[name]) continue

				// base metrics always must be the second
				metrics[name] = metrics[name].concat(baseSeries)
			}
		}
	}

	info("Rendering report...")
	let report = renderReport(sdk, metrics)
	debug(`Report: ${report}`)

	{
		info("Writing report...")
		let reportPath = path.join(cwd, `${sdk}-report.md`)
		fs.writeFileSync(reportPath, report, { encoding: "utf-8" })
		info(`Report written to ${reportPath}`)

		info("Upload report as an artifact...")
		let { id } = await artifactClient.uploadArtifact(`${sdk}-report.md`, [reportPath], cwd, { retentionDays: 1 })
		info(`Report uploaded as an artifact ${id}`)
	}

	{
		info("Writing pull number...")
		let pullPath = path.join(cwd, `${sdk}-pull.txt`)
		fs.writeFileSync(pullPath, pullNumber.toFixed(0), { encoding: "utf-8" })
		info(`Pull number written to ${pullPath}`)

		info("Upload pull number as an artifact...")
		let { id } = await artifactClient.uploadArtifact(`${sdk}-pull.txt`, [pullPath], cwd, { retentionDays: 1 })
		info(`Pull number uploaded as an artifact ${id}`)
	}

	info("Stopping YDB...")
	await exec(`docker`, [`compose`, `-f`, `compose.yaml`, `down`], { cwd })

	info(`YDB stopped at ${end}`)

	let duration = end.getTime() - start.getTime()
	info(`YDB SLO Test duration: ${duration}ms.`)

	debug("Cleaning up temp directory...")
	fs.rmSync(cwd, { recursive: true });
})()
