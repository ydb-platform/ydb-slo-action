FROM --platform=linux/amd64 debian:bookworm-slim

ENV APP_NAME="ydb" \
    APP_VERSION="trunk" \
    PATH="/opt/ydb.tech/ydb/bin:/opt/ydb.tech/ydbd/bin:$PATH"

COPY rootfs /
COPY --from=ghcr.io/ydb-platform/local-ydb:trunk /ydb /opt/ydb.tech/ydb/bin/ydb
COPY --from=ghcr.io/ydb-platform/local-ydb:trunk /ydbd /opt/ydb.tech/ydbd/bin/ydbd

RUN groupadd -r ydb && useradd -r -g ydb -u 1001 -d /home/ydb -m ydb && \
    chmod +x /opt/ydb.tech/scripts/ydbd/entrypoint.sh && \
    mkdir -p /home/ydb && \
    chown -R 1001:1001 /home/ydb /opt/ydb.tech && \
    chmod 755 /home/ydb /opt/ydb.tech

USER 1001
ENTRYPOINT ["/opt/ydb.tech/scripts/ydbd/entrypoint.sh"]
CMD ["/opt/ydb.tech/ydbd/bin/ydbd"]

HEALTHCHECK --interval=10s --timeout=1s --start-period=30s --retries=1 \
  CMD bash -c 'port="${YDB_GRPC_PORT:-2136}"; exec 6<>/dev/tcp/localhost/${port}'
