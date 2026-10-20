ARG YDB_IMAGE=ydbplatform/local-ydb@sha256:48b8f492662b3997c6efb743210c471d0217465965456fabb04b9e8cef9b1327
FROM ${YDB_IMAGE} AS ydb-dist

FROM --platform=linux/amd64 debian:bookworm-slim@sha256:7c7b2c966bc9ee8cedfeef67e0e279108992c77681fa595db4a9d65c06ccc587
ARG APP_VERSION=stable-25-3

ENV APP_NAME="ydb" \
	APP_VERSION="${APP_VERSION}" \
	PATH="/opt/ydb.tech/ydb/bin:/opt/ydb.tech/ydbd/bin:$PATH"

SHELL ["/bin/bash", "-o", "errexit", "-o", "nounset", "-o", "pipefail", "-c"]

# Install chaos testing tools
RUN apt-get update && \
	apt-get install -y --no-install-recommends \
	iproute2 \
	iptables \
	iputils-ping \
	netcat-openbsd && \
	apt-get clean && \
	rm -rf /var/lib/apt/lists/*

COPY rootfs /
COPY --from=ydb-dist /ydb /opt/ydb.tech/ydb/bin/ydb
COPY --from=ydb-dist /ydbd /opt/ydb.tech/ydbd/bin/ydbd

RUN groupadd -r ydb && useradd -r -g ydb -u 1001 -d /home/ydb -m ydb && \
	chmod +x /opt/ydb.tech/scripts/ydbd/entrypoint.sh && \
	chmod +x /opt/ydb.tech/scripts/ydbd/check-readiness.sh && \
	mkdir -p /home/ydb && \
	chown -R 1001:1001 /home/ydb /opt/ydb.tech && \
	chmod 755 /home/ydb /opt/ydb.tech

EXPOSE ${YDB_GRPC_PORT:-2136} ${YDB_MON_PORT:-8765} ${YDB_IC_PORT:-19001}

WORKDIR /home/ydb
USER 1001
ENTRYPOINT ["/opt/ydb.tech/scripts/ydbd/entrypoint.sh"]
CMD ["/opt/ydb.tech/ydbd/bin/ydbd"]

HEALTHCHECK --interval=10s --timeout=1s --start-period=30s --retries=1 \
	CMD bash -c 'port="${YDB_GRPC_PORT:-2136}"; exec 6<>/dev/tcp/localhost/${port}'
