/**
 * Pure statistical functions operating on number[] arrays.
 * No dependencies on metric types or external modules.
 */

export function percentile(sorted: number[], p: number): number {
	if (sorted.length === 0) return NaN
	let index = Math.ceil(sorted.length * p) - 1
	return sorted[Math.max(0, index)]
}

export function trimmedMean(values: number[], trimFraction: number = 0.1): number {
	if (values.length === 0) return NaN

	let sorted = [...values].sort((a, b) => a - b)
	let trimCount = Math.floor(sorted.length * trimFraction)

	if (sorted.length - 2 * trimCount <= 0) {
		// Not enough values to trim, fall back to regular mean
		return sorted.reduce((a, b) => a + b, 0) / sorted.length
	}

	let trimmed = sorted.slice(trimCount, sorted.length - trimCount)
	return trimmed.reduce((a, b) => a + b, 0) / trimmed.length
}

export function ema(values: number[], alpha: number = 0.15): number[] {
	if (values.length === 0) return []

	let result: number[] = [values[0]]
	for (let i = 1; i < values.length; i++) {
		result.push(alpha * values[i] + (1 - alpha) * result[i - 1])
	}
	return result
}

export function histogram(
	values: number[],
	targetBuckets: number = 20
): { edges: number[]; counts: number[] } {
	if (values.length === 0) return { edges: [], counts: [] }

	let min = Math.min(...values)
	let max = Math.max(...values)

	if (min === max) {
		return { edges: [min, min + 1], counts: [values.length] }
	}

	let bucketWidth = (max - min) / targetBuckets
	let edges: number[] = []
	for (let i = 0; i <= targetBuckets; i++) {
		edges.push(min + i * bucketWidth)
	}

	let counts = new Array(targetBuckets).fill(0)
	for (let v of values) {
		let idx = Math.min(Math.floor((v - min) / bucketWidth), targetBuckets - 1)
		counts[idx]++
	}

	return { edges, counts }
}

export function iqr(values: number[]): number {
	if (values.length < 4) return NaN
	let sorted = [...values].sort((a, b) => a - b)
	return percentile(sorted, 0.75) - percentile(sorted, 0.25)
}

export function fiveNumberSummary(values: number[]): [number, number, number, number, number] {
	if (values.length === 0) return [NaN, NaN, NaN, NaN, NaN]

	let sorted = [...values].sort((a, b) => a - b)
	return [
		sorted[0],
		percentile(sorted, 0.25),
		percentile(sorted, 0.5),
		percentile(sorted, 0.75),
		sorted[sorted.length - 1],
	]
}
