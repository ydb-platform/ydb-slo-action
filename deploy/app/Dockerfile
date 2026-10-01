FROM debian:bookworm-slim

SHELL ["/bin/bash", "-c"]

RUN apt-get update && apt-get install -y \
	bc \
	bash \
	curl \
	python3 \
	python3-pip \
	&& rm -rf /var/lib/apt/lists/*

# Install YDB CLI
RUN curl -sSL https://install.ydb.tech/cli | bash
ENV PATH="/root/ydb/bin:${PATH}"

RUN pip3 install --no-cache-dir --break-system-packages \
	opentelemetry-api \
	opentelemetry-sdk \
	opentelemetry-exporter-otlp-proto-http

COPY otel_metric.py /usr/local/bin/otel_metric.py
RUN chmod +x /usr/local/bin/otel_metric.py

COPY ydb-kv-workload /usr/local/bin/ydb-kv-workload
RUN chmod +x /usr/local/bin/ydb-kv-workload

ENTRYPOINT ["ydb-kv-workload"]
