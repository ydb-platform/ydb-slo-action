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

In regular mode the chaos monkey runs node-level scenarios:

- Stops nodes gracefully or with SIGKILL
- Pauses containers (simulating freezes)
- Introduces network black holes
- Performs rolling restarts

In bridge mode it runs a separate pile-level sequence:

- Planned `PRIMARY` switchover
- Planned takedown and rejoin of the `SYNCHRONIZED` pile
- Planned takedown of the `PRIMARY` pile with promotion of the other pile
- Emergency failover and recovery of the `SYNCHRONIZED` pile
- Emergency failover of the `PRIMARY` pile, promotion of the other pile, rejoin, and restoration of the original `PRIMARY`

Every bridge scenario restores both piles to `PRIMARY/SYNCHRONIZED` before the next scenario starts.
Use a workload duration of at least 15 minutes to cover the complete sequence with the default delays.

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
| `fail_on_workload_error`    | no       | `false`       | Fail the whole run if any workload container exits non-zero or times out              |
| `workload_current_ref`      | no       | `current`     | Git ref for current version (used as `ref` label in metrics)                         |
| `workload_current_command`  | no       | `""`          | Command arguments for current workload                                               |
| `workload_baseline_image`   | no       | —             | Docker image for baseline workload (if not provided, baseline comparison is skipped) |
| `workload_baseline_ref`     | no       | `baseline`    | Git ref for baseline version (used as `ref` label in metrics)                        |
| `workload_baseline_command` | no       | `""`          | Command arguments for baseline workload                                              |
| `metrics_yaml`              | no       | —             | Custom metrics configuration (inline YAML), merged with defaults; supports per-workload exclusions |
| `metrics_yaml_path`         | no       | —             | Path to custom metrics configuration file, merged with defaults; supports per-workload exclusions  |
| `thresholds_yaml`           | no       | —             | Per-scenario SLO thresholds (inline YAML); merged over the report action's thresholds for this workload |
| `thresholds_yaml_path`      | no       | —             | Path to a per-scenario SLO thresholds file; merged over the report action's thresholds for this workload |
| `bridge_mode`               | no       | `false`       | Run YDB as a two-pile 2DC bridge cluster                                             |
| `disable_compose_profiles`  | no       | —             | Comma-separated list of compose profiles to disable (e.g., `chaos,telemetry`)        |

### 2DC bridge cluster

Set `bridge_mode: true` to run the same workloads and telemetry on a YDB cluster with two bridge piles and pile-level chaos scenarios:

```yaml
- uses: ydb-platform/ydb-slo-action/init@v2
  with:
    workload_name: my-bridge-test
    workload_current_image: my-workload:pr-123
    workload_baseline_image: my-workload:main
    bridge_mode: true
```

The default bridge topology has two storage nodes and four database nodes, split evenly between `pile-1` and `pile-2`.
Disabling the `extra-nodes` profile keeps one database node in each pile.

### Cluster size

In regular mode the cluster runs **5 database nodes** by default. Disable the `extra-nodes`
profile to run a smaller **2-node** cluster — cheaper and faster to start:

```yaml
- uses: ydb-platform/ydb-slo-action/init@v2
  with:
    workload_name: my-test
    workload_current_image: my-workload:pr-123
    disable_compose_profiles: extra-nodes
```

A 2-node cluster suits quick smoke runs more than strict SLO gating: chaos
faults remove a larger fraction of the cluster (stopping one node drops 50% of
compute instead of 20%), so latency/availability swings are wider by design.

### Fail fast on workload errors

By default a workload container that exits non-zero (or times out) is recorded but
does **not** fail the run — metrics are still collected and a report is produced.
Set `fail_on_workload_error: true` to turn any such failure into a hard failure of
the whole run (useful for simple pass/fail smoke tests):

```yaml
- uses: ydb-platform/ydb-slo-action/init@v2
  with:
    workload_name: topics-smoke
    workload_current_image: my-topics-workload:current
    fail_on_workload_error: true
    disable_compose_profiles: telemetry,chaos # no metrics needed for a smoke test
```

The flag only fails the run. Whether a **report** is produced on a failed run is
decided by your workflow, not the action. In a single workflow, gate the report job:

```yaml
report:
  needs: test # skipped when `test` fails -> no report on failure
  # if: ${{ !cancelled() }}   # alternatively: always report (failure card on failure)
```

For pull requests from forks (where the `pull_request` token is read-only and
cannot post comments), report from a separate workflow triggered by `workflow_run`,
which runs in the base repo with write permissions:

```yaml
# .github/workflows/slo-report.yml
on:
  workflow_run:
    workflows: ["SLO Test"] # = name: of the SLO workflow
    types: [completed]
permissions:
  contents: read
  pull-requests: write
  checks: write
jobs:
  report:
    runs-on: ubuntu-latest
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: ydb-platform/ydb-slo-action/report@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_run_id: ${{ github.event.workflow_run.id }}
```

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

