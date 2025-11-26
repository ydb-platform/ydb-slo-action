/**
 * Chaos events parsing and formatting
 */

export interface ChaosEvent {
	script: string
	epoch_ms: number
	timestamp: string
	description: string
	duration_ms?: number
}

export interface FormattedEvent {
	icon: string
	label: string
	timestamp: number // milliseconds (epoch_ms)
	duration_ms?: number
}

/**
 * Get icon for event based on duration
 * Duration events (intervals) get ⏱️
 * Instant events get 📍
 */
function getEventIcon(hasDuration: boolean): string {
	return hasDuration ? '⏱️' : '📍'
}

/**
 * Format events for visualization
 */
export function formatChaosEvents(events: ChaosEvent[]): FormattedEvent[] {
	return events.map((event) => ({
		icon: getEventIcon(!!event.duration_ms),
		label: event.description,
		timestamp: event.epoch_ms,
		duration_ms: event.duration_ms,
	}))
}
