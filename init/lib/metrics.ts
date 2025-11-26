import type { CollectedMetric, MetricConfig } from '../../shared/metrics.js'
import { queryInstant, queryRange } from './prometheus.js'

export async function collectMetricsFromPrometheus(
	url: string,
	start: Date,
	finish: Date,
	config: MetricConfig
): Promise<CollectedMetric[]> {
	let metrics: CollectedMetric[] = []

	for (let metric of config.metrics) {
		try {
			let type = metric.type || 'range'

			if (type === 'instant') {
				let response = await queryInstant({
					url: url,
					time: finish.getTime() / 1000,
					query: metric.query,
					queryTimeout: config.default.timeout,
				})

				if (response.status === 'success' && response.data) {
					metrics.push({
						type: 'instant',
						name: metric.name,
						query: metric.query,
						data: response.data.result,
					})
				}
			} else {
				let response = await queryRange({
					url: url,
					step: metric.step || config.default.step,
					query: metric.query,
					start: start.getTime() / 1000,
					end: finish.getTime() / 1000,
					queryTimeout: config.default.timeout,
				})

				if (response.status === 'success' && response.data) {
					metrics.push({
						type: 'range',
						name: metric.name,
						query: metric.query,
						data: response.data.result,
					})
				}
			}
		} catch {
			continue
		}
	}

	return metrics
}
