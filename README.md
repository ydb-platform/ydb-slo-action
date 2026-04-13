# YDB SLO Action

> Automated Service Level Objective (SLO) testing for YDB database SDKs with chaos engineering and performance monitoring built-in.

## What is this?

**YDB SLO Action** tests your YDB SDK's reliability under real-world conditions:

- Deploys a full YDB cluster (1 storage + 5 database nodes)
- Introduces chaos (random node failures, network issues, rolling restarts)
- Runs your current and baseline workloads simultaneously under the same conditions
- Collects metrics via Prometheus and compares performance using paired-comparison analysis
- Posts results directly to your PR

## Quick Example

```yaml
name: SLO Test

on: pull_request

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: ydb-platform/ydb-slo-action/init@v2
        with:
          workload_name: my-sdk-test
          workload_current_image: my-sdk:current
          workload_current_ref: ${{ github.head_ref }}
          workload_baseline_image: my-sdk:baseline
          workload_baseline_ref: main
          github_token: ${{ secrets.GITHUB_TOKEN }}

  report:
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      checks: write
    steps:
      - uses: ydb-platform/ydb-slo-action/report@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_run_id: ${{ github.run_id }}
```

The `init` action deploys a YDB cluster, runs your workload containers with chaos injection, collects metrics via Prometheus, and uploads artifacts. The `report` action downloads those artifacts, analyzes performance, and posts results to your PR.

## How It Works

### Two Actions Working Together

**1. `init` action** — deploys infrastructure and runs workloads:

- `main` phase runs first: deploys YDB cluster (Docker Compose), starts Prometheus, launches chaos monkey, starts workload containers, waits for them to finish
- `post` phase runs after (even on failure): collects metrics from Prometheus, gathers logs, uploads everything as GitHub Artifacts, tears down infrastructure

**2. `report` action** — generates performance reports:

- Downloads artifacts uploaded by `init`
- Compares current vs baseline using paired-comparison analysis (both ran under the same chaos conditions)
- Generates HTML report with charts
- Posts summary as PR comment
- Optionally fails the workflow if SLO thresholds are exceeded

### Chaos Scenarios

While your workloads run, the chaos monkey randomly:

- Stops nodes gracefully or with SIGKILL
- Pauses containers (simulating freezes)
- Introduces network black holes
- Performs rolling restarts

Your SDK should handle these scenarios gracefully. The metrics show how well it copes with failures.

## Reference

### Init Action Inputs

| Input                       | Required | Default       | Description                                                                          |
| --------------------------- | -------- | ------------- | ------------------------------------------------------------------------------------ |
| `workload_name`             | **yes**  | —             | Name of the workload (used for artifact naming)                                      |
| `workload_current_image`    | **yes**  | —             | Docker image for current workload                                                    |
| `github_token`              | no       | —             | GitHub token for API access                                                          |
| `github_issue`              | no       | auto-detected | Pull request number                                                                  |
| `workload_duration`         | no       | `60`          | Duration of the workload in seconds                                                  |
| `workload_current_ref`      | no       | `current`     | Git ref for current version (used as `ref` label in metrics)                         |
| `workload_current_command`  | no       | `""`          | Command arguments for current workload                                               |
| `workload_baseline_image`   | no       | —             | Docker image for baseline workload (if not provided, baseline comparison is skipped) |
| `workload_baseline_ref`     | no       | `baseline`    | Git ref for baseline version (used as `ref` label in metrics)                        |
| `workload_baseline_command` | no       | `""`          | Command arguments for baseline workload                                              |
| `metrics_yaml`              | no       | —             | Custom metrics configuration (inline YAML), merged with defaults                     |
| `metrics_yaml_path`         | no       | —             | Path to custom metrics configuration file, merged with defaults                      |
| `disable_compose_profiles`  | no       | —             | Comma-separated list of compose profiles to disable (e.g., `chaos,telemetry`)        |

### Init Action Outputs

- `ydb-prometheus-url` — Prometheus HTTP endpoint (e.g. `http://172.28.0.X:9090`)
- `ydb-prometheus-otlp` — Prometheus OTLP receiver endpoint (e.g. `http://172.28.0.X:9090/api/v1/otlp`)

Only available when the `telemetry` profile is enabled (enabled by default).

### Report Action Inputs

