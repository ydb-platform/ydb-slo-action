import { expect, test } from 'bun:test'

import { evaluateSloResult, parseSloResult, SloResultError, type SloResult } from './slo-result.js'

function completedResult(): SloResult {
	return {
		schemaVersion: 3,
		ref: 'current',
		runId: 'run-1',
		kind: 'table',
		verdict: 'PASS',
		checks: [
			{ id: 'T01', verdict: 'PASS', detail: 'Writes verified' },
			{ id: 'T02', verdict: 'PASS', detail: 'Reads verified' },
		],
		operations: [
			{ type: 'read', success: 10, error: 0 },
			{ type: 'write', success: 10, error: 0 },
		],
	}
}

test('accepts a complete result with verified reads and writes', () => {
	let input = JSON.stringify(completedResult())
	let result = parseSloResult(input)
	expect(evaluateSloResult(result, 'current').verdict).toBe('PASS')
})

test('rejects malformed JSON at the contract boundary', () => {
	expect(() => parseSloResult('{')).toThrow(SloResultError)
})

test('rejects negative operation counts', () => {
	let result = completedResult()
	let input = JSON.stringify({ ...result, operations: [{ type: 'read', success: -1, error: 0 }] })
	expect(() => parseSloResult(input)).toThrow(SloResultError)
})

test('ref mismatch is invalid even when checks passed', () => {
	let result = completedResult()
	expect(evaluateSloResult(result, 'baseline').verdict).toBe('INVALID')
})

test('an invariant failure overrides a claimed PASS', () => {
	let result: SloResult = {
		...completedResult(),
		checks: [{ id: 'T01', verdict: 'FAIL', detail: 'Payload mismatch' }],
	}
	expect(evaluateSloResult(result, 'current').verdict).toBe('FAIL')
})

test('missing required checks cannot produce PASS', () => {
	let result: SloResult = { ...completedResult(), checks: [] }
	expect(evaluateSloResult(result, 'current').verdict).toBe('INVALID')
})

test('zero successful observations cannot produce PASS', () => {
	let result: SloResult = {
		...completedResult(),
		operations: [{ type: 'read', success: 0, error: 0 }, { type: 'write', success: 0, error: 0 }],
	}
	expect(evaluateSloResult(result, 'current').verdict).toBe('INVALID')
})

test('topic delivery checks do not stand in for commit confirmation', () => {
	let result: SloResult = {
		...completedResult(),
		kind: 'topic',
		checks: [
			{ id: 'P01', verdict: 'PASS', detail: 'Delivered' },
			{ id: 'P02', verdict: 'PASS', detail: 'Both APIs verified' },
		],
	}
	expect(evaluateSloResult(result, 'current').verdict).toBe('INVALID')
})

test('a failed run remains FAIL with no measurements', () => {
	let result: SloResult = { ...completedResult(), verdict: 'FAIL', checks: [], operations: [] }
	expect(evaluateSloResult(result, 'current').verdict).toBe('FAIL')
})

test('logical availability is checked against the configured budget', () => {
	let result: SloResult = {
		...completedResult(),
		operations: [{ type: 'read', success: 1, error: 9 }, { type: 'write', success: 10, error: 0 }],
	}
	let check = evaluateSloResult(result, 'current', {
		neutral_change_percent: 5,
		default: { warning_change_percent: 20, critical_change_percent: 50 },
		metrics: [{ pattern: '*_availability', critical_min: 95 }],
	})
	expect(check.verdict).toBe('FAIL')
})

test('duplicate check identifiers cannot conceal an invalid result', () => {
	let result: SloResult = { ...completedResult(), checks: [...completedResult().checks, { id: 'T01', verdict: 'PASS', detail: '' }] }
	expect(evaluateSloResult(result, 'current').verdict).toBe('INVALID')
})
