# syntax=docker/dockerfile:1

ARG YDB_IMAGE=cr.yandex/crpb3d0up7s6a7iuofo9/ydb-appteam-ci/local-ydb:stable-25-3
FROM ${YDB_IMAGE} AS ydb-dist

FROM --platform=linux/amd64 cr.yandex/crpb3d0up7s6a7iuofo9/ydb-appteam-ci/debian:bookworm-slim

ENV APP_NAME="ydb" \
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

ARG YDB_IMAGE
ENV APP_VERSION="${YDB_IMAGE}"

COPY rootfs /

RUN --mount=type=bind,from=ydb-dist,source=/,target=/mnt/ydb-dist \
	if [[ -x /mnt/ydb-dist/ydb && -x /mnt/ydb-dist/ydbd ]]; then \
		ydb_bin_dir=/mnt/ydb-dist; \
	elif [[ -x /mnt/ydb-dist/opt/ydb/bin/ydb && -x /mnt/ydb-dist/opt/ydb/bin/ydbd ]]; then \
		ydb_bin_dir=/mnt/ydb-dist/opt/ydb/bin; \
	else \
		echo "YDB binaries not found in ${YDB_IMAGE}" >&2; \
		exit 1; \
	fi && \
	install -D -m 0755 "${ydb_bin_dir}/ydb" /opt/ydb.tech/ydb/bin/ydb && \
	install -D -m 0755 "${ydb_bin_dir}/ydbd" /opt/ydb.tech/ydbd/bin/ydbd

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
