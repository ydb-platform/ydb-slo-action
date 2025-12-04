import { test, expect } from 'bun:test'
import { getComposeProfiles } from './docker.js'

test('getComposeProfiles should extract profiles from real compose file', async () => {
	const file = import.meta.resolve('../../deploy/compose.yml')
	const profiles = await getComposeProfiles(new URL('.', file).pathname)

	// Should return an array
	expect(Array.isArray(profiles)).toBe(true)

	// Should contain the expected profiles
	expect(profiles).toContain('chaos')
	expect(profiles).toContain('telemetry')
})
