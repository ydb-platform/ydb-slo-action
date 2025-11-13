// src/main.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, info, warning } from '@actions/core'
import { context as context2, getOctokit as getOctokit2 } from '@actions/github'

// src/colors.ts
var palette = [
	'#FF7F0E',
	'#1F77B4',
	'#D62728',
	'#2CA02C',
	'#9467BD',
	'#8C564B',
	'#E377C2',
	'#7F7F7F',
	'#BCBD22',
	'#17BECF',
]

// src/chart.ts
function renderChart(title, series, xLabel = '', yLabel = '', palette2 = palette) {
	let minLength = Number.POSITIVE_INFINITY
	for (let s of series)
		if (((s.values = s.values.filter((v) => v[1] != '0')), s.values.length < minLength)) minLength = s.values.length
	for (let s of series) s.values = s.values.slice(-1 * minLength)
	let { POSITIVE_INFINITY: min, NEGATIVE_INFINITY: max } = Number,
		lines = []
	for (let s of series) {
		let line = []
		for (let [, value] of s.values) {
			let v = parseFloat(value)
			if (isNaN(v)) v = 0
			let vR = Math.round(v * 1000) / 1000,
				vF = Math.floor(v * 1000) / 1000,
				vC = Math.ceil(v * 1000) / 1000
			if ((line.push(vR), vF < min)) min = vF
			if (vC > max) max = vC
		}
		lines.push(`line [${line.join()}]`)
	}
	return `\`\`\`mermaid
---
config:
    xyChart:
        width: 1200
        height: 400
    themeVariables:
        xyChart:
            titleColor: "#222"
            backgroundColor: "#fff"
            xAxisLineColor: "#222"
            yAxisLineColor: "#222"
            plotColorPalette: "${palette2.join()}"
---
xychart-beta
    title "${title}"
    x-axis "${xLabel}" 0 --> 10
    y-axis "${yLabel}" ${Math.floor(min * 0.9)} --> ${Math.ceil(max * 1.1)}
    ${lines.join('\n    ')}
\`\`\`
`
}

// src/report.ts
var renderReport = (variant, metrics) => `\uD83C\uDF0B Here are results of SLO test for ${variant}:

### Operation Success Rate

${renderChart('operation_type=read', metrics.read_availability, 'Time, m', 'Success Rate, %')}

${renderChart('operation_type=write', metrics.write_availability, '	Time, m', 'Success Rate, %')}

### Operations Per Second

${renderChart('operation_type=read', metrics.read_throughput, 'Time, m', 'Operations')}

${renderChart('operation_type=write', metrics.write_throughput, 'Time, m', 'Operations')}

### 95th Percentile Latency

${renderChart('operation_type=read', metrics.read_latency_ms, 'Time, m', 'Latency, ms')}

${renderChart('operation_type=write', metrics.write_latency_ms, 'Time, m', 'Latency, ms')}
`

// src/workflow.ts
import { context, getOctokit } from '@actions/github'
async function getCurrentWorkflowRuns(token, branch) {
	let {
			data: { workflows },
		} = await getOctokit(token).rest.actions.listRepoWorkflows({
			owner: context.repo.owner,
			repo: context.repo.repo,
		}),
		workflow = workflows.find((workflow2) => workflow2.name === context.workflow)
	if (!workflow) return []
	let {
		data: { workflow_runs },
	} = await getOctokit(token).rest.actions.listWorkflowRuns({
		owner: context.repo.owner,
		repo: context.repo.repo,
		workflow_id: workflow.id,
		branch,
		status: 'completed',
	})
	return workflow_runs.filter((run) => run.conclusion === 'success')
}

