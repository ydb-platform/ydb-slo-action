# Минимальный финальный образ
FROM --platform=linux/amd64 debian:bookworm-slim

# Копируем только бинарники из source образа
COPY --from=ghcr.io/ydb-platform/local-ydb:trunk /ydbd /ydbd
COPY --from=ghcr.io/ydb-platform/local-ydb:trunk /ydb /ydb

# Копирование entrypoint скрипта
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["/ydbd"]
