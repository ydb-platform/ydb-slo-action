/**
 * GitHub Checks API integration
 */

import { formatChange, formatValue, type WorkloadComparison } from '../../shared/analysis.js'
import { evaluateWorkloadThresholds } from '../../shared/thresholds.js'

export function generateCheckTitle(
	comparison: WorkloadComparison,
	evaluation: ReturnType<typeof evaluateWorkloadThresholds>
): string {
	if (evaluation.failures.length > 0) {
		return `${evaluation.failures.length} critical threshold(s) violated`
	}

	if (evaluation.warnings.length > 0) {
		return `${evaluation.warnings.length} warning threshold(s) exceeded`
	}

	if (comparison.summary.improvements > 0) {
		return `${comparison.summary.improvements} improvement(s) detected`
	}

	return 'All metrics within thresholds'
}

export function generateCheckSummary(
	comparison: WorkloadComparison,
	evaluation: ReturnType<typeof evaluateWorkloadThresholds>,
	reportURL?: string
): string {
	let lines = [
		`**Metrics analyzed:** ${comparison.summary.total}`,
		`- 🔴 Critical: ${evaluation.failures.length}`,
		`- 🟡 Warnings: ${evaluation.warnings.length}`,
		`- 🟢 Improvements: ${comparison.summary.improvements}`,
		`- ⚪ Stable: ${comparison.summary.stable}`,
		'',
	]

	if (reportURL) {
		lines.push(`📊 [View detailed HTML report](${reportURL})`, '')
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
	let improvements = comparison.metrics
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
