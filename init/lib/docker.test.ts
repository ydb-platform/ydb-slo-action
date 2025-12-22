import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as path from 'node:path'

import { test } from 'bun:test'

let hasYq = () => spawnSync('yq', ['--version'], { encoding: 'utf-8' }).status === 0

test.if(hasYq())('getComposeProfiles extracts profiles from deploy/compose.yml', async () => {
	let { getComposeProfiles } = await import('./docker.js')

	let cwd = path.resolve(import.meta.dir, '../../deploy')
	let profiles = await getComposeProfiles(cwd)

	// Should return an array
	assert.ok(Array.isArray(profiles))

	// Should contain the expected profiles
	assert.ok(profiles.includes('chaos'))
	assert.ok(profiles.includes('telemetry'))
})
