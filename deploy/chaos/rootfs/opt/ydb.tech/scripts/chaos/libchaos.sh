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

bridge_cleanup_on_exit() {
    status=$?
    trap - EXIT INT TERM
    set +e
    cleanup
    exit "$status"
}

bridge_cleanup_on_signal() {
    status="$1"
    trap - EXIT INT TERM
    set +e
    cleanup
    exit "$status"
}

install_bridge_cleanup_traps() {
    trap bridge_cleanup_on_exit EXIT
    trap 'bridge_cleanup_on_signal 130' INT
    trap 'bridge_cleanup_on_signal 143' TERM
}

clear_bridge_cleanup_traps() {
    trap - EXIT INT TERM
}

get_bridge_cli_node() (
    if [ -n "${BRIDGE_CLI_PILE:-}" ]; then
        node=$(docker ps \
            --filter 'label=ydb.node.type=storage' \
            --filter "label=ydb.node.location.pile=${BRIDGE_CLI_PILE}" \
            --format '{{.Names}}' | sort | head -n 1)

        if [ -n "$node" ]; then
            echo "$node"
            return 0
        fi
    fi

    docker ps \
        --filter 'label=ydb.node.type=storage' \
        --format '{{.Names}}' | sort | head -n 1
)

bridge_cli() (
    node=$(get_bridge_cli_node)

    if [ -z "$node" ]; then
        echo "ERROR: No running bridge storage node found" >&2
        return 1
    fi

    docker exec "$node" ydb -y -e grpc://localhost:2136 admin cluster bridge "$@"
)

get_bridge_pile_by_state() (
    expected_state="$1"

    bridge_cli list | awk -v expected="$expected_state" '
        $1 == "Pile" && $3 == expected {
            sub(/:$/, "", $2)
            print $2
            exit
        }
    '
)

get_bridge_pile_state() (
    pile="$1"

    bridge_cli list | awk -v expected_pile="${pile}:" '
        $1 == "Pile" && $2 == expected_pile {
            print $3
            exit
        }
    '
)

wait_bridge_pile_state() (
    pile="$1"
    expected_state="$2"
    timeout="${3:-180}"
    elapsed=0

    while [ "$elapsed" -lt "$timeout" ]; do
        state=$(get_bridge_pile_state "$pile" 2>/dev/null || true)
        if [ "$state" = "$expected_state" ]; then
            return 0
        fi

        sleep 2
        elapsed=$((elapsed + 2))
    done

    echo "ERROR: Pile $pile did not reach $expected_state within ${timeout}s" >&2
    bridge_cli list >&2 || true
    return 1
)

get_bridge_pile_nodes() (
    pile="$1"
    node_type="${2:-}"

    if [ -n "$node_type" ]; then
        docker ps -a \
            --filter "label=ydb.node.location.pile=${pile}" \
            --filter "label=ydb.node.type=${node_type}" \
            --format '{{.Names}}' | sort
        return
    fi

    docker ps -a \
        --filter "label=ydb.node.location.pile=${pile}" \
        --format '{{.Names}}' | sort
)

stop_bridge_pile() (
    pile="$1"
    timeout="${2:-0}"
    nodes=$(get_bridge_pile_nodes "$pile")

    if [ -z "$nodes" ]; then
        echo "ERROR: No nodes found for pile $pile" >&2
        return 1
    fi

    for node in $nodes; do
        docker stop "$node" -t "$timeout"
    done
)

start_bridge_pile() (
    pile="$1"
    storage_nodes=$(get_bridge_pile_nodes "$pile" storage)
    database_nodes=$(get_bridge_pile_nodes "$pile" database)
    nodes="$storage_nodes $database_nodes"

    if [ -z "$storage_nodes" ] || [ -z "$database_nodes" ]; then
        echo "ERROR: No nodes found for pile $pile" >&2
        return 1
    fi

    for node in $nodes; do
        docker start "$node" >/dev/null
    done
)

restart_bridge_pile() (
    pile="$1"
    timeout="${2:-180}"

    stop_bridge_pile "$pile" 0
    start_bridge_pile "$pile"
    wait_bridge_pile_healthy "$pile" "$timeout"
)

wait_bridge_pile_healthy() (
    pile="$1"
    timeout="${2:-180}"
    nodes=$(get_bridge_pile_nodes "$pile")

    for node in $nodes; do
        wait_container_healthy "$node" "$timeout" || return 1
    done
)

recover_bridge_pile() (
    pile="$1"
    timeout="${2:-180}"
    restart_after_rejoin="${3:-false}"

    start_bridge_pile "$pile"
    wait_bridge_pile_healthy "$pile" "$timeout"

    state=$(get_bridge_pile_state "$pile")
    case "$state" in
        DISCONNECTED|SUSPENDED)
            bridge_cli rejoin --pile "$pile"
            if [ "$restart_after_rejoin" = true ]; then
                restart_bridge_pile "$pile" "$timeout"
            fi
            ;;
        NOT_SYNCHRONIZED)
            if [ "$restart_after_rejoin" = true ]; then
                restart_bridge_pile "$pile" "$timeout"
            fi
            ;;
        SYNCHRONIZED|PRIMARY)
            ;;
        *)
            echo "ERROR: Cannot recover pile $pile from state '$state'" >&2
            return 1
            ;;
    esac

    if [ "$state" != "PRIMARY" ]; then
        wait_bridge_pile_state "$pile" SYNCHRONIZED "$timeout"
    fi
)

restore_bridge_primary() (
    desired_primary="$1"
    timeout="${2:-180}"
    transition_delay="${BRIDGE_TRANSITION_DELAY:-15}"
    state=$(get_bridge_pile_state "$desired_primary")

    case "$state" in
        PRIMARY)
            return 0
            ;;
        SYNCHRONIZED)
            sleep "$transition_delay"
            bridge_cli switchover --new-primary "$desired_primary"
            ;;
        PROMOTED)
            ;;
        *)
            echo "ERROR: Cannot restore $desired_primary as PRIMARY from state '$state'" >&2
            return 1
            ;;
    esac

    wait_bridge_pile_state "$desired_primary" PRIMARY "$timeout"
)
