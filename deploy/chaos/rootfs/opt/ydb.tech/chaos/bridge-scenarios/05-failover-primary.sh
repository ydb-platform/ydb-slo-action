#!/bin/sh
set -e

. /opt/ydb.tech/scripts/chaos/libchaos.sh

fault_duration="${BRIDGE_FAULT_DURATION:-15}"
failover_delay="${BRIDGE_FAILOVER_DELAY:-5}"
recovery_timeout="${BRIDGE_RECOVERY_TIMEOUT:-180}"
original_primary=$(get_bridge_pile_by_state PRIMARY)
new_primary=$(get_bridge_pile_by_state SYNCHRONIZED)
fault_active=false

cleanup() {
    set +e
    recover_bridge_pile "$original_primary" "$recovery_timeout" true
    restore_bridge_primary "$original_primary" "$recovery_timeout"
    if [ "$fault_active" = true ]; then
        chaos_recover "bridge-failover-primary" "$original_primary" "Original PRIMARY restored"
    fi
}

if [ -z "$original_primary" ] || [ -z "$new_primary" ]; then
    echo "ERROR: Bridge cluster must have PRIMARY and SYNCHRONIZED piles"
    exit 1
fi

BRIDGE_CLI_PILE="$original_primary"
install_bridge_cleanup_traps

echo "Scenario: Emergency failover of PRIMARY pile $original_primary"
chaos_inject "bridge-failover-primary" "$original_primary"
fault_active=true

stop_bridge_pile "$original_primary" 0
BRIDGE_CLI_PILE="$new_primary"
sleep "$failover_delay"
bridge_cli failover --pile "$original_primary" --new-primary "$new_primary"
wait_bridge_pile_state "$original_primary" DISCONNECTED "$recovery_timeout"
wait_bridge_pile_state "$new_primary" PRIMARY "$recovery_timeout"
sleep "$fault_duration"

recover_bridge_pile "$original_primary" "$recovery_timeout" true
restore_bridge_primary "$original_primary" "$recovery_timeout"
BRIDGE_CLI_PILE="$original_primary"
wait_bridge_pile_state "$new_primary" SYNCHRONIZED "$recovery_timeout"

chaos_recover "bridge-failover-primary" "$original_primary" "Original PRIMARY restored"
fault_active=false
clear_bridge_cleanup_traps

echo "Bridge PRIMARY failover scenario completed"
