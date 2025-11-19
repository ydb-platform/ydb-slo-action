#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Graceful stop with timeout"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

echo "Stopping with 30s timeout..."
event_start "stop-${nodeForChaos}"
docker stop "${nodeForChaos}" -t 30

echo "Waiting 5 seconds..."
sleep 5

echo "Starting node back..."
docker start "${nodeForChaos}"

echo "Waiting for node to become healthy..."
wait_container_healthy "${nodeForChaos}"
event_end "stop-${nodeForChaos}" "${nodeForChaos} unavailable"

echo "Graceful stop scenario completed"
