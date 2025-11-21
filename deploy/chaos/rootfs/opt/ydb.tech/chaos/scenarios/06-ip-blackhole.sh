#!/bin/sh
set -e

# Load chaos library
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: IP Blackhole (DNS cache poisoning simulation)"

nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

# Get the node's IP address
old_ip=$(docker inspect "${nodeForChaos}" --format '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}')
echo "Node IP: ${old_ip}"

# Stop the node
echo "Stopping node..."
docker stop "${nodeForChaos}"

# Create a "black hole" container on the same IP
# This container accepts TCP connections but doesn't respond (like /dev/null)
echo "Creating blackhole container on IP ${old_ip}..."
event_start "blackhole-${nodeForChaos}"
docker run -d --rm \
  --name ydb-blackhole-temp \
  --network ydb_ydb-net \
  --ip "${old_ip}" \
  alpine/socat \
  tcp-listen:2135,fork,reuseaddr exec:'/bin/cat'

echo "Blackhole active for 60 seconds (cached DNS will point to non-responsive IP)..."
sleep 60

# Cleanup
echo "Removing blackhole container..."
docker stop ydb-blackhole-temp || true

echo "Starting original node back..."
docker start "${nodeForChaos}"

echo "Waiting for node to become healthy..."
wait_container_healthy "${nodeForChaos}" || echo "WARNING: Node did not become healthy within timeout"
event_end "blackhole-${nodeForChaos}" "${nodeForChaos} unavailable"

echo "IP blackhole scenario completed"
