import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, info, warning } from '@actions/core'
import { context, getOctokit } from '@actions/github'
import { renderReport } from './report'
import { getCurrentWorkflowRuns } from './workflow'
import type { Metrics } from './metrics'

type workload = string & { __type: 'workload' }

async function main() {
	let cwd = process.cwd()
	let token = getInput('github_token') || getInput('token')
	let workflowRunId = parseInt(getInput('github_run_id') || getInput('run_id'))
	let artifactClient = new DefaultArtifactClient()

	fs.mkdirSync(cwd, { recursive: true })

	info(`Current directory: ${cwd}`)

	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token,
			workflowRunId,
			repositoryOwner: context.repo.owner,
			repositoryName: context.repo.repo,
		},
	})

	info(`Found ${artifacts.length} artifacts.`)
	debug(`Artifacts: ${JSON.stringify(artifacts, null, 4)}`)

	let rawPulls: Record<workload, string> = {}
	let rawMetrics: Record<workload, string> = {}

	// Download artifacts
	for (let artifact of artifacts) {
		info(`Downloading artifact ${artifact.name}...`)
		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: cwd,
			findBy: {
				token,
				workflowRunId,
				repositoryOwner: context.repo.owner,
				repositoryName: context.repo.repo,
			},
		})

		downloadPath = path.join(downloadPath || cwd, artifact.name)

		info(`Downloaded artifact ${artifact.name} (${artifact.id}) to ${downloadPath}`)

		if (artifact.name.endsWith('-metrics.json')) {
			let workload = artifact.name.slice(0, -'-metrics.json'.length) as workload
			rawMetrics[workload] = fs.readFileSync(downloadPath, { encoding: 'utf-8' })
		}

		if (artifact.name.endsWith('-pull.txt')) {
			let workload = artifact.name.slice(0, -'-pull.txt'.length) as workload
			rawPulls[workload] = fs.readFileSync(downloadPath, { encoding: 'utf-8' })
		}
	}

	let pulls: Record<workload, number> = {}
	let metrics: Record<workload, Metrics> = {}
	let reports: Record<workload, string> = {}
	let comments: Record<workload, number> = {}

	// Parse head pulls
	for (let [workload, value] of Object.entries(rawPulls) as [workload, string][]) {
		pulls[workload] = parseInt(value)
	}

	// Parse head metrics
	for (let [workload, value] of Object.entries(rawMetrics) as [workload, string][]) {
		metrics[workload] = JSON.parse(value)
	}

	// Retrieve workload report comment in pull
	for (let workload of Object.keys(pulls) as workload[]) {
		let pull = pulls[workload]
		if (!pull) {
			continue
		}

		info(`Getting comments for ${pull}...`)
		let { data } = await getOctokit(token).rest.issues.listComments({
			issue_number: pull,
			owner: context.repo.owner,
			repo: context.repo.repo,
		})
		info(`Got ${data.length} comments for ${pull}`)

		for (let comment of data) {
			// TODO: refactor finding report comment
			if (
				(comment.body || comment.body_text || comment.body_html)?.includes(
					`Here are results of SLO test for ${workload}`
				)
			) {
				info(`Found comment for ${workload}: ${comment.html_url}`)
				comments[workload] = comment.id
				break
			}
		}
	}

	// Retrive metrics for base branch
	for (let workload of Object.keys(pulls) as workload[]) {
		let pull = pulls[workload]
		if (!pull) {
			continue
		}

		debug(`Pull request number: ${pull}`)

		info('Fetching information about pull request...')
		let { data: pr } = await getOctokit(token).rest.pulls.get({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: pull,
		})
		info(`Pull request information fetched: ${pr.html_url}`)
		debug(`Pull request information: ${JSON.stringify(pr, null, 4)}`)

		info(`Fetching information about previous runs for base branch...`)
		let runs = await getCurrentWorkflowRuns(token, pr.base.ref)
		info(`Found ${runs.length} completed and successful runs for default branch.`)
		debug(
			`Previous runs for base branch: ${JSON.stringify(
				runs.map((run) => ({ id: run.id, upd: run.updated_at })),
				null,
				4
			)}`
		)

		if (runs.length === 0) {
			warning('No previous runs found.')
			continue
		}

		info(`Finding latest run...`)
		let latestRun = runs[0]
		info(`Latest run: ${latestRun.url}`)
		debug(`Latest run: ${JSON.stringify(latestRun, null, 4)}`)

		info(`Finding latest run artifacts...`)
		let {
			data: { artifacts },
		} = await getOctokit(token).rest.actions.listWorkflowRunArtifacts({
			owner: context.repo.owner,
			repo: context.repo.repo,
			run_id: latestRun.id,
		})
		info(`Found ${artifacts.length} artifacts.`)
		debug(`Latest run artifacts: ${JSON.stringify(artifacts, null, 4)}`)

		let artifact = artifacts.find((artifact) => artifact.name === `${workload}-metrics.json`)
		if (!artifact || artifact.expired) {
			warning('Metrics for base ref not found or expired.')
		} else {
			debug(`Metrics artifact: ${JSON.stringify(artifact, null, 4)}`)

			info(`Downloading artifact ${artifact.id}...`)
			let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
				path: cwd,
				findBy: {
					token,
					workflowRunId: latestRun.workflow_id,
					repositoryOwner: context.repo.owner,
					repositoryName: context.repo.repo,
				},
			})

			downloadPath ??= path.join(cwd, artifact.name)

			info(`Downloaded artifact ${artifact.id} to ${downloadPath}`)

			info(`Extracting metrics from artifact ${artifact.id}...`)
			let baseMetrics = JSON.parse(fs.readFileSync(downloadPath, { encoding: 'utf-8' })) as Metrics

			info(`Metrics extracted from artifact ${artifact.id}: ${Object.keys(baseMetrics)}`)
			debug(`Base metrics: ${JSON.stringify(baseMetrics, null, 4)}`)

			info(`Merging metrics...`)
			for (let [name, baseSeries] of Object.entries(baseMetrics)) {
				if (!metrics[workload][name]) continue

				// base metrics always must be the second
				metrics[workload][name] = metrics[workload][name].concat(baseSeries)
			}
		}
	}

	// Rendering reports
	for (let workload of Object.keys(metrics) as workload[]) {
		if (!metrics[workload]) {
			continue
		}

		info('Rendering report...')
		let report = renderReport(workload, metrics[workload])
		debug(`Report: ${report}`)

		reports[workload] = report
	}

	// Commit report as pull comment
	for (let workload of Object.keys(pulls) as workload[]) {
		let pull = pulls[workload]
		let report = reports[workload]
		let commentId = comments[workload]

		if (!report) {
			continue
		}

		if (commentId) {
			info(`Updating report for ${pull}...`)
			let { data } = await getOctokit(token).rest.issues.updateComment({
				comment_id: commentId,
				owner: context.repo.owner,
				repo: context.repo.repo,
				body: report,
			})
			info(`Report for was ${pull} updated: ${data.html_url}`)
		} else {
			info(`Creating report for ${pull}...`)
			let { data } = await getOctokit(token).rest.issues.createComment({
				issue_number: pull,
				owner: context.repo.owner,
				repo: context.repo.repo,
				body: report,
			})
			info(`Report for ${pull} created: ${data.html_url}`)
		}
	}
}

main()
