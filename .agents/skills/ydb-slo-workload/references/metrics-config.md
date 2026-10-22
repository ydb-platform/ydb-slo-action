# Workload metric queries

`deploy/metrics.yaml` retains the existing workload counters, successful-operation
p50/p95/p99 latency Gauges, availability and diagnostic retry measurements.
Keep the source metric names, queries and units when migrating the Action.

```yaml
default:
  step: 5s
  timeout: 30s
metrics:
  - name: read_latency_p95_ms
    query: |
      1000 * max by(ref) (
        sdk_operation_latency_p95_seconds{operation_type="read",operation_status="success"}
      )
    unit: ms
```

Queries are grouped by `ref` to compare current and baseline. Export
`ref=WORKLOAD_REF`; when a workload already writes a result JSON, its process
`run_id` must match the result `runId`.

Custom YAML merges by `name`: fields override partially, new query names are
added, `disabled: true` excludes a report query, and a higher-priority
`disabled: false` restores its inherited query. Fields: `name`, `query`, optional
`title`, `step`, `unit`, `round`, `type`, `role`, `disabled`.

`role: diagnostic` displays measurements without making retry counters decide
the logical SLO. Disabling a report query does not disable required successful
workload operations. `workload_type` selects read/write or transaction
observations; it does not change the metric format.
