#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Pause/Unpause (freeze processes)"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

echo "Pausing (freezing all processes)..."
chaos_inject "pause-unpause" "${nodeForChaos}"
docker pause "${nodeForChaos}"

echo "Container paused for 30 seconds..."
sleep 30

echo "Unpausing (resuming all processes)..."
docker unpause "${nodeForChaos}"

echo "Waiting for node to become healthy..."
wait_container_healthy "${nodeForChaos}" || echo "WARNING: Node did not become healthy within timeout"
chaos_recover "pause-unpause" "${nodeForChaos}" "Node resumed"

echo "Pause/unpause scenario completed"
