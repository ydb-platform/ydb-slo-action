#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

SCENARIOS_DIR="/opt/ydb.tech/chaos/scenarios"
SCENARIO_DELAY="${CHAOS_SCENARIO_DELAY:-60}"
INITIAL_DELAY="${CHAOS_INITIAL_DELAY:-0}"

# Initialize events file
if [ -f "$CHAOS_EVENTS_FILE" ]; then
    rm "$CHAOS_EVENTS_FILE"
fi
touch "$CHAOS_EVENTS_FILE"

# Wait before starting chaos scenarios to let other services initialize
if [ "$INITIAL_DELAY" -gt 0 ]; then
    echo "Waiting ${INITIAL_DELAY}s before starting Chaos Monkey..."
    sleep "$INITIAL_DELAY"
fi

log "Chaos Monkey started"
log "Configuration: scenario_delay=${SCENARIO_DELAY}s"
log "Events file: ${CHAOS_EVENTS_FILE}"
emit_event "chaos-monkey" "start" "system" "info" "{\"scenario_delay\":${SCENARIO_DELAY},\"initial_delay\":${INITIAL_DELAY}}"
echo ""

if [ ! -d "$SCENARIOS_DIR" ]; then
    log "ERROR: Directory $SCENARIOS_DIR does not exist"
    exit 1
fi

# Find all .sh files, sort by name and execute
first_scenario=true
for script in $(find "$SCENARIOS_DIR" -maxdepth 1 -name "*.sh" -type f | sort); do
    if [ -x "$script" ]; then
        # Add delay before each scenario except the first one
        if [ "$first_scenario" = true ]; then
            first_scenario=false
        else
            log "Waiting ${SCENARIO_DELAY}s before next scenario"
            sleep "$SCENARIO_DELAY"
            echo ""
        fi

        scenario_name=$(basename "$script" | sed 's/.sh$//')
        log "Running scenario: ${scenario_name}"

        "$script" 2>&1 | sed 's/^/  /'

        echo ""
    else
        log "WARNING: Skipping $(basename "$script") - not executable"
    fi
done

log "Chaos Monkey finished"
emit_event "chaos-monkey" "finish" "system" "info" "{\"total_scenarios\":$(find "$SCENARIOS_DIR" -maxdepth 1 -name "*.sh" -type f -executable | wc -l)}"
echo ""

# Execute additional commands if provided via CMD
if [ $# -gt 0 ]; then
    echo "Executing additional command: $*"
    exec "$@"
fi
