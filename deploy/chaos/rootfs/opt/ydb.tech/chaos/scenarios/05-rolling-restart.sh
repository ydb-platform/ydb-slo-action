#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Rolling restart of database nodes"

# Get all database nodes
nodes=$(docker ps --format '{{.Names}}' | grep '^ydb-database-' | sort)

if [ -z "$nodes" ]; then
    echo "ERROR: No database nodes found"
    exit 1
fi

node_count=$(echo "$nodes" | wc -l)
echo "Found ${node_count} database nodes"

# Restart each node one by one
node_num=1
for node in $nodes; do
    echo ""
    echo "Restarting node ${node_num}/${node_count}: ${node}"
    event_start "restart-${node}"
    docker restart "${node}" -t 10

    # Wait for node to become healthy before proceeding to next
    echo "Waiting for ${node} to become healthy..."
    if wait_container_healthy "${node}"; then
        echo "${node} is healthy"
        event_end "restart-${node}" "${node} unavailable"
    else
        echo "WARNING: ${node} did not become healthy within 60s"
        event_end "restart-${node}" "${node} unavailable (timeout)"
    fi

    node_num=$((node_num + 1))

    # Small delay between restarts
    if [ $node_num -le $node_count ]; then
        echo "Waiting 10s before next node..."
        sleep 10
    fi
done

echo ""
echo "Rolling restart completed for all ${node_count} nodes"
