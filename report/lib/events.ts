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

export interface ChaosEvent {
	timestamp: string
	epoch_ms: number
	script: string
	description: string
	duration_ms?: number
}

export interface FormattedEvent {
	timestamp: number
	action: string
	type: string
	label: string
	icon: string
	color: string
	actor: string
	source: 'docker' | 'chaos'
	duration_ms?: number
}

/**
 * Parse docker events JSONL file
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
 * Parse chaos events JSONL file
 */
export function parseChaosEventsJsonl(content: string): ChaosEvent[] {
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
 * Get icon for chaos event based on description keywords
 */
function getChaosEventIcon(description: string): string {
	let lower = description.toLowerCase()

	if (lower.includes('kill')) return '💀'
	if (lower.includes('stopping') || lower.includes('stop')) return '⏹️'
	if (lower.includes('starting') || lower.includes('start')) return '▶️'
	if (lower.includes('restart')) return '🔄'
	if (lower.includes('paus')) return '⏸️'
	if (lower.includes('unpaus')) return '▶️'
	if (lower.includes('blackhole')) return '🕳️'
	if (lower.includes('healthy')) return '✅'
	if (lower.includes('timeout') || lower.includes('warning')) return '⏱️'
	if (lower.includes('completed') || lower.includes('finished')) return '🏁'
	if (lower.includes('started') || lower.includes('starting')) return '🎬'

	return '📌'
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
 * Get color for chaos event (simple light blue for all)
 */
function getChaosEventColor(): string {
	return '#60a5fa' // light blue (blue-400)
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
 * Format chaos event label
 */
function formatChaosEventLabel(event: ChaosEvent): string {
	// Shorten container names in description
	let description = event.description.replace(/ydb-/g, '')

	// Add duration if present
	if (event.duration_ms) {
		let seconds = (event.duration_ms / 1000).toFixed(1)
		return `[${event.script}] ${description} (${seconds}s)`
	}

	return `[${event.script}] ${description}`
}

/**
 * Format docker events for visualization
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
		source: 'docker' as const,
	}))
}

/**
 * Format chaos events for visualization
 */
export function formatChaosEvents(events: ChaosEvent[]): FormattedEvent[] {
	return events.map((event) => ({
		timestamp: event.epoch_ms,
		action: 'chaos',
		type: 'chaos',
		label: formatChaosEventLabel(event),
		icon: getChaosEventIcon(event.description),
		color: getChaosEventColor(),
		actor: event.script,
		source: 'chaos' as const,
		duration_ms: event.duration_ms,
	}))
}
