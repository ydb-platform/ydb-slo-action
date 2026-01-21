#!/bin/bash

set -e

# =============================================================================
# YDB Docker Entrypoint Script
# =============================================================================
# Простой entrypoint для статической конфигурации YDB с поддержкой init операций
# =============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

trap 'log "ERROR: Script failed at line $LINENO with exit code $?"' ERR

perform_cluster_bootstrap() {
    log "Bootstrapping cluster with endpoint: $YDB_ENDPOINT"
    ydb -e "$YDB_ENDPOINT" -y admin cluster bootstrap --uuid test
    log "Bootstrap completed with exit code: $?"
}

perform_database_creation() {
    local database_path="${YDB_TENANT:-/Root/testdb}"
    log "Creating database '$database_path' with endpoint: $YDB_ENDPOINT"
    if ydbd -s "$YDB_ENDPOINT" admin database "$database_path" create ssd:1 2>&1 | grep -q "ALREADY_EXISTS"; then
        log "Database '$database_path' already exists"
    else
        log "Database creation completed with exit code: $?"
    fi
}

start_ydb_node() {
    local grpc_port="${YDB_GRPC_PORT:-2136}"
    local mon_port="${YDB_MON_PORT:-8765}"
    local ic_port="${YDB_IC_PORT:-19001}"

    local ydb_args=(
        "ydbd"
        "server"
        "--yaml-config" "/opt/ydb.tech/ydbd/cfg/config.yaml"
        "--grpc-port" "$grpc_port"
        "--mon-port" "$mon_port"
        "--ic-port" "$ic_port"
    )

    if [[ -z "$YDB_TENANT" ]]; then
        ydb_args+=("--node" "static")
    fi

    if [[ -n "$YDB_TENANT" ]]; then
        ydb_args+=("--tenant" "$YDB_TENANT")
    fi

    if [[ -n "$YDB_ENDPOINT" ]]; then
        ydb_args+=("--node-broker" "$YDB_ENDPOINT")
    fi

    log "Starting YDB node with: ${ydb_args[*]} $*"
    exec "${ydb_args[@]}" "$@"
}

ydb version --disable-checks > /dev/null 2>&1

# Check if we should handle init operations
if [[ -n "$YDB_INIT_OPERATION" ]]; then
    case "$YDB_INIT_OPERATION" in
        "bootstrap")
            perform_cluster_bootstrap
            ;;
        "create-database")
            perform_database_creation
            ;;
        "check-readiness")
            log "Running readiness check"
            exec /opt/ydb.tech/scripts/ydbd/check-readiness.sh
            ;;
        *)
            log "Unknown init operation: $YDB_INIT_OPERATION"
            exit 1
            ;;
    esac
else
    # Start YDB node with all provided arguments
    start_ydb_node "$@"
fi