| Input                     | Required | Default       | Description                                                         |
| ------------------------- | -------- | ------------- | ------------------------------------------------------------------- |
| `github_token`            | **yes**  | —             | GitHub token for API access (artifacts, comments, checks)           |
| `github_run_id`           | **yes**  | —             | Workflow run ID to download artifacts from                          |
| `github_issue`            | no       | auto-detected | GitHub issue number for report publishing                           |
| `template_path`           | no       | built-in      | Path to custom HTML report template                                 |
| `post_comment`            | no       | `true`        | Post report as PR comment                                           |
| `thresholds_yaml`         | no       | —             | Custom thresholds configuration (inline YAML), merged with defaults |
| `thresholds_yaml_path`    | no       | —             | Path to custom thresholds configuration file, merged with defaults  |
| `fail_on_threshold`       | no       | `false`       | Fail the action if any metric exceeds its threshold                 |
| `artifact_retention_days` | no       | `30`          | Days to retain HTML report artifacts                                |

### Permissions

The `report` job requires these GitHub token permissions:

- `contents: read` — Read repository contents
- `pull-requests: write` — Post and update PR comments
- `checks: write` — Create GitHub Checks for SLO violations (optional, but recommended)

The `init` job does not require any special permissions.

## AI-Assisted Workload Development

