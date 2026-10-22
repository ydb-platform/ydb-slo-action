import { expect, test } from 'bun:test'

import { getWorkloadType } from './workload-type.js'

for (let [input, expected] of [
	['', 'table'],
	['table', 'table'],
	['topic', 'topic'],
	['topic_tx', 'topic_tx'],
] as const) {
	test(`workload type ${input || 'default'} selects ${expected} operations`, () => {
		let previous = process.env['INPUT_WORKLOAD_TYPE']
		process.env['INPUT_WORKLOAD_TYPE'] = input
		try {
			expect(getWorkloadType()).toBe(expected)
		} finally {
			if (previous === undefined) delete process.env['INPUT_WORKLOAD_TYPE']
			else process.env['INPUT_WORKLOAD_TYPE'] = previous
		}
	})
}

test('an unknown workload type is rejected', () => {
	let previous = process.env['INPUT_WORKLOAD_TYPE']
	process.env['INPUT_WORKLOAD_TYPE'] = 'unknown'
	try {
		expect(getWorkloadType).toThrow(RangeError)
	} finally {
		if (previous === undefined) delete process.env['INPUT_WORKLOAD_TYPE']
		else process.env['INPUT_WORKLOAD_TYPE'] = previous
	}
})
