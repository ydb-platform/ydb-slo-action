import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'

import { getInput, info, setFailed } from '@actions/core'

import { analyzeWorkload } from '../shared/analysis.js'
import { loadThresholdConfig } from '../shared/thresholds.js'

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

		// Analyze workload with paired-comparison model
		let analysis = analyzeWorkload(meta.workload, metrics, meta.workload_current_ref || 'current', meta.workload_baseline_ref || 'baseline', {
			trimPercent: 0.1,
			emaAlpha: 0.15,
			thresholdConfig: thresholdsConfig,
		})

		if (analysis.summary.failures > 0) {
			info(`  ❌ ${analysis.summary.failures} critical threshold violation(s)`)
		} else if (analysis.summary.warnings > 0) {
			info(`  ⚠️ ${analysis.summary.warnings} warning(s)`)
		}

		// Generate HTML report
		let html = await generateHTMLReport(meta, alerts, analysis, metrics, templatePath)
		let htmlPath = path.join(cwd, `${workload}-report.html`)
		await fs.writeFile(htmlPath, html, 'utf-8')

		// Upload as artifact
		let reportUrl = await uploadReportArtifact(workload, htmlPath, cwd, artifactRetentionDays)
		info(`  📎 Report: ${reportUrl}`)

		reports.push({
			workload,
			currentRef: meta.workload_current_ref || 'current',
			baselineRef: meta.workload_baseline_ref || 'baseline',
			reportUrl,
			analysis,
			commit: meta.commit,
			repoUrl: meta.repo_url,
			runUrl: meta.run_url,
			durationMs: meta.duration_ms,
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
		let failedWorkloads = reports.filter((r) => r.analysis.severity === 'failure')
		if (failedWorkloads.length > 0) {
			let summary = failedWorkloads
				.map((r) => {
					let failures = r.analysis.metrics
						.filter((m) => m.severity === 'failure')
						.map((m) => `    • ${m.name}: ${[...m.absoluteCheck.violations, ...(m.relativeCheck?.violations ?? [])].join(', ')}`)
						.join('\n')
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
