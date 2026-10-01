# V3 metric queries

`deploy/metrics.yaml` queries only the SDK `ydb.*` convention instruments. SDK attempt failures, retries, pool state and buffer ages are diagnostics; data and terminal-result checks come from the workload result JSON.

Latency is computed from SDK Histogram buckets. The report must not average precomputed percentile Gauges or derive retry counts by subtracting unrelated operation counters.

```yaml
default:
  step: 1s
  timeout: 30s
metrics:
  - name: ydb.client.operation.duration
    title: "Operation attempt duration, p95"
    query: histogram_quantile(0.95, sum by(ref, le) (rate(ydb_client_operation_duration_seconds_bucket[30s]))) * 1000
    unit: ms
    role: diagnostic
    round: 0.01
```

Queries are grouped by `ref` to compare current and baseline. Source Resource attributes `ref` and `run_id` are promoted by Prometheus; the gate matches the exact result `runId` and cannot accept stale telemetry.

Custom YAML merges by `name`: fields override partially, new query names are added, `disabled: true` excludes a report query, and a higher-priority `disabled: false` restores its inherited query. Fields: `name`, `query`, optional `title`, `step`, `unit`, `round`, `type`, `role`, `disabled`.

`role: diagnostic` displays measurements without making expected SDK attempt errors fail the logical SLO. Disabling a report query does not disable the mandatory canonical SDK telemetry gate.
