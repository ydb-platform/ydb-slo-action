import { execFileSync } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from 'bun:test'

for (let topology of ['compose.yml', 'compose.bridge.yml']) {
	test(`loads ${topology} directly with both client endpoints and checked-in certificates`, () => {
		let directory = path.resolve(import.meta.dir, '../../deploy')
		let certificate = new X509Certificate(
			fs.readFileSync(path.join(directory, 'tls/server.crt'))
		)
		for (let endpoint of ['grpc://ydb:2136', 'grpcs://ydb:2135']) {
			let output = execFileSync(
				'docker',
				['compose', '-f', topology, '--profile', '*', 'config', '--format', 'json'],
				{
					cwd: directory,
					encoding: 'utf8',
					env: {
						...process.env,
						YDB_WORKLOAD_ENDPOINT: endpoint,
						WORKLOAD_CURRENT_IMAGE: 'example/workload:test',
						WORKLOAD_CURRENT_COMMAND: '--rate=500 --payload-size=32768',
					},
				}
			)
			let config = JSON.parse(output)
			for (let name of ['workload-current', 'workload-baseline']) {
				let workload = config.services[name]
				expect(workload.environment.YDB_CONNECTION_STRING).toBe(`${endpoint}/Root/testdb`)
				expect(workload.volumes).toHaveLength(1)
				expect(workload.volumes[0].source).toBe(path.join(directory, 'tls/ca.crt'))
			}
			expect(config.services['workload-current'].image).toBe('example/workload:test')
			expect(config.services['workload-current'].command).toEqual([
				'--rate=500',
				'--payload-size=32768',
			])
			for (let [name, service] of Object.entries(config.services) as [
				string,
				{
					hostname: string
					container_name: string
					networks: { slo: { ipv4_address: string } }
				},
			][]) {
				if (!/^(database|storage)-\d+$/.test(name)) continue
				expect(service.hostname).toBe(service.container_name)
				expect(certificate.checkHost(service.hostname)).toBe(service.hostname)
				let address = service.networks.slo.ipv4_address
				expect(certificate.checkIP(address)).toBe(address)
			}
		}
	})
}
