// Host
export const HOST = 'localhost'

// YDB Static node configuration. Prefere do not edit.
export const YDB_GRPC_PORT = 2135
export const YDB_MON_PORT = 8765
export const YDB_IC_PORT = 19001
export const YDB_TENANT = '/Root/testdb'

export const PROMETHEUS_PORT = 9090
export const PROMETHEUS_PUSHGATEWAY_PORT = 9091

// OpenTelemetry Collector endpoints
// For clients sending metrics
export const PROMETHEUS_REMOTE_WRITE_URL = `http://${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}/api/v1/write`

export const OTEL_OTLP_GRPC_PORT = 4317
export const OTEL_OTLP_HTTP_PORT = 4318
export const OTEL_OTLP_GRPC_ENDPOINT = `http://${HOST}:${OTEL_OTLP_GRPC_PORT}`
export const OTEL_OTLP_HTTP_ENDPOINT = `http://${HOST}:${OTEL_OTLP_HTTP_PORT}`

// For scraping metrics FROM the collector
export const PROMETHEUS_SCRAPE_URL = `http://${HOST}:${PROMETHEUS_PORT}/metrics`

// Pass into workload
export const YDB_ENDPOINT = `grpc://${HOST}:${YDB_GRPC_PORT}`
export const YBD_CONNECTION_STRING = `${YDB_ENDPOINT}${YDB_TENANT}`
export const PROMETHEUS_URL = `http://${HOST}:${PROMETHEUS_PORT}`
export const PROMETHEUS_PUSHGATEWAY_URL = `http://${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`
