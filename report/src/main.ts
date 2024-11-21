import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, info, warning } from '@actions/core'
import { context, getOctokit } from '@actions/github'
import { renderReport } from './report'
import { getCurrentWorkflowRuns } from './workflow'
import type { Metrics } from './metrics'

type variant = string & { __type: 'variant' }

async function main() {
	let cwd = process.cwd()
	let artifactClient = new DefaultArtifactClient()

	fs.mkdirSync(cwd, { recursive: true })

	info(`Current directory: ${cwd}`)

	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token: getInput('token', { required: true }),
			workflowRunId: parseInt(getInput('run_id', { required: true })),
			repositoryOwner: context.repo.owner,
			repositoryName: context.repo.repo,
		},
	})

	info(`Found ${artifacts.length} artifacts.`)
	debug(`Artifacts: ${JSON.stringify(artifacts, null, 4)}`)

	let rawPulls: Record<variant, string> = {}
	let rawMetrics: Record<variant, string> = {}

	// Download artifacts
	for (let artifact of artifacts) {
		info(`Downloading artifact ${artifact.name}...`)
		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: cwd,
			findBy: {
				token: getInput('token', { required: true }),
				workflowRunId: parseInt(getInput('run_id', { required: true })),
				repositoryOwner: context.repo.owner,
				repositoryName: context.repo.repo,
			},
		})

		downloadPath = path.join(downloadPath || cwd, artifact.name)

		info(`Downloaded artifact ${artifact.name} (${artifact.id}) to ${downloadPath}`)

		if (artifact.name.endsWith('-metrics.json')) {
			let variant = artifact.name.slice(0, -'-metrics.json'.length) as variant
			rawMetrics[variant] = fs.readFileSync(downloadPath, { encoding: 'utf-8' })
		}

		if (artifact.name.endsWith('-pull.txt')) {
			let variant = artifact.name.slice(0, -'-pull.txt'.length) as variant
			rawPulls[variant] = fs.readFileSync(downloadPath, { encoding: 'utf-8' })
		}
	}

	let pulls: Record<variant, number> = {}
	let metrics: Record<variant, Metrics> = {}
	let reports: Record<variant, string> = {}
	let comments: Record<variant, number> = {}

	// Parse head pulls
	for (let [variant, value] of Object.entries(rawPulls) as [variant, string][]) {
		pulls[variant] = parseInt(value)
	}

	// Parse head metrics
	for (let [variant, value] of Object.entries(rawMetrics) as [variant, string][]) {
		metrics[variant] = JSON.parse(value)
	}

	// Retrieve variant report comment in pull
	for (let variant of Object.keys(pulls) as variant[]) {
		let pull = pulls[variant]
		if (!pull) {
			continue
		}

		info(`Getting comments for ${pull}...`)
		let { data } = await getOctokit(getInput('token', { required: true })).rest.issues.listComments({
			issue_number: pull,
			owner: context.repo.owner,
			repo: context.repo.repo,
		})
		info(`Got ${data.length} comments for ${pull}`)

		for (let comment of data) {
			// TODO: refactor finding report comment
			if (
				(comment.body || comment.body_text || comment.body_html)?.includes(
					`Here are results of SLO test for ${variant}`
				)
			) {
				info(`Found comment for ${variant}: ${comment.html_url}`)
				comments[variant] = comment.id
				break
			}
		}
	}

	// Retrive metrics for base branch
	for (let variant of Object.keys(pulls) as variant[]) {
		let pull = pulls[variant]
		if (!pull) {
			continue
		}

		debug(`Pull request number: ${pull}`)

		info('Fetching information about pull request...')
		let { data: pr } = await getOctokit(getInput('token', { required: true })).rest.pulls.get({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: pull,
		})
		info(`Pull request information fetched: ${pr.html_url}`)
		debug(`Pull request information: ${JSON.stringify(pr, null, 4)}`)

		info(`Fetching information about previous runs for base branch...`)
		let runs = await getCurrentWorkflowRuns(pr.base.ref)
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
		} = await getOctokit(getInput('token', { required: true })).rest.actions.listWorkflowRunArtifacts({
			owner: context.repo.owner,
			repo: context.repo.repo,
			run_id: latestRun.id,
		})
		info(`Found ${artifacts.length} artifacts.`)
		debug(`Latest run artifacts: ${JSON.stringify(artifacts, null, 4)}`)

		let artifact = artifacts.find((artifact) => artifact.name === `${variant}-metrics.json`)
		if (!artifact || artifact.expired) {
			warning('Metrics for base ref not found or expired.')
		} else {
			debug(`Metrics artifact: ${JSON.stringify(artifact, null, 4)}`)

			info(`Downloading artifact ${artifact.id}...`)
			let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
				path: cwd,
				findBy: {
					token: getInput('token', { required: true }),
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
				if (!metrics[variant][name]) continue

				// base metrics always must be the second
				metrics[variant][name] = metrics[variant][name].concat(baseSeries)
			}
		}
	}

	// Rendering reports
	for (let variant of Object.keys(metrics) as variant[]) {
		if (!metrics[variant]) {
			continue
		}

		info('Rendering report...')
		let report = renderReport(variant, metrics[variant])
		debug(`Report: ${report}`)

		reports[variant] = report
	}

	// Commit report as pull comment
	for (let variant of Object.keys(pulls) as variant[]) {
		let pull = pulls[variant]
		let report = reports[variant]
		let commentId = comments[variant]

		if (!report) {
			continue
		}

		if (commentId) {
			info(`Updating report for ${pull}...`)
			let { data } = await getOctokit(getInput('token', { required: true })).rest.issues.updateComment({
				comment_id: commentId,
				owner: context.repo.owner,
				repo: context.repo.repo,
				body: report,
			})
			info(`Report for was ${pull} updated: ${data.html_url}`)
		} else {
			info(`Creating report for ${pull}...`)
			let { data } = await getOctokit(getInput('token', { required: true })).rest.issues.createComment({
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
