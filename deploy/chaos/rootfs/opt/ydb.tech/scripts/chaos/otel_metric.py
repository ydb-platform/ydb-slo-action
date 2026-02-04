# pyright: reportMissingImports=false

import os
import sys

from opentelemetry import metrics
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource


def main():
    if len(sys.argv) < 4:
        print("Usage: otel_metric.py <type> <name> <value> [key=value ...]")
        sys.exit(1)

    metric_type = sys.argv[1]
    name = sys.argv[2]
    try:
        value = float(sys.argv[3])
    except ValueError:
        print(f"Error: Value '{sys.argv[3]}' is not a number")
        sys.exit(1)

    attributes = {}
    for arg in sys.argv[4:]:
        if "=" in arg:
            k, v = arg.split("=", 1)
            attributes[k] = v

    # Setup OTel
    endpoint = os.environ.get(
        "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/metrics"
    )
    service_name = os.environ.get("OTEL_SERVICE_NAME", "unknown-service")

    resource = Resource.create({"service.name": service_name})

    # We use HTTP exporter
    exporter = OTLPMetricExporter(endpoint=endpoint)

    # We need a reader that exports immediately
    reader = PeriodicExportingMetricReader(exporter, export_interval_millis=1000)
    provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(provider)

    meter = metrics.get_meter("otel_metric_script")

    if metric_type == "gauge":
        # Try to use synchronous Gauge (available in recent OTel SDKs)
        try:
            # Note: In OTel Python, synchronous Gauge was added recently.
            # If create_gauge returns an instrument with .set(), we are good.
            # Otherwise we might need to use UpDownCounter as a workaround or ObservableGauge.
            # But for a one-shot script, ObservableGauge is tricky because it needs a callback.
            # Let's assume we have a recent SDK.
            gauge = meter.create_gauge(name)
            gauge.set(value, attributes)
        except AttributeError:
            # Fallback: if .set() is not available, it might be an older SDK or strict spec.
            # In that case, we can't easily send a Gauge from a CLI script without a callback loop.
            # But we installed the latest SDK, so it should work.
            print("Error: Synchronous Gauge not supported (method .set() missing).")
            sys.exit(1)

    elif metric_type == "counter":
        counter = meter.create_counter(name)
        counter.add(value, attributes)

    elif metric_type == "updown":
        counter = meter.create_up_down_counter(name)
        counter.add(value, attributes)

    else:
        print(f"Error: Unknown metric type '{metric_type}'")
        sys.exit(1)

    # Force flush to ensure data is sent before script exits
    provider.force_flush()


if __name__ == "__main__":
    main()
