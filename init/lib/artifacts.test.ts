import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'

import { test } from 'bun:test'

import { collectExtraArtifacts, extraArtifactsPath } from './artifacts.js'

test('collectExtraArtifacts returns files from .slo/extra recursively', async () => {
	let root = await fs.mkdtemp(path.join(os.tmpdir(), 'slo-extra-'))

	try {
		let extraDir = extraArtifactsPath(root)
		await fs.mkdir(path.join(extraDir, 'flamegraphs'), { recursive: true })
		await fs.writeFile(path.join(extraDir, 'summary.txt'), 'ok')
		await fs.writeFile(path.join(extraDir, 'flamegraphs', 'cpu.html'), '<html></html>')

		let files = await collectExtraArtifacts(root)

		assert.equal(files.length, 2)
		assert.ok(files.some((file) => file.endsWith(`${path.sep}summary.txt`)))
		assert.ok(files.some((file) => file.endsWith(`${path.sep}cpu.html`)))
	} finally {
		await fs.rm(root, { recursive: true, force: true })
	}
})

test('collectExtraArtifacts returns empty list when extra dir is missing', async () => {
	let root = await fs.mkdtemp(path.join(os.tmpdir(), 'slo-extra-'))

	try {
		assert.deepEqual(await collectExtraArtifacts(root), [])
	} finally {
		await fs.rm(root, { recursive: true, force: true })
	}
})
