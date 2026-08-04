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

    local output
    if output=$(ydbd -s "$YDB_ENDPOINT" admin database "$database_path" create ssd:1 2>&1); then
        log "Database '$database_path' created"
        return 0
    fi

    if grep -q "ALREADY_EXISTS" <<<"$output"; then
        log "Database '$database_path' already exists"
        return 0
    fi

    log "ERROR: Database creation failed:"
    echo "$output" >&2
    return 1
}

start_ydb_node() {
    if [[ -n "$YDB_START_DELAY" ]]; then
        # Dynamic nodes all depend only on storage-1 and race to register with
        # it the moment it's healthy. storage-1's BlobStorage session setup
        # has a hardcoded 5s timeout (ProxyEstablishSessionsTimeout in
        # ydb/core/blobstorage/dsproxy/dsproxy.h) - a burst of simultaneous
        # registrations can blow past that under load, so nodes stagger their
        # start instead of all hitting storage-1 at once.
        log "Delaying node start by ${YDB_START_DELAY}s to stagger registration with storage"
        sleep "$YDB_START_DELAY"
    fi

    local grpc_port="${YDB_GRPC_PORT:-2136}"
    local mon_port="${YDB_MON_PORT:-8765}"
    local ic_port="${YDB_IC_PORT:-19001}"
    local config_path="${YDB_CONFIG_PATH:-/opt/ydb.tech/ydbd/cfg/config.yaml}"

    local ydb_args=(
        "ydbd"
        "server"
        "--yaml-config" "$config_path"
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

    if [[ -n "$YDB_NODE_BROKERS" ]]; then
        IFS=',' read -ra brokers <<< "$YDB_NODE_BROKERS"
        for broker in "${brokers[@]}"; do
            ydb_args+=("--node-broker" "$broker")
        done
    elif [[ -n "$YDB_ENDPOINT" ]]; then
        ydb_args+=("--node-broker" "$YDB_ENDPOINT")
    fi

    if [[ -n "$YDB_NODE_LOCATION_DC" ]]; then
        ydb_args+=("--data-center" "$YDB_NODE_LOCATION_DC")
    fi

    if [[ -n "$YDB_NODE_LOCATION_RACK" ]]; then
        ydb_args+=("--rack" "$YDB_NODE_LOCATION_RACK")
    fi

    if [[ -n "$YDB_BRIDGE_PILE_NAME" ]]; then
        ydb_args+=("--bridge-pile-name" "$YDB_BRIDGE_PILE_NAME")
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