These source series are required only for built-in metrics that remain enabled
for the workload. A workload can disable an inapplicable built-in metric in its
`metrics_yaml` without emitting that metric's source series.

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

You can add custom Prometheus queries alongside the defaults using `metrics_yaml` or `metrics_yaml_path`. Custom metrics are merged with the built-in defaults — you can override existing metrics by name, add new ones, or disable metrics that are not meaningful for a particular workload.

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

| Field     | Required        | Default             | Description                                                                   |
| --------- | --------------- | ------------------- | ----------------------------------------------------------------------------- |
| `name`    | **yes**         | —                   | Unique metric identifier                                                      |
| `query`   | for new metrics | —                   | PromQL query. Use `max by(ref)` or `sum by(ref)` to separate current/baseline |
| `enabled` | no              | `true`              | Set to `false` to exclude this metric from collection and analysis            |
| `step`    | no              | from `default.step` | Query resolution step (e.g., `5s`, `15s`)                                     |
| `unit`    | no              | —                   | Display unit (e.g., `ms`, `ops/s`, `%`)                                       |
| `round`   | no              | —                   | Round values to this step (e.g., `0.01` for 2 decimal places)                 |

See [`deploy/metrics.yaml`](deploy/metrics.yaml) for the full list of built-in metrics.

#### Per-workload metric exclusions

Set `enabled: false` on a metric override to skip its Prometheus query and omit it
from the report for that workload. Only `name` and `enabled` are needed when
disabling a built-in metric:

```yaml
- uses: ydb-platform/ydb-slo-action/init@v2
  with:
    workload_name: sync-topic
    workload_current_image: my-sdk:current
    metrics_yaml: |
      metrics:
        - name: read_retry_attempts
          enabled: false
        - name: write_retry_attempts
          enabled: false
```

This is useful for topic workloads that recreate a reader or writer outside the
logical operation measured by the generic attempts counter. In that model every
operation reports one attempt, so `retry_attempts_total - operations_total` is
normally zero and sparse differences at scrape boundaries do not represent
delivery or recovery. Topic delivery rate, end-to-end latency, message loss, and
availability are the meaningful SLO signals instead.

Configuration layers keep their existing precedence. A higher-priority
`metrics_yaml_path` can explicitly set `enabled: true` to re-enable a metric and
reuse its inherited query.

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

#### Per-scenario thresholds

In a matrix build each scenario is a separate `workload`. Give a scenario its own
thresholds on the **`init`** action, next to its `metrics_yaml` — they are merged
**over** the report-global thresholds for that workload only. Precedence (low →
high): built-in defaults → report `thresholds_yaml` → init `thresholds_yaml`.

```yaml
jobs:
  slo:
    strategy:
      matrix:
        sdk:
          - name: native-table
            path: native/table
          - name: database-sql-table
            path: database/sql/table
            thresholds_yaml: |
              metrics:
                - pattern: "*_latency_p99_ms"
                  direction: lower_is_better
                  warning_max: 25
                  critical_max: 50   # database/sql is slower — looser ceiling
    steps:
      - uses: ydb-platform/ydb-slo-action/init@v2
        with:
          workload_name:   ${{ matrix.sdk.name }}
          thresholds_yaml: ${{ matrix.sdk.thresholds_yaml }}
```

A scenario without `thresholds_yaml` inherits the report-global + default
thresholds. The format is identical to the report `thresholds_yaml` (see fields
above).

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

For a bridge-mode run, select its Compose file explicitly:

```bash
docker compose -f compose.bridge.yml logs
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
- `extra/**` — optional files added by your workflow (see below)

### Extra Artifacts

The init action uploads a single job artifact named after `workload_name`. Besides
logs, metrics, alerts, and metadata, it also includes any files you place under
`.slo/extra/` in the job working directory.

**When to write files:** after the init action main phase finishes (workloads
completed) and before the init action post phase runs. In practice, add a workflow
step immediately after `uses: ydb-platform/ydb-slo-action/init@v2` with
`if: always()`.

**How to write files:**

```yaml
- uses: ydb-platform/ydb-slo-action/init@v2
  id: slo
  with:
    workload_name: my-sdk-test
    workload_current_image: my-sdk:current

- name: Collect extra SLO artifacts
  if: always()
  run: |
    mkdir -p .slo/extra/flamegraphs
    cp ./reports/cpu.html .slo/extra/flamegraphs/current-cpu.html
    cp ./reports/heap.html .slo/extra/flamegraphs/current-heap.html
```

Subdirectories under `.slo/extra/` are preserved in the uploaded artifact bundle.
Use this for flame graphs, heap dumps, debug bundles, SDK-specific reports, or
any other files that should ship together with the standard SLO outputs.

The init action creates `.slo/extra/` at startup; you only need to copy or
generate files there before the action post phase uploads artifacts.

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
