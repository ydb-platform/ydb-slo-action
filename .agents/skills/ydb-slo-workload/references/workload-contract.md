# Workload Contract

The SLO Action runs your workload as a Docker container inside the same Docker network as the YDB cluster and Prometheus. Two instances run simultaneously — current and baseline — under identical chaos conditions.

## Environment variables

The action sets these on your container automatically:

| Variable | Example value | Description |
|----------|---------------|-------------|
| `YDB_CONNECTION_STRING` | `grpc://ydb:2136/Root/testdb` | Full connection string (recommended) |
| `YDB_ENDPOINT` | `grpc://ydb:2136` | gRPC endpoint (legacy) |
| `YDB_DATABASE` | `/Root/testdb` | Database path (legacy) |
| `WORKLOAD_REF` | `current` or `main` | **Must** be used as the `ref` label in all metrics |
| `WORKLOAD_NAME` | `my-sdk-test` | Workload identifier |
| `WORKLOAD_DURATION` | `60` | Seconds to run. `0` = unlimited |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://ydb-prometheus:9090/api/v1/otlp` | OTLP push endpoint |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | `http://ydb-prometheus:9090/api/v1/otlp/v1/metrics` | OTLP metrics-specific endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | OTLP transport protocol |
| `PROMETHEUS_URL` | `http://ydb-prometheus:9090` | Prometheus base URL |
| `PROMETHEUS_QUERY_URL` | `http://ydb-prometheus:9090/api/v1/query` | Prometheus query API |

## CLI arguments

`workload_current_command` / `workload_baseline_command` action inputs replace the Docker image's `CMD` entirely (not append). Design the entrypoint to work both with and without extra arguments.

Example: if the image's default CMD is `["./workload"]`, passing `workload_current_command: "--threads 10"` results in the container running with command `--threads 10` (no `./workload` prefix). Use ENTRYPOINT for the binary and CMD for default flags.

## Required metrics

Every metric must include the `ref` label set to `WORKLOAD_REF`.

### The operation — fundamental unit of SLO testing

An **operation** is the minimal unit the SLO framework measures. Each operation has three dimensions:

- **`ref`** — which version of the SDK is being tested (`current` or `baseline`). Value comes from `WORKLOAD_REF` env var. This is how the report separates two simultaneously running workloads.
- **`operation_type`** — what kind of work: `read` (SELECT queries) or `write` (UPSERT/INSERT). Measured independently because read and write paths have different performance characteristics and failure modes.
- **`operation_status`** — outcome: `success` or `error`. The ratio of success to total defines availability — the core SLO metric.

Every metric below is tagged with these labels. They are not optional — without them the report cannot compute throughput, availability, or latency breakdowns.

### Counters

```
sdk_operations_total{operation_type, operation_status, ref}
sdk_retry_attempts_total{operation_type, ref}
```

`sdk_operations_total` — one increment per logical business operation (one user request = one operation, regardless of how many retries it took).

`sdk_retry_attempts_total` — total number of technical attempts including the first one. The report computes extra retries as `retry_attempts - operations`.

### Gauges (latency percentiles)

```
sdk_operation_latency_p50_seconds{operation_type, operation_status, ref}
sdk_operation_latency_p95_seconds{operation_type, operation_status, ref}
sdk_operation_latency_p99_seconds{operation_type, operation_status, ref}
```

Pre-computed gauges — the workload calculates percentiles over a sliding window and pushes the result. The SLO Action does not compute percentiles from histograms.

## Push interval

Push metrics every second. A 10-minute test at 1s resolution yields 600 data points — enough for statistical analysis. Longer intervals degrade report quality.

## Duration and exit

Read `WORKLOAD_DURATION` at startup. When that many seconds have elapsed, stop generating new operations and exit cleanly (flush pending metrics, close connections). `0` means run until killed.

## Chaos resilience

During the test, the chaos monkey will randomly:
- Stop YDB nodes gracefully (SIGTERM with 30s timeout)
- Kill nodes instantly (SIGKILL)
- Pause/unpause containers (simulating freezes)
- Restart nodes
- Black-hole network traffic to nodes

The workload must not crash on transient errors. Use SDK retry policies and handle connection timeouts. Failed operations should be counted in `sdk_operations_total` with `operation_status="error"`.

## Container resources

Each workload container is limited to:
- CPU: 2.0 cores (1.0 reserved)
- Memory: 4 GB (2 GB reserved)

## Network

The workload runs in the same Docker network (`172.28.0.0/16`) as:
- YDB storage node (`172.28.0.10`)
- YDB database nodes (`172.28.0.11`–`172.28.0.15`)
- Prometheus (`ydb-prometheus`)
- Blackhole node (`172.28.0.99`) — used for chaos network scenarios

The hostname `ydb` resolves to all 5 database nodes + the blackhole node via `extra_hosts`.
