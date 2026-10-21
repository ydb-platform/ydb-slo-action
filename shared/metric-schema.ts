import { getInput } from '@actions/core'

export function getMetricSchema(): 'native' | 'legacy_table' | 'legacy_topic' | 'legacy_topic_tx' {
	let schema = getInput('metrics_schema') || 'native'
	if (
		schema !== 'native' &&
		schema !== 'legacy_table' &&
		schema !== 'legacy_topic' &&
		schema !== 'legacy_topic_tx'
	) {
		throw new RangeError(
			'metrics_schema must be native, legacy_table, legacy_topic or legacy_topic_tx'
		)
	}
	return schema
}
