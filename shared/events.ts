/**
 * Event visualization types
 *
 * FormattedEvent is used for rendering events/alerts on timelines in HTML reports
 */

export interface FormattedEvent {
	icon: string
	label: string
	timestamp: number // milliseconds (epoch_ms)
	duration_ms?: number
}
