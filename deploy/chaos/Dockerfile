FROM docker:cli

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
