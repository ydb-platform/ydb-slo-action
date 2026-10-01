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
YDB_STORAGE_ENDPOINT="${YDB_STORAGE_ENDPOINT:-grpc://172.28.0.10:2136}"

check_cluster_health() {
    log "Checking cluster health via $YDB_STORAGE_ENDPOINT"

    local max_attempts=30
    local attempt=0
    local output

    while [[ $attempt -lt $max_attempts ]]; do
        # Note: monitoring healthcheck doesn't need --database parameter
        output=$(timeout "${YDB_READINESS_TIMEOUT}" ydb --endpoint "${YDB_STORAGE_ENDPOINT}" monitoring healthcheck 2>&1 || true)
        if grep -q "GOOD" <<<"$output"; then
            log "Cluster health check passed"
            return 0
        fi

        attempt=$((attempt + 1))
        log "Cluster not healthy yet (attempt $attempt/$max_attempts)"
        sleep 2
    done

    log "ERROR: Cluster health check failed after $max_attempts attempts"
    log "Last healthcheck output (why the cluster self-check isn't GOOD):"
    echo "$output" >&2
    return 1
}

check_node_responds() {
    local endpoint="$1"

    log "Checking if node at $endpoint responds"

    local max_attempts=30
    local attempt=0

    while [[ $attempt -lt $max_attempts ]]; do
        # Check SQL operations
        if ! timeout "${YDB_READINESS_TIMEOUT}" ydb --endpoint "${endpoint}" --database "${YDB_DATABASE}" --no-discovery sql -s "SELECT 1" 2>&1 >/dev/null; then
            attempt=$((attempt + 1))
            log "Node at $endpoint not responding to SQL (attempt $attempt/$max_attempts)"
            sleep 2
            continue
        fi

        # Unique per-node table to avoid cross-node races (see commit 4b96fe1)
        local node_id="${endpoint//[^a-zA-Z0-9]/_}"

        # Check DDL operations
        if ! timeout "${YDB_READINESS_TIMEOUT}" ydb --endpoint "${endpoint}" --database "${YDB_DATABASE}" --no-discovery sql -s "CREATE TABLE IF NOT EXISTS rd_check_${node_id} (ip Utf8, primary key (ip));" 2>&1 >/dev/null; then
            attempt=$((attempt + 1))
            log "Node at $endpoint not responding to DDL (attempt $attempt/$max_attempts)"
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

# Then verify each running database node responds.
# A node container is resolvable via Docker DNS only while it is running, so
# nodes absent from the active compose profiles resolve to nothing and are
# skipped — keeping the check correct for any cluster size.
DATABASE_HOSTS="ydb-database-1 ydb-database-2 ydb-database-3 ydb-database-4 ydb-database-5"

checked=0
for host in $DATABASE_HOSTS; do
    if ! getent hosts "$host" >/dev/null 2>&1; then
        log "Skipping $host (not running)"
        continue
    fi
    check_node_responds "grpc://${host}:2136"
    checked=$((checked + 1))
done

if [[ $checked -eq 0 ]]; then
    log "ERROR: No database nodes resolved"
    exit 1
fi

log "Cluster is healthy and all $checked running database node(s) are responding!"
exit 0
