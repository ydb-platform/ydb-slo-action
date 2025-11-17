FROM alpine:latest

RUN apk add --no-cache \
    netcat-openbsd \
    bash \
    curl \
    bind-tools

COPY check-nodes.sh /check-nodes.sh
RUN chmod +x /check-nodes.sh

ENTRYPOINT ["/check-nodes.sh"]
