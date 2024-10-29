import {
  HOST,
  PROMETHEUS_PORT,
  PROMETHEUS_PUSHGATEWAY_PORT,
  YDB_ENDPOINT,
  YDB_GRPC_PORT,
  YDB_IC_PORT,
  YDB_MON_PORT,
  YDB_TENANT,
} from './constants'

export const prometheusConfig = /** YAML */ `
global:
  scrape_interval: 1s
  evaluation_interval: 1s

scrape_configs:
  - job_name: 'pushgateway'
    static_configs:
      - targets: ['${HOST}:${PROMETHEUS_PUSHGATEWAY_PORT}']
`

export const ydbConfig = /** YAML */ `
actor_system_config:
  cpu_count: 1
  node_type: STORAGE
  use_auto_config: true
blob_storage_config:
  service_set:
    groups:
      - erasure_species: none
        rings:
          - fail_domains:
              - vdisk_locations:
                  - node_id: 1
                    path: SectorMap:1:64
                    pdisk_category: SSD
channel_profile_config:
  profile:
    - channel:
        - erasure_species: none
          pdisk_category: 0
          storage_pool_kind: ssd
        - erasure_species: none
          pdisk_category: 0
          storage_pool_kind: ssd
        - erasure_species: none
          pdisk_category: 0
          storage_pool_kind: ssd
      profile_id: 0
domains_config:
  domain:
    - name: Root
      storage_pool_types:
        - kind: ssd
          pool_config:
            box_id: 1
            erasure_species: none
            kind: ssd
            pdisk_filter:
              - property:
                  - type: SSD
            vdisk_kind: Default
  state_storage:
    - ring:
        node:
          - 1
        nto_select: 1
      ssid: 1
grpc_config:
  port: ${YDB_GRPC_PORT}
host_configs:
  - drive:
      - path: SectorMap:1:64
        type: SSD
    host_config_id: 1
hosts:
  - host: ${HOST}
    host_config_id: 1
    node_id: 1
    port: ${YDB_IC_PORT}
    walle_location:
      body: 1
      data_center: az-1
      rack: "0"
static_erasure: none
`

// Generate YDB Static Node
let generateStaticNode = () =>
	/** YAML */ `
  static-0:
    <<: *ydb-common
    container_name: ydb-static-0
    command:
      - /opt/ydb/bin/ydbd
      - server
      - --grpc-port
      - "${YDB_GRPC_PORT}"
      - --mon-port
      - "${YDB_MON_PORT}"
      - --ic-port
      - "${YDB_IC_PORT}"
      - --yaml-config
      - /opt/ydb/cfg/config.yaml
      - --node
      - static
      - --label
      - deployment=docker
    ports:
      - ${YDB_GRPC_PORT}:${YDB_GRPC_PORT}
      - ${YDB_MON_PORT}:${YDB_MON_PORT}
      - ${YDB_IC_PORT}:${YDB_IC_PORT}
    healthcheck:
      test: bash -c "exec 6<> /dev/tcp/${HOST}/${YDB_GRPC_PORT}"
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 30s
    deploy:
      <<: *ydb-deploy

  static-init:
    <<: *ydb-common
    restart: on-failure
    container_name: ydb-static-init
    command:
      - /opt/ydb/bin/ydbd
      - -s
      - ${YDB_ENDPOINT}
      - admin
      - blobstorage
      - config
      - init
      - --yaml-file
      - /opt/ydb/cfg/config.yaml
    depends_on:
      static-0:
        condition: service_healthy

  tenant-init:
    <<: *ydb-common
    restart: on-failure
    container_name: ydb-tenant-init
    command:
      - /opt/ydb/bin/ydbd
      - -s
      - ${YDB_ENDPOINT}
      - admin
      - database
      - ${YDB_TENANT}
      - create
      - ssd:1
    depends_on:
      static-init:
        condition: service_completed_successfully
`.slice(1)

// Generate YDB Dynamic Node
let generateDynamicNode = (idx: number) =>
	/** YAML */ `
  dynamic-${idx}:
    <<: *ydb-common
    container_name: ydb-dynamic-${idx}
    command:
      - /opt/ydb/bin/ydbd
      - server
      - --grpc-port
      - "${YDB_GRPC_PORT + idx}"
      - --mon-port
      - "${YDB_MON_PORT + idx}"
      - --ic-port
      - "${YDB_IC_PORT + idx}"
      - --yaml-config
      - /opt/ydb/cfg/config.yaml
      - --tenant
      - ${YDB_TENANT}
      - --node-broker
      - ${YDB_ENDPOINT}
      - --label
      - deployment=docker
    ports:
      - ${YDB_GRPC_PORT + idx}:${YDB_GRPC_PORT + idx}
      - ${YDB_MON_PORT + idx}:${YDB_MON_PORT + idx}
      - ${YDB_IC_PORT + idx}:${YDB_IC_PORT + idx}
    healthcheck:
      test: bash -c "exec 6<> /dev/tcp/${HOST}/${YDB_GRPC_PORT + idx}"
      interval: 10s
      timeout: 1s
      retries: 3
      start_period: 30s
    depends_on:
      static-0:
        condition: service_healthy
      static-init:
        condition: service_completed_successfully
      tenant-init:
        condition: service_completed_successfully
    deploy:
      <<: *ydb-deploy
`.slice(1)

// Generate Monitoring
let generateMonitoring = () =>
	/** YAML */ `
  prometheus:
    image: prom/prometheus
    restart: unless-stopped
    <<: *runtime
    ports:
      - "${PROMETHEUS_PORT}:${PROMETHEUS_PORT}"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    deploy: &monitoring-deploy
      resources:
        limits:
          cpus: '0.1'
          memory: 1000M
        reservations:
          cpus: '0.001'
          memory: 50M

  prometheus-pushgateway:
    image: prom/pushgateway
    restart: unless-stopped
    <<: *runtime
    ports:
      - "${PROMETHEUS_PUSHGATEWAY_PORT}:${PROMETHEUS_PUSHGATEWAY_PORT}"
    network_mode: host
    deploy:
      <<: *monitoring-deploy
`.slice(1)

// Generate Compose
export let generateComposeFile = (
  ydbDatabaseNodeCount: number
) => /** YAML */ `# Code generated by Github Action; DO NOT EDIT.

x-runtime: &runtime
  platform: linux/amd64
  privileged: true
  network_mode: host

x-node: &ydb-common
  image: cr.yandex/crptqonuodf51kdj7a7d/ydb:24.2.7
  restart: always
  hostname: ${HOST}
  <<: *runtime
  volumes:
    - ./ydb.yaml:/opt/ydb/cfg/config.yaml

x-deploy: &ydb-deploy
  restart_policy:
    condition: any

name: ydb

services:
${generateStaticNode()}
${Array.from({ length: ydbDatabaseNodeCount }, (_, i) => i + 1)
    .map(generateDynamicNode)
    .join('\n')}
${generateMonitoring()}
`
