import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as path from 'node:path'

import { test } from 'bun:test'

let hasDockerCompose = () =>
	spawnSync('docker', ['compose', 'version'], { encoding: 'utf-8' }).status === 0

test.if(hasDockerCompose())('getComposeProfiles extracts profiles from compose files', async () => {
	let { getComposeProfiles } = await import('./docker.js')

	let cwd = path.resolve(import.meta.dir, '../../deploy')

	for (let composeFile of ['compose.yml', 'compose.bridge.yml']) {
		let profiles = await getComposeProfiles(cwd, [], composeFile)

		assert.ok(profiles.includes('chaos'))
		assert.ok(profiles.includes('telemetry'))
		assert.ok(profiles.includes('workload-current'))
		assert.ok(profiles.includes('workload-baseline'))
	}
})

test.if(hasDockerCompose())(
	'bridge compose assigns storage and compute nodes to both piles',
	() => {
		let cwd = path.resolve(import.meta.dir, '../../deploy')
		let result = spawnSync(
			'docker',
			[
				'compose',
				'-f',
				'compose.bridge.yml',
				'--profile',
				'chaos',
				'config',
				'--format',
				'json',
			],
			{ cwd, encoding: 'utf-8' }
		)

		assert.equal(result.status, 0, result.stderr)

		let services = JSON.parse(result.stdout).services
		let pile = (service: string) => services[service].labels['ydb.node.location.pile']

		assert.equal(pile('storage-1'), 'pile-1')
		assert.equal(pile('storage-2'), 'pile-2')
		assert.equal(pile('database-1'), 'pile-1')
		assert.equal(pile('database-2'), 'pile-2')
		assert.equal(
			services['database-1'].environment.YDB_NODE_BROKERS,
			'grpc://ydb-storage-1:2136,grpc://ydb-storage-2:2136'
		)
		assert.equal(
			services['chaos-monkey'].environment.CHAOS_SCENARIOS_DIR,
			'/opt/ydb.tech/chaos/bridge-scenarios'
		)
		assert.equal(services['chaos-monkey'].environment.BRIDGE_TRANSITION_DELAY, '15')
	}
)
