#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Instant restart (timeout 0)"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

echo "Restarting with 0s timeout (instant kill)..."
chaos_inject "instant-restart" "${nodeForChaos}"
docker restart "${nodeForChaos}" -t 0

echo "Waiting for node to become healthy..."
wait_container_healthy "${nodeForChaos}" || echo "WARNING: Node did not become healthy within timeout"
chaos_recover "instant-restart" "${nodeForChaos}" "Node restarted"

echo "Instant restart scenario completed"
