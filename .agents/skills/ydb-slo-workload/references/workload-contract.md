# V3 workload contract

The Action runs current and baseline under the same failure profile. Use the same harness version for both; only SDK source/version should differ.

## Environment

- `YDB_CONNECTION_STRING`, or `YDB_ENDPOINT` and `YDB_DATABASE`: database connection.
- `WORKLOAD_REF`: required Resource `ref`, copied verbatim to the final result.
- `WORKLOAD_NAME`: stable workload identity.
- `WORKLOAD_DURATION`: stop generating load after this many seconds, then finish bounded drain.
- `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT`: HTTP/protobuf metrics endpoint.
- `PROMETHEUS_QUERY_URL`: query API for optional diagnostics.
- `SLO_RESULT_PATH`: final result JSON, `/tmp/slo-result.json`.

`workload_current_command` / `workload_baseline_command` replace CMD, not ENTRYPOINT.

## Telemetry

Retain the workload's `sdk.operations.total` counter with `operation_type`,
`operation_status` and `ref`, plus successful-operation
`sdk.operation.latency.p50/p95/p99.seconds` Gauges. Prometheus exposes these as
`sdk_operations_total` and `sdk_operation_latency_p50/p95/p99_seconds`.
`deploy/metrics.yaml` keeps their existing queries.

`workload_type: table` is the default and requires successful read AND write
observations from current and an independently built baseline SDK.
`workload_type: topic` requires read AND write observations; `topic_tx` requires
transaction observations instead. Both Topic types validate any supplied
baseline. Keep the existing Topic metric overrides and thresholds.

Export `ref=WORKLOAD_REF`. When an existing workload writes a result JSON, also
export its process-unique `run_id`. Send every second and flush before exit.
Existing data assertions and terminal logical outcomes remain authoritative.

## Result and verdict

Existing workloads keep their execution process and metrics without requiring a result JSON. V3 checks workload observations and process outcomes. The following structured result is optional; when present, its checks are validated.

Write `schemaVersion: 3`, `ref`, `runId`, `kind: table|topic`, `verdict: PASS|FAIL|INVALID`, `checks: [{id, verdict, detail}]`, and `operations: [{type, success, error}]`. The exact parser is `shared/slo-result.ts`.

Table checks: T01 confirmed writes are readable, T02 returned payloads are correct. Topic checks: P01 confirmed delivery/order, P02 batch and single-message APIs, P03 acknowledged commit. At-least-once duplicates are allowed only with validated identity and offset semantics. Future transaction coverage must not be reported as passed.

Missing required checks or workload observations produce INVALID. A violated invariant or failed process produces FAIL. Logical availability is evaluated against the scenario thresholds. Retry measurements remain diagnostic and do not override terminal logical outcomes.

Return nonzero for failed assertions, unresolved outcomes or expired drain. Do not swallow worker exceptions. Preserve all confirmed writes/messages and verify them before PASS. Action main owns this verdict; post remains best-effort collection and cleanup.

Results are copied into `.slo/extra/` and included in the artifact. See `docs/slo-v3.md` for scenario IDs and `tests/integration/slo-gate.ts` for the real-workload gate entrypoint.
