#!/bin/sh
# Generic OpenTelemetry integration library using Python script
# Focused on metrics only (for Grafana annotations and status)

# OTLP endpoint configuration (can be overridden via env)
OTEL_EXPORTER_OTLP_ENDPOINT="${OTEL_EXPORTER_OTLP_ENDPOINT:-}"
OTEL_METRIC_SCRIPT="/opt/ydb.tech/scripts/chaos/otel_metric.py"

# Check if OTel script is available
otel_cli_available() {
    command -v python3 >/dev/null 2>&1 && [ -f "$OTEL_METRIC_SCRIPT" ]
}

# Check if OTLP is configured
otel_is_configured() {
    [ -n "$OTEL_EXPORTER_OTLP_ENDPOINT" ]
}

# Send a counter metric
# Usage: otel_send_counter "counter_name" [value] ["key=value" ...]
otel_send_counter() {
    if ! otel_cli_available || ! otel_is_configured; then
        return 0
    fi

    counter_name="${1:-counter}"
    shift

    # Check if next arg is a number (value) or attribute
    value="1"
    if [ $# -gt 0 ]; then
        case "$1" in
            *=*)
                # It's an attribute, use default value 1
                ;;
            *)
                # It's a value
                value="$1"
                shift
                ;;
        esac
    fi

    # Build command
    cmd="python3 \"$OTEL_METRIC_SCRIPT\" counter \"$counter_name\" \"$value\""

    # Add attributes
    while [ $# -gt 0 ]; do
        cmd="$cmd \"$1\""
        shift
    done

    # Execute (fire and forget, don't block on errors)
    eval "$cmd >/dev/null 2>&1 || true"
}

# Send a gauge metric
# Usage: otel_send_gauge "gauge_name" value ["key=value" ...]
otel_send_gauge() {
    if ! otel_cli_available || ! otel_is_configured; then
        return 0
    fi

    gauge_name="${1:-gauge}"
    shift

    # Value is mandatory for gauge
    value="${1:-0}"
    shift

    # Build command
    cmd="python3 \"$OTEL_METRIC_SCRIPT\" gauge \"$gauge_name\" \"$value\""

    # Add attributes
    while [ $# -gt 0 ]; do
        cmd="$cmd \"$1\""
        shift
    done

    # Execute
    eval "$cmd >/dev/null 2>&1 || true"
}
