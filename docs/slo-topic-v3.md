# C# Topic SLO V3

Базовый сценарий из [статьи Олега](https://wiki.yandex-team.ru/kikimr/developers/appteam/kb/xaos-testirovanie-sdk/): 10 партиций, отдельный Writer на партицию, общий Consumer; половина Reader использует batch API, половина — single. Payload содержит runId, партицию и числовую последовательность. Writer продвигает её только после ACK. Reader сверяет данные и порядок, дедуплицирует повторную доставку; после остановки записи выполняется bounded drain до подтверждённого commit всех ACKed сообщений.

Метрики — только `Ydb.Sdk.Topic`: `ydb.topic.writer.*` и `ydb.topic.reader.*`. В Actions V3 telemetry включена; графики показывают ACK/delivery rate, ACK duration, buffer usage/age, commit lag и session errors. Проверки P01/P02/P03 и исходы операций сохраняются отдельно в JSON, не в собственных инструментах.

Хаос сохраняет шесть сценариев: graceful stop, restart, SIGKILL, pause/unpause, rolling restart и IP blackhole. Общий `--completion-timeout` включает SDK cleanup; истечение срока пишет FAIL JSON и завершает процесс, даже если stream disposal завис. Actions `workload_completion_timeout` даёт ещё 30 секунд на результат и выход процесса. Отсутствие обязательной SDK telemetry — INVALID. Топиковые транзакции не покрыты.
