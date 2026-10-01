import * as assert from 'node:assert/strict'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { test } from 'bun:test'

let libraryPath = path.join(import.meta.dir, 'rootfs/opt/ydb.tech/scripts/chaos/libchaos.sh')

for (let [status, expected] of [['healthy', 0], ['unhealthy', 1]] as const) {
	test(`node recovery requires exact healthy status: ${status}`, async () => {
		let library = (await fs.readFile(libraryPath, 'utf8'))
			.replace('. /opt/ydb.tech/scripts/chaos/libotel.sh', '')
		let process = Bun.spawn(['sh', '-s'], {
			env: { ...globalThis.process.env, HEALTH_STATUS: status },
			stdin: new Blob([library, `
docker() { printf '%s\\n' "$HEALTH_STATUS"; }
sleep() { :; }
wait_container_healthy owned-node 1
`]),
			stdout: 'pipe',
			stderr: 'pipe',
		})
		let stderr = await new Response(process.stderr).text()
		assert.equal(await process.exited, expected, stderr)
	})
}
