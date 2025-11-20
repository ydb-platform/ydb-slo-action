#!/bin/sh
# Chaos Monkey helper library

# Events log file location (can be overridden via env)
CHAOS_EVENTS_FILE="${CHAOS_EVENTS_FILE:-/tmp/chaos-events.jsonl}"

# Timers storage (simulated associative array with | separator)
EVENT_TIMERS=""

# Save script name when library is sourced (POSIX sh compatible)
# When library is sourced via '.', $0 points to the calling script
CHAOS_SCRIPT_NAME="${CHAOS_SCRIPT_NAME:-$(basename "${0:-unknown}")}"

# Logging with timestamp
log() {
    echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

# Start measuring event duration (like console.time)
# Usage: event_start "label"
event_start() {
    label="${1:-unknown}"
    epoch_ms=$(date +%s%3N 2>/dev/null || echo "$(date +%s)000")

    # Store timer: "label|timestamp|"
    EVENT_TIMERS="${EVENT_TIMERS}${label}|${epoch_ms}|"
}

# End measuring event duration and emit event (like console.timeEnd)
# Usage: event_end "label" "description"
event_end() {
    label="${1:-unknown}"
    description="${2:-unknown}"

    # Get script name (POSIX sh compatible)
    script_name="${CHAOS_SCRIPT_NAME:-unknown}"

    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    epoch_ms=$(date +%s%3N 2>/dev/null || echo "$(date +%s)000")

    # Find start time for this label
    start_time=""
    for entry in $(echo "$EVENT_TIMERS" | tr '|' '\n'); do
        if [ -n "$entry" ]; then
            if [ "$entry" = "$label" ]; then
                # Next entry is the timestamp
                continue
            fi
            if [ -z "$start_time" ] && echo "$EVENT_TIMERS" | grep -q "${label}|${entry}|"; then
                start_time="$entry"
                break
            fi
        fi
    done

    # Calculate duration
    duration_ms=""
    if [ -n "$start_time" ]; then
        duration_ms=$((epoch_ms - start_time))
    fi

    # Escape JSON strings
    script_escaped=$(echo "$script_name" | sed 's/"/\\"/g')
    description_escaped=$(echo "$description" | sed 's/"/\\"/g')

    # Build JSON event with duration
    if [ -n "$duration_ms" ]; then
        event="{\"timestamp\":\"$timestamp\",\"epoch_ms\":$epoch_ms,\"script\":\"$script_escaped\",\"description\":\"$description_escaped\",\"duration_ms\":$duration_ms}"
    else
        event="{\"timestamp\":\"$timestamp\",\"epoch_ms\":$epoch_ms,\"script\":\"$script_escaped\",\"description\":\"$description_escaped\"}"
    fi

    # Write to events file
    echo "$event" >> "$CHAOS_EVENTS_FILE"
}

# Emit an instant event (no duration)
# Usage: emit_event "description"
emit_event() {
    description="${1:-unknown}"

    # Get script name (POSIX sh compatible)
    script_name="${CHAOS_SCRIPT_NAME:-unknown}"

    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
    epoch_ms=$(date +%s%3N 2>/dev/null || echo "$(date +%s)000")

    # Escape JSON strings
    script_escaped=$(echo "$script_name" | sed 's/"/\\"/g')
    description_escaped=$(echo "$description" | sed 's/"/\\"/g')

    # Build JSON event
    event="{\"timestamp\":\"$timestamp\",\"epoch_ms\":$epoch_ms,\"script\":\"$script_escaped\",\"description\":\"$description_escaped\"}"

    # Write to events file
    echo "$event" >> "$CHAOS_EVENTS_FILE"
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
