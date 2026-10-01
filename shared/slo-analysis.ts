import { analyzeWorkload, type AnalysisOptions, type WorkloadAnalysis } from './analysis.js'
import type { CollectedMetric } from './metrics.js'
import type { SloVerdict } from './slo-result.js'

export function analyzeSloWorkload(
	workload: string,
	metrics: CollectedMetric[],
	currentRef: string,
	baselineRef: string,
	options: AnalysisOptions & { readonly sloVerdict?: SloVerdict } = {}
): WorkloadAnalysis {
	let sli = analyzeWorkload(
		workload,
		metrics.filter((metric) => metric.role !== 'diagnostic'),
		currentRef,
		baselineRef,
		options
	)
	let diagnostics = analyzeWorkload(
		workload,
		metrics.filter((metric) => metric.role === 'diagnostic' && metric.data.length > 0),
		currentRef,
		baselineRef
	)
	return {
		...sli,
		severity: options.sloVerdict === 'FAIL' || options.sloVerdict === 'INVALID'
			? 'failure'
			: sli.severity,
		metrics: [...sli.metrics, ...diagnostics.metrics],
		forestPlot: [...sli.forestPlot, ...diagnostics.forestPlot],
	}
}
