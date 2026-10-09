import { execFileSync } from 'node:child_process'
import * as fs from 'node:fs'
import * as path from 'node:path'

type Service = {
	container_name?: string
	hostname?: string
	command?: string | string[]
	environment?: string[] | Record<string, string>
	volumes?: unknown[]
	networks?: Record<string, { ipv4_address?: string }>
}
export type Compose = { services: Record<string, Service> }

function environment(service: Service): Record<string, string> {
	if (!Array.isArray(service.environment)) return { ...service.environment }
	return Object.fromEntries(
		service.environment.map((entry) => {
			let separator = entry.indexOf('=')
			if (separator < 0) throw new Error(`TLS requires explicit environment value: ${entry}`)
			return [entry.slice(0, separator), entry.slice(separator + 1)]
		})
	)
}

export function configureTls(compose: Compose): string[] {
	let names = new Set(['DNS:ydb', 'DNS:localhost', 'IP:127.0.0.1'])
	for (let [name, service] of Object.entries(compose.services)) {
		if (!/^(storage|database)-\d+$/.test(name)) continue
		service.hostname ??= service.container_name ?? name
		for (let host of [name, service.hostname, service.container_name]) {
			if (host) names.add(`DNS:${host}`)
		}
		for (let network of Object.values(service.networks ?? {})) {
			if (network.ipv4_address) names.add(`IP:${network.ipv4_address}`)
		}
		if (!Array.isArray(service.command)) throw new Error(`Expected node arguments for ${name}`)
		service.command.push(
			'--grpc-public-host',
			service.hostname,
			'--grpcs-port',
			'2135',
			'--grpcs-public-port',
			'2135',
			'--grpc-cert',
			'/tls/server.crt',
			'--grpc-key',
			'/tls/server.key',
			'--grpc-ca',
			'/tls/ca.crt'
		)
		service.volumes = [...(service.volumes ?? []), './tls/server:/tls:ro']
	}
	for (let name of ['workload-current', 'workload-baseline']) {
		let service = compose.services[name]!
		service.environment = {
			...environment(service),
			YDB_ENDPOINT: 'grpcs://ydb:2135',
			YDB_CONNECTION_STRING: 'grpcs://ydb:2135/Root/testdb',
			YDB_SSL_ROOT_CERTIFICATES_FILE: '/tls/ca.crt',
			GRPC_DEFAULT_SSL_ROOTS_FILE_PATH: '/tls/ca.crt',
			NODE_EXTRA_CA_CERTS: '/tls/ca.crt',
			SSL_CERT_FILE: '/tls/ca.crt',
		}
		service.volumes = [...(service.volumes ?? []), './tls/public:/tls:ro']
	}
	let readiness = compose.services['database-readiness']!
	readiness.environment = {
		...environment(readiness),
		YDB_READINESS_SCHEME: 'grpcs',
		YDB_READINESS_PORT: '2135',
		YDB_TLS_CA_FILE: '/tls/ca.crt',
	}
	readiness.volumes = [...(readiness.volumes ?? []), './tls/public:/tls:ro']
	compose.services['blackhole']!.command = "tcp-listen:2135,fork,reuseaddr exec:'/bin/cat'"
	return [...names]
}

export function createCertificates(directory: string, names: string[]): void {
	fs.mkdirSync(path.join(directory, 'server'), { recursive: true })
	fs.mkdirSync(path.join(directory, 'public'), { recursive: true })
	let openssl = (args: string[]) =>
		execFileSync('openssl', args, { cwd: directory, stdio: 'pipe' })
	try {
		openssl([
			'req',
			'-x509',
			'-newkey',
			'rsa:2048',
			'-nodes',
			'-days',
			'2',
			'-subj',
			'/CN=YDB SLO test CA',
			'-addext',
			'basicConstraints=critical,CA:TRUE',
			'-addext',
			'keyUsage=critical,keyCertSign,cRLSign',
			'-keyout',
			'ca.key',
			'-out',
			'public/ca.crt',
		])
		fs.rmSync(path.join(directory, 'server/server.key'), { force: true })
		openssl([
			'req',
			'-newkey',
			'rsa:2048',
			'-nodes',
			'-subj',
			'/CN=ydb',
			'-keyout',
			'server/server.key',
			'-out',
			'server.csr',
		])
		fs.writeFileSync(
			path.join(directory, 'server.ext'),
			`basicConstraints=critical,CA:FALSE\nkeyUsage=critical,digitalSignature,keyEncipherment\nextendedKeyUsage=serverAuth\nsubjectAltName=${names.join(',')}\n`
		)
		openssl([
			'x509',
			'-req',
			'-in',
			'server.csr',
			'-CA',
			'public/ca.crt',
			'-CAkey',
			'ca.key',
			'-CAcreateserial',
			'-days',
			'2',
			'-extfile',
			'server.ext',
			'-out',
			'server/server.crt',
		])
		fs.copyFileSync(
			path.join(directory, 'public/ca.crt'),
			path.join(directory, 'server/ca.crt')
		)
		// The test server runs as UID 1001; workloads mount only the public CA directory.
		fs.chmodSync(path.join(directory, 'server/server.key'), 0o444)
	} finally {
		for (let file of ['ca.key', 'public/ca.srl', 'server.csr', 'server.ext'])
			fs.rmSync(path.join(directory, file), { force: true })
	}
}

export function prepareTls(cwd: string, composeFile: string): string {
	let compose: Compose = JSON.parse(
		execFileSync(
			'docker',
			[
				'compose',
				'-f',
				composeFile,
				'--profile',
				'*',
				'config',
				'--no-interpolate',
				'--format',
				'json',
			],
			{ cwd, encoding: 'utf8' }
		)
	)
	let names = configureTls(compose)
	createCertificates(path.join(cwd, 'tls'), names)
	let output = 'compose.tls.json'
	fs.writeFileSync(path.join(cwd, output), JSON.stringify(compose, null, 2) + '\n')
	return output
}
