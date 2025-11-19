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
emit_event "06-ip-blackhole" "stop" "${nodeForChaos}" "warning" "{\"ip\":\"${old_ip}\"}"
docker stop "${nodeForChaos}"

# Create a "black hole" container on the same IP
# This container accepts TCP connections but doesn't respond (like /dev/null)
echo "Creating blackhole container on IP ${old_ip}..."
emit_event "06-ip-blackhole" "blackhole_create" "${old_ip}" "critical" "{\"duration_seconds\":60,\"original_node\":\"${nodeForChaos}\"}"
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
emit_event "06-ip-blackhole" "blackhole_remove" "${old_ip}" "info" "{}"
docker stop ydb-blackhole-temp || true

echo "Starting original node back..."
emit_event "06-ip-blackhole" "start" "${nodeForChaos}" "info" "{\"recovery\":true,\"ip\":\"${old_ip}\"}"
docker start "${nodeForChaos}"

echo "IP blackhole scenario completed"
