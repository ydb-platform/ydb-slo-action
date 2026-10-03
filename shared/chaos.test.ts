import { expect, test } from 'bun:test'
import { parseChaosScenarios } from './chaos.js'

test('completed scenarios retain their measured execution window', () => {
	let logs = [
		'ydb-chaos-monkey | [2026-10-03T10:00:00Z] Running scenario: 01-graceful-stop',
		'ydb-chaos-monkey | [2026-10-03T10:00:26Z] Completed scenario: 01-graceful-stop',
	].join('\n')
	let scenarios = parseChaosScenarios(logs)
	expect(scenarios).toEqual([{
		name: '01-graceful-stop',
		startedAt: '2026-10-03T10:00:00Z',
		finishedAt: '2026-10-03T10:00:26Z',
		status: 'completed',
	}])
})

test('failed scenarios keep their exit code and ignore other container messages', () => {
	let logs = [
		'ydb-chaos-monkey | [2026-10-03T10:00:00Z] Running scenario: 03-sigkill',
		'workload-current | [2026-10-03T10:00:01Z] Completed scenario: 03-sigkill',
		'ydb-chaos-monkey | [2026-10-03T10:00:02Z] Failed scenario: 03-sigkill (exit 7)',
	].join('\n')
	let scenarios = parseChaosScenarios(logs)
	expect(scenarios[0].status).toBe('failed')
	expect(scenarios[0].exitCode).toBe(7)
})

test('a new scenario cannot turn an unfinished predecessor into a success', () => {
	let logs = [
		'ydb-chaos-monkey | [2026-10-03T10:00:00Z] Running scenario: 01-graceful-stop',
		'ydb-chaos-monkey | [2026-10-03T10:00:30Z] Running scenario: 06-ip-blackhole',
	].join('\n')
	let scenarios = parseChaosScenarios(logs)
	expect(scenarios.map((scenario) => scenario.status)).toEqual(['incomplete', 'incomplete'])
	expect(scenarios.every((scenario) => scenario.finishedAt === undefined)).toBe(true)
})

test('legacy completion records do not invent an end timestamp', () => {
	let logs = [
		'ydb-chaos-monkey | [2026-10-03T10:00:00Z] Running scenario: 05-rolling-restart',
		'ydb-chaos-monkey | [2026-10-03T10:00:20Z] Recovered: rolling-restart (Node restarted)',
		'ydb-chaos-monkey | Rolling restart completed for all 5 nodes',
	].join('\n')
	let scenarios = parseChaosScenarios(logs)
	expect(scenarios[0].status).toBe('completed')
	expect(scenarios[0].finishedAt).toBeUndefined()
})
