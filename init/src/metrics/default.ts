import type { MetricsDefinition } from "./definition";

export const defaultMetrics: MetricsDefinition = {
	metrics: [
		{
			id: "read_latency_ms",
			query: `1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="read"}[2s])))`,
			description: "95th percentile read operations latency in milliseconds",
		},
		{
			id: "write_latency_ms",
			query: `1000 * histogram_quantile(0.95, sum by(ref, le) (rate(sdk_operation_latency_seconds_bucket{operation_type="write"}[2s])))`,
			description: "95th percentile write operations latency in milliseconds",
		},
		{
			id: "read_throughput",
			query: `sum by(ref) (rate(sdk_operations_total{operation_type="read"}[2s]))`,
			description: "Read operations throughput",
		},
		{
			id: "write_throughput",
			query: `sum by(ref) (rate(sdk_operations_total{operation_type="write"}[2s]))`,
			description: "Write operations throughput",
		},
		{
			id: "read_availability",
			query: `100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="read"}[2s])) / sum by (ref) (increase(sdk_operations_total{operation_type="read"}[2s]))`,
			description: "Read operations availability",
		},
		{
			id: "write_availability",
			query: `100 * sum by (ref) (increase(sdk_operations_success_total{operation_type="write"}[2s])) / sum by (ref) (increase(sdk_operations_total{operation_type="write"}[2s]))`,
			description: "Write operations availability",
		},
	]
}
