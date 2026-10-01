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

**Resource identity is mandatory.** Export `ref=WORKLOAD_REF` and a process-unique `run_id` as Resource attributes. They must match `ref` and `runId` in the V3 result file; Prometheus promotes them to labels.

**Only SDK convention metrics are exported.** Subscribe to the SDK `ydb.*` meters. Do not emit legacy `sdk.*` or custom `slo.*` instruments. V3 computes quantiles from SDK Histogram buckets; data checks and terminal logical outcomes live in the JSON result, not custom metrics.

**Push interval matters.** Metrics must be pushed every second. With a typical 10-minute test duration, longer intervals produce too few data points for meaningful analysis.

**`workload_current_command` replaces Docker CMD.** It does not append — it replaces the entire command. Design the workload entrypoint to work both with and without extra arguments.

**Chaos is expected.** YDB nodes will be killed, paused, and network-partitioned during the test. The workload must handle transient connection errors, retries, and timeouts without crashing. The cluster can be as small as 2 database nodes (`disable_compose_profiles: extra-nodes`), where losing one node removes half the compute — so never pin to a specific node or assume a node count; rely on the `ydb` hostname and SDK discovery.

**Metrics expected by the built-in configuration (exact names):**

```
ydb_client_operation_duration_seconds_bucket{ref, run_id, operation_name, le}
ydb_client_retry_duration_seconds_bucket{ref, run_id, operation_name, le}
ydb_topic_writer_written_messages_total{ref, run_id}
ydb_topic_reader_delivered_messages_total{ref, run_id}
```

A workload does not need to emit the source series for a built-in metric that it
explicitly disables through `metrics_yaml` or `metrics_yaml_path`.

**The V3 result file is required.** Write the final JSON contract to `SLO_RESULT_PATH` (`/tmp/slo-result.json`). Table workloads must prove T01/T02; topic workloads P01/P02/P03. Missing checks or telemetry give INVALID; failed invariants give FAIL and a nonzero process exit. See `shared/slo-result.ts` and `docs/slo-v3.md`.
