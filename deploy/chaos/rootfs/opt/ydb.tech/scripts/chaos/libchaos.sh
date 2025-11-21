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
    # Get milliseconds timestamp (POSIX compatible: seconds * 1000)
    epoch_ms=$(($(date +%s) * 1000))

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

    # Get milliseconds timestamp (POSIX compatible: seconds * 1000)
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    epoch_ms=$(($(date +%s) * 1000))

    # Find start time for this label
    # EVENT_TIMERS format: "label1|timestamp1|label2|timestamp2|..."
    # Extract the timestamp that follows our label
    start_time=""
    case "$EVENT_TIMERS" in
        *"${label}|"*)
            # Extract everything after "label|"
            temp="${EVENT_TIMERS#*${label}|}"
            # Extract the timestamp (everything before next |)
            start_time="${temp%%|*}"
            ;;
    esac

    # Calculate duration
    duration_ms=""
    if [ -n "$start_time" ] && [ "$start_time" -gt 0 ] 2>/dev/null; then
        duration_ms=$((epoch_ms - start_time))
        # Ensure duration is positive (sanity check)
        if [ "$duration_ms" -lt 0 ]; then
            duration_ms=""
        fi
    fi

    # Remove used timer from EVENT_TIMERS to avoid reuse
    if [ -n "$start_time" ]; then
        EVENT_TIMERS=$(echo "$EVENT_TIMERS" | sed "s/${label}|${start_time}|//g")
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

    # Get milliseconds timestamp (POSIX compatible: seconds * 1000)
    timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    epoch_ms=$(($(date +%s) * 1000))

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
