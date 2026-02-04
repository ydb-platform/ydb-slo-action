#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: SIGKILL (hard kill)"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

echo "Sending SIGKILL..."
chaos_inject "sigkill" "${nodeForChaos}"
docker kill -s SIGKILL "${nodeForChaos}"

echo "Waiting 5 seconds..."
sleep 5

echo "Starting node back..."
docker start "${nodeForChaos}"

echo "Waiting for node to become healthy..."
wait_container_healthy "${nodeForChaos}" || echo "WARNING: Node did not become healthy within timeout"
chaos_recover "sigkill" "${nodeForChaos}" "Node restarted"

echo "SIGKILL scenario completed"
