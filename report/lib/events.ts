import { formatChaosEvents, type ChaosEvent, type FormattedEvent } from '../../shared/events.js'

export function loadChaosEvents(content: string): FormattedEvent[] {
	let events: ChaosEvent[] = []
	let lines = content.trim().split('\n')

	for (let line of lines) {
		if (!line.trim()) continue

		try {
			let event = JSON.parse(line) as ChaosEvent
			events.push(event)
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return formatChaosEvents(events)
}
