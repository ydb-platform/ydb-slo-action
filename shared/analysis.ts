/**
 * Paired-comparison analysis for SLO metrics.
 *
 * Instead of computing N aggregates independently, this module aligns
 * current/baseline time series by timestamp and computes pointwise ratios.
 * Because both workloads see the same chaos at the same time, the ratio
 * current[t]/baseline[t] cancels environmental noise.
 */

import type { CollectedMetric, RangeSeries } from './metrics.js'
import { trimmedMean, ema, histogram, percentile, fiveNumberSummary } from './stats.js'
import {
	evaluateAbsoluteThreshold,
	evaluateRelativeThreshold,
	type ThresholdConfig,
	type MetricDirection,
	type Severity,
	type AbsoluteCheck,
	type RelativeCheck,
} from './thresholds.js'

export type { MetricDirection, Severity, AbsoluteCheck, RelativeCheck }

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AlignedPoint {
	timestamp: number
	current: number
	baseline: number
	ratio: number // current / baseline
	deltaPercent: number // (current - baseline) / baseline * 100
}

export interface RetriesCheck {
	severity: Severity
	currentTotal: number
	baselineTotal: number
	retryRate: number // retries / operations
	reason?: string
}

export interface RefSummary {
	trimmedMean: number
	mean: number
	median: number
	p95: number
	p99: number
	count: number
}

export interface VisualizationData {
	aligned: AlignedPoint[]
	emaCurrent: number[]
	emaBaseline: number[]
	currentHistogram: { edges: number[]; counts: number[] }
	baselineHistogram: { edges: number[]; counts: number[] }
	currentBox: [number, number, number, number, number]
	baselineBox: [number, number, number, number, number]
}

export interface MetricAnalysis {
	name: string
	title?: string
	unit?: string
	direction: MetricDirection
	type: 'range' | 'instant'
	current: RefSummary
	baseline: RefSummary
	absoluteCheck: AbsoluteCheck
	relativeCheck?: RelativeCheck // only when baseline exists
	retriesCheck?: RetriesCheck // only for *_attempts metrics
	severity: Severity // worst(absolute, relative, retries)
	visualization?: VisualizationData // only for range metrics
}

export interface ForestPlotEntry {
	name: string
	changePercent: number
	concordance: number
	iqrLow: number // 25th percentile of ratios as %
	iqrHigh: number // 75th percentile of ratios as %
	severity: Severity
}

export interface WorkloadAnalysis {
	workload: string
	metrics: MetricAnalysis[]
	forestPlot: ForestPlotEntry[] // only when baseline exists
	severity: Severity
	summary: { total: number; success: number; warnings: number; failures: number }
}

export interface AnalysisOptions {
	trimPercent?: number // default 0.10
	emaAlpha?: number // default 0.15
	thresholdConfig?: ThresholdConfig
}

// ---------------------------------------------------------------------------
// Direction inference
// ---------------------------------------------------------------------------

export function inferDirection(name: string): MetricDirection {
	let lower = name.toLowerCase()

	if (
		lower.includes('latency') ||
		lower.includes('duration') ||
		lower.includes('time') ||
		lower.includes('delay') ||
		lower.includes('error') ||
		lower.includes('failure') ||
		lower.includes('attempts')
	) {
		return 'lower_is_better'
	}

	if (
		lower.includes('availability') ||
		lower.includes('throughput') ||
		lower.includes('success') ||
		lower.includes('qps') ||
		lower.includes('rps') ||
		lower.includes('ops')
	) {
		return 'higher_is_better'
	}

	return 'neutral'
}

// ---------------------------------------------------------------------------
// Series alignment
// ---------------------------------------------------------------------------

export function alignSeries(current: RangeSeries, baseline: RangeSeries): AlignedPoint[] {
	// Build a Map from baseline timestamps → values for O(n) lookup
	let baselineMap = new Map<number, number>()
	for (let [ts, val] of baseline.values) {
		baselineMap.set(ts, parseFloat(val))
	}

	let aligned: AlignedPoint[] = []
	for (let [ts, val] of current.values) {
		let bv = baselineMap.get(ts)
		if (bv === undefined) continue

		let cv = parseFloat(val)
		if (isNaN(cv) || isNaN(bv)) continue

		let ratio = bv !== 0 ? cv / bv : NaN
		let deltaPercent = bv !== 0 ? ((cv - bv) / bv) * 100 : NaN

		aligned.push({ timestamp: ts, current: cv, baseline: bv, ratio, deltaPercent })
	}

	return aligned
}

// ---------------------------------------------------------------------------
// Paired ratio & concordance
// ---------------------------------------------------------------------------

export function computePairedRatio(aligned: AlignedPoint[], trimFraction: number = 0.1): number {
	let ratios = aligned.map((p) => p.ratio).filter((r) => isFinite(r))
	return trimmedMean(ratios, trimFraction)
}

