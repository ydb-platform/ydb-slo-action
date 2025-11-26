import type { CollectedMetric } from '../../shared/metrics.js'

export function loadCollectedMetrics(content: string): CollectedMetric[] {
	let metrics: CollectedMetric[] = []
	let lines = content.trim().split('\n')

	for (let line of lines) {
		if (!line.trim()) continue

		try {
			let metric = JSON.parse(line) as CollectedMetric
			metrics.push(metric)
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return metrics
}
