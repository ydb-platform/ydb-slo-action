/**
 * GitHub Checks API integration
 */

import { info } from '@actions/core'
import { getOctokit } from '@actions/github'

import { formatChange, formatValue, type WorkloadComparison } from './analysis.js'

export interface CheckOptions {
	token: string
	owner: string
	repo: string
	sha: string
	workload: WorkloadComparison
	reportUrl?: string
}

/**
 * Create GitHub Check for workload
 */
export async function createWorkloadCheck(options: CheckOptions): Promise<{ id: number; url: string }> {
	let octokit = getOctokit(options.token)

	let name = `SLO: ${options.workload.workload}`
	let conclusion = determineConclusion(options.workload)
	let title = generateTitle(options.workload)
	let summaryText = generateSummary(options.workload, options.reportUrl)

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
 * Determine check conclusion
 */
function determineConclusion(workload: WorkloadComparison): 'success' | 'neutral' | 'failure' {
	// For now, always success or neutral (no hard failures)
	// Future: add configurable thresholds

	if (workload.summary.regressions > 0) {
		return 'neutral' // Warning level
	}

	return 'success'
}

/**
 * Generate check title
 */
function generateTitle(workload: WorkloadComparison): string {
	if (workload.summary.regressions > 0) {
		return `${workload.summary.regressions} regression(s) detected`
	}

	if (workload.summary.improvements > 0) {
		return `${workload.summary.improvements} improvement(s) detected`
	}

	return 'All metrics stable'
}

/**
 * Generate check summary
 */
function generateSummary(workload: WorkloadComparison, reportUrl?: string): string {
	let lines = [
		`**Metrics analyzed:** ${workload.summary.total}`,
		`- 🟢 Improvements: ${workload.summary.improvements}`,
		`- 🔴 Regressions: ${workload.summary.regressions}`,
		`- ⚪ Stable: ${workload.summary.stable}`,
		'',
	]

	if (reportUrl) {
		lines.push(`📊 [View detailed HTML report](${reportUrl})`, '')
	}

	// Top regressions
	let regressions = workload.metrics
		.filter((m) => m.change.direction === 'worse')
		.sort((a, b) => Math.abs(b.change.percent) - Math.abs(a.change.percent))

	if (regressions.length > 0) {
		lines.push('### Top Regressions', '')

		for (let metric of regressions.slice(0, 5)) {
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
		lines.push('### Top Improvements', '')

		for (let metric of improvements.slice(0, 5)) {
			lines.push(
				`- **${metric.name}**: ${formatValue(metric.current.value, metric.name)} (${formatChange(metric.change.percent, metric.change.direction)})`
			)
		}
	}

	return lines.join('\n')
}