// src/main.ts
async function main() {
	let cwd = process.cwd(),
		token = getInput('github_token') || getInput('token'),
		workflowRunId = parseInt(getInput('github_run_id') || getInput('run_id')),
		artifactClient = new DefaultArtifactClient()
	;(fs.mkdirSync(cwd, { recursive: !0 }), info(`Current directory: ${cwd}`))
	let { artifacts } = await artifactClient.listArtifacts({
		findBy: {
			token,
			workflowRunId,
			repositoryOwner: context2.repo.owner,
			repositoryName: context2.repo.repo,
		},
	})
	;(info(`Found ${artifacts.length} artifacts.`), debug(`Artifacts: ${JSON.stringify(artifacts, null, 4)}`))
	let rawPulls = {},
		rawMetrics = {}
	for (let artifact of artifacts) {
		info(`Downloading artifact ${artifact.name}...`)
		let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
			path: cwd,
			findBy: {
				token,
				workflowRunId,
				repositoryOwner: context2.repo.owner,
				repositoryName: context2.repo.repo,
			},
		})
		if (
			((downloadPath = path.join(downloadPath || cwd, artifact.name)),
			info(`Downloaded artifact ${artifact.name} (${artifact.id}) to ${downloadPath}`),
			artifact.name.endsWith('-metrics.json'))
		) {
			let workload = artifact.name.slice(0, -'-metrics.json'.length)
			rawMetrics[workload] = fs.readFileSync(downloadPath, { encoding: 'utf-8' })
		}
		if (artifact.name.endsWith('-pull.txt')) {
			let workload = artifact.name.slice(0, -'-pull.txt'.length)
			rawPulls[workload] = fs.readFileSync(downloadPath, { encoding: 'utf-8' })
		}
	}
	let pulls = {},
		metrics = {},
		reports = {},
		comments = {}
	for (let [workload, value] of Object.entries(rawPulls)) pulls[workload] = parseInt(value)
	for (let [workload, value] of Object.entries(rawMetrics)) metrics[workload] = JSON.parse(value)
	for (let workload of Object.keys(pulls)) {
		let pull = pulls[workload]
		if (!pull) continue
		info(`Getting comments for ${pull}...`)
		let { data } = await getOctokit2(token).rest.issues.listComments({
			issue_number: pull,
			owner: context2.repo.owner,
			repo: context2.repo.repo,
		})
		info(`Got ${data.length} comments for ${pull}`)
		for (let comment of data)
			if (
				(comment.body || comment.body_text || comment.body_html)?.includes(
					`Here are results of SLO test for ${workload}`
				)
			) {
				;(info(`Found comment for ${workload}: ${comment.html_url}`), (comments[workload] = comment.id))
				break
			}
	}
	for (let workload of Object.keys(pulls)) {
		let pull = pulls[workload]
		if (!pull) continue
		;(debug(`Pull request number: ${pull}`), info('Fetching information about pull request...'))
		let { data: pr } = await getOctokit2(token).rest.pulls.get({
			owner: context2.repo.owner,
			repo: context2.repo.repo,
			pull_number: pull,
		})
		;(info(`Pull request information fetched: ${pr.html_url}`),
			debug(`Pull request information: ${JSON.stringify(pr, null, 4)}`),
			info('Fetching information about previous runs for base branch...'))
		let runs = await getCurrentWorkflowRuns(token, pr.base.ref)
		if (
			(info(`Found ${runs.length} completed and successful runs for default branch.`),
			debug(
				`Previous runs for base branch: ${JSON.stringify(
					runs.map((run) => ({ id: run.id, upd: run.updated_at })),
					null,
					4
				)}`
			),
			runs.length === 0)
		) {
			warning('No previous runs found.')
			continue
		}
		info('Finding latest run...')
		let latestRun = runs[0]
		;(info(`Latest run: ${latestRun.url}`),
			debug(`Latest run: ${JSON.stringify(latestRun, null, 4)}`),
			info('Finding latest run artifacts...'))
		let {
			data: { artifacts: artifacts2 },
		} = await getOctokit2(token).rest.actions.listWorkflowRunArtifacts({
			owner: context2.repo.owner,
			repo: context2.repo.repo,
			run_id: latestRun.id,
		})
		;(info(`Found ${artifacts2.length} artifacts.`),
			debug(`Latest run artifacts: ${JSON.stringify(artifacts2, null, 4)}`))
		let artifact = artifacts2.find((artifact2) => artifact2.name === `${workload}-metrics.json`)
		if (!artifact || artifact.expired) warning('Metrics for base ref not found or expired.')
		else {
			;(debug(`Metrics artifact: ${JSON.stringify(artifact, null, 4)}`),
				info(`Downloading artifact ${artifact.id}...`))
			let { downloadPath } = await artifactClient.downloadArtifact(artifact.id, {
				path: cwd,
				findBy: {
					token,
					workflowRunId: latestRun.workflow_id,
					repositoryOwner: context2.repo.owner,
					repositoryName: context2.repo.repo,
				},
			})
			;((downloadPath ??= path.join(cwd, artifact.name)),
				info(`Downloaded artifact ${artifact.id} to ${downloadPath}`),
				info(`Extracting metrics from artifact ${artifact.id}...`))
			let baseMetrics = JSON.parse(fs.readFileSync(downloadPath, { encoding: 'utf-8' }))
			;(info(`Metrics extracted from artifact ${artifact.id}: ${Object.keys(baseMetrics)}`),
				debug(`Base metrics: ${JSON.stringify(baseMetrics, null, 4)}`),
				info('Merging metrics...'))
			for (let [name, baseSeries] of Object.entries(baseMetrics)) {
				if (!metrics[workload][name]) continue
				metrics[workload][name] = metrics[workload][name].concat(baseSeries)
			}
		}
	}
	for (let workload of Object.keys(metrics)) {
		if (!metrics[workload]) continue
		info('Rendering report...')
		let report = renderReport(workload, metrics[workload])
		;(debug(`Report: ${report}`), (reports[workload] = report))
	}
	for (let workload of Object.keys(pulls)) {
		let pull = pulls[workload],
			report = reports[workload],
			commentId = comments[workload]
		if (!report) continue
		if (commentId) {
			info(`Updating report for ${pull}...`)
			let { data } = await getOctokit2(token).rest.issues.updateComment({
				comment_id: commentId,
				owner: context2.repo.owner,
				repo: context2.repo.repo,
				body: report,
			})
			info(`Report for was ${pull} updated: ${data.html_url}`)
		} else {
			info(`Creating report for ${pull}...`)
			let { data } = await getOctokit2(token).rest.issues.createComment({
				issue_number: pull,
				owner: context2.repo.owner,
				repo: context2.repo.repo,
				body: report,
			})
			info(`Report for ${pull} created: ${data.html_url}`)
		}
	}
}
main()
