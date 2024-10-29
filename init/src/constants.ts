// Host
export const HOST = 'localhost'

// YDB Static node configuration. Prefere do not edit.
export const YDB_GRPC_PORT = 2135
export const YDB_MON_PORT = 8765
export const YDB_IC_PORT = 19001
export const YDB_TENANT = '/Root'

// Pass into workload
export const YDB_ENDPOINT = `grpc://${HOST}:${YDB_GRPC_PORT}`
export const YBD_CONNECTION_STRING = `${YDB_ENDPOINT}${YDB_TENANT}`

export const PROMETHEUS_PORT = 9090
export const PROMETHEUS_PUSHGATEWAY_PORT = 9091

export const PROMETHEUS_URL = `http://${HOST}:${PROMETHEUS_PORT}`
export const PROMETHEUS_PUSHGATEWAY_URL = `http://${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}`
