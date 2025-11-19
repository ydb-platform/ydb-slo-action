#!/bin/sh
# Chaos Monkey helper library

# Events log file location (can be overridden via env)
CHAOS_EVENTS_FILE="${CHAOS_EVENTS_FILE:-/tmp/chaos-events.jsonl}"

# Logging with timestamp
log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

# Emit a structured chaos event in JSONL format
# Usage: emit_event "scenario_name" "action" "target" ["severity"] ["metadata"]
emit_event() {
    scenario="${1:-unknown}"
    action="${2:-unknown}"
    target="${3:-unknown}"
    severity="${4:-info}"  # info, warning, critical
    metadata="${5:-{}}"
    
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    epoch_ms=$(date +%s%3N 2>/dev/null || echo "$(date +%s)000")
    
    # Escape JSON strings
    scenario_escaped=$(echo "$scenario" | sed 's/"/\\"/g')
    action_escaped=$(echo "$action" | sed 's/"/\\"/g')
    target_escaped=$(echo "$target" | sed 's/"/\\"/g')
    
    # Build JSON event
    event="{\"timestamp\":\"$timestamp\",\"epoch_ms\":$epoch_ms,\"scenario\":\"$scenario_escaped\",\"action\":\"$action_escaped\",\"target\":\"$target_escaped\",\"severity\":\"$severity\",\"metadata\":$metadata}"
    
    # Write to events file (create if doesn't exist)
    echo "$event" >> "$CHAOS_EVENTS_FILE"
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
