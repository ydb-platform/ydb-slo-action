/**
 * Chaos events parsing and formatting
 */

export interface Event {
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
 * Parse events JSONL file
 */
export function parseEventsJsonl(content: string): Event[] {
	let events: Event[] = []
	let lines = content.trim().split('\n')

	for (let line of lines) {
		if (!line.trim()) continue

		try {
			let event = JSON.parse(line) as Event
			events.push(event)
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return events
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
export function formatEvents(events: Event[]): FormattedEvent[] {
	return events.map((event) => ({
		icon: getEventIcon(!!event.duration_ms),
		label: event.description,
		timestamp: event.epoch_ms,
		duration_ms: event.duration_ms,
	}))
}
