import { PROMETHEUS_URL } from './constants'
import type { Metric } from './metrics'

export type Series = {
	metric: Record<string, string>
	values: [number, string][] // [timestamp (sec), value (float)]
}

export type PrometheusQueryRangeResponse = {
	status: 'success' | 'error'
	data: {
		resultType: 'matrix' | 'vector' | 'scalar' | 'string'
		result: Series[]
	}
	warnings: string[]
	infos: string[]
	error: string
}

function queryRange(query: string, start: Date, end: Date) {
	let url = new URL('/api/v1/query_range', PROMETHEUS_URL)
	url.searchParams.set('query', query)
	url.searchParams.set('start', Math.ceil(start.getTime() / 1000).toString())
	url.searchParams.set('end', Math.floor(end.getTime() / 1000).toString())
	url.searchParams.set('step', '1')

	return fetch(url.toString()).then((r) => r.json()) as Promise<PrometheusQueryRangeResponse>
}

export async function collectPrometheus(start: Date, end: Date, metrics: Metric[]): Promise<Record<string, Series[]>> {
	let results = {} as Record<string, Series[]>

	for (const m of metrics) {
		let { status, data } = await queryRange(m.query, start, end)
		if (status !== 'success') continue

		results[m.id] = data.result
	}

	return results
}
