// src/post.ts
import * as fs from 'node:fs'
import * as path from 'node:path'
import { exec } from '@actions/exec'
import { debug, getInput, getState, info, warning } from '@actions/core'
import { DefaultArtifactClient } from '@actions/artifact'

// src/constants.ts
var HOST = 'localhost',
	YDB_GRPC_PORT = 2135,
	YDB_MON_PORT = 8765,
	YDB_IC_PORT = 19001,
	YDB_TENANT = '/Root/testdb',
	PROMETHEUS_PORT = 9090,
	PROMETHEUS_PUSHGATEWAY_PORT = 9091,
	YDB_ENDPOINT = 'grpc://localhost:2135'
var PROMETHEUS_URL = 'http://localhost:9090'

// src/prometheus.ts
function queryRange(query, start, end) {
	let url = new URL('/api/v1/query_range', PROMETHEUS_URL)
	return (
		url.searchParams.set('query', query),
		url.searchParams.set('start', Math.ceil(start.getTime() / 1000).toString()),
		url.searchParams.set('end', Math.floor(end.getTime() / 1000).toString()),
		url.searchParams.set('step', '1'),
		fetch(url.toString()).then((r) => r.json())
	)
}
async function collectPrometheus(start, end, metrics) {
	let results = {}
	for (let m of metrics) {
		let { status, data } = await queryRange(m.query, start, end)
		if (status !== 'success') continue
		results[m.id] = data.result
	}
	return results
}

// src/metrics.ts
var defaultMetrics = [
	{
		id: 'read_latency_ms',
		query: '1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="read"}[30s])))',
		description: '95th percentile read operations latency in milliseconds',
	},
	{
		id: 'write_latency_ms',
		query: '1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="write"}[30s])))',
		description: '95th percentile write operations latency in milliseconds',
	},
	{
		id: 'read_throughput',
		query: 'sum by(ref) (rate(sdk_operations_total{operation_type="read"}[30s]) > 0)',
		description: 'Read operations throughput',
	},
	{
		id: 'write_throughput',
		query: 'sum by(ref) (rate(sdk_operations_total{operation_type="write"}[30s]) > 0)',
		description: 'Write operations throughput',
	},
	{
		id: 'read_attempts',
		query: 'sum by(ref) (rate(sdk_retry_attempts{operation_type="read"}[30s]) > 0)',
		description: 'Read attempts throughput',
	},
	{
		id: 'write_attempts',
		query: 'sum by(ref) (rate(sdk_retry_attempts{operation_type="write"}[30s]) > 0)',
		description: 'Write attempts throughput',
	},
	{
		id: 'read_availability',
		query: '100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="read"}[30s])) / sum by (ref) (increase(sdk_operations_total{operation_type="read"}[30s]))',
		description: 'Read operations availability',
	},
	{
		id: 'write_availability',
		query: '100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="write"}[30s])) / sum by (ref) (increase(sdk_operations_total{operation_type="write"}[30s]))',
		description: 'Write operations availability',
	},
]

// src/post.ts
async function post() {
	let cwd = getState('cwd'),
		pull = getState('pull'),
		workload = getState('workload'),
		end = /* @__PURE__ */ new Date(),
		start = new Date(getState('start')),
		warmup = parseInt(getInput('warmup_seconds') || '0'),
		artifactClient = new DefaultArtifactClient()
	info('Collecting metrics for head ref...')
	let adjStart = new Date(start.getTime() + warmup * 1000),
		metrics = await collectPrometheus(adjStart, end, defaultMetrics)
	if (
		(info(`Metrics collected for head ref: ${Object.keys(metrics)}`),
		debug(`Head ref metrics: ${Object.keys(metrics)}`),
		!Object.keys(metrics).length)
	) {
		warning('No metrics collected.')
		return
	}
	{
		info('Writing metrics...')
		let metricsPath = path.join(cwd, `${workload}-metrics.json`)
		;(fs.writeFileSync(metricsPath, JSON.stringify(metrics), { encoding: 'utf-8' }),
			info(`Metrics written to ${metricsPath}`),
			info('Upload metrics as an artifact...'))
		let { id } = await artifactClient.uploadArtifact(`${workload}-metrics.json`, [metricsPath], cwd, {
			retentionDays: pull ? 1 : 30,
		})
		info(`Metrics uploaded as an artifact ${id}`)
	}
	;(info('Stopping YDB...'),
		await exec('docker', ['compose', '-f', 'compose.yaml', 'down'], { cwd }),
		info(`YDB stopped at ${end}`))
	let duration = end.getTime() - start.getTime()
	;(info(`YDB SLO Test duration: ${duration}ms.`),
		debug('Cleaning up temp directory...'),
		fs.rmSync(cwd, { recursive: !0 }))
}
post()
