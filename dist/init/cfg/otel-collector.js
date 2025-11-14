import"../../main-ynsbc1hx.js";

// init/cfg/otel-collector.yml
var receivers = {
  otlp: {
    protocols: {
      grpc: null,
      http: null
    }
  },
  prometheusremotewrite: {
    endpoint: "0.0.0.0:9091"
  }
}, exporters = {
  logging: {
    loglevel: "info"
  },
  prometheus: {
    endpoint: "0.0.0.0:9090"
  }
}, service = {
  pipelines: {
    metrics: {
      receivers: [
        "otlp",
        "prometheusremotewrite"
      ],
      exporters: [
        "logging",
        "prometheus"
      ]
    }
  }
}, otel_collector_default = {
  receivers,
  exporters,
  service
};
export {
  service,
  receivers,
  exporters,
  otel_collector_default as default
};

export { otel_collector_default };

//# debugId=53644DD7803B250664756E2164756E21
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFtdLAogICJzb3VyY2VzQ29udGVudCI6IFsKICBdLAogICJtYXBwaW5ncyI6ICIiLAogICJkZWJ1Z0lkIjogIjUzNjQ0REQ3ODAzQjI1MDY2NDc1NkUyMTY0NzU2RTIxIiwKICAibmFtZXMiOiBbXQp9
