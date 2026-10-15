import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as fs from 'node:fs'
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
	'Action defaults to two database nodes and permits the full topology',
	async () => {
		let action: unknown = Bun.YAML.parse(
			fs.readFileSync(path.resolve(import.meta.dir, '../action.yml'), 'utf-8')
		)
		assert.ok(typeof action === 'object' && action !== null && 'inputs' in action)
		let inputs = action.inputs
		assert.ok(
			typeof inputs === 'object' && inputs !== null && 'disable_compose_profiles' in inputs
		)
		let input = inputs.disable_compose_profiles
		assert.ok(typeof input === 'object' && input !== null)
		let defaultInput = 'default' in input ? input.default : undefined
		let disabled = typeof defaultInput === 'string' ? defaultInput.split(',') : []
		let { getComposeProfiles } = await import('./docker.js')
		let cwd = path.resolve(import.meta.dir, '../../deploy')

		for (let [composeFile, fullCount] of [
			['compose.yml', 5],
			['compose.bridge.yml', 4],
		] as const) {
			for (let variant of [
				{ disabled, count: 2 },
				{ disabled: [], count: fullCount },
			]) {
				let profiles = await getComposeProfiles(cwd, variant.disabled, composeFile)
				let result = spawnSync(
					'docker',
					[
						'compose',
						'-f',
						composeFile,
						...profiles.flatMap((profile) => ['--profile', profile]),
						'config',
						'--format',
						'json',
					],
					{ cwd, encoding: 'utf-8' }
				)
				assert.equal(result.status, 0, result.stderr)
				let services = Object.keys(JSON.parse(result.stdout).services)
				assert.equal(
					services.filter((name) => /^database-\d+$/.test(name)).length,
					variant.count
				)
			}
		}
	}
)

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
