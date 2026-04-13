# Metrics Configuration

The SLO Action collects metrics from Prometheus using PromQL queries defined in YAML. Default metrics are in `deploy/metrics.yaml`. Users can extend or override them via `metrics_yaml` or `metrics_yaml_path` action inputs.

## Default metrics

| Name | Unit | What it queries |
|------|------|-----------------|
| `read_latency_p50_ms` | ms | `1000 * max by(ref)(sdk_operation_latency_p50_seconds{operation_type="read",operation_status="success"})` |
| `read_latency_p95_ms` | ms | Same pattern with `p95` |
| `read_latency_p99_ms` | ms | Same pattern with `p99` |
| `write_latency_p50_ms` | ms | Same pattern with `operation_type="write"` |
| `write_latency_p95_ms` | ms | Same pattern with `p95` |
| `write_latency_p99_ms` | ms | Same pattern with `p99` |
| `read_throughput` | ops/s | `sum by(ref)(rate(sdk_operations_total{operation_type="read",operation_status="success"}[5s]))` |
| `write_throughput` | ops/s | Same with `operation_type="write"` |
| `read_retry_attempts` | attempts | `increase(sdk_retry_attempts_total) - increase(sdk_operations_total)` for read, clamped to 0 |
| `write_retry_attempts` | attempts | Same for write |
| `read_availability` | % | `100 * rate(success) / rate(total)` for read, clamped to 100 |
| `write_availability` | % | Same for write |

Default step: `5s`. Default timeout: `30s`.

## YAML format

```yaml
default:
  step: 5s       # Query resolution step
  timeout: 30s   # Prometheus query timeout

metrics:
  - name: my_metric           # Unique identifier (required)
    query: |                   # PromQL query (required)
      max by(ref) (my_gauge{ref!=""})
    step: 10s                  # Override default step
    unit: ms                   # Display unit in report
    round: 0.01                # Round values to this step
```

### Fields

| Field | Required | Default | Description |
|-------|----------|---------|-------------|
| `name` | yes | — | Unique metric identifier. If it matches a default metric name, overrides it |
| `query` | yes | — | PromQL query. Use `by(ref)` to separate current/baseline series |
| `step` | no | from `default.step` | Query resolution step (e.g., `5s`, `15s`) |
| `unit` | no | — | Display unit (e.g., `ms`, `ops/s`, `%`) |
| `round` | no | — | Round to nearest step (e.g., `0.01` = 2 decimal places, `1` = integers) |

## Merging behavior

Custom metrics are merged with defaults by `name`:

- If a custom metric has the same `name` as a default, the custom fields override the default fields (partial override — only specified fields change)
- New names are added alongside defaults
- Custom metrics appear first in the report, then remaining defaults
