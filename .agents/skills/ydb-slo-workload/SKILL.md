---
name: ydb-slo-workload
description: >
  Help developers build, debug, and configure workloads for YDB SLO Action testing.
  Use when the user asks to "write an SLO workload", "create a workload for YDB SLO testing",
  "implement OTLP metrics for SLO", "push metrics to Prometheus from workload",
  "build Docker image for SLO test", "debug workload metrics not showing up",
  "configure custom SLO metrics", "set up SLO thresholds", "fix ref label in metrics",
  or mentions ydb-slo-action, WORKLOAD_REF, sdk_operations_total, sdk_operation_latency.
  Also use when reviewing or optimizing existing workload code that interacts with the
  YDB SLO Action infrastructure.
---

# YDB SLO Workload

Guide developers in building workloads that run inside the YDB SLO Action test infrastructure.

A workload is a Docker image that connects to YDB, performs read/write operations, and pushes performance metrics via OTLP. The SLO Action runs two instances (current and baseline) simultaneously under chaos conditions, then compares their metrics.

## Workflow

### 1. Identify the task

| Task | What to do |
|------|------------|
| Write new workload | Guide through the contract: env vars, required metrics, OTLP setup, duration handling |
| Debug metrics | Check metric names, labels (especially `ref`), OTLP endpoint config, push interval |
| Configure custom metrics | Help write `metrics_yaml` with correct PromQL queries |
| Configure thresholds | Help write `thresholds_yaml` with appropriate patterns and bounds |
| Review existing workload | Check compliance with the contract, correct label usage, error handling |
| Build Docker image | Guide Dockerfile creation, CMD vs command override, resource awareness |
| Add custom job artifacts | Copy or generate files under `.slo/extra/` in a step after init main; see README "Extra Artifacts" |

### 2. Load references

| Task | References to load |
|------|--------------------|
| Write new workload | `references/workload-contract.md` |
| Debug metrics | `references/workload-contract.md`, `references/metrics-config.md` |
| Configure custom metrics | `references/metrics-config.md` |
| Configure thresholds | `references/thresholds-config.md` |
| Review existing workload | `references/workload-contract.md` |
| Build Docker image | `references/workload-contract.md` |

### 3. Key concepts

These are the most common mistakes developers make — always keep them in mind:

**Resource identity is mandatory.** Export `ref=WORKLOAD_REF` as a Resource attribute. Workloads that write a structured V3 result also export its process-unique `run_id`; Prometheus promotes these attributes to labels.

**Keep the existing workload metrics.** Use `sdk.operations.total` and the existing successful-operation p50/p95/p99 Gauges. `workload_type` is `table` (default), `topic`, or `topic_tx`; it selects read/write or transaction observations, not a metric format. Table requires an independently built baseline SDK. Preserve supplied Topic baselines, metric overrides and thresholds.

**Push interval matters.** Metrics must be pushed every second. With a typical 10-minute test duration, longer intervals produce too few data points for meaningful analysis.

**`workload_current_command` replaces Docker CMD.** It does not append — it replaces the entire command. Design the workload entrypoint to work both with and without extra arguments.

**Chaos is expected.** YDB nodes will be killed, paused, and network-partitioned during the test. The workload must handle transient connection errors, retries, and timeouts without crashing. The cluster has two database nodes, so losing one removes half the compute. Rely on the `ydb` hostname and SDK discovery, not a pinned node.

**Metrics expected by the built-in configuration (exact names):**

```
sdk_operations_total{ref, operation_type, operation_status}
sdk_operation_latency_p50_seconds{ref, operation_type, operation_status}
sdk_operation_latency_p95_seconds{ref, operation_type, operation_status}
sdk_operation_latency_p99_seconds{ref, operation_type, operation_status}
sdk_retry_attempts_total{ref, operation_type}
```

A workload does not need to emit the source series for a built-in metric that it
explicitly disables through `metrics_yaml` or `metrics_yaml_path`.

**Preserve existing workload behavior when migrating metrics.** Workload observations and process outcomes work without a result JSON. If a workload already writes `/tmp/slo-result.json`, V3 also validates its checks; do not add new assertions, ledgers or lifecycle rules merely to replace metrics. Missing workload observations give INVALID. See `shared/slo-result.ts` and `docs/slo-v3.md`.
