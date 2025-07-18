export type Metric = {
	id: string
	query: string
	description?: string
}

export const defaultMetrics: Array<Metric> = [
	{
		id: 'read_latency_ms_p50',
		query: `clamp_max(round(1000 * histogram_quantile(0.50, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="read"}[45s]))), 0.1), 100)`,
		description: '50th percentile (median) read operations latency in milliseconds (capped at 100ms)',
	},
	{
		id: 'read_latency_ms_p90',
		query: `clamp_max(round(1000 * histogram_quantile(0.90, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="read"}[45s]))), 0.1), 100)`,
		description: '90th percentile read operations latency in milliseconds (capped at 100ms)',
	},
	{
		id: 'read_latency_ms_p95',
		query: `clamp_max(round(1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="read"}[45s]))), 0.1), 100)`,
		description: '95th percentile read operations latency in milliseconds (capped at 100ms)',
	},
	{
		id: 'write_latency_ms_p50',
		query: `clamp_max(round(1000 * histogram_quantile(0.50, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="write"}[45s]))), 0.1), 100)`,
		description: '50th percentile (median) write operations latency in milliseconds (capped at 100ms)',
	},
	{
		id: 'write_latency_ms_p90',
		query: `clamp_max(round(1000 * histogram_quantile(0.90, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="write"}[45s]))), 0.1), 100)`,
		description: '90th percentile write operations latency in milliseconds (capped at 100ms)',
	},
	{
		id: 'write_latency_ms_p95',
		query: `clamp_max(round(1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="write"}[45s]))), 0.1), 100)`,
		description: '95th percentile write operations latency in milliseconds (capped at 100ms)',
	},
	{
		id: 'read_throughput',
		query: `round(sum by(ref) (rate(sdk_operations_total{operation_type="read"}[30s]) > 0), 1)`,
		description: 'Read operations throughput',
	},
	{
		id: 'write_throughput',
		query: `round(sum by(ref) (rate(sdk_operations_total{operation_type="write"}[30s]) > 0), 1)`,
		description: 'Write operations throughput',
	},
	{
		id: 'read_attempts',
		query: `round(sum by(ref) (rate(sdk_retry_attempts{operation_type="read"}[30s]) > 0), 0.1)`,
		description: 'Read attempts throughput',
	},
	{
		id: 'write_attempts',
		query: `round(sum by(ref) (rate(sdk_retry_attempts{operation_type="write"}[30s]) > 0), 0.1)`,
		description: 'Write attempts throughput',
	},
	{
		id: 'read_availability',
		query: `clamp_max(round(100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="read"}[30s])) / sum by (ref) (increase(sdk_operations_total{operation_type="read"}[30s])), 0.1), 100)`,
		description: 'Read operations availability',
	},
	{
		id: 'write_availability',
		query: `clamp_max(round(100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="write"}[30s])) / sum by (ref) (increase(sdk_operations_total{operation_type="write"}[30s])), 0.1), 100)`,
		description: 'Write operations availability',
	},
]
