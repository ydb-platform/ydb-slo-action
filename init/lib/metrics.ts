import { exec } from '@actions/exec'

import { queryRange, type PrometheusRangeValue } from './prometheus.js'

export interface MetricDefinition {
	name: string
	query: string
	step?: string
}

export interface CollectedMetric {
	name: string
	query: string
	data: PrometheusRangeValue[]
}

/**
 * Supports two YAML formats for flexibility:
 * - Array at root: [{ name: ..., query: ... }]
 * - Object with metrics field: { metrics: [{ name: ..., query: ... }] }
 */
export async function parseMetricsYaml(yamlContent: string): Promise<MetricDefinition[]> {
	if (!yamlContent || yamlContent.trim() === '') {
		return []
	}

	try {
		let chunks: string[] = []

		await exec('yq', ['-o=json', '.'], {
			input: Buffer.from(yamlContent, 'utf-8'),
			silent: true,
			listeners: {
				stdout: (data) => chunks.push(data.toString()),
			},
		})

		let json = chunks.join('')
		let parsed = JSON.parse(json)

		if (Array.isArray(parsed)) {
			return parsed
		}

		return []
	} catch (error) {
		throw new Error(`Failed to parse metrics YAML: ${String(error)}`)
	}
}

/**
 * Calculates optimal step to get ~200 data points regardless of test duration.
 * This provides good chart resolution without overloading Prometheus.
 */
function calculateOptimalStep(durationSeconds: number): string {
	let targetPoints = 200
	let stepSeconds = Math.ceil(durationSeconds / targetPoints)

	stepSeconds = Math.max(5, Math.min(60, stepSeconds))

	// Round to common intervals for better alignment with scrape intervals
	let niceSteps = [5, 10, 15, 30, 60]
	for (let niceStep of niceSteps) {
		if (stepSeconds <= niceStep) {
			return `${niceStep}s`
		}
	}

	return '60s'
}

/**
 * Collects metrics from Prometheus using provided metric definitions
 */
export async function collectMetrics(options: {
	url: string
	start: number
	end: number
	metrics: MetricDefinition[]
	timeout: number
}): Promise<CollectedMetric[]> {
	let results: CollectedMetric[] = []

	let durationSeconds = options.end - options.start
	let defaultStep = calculateOptimalStep(durationSeconds)

	for (let metric of options.metrics) {
		try {
			let response = await queryRange({
				url: options.url,
				query: metric.query,
				start: options.start,
				end: options.end,
				step: metric.step || defaultStep,
				timeout: options.timeout,
			})

			if (response.status === 'success' && response.data) {
				results.push({
					name: metric.name,
					query: metric.query,
					data: response.data.result,
				})
			}
		} catch {
			continue
		}
	}

	return results
}
