#!/bin/sh
set -e

. /opt/ydb.tech/scripts/chaos/libchaos.sh

fault_duration="${BRIDGE_FAULT_DURATION:-15}"
recovery_timeout="${BRIDGE_RECOVERY_TIMEOUT:-180}"
original_primary=$(get_bridge_pile_by_state PRIMARY)
affected_pile=$(get_bridge_pile_by_state SYNCHRONIZED)
fault_active=false

cleanup() {
    set +e
    recover_bridge_pile "$affected_pile" "$recovery_timeout"
    restore_bridge_primary "$original_primary" "$recovery_timeout"
    if [ "$fault_active" = true ]; then
        chaos_recover "bridge-takedown" "$affected_pile" "Pile rejoined"
    fi
}

if [ -z "$original_primary" ] || [ -z "$affected_pile" ]; then
    echo "ERROR: Bridge cluster must have PRIMARY and SYNCHRONIZED piles"
    exit 1
fi

BRIDGE_CLI_PILE="$original_primary"
install_bridge_cleanup_traps

echo "Scenario: Planned takedown of SYNCHRONIZED pile $affected_pile"
chaos_inject "bridge-takedown" "$affected_pile"
fault_active=true

bridge_cli takedown --pile "$affected_pile"
wait_bridge_pile_state "$affected_pile" DISCONNECTED "$recovery_timeout"
stop_bridge_pile "$affected_pile" 30
sleep "$fault_duration"

recover_bridge_pile "$affected_pile" "$recovery_timeout"
restore_bridge_primary "$original_primary" "$recovery_timeout"

chaos_recover "bridge-takedown" "$affected_pile" "Pile rejoined"
fault_active=false
clear_bridge_cleanup_traps

echo "Bridge takedown scenario completed"
