import { execFileSync } from 'node:child_process'
import { X509Certificate } from 'node:crypto'
import * as fs from 'node:fs'
import * as path from 'node:path'

import { expect, test } from 'bun:test'

for (let topology of ['compose.yml', 'compose.bridge.yml']) {
	test(`configures trusted TLS endpoints for ${topology}`, () => {
		let directory = path.resolve(import.meta.dir, '../../deploy')
		let certificate = new X509Certificate(
			fs.readFileSync(path.join(directory, 'tls/server.crt'))
		)
		let output = execFileSync(
			'docker',
			['compose', '-f', topology, '--profile', '*', 'config', '--format', 'json'],
			{
				cwd: directory,
				encoding: 'utf8',
				env: { ...process.env, YDB_WORKLOAD_ENDPOINT: 'grpcs://ydb:2135' },
			}
		)
		let config = JSON.parse(output)
		for (let name of ['workload-current', 'workload-baseline']) {
			let workload = config.services[name]
			expect(workload.environment.YDB_CONNECTION_STRING).toBe('grpcs://ydb:2135/Root/testdb')
			let ca = workload.volumes.find(
				(volume: { target: string }) => volume.target === '/tls/ca.crt'
			)
			expect(ca).toMatchObject({
				source: path.join(directory, 'tls/ca.crt'),
				read_only: true,
			})
			for (let variable of [
				'YDB_SSL_ROOT_CERTIFICATES_FILE',
				'GRPC_DEFAULT_SSL_ROOTS_FILE_PATH',
				'NODE_EXTRA_CA_CERTS',
				'SSL_CERT_FILE',
			])
				expect(workload.environment[variable]).toBe('/tls/ca.crt')
		}
		expect(certificate.checkHost('ydb')).toBe('ydb')
		for (let [name, service] of Object.entries(config.services) as [
			string,
			{ hostname: string; networks: { slo: { ipv4_address: string } } },
		][]) {
			if (!/^(database|storage)-\d+$/.test(name)) continue
			expect(certificate.checkHost(service.hostname)).toBe(service.hostname)
			let address = service.networks.slo.ipv4_address
			expect(certificate.checkIP(address)).toBe(address)
		}
	})
}
