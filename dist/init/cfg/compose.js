import"../../main-ynsbc1hx.js";

// init/cfg/compose.yml
var name = "ydb", services = {
  "static-0": {
    image: "cr.yandex/crptqonuodf51kdj7a7d/ydb:25.2.1.10-rc",
    restart: "always",
    hostname: "${HOST}",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    volumes: [
      "./ydb.yaml:/opt/ydb/cfg/config.yaml"
    ],
    container_name: "ydb-static-0",
    command: [
      "/opt/ydb/bin/ydbd",
      "server",
      "--grpc-port",
      "${YDB_GRPC_PORT}",
      "--mon-port",
      "${YDB_MON_PORT}",
      "--ic-port",
      "${YDB_IC_PORT}",
      "--yaml-config",
      "/opt/ydb/cfg/config.yaml",
      "--node",
      "static",
      "--label",
      "deployment=docker"
    ],
    ports: [
      "${YDB_GRPC_PORT}:${YDB_GRPC_PORT}",
      "${YDB_MON_PORT}:${YDB_MON_PORT}",
      "${YDB_IC_PORT}:${YDB_IC_PORT}"
    ],
    healthcheck: {
      test: 'bash -c "exec 6<> /dev/tcp/${HOST}/${YDB_GRPC_PORT}"',
      interval: "10s",
      timeout: "1s",
      retries: 3,
      start_period: "30s"
    }
  },
  "static-init": {
    image: "cr.yandex/crptqonuodf51kdj7a7d/ydb:25.2.1.10-rc",
    restart: "always",
    hostname: "${HOST}",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    volumes: [
      "./ydb.yaml:/opt/ydb/cfg/config.yaml"
    ],
    restart: "on-failure",
    container_name: "ydb-static-init",
    command: [
      "/opt/ydb/bin/ydbd",
      "-s",
      "${YDB_ENDPOINT}",
      "admin",
      "blobstorage",
      "config",
      "init",
      "--yaml-file",
      "/opt/ydb/cfg/config.yaml"
    ],
    depends_on: {
      "static-0": {
        condition: "service_healthy"
      }
    }
  },
  "tenant-init": {
    image: "cr.yandex/crptqonuodf51kdj7a7d/ydb:25.2.1.10-rc",
    restart: "always",
    hostname: "${HOST}",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    volumes: [
      "./ydb.yaml:/opt/ydb/cfg/config.yaml"
    ],
    restart: "on-failure",
    container_name: "ydb-tenant-init",
    command: [
      "/opt/ydb/bin/ydbd",
      "-s",
      "${YDB_ENDPOINT}",
      "admin",
      "database",
      "${YDB_TENANT}",
      "create",
      "ssd:1"
    ],
    depends_on: {
      "static-init": {
        condition: "service_completed_successfully"
      }
    }
  },
  _database_template_: {
    image: "cr.yandex/crptqonuodf51kdj7a7d/ydb:25.2.1.10-rc",
    restart: "always",
    hostname: "${HOST}",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    volumes: [
      "./ydb.yaml:/opt/ydb/cfg/config.yaml"
    ],
    container_name: "ydb-database",
    command: [
      "/opt/ydb/bin/ydbd",
      "server",
      "--grpc-port",
      "${YDB_GRPC_PORT}",
      "--mon-port",
      "${YDB_MON_PORT}",
      "--ic-port",
      "${YDB_IC_PORT}",
      "--yaml-config",
      "/opt/ydb/cfg/config.yaml",
      "--tenant",
      "${YDB_TENANT}",
      "--node-broker",
      "${YDB_ENDPOINT}",
      "--label",
      "deployment=docker"
    ],
    ports: [
      "${YDB_GRPC_PORT}:${YDB_GRPC_PORT}",
      "${YDB_MON_PORT}:${YDB_MON_PORT}",
      "${YDB_IC_PORT}:${YDB_IC_PORT}"
    ],
    healthcheck: {
      test: 'bash -c "exec 6<> /dev/tcp/${HOST}/${YDB_GRPC_PORT}"',
      interval: "10s",
      timeout: "1s",
      retries: 3,
      start_period: "30s"
    },
    depends_on: {
      "static-0": {
        condition: "service_healthy"
      },
      "static-init": {
        condition: "service_completed_successfully"
      },
      "tenant-init": {
        condition: "service_completed_successfully"
      }
    }
  },
  otel: {
    image: "otel/opentelemetry-collector-contrib:0.139.0",
    restart: "unless-stopped",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    container_name: "otel-collector",
    command: [
      "--config=/etc/otel-collector.yml"
    ],
    volumes: [
      "./otel-collector.yml:/etc/otel-collector.yml"
    ],
    ports: [
      "4317:4317",
      "4318:4318",
      "9091:9091",
      "9090:9090"
    ]
  },
  chaos: {
    image: "docker",
    restart: "on-failure",
    container_name: "ydb-chaos",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    entrypoint: [
      "/bin/sh",
      "-c",
      "/opt/ydb/chaos.sh"
    ],
    volumes: [
      "./chaos.sh:/opt/ydb/chaos.sh",
      "/var/run/docker.sock:/var/run/docker.sock"
    ]
  }
}, compose_default = {
  "x-runtime": {
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host"
  },
  "x-ydb-node": {
    image: "cr.yandex/crptqonuodf51kdj7a7d/ydb:25.2.1.10-rc",
    restart: "always",
    hostname: "${HOST}",
    platform: "linux/amd64",
    privileged: !0,
    network_mode: "host",
    volumes: [
      "./ydb.yaml:/opt/ydb/cfg/config.yaml"
    ]
  },
  name,
  services
};
export {
  services,
  name,
  compose_default as default
};

//# debugId=0FA6B10DE63FEE7564756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFtdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICBdLAogICJtYXBwaW5ncyI6ICIiLAogICJkZWJ1Z0lkIjogIjBGQTZCMTBERTYzRkVFNzU2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
