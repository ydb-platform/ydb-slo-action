/**
 * SLO Report Action - Main Orchestrator
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { getInput, info, setFailed, warning } from '@actions/core'
import { context, getOctokit } from '@actions/github'

import { compareWorkloadMetrics } from './lib/analysis.js'
import { downloadWorkloadArtifacts } from './lib/artifacts.js'
import { createWorkloadCheck } from './lib/checks.js'
import { createOrUpdateComment, generateCommentBody } from './lib/comment.js'
import { generateHTMLReport, type HTMLReportData } from './lib/html.js'
import { writeJobSummary } from './lib/summary.js'
import { loadThresholds } from './lib/thresholds.js'

async function main() {
	try {
		let cwd = path.join(process.cwd(), '.slo-reports')
		let token = getInput('github_token') || getInput('token')
		let runId = parseInt(getInput('github_run_id') || getInput('run_id') || String(context.runId))

		if (!token) {
			setFailed('github_token is required')
			return
		}

		fs.mkdirSync(cwd, { recursive: true })
		info(`Working directory: ${cwd}`)

		// Step 1: Get SHA from the workflow run (for GitHub Checks)
		info('🔍 Fetching workflow run information...')
		let octokit = getOctokit(token)
		let { data: workflowRun } = await octokit.rest.actions.getWorkflowRun({
			owner: context.repo.owner,
			repo: context.repo.repo,
			run_id: runId,
		})
		let headSha = workflowRun.head_sha
		info(`Workflow run SHA: ${headSha}`)

		// Step 2: Download artifacts from current run
		// NOTE: Artifacts already contain both current and base series (collected in init action)
		info('📦 Downloading artifacts from current run...')
		let workloads = await downloadWorkloadArtifacts({
			token,
			workflowRunId: runId,
			repositoryOwner: context.repo.owner,
			repositoryName: context.repo.repo,
			downloadPath: cwd,
		})

		if (workloads.length === 0) {
			warning('No workload artifacts found in current run')
			return
		}

		info(`Found ${workloads.length} workloads: ${workloads.map((w) => w.workload).join(', ')}`)

		// Step 2: Get PR number (optional - may not exist for non-PR workflows)
		let prNumber = workloads[0]?.pullNumber
		if (prNumber) {
			info(`Processing PR #${prNumber}`)
		} else {
			info('No PR associated with this run (non-PR workflow)')
		}

		// Step 3: Load thresholds configuration
		info('⚙️  Loading thresholds configuration...')
		let thresholds = await loadThresholds(getInput('thresholds_yaml'), getInput('thresholds_yaml_path'))
		info(`Loaded thresholds: neutral_change=${thresholds.neutral_change_percent}%`)

		// Step 4: Analyze metrics
		info('📊 Analyzing metrics...')
		let comparisons = workloads.map((w) => {
			let currentRef = w.metadata?.workload_current_ref || 'current'
			let baselineRef = w.metadata?.workload_baseline_ref || 'base'
			return compareWorkloadMetrics(
				w.workload,
				w.metrics,
				currentRef,
				baselineRef,
				'avg',
				thresholds.neutral_change_percent
			)
		})

		// Step 5: Generate HTML reports
		info('📝 Generating HTML reports...')

		let htmlReportsPath = path.join(cwd, 'reports')
		fs.mkdirSync(htmlReportsPath, { recursive: true })

		let htmlFiles: Array<{ workload: string; path: string }> = []

		for (let i = 0; i < workloads.length; i++) {
			let workload = workloads[i]
			let comparison = comparisons[i]

			// Use refs from metadata for display
			let currentRef = workload.metadata?.workload_current_ref || 'current'
			let baselineRef = workload.metadata?.workload_baseline_ref || 'baseline'

			let htmlData: HTMLReportData = {
				workload: workload.workload,
				comparison,
				metrics: workload.metrics,
				events: workload.events,
				currentRef,
				baselineRef,
				prNumber: prNumber || 0,
				testStartTime: workload.metadata?.start_epoch_ms || Date.now() - 10 * 60 * 1000,
				testEndTime: workload.metadata?.end_epoch_ms || Date.now(),
			}

			let html = generateHTMLReport(htmlData)
			let htmlPath = path.join(htmlReportsPath, `${workload.workload}-report.html`)

			fs.writeFileSync(htmlPath, html, { encoding: 'utf-8' })
			htmlFiles.push({ workload: workload.workload, path: htmlPath })

			info(`Generated HTML report for ${workload.workload}`)
		}

		// Step 6: Upload HTML reports as artifacts
		info('📤 Uploading HTML reports...')

		let artifactClient = new DefaultArtifactClient()
		let uploadResult = await artifactClient.uploadArtifact(
			'slo-reports',
			htmlFiles.map((f) => f.path),
			htmlReportsPath,
			{
				retentionDays: 30,
			}
		)

		info(`Uploaded HTML reports as artifact: ${uploadResult.id}`)

		// Step 7: Create GitHub Checks
		info('✅ Creating GitHub Checks...')

		let checkUrls = new Map<string, string>()

		for (let comparison of comparisons) {
			try {
				let check = await createWorkloadCheck({
					token,
					owner: context.repo.owner,
					repo: context.repo.repo,
					sha: headSha,
					workload: comparison,
					thresholds,
				})

				checkUrls.set(comparison.workload, check.url)
				info(`Created check for ${comparison.workload}: ${check.url}`)
			} catch (error) {
				warning(`Failed to create check for ${comparison.workload}: ${String(error)}`)
			}
		}

		// Step 8: Write Job Summary
		info('📋 Writing Job Summary...')

		// Use refs from first workload for summary
		let firstWorkload = workloads[0]
		let summaryCurrentRef = firstWorkload.metadata?.workload_current_ref || 'current'
		let summaryBaselineRef = firstWorkload.metadata?.workload_baseline_ref || 'baseline'

		await writeJobSummary({
			workloads: comparisons,
			currentRef: summaryCurrentRef,
			baselineRef: summaryBaselineRef,
		})

		info('Job Summary written')

		// Step 9: Create/Update PR comment (only if PR exists)
		if (prNumber) {
			info('💬 Creating/updating PR comment...')

			// Artifact URLs (GitHub UI download)
			let artifactUrls = new Map<string, string>()
			let artifactBaseUrl = `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId}/artifacts/${uploadResult.id}`

			for (let file of htmlFiles) {
				artifactUrls.set(file.workload, artifactBaseUrl)
			}

			let commentBody = generateCommentBody({
				workloads: comparisons,
				artifactUrls,
				checkUrls,
				jobSummaryUrl: `https://github.com/${context.repo.owner}/${context.repo.repo}/actions/runs/${runId}`,
			})

			let comment = await createOrUpdateComment(
				token,
				context.repo.owner,
				context.repo.repo,
				prNumber,
				commentBody
			)

			info(`PR comment: ${comment.url}`)
		} else {
			info('Skipping PR comment (no PR associated with this run)')
		}

		info('✅ Report generation completed successfully!')
	} catch (error) {
		setFailed(`Report generation failed: ${String(error)}`)
		throw error
	}
}

main()
