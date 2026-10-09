import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { connect, createServer } from 'node:tls'

let directory = process.argv[2]
let ca = readFileSync(join(directory, 'public/ca.crt'))
let server = createServer({
	cert: readFileSync(join(directory, 'server/server.crt')),
	key: readFileSync(join(directory, 'server/server.key')),
}, (socket) => socket.end())
server.on('tlsClientError', () => {})
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
let probe = (servername, trusted = true) => new Promise((resolve, reject) => {
	let socket = connect({ host: '127.0.0.1', port: server.address().port,
		servername, ca: trusted ? ca : [] })
	socket.once('secureConnect', () => { socket.destroy(); resolve() })
	socket.once('error', (error) => { socket.destroy(); reject(error) })
})
try {
	await probe('ydb')
	await probe('ydb-database-1')
	await assert.rejects(probe('wrong-host.invalid'), { code: 'ERR_TLS_CERT_ALTNAME_INVALID' })
	await assert.rejects(probe('ydb', false))
} finally {
	await new Promise((resolve) => server.close(resolve))
}
