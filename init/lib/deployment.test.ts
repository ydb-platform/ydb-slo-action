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
		`#!/bin/sh
printf '%s\\n' "$*" >> "$DEPLOYMENT_LOG"
case "$*" in
  *"config --format json")
    printf '%s\\n' '{"services":{"workload-current":{"image":"ydb-app-current:latest"},"prometheus":{"image":"prom/prometheus@sha256:test"},"database":{"build":{"context":"./ydb"}}}}'
    exit 0 ;;
  "image inspect ydb-app-current:latest") exit 0 ;;
  "image inspect prom/prometheus@sha256:test") exit 1 ;;
esac
${script}
`,
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
			'compose --progress plain -f compose.yml config --format json',
			'image inspect ydb-app-current:latest',
			'image inspect prom/prometheus@sha256:test',
			'compose --progress plain -f compose.yml pull --ignore-buildable --policy missing prometheus',
			'compose --progress plain -f compose.yml build',
			'compose --progress plain -f compose.yml up --no-build --pull never --detach',
		])
	} finally {
		await run.cleanup()
	}
})

test('deployment never pulls a locally built latest workload image', async () => {
	let run = await fixture(`
case "$*" in
  *" pull "*)
    case "$*" in
      *" missing prometheus") exit 0 ;;
      *) exit 7 ;;
    esac
    ;;
esac
`)
	try {
		await deployCompose(run.options)
		let stages = (await fs.readFile(run.log, 'utf-8')).trim().split('\n')
		assert.ok(stages.some((stage) => stage.endsWith(' missing prometheus')))
		assert.ok(
			!stages.some((stage) => stage.includes(' pull ') && stage.includes('workload-current'))
		)
	} finally {
		await run.cleanup()
	}
})

test('a failed image pull never reaches build or workload startup', async () => {
	let run = await fixture('exit 7')
	try {
		await assert.rejects(deployCompose(run.options), /7/)
		let stages = (await fs.readFile(run.log, 'utf-8')).trim().split('\n')
		assert.equal(stages.filter((stage) => stage.includes(' pull ')).length, 3)
		assert.ok(!stages.some((stage) => stage.endsWith(' build') || stage.includes(' up ')))
	} finally {
		await run.cleanup()
	}
})

test('a stalled image pull is terminated by the total deployment budget', async () => {
	let run = await fixture('exec sleep 60')
	try {
		await assert.rejects(deployCompose({ ...run.options, timeoutSeconds: 1 }), /124/)
		let stages = (await fs.readFile(run.log, 'utf-8')).trim().split('\n')
		assert.equal(stages.filter((stage) => stage.includes(' pull ')).length, 1)
		assert.ok(!stages.some((stage) => stage.endsWith(' build') || stage.includes(' up ')))
	} finally {
		await run.cleanup()
	}
})
