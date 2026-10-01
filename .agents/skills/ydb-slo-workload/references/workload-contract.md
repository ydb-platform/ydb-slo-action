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

Subscribe to the SDK convention meters. SDK operation/retry/pool metrics describe attempts and diagnostics; they cannot replace logical outcomes or data assertions.

Export only SDK `ydb.*` convention instruments. Do not introduce legacy `sdk.*` or custom `slo.*` metrics. Resource: `ref=WORKLOAD_REF`, `run_id=<unique process run>`. Send every second and flush before exit. Data assertions and terminal logical outcomes belong to the result artifact.

The gate requires `ydb_client_operation_duration_seconds_count` for tables; topics require `ydb_topic_writer_written_messages_total` and `ydb_topic_reader_delivered_messages_total`. Quantiles use SDK Histogram buckets, not precomputed Gauges. Verify Prometheus names against the actual exporter.

## Result and verdict

Write `schemaVersion: 3`, `ref`, `runId`, `kind: table|topic`, `verdict: PASS|FAIL|INVALID`, `checks: [{id, verdict, detail}]`, and `operations: [{type, success, error}]`. The exact parser is `shared/slo-result.ts`.

Table checks: T01 confirmed writes are readable, T02 returned payloads are correct. Topic checks: P01 confirmed delivery/order, P02 batch and single-message APIs, P03 acknowledged commit. At-least-once duplicates are allowed only with validated identity and offset semantics. Future transaction coverage must not be reported as passed.

Missing required checks, observations or SDK telemetry produce INVALID. A violated invariant or failed process produces FAIL. Logical availability is evaluated against the scenario thresholds. SDK failed attempts remain diagnostic even if retry subsequently succeeds.

Return nonzero for failed assertions, unresolved outcomes or expired drain. Do not swallow worker exceptions. Preserve all confirmed writes/messages and verify them before PASS. Action main owns this verdict; post remains best-effort collection and cleanup.

Results are copied into `.slo/extra/` and included in the artifact. See `docs/slo-v3.md` for scenario IDs and `tests/fixtures/dotnet` for an executable SDK telemetry probe.
