/**
 * GitHub Actions Job Summary generation
 */

import { summary } from '@actions/core'

import { formatChange, formatValue, type WorkloadComparison } from './analysis.js'

export interface SummaryData {
	workloads: WorkloadComparison[]
	currentRef: string
	baselineRef: string
	artifactUrls?: Map<string, string>
}

/**
 * Write Job Summary with all workloads
 */
export async function writeJobSummary(data: SummaryData): Promise<void> {
	summary.addHeading('🌋 SLO Test Summary', 1)

	// Commits info
	summary.addRaw(`
<p>
	<strong>Current:</strong> ${data.currentRef}
	vs
	<strong>Baseline:</strong> ${data.baselineRef}
</p>
	`)

	summary.addBreak()

	// Overall stats
	let totalMetrics = data.workloads.reduce((sum, w) => sum + w.summary.total, 0)
	let totalRegressions = data.workloads.reduce((sum, w) => sum + w.summary.regressions, 0)
	let totalImprovements = data.workloads.reduce((sum, w) => sum + w.summary.improvements, 0)
	let totalStable = data.workloads.reduce((sum, w) => sum + w.summary.stable, 0)

	summary.addRaw(`
<table>
	<tr>
		<td><strong>${data.workloads.length}</strong> workloads</td>
		<td><strong>${totalMetrics}</strong> metrics</td>
		<td><strong style="color: #1a7f37;">${totalImprovements}</strong> improvements</td>
		<td><strong style="color: #cf222e;">${totalRegressions}</strong> regressions</td>
		<td><strong style="color: #6e7781;">${totalStable}</strong> stable</td>
	</tr>
</table>
	`)

	summary.addBreak()

	// Each workload
	for (let workload of data.workloads) {
		let statusEmoji = workload.summary.regressions > 0 ? '🟡' : '🟢'
		let artifactUrl = data.artifactUrls?.get(workload.workload)

		summary.addHeading(`${statusEmoji} ${workload.workload}`, 3)

		if (artifactUrl) {
			summary.addRaw(`<p><a href="${artifactUrl}">📊 View detailed HTML report</a></p>`)
		}

		// Metrics table
		summary.addTable([
			[
				{ data: 'Metric', header: true },
				{ data: 'Current', header: true },
				{ data: 'Baseline', header: true },
				{ data: 'Change', header: true },
			],
			...workload.metrics.map((m) => [
				m.name,
				formatValue(m.current.value, m.name),
				m.baseline.available ? formatValue(m.baseline.value, m.name) : 'N/A',
				m.baseline.available ? formatChange(m.change.percent, m.change.direction) : 'N/A',
			]),
		])

		summary.addBreak()
	}

	await summary.write()
}

/**
 * Clear existing summary
 */
export async function clearJobSummary(): Promise<void> {
	summary.emptyBuffer()
	await summary.write()
}
