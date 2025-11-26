export type PrometheusValueType = 'matrix' | 'vector' | 'scalar' | 'string'

export interface PrometheusMetric {
	[label: string]: string
}

export interface PrometheusInstantValue {
	metric: PrometheusMetric
	value: [number, string]
}

export interface PrometheusRangeValue {
	metric: PrometheusMetric
	values: Array<[number, string]>
}

export interface PrometheusResponse<T = PrometheusInstantValue | PrometheusRangeValue> {
	status: 'success' | 'error'
	data?: {
		resultType: PrometheusValueType
		result: T[]
	}
	errorType?: string
	error?: string
	warnings?: string[]
}

export interface PrometheusQueryOptions {
	url?: string
	timeout?: number
}

export interface PrometheusInstantQueryParams extends PrometheusQueryOptions {
	query: string
	time?: string | number
	queryTimeout?: string
}

export interface PrometheusRangeQueryParams extends PrometheusQueryOptions {
	query: string
	start: string | number
	end: string | number
	step?: string
	queryTimeout?: string
}

/**
 * Executes instant PromQL query at a specific point in time
 */
export async function queryInstant(
	params: PrometheusInstantQueryParams
): Promise<PrometheusResponse<PrometheusInstantValue>> {
	let baseUrl = params.url || 'http://localhost:9090'
	let timeout = params.timeout || 30000

	let url = new URL('/api/v1/query', baseUrl)
	url.searchParams.set('query', params.query)

	if (params.time !== undefined) {
		url.searchParams.set('time', params.time.toString())
	}

	if (params.queryTimeout) {
		url.searchParams.set('timeout', params.queryTimeout)
	}

	let response = await fetch(url.toString(), {
		signal: AbortSignal.timeout(timeout),
	})

	let data = (await response.json()) as PrometheusResponse<PrometheusInstantValue>

	if (!response.ok) {
		throw new Error(`Prometheus query failed: ${data.error || response.statusText}`)
	}

	return data
}

/**
 * Executes PromQL range query over a time period
 */
export async function queryRange(
	params: PrometheusRangeQueryParams
): Promise<PrometheusResponse<PrometheusRangeValue>> {
	let baseUrl = params.url || 'http://localhost:9090'
	let timeout = params.timeout || 30000

	let url = new URL('/api/v1/query_range', baseUrl)
	url.searchParams.set('query', params.query)
	url.searchParams.set('start', params.start.toString())
	url.searchParams.set('end', params.end.toString())

	if (params.step) {
		url.searchParams.set('step', params.step)
	}

	if (params.queryTimeout) {
		url.searchParams.set('timeout', params.queryTimeout)
	}

	let response = await fetch(url.toString(), {
		signal: AbortSignal.timeout(timeout),
	})

	let data = (await response.json()) as PrometheusResponse<PrometheusRangeValue>

	if (!response.ok) {
		throw new Error(`Prometheus range query failed: ${data.error || response.statusText}`)
	}

	return data
}
