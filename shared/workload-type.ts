import { getInput } from '@actions/core'

export function getWorkloadType(): 'table' | 'topic' | 'topic_tx' {
	let type = getInput('workload_type') || 'table'
	if (type !== 'table' && type !== 'topic' && type !== 'topic_tx') {
		throw new RangeError('workload_type must be table, topic or topic_tx')
	}
	return type
}
