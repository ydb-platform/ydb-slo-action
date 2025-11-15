#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Graceful stop with timeout"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"
echo "Stopping with 30s timeout..."
docker stop "${nodeForChaos}" -t 30

echo "Waiting 5 seconds..."
sleep 5

echo "Starting node back..."
docker start "${nodeForChaos}"

echo "Graceful stop scenario completed"