Install the [Agent Skill](https://github.com/vercel-labs/skills) to get AI assistance when writing your workload:

```bash
npx skills add ydb-platform/ydb-slo-action
```

The skill provides your coding agent with the full workload contract, required metrics, and configuration format.

## Workload Contract

Your workload is a Docker image. The action runs it inside the same Docker network as the YDB cluster and Prometheus. Two instances run simultaneously — current and baseline — under the same chaos conditions.

### What the action provides

**Environment variables set on your container:**

| Variable | Example | Description |
| --- | --- | --- |
| `YDB_CONNECTION_STRING` | `grpc://ydb:2136/Root/testdb` | YDB connection string (recommended) |
| `YDB_ENDPOINT` | `grpc://ydb:2136` | YDB gRPC endpoint (legacy) |
| `YDB_DATABASE` | `/Root/testdb` | YDB database path (legacy) |
| `WORKLOAD_REF` | `current` or `main` | Value to use as the `ref` label in metrics. Set from `workload_current_ref` / `workload_baseline_ref` inputs |
| `WORKLOAD_NAME` | `my-sdk-test` | Workload name from action input |
| `WORKLOAD_DURATION` | `60` | How long to run, in seconds. `0` = unlimited |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://ydb-prometheus:9090/api/v1/otlp` | OTLP endpoint for pushing metrics |
| `OTEL_EXPORTER_OTLP_METRICS_ENDPOINT` | `http://ydb-prometheus:9090/api/v1/otlp/v1/metrics` | OTLP metrics-specific endpoint |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `http/protobuf` | OTLP transport protocol |
| `PROMETHEUS_URL` | `http://ydb-prometheus:9090` | Prometheus base URL |
| `PROMETHEUS_QUERY_URL` | `http://ydb-prometheus:9090/api/v1/query` | Prometheus query API |

**CLI arguments:** `workload_current_command` / `workload_baseline_command` inputs replace the Docker image's `CMD`. Use them to pass flags like `--threads 10` without rebuilding the image.

### What the action expects

Your workload pushes metrics to the OTLP endpoint (or Prometheus remote write). Every metric must include a `ref` label set to the value of `WORKLOAD_REF` — this is how the report distinguishes current from baseline.

**Required metrics:**

```promql
# Operation counters
sdk_operations_total{operation_type="read|write", operation_status="success|error", ref=<WORKLOAD_REF>}

# Latency percentiles (pre-computed gauges)
sdk_operation_latency_p50_seconds{operation_type="read|write", operation_status="success", ref=<WORKLOAD_REF>}
sdk_operation_latency_p95_seconds{operation_type="read|write", operation_status="success", ref=<WORKLOAD_REF>}
sdk_operation_latency_p99_seconds{operation_type="read|write", operation_status="success", ref=<WORKLOAD_REF>}

# Retry attempts
sdk_retry_attempts_total{operation_type="read|write", ref=<WORKLOAD_REF>}
```

**Labels:**

| Label | Values | Purpose |
| --- | --- | --- |
| `ref` | value of `WORKLOAD_REF` env var | Separates current and baseline in analysis |
| `operation_type` | `read`, `write` | Distinguishes read and write operations |
| `operation_status` | `success`, `error` | Used for availability calculation |

**Expectations:**

- Push metrics every second
- Exit when `WORKLOAD_DURATION` seconds have passed
- Handle transient YDB errors gracefully — chaos scenarios will kill and restart nodes during the test

## Customization

### Custom Metrics

You can add custom Prometheus queries alongside the defaults using `metrics_yaml` or `metrics_yaml_path`. Custom metrics are merged with the built-in defaults — you can override existing metrics by name or add new ones.

```yaml
- uses: ydb-platform/ydb-slo-action/init@v2
  with:
    workload_name: my-test
    workload_current_image: my-sdk:current
    github_token: ${{ secrets.GITHUB_TOKEN }}
    metrics_yaml: |
      default:
        step: 10s
        timeout: 30s
      metrics:
        - name: my_custom_latency
          query: |
            histogram_quantile(0.99, rate(my_request_duration_bucket[1m]))
          unit: s
          round: 0.001
```

**Metric definition fields:**

| Field   | Required | Default             | Description                                                                   |
| ------- | -------- | ------------------- | ----------------------------------------------------------------------------- |
| `name`  | **yes**  | —                   | Unique metric identifier                                                      |
| `query` | **yes**  | —                   | PromQL query. Use `max by(ref)` or `sum by(ref)` to separate current/baseline |
| `step`  | no       | from `default.step` | Query resolution step (e.g., `5s`, `15s`)                                     |
| `unit`  | no       | —                   | Display unit (e.g., `ms`, `ops/s`, `%`)                                       |
| `round` | no       | —                   | Round values to this step (e.g., `0.01` for 2 decimal places)                 |

See [`deploy/metrics.yaml`](deploy/metrics.yaml) for the full list of built-in metrics.

### Custom Thresholds

Configure SLO thresholds to control when the report action warns or fails. Use `thresholds_yaml` or `thresholds_yaml_path` on the report action.

```yaml
- uses: ydb-platform/ydb-slo-action/report@v2
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    github_run_id: ${{ github.run_id }}
    fail_on_threshold: true
    thresholds_yaml: |
      neutral_change_percent: 5.0

      default:
        warning_change_percent: 20.0
        critical_change_percent: 50.0

      metrics:
        - pattern: "*_availability"
          direction: higher_is_better
          warning_min: 99.0
          critical_min: 95.0

        - pattern: "*_latency_*"
          direction: lower_is_better
          warning_change_percent: 30.0
          critical_change_percent: 100.0
```

**Threshold fields:**

| Field                             | Description                                                      |
| --------------------------------- | ---------------------------------------------------------------- |
| `neutral_change_percent`          | Changes below this % are considered stable (default: `5.0`)      |
| `default.warning_change_percent`  | Default warning threshold for relative change (default: `20.0`)  |
| `default.critical_change_percent` | Default critical threshold for relative change (default: `50.0`) |

**Per-metric overrides** (under `metrics[]`):

| Field                           | Description                                                 |
| ------------------------------- | ----------------------------------------------------------- |
| `name` or `pattern`             | Exact metric name or wildcard pattern (e.g., `*_latency_*`) |
| `direction`                     | `higher_is_better` or `lower_is_better`                     |
| `warning_change_percent`        | Override warning threshold for relative change              |
| `critical_change_percent`       | Override critical threshold for relative change             |
| `warning_min` / `warning_max`   | Absolute value bounds that trigger warning                  |
| `critical_min` / `critical_max` | Absolute value bounds that trigger failure                  |

See [`deploy/thresholds.yaml`](deploy/thresholds.yaml) for the full default configuration.

## Debugging

### Enable Verbose Logging

Set this in your workflow to see debug logs:

```yaml
env:
  ACTIONS_STEP_DEBUG: true
```

### Inspect Docker Logs

The action copies infrastructure to `.slo/` in the working directory:

```bash
cd .slo
docker compose logs
```

### Query Prometheus

Use the `ydb-prometheus-url` output to query Prometheus directly:

```bash
curl "${{ steps.ydb-init.outputs.ydb-prometheus-url }}/api/v1/query?query=up"
```

### Download Artifacts

Download artifacts from the GitHub Actions UI to inspect raw data:

- `{workload}-metrics.jsonl` — collected metrics (one JSON object per line)
- `{workload}-logs.txt` — Docker container logs
- `{workload}-alerts.jsonl` — Prometheus alerts
- `{workload}-metadata.json` — test metadata (PR, commit, timestamps, duration)

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup, architecture overview, code style, and how to write chaos scenarios.

External contributors must agree to the **Yandex CLA** before we can merge PRs. See `CONTRIBUTING.txt` for details.

## Useful Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [YDB Documentation](https://ydb.tech/docs/)
- [Prometheus Query API](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.
