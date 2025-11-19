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
	scenario: string
	action: string
	target: string
	severity: 'info' | 'warning' | 'critical'
	metadata: Record<string, unknown>
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
		healthy: '✅',
		health_timeout: '⏱️',
		scenario_start: '🎬',
		scenario_complete: '🏁',
		blackhole_create: '🕳️',
		blackhole_remove: '🔌',
	}

	if (action === 'kill') {
		return attributes?.signal === 'SIGKILL' ? '💀' : '⚡'
	}

	return icons[action] || '📌'
}

/**
 * Get color for event action
 */
function getEventColor(action: string, severity?: string): string {
	// Use severity for chaos events
	if (severity === 'critical') {
		return '#dc2626' // dark red
	} else if (severity === 'warning') {
		return '#f59e0b' // orange
	} else if (severity === 'info') {
		return '#10b981' // green
	}

	// Docker events colors
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
 * Format chaos event label
 */
function formatChaosEventLabel(event: ChaosEvent): string {
	// Format target (shorten container name if needed)
	let target = event.target
	if (target.startsWith('ydb-')) {
		target = target.replace('ydb-', '')
	}

	// Format action label
	let label = `[${event.scenario}] ${event.action} ${target}`

	// Add relevant metadata
	if (event.metadata.timeout !== undefined) {
		label += ` (timeout=${event.metadata.timeout}s)`
	}
	if (event.metadata.duration_seconds !== undefined) {
		label += ` (${event.metadata.duration_seconds}s)`
	}
	if (event.metadata.recovery_time_seconds !== undefined) {
		label += ` (recovery=${event.metadata.recovery_time_seconds}s)`
	}
	if (event.metadata.signal) {
		label += ` (${event.metadata.signal})`
	}

	return label
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
		action: event.action,
		type: 'chaos',
		label: formatChaosEventLabel(event),
		icon: getEventIcon(event.action),
		color: getEventColor(event.action, event.severity),
		actor: event.scenario,
		source: 'chaos' as const,
	}))
}
