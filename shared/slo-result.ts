import {
	evaluateAbsoluteThreshold,
	type ThresholdConfig,
} from './thresholds.js'

export type SloVerdict = 'PASS' | 'FAIL' | 'INVALID'

export type SloCheck = {
	readonly id: string
	readonly verdict: SloVerdict
	readonly detail: string
}

export type SloSummary = {
	readonly schemaVersion: 3
	readonly verdict: SloVerdict
	readonly checks: readonly SloCheck[]
}

export type SloOperationCount = {
	readonly type: string
	readonly success: number
	readonly error: number
}

export type SloResult = {
	readonly schemaVersion: 3
	readonly ref: string
	readonly runId: string
	readonly kind: 'table' | 'topic'
	readonly verdict: SloVerdict
	readonly checks: readonly SloCheck[]
	readonly operations: readonly SloOperationCount[]
}

export class SloResultError extends Error {
	constructor(readonly reason: string) {
		super(`Invalid SLO V3 result: ${reason}`)
	}
}

function isVerdict(value: unknown): value is SloVerdict {
	return value === 'PASS' || value === 'FAIL' || value === 'INVALID'
}

function isCheck(value: unknown): value is SloCheck {
	return (
		typeof value === 'object' &&
		value !== null &&
		'id' in value &&
		typeof value.id === 'string' &&
		value.id.length > 0 &&
		'verdict' in value &&
		isVerdict(value.verdict) &&
		'detail' in value &&
		typeof value.detail === 'string'
	)
}

function isOperation(value: unknown): value is SloOperationCount {
	return (
		typeof value === 'object' &&
		value !== null &&
		'type' in value &&
		typeof value.type === 'string' &&
		'success' in value &&
		typeof value.success === 'number' &&
		Number.isSafeInteger(value.success) &&
		value.success >= 0 &&
		'error' in value &&
		typeof value.error === 'number' &&
		Number.isSafeInteger(value.error) &&
		value.error >= 0
	)
}

function decodeJson(content: string): unknown {
	try {
		return JSON.parse(content)
	} catch (error) {
		if (error instanceof SyntaxError) throw new SloResultError(error.message)
		throw error
	}
}

export function parseSloSummary(content: string): SloSummary {
	let value = decodeJson(content)
	if (
		typeof value !== 'object' || value === null ||
		!('schemaVersion' in value) || value.schemaVersion !== 3 ||
		!('verdict' in value) || !isVerdict(value.verdict) ||
		!('checks' in value) || !Array.isArray(value.checks) || !value.checks.every(isCheck)
	) throw new SloResultError('Invalid scenario summary')
	return { schemaVersion: 3, verdict: value.verdict, checks: value.checks }
}

export function parseSloResult(content: string): SloResult {
	let value = decodeJson(content)
	if (
		typeof value !== 'object' ||
		value === null ||
		!('schemaVersion' in value) ||
		value.schemaVersion !== 3 ||
		!('ref' in value) ||
		typeof value.ref !== 'string' ||
		!('runId' in value) ||
		typeof value.runId !== 'string' ||
		value.runId.length === 0 ||
		!('kind' in value) ||
		(value.kind !== 'table' && value.kind !== 'topic') ||
		!('verdict' in value) ||
		!isVerdict(value.verdict) ||
		!('checks' in value) ||
		!Array.isArray(value.checks) ||
		!value.checks.every(isCheck) ||
		!('operations' in value) ||
		!Array.isArray(value.operations) ||
		!value.operations.every(isOperation)
	) {
		throw new SloResultError('schema, verdict, checks or operation counts do not match V3')
	}
	return {
		schemaVersion: 3,
		ref: value.ref,
		runId: value.runId,
		kind: value.kind,
		verdict: value.verdict,
		checks: value.checks,
		operations: value.operations,
	}
}

export function evaluateSloResult(
	result: SloResult,
	expectedRef: string,
	thresholds?: ThresholdConfig
): SloCheck {
	if (result.ref !== expectedRef) {
		return { id: 'contract', verdict: 'INVALID', detail: 'Workload ref does not match the run' }
	}
	if (result.verdict === 'FAIL' || result.checks.some((check) => check.verdict === 'FAIL')) {
		let detail = result.checks.filter((check) => check.verdict === 'FAIL')
			.map((check) => `${check.id}: ${check.detail}`).join('; ')
		return { id: 'contract', verdict: 'FAIL', detail: detail || 'Workload reported FAIL' }
	}
	let required = result.kind === 'table' ? ['T01', 'T02'] : ['P01', 'P02', 'P03']
	let ids = result.checks.map((check) => check.id)
	if (
		new Set(ids).size !== ids.length ||
		result.verdict !== 'PASS' ||
		result.checks.some((check) => check.verdict !== 'PASS') ||
		required.some((id) => !result.checks.some((check) => check.id === id && check.verdict === 'PASS'))
	) {
		return { id: 'contract', verdict: 'INVALID', detail: 'Required scenario checks are missing or invalid' }
	}
	if (['read', 'write'].some((type) => !result.operations.some((operation) => operation.type === type && operation.success > 0))) {
		return { id: 'contract', verdict: 'INVALID', detail: 'No successful read/write observations' }
	}
	if (new Set(result.operations.map((operation) => operation.type)).size !== result.operations.length) {
		return { id: 'contract', verdict: 'INVALID', detail: 'Duplicate operation counts' }
	}
	if (thresholds) {
		for (let operation of result.operations) {
			let total = operation.success + operation.error
			if (total === 0) continue
			let check = evaluateAbsoluteThreshold(
				`${operation.type}_availability`,
				100 * operation.success / total,
				'higher_is_better',
				thresholds
			)
			if (check.severity === 'failure') {
				return { id: 'availability', verdict: 'FAIL', detail: check.violations.join('; ') }
			}
		}
	}
	return { id: 'contract', verdict: 'PASS', detail: 'Required workload checks passed' }
}
