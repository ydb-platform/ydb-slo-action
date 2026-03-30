import * as assert from 'node:assert/strict'

import { test } from 'bun:test'

import { ema, fiveNumberSummary, histogram, iqr, percentile, trimmedMean } from './stats.js'

test('trimmedMean trims 10% from each side by default', () => {
	// 10 values, trim 1 from each side
	let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]
	let result = trimmedMean(values)
	// After trimming: [2, 3, 4, 5, 6, 7, 8, 9] → mean = 44/8 = 5.5
	assert.equal(result, 5.5)
})

test('trimmedMean returns NaN for empty array', () => {
	assert.ok(isNaN(trimmedMean([])))
})

test('trimmedMean falls back to regular mean when too few values', () => {
	let result = trimmedMean([10, 20], 0.5)
	assert.equal(result, 15)
})

test('ema computes exponential moving average', () => {
	let values = [10, 10, 10, 10]
	let result = ema(values, 0.5)
	assert.equal(result[0], 10)
	assert.equal(result[3], 10)
})

test('ema returns empty for empty input', () => {
	assert.deepEqual(ema([]), [])
})

test('histogram creates buckets', () => {
	let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	let h = histogram(values, 5)
	assert.equal(h.edges.length, 6) // 5 buckets = 6 edges
	assert.equal(h.counts.length, 5)
	assert.equal(
		h.counts.reduce((a, b) => a + b, 0),
		10
	) // all values accounted for
})

test('histogram handles single value', () => {
	let h = histogram([5, 5, 5], 10)
	assert.equal(h.counts[0], 3)
})

test('percentile returns correct values', () => {
	let sorted = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	assert.equal(percentile(sorted, 0.5), 5)
	assert.equal(percentile(sorted, 0.9), 9)
	assert.equal(percentile(sorted, 1.0), 10)
})

test('percentile returns NaN for empty array', () => {
	assert.ok(isNaN(percentile([], 0.5)))
})

test('iqr computes interquartile range', () => {
	let values = [1, 2, 3, 4, 5, 6, 7, 8]
	let result = iqr(values)
	// Q1 = percentile(sorted, 0.25) = 2, Q3 = percentile(sorted, 0.75) = 6
	assert.equal(result, 4)
})

test('iqr returns NaN for fewer than 4 values', () => {
	assert.ok(isNaN(iqr([1, 2, 3])))
})

test('fiveNumberSummary returns [min, q1, median, q3, max]', () => {
	let values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
	let [min, _q1, median, _q3, max] = fiveNumberSummary(values)
	assert.equal(min, 1)
	assert.equal(max, 10)
	assert.equal(median, 5)
})

test('fiveNumberSummary returns NaN tuple for empty array', () => {
	let result = fiveNumberSummary([])
	assert.ok(result.every(isNaN))
})
