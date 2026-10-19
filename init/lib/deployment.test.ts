import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import { test } from 'bun:test'

import { deployCompose } from './deployment.js'

async function fixture(script: string) {
	let cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'slo-deployment-'))
	let log = path.join(cwd, 'stages.txt')
	await fs.writeFile(
		path.join(cwd, 'docker'),
		`#!/bin/sh\nprintf '%s\\n' "$*" >> "$DEPLOYMENT_LOG"\n${script}\n`,
		{ mode: 0o755 }
	)
	let options = {
		cwd,
		composeFile: 'compose.yml',
		env: { PATH: `${cwd}:${process.env.PATH}`, DEPLOYMENT_LOG: log },
		timeoutSeconds: 10,
	}
	return { options, log, cleanup: () => fs.rm(cwd, { recursive: true, force: true }) }
}

test('deployment completes pull and build before starting workloads', async () => {
	let run = await fixture('exit 0')
	try {
		await deployCompose(run.options)
		let stages = (await fs.readFile(run.log, 'utf-8')).trim().split('\n')
		assert.deepEqual(stages, [
			'compose --progress plain -f compose.yml pull --ignore-buildable --policy missing',
			'compose --progress plain -f compose.yml build',
			'compose --progress plain -f compose.yml up --no-build --pull never --detach',
		])
	} finally {
		await run.cleanup()
	}
})

test('a failed image pull never reaches build or workload startup', async () => {
	let run = await fixture('exit 7')
	try {
		await assert.rejects(deployCompose(run.options), /7/)
		let stages = (await fs.readFile(run.log, 'utf-8')).trim().split('\n')
		assert.equal(stages.length, 3)
		assert.ok(stages.every((stage) => stage.includes(' pull ')))
	} finally {
		await run.cleanup()
	}
})

test('a stalled image pull is terminated by the total deployment budget', async () => {
	let run = await fixture('exec sleep 60')
	try {
		await assert.rejects(deployCompose({ ...run.options, timeoutSeconds: 1 }), /124/)
		let stages = (await fs.readFile(run.log, 'utf-8')).trim().split('\n')
		assert.equal(stages.length, 1)
		assert.ok(stages[0].includes(' pull '))
	} finally {
		await run.cleanup()
	}
})
