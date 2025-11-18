/**
 * Docker events parsing and formatting
 */

export interface DockerEvent {
	time: number
	Action: string
	Type: string
	Actor: {
		ID: string
		Attributes: Record<string, string>
	}
	[key: string]: unknown
}

export interface FormattedEvent {
	timestamp: number
	action: string
	type: string
	label: string
	icon: string
	color: string
	actor: string
}

/**
 * Parse events JSONL file
 */
export function parseEventsJsonl(content: string): DockerEvent[] {
	let events: DockerEvent[] = []
	let lines = content.trim().split('\n')

	for (let line of lines) {
		if (!line.trim()) continue

		try {
			let event = JSON.parse(line) as DockerEvent
			events.push(event)
		} catch {
			// Skip invalid lines
			continue
		}
	}

	return events
}

/**
 * Get icon for event action
 */
function getEventIcon(action: string, attributes?: Record<string, string>): string {
	let icons: Record<string, string> = {
		pause: '⏸️',
		unpause: '▶️',
		stop: '⏹️',
		start: '▶️',
		restart: '🔄',
		die: '💤',
		create: '🆕',
		destroy: '🗑️',
	}

	if (action === 'kill') {
		return attributes?.signal === 'SIGKILL' ? '💀' : '⚡'
	}

	return icons[action] || '📌'
}

/**
 * Get color for event action
 */
function getEventColor(action: string): string {
	let colors: Record<string, string> = {
		pause: '#f59e0b', // orange
		unpause: '#10b981', // green
		stop: '#ef4444', // red
		start: '#10b981', // green
		kill: '#dc2626', // dark red
		restart: '#f59e0b', // orange
		die: '#6b7280', // gray
		create: '#3b82f6', // blue
		destroy: '#ef4444', // red
	}

	return colors[action] || '#6b7280'
}

/**
 * Format event label
 */
function formatEventLabel(event: DockerEvent): string {
	// Try to get friendly name from compose labels
	let name = event.Actor.Attributes.name || event.Actor.ID.substring(0, 12)
	let nodeType = event.Actor.Attributes['ydb.node.type']
	let service = event.Actor.Attributes['com.docker.compose.service']

	// Use YDB node type if available (e.g., "database", "storage")
	let displayName = name
	if (nodeType) {
		displayName = `${nodeType} (${name})`
	} else if (service) {
		displayName = service
	}

	let action = event.Action

	if (action === 'kill' && event.Actor.Attributes.signal) {
		return `${action} ${displayName} (${event.Actor.Attributes.signal})`
	}

	return `${action} ${displayName}`
}

/**
 * Format events for visualization
 */
export function formatEvents(events: DockerEvent[]): FormattedEvent[] {
	return events.map((event) => ({
		timestamp: event.time,
		action: event.Action,
		type: event.Type,
		label: formatEventLabel(event),
		icon: getEventIcon(event.Action, event.Actor.Attributes),
		color: getEventColor(event.Action),
		actor: event.Actor.Attributes.name || event.Actor.ID.substring(0, 12),
	}))
}
