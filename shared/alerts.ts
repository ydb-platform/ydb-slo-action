/**
 * Prometheus alerts types
 */

/**
 * Collected alert from Prometheus
 */
export interface CollectedAlert {
	alertname: string
	epoch_ms: number // start timestamp
	duration_ms: number
	labels: Record<string, string>
}
