#!/bin/bash

set -e

# =============================================================================
# YDB Docker Entrypoint Script
# =============================================================================
# Простой entrypoint для статической конфигурации YDB с поддержкой init операций
# =============================================================================

# Функция для логирования с timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Выполняет bootstrap кластера YDB
perform_cluster_bootstrap() {
    log "Running cluster bootstrap..."

    # Используем первый broker из YDB_NODE_BROKERS или fallback
    local storage_endpoint
    if [[ -n "$YDB_NODE_BROKERS" ]]; then
        storage_endpoint=$(echo "$YDB_NODE_BROKERS" | cut -d',' -f1)
    else
        storage_endpoint="grpc://localhost:2136"
    fi

    log "Bootstrapping cluster with endpoint: $storage_endpoint"
    exec /ydb -e "$storage_endpoint" -y admin cluster bootstrap --uuid test
}

# Создает базу данных YDB
perform_database_creation() {
    log "Creating database..."

    # Используем первый broker из YDB_NODE_BROKERS или fallback
    local storage_endpoint
    if [[ -n "$YDB_NODE_BROKERS" ]]; then
        storage_endpoint=$(echo "$YDB_NODE_BROKERS" | cut -d',' -f1)
    else
        storage_endpoint="grpc://localhost:2136"
    fi

    local database_path="${YDB_DATABASE_PATH:-/Root/testdb}"
    log "Creating database '$database_path' with endpoint: $storage_endpoint"
    exec /ydbd -s "$storage_endpoint" admin database "$database_path" create ssd:1
}

# Создает блочное устройство если необходимо
prepare_block_device() {
    local config_path="${YDB_CONFIG_PATH:-/opt/ydb/cfg/config.yaml}"
    local disk_path="${YDB_DISK_PATH:-/tmp/pdisk.data}"

    log "Checking if block device preparation is needed..."

    # Проверяем, используется ли in-memory режим
    if [[ "${YDB_USE_IN_MEMORY_PDISKS:-false}" == "true" ]]; then
        log "In-memory mode detected (YDB_USE_IN_MEMORY_PDISKS=true), skipping block device creation"
        return 0
    fi

    # Проверяем, передан ли путь к блочному устройству пользователем
    if [[ -n "$YDB_DISK_PATH" ]]; then
        disk_path="$YDB_DISK_PATH"
        log "Using user-provided disk path: $disk_path"
    fi

    # Проверяем, существует ли уже файл диска
    if [[ -f "$disk_path" ]]; then
        log "Disk file already exists at $disk_path, skipping creation"
        return 0
    fi

    log "Creating block device at $disk_path..."

    # Создаем директорию если необходимо
    mkdir -p "$(dirname "$disk_path")"

    # Создаем файл диска
    dd if=/dev/zero of="$disk_path" bs=1M count=2048

    log "Obliterating disk at $disk_path..."
    /ydbd admin bs disk obliterate "$disk_path"

    log "Block device prepared successfully"
}

# Запускает обычный YDB узел (storage или database)
start_ydb_node() {
    log "Starting YDB storage/database node"

    # Базовые параметры
    local node_type="${YDB_NODE_TYPE:-static}"
    local node_location_dc="${YDB_NODE_LOCATION_DC}"
    local node_location_rack="${YDB_NODE_LOCATION_RACK}"

    local config_path="${YDB_CONFIG_PATH:-/opt/ydb/cfg/config.yaml}"
    local grpc_port="${YDB_GRPC_PORT:-2136}"
    local mon_port="${YDB_MON_PORT:-8765}"
    local ic_port="${YDB_IC_PORT:-19001}"

    # Формируем команду запуска
    local ydb_args=(
        "/ydbd"
        "server"
        "--yaml-config" "$config_path"
        "--grpc-port" "$grpc_port"
        "--mon-port" "$mon_port"
        "--ic-port" "$ic_port"
    )

    # Добавляем --node только для storage узлов (без tenant)
    if [[ -z "$YDB_TENANT" ]]; then
        # Подготавливаем блочное устройство для storage узлов
        prepare_block_device
        ydb_args+=("--node" "$node_type")
    fi

    # Добавляем tenant если указан
    if [[ -n "$YDB_TENANT" ]]; then
        ydb_args+=("--tenant" "$YDB_TENANT")
    fi

    if [[ -n "$YDB_NODE_LOCATION_DC" ]]; then
        ydb_args+=("--data-center" "$node_location_dc")
    fi

    if [[ -n "$YDB_NODE_LOCATION_RACK" ]]; then
        ydb_args+=("--rack" "$node_location_rack")
    fi

    # Добавляем node brokers если указаны
    if [[ -n "$YDB_NODE_BROKERS" ]]; then
        IFS=',' read -ra brokers <<< "$YDB_NODE_BROKERS"
        for broker in "${brokers[@]}"; do
            ydb_args+=("--node-broker" "$broker")
        done
    fi

    # Добавляем bridge pile name если указан
    if [[ -n "$YDB_BRIDGE_PILE_NAME" ]]; then
        ydb_args+=("--bridge-pile-name" "$YDB_BRIDGE_PILE_NAME")
    fi

    log "Starting YDB with: ${ydb_args[*]}"
    exec "${ydb_args[@]}"
}

# Основная логика
if [[ "$1" == "/ydbd" || "$1" == "ydbd" || -n "$YDB_INIT_OPERATION" ]]; then
    log "Starting YDB node..."

    # Обрабатываем init операции
    case "$YDB_INIT_OPERATION" in
        "bootstrap")
            perform_cluster_bootstrap
            ;;
        "create-database")
            perform_database_creation
            ;;
        "")
            # Обычный запуск YDB node
            start_ydb_node
            ;;
        *)
            log "Unknown init operation: $YDB_INIT_OPERATION"
            exit 1
            ;;
    esac
else
    # Если это не YDB команда, выполняем как есть
    log "Executing command: $*"
    exec "$@"
fi
