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

## Metrics used by the built-in configuration

Every metric the workload emits must include the `ref` label set to
`WORKLOAD_REF`. The built-in configuration expects the source series below
unless the workload disables the corresponding report metric with
`enabled: false` in `metrics_yaml` or `metrics_yaml_path`.

### The operation — fundamental unit of SLO testing

An **operation** is the minimal unit the SLO framework measures. Each operation has three dimensions:

- **`ref`** — which version of the SDK is being tested (`current` or `baseline`). Value comes from `WORKLOAD_REF` env var. This is how the report separates two simultaneously running workloads.
- **`operation_type`** — what kind of work: `read` (SELECT queries) or `write` (UPSERT/INSERT). Measured independently because read and write paths have different performance characteristics and failure modes.
- **`operation_status`** — outcome: `success` or `error`. The ratio of success to total defines availability — the core SLO metric.

Each source series below must carry the labels shown in its definition. Labels
used by an enabled query are not optional: without them the report cannot
separate current from baseline or compute the requested breakdown.

### Counters

```
sdk_operations_total{operation_type, operation_status, ref}
sdk_retry_attempts_total{operation_type, ref}
```

`sdk_operations_total` — one increment per logical business operation (one user request = one operation, regardless of how many retries it took).

`sdk_retry_attempts_total` — total number of technical attempts including the first one. The report computes extra retries as `retry_attempts - operations`.

`sdk_operations_total` is used by the built-in throughput, availability, and
retry-attempts metrics. `sdk_retry_attempts_total` is only required while
`read_retry_attempts` or `write_retry_attempts` remains enabled. A workload that
disables both attempts metrics does not need to emit this counter.

### Gauges (latency percentiles)

```
sdk_operation_latency_p50_seconds{operation_type, operation_status, ref}
sdk_operation_latency_p95_seconds{operation_type, operation_status, ref}
sdk_operation_latency_p99_seconds{operation_type, operation_status, ref}
```

Pre-computed gauges — the workload calculates percentiles over a sliding window and pushes the result. The SLO Action does not compute percentiles from histograms.

Each gauge is required only while the corresponding built-in latency metric is
enabled for that workload.

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

In `bridge_mode`, node-level scenarios are replaced with planned switchover,
planned takedown, and emergency failover of both `PRIMARY` and `SYNCHRONIZED`
piles. Each scenario rejoins the affected pile, waits for synchronization, and
restores the original `PRIMARY` before the next scenario.

The workload must not crash on transient errors. Use SDK retry policies and handle connection timeouts. Failed operations should be counted in `sdk_operations_total` with `operation_status="error"`.

## Container resources

Each workload container is limited to:
- CPU: 2.0 cores (1.0 reserved)
- Memory: 4 GB (2 GB reserved)

## Network

The workload runs in the same Docker network (`172.28.0.0/16`) as:
- YDB storage node (`172.28.0.10`)
- YDB database nodes (`172.28.0.11`–`172.28.0.15`) — the regular cluster runs 2
  to 5 of them depending on configuration (5 by default; 2 when the operator
  sets `disable_compose_profiles: extra-nodes`).
- In `bridge_mode`, a second storage node runs at `172.28.0.16`, and the cluster
  has 2 to 4 database nodes split evenly between two piles. Do not assume a
  fixed node count or a single storage node.
- Prometheus (`ydb-prometheus`)
- Blackhole node (`172.28.0.99`) — used for chaos network scenarios

Connect via the `ydb` hostname (or `YDB_CONNECTION_STRING`): it maps to the
database node IPs via `extra_hosts`, and the SDK discovers the actually-running
nodes from there — so the workload connects the same way at any cluster size.
