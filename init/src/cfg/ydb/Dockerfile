# Извлекаем бинарники из готового образа
FROM ghcr.io/ydb-platform/local-ydb:trunk AS source

# Минимальный финальный образ
FROM --platform=linux/amd64 debian:bookworm-slim

# Копируем только бинарники из source образа
COPY --from=source /ydbd /ydbd
COPY --from=source /ydb /ydb

# Копирование entrypoint скрипта
COPY ./entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]

CMD ["/ydbd"]
