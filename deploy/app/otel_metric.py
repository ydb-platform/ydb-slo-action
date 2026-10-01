# pyright: reportMissingImports=false
#
import os
import sys

from opentelemetry import metrics
from opentelemetry.exporter.otlp.proto.http.metric_exporter import OTLPMetricExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.sdk.resources import Resource


def to_float(value):
    try:
        return float(value)
    except Exception:
        return None


def build_provider():
    endpoint = os.environ.get(
        "OTEL_EXPORTER_OTLP_ENDPOINT", "http://localhost:4318/v1/metrics"
    )

    if not endpoint.endswith("/v1/metrics"):
        endpoint = endpoint.rstrip("/") + "/v1/metrics"

    service_name = os.environ.get("OTEL_SERVICE_NAME", "unknown-service")
    resource = Resource.create({"service.name": service_name})

    exporter = OTLPMetricExporter(endpoint=endpoint)
    reader = PeriodicExportingMetricReader(exporter, export_interval_millis=1000)
    provider = MeterProvider(resource=resource, metric_readers=[reader])
    metrics.set_meter_provider(provider)

    return provider, metrics.get_meter("otel_metric_script")


def send_gauge(meter, name, value, attributes):
    if value is None:
        return
    try:
        gauge = meter.create_gauge(name)
        gauge.set(value, attributes)
    except AttributeError:
        print("Error: Synchronous Gauge not supported (method .set() missing).")
        sys.exit(1)


def send_counter(meter, name, value, attributes):
    if value is None:
        return
    counter = meter.create_counter(name)
    counter.add(value, attributes)


def send_updown(meter, name, value, attributes):
    if value is None:
        return
    counter = meter.create_up_down_counter(name)
    counter.add(value, attributes)


def main():
    operation_type = sys.argv[2]
    txs = to_float(sys.argv[3])
    retries = to_float(sys.argv[4])
    success = to_float(sys.argv[5])
    p50 = to_float(sys.argv[6])
    p95 = to_float(sys.argv[7])
    p99 = to_float(sys.argv[8])

    attributes = {
        "ref": os.environ.get("WORKLOAD_REF", "current"),
        "operation_type": operation_type,
    }

    provider, meter = build_provider()

    send_counter(meter, "sdk_operations_total", txs, attributes)
    send_counter(meter, "sdk_retry_attempts_total", retries, attributes)
    send_counter(meter, "sdk_operations_success_total", success, attributes)

    send_gauge(meter, "sdk_operation_latency_p50_seconds", p50, attributes)
    send_gauge(meter, "sdk_operation_latency_p95_seconds", p95, attributes)
    send_gauge(meter, "sdk_operation_latency_p99_seconds", p99, attributes)

    provider.force_flush()


if __name__ == "__main__":
    main()
