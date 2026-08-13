import * as assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import * as path from 'node:path'

import { test } from 'bun:test'

let scriptPath = path.join(import.meta.dir, 'rootfs/opt/ydb.tech/scripts/chaos/otel_metric.py')
let probe = [
	'import importlib.util',
	'import json',
	'import sys',
	'spec = importlib.util.spec_from_file_location("otel_metric", sys.argv[1])',
	'module = importlib.util.module_from_spec(spec)',
	'spec.loader.exec_module(module)',
	'print(json.dumps(module.get_resource_attributes()))',
].join('\n')

function readResourceAttributes(overrides: Record<string, string> = {}): Record<string, string> {
	let env = {
		...process.env,
		OTEL_SERVICE_NAME: 'chaos-test',
		PYTHONDONTWRITEBYTECODE: '1',
	}
	delete env.OTEL_SERVICE_INSTANCE_ID
	Object.assign(env, overrides)

	let result = spawnSync('python3', ['-c', probe, scriptPath], {
		env,
		encoding: 'utf8',
	})

	assert.equal(result.status, 0, result.stderr)
	return JSON.parse(result.stdout)
}

test('chaos OTLP resource keeps one instance id across exporter processes', () => {
	let first = readResourceAttributes()
	let second = readResourceAttributes()

	assert.equal(first['service.name'], 'chaos-test')
	assert.ok(first['service.instance.id'])
	assert.equal(second['service.instance.id'], first['service.instance.id'])
})

test('chaos OTLP resource accepts an explicit instance id', () => {
	let attributes = readResourceAttributes({ OTEL_SERVICE_INSTANCE_ID: 'chaos-instance' })

	assert.equal(attributes['service.instance.id'], 'chaos-instance')
})

test('chaos OTLP resource falls back from an empty instance id', () => {
	let attributes = readResourceAttributes({ OTEL_SERVICE_INSTANCE_ID: '' })

	assert.ok(attributes['service.instance.id'])
})
