#!/bin/bash

set -e

# =============================================================================
# YDB Database Readiness Check Script
# =============================================================================
# Checks that the YDB cluster is healthy and all database nodes respond
# =============================================================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >&2
}

trap 'log "ERROR: Script failed at line $LINENO with exit code $?"' ERR

YDB_DATABASE="${YDB_TENANT:-/Root/testdb}"
YDB_READINESS_TIMEOUT="${YDB_READINESS_TIMEOUT:-5}"
YDB_STORAGE_ENDPOINT="grpc://172.28.0.10:2136"

check_cluster_health() {
    log "Checking cluster health via $YDB_STORAGE_ENDPOINT"

    local max_attempts=60
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        # Note: monitoring healthcheck doesn't need --database parameter
        if timeout "${YDB_READINESS_TIMEOUT}" ydb --endpoint "${YDB_STORAGE_ENDPOINT}" monitoring healthcheck 2>/dev/null | grep -q "GOOD"; then
            log "Cluster health check passed"
            return 0
        fi

        attempt=$((attempt + 1))
        log "Cluster not healthy yet (attempt $attempt/$max_attempts)"
        sleep 2
    done

    log "ERROR: Cluster health check failed after $max_attempts attempts"
    return 1
}

check_node_responds() {
    local node_ip="$1"
    local endpoint="grpc://${node_ip}:2136"

    log "Checking if node at $endpoint responds"

    local max_attempts=60
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        # Check SQL operations
        if ! timeout "${YDB_READINESS_TIMEOUT}" ydb --endpoint "${endpoint}" --database "${YDB_DATABASE}" --no-discovery sql -s "SELECT 1" >/dev/null; then
            attempt=$((attempt + 1))
            log "Node at $endpoint not responding to SQL (attempt $attempt/$max_attempts)"
            sleep 2
            continue
        fi

        # Check scheme operations
        if ! timeout "${YDB_READINESS_TIMEOUT}" ydb --endpoint "${endpoint}" --database "${YDB_DATABASE}" --no-discovery scheme ls "${YDB_DATABASE}" >/dev/null; then
            attempt=$((attempt + 1))
            log "Node at $endpoint not responding to scheme operations (attempt $attempt/$max_attempts)"
            sleep 2
            continue
        fi

        log "Node at $endpoint is responding (SQL and scheme operations passed)"
        return 0
    done

    log "ERROR: Node at $endpoint failed to respond after $max_attempts attempts"
    return 1
}

log "Starting database readiness check"

# First check overall cluster health
check_cluster_health

# Then verify each node responds
check_node_responds "172.28.0.11"
check_node_responds "172.28.0.12"
check_node_responds "172.28.0.13"
check_node_responds "172.28.0.14"
check_node_responds "172.28.0.15"

log "Cluster is healthy and all database nodes are responding!"
