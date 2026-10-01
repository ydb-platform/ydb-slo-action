FROM node:24-bookworm-slim
COPY --from=docker:27-cli /usr/local/bin/docker /usr/local/bin/docker
COPY --from=docker:27-cli /usr/local/libexec/docker/cli-plugins/docker-compose /usr/local/libexec/docker/cli-plugins/docker-compose
COPY --from=mikefarah/yq:4.54.1 /usr/bin/yq /usr/local/bin/yq
COPY --from=oven/bun:1.3.3 /usr/local/bin/bun /usr/local/bin/bun
WORKDIR /workspace
RUN apt-get update && apt-get install -y --no-install-recommends python3 && rm -rf /var/lib/apt/lists/*
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
COPY init/ init/
COPY shared/ shared/
COPY report/ report/
COPY tests/ tests/
COPY .agents/skills/ydb-slo-workload/ .agents/skills/ydb-slo-workload/
COPY deploy/ deploy/
COPY deploy/chaos/rootfs/ /
COPY .slo-gate.mjs ./
