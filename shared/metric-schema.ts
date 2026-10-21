import { getInput } from '@actions/core'

export function getMetricSchema(): 'native' | 'legacy_table' {
	let schema = getInput('metrics_schema') || 'native'
	if (schema !== 'native' && schema !== 'legacy_table') {
		throw new RangeError('metrics_schema must be native or legacy_table')
	}
	return schema
}
