FROM --platform=linux/amd64 debian:bookworm-slim

ENV APP_NAME="ydb" \
    APP_VERSION="trunk" \
    PATH="/opt/ydb/bin:$PATH"

COPY rootfs /
COPY --from=ghcr.io/ydb-platform/local-ydb:trunk /ydbd /opt/ydb/bin/ydbd
COPY --from=ghcr.io/ydb-platform/local-ydb:trunk /ydb /opt/ydb/bin/ydb

RUN groupadd -r ydb && useradd -r -g ydb -u 1001 -d /home/ydb -m ydb && \
    chmod +x /opt/ydb/scripts/entrypoint.sh && \
    mkdir -p /home/ydb && \
    mkdir -p /opt/ydb/cfg && \
    chown -R 1001:1001 /home/ydb /opt/ydb && \
    chmod 755 /home/ydb /opt/ydb

USER 1001
ENTRYPOINT ["/opt/ydb/scripts/entrypoint.sh"]
CMD ["/opt/ydb/bin/ydbd"]

HEALTHCHECK --interval=10s --timeout=1s --start-period=30s --retries=1 \
  CMD bash -c 'port="${YDB_GRPC_PORT:-2136}"; exec 6<>/dev/tcp/localhost/${port}'
