# Thresholds Configuration

The report action evaluates metrics against SLO thresholds and assigns severity levels: `success`, `warning`, or `failure`. Defaults are in `deploy/thresholds.yaml`. Users can extend or override via `thresholds_yaml` or `thresholds_yaml_path` report action inputs.

## YAML format

```yaml
# Changes below this % are considered stable
neutral_change_percent: 5.0

# Default thresholds for all metrics
default:
  warning_change_percent: 20.0   # > 20% change triggers warning
  critical_change_percent: 50.0  # > 50% change triggers failure

# Per-metric overrides
metrics:
  - pattern: "*_availability"
    direction: higher_is_better
    warning_min: 99.0
    critical_min: 95.0
    warning_change_percent: 1.0

  - pattern: "*_latency_*"
    direction: lower_is_better
    warning_change_percent: 30.0
    critical_change_percent: 100.0
```

## Global fields

| Field | Default | Description |
|-------|---------|-------------|
| `neutral_change_percent` | `5.0` | Changes below this % are considered stable (no warning) |
| `default.warning_change_percent` | `20.0` | Default warning threshold for relative change |
| `default.critical_change_percent` | `50.0` | Default critical threshold for relative change |

## Per-metric fields

Each entry under `metrics[]` can use either `name` (exact match) or `pattern` (wildcard).

| Field | Description |
|-------|-------------|
| `name` | Exact metric name (e.g., `read_latency_p99_ms`) |
| `pattern` | Wildcard pattern (e.g., `*_latency_*`, `*_availability`) |
| `direction` | `higher_is_better` or `lower_is_better` — determines what counts as regression |
| `warning_change_percent` | Relative change % that triggers warning |
| `critical_change_percent` | Relative change % that triggers failure |
| `warning_min` | Absolute minimum — values below trigger warning |
| `warning_max` | Absolute maximum — values above trigger warning |
| `critical_min` | Absolute minimum — values below trigger failure |
| `critical_max` | Absolute maximum — values above trigger failure |

## Default metric patterns

| Pattern | Direction | Warning | Critical |
|---------|-----------|---------|----------|
| `*_availability` | higher_is_better | min 99%, change 1% | min 95% |
| `*_latency_*` | lower_is_better | change 30% | change 100% (2x) |
| `*_duration_*` | lower_is_better | change 30% | change 100% |
| `*_throughput` | higher_is_better | change 25% | change 50% |
| `*_qps` | higher_is_better | change 25% | change 50% |
| `*_rps` | higher_is_better | change 25% | change 50% |
| `*_attempts` | lower_is_better | max 0.0 | — |
| `*_error*` | lower_is_better | max 0.1 | max 1.0 |
| `*_failure*` | lower_is_better | max 0.1 | max 1.0 |

## How evaluation works

For each metric the report checks:

1. **Absolute check** — is the value within `min`/`max` bounds?
2. **Relative check** — how much did it change compared to baseline?
3. **Direction** — determines whether an increase is a regression or improvement

The worst severity across all checks wins. If `fail_on_threshold: true` is set on the report action, any `failure`-level metric fails the GitHub Actions workflow.

## Pattern matching

Patterns use `*` as wildcard matching any characters. A metric can match multiple patterns — the most specific match wins (exact `name` beats `pattern`).
