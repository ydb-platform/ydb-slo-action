import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { DefaultArtifactClient } from '@actions/artifact'
import { debug, getInput, info, setFailed } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { compareWorkloadMetrics, type WorkloadComparison } from '../shared/analysis.js'
import type { FormattedEvent } from '../shared/events.js'
import type { TestMetadata } from '../shared/metadata.js'
import type { CollectedMetric } from '../shared/metrics.js'
import { evaluateWorkloadThresholds, loadThresholdConfig, type ThresholdConfig } from '../shared/thresholds.js'
import { downloadRunArtifacts } from './lib/artifacts.js'
import { generateCheckSummary, generateCheckTitle } from './lib/checks.js'
import { createOrUpdateComment, generateCommentBody } from './lib/comment.js'
import { loadChaosEvents } from './lib/events.js'
import { generateHTMLReport, type HTMLReportData } from './lib/html.js'
import { loadCollectedMetrics } from './lib/metrics.js'

process.env['GITHUB_ACTION_PATH'] ??= fileURLToPath(new URL('../..', import.meta.url))

type WorkloadReport = {
	workload: string
	events: FormattedEvent[]
	metrics: CollectedMetric[]
	metadata: TestMetadata
	thresholds: ThresholdConfig
	comparison: WorkloadComparison

	checkUrl?: string
	reportUrl?: string
}

async function main() {
	let cwd = path.join(process.cwd(), '.slo-reports')
	await fs.mkdir(cwd, { recursive: true })

	let runArtifacts = await downloadRunArtifacts(cwd)
	info(`Found ${runArtifacts.size} artifacts: ${[...runArtifacts.keys()].join(', ')}`)

	if (runArtifacts.size === 0) {
		setFailed('No workload artifacts found in current run')
		return
	}

	let pull = context.issue.number
	let reports: WorkloadReport[] = []
	let thresholds = await loadThresholdConfig(getInput('thresholds_yaml'), getInput('thresholds_yaml_path'))

	for (let [, artifact] of runArtifacts) {
		if (!artifact.metadataPath || !artifact.metricsPath || !artifact.eventsPath) {
			info(`Skipping artifact ${artifact.name}: missing required files`)
			continue
		}

		let events: FormattedEvent[] = loadChaosEvents(await fs.readFile(artifact.eventsPath, 'utf-8'))
		let metrics: CollectedMetric[] = loadCollectedMetrics(await fs.readFile(artifact.metricsPath, 'utf-8'))
		let metadata = JSON.parse(await fs.readFile(artifact.metadataPath, 'utf-8')) as TestMetadata

		if (metadata.pull && metadata.pull !== pull) {
			pull = metadata.pull
		}

		let comparison = compareWorkloadMetrics(
			metadata.workload,
			metrics,
			metadata.workload_current_ref || 'current',
			metadata.workload_baseline_ref || 'baseline',
			'avg',
			thresholds.neutral_change_percent
		)

		let report: WorkloadReport = {
			workload: metadata.workload,
			events,
			metrics,
			metadata,
			thresholds,
			comparison,
		}

		let check = await createWorkloadCheck(`SLO: ${metadata.workload}`, metadata.commit!, comparison, thresholds)
		report.checkUrl = check.url

		reports.push(report)
	}

	await createWorkloadHTMLReport(cwd, reports)

	if (pull) {
		await createPullRequestComment(pull, reports)
	}
}

async function createWorkloadCheck(
	name: string,
	commit: string,
	comparison: WorkloadComparison,
	thresholds: ThresholdConfig,
	reportURL?: string
) {
	let token = getInput('github_token')
	let octokit = getOctokit(token)

	let evaluation = evaluateWorkloadThresholds(comparison.metrics, thresholds)
	let conclusion: 'success' | 'neutral' | 'failure' = 'success'
	if (evaluation.overall === 'failure') conclusion = 'failure'
	if (evaluation.overall === 'warning') conclusion = 'neutral'

	let title = generateCheckTitle(comparison, evaluation)
	let summary = generateCheckSummary(comparison, evaluation, reportURL)

	let { data } = await octokit.rest.checks.create({
		name,
		repo: context.repo.repo,
		owner: context.repo.owner,
		head_sha: commit!,
		status: 'completed',
		conclusion,
		output: {
			title,
			summary,
		},
	})

	debug(`Created check "${name}" with conclusion: ${conclusion}, url: ${data.html_url}`)

	return { id: data.id, url: data.html_url! }
}

async function createWorkloadHTMLReport(cwd: string, reports: WorkloadReport[]) {
	info('📝 Generating HTML reports...')

	let artifactClient = new DefaultArtifactClient()
	let htmlFiles: Array<{ workload: string; path: string }> = []

	for (let report of reports) {
		let htmlData: HTMLReportData = {
			workload: report.workload,
			comparison: report.comparison,
			metrics: report.metrics,
			events: report.events,
			currentRef: report.metadata.workload_current_ref || 'current',
			baselineRef: report.metadata.workload_baseline_ref || 'baseline',
			prNumber: report.metadata.pull!,
			testStartTime: report.metadata?.start_epoch_ms || Date.now() - 10 * 60 * 1000,
			testEndTime: report.metadata?.finish_epoch_ms || Date.now(),
		}

		let html = generateHTMLReport(htmlData)
		let htmlPath = path.join(cwd, `${report.workload}-report.html`)

		await fs.writeFile(htmlPath, html, { encoding: 'utf-8' })
		htmlFiles.push({ workload: report.workload, path: htmlPath })

		let { id } = await artifactClient.uploadArtifact(report.workload + '-html-report', [htmlPath], cwd, {
			retentionDays: 30,
		})

		let runId = context.runId.toString()
		report.reportUrl = `https://api.github.com/repos/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId}/artifacts/${id}`
	}
}

async function createPullRequestComment(issue: number, reports: WorkloadReport[]) {
	info('💬 Creating/updating PR comment...')

	let body = generateCommentBody(
		reports.map((r) => ({
			workload: r.workload,
			comparison: r.comparison,
			thresholds: r.thresholds,
			checkUrl: r.checkUrl,
			reportUrl: r.reportUrl,
		}))
	)
	await createOrUpdateComment(issue, body)
}

main()
