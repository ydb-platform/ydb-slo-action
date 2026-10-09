import { execFileSync } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { expect, test } from 'bun:test'

import { prepareTls } from './tls.js'

for (let topology of ['compose.yml', 'compose.bridge.yml']) {
	test(`generates verified TLS endpoints for ${topology} without freezing workload inputs`, async () => {
		let directory = fs.mkdtempSync(path.join(os.tmpdir(), 'slo-tls-'))
		try {
			fs.cpSync(path.resolve(import.meta.dir, '../../deploy'), directory, { recursive: true })
			let file = prepareTls(directory, topology)
			prepareTls(directory, topology)
			let output = execFileSync(
				'docker',
				['compose', '-f', file, '--profile', '*', 'config', '--format', 'json'],
				{
					cwd: directory,
					encoding: 'utf8',
					env: {
						...process.env,
						WORKLOAD_CURRENT_IMAGE: 'node:24',
						WORKLOAD_CURRENT_COMMAND: '--worker=topic.run --topic.run.rps=500',
					},
				}
			)
			let config = JSON.parse(output)
			let workload = config.services['workload-current']
			expect(workload.image).toBe('node:24')
			expect(workload.command).toEqual(['--worker=topic.run', '--topic.run.rps=500'])
			expect(workload.environment.YDB_CONNECTION_STRING).toBe('grpcs://ydb:2135/Root/testdb')
			expect(workload.volumes[0].source).toBe(
				fs.realpathSync(path.join(directory, 'tls/public'))
			)
			expect(fs.readdirSync(path.join(directory, 'tls/public'))).toEqual(['ca.crt'])
			expect(fs.existsSync(path.join(directory, 'tls/ca.key'))).toBe(false)
			let cert = fs.readFileSync(path.join(directory, 'tls/server/server.crt'))
			for (let [name, service] of Object.entries(config.services) as [
				string,
				{
					command: string[]
					container_name: string
					networks: { slo: { ipv4_address: string } }
				},
			][]) {
				if (!/^(database|storage)-\d+$/.test(name)) continue
				expect(service.command).toContain('--grpcs-public-port')
				expect(service.command).toContain('--grpc-public-host')
				let certificate = new X509Certificate(cert)
				expect(certificate.checkHost(service.container_name)).toBe(service.container_name)
				let address = service.networks.slo.ipv4_address
				expect(certificate.checkIP(address)).toBe(address)
			}
			execFileSync(
				'node',
				[path.join(import.meta.dir, 'tls-probe.fixture.mjs'), path.join(directory, 'tls')],
				{ timeout: 10_000 }
			)
		} finally {
			fs.rmSync(directory, { recursive: true, force: true })
		}
	})
}
