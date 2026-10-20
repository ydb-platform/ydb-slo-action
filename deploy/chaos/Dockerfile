FROM docker@sha256:6fae2214c3121a28d5aa639d09032f61310b7c9c75ffbad1025f261a1b621800

# Install Python and pip
RUN apk add --no-cache \
	bash \
	python3 \
	py3-pip

# Install official OpenTelemetry libraries
RUN pip3 install --no-cache-dir --break-system-packages \
	opentelemetry-api \
	opentelemetry-sdk \
	opentelemetry-exporter-otlp

COPY rootfs /

ENTRYPOINT ["/opt/ydb.tech/scripts/chaos/entrypoint.sh"]
CMD ["sh"]
