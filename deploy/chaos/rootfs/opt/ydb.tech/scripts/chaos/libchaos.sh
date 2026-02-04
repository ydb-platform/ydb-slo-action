#!/bin/sh
# Chaos Monkey helper library
# Depends on: libotel.sh

# Source OTLP integration library
. /opt/ydb.tech/scripts/chaos/libotel.sh

# Script name for event attribution
SCRIPT_NAME="${CHAOS_SCRIPT_NAME:-$(basename "${0:-unknown}")}"

# Logging with timestamp
log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

# Start a chaos fault injection
# Usage: chaos_inject "fault_name" "node"
chaos_inject() {
    fault_name="${1:-unknown}"
    node="${2:-}"

    log "Injecting fault: $fault_name on $node"

    # Send metrics to OTLP
    if otel_cli_available && otel_is_configured; then
        event_type="${SCRIPT_NAME:-chaos}"

        # Gauge: mark fault as active (1)
        # This allows building region annotations via Alertmanager or State Timeline
        otel_send_gauge "chaos_active" 1 \
            "event_type=${event_type}" \
            "fault=${fault_name}" \
            "node=${node}"
    fi
}

# Recover from a chaos fault injection
# Usage: chaos_recover "fault_name" "node" "description"
chaos_recover() {
    fault_name="${1:-unknown}"
    node="${2:-}"
    description="${3:-unknown}"

    log "Recovered: $fault_name ($description)"

    # Send metrics to OTLP
    if otel_cli_available && otel_is_configured; then
        event_type="${SCRIPT_NAME:-chaos}"

        # Gauge: mark fault as inactive (0)
        otel_send_gauge "chaos_active" 0 \
            "event_type=${event_type}" \
            "fault=${fault_name}" \
            "node=${node}"
    fi
}

# Wait for container to become healthy
# Usage: wait_container_healthy "container_name" [timeout_seconds]
# Returns: 0 if healthy, 1 if timeout
wait_container_healthy() {
    node="$1"
    timeout="${2:-60}"

    elapsed=0
    while [ $elapsed -lt $timeout ]; do
        if docker inspect "${node}" --format='{{.State.Health.Status}}' 2>/dev/null | grep -q "healthy"; then
            return 0
        fi
        sleep 2
        elapsed=$((elapsed + 2))
    done

    return 1
}

# Get a random YDB database container
get_random_database_node() {
    # Get a list of all containers starting with ydb-database-*
    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-database-')

    # Convert the list to a newline-separated string
    containers=$(echo "$containers" | tr ' ' '\n')

    # Count the number of containers
    containersCount=$(echo "$containers" | wc -l)

    if [ "$containersCount" -eq 0 ]; then
        echo "ERROR: No database nodes found" >&2
        return 1
    fi

    # Generate a random number between 0 and containersCount - 1
    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)

    # Get the container name at the random index
    echo "$containers" | sed -n "$(($randomIndex + 1))p"
}

# Get a random YDB storage container
get_random_storage_node() {
    # Get a list of all containers starting with ydb-storage-*
    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-storage-')

    # Convert the list to a newline-separated string
    containers=$(echo "$containers" | tr ' ' '\n')

    # Count the number of containers
    containersCount=$(echo "$containers" | wc -l)

    if [ "$containersCount" -eq 0 ]; then
        echo "ERROR: No storage nodes found" >&2
        return 1
    fi

    # Generate a random number between 0 and containersCount - 1
    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)

    # Get the container name at the random index
    echo "$containers" | sed -n "$(($randomIndex + 1))p"
}

# Get any random YDB node (database or storage)
get_random_node() {
    containers=$(docker ps --format '{{.Names}}' | grep '^ydb-')

    containers=$(echo "$containers" | tr ' ' '\n')
    containersCount=$(echo "$containers" | wc -l)

    if [ "$containersCount" -eq 0 ]; then
        echo "ERROR: No YDB nodes found" >&2
        return 1
    fi

    randomIndex=$(shuf -i 0-$(($containersCount - 1)) -n 1)
    echo "$containers" | sed -n "$(($randomIndex + 1))p"
}
