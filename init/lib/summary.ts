/**
 * GitHub Actions Job Summary generation (shared)
 *
 * This module provides a helper to write a concise job summary for SLO runs.
 * It was derived from report/lib/summary.ts and moved to shared to allow usage
 * from both `init` and `report` actions.
 */

import { summary } from '@actions/core'

import { formatChange, formatValue, type WorkloadComparison } from '../../shared/analysis.js'

/**
 * Write Job Summary for a workload comparison
 */
export async function writeJobSummary(comparison: WorkloadComparison): Promise<void> {
	summary.addBreak()

	let statusEmoji = comparison.summary.regressions > 0 ? '🟡' : '🟢'
	summary.addHeading(`${statusEmoji} ${comparison.workload}`, 3)

	// Build table matrix: header + metric rows
	let matrix = [
		[
			{ data: 'Metric', header: true },
			{ data: 'Current', header: true },
			{ data: 'Baseline', header: true },
			{ data: 'Change', header: true },
		],
		...comparison.metrics.map((m) => [
			m.name,
			formatValue(m.current.value, m.name),
			m.baseline.available ? formatValue(m.baseline.value, m.name) : 'N/A',
			m.baseline.available ? formatChange(m.change.percent, m.change.direction) : 'N/A',
		]),
	]

	summary.addTable(matrix)

	summary.addBreak()

	await summary.write()
}
