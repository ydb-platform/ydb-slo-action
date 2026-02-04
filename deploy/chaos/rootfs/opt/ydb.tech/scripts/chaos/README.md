# Chaos Monkey Scripts - Libraries Documentation

## Overview

Chaos scripts use modular libraries for fault injection and OpenTelemetry metrics integration.
The architecture is designed to be stateless and relies on OTLP metrics for visualization in Grafana.

## Libraries

### `libotel.sh` (OTLP Metrics Integration)

Generic OpenTelemetry metrics integration using a custom Python script (`otel_metric.py`) that leverages the official OpenTelemetry Python SDK.

**Functions:**

- `otel_send_gauge "name" "value" ["key=value" ...]` - Send gauge metric (synchronous or observable with callback)
- `otel_cli_available` - Check if Python script is available
- `otel_is_configured` - Check if OTLP endpoint is configured

**Configuration:**

- `OTEL_EXPORTER_OTLP_ENDPOINT` - OTLP endpoint (e.g., `http://prometheus:9090/api/v1/otlp/v1/metrics`)
- `OTEL_SERVICE_NAME` - Service name for metrics (default: `chaos-monkey`)

### `libchaos.sh` (Chaos-Specific Functions)

Chaos testing utilities that provide a high-level API for fault injection and recovery.

**Chaos Functions:**

- `chaos_inject "fault_name" "node"` - Start fault injection (sets `chaos_active=1`)
- `chaos_recover "fault_name" "node" "description"` - End fault injection (sets `chaos_active=0`)

**Helper Functions:**

- `get_random_database_node` - Get random ydb-database-\* container
- `get_random_storage_node` - Get random ydb-storage-\* container
- `wait_container_healthy "container" [timeout]` - Wait for container health check

**Metrics Published:**

- `chaos_active` - Gauge (1 when fault is active, 0 when recovered)

**Metric Labels:**

- `event_type` - Script name (e.g., `01-graceful-stop.sh`)
- `fault` - Fault name (e.g., `graceful-stop`)
- `node` - Node name (e.g., `ydb-database-3`)
- `description` - Recovery description (only on recover)

## Usage Examples

### Basic Scenario (Inject & Recover)

```bash
#!/bin/sh
set -e
. /opt/ydb.tech/scripts/chaos/libchaos.sh

node=$(get_random_database_node)

# Start fault (sets chaos_active=1)
chaos_inject "restart-node" "${node}"

# Perform action
docker restart "${node}"

# Wait for recovery
wait_container_healthy "${node}"

# End fault (sets chaos_active=0)
chaos_recover "restart-node" "${node}" "Node restarted successfully"
```

## Grafana Visualization

### Region Annotations (Filled Area)

To visualize chaos events as filled regions on Grafana dashboards:

1. **Prometheus Alert Rule**:
   Create an alert rule that fires when `chaos_active == 1`.

    ```yaml
    groups:
        - name: chaos
          rules:
              - alert: ChaosFaultActive
                expr: chaos_active == 1
                labels:
                    severity: info
                annotations:
                    summary: 'Chaos fault active: {{ $labels.fault }}'
                    description: 'Fault {{ $labels.fault }} active on {{ $labels.node }}'
    ```

2. **Grafana Annotation**:
    - Go to Dashboard Settings -> Annotations.
    - Add new annotation query.
    - Data source: Prometheus (or Alertmanager).
    - Filter by alert name: `ChaosFaultActive`.
    - This will draw a region on all graphs while the fault is active.

### Timeline Panel

Add a "State Timeline" panel to visualize faults over time:

- Query: `chaos_active`
- Legend: `{{fault}} on {{node}}`
- Value mapping: 0 = Transparent, 1 = Red

## Configuration

Set in `compose.yml`:

```yaml
environment:
    - OTEL_EXPORTER_OTLP_ENDPOINT=http://ydb-prometheus:9090/api/v1/otlp/v1/metrics
    - OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf
    - OTEL_SERVICE_NAME=chaos-monkey
```

## Requirements

- Python 3 + pip
- OpenTelemetry Python SDK:
    - `opentelemetry-api`
    - `opentelemetry-sdk`
    - `opentelemetry-exporter-otlp`
- Prometheus with OTLP receiver enabled: `--web.enable-otlp-receiver`

## Troubleshooting

**Metrics not appearing:**

1. Check `OTEL_EXPORTER_OTLP_ENDPOINT` is correct (must include `/v1/metrics` for HTTP exporter if Prometheus listens on `/api/v1/otlp`)
2. Verify Python script runs without errors (check container logs)
3. Check Prometheus has OTLP receiver enabled
