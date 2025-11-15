#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Instant restart (timeout 0)"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"
echo "Restarting with 0s timeout (instant kill)..."
docker restart "${nodeForChaos}" -t 0

echo "Instant restart scenario completed"