export function computeConcordance(aligned: AlignedPoint[], direction: MetricDirection): number {
	if (aligned.length === 0) return 0

	let worseCount = 0
	for (let p of aligned) {
		if (direction === 'lower_is_better' && p.current > p.baseline) worseCount++
		else if (direction === 'higher_is_better' && p.current < p.baseline) worseCount++
	}

	return worseCount / aligned.length
}

// ---------------------------------------------------------------------------
// Ref summary
// ---------------------------------------------------------------------------

function buildRefSummary(values: number[], trimFraction: number): RefSummary {
	if (values.length === 0) {
		return { trimmedMean: NaN, mean: NaN, median: NaN, p95: NaN, p99: NaN, count: 0 }
	}

	let sorted = [...values].sort((a, b) => a - b)
	return {
		trimmedMean: trimmedMean(values, trimFraction),
		mean: values.reduce((a, b) => a + b, 0) / values.length,
		median: percentile(sorted, 0.5),
		p95: percentile(sorted, 0.95),
		p99: percentile(sorted, 0.99),
		count: values.length,
	}
}

// ---------------------------------------------------------------------------
// Visualization data
// ---------------------------------------------------------------------------

export function buildVisualization(
	aligned: AlignedPoint[],
	currentVals: number[],
	baselineVals: number[],
	emaAlpha: number = 0.15
): VisualizationData {
	return {
		aligned,
		emaCurrent: ema(currentVals, emaAlpha),
		emaBaseline: ema(baselineVals, emaAlpha),
		currentHistogram: histogram(currentVals),
		baselineHistogram: histogram(baselineVals),
		currentBox: fiveNumberSummary(currentVals),
		baselineBox: fiveNumberSummary(baselineVals),
	}
}

// ---------------------------------------------------------------------------
// Worst severity
// ---------------------------------------------------------------------------

function worstSeverity(...severities: (Severity | undefined)[]): Severity {
	if (severities.some((s) => s === 'failure')) return 'failure'
	if (severities.some((s) => s === 'warning')) return 'warning'
	return 'success'
}

// ---------------------------------------------------------------------------
// Extract raw values from a series for a ref
// ---------------------------------------------------------------------------

function extractValues(metric: CollectedMetric, ref: string): number[] {
	let series = metric.data.find((s) => s.metric.ref === ref)
	if (!series) return []

	if (metric.type === 'instant') {
		let v = parseFloat((series as any).value[1])
		return isNaN(v) ? [] : [v]
	}

	return (series as RangeSeries).values.map(([_, v]) => parseFloat(v)).filter((n) => !isNaN(n))
}

// ---------------------------------------------------------------------------
// Core: analyze one metric
// ---------------------------------------------------------------------------

export function analyzeMetric(
	metric: CollectedMetric,
	currentRef: string,
	baselineRef: string,
	options: AnalysisOptions = {}
): MetricAnalysis {
	let { trimPercent = 0.1, emaAlpha = 0.15, thresholdConfig } = options
	let direction = inferDirection(metric.name)

	let currentVals = extractValues(metric, currentRef)
	let baselineVals = extractValues(metric, baselineRef)

	let current = buildRefSummary(currentVals, trimPercent)
	let baseline = buildRefSummary(baselineVals, trimPercent)

	// Absolute threshold check
	let absoluteCheck: AbsoluteCheck = { severity: 'success', value: current.trimmedMean, violations: [] }
	if (thresholdConfig) {
		absoluteCheck = evaluateAbsoluteThreshold(metric.name, current.trimmedMean, direction, thresholdConfig)
	}

	// Relative (paired) check — only for range metrics with both refs present
	let relativeCheck: RelativeCheck | undefined
	let visualization: VisualizationData | undefined
	let forestEntry: ForestPlotEntry | undefined

	if (metric.type === 'range' && currentVals.length > 0 && baselineVals.length > 0) {
		let currentSeries = metric.data.find((s) => s.metric.ref === currentRef) as RangeSeries | undefined
		let baselineSeries = metric.data.find((s) => s.metric.ref === baselineRef) as RangeSeries | undefined

		if (currentSeries && baselineSeries) {
			let aligned = alignSeries(currentSeries, baselineSeries)

			if (aligned.length > 0) {
				let pairedRatio = computePairedRatio(aligned, trimPercent)
				let changePercent = (pairedRatio - 1) * 100
				let concordance = computeConcordance(aligned, direction)

				let relSeverity: Severity = 'success'
				let violations: string[] = []
				if (thresholdConfig) {
					let check = evaluateRelativeThreshold(
						metric.name,
						changePercent,
						concordance,
						direction,
						thresholdConfig
					)
					relSeverity = check.severity
					violations = check.violations
				}

				relativeCheck = { severity: relSeverity, pairedRatio, changePercent, concordance, violations }

				// Build forest plot entry
				let ratios = aligned.map((p) => p.ratio).filter((r) => isFinite(r))
				let sortedRatios = [...ratios].sort((a, b) => a - b)
				forestEntry = {
					name: metric.name,
					changePercent,
					concordance,
					iqrLow: (percentile(sortedRatios, 0.25) - 1) * 100,
					iqrHigh: (percentile(sortedRatios, 0.75) - 1) * 100,
					severity: relSeverity,
				}
			}

			visualization = buildVisualization(aligned, currentVals, baselineVals, emaAlpha)
		}
	}

	let severity = worstSeverity(absoluteCheck.severity, relativeCheck?.severity)

	return {
		name: metric.name,
		title: metric.title,
		unit: metric.unit,
		direction,
		type: metric.type,
		current,
		baseline,
		absoluteCheck,
		relativeCheck,
		severity,
		visualization,
		_forestEntry: forestEntry,
	} as MetricAnalysis & { _forestEntry?: ForestPlotEntry }
}

