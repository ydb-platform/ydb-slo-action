export type Metric = {
	id: string
	query: string
	description?: string
}

export const defaultMetrics: Array<Metric> = [
	{
		id: 'read_latency_ms',
		query: `1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="read"}[30s])))`,
		description: '95th percentile read operations latency in milliseconds',
	},
	{
		id: 'write_latency_ms',
		query: `1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="write"}[30s])))`,
		description: '95th percentile write operations latency in milliseconds',
	},
	{
		id: 'read_throughput',
		query: `sum by(ref) (rate(sdk_operations_total{operation_type="read"}[30s]) > 0)`,
		description: 'Read operations throughput',
	},
	{
		id: 'write_throughput',
		query: `sum by(ref) (rate(sdk_operations_total{operation_type="write"}[30s]) > 0)`,
		description: 'Write operations throughput',
	},
	{
		id: 'read_attempts',
		query: `sum by(ref) (rate(sdk_retry_attempts{operation_type="read"}[30s]) > 0)`,
		description: 'Read attempts throughput',
	},
	{
		id: 'write_attempts',
		query: `sum by(ref) (rate(sdk_retry_attempts{operation_type="write"}[30s]) > 0)`,
		description: 'Write attempts throughput',
	},
	{
		id: 'read_availability',
		query: `100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="read"}[30s])) / sum by (ref) (increase(sdk_operations_total{operation_type="read"}[30s]))`,
		description: 'Read operations availability',
	},
	{
		id: 'write_availability',
		query: `100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="write"}[30s])) / sum by (ref) (increase(sdk_operations_total{operation_type="write"}[30s]))`,
		description: 'Write operations availability',
	},
]
