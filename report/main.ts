/**
 * SLO Report Action - Main Orchestrator
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

import { DefaultArtifactClient } from '@actions/artifact'
import { getInput, info, setFailed, warning } from '@actions/core'
import { context } from '@actions/github'

import { compareWorkloadMetrics } from './lib/analysis.js'
import { downloadWorkloadArtifacts } from './lib/artifacts.js'
import { createWorkloadCheck } from './lib/checks.js'
import { createOrUpdateComment, generateCommentBody } from './lib/comment.js'
import { generateHTMLReport, type HTMLReportData } from './lib/html.js'
import { writeJobSummary } from './lib/summary.js'

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

		// Step 1: Download artifacts from current run
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

		// Step 2: Get PR information
		let prNumber = workloads[0]?.pullNumber
		if (!prNumber) {
			setFailed('Pull request number not found in artifacts')
			return
		}

		info(`Processing PR #${prNumber}`)

		// Get PR details for commit info
		let { getOctokit } = await import('@actions/github')
		let octokit = getOctokit(token)

		info('Fetching PR information...')
		let { data: pr } = await octokit.rest.pulls.get({
			owner: context.repo.owner,
			repo: context.repo.repo,
			pull_number: prNumber,
		})

		info(`PR: ${pr.title}`)
		info(`Base branch: ${pr.base.ref}`)
		info(`Head SHA: ${pr.head.sha}`)

		// Step 3: Analyze metrics (already contain current and base series with ref label)
		info('📊 Analyzing metrics...')
		let comparisons = workloads.map((w) => compareWorkloadMetrics(w.workload, w.metrics))

		// Step 4: Generate HTML reports
		info('📝 Generating HTML reports...')

		let htmlReportsPath = path.join(cwd, 'reports')
		fs.mkdirSync(htmlReportsPath, { recursive: true })

		let htmlFiles: Array<{ workload: string; path: string }> = []

		for (let i = 0; i < workloads.length; i++) {
			let workload = workloads[i]
			let comparison = comparisons[i]

			let htmlData: HTMLReportData = {
				workload: workload.workload,
				comparison,
				metrics: workload.metrics,
				events: workload.events,
				commits: {
					current: {
						sha: pr.head.sha,
						url: `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${pr.head.sha}`,
						short: pr.head.sha.substring(0, 7),
					},
					base: {
						sha: pr.base.sha,
						url: `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${pr.base.sha}`,
						short: pr.base.sha.substring(0, 7),
					},
				},
				meta: {
					prNumber,
					generatedAt: new Date().toISOString(),
				},
			}

			let html = generateHTMLReport(htmlData)
			let htmlPath = path.join(htmlReportsPath, `${workload.workload}-report.html`)

			fs.writeFileSync(htmlPath, html, { encoding: 'utf-8' })
			htmlFiles.push({ workload: workload.workload, path: htmlPath })

			info(`Generated HTML report for ${workload.workload}`)
		}

		// Step 5: Upload HTML reports as artifacts
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

		// Step 6: Create GitHub Checks
		info('✅ Creating GitHub Checks...')

		let checkUrls = new Map<string, string>()

		for (let comparison of comparisons) {
			try {
				let check = await createWorkloadCheck({
					token,
					owner: context.repo.owner,
					repo: context.repo.repo,
					sha: pr.head.sha,
					workload: comparison,
				})

				checkUrls.set(comparison.workload, check.url)
				info(`Created check for ${comparison.workload}: ${check.url}`)
			} catch (error) {
				warning(`Failed to create check for ${comparison.workload}: ${String(error)}`)
			}
		}

		// Step 7: Write Job Summary
		info('📋 Writing Job Summary...')

		await writeJobSummary({
			workloads: comparisons,
			commits: {
				current: {
					sha: pr.head.sha,
					url: `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${pr.head.sha}`,
					short: pr.head.sha.substring(0, 7),
				},
				base: {
					sha: pr.base.sha,
					url: `https://github.com/${context.repo.owner}/${context.repo.repo}/commit/${pr.base.sha}`,
					short: pr.base.sha.substring(0, 7),
				},
			},
		})

		info('Job Summary written')

		// Step 8: Create/Update PR comment
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

		let comment = await createOrUpdateComment(token, context.repo.owner, context.repo.repo, prNumber, commentBody)

		info(`PR comment: ${comment.url}`)

		info('✅ Report generation completed successfully!')
	} catch (error) {
		setFailed(`Report generation failed: ${String(error)}`)
		throw error
	}
}

main()
