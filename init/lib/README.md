# Init Libraries

Библиотеки для инициализации и управления YDB SLO тестами.

## Структура модулей

### 📊 `prometheus.ts`

Модуль для работы с Prometheus API.

**Функции:**

- `queryInstant()` - выполнение мгновенных PromQL запросов
- `queryRange()` - выполнение PromQL запросов с диапазоном времени
- `parseMetricsYaml()` - парсинг YAML с определениями метрик через `yq`
- `collectMetrics()` - сбор метрик из Prometheus

**Типы:**

- `MetricDefinition` - определение метрики для сбора
- `PrometheusResponse` - ответ от Prometheus API
- `PrometheusRangeValue`, `PrometheusInstantValue` - значения метрик

### 🐳 `docker.ts`

Модуль для работы с Docker контейнерами и событиями.

**Функции:**

- `getContainerIp()` - получение IP адреса контейнера
- `collectComposeLogs()` - сбор логов Docker Compose
- `collectDockerEvents()` - сбор Docker событий для проекта
- `stopCompose()` - остановка Docker Compose проекта

### 📦 `artifacts.ts`

Модуль для работы с GitHub Artifacts.

**Функции:**

- `uploadArtifacts()` - загрузка артефактов в GitHub Actions

**Типы:**

- `ArtifactFile` - структура артефакта для загрузки

### 🐙 `github.ts`

Модуль для работы с GitHub API.

**Функции:**

- `getPullRequestNumber()` - получение номера Pull Request
    - Из явного input параметра
    - Из контекста GitHub Actions
    - Через поиск по коммиту через API

## Использование

```typescript
// Импорт модулей
import { collectMetrics, parseMetricsYaml } from './lib/prometheus.js'
import { getContainerIp, collectDockerEvents } from './lib/docker.js'
import { uploadArtifacts } from './lib/artifacts.js'
import { getPullRequestNumber } from './lib/github.js'

// Пример: получение IP Prometheus
let prometheusIp = await getContainerIp('prometheus', cwd)
let prometheusUrl = `http://${prometheusIp}:9090`

// Пример: сбор метрик
let metrics = await collectMetrics({
	url: prometheusUrl,
	start: startTime,
	end: endTime,
	metrics: metricDefinitions,
	timeout: 30000,
})

// Пример: загрузка артефактов
await uploadArtifacts(
	[
		{ name: 'logs.txt', path: '/path/to/logs.txt' },
		{ name: 'metrics.jsonl', path: '/path/to/metrics.jsonl' },
	],
	cwd
)
```

## Зависимости

- `@actions/core` - GitHub Actions core utilities
- `@actions/exec` - выполнение команд
- `@actions/artifact` - работа с артефактами
- `@actions/github` - GitHub API
- `yq` - парсинг YAML (внешняя утилита)
