#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Pause/Unpause (freeze processes)"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

echo "Pausing (freezing all processes)..."
emit_event "04-pause-unpause" "pause" "${nodeForChaos}" "warning" "{\"duration_seconds\":30}"
docker pause "${nodeForChaos}"

echo "Container paused for 30 seconds..."
sleep 30

echo "Unpausing (resuming all processes)..."
emit_event "04-pause-unpause" "unpause" "${nodeForChaos}" "info" "{}"
docker unpause "${nodeForChaos}"

echo "Pause/unpause scenario completed"
