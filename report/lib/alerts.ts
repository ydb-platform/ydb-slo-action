import type { CollectedAlert } from '../../shared/alerts.js'
import type { FormattedEvent } from '../../shared/events.js'

/**
 * Load collected alerts from JSONL artifact
 */
export function loadCollectedAlerts(content: string): CollectedAlert[] {
	let alerts: CollectedAlert[] = []
	let lines = content.trim().split('\n')

	for (let line of lines) {
		if (!line.trim()) continue

		try {
			let alert = JSON.parse(line) as CollectedAlert
			alerts.push(alert)
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return alerts
}

/**
 * Format alerts for visualization in HTML reports
 *
 * Converts CollectedAlert to FormattedEvent for timeline rendering
 */
export function formatAlertsForVisualization(alerts: CollectedAlert[]): FormattedEvent[] {
	return alerts.map((alert) => ({
		icon: alert.duration_ms > 0 ? '⏱️' : '📍',
		label: formatAlertLabel(alert),
		timestamp: alert.epoch_ms,
		duration_ms: alert.duration_ms,
	}))
}

/**
 * Generate human-readable alert label
 */
function formatAlertLabel(alert: CollectedAlert): string {
	let parts = [alert.alertname]

	// Add relevant labels (exclude noisy ones)
	let relevantLabels = Object.entries(alert.labels).filter(
		([key]) => !['alertstate', 'job', 'instance'].includes(key)
	)

	if (relevantLabels.length > 0) {
		let labelStr = relevantLabels.map(([k, v]) => `${k}=${v}`).join(', ')
		parts.push(`(${labelStr})`)
	}

	return parts.join(' ')
}
