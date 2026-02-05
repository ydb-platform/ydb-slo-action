import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getInput, info, setFailed } from '@actions/core'

import { compareWorkloadMetrics } from '../shared/analysis.js'
import { evaluateWorkloadThresholds, loadThresholdConfig } from '../shared/thresholds.js'

import { downloadRunArtifacts, uploadReportArtifact } from './lib/artifacts.js'
import { createOrUpdateComment, generateCommentBody, type WorkloadReportSummary } from './lib/comment.js'
import { generateHTMLReport } from './lib/html.js'
import { loadAlerts, loadMetadata, loadMetrics } from './lib/loaders.js'

process.env['GITHUB_ACTION_PATH'] ??= fileURLToPath(new URL('../..', import.meta.url))

async function main() {
	let cwd = path.join(process.cwd(), '.slo-reports')
	await fs.mkdir(cwd, { recursive: true })

	// Inputs
	let githubIssue = getInput('github_issue', { required: false })
	let templatePath = getInput('template_path', { required: false }) || undefined
	let postComment = getInput('post_comment', { required: false }) !== 'false'
	let thresholdsYaml = getInput('thresholds_yaml', { required: false }) || undefined
	let thresholdsYamlPath = getInput('thresholds_yaml_path', { required: false }) || undefined
	let failOnThreshold = getInput('fail_on_threshold', { required: false }) === 'true'
	let artifactRetentionDays = parseInt(getInput('artifact_retention_days', { required: false }) || '30')

	info('📊 YDB SLO Report v2')

	// Download all artifacts from current run
	let runArtifacts = await downloadRunArtifacts(cwd)
	info(`Found ${runArtifacts.size} workload(s): ${[...runArtifacts.keys()].join(', ')}`)

	if (runArtifacts.size === 0) {
		setFailed('No workload artifacts found in current run')
		return
	}

	// Load thresholds config once for all workloads
	let thresholdsConfig = await loadThresholdConfig(thresholdsYaml, thresholdsYamlPath)

	// Process each workload
	let reports: WorkloadReportSummary[] = []
	let prNumber: number | undefined = githubIssue ? parseInt(githubIssue) : undefined

	for (let [workload, artifact] of runArtifacts) {
		info(`\n📦 Processing workload: ${workload}`)

		let meta = await loadMetadata(artifact.metaPath)
		let alerts = await loadAlerts(artifact.alertsPath)
		let metrics = await loadMetrics(artifact.metricsPath)

		// Use PR number from metadata if not provided via input
		if (!prNumber && meta.pull) {
			prNumber = meta.pull
		}

		info(`  ✅ Loaded ${metrics.length} metrics, ${alerts.length} alerts`)

		// Evaluate thresholds if configured
		let evaluation = undefined
		if (thresholdsConfig) {
			let comparison = compareWorkloadMetrics(
				meta.workload,
				metrics,
				meta.workload_current_ref || 'current',
				meta.workload_baseline_ref || 'baseline',
				'p95',
				thresholdsConfig.neutral_change_percent
			)
			evaluation = evaluateWorkloadThresholds(comparison.metrics, thresholdsConfig)

			if (evaluation.failures.length > 0) {
				info(`  ❌ ${evaluation.failures.length} critical threshold violation(s)`)
			} else if (evaluation.warnings.length > 0) {
				info(`  ⚠️ ${evaluation.warnings.length} warning(s)`)
			}
		}

		// Generate HTML report
		let html = await generateHTMLReport(meta, alerts, metrics, templatePath, evaluation, thresholdsConfig)
		let htmlPath = path.join(cwd, `${workload}-report.html`)
		await fs.writeFile(htmlPath, html, 'utf-8')

		// Upload as artifact
		let reportUrl = await uploadReportArtifact(workload, htmlPath, cwd, artifactRetentionDays)
		info(`  📎 Report: ${reportUrl}`)

		reports.push({
			workload,
			currentRef: meta.workload_current_ref || 'current',
			baselineRef: meta.workload_baseline_ref || 'baseline',
			metricsCount: metrics.length,
			reportUrl,
			evaluation,
		})
	}

	// Post single PR comment for all workloads
	if (postComment && prNumber) {
		info('\n💬 Posting PR comment...')
		let body = generateCommentBody(reports)
		await createOrUpdateComment(prNumber, body)
	}

	// Fail if any critical thresholds exceeded
	if (failOnThreshold) {
		let failedWorkloads = reports.filter((r) => r.evaluation?.overall === 'failure')
		if (failedWorkloads.length > 0) {
			let summary = failedWorkloads
				.map((r) => {
					let failures = r.evaluation!.failures.map((f: any) => `    • ${f.name}: ${f.reason}`).join('\n')
					return `  ${r.workload}:\n${failures}`
				})
				.join('\n\n')
			setFailed(`❌ ${failedWorkloads.length} workload(s) exceeded critical thresholds:\n\n${summary}`)
			return
		}
	}

	info('\n🎉 Done!')
}

main().catch((error) => {
	setFailed(`Report generation failed: ${error}`)
})
