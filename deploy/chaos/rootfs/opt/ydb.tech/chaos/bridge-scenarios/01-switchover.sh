#!/bin/sh
set -e

. /opt/ydb.tech/scripts/chaos/libchaos.sh

fault_duration="${BRIDGE_FAULT_DURATION:-15}"
recovery_timeout="${BRIDGE_RECOVERY_TIMEOUT:-180}"
original_primary=$(get_bridge_pile_by_state PRIMARY)
new_primary=$(get_bridge_pile_by_state SYNCHRONIZED)
fault_active=false

cleanup() {
    set +e
    restore_bridge_primary "$original_primary" "$recovery_timeout"
    if [ "$fault_active" = true ]; then
        chaos_recover "bridge-switchover" "$new_primary" "Original PRIMARY restored"
    fi
}

if [ -z "$original_primary" ] || [ -z "$new_primary" ]; then
    echo "ERROR: Bridge cluster must have PRIMARY and SYNCHRONIZED piles"
    exit 1
fi

BRIDGE_CLI_PILE="$original_primary"
install_bridge_cleanup_traps

echo "Scenario: Planned PRIMARY switchover from $original_primary to $new_primary"
chaos_inject "bridge-switchover" "$new_primary"
fault_active=true

bridge_cli switchover --new-primary "$new_primary"
wait_bridge_pile_state "$new_primary" PRIMARY "$recovery_timeout"
BRIDGE_CLI_PILE="$new_primary"
sleep "$fault_duration"

restore_bridge_primary "$original_primary" "$recovery_timeout"
BRIDGE_CLI_PILE="$original_primary"
wait_bridge_pile_state "$new_primary" SYNCHRONIZED "$recovery_timeout"

chaos_recover "bridge-switchover" "$new_primary" "Original PRIMARY restored"
fault_active=false
clear_bridge_cleanup_traps

echo "Bridge switchover scenario completed"
