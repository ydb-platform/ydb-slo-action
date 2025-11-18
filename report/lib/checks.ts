/**
 * GitHub Checks API integration
 */

import { info } from '@actions/core'
import { getOctokit } from '@actions/github'

import { formatChange, formatValue, type WorkloadComparison } from './analysis.js'
import { evaluateWorkloadThresholds, type ThresholdConfig } from './thresholds.js'

export interface CheckOptions {
	token: string
	owner: string
	repo: string
	sha: string
	workload: WorkloadComparison
	thresholds: ThresholdConfig
	reportUrl?: string
}

/**
 * Create GitHub Check for workload
 */
export async function createWorkloadCheck(options: CheckOptions): Promise<{ id: number; url: string }> {
	let octokit = getOctokit(options.token)

	let name = `SLO: ${options.workload.workload}`
	let evaluation = evaluateWorkloadThresholds(options.workload.metrics, options.thresholds)
	let conclusion = determineConclusionFromEvaluation(evaluation.overall)
	let title = generateTitle(options.workload, evaluation)
	let summaryText = generateSummary(options.workload, evaluation, options.reportUrl)

	info(`Creating check "${name}" with conclusion: ${conclusion}`)

	let { data } = await octokit.rest.checks.create({
		owner: options.owner,
		repo: options.repo,
		name,
		head_sha: options.sha,
		status: 'completed',
		conclusion,
		output: {
			title,
			summary: summaryText,
		},
	})

	info(`Check created: ${data.html_url}`)

	return { id: data.id, url: data.html_url! }
}

/**
 * Map threshold severity to GitHub Check conclusion
 */
function determineConclusionFromEvaluation(
	severity: 'success' | 'warning' | 'failure'
): 'success' | 'neutral' | 'failure' {
	if (severity === 'failure') return 'failure'
	if (severity === 'warning') return 'neutral'
	return 'success'
}

/**
 * Generate check title
 */
function generateTitle(
	workload: WorkloadComparison,
	evaluation: { overall: string; failures: any[]; warnings: any[] }
): string {
	if (evaluation.failures.length > 0) {
		return `${evaluation.failures.length} critical threshold(s) violated`
	}

	if (evaluation.warnings.length > 0) {
		return `${evaluation.warnings.length} warning threshold(s) exceeded`
	}

	if (workload.summary.improvements > 0) {
		return `${workload.summary.improvements} improvement(s) detected`
	}

	return 'All metrics within thresholds'
}

/**
 * Generate check summary
 */
function generateSummary(
	workload: WorkloadComparison,
	evaluation: { overall: string; failures: any[]; warnings: any[] },
	reportUrl?: string
): string {
	let lines = [
		`**Metrics analyzed:** ${workload.summary.total}`,
		`- 🔴 Critical: ${evaluation.failures.length}`,
		`- 🟡 Warnings: ${evaluation.warnings.length}`,
		`- 🟢 Improvements: ${workload.summary.improvements}`,
		`- ⚪ Stable: ${workload.summary.stable}`,
		'',
	]

	if (reportUrl) {
		lines.push(`📊 [View detailed HTML report](${reportUrl})`, '')
	}

	// Critical failures
	if (evaluation.failures.length > 0) {
		lines.push('### ❌ Critical Thresholds Violated', '')

		for (let metric of evaluation.failures.slice(0, 5)) {
			lines.push(
				`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`
			)
		}

		lines.push('')
	}

	// Warnings
	if (evaluation.warnings.length > 0) {
		lines.push('### ⚠️ Warning Thresholds Exceeded', '')

		for (let metric of evaluation.warnings.slice(0, 5)) {
			lines.push(
				`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`
			)
		}

		lines.push('')
	}

	// Top improvements
	let improvements = workload.metrics
		.filter((m) => m.change.direction === 'better')
		.sort((a, b) => Math.abs(b.change.percent) - Math.abs(a.change.percent))

	if (improvements.length > 0) {
		lines.push('### 🟢 Top Improvements', '')

		for (let metric of improvements.slice(0, 5)) {
			lines.push(
				`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`
			)
		}
	}

	return lines.join('\n')
}
