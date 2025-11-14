import"../../main-ynsbc1hx.js";

// init/cfg/ydb-config.yml
var metadata = {
  kind: "MainConfig",
  cluster: "ydb-slo-testing",
  version: 0
}, config = {
  erasure: "none",
  actor_system_config: {
    use_auto_config: !0,
    cpu_count: 4
  },
  feature_flags: {
    enable_drain_on_shutdown: !1,
    enable_mvcc_snapshot_reads: !0,
    enable_persistent_query_stats: !0,
    enable_public_api_external_blobs: !1,
    enable_scheme_transactions_at_scheme_shard: !0
  },
  host_configs: [
    {
      host_config_id: 1,
      drive: [
        {
          path: "SectorMap:1:64",
          type: "SSD"
        },
        {
          path: "SectorMap:2:64",
          type: "SSD"
        },
        {
          path: "SectorMap:3:64",
          type: "SSD"
        }
      ]
    }
  ],
  hosts: [
    {
      host: "localhost",
      port: 19001,
      host_config_id: 1,
      location: {
        data_center: "az-1"
      }
    }
  ]
}, ydb_config_default = {
  metadata,
  config
};
export {
  metadata,
  ydb_config_default as default,
  config
};

export { ydb_config_default };

//# debugId=4BC640BE4C62C61664756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFtdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICBdLAogICJtYXBwaW5ncyI6ICIiLAogICJkZWJ1Z0lkIjogIjRCQzY0MEJFNEM2MkM2MTY2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
