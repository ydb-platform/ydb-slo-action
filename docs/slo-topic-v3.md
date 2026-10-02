# C# Topic SLO V3

Базовый сценарий из [статьи Олега](https://wiki.yandex-team.ru/kikimr/developers/appteam/kb/xaos-testirovanie-sdk/): топик `/Root/testdb/slo-topic`, 10 партиций, отдельные Writer и Reader на каждую партицию, общий Consumer. Половина Reader использует batch API, половина — single. Writer отправляет `message-N`; Reader проверяет сообщения по очереди своей партиции и подтверждает обработку. При миграции метрик исходный процесс нагрузки и завершения не меняется.

Метрики — только `Ydb.Sdk.Topic`: `ydb.topic.writer.*` и `ydb.topic.reader.*`. В Actions V3 telemetry включена; графики показывают ACK/delivery rate, ACK duration, buffer usage/age, commit lag и session errors. Для этого сценария отдельный result JSON не требуется.

Хаос сохраняет шесть сценариев: graceful stop, restart, SIGKILL, pause/unpause, rolling restart и IP blackhole. Отсутствие обязательной SDK telemetry — INVALID. Топиковые транзакции не покрыты.
