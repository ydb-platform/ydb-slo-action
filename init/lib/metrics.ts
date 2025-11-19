import { exec } from '@actions/exec'

import { queryInstant, queryRange, type PrometheusInstantValue, type PrometheusRangeValue } from './prometheus.js'

export interface MetricDefinition {
	name: string
	query: string
	type?: 'range' | 'instant'
	step?: string
}

export interface CollectedMetric {
	name: string
	query: string
	type: 'range' | 'instant'
	data: PrometheusRangeValue[] | PrometheusInstantValue[]
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
 * Calculates optimal step for smooth, detailed charts.
 * Targets ~2000 points for high accuracy calculations.
 * Charts will downsample for rendering performance.
 */
function calculateOptimalStep(durationMs: number): string {
	let stepMs = Math.ceil(durationMs / 2000)

	return `${Math.max(250, stepMs)}ms`
}

/**
 * Collects metrics from Prometheus using provided metric definitions
 */
export async function collectMetrics(options: {
	url: string
	start: Date
	finish: Date
	metrics: MetricDefinition[]
	timeout: number
}): Promise<CollectedMetric[]> {
	let results: CollectedMetric[] = []

	let durationMs = options.finish.getTime() - options.start.getTime()
	let defaultStep = calculateOptimalStep(durationMs)

	for (let metric of options.metrics) {
		try {
			let type = metric.type || 'range'

			if (type === 'instant') {
				let response = await queryInstant({
					url: options.url,
					query: metric.query,
					time: options.finish.getTime() / 1000,
					timeout: options.timeout,
				})

				if (response.status === 'success' && response.data) {
					results.push({
						name: metric.name,
						query: metric.query,
						type: 'instant',
						data: response.data.result,
					})
				}
			} else {
				let response = await queryRange({
					url: options.url,
					query: metric.query,
					start: options.start.getTime() / 1000,
					end: options.finish.getTime() / 1000,
					step: metric.step || defaultStep,
					timeout: options.timeout,
				})

				if (response.status === 'success' && response.data) {
					results.push({
						name: metric.name,
						query: metric.query,
						type: 'range',
						data: response.data.result,
					})
				}
			}
		} catch {
			continue
		}
	}

	return results
}
