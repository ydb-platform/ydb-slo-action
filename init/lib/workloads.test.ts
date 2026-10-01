import * as assert from 'node:assert/strict'
import * as actionsExec from '@actions/exec'
import { setSystemTime, spyOn, test } from 'bun:test'

import * as slo from './slo.js'
import { waitForWorkloads } from './workloads.js'

test('explicit completion budget permits drain beyond duration plus sixty seconds', async () => {
	let inputs = {
		INPUT_WORKLOAD_DURATION: '1',
		INPUT_WORKLOAD_COMPLETION_TIMEOUT: '90',
		INPUT_WORKLOAD_CURRENT_IMAGE: 'fixture',
		INPUT_WORKLOAD_BASELINE_IMAGE: '',
		INPUT_FAIL_ON_WORKLOAD_ERROR: 'true',
	}
	let savedInputs = Object.fromEntries(Object.keys(inputs).map(key => [key, process.env[key]]))
	Object.assign(process.env, inputs)

	let originalTimeout = globalThis.setTimeout
	let timers: { handle: ReturnType<typeof setTimeout>; deadline: number; fire: () => void }[] = []
	let timerSpy = spyOn(globalThis, 'setTimeout').mockImplementation(new Proxy(originalTimeout, {
		apply(target, _receiver, args: Parameters<typeof setTimeout>) {
			let [callback, delay, ...parameters] = args
			let handle = target(callback, delay, ...parameters)
			timers.push({ handle, deadline: Date.now() + (delay ?? 0), fire: () => callback(...parameters) })
			return handle
		},
	}))
	let releaseWait: (() => void) | undefined
	let started = Promise.withResolvers<void>()
	let completion = Promise.withResolvers<number>()
	let execSpy = spyOn(actionsExec, 'exec').mockImplementation(async (_command, args, options) => {
		if (args?.[0] === 'wait') {
			releaseWait = () => {
				options?.listeners?.stdout?.(Buffer.from('0\n'))
				completion.resolve(0)
			}
			started.resolve()
			return completion.promise
		}
		return 0
	})
	let gateSpy = spyOn(slo, 'validateWorkloads').mockResolvedValue(undefined)
	try {
		setSystemTime(Date.UTC(2026, 0, 1))
		let start = Date.now()
		let waiting = waitForWorkloads('/tmp/slo-workload-budget')
		await started.promise
		setSystemTime(start + 62_000)
		for (let timer of timers) {
			if (timer.deadline <= Date.now()) timer.fire()
		}
		assert.ok(releaseWait)
		releaseWait()
		await waiting
		assert.equal(gateSpy.mock.calls.length, 1)
		let window = gateSpy.mock.calls[0][2]
		assert.equal(window.finish.getTime() - window.start.getTime(), 62_000)
		assert.deepEqual(window.failures, [])
	} finally {
		for (let timer of timers) clearTimeout(timer.handle)
		timerSpy.mockRestore()
		execSpy.mockRestore()
		gateSpy.mockRestore()
		setSystemTime()
		for (let [key, value] of Object.entries(savedInputs)) {
			if (value === undefined) delete process.env[key]
			else process.env[key] = value
		}
	}
})