// ---------------------------------------------------------------------------
// Core: analyze all metrics for a workload
// ---------------------------------------------------------------------------

export function analyzeWorkload(
	workload: string,
	metrics: CollectedMetric[],
	currentRef: string,
	baselineRef: string,
	options: AnalysisOptions = {}
): WorkloadAnalysis {
	let analyses: (MetricAnalysis & { _forestEntry?: ForestPlotEntry })[] = []

	for (let metric of metrics) {
		let analysis = analyzeMetric(metric, currentRef, baselineRef, options) as MetricAnalysis & {
			_forestEntry?: ForestPlotEntry
		}
		analyses.push(analysis)
	}

	// Retries cross-metric check (Step 5)
	let attemptsPairs: [string, string][] = [
		['read_attempts', 'read_throughput'],
		['write_attempts', 'write_throughput'],
	]

	for (let [attemptsName, throughputName] of attemptsPairs) {
		let attemptsMetric = analyses.find((a) => a.name === attemptsName)
		let throughputMetric = analyses.find((a) => a.name === throughputName)

		if (attemptsMetric && throughputMetric) {
			let currentAttempts = attemptsMetric.current.trimmedMean
			let baselineAttempts = attemptsMetric.baseline.trimmedMean
			let currentThroughput = throughputMetric.current.trimmedMean
			let retryRate = currentThroughput > 0 ? currentAttempts / currentThroughput : 0

			let retriesSeverity: Severity = 'success'
			let reason: string | undefined

			if (baselineAttempts === 0 && currentAttempts > 0) {
				retriesSeverity = 'warning'
				reason = 'Retries appeared (baseline had none)'
			}
			if (retryRate > 0.01) {
				retriesSeverity = 'failure'
				reason = `Retry rate ${(retryRate * 100).toFixed(2)}% > 1%`
			}

			attemptsMetric.retriesCheck = {
				severity: retriesSeverity,
				currentTotal: currentAttempts,
				baselineTotal: baselineAttempts,
				retryRate,
				reason,
			}

			attemptsMetric.severity = worstSeverity(attemptsMetric.severity, retriesSeverity)
		}
	}

	// Build forest plot and clean up internal fields
	let forestPlot: ForestPlotEntry[] = []
	let cleanAnalyses: MetricAnalysis[] = []

	for (let a of analyses) {
		if (a._forestEntry) {
			forestPlot.push(a._forestEntry)
		}
		let { _forestEntry, ...clean } = a
		cleanAnalyses.push(clean)
	}

	// Overall severity and summary
	let success = cleanAnalyses.filter((a) => a.severity === 'success').length
	let warnings = cleanAnalyses.filter((a) => a.severity === 'warning').length
	let failures = cleanAnalyses.filter((a) => a.severity === 'failure').length
	let overallSeverity = worstSeverity(...cleanAnalyses.map((a) => a.severity))

	return {
		workload,
		metrics: cleanAnalyses,
		forestPlot,
		severity: overallSeverity,
		summary: { total: cleanAnalyses.length, success, warnings, failures },
	}
}

// ---------------------------------------------------------------------------
// Formatting helpers (kept from old module)
// ---------------------------------------------------------------------------

export function formatValue(value: number, metricName: string): string {
	if (isNaN(value)) return 'N/A'

	let lowerName = metricName.toLowerCase()

	if (lowerName.includes('latency') || lowerName.includes('duration') || lowerName.endsWith('_ms')) {
		return `${value.toFixed(2)}ms`
	}

	if (lowerName.includes('time') && lowerName.endsWith('_s')) {
		return `${value.toFixed(2)}s`
	}

	if (lowerName.includes('availability') || lowerName.includes('percent') || lowerName.includes('rate')) {
		return `${value.toFixed(2)}%`
	}

	if (
		lowerName.includes('throughput') ||
		lowerName.includes('qps') ||
		lowerName.includes('rps') ||
		lowerName.includes('ops')
	) {
		if (value >= 1000) {
			return `${(value / 1000).toFixed(2)}k/s`
		}
		return `${value.toFixed(0)}/s`
	}

	return value.toFixed(2)
}

export function formatChange(percent: number, severity: Severity): string {
	if (isNaN(percent)) return 'N/A'

	let sign = percent >= 0 ? '+' : ''
	let emoji = severity === 'success' ? '✅' : severity === 'warning' ? '🟡' : '🔴'

	return `${sign}${percent.toFixed(1)}% ${emoji}`
}
