#!/bin/bash
set -e

# Default nodes to check (direct container names)
DIRECT_NODES="${YDB_DIRECT_NODES:-ydb-database-1 ydb-database-2 ydb-database-3}"
# DNS name that resolves to multiple IPs (including blackhole)
DNS_NAME="${YDB_DNS_NAME:-ydb}"
GRPC_PORT="${YDB_GRPC_PORT:-2136}"
CHECK_INTERVAL="${CHECK_INTERVAL:-5}"

log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

check_node() {
    local node=$1
    local port=$2

    if nc -z -w 2 "${node}" "${port}" 2>/dev/null; then
        log "✓ ${node}:${port} - OK"
        return 0
    else
        log "✗ ${node}:${port} - UNREACHABLE"
        return 1
    fi
}

# Check DNS resolution and all IPs
check_dns_resolution() {
    local dns=$1
    local port=$2

    log "Resolving ${dns}..."
    # Use getent if available, otherwise fallback to host/nslookup
    local ips
    if command -v getent >/dev/null 2>&1; then
        ips=$(getent hosts "${dns}" | awk '{print $1}' | sort -u)
    else
        ips=$(nslookup "${dns}" | grep -A10 "^Name:" | grep "^Address" | awk '{print $2}' | sort -u)
    fi

    if [ -z "$ips" ]; then
        log "✗ ${dns} - DNS resolution failed"
        return 1
    fi

    local total=0
    local failures=0

    for ip in $ips; do
        total=$((total + 1))
        if nc -z -w 2 "${ip}" "${port}" 2>/dev/null; then
            log "  ✓ ${dns} → ${ip}:${port} - OK"
        else
            log "  ✗ ${dns} → ${ip}:${port} - UNREACHABLE"
            failures=$((failures + 1))
        fi
    done

    if [ ${failures} -gt 0 ]; then
        log "  Summary: ${failures}/${total} IPs for ${dns} are unreachable"
        return 1
    fi
    return 0
}

log "Starting network checker..."
log "Direct nodes: ${DIRECT_NODES}"
log "DNS name: ${DNS_NAME}"
log "gRPC port: ${GRPC_PORT}"
log "Check interval: ${CHECK_INTERVAL}s"

# Duration limit
DURATION="${DURATION:-0}"  # 0 = infinite
if [ "$DURATION" -gt 0 ]; then
    log "Duration limit: ${DURATION}s"
    END_TIME=$(($(date +%s) + DURATION))
else
    log "Duration: unlimited"
    END_TIME=0
fi

log "---"

while true; do
    # Check if we've reached the time limit
    if [ "$END_TIME" -gt 0 ]; then
        CURRENT_TIME=$(date +%s)
        if [ "$CURRENT_TIME" -ge "$END_TIME" ]; then
            log "Duration limit reached, exiting..."
            exit 0
        fi
    fi
    failures=0
    total=0

    # Check direct nodes (by container name)
    log "Checking direct nodes..."
    for node in ${DIRECT_NODES}; do
        total=$((total + 1))
        if ! check_node "${node}" "${GRPC_PORT}"; then
            failures=$((failures + 1))
        fi
    done

    # Check DNS resolution (will show all IPs including blackhole)
    log ""
    if ! check_dns_resolution "${DNS_NAME}" "${GRPC_PORT}"; then
        failures=$((failures + 1))
    fi

    log ""
    if [ ${failures} -gt 0 ]; then
        log "⚠ DETECTED ISSUES: ${failures} check(s) failed"
    else
        log "✓ All checks passed"
    fi

    log "========================================="
    sleep "${CHECK_INTERVAL}"
done
