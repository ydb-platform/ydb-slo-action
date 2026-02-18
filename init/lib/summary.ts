/**
 * GitHub Actions Job Summary generation
 */

import { summary } from '@actions/core'

import { formatValue, type Severity, type WorkloadAnalysis } from '../../shared/analysis.js'

function severityEmoji(severity: Severity): string {
	return severity === 'failure' ? '🔴' : severity === 'warning' ? '🟡' : '🟢'
}

/**
 * Write Job Summary for a workload analysis
 */
export async function writeJobSummary(analysis: WorkloadAnalysis): Promise<void> {
	let emoji = severityEmoji(analysis.severity)
	summary.addHeading(`${emoji} ${analysis.workload}`, 3)

	let matrix = [
		[
			{ data: 'Metric', header: true },
			{ data: 'Current', header: true },
			{ data: 'Baseline', header: true },
			{ data: 'Change', header: true },
			{ data: 'Status', header: true },
		],
		...analysis.metrics.map((m) => [
			m.name,
			formatValue(m.current.trimmedMean, m.name),
			m.baseline.count > 0 ? formatValue(m.baseline.trimmedMean, m.name) : 'N/A',
			m.relativeCheck ? `${m.relativeCheck.changePercent >= 0 ? '+' : ''}${m.relativeCheck.changePercent.toFixed(1)}%` : 'N/A',
			severityEmoji(m.severity),
		]),
	]

	summary.addTable(matrix)
	summary.addBreak()

	await summary.write()
}
