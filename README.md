# YDB SLO Action

> Automated Service Level Objective (SLO) testing for YDB database SDKs with chaos engineering and performance monitoring built-in.

## What is this?

**YDB SLO Action** helps you test your YDB SDK's reliability under real-world conditions. Instead of just running tests against a perfect database, this action:

- 🚀 **Deploys a full YDB cluster** (1 storage + 5 database nodes)
- 💥 **Introduces chaos** (random node failures, network issues, etc.)
- 📊 **Collects metrics** via Prometheus during your tests
- 📈 **Generates reports** comparing performance with your base branch
- 💬 **Posts results** directly to your PR for easy review

Think of it as a way to answer: _"Will my SDK handle production issues gracefully?"_

## Quick Example

Add this to your GitHub Actions workflow:

```yaml
name: SLO Test

on: pull_request

# Required permissions for the report action
permissions:
    contents: read # Access repository
    pull-requests: write # Create/update PR comments
    checks: write # Create GitHub Checks (optional)

jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            # Deploy YDB cluster with chaos testing
            - uses: ydb-platform/ydb-slo-action/init@v1
              with:
                  workload_name: my-sdk-test
                  workload_current_ref: ${{ github.head_ref }}
                  workload_baseline_ref: main
                  github_token: ${{ secrets.GITHUB_TOKEN }}

            # Run your SDK tests
            - name: Run workload
              run: ./scripts/slo-test.sh

    report:
        needs: test
        runs-on: ubuntu-latest
        steps:
            # Generate and post performance report
            - uses: ydb-platform/ydb-slo-action/report@v1
              with:
                  github_token: ${{ secrets.GITHUB_TOKEN }}
                  github_run_id: ${{ github.run_id }}
```

That's it! The action handles infrastructure, chaos injection, metrics collection, and reporting automatically.

### Action Outputs

The `init` action provides several outputs that you can use in subsequent steps:

```yaml
- uses: ydb-platform/ydb-slo-action/init@v1
  id: ydb-init
  with:
      workload_name: my-sdk-test
      github_token: ${{ secrets.GITHUB_TOKEN }}

# Use outputs in later steps
- name: Run tests with YDB endpoints
  run: |
      echo "Storage nodes: ${{ steps.ydb-init.outputs.ydb-storage-ips }}"
      echo "Database nodes: ${{ steps.ydb-init.outputs.ydb-database-ips }}"
      echo "Prometheus URL: ${{ steps.ydb-init.outputs.ydb-prometheus-url }}"
      echo "Prometheus OTLP: ${{ steps.ydb-init.outputs.ydb-prometheus-otlp }}"
```

**Available outputs:**

- `ydb-storage-ips` — Comma-separated list of YDB storage node IP addresses
- `ydb-database-ips` — Comma-separated list of YDB database node IP addresses
- `ydb-prometheus-url` — Prometheus HTTP endpoint (only if telemetry profile is enabled)
- `ydb-prometheus-otlp` — Prometheus OTLP receiver endpoint (only if telemetry profile is enabled)

These outputs are useful when you need to:

- Connect your tests directly to specific YDB nodes
- Send custom metrics to Prometheus
- Configure your SDK with explicit endpoints

## How It Works

### Two Actions Working Together

**1. `init` action** (runs before your tests):

- Deploys YDB cluster using Docker Compose
- Starts Prometheus for metrics collection
- Launches chaos monkey that randomly introduces failures
- Saves state for later cleanup

**2. `report` action** (runs after your tests):

- Collects metrics from Prometheus
- Fetches metrics from your base branch for comparison
- Renders a beautiful report with ASCII charts
- Updates PR comment with results (one comment per workload)

### What Happens During Your Test

While your SDK tests run, the chaos monkey randomly:

- Stops nodes gracefully or with SIGKILL
- Pauses containers (simulating freezes)
- Introduces network black holes
- Performs rolling restarts

Your tests should handle these scenarios gracefully. The metrics show how well your SDK copes with failures.

## For Users: Customization

### Custom Metrics

Want to track your own Prometheus queries? Provide custom metrics:

```yaml
- uses: ydb-platform/ydb-slo-action/init@v1
  with:
      workload_name: my-test
      github_token: ${{ secrets.GITHUB_TOKEN }}
      metrics_yaml: |
          - name: my_custom_metric
            query: rate(http_requests_total[5m])
            step: 15s
```

### Custom Chaos Scenarios

Fork this repo and add your own chaos scripts to `deploy/chaos/scenarios/`. See existing scenarios for examples.

## Developing Your Workload

Your workload runs as a Docker container and receives these environment variables:

**YDB Connection:**

- `YDB_CONNECTION_STRING=grpc://ydb:2136/Root/testdb` (recommended)
- `YDB_ENDPOINT=grpc://ydb:2136` + `YDB_DATABASE=/Root/testdb` (legacy)

**Workload Control:**

- `WORKLOAD_DURATION` — duration in seconds (0 = unlimited)

**Prometheus Endpoints:**

- `PROMETHEUS_URL` — base URL
- `PROMETHEUS_QUERY_URL` — for querying metrics
- `PROMETHEUS_REMOTE_WRITE_URL` — for pushing metrics
- `OTEL_EXPORTER_OTLP_ENDPOINT` — for OpenTelemetry OTLP

### Required Metrics

Your workload should expose these metrics for SLO reporting:

```promql
# Operation counters
sdk_operations_total{operation_type="read|write", ref="current|baseline"}
sdk_operations_success_total{operation_type="read|write", ref="current|baseline"}

# Latency histogram
sdk_operation_latency_seconds{operation_type="read|write", ref="current|baseline"}

# Retry attempts
sdk_retry_attempts_total{operation_type="read|write", ref="current|baseline"}
```

The `ref` label distinguishes between current and baseline runs.

### Best Practices

1. **Accept CLI arguments** — make your workload configurable via `WORKLOAD_CURRENT_COMMAND`
2. **Use `YDB_CONNECTION_STRING`** — modern connection format
3. **Push metrics regularly** — every 5-15 seconds
4. **Respect `WORKLOAD_DURATION`** — exit gracefully when duration expires
5. **Use OpenTelemetry** — `OTEL_EXPORTER_OTLP_ENDPOINT` is pre-configured
6. **Handle failures gracefully** — temporary YDB failures are expected during chaos testing

See `deploy/README.md` for full infrastructure documentation and `deploy/app/README.md` for the `netcheck` example workload.

## For Contributors: Getting Started

Welcome! Here's how to start contributing to this project.

### Prerequisites

- **Bun** (package manager): [Install Bun](https://bun.sh)
- **Docker** (for local testing)
- Basic understanding of TypeScript and GitHub Actions

### Setup

```bash
# Clone and install dependencies
git clone https://github.com/ydb-platform/ydb-slo-action.git
cd ydb-slo-action
bun install
```

### Development Workflow

1. **Make your changes** in `init/` or `report/` directories
2. **Build the action** to verify everything works:
    ```bash
    bun run bundle
    ```
3. **Commit your changes** — husky will automatically:
    - Run linting and formatting
    - Rebuild `dist/` directory
    - Stage the rebuilt files

**Important:** Never edit files in `dist/` manually! They're auto-generated.

### Testing Locally

You can test the infrastructure locally:

```bash
cd deploy
docker compose up -d
```

This starts:

- YDB cluster (1 storage + 5 database nodes)
- Prometheus on port 9090
- Chaos monkey injecting faults

Stop everything with:

```bash
docker compose down
```

#### Using Custom Workloads

The `deploy/compose.yml` supports workload containers with configurable environment variables:

```bash
# Run with default settings
docker compose --profile workload-current up

# Override workload duration (in seconds, 0 = unlimited)
WORKLOAD_DURATION=300 docker compose --profile workload-current up

# Use custom workload image
WORKLOAD_CURRENT_IMAGE=my-custom-workload docker compose --profile workload-current up

# Override workload command/arguments
WORKLOAD_CURRENT_COMMAND="--threads 10 --duration 300" docker compose --profile workload-current up

# Combine multiple options
WORKLOAD_CURRENT_IMAGE=my-workload \
WORKLOAD_CURRENT_COMMAND="--verbose --mode stress" \
WORKLOAD_DURATION=300 \
docker compose --profile workload-current up

# Run both current and baseline workloads simultaneously
WORKLOAD_CURRENT_IMAGE=my-workload:pr-123 \
WORKLOAD_BASELINE_IMAGE=my-workload:main \
WORKLOAD_CURRENT_COMMAND="--threads 20" \
WORKLOAD_BASELINE_COMMAND="--threads 10" \
docker compose --profile telemetry --profile workloads up
```

Or create a `.env` file in the `deploy/` directory:

```bash
# Copy example
cp env.example .env

# Edit with your values
vim .env
```

**Available environment variables:**

| Variable                    | Default                 | Description                                                  |
| --------------------------- | ----------------------- | ------------------------------------------------------------ |
| `WORKLOAD_DURATION`         | `0`                     | Workload duration in seconds (0 = unlimited)                 |
| `WORKLOAD_CURRENT_IMAGE`    | `ydb-workload-current`  | Docker image for current workload                            |
| `WORKLOAD_BASELINE_IMAGE`   | `ydb-workload-baseline` | Docker image for baseline workload                           |
| `WORKLOAD_CURRENT_COMMAND`  | _(empty)_               | Override command for current workload (e.g., `--threads 10`) |
| `WORKLOAD_BASELINE_COMMAND` | _(empty)_               | Override command for baseline workload                       |

**Note:** The following are pre-configured in `compose.yml` and should not be overridden:

- YDB connection:
    - `YDB_CONNECTION_STRING=grpc://ydb:2136/Root/testdb` — recommended connection string format
    - `YDB_ENDPOINT=grpc://ydb:2136` and `YDB_DATABASE=/Root/testdb` — legacy format (still supported)
- Prometheus endpoints:
    - `PROMETHEUS_URL=http://ydb-prometheus:9090` — base URL
    - `PROMETHEUS_QUERY_URL=http://ydb-prometheus:9090/api/v1/query` — for PromQL queries
    - `PROMETHEUS_REMOTE_WRITE_URL=http://ydb-prometheus:9090/api/v1/write` — for pushing metrics
    - `OTEL_EXPORTER_OTLP_ENDPOINT=http://ydb-prometheus:9090/api/v1/otlp` — for OpenTelemetry OTLP metrics

See `deploy/env.example` for complete configuration options.

### Code Style

We use automated formatting, so you don't need to worry about style. Just follow these conventions:

- **Import with `.js` extensions**: `import { x } from './module.js'` (ESM requirement)
- **Use `node:` prefix**: `import * as fs from 'node:fs'`
- **Prefer `let` over `const`** (project convention)

Run linting and formatting manually:

```bash
bun run lint    # Fix linting issues
bun run format  # Format code
```

### Commit Message Format

We use emoji-based commit messages for easy scanning:

```
✨ Add custom metrics support

Users can now provide custom Prometheus queries via the metrics_yaml
input parameter. This allows tracking SDK-specific metrics without
forking the action.
```

**Emoji guide:**

- ✨ New feature
- 🐛 Bug fix
- 📝 Documentation
- ♻️ Refactoring
- 🔧 Configuration/build changes
- 🐳 Docker-related changes
- 🧪 Tests
- 🚀 CI/CD changes

**Rules:**

- Use imperative mood ("Add" not "Added")
- Capitalize after emoji
- No period at end of subject line
- Explain WHAT and WHY in the body (not HOW)

## Architecture Overview

Understanding the project structure will help you contribute effectively.

### Design Principles

#### 1. Separation of Concerns

Actions are split into **lifecycle files** (main.ts, post.ts) that orchestrate, and **utility modules** (lib/) that do the heavy lifting. This prevents monolithic files and makes testing easier.

#### 2. Infrastructure as Code

Everything is defined declaratively:

- Docker Compose for services
- YAML for metrics
- Shell scripts for chaos scenarios

This means users can extend functionality without understanding TypeScript.

#### 3. Artifact-Based Communication

The `init` action saves metrics as GitHub Artifacts, and the `report` action downloads them later. This decouples the actions and allows flexible workflow design.

#### 4. Configuration Over Code

Users customize behavior through inputs and config files, not code changes. This lowers the barrier to adoption.

### Project Structure

```
init/
  ├── main.ts              # Entry point (deploys infrastructure)
  ├── post.ts              # Cleanup (collects metrics, uploads artifacts)
  └── lib/                 # Utility modules (docker, prometheus, github, etc.)

report/
  ├── main.ts              # Entry point (generates and posts report)
  └── lib/                 # Utility modules (workflow, metrics, charts, etc.)

deploy/
  ├── compose.yml          # Docker Compose definition
  ├── metrics.yaml         # Default Prometheus queries
  ├── ydb/
  │   ├── Dockerfile       # YDB node image
  │   └── rootfs/          # Files copied to container root (/)
  └── chaos/
      ├── Dockerfile       # Chaos monkey image
      └── rootfs/          # Files copied to container root (/)

dist/                      # Auto-generated (don't edit!)
```

#### Docker Image Structure

We use the **rootfs pattern** for organizing Docker images (inspired by [Bitnami containers](https://github.com/bitnami/containers)):

1. Each service directory (e.g., `ydb/`, `chaos/`) contains:
    - `Dockerfile` — image definition
    - `rootfs/` — directory structure as it will appear in the container

2. In the Dockerfile, `COPY rootfs /` copies the entire `rootfs/` content to the container's root filesystem

3. Example: `deploy/chaos/rootfs/opt/ydb.tech/scripts/chaos/libchaos.sh` becomes `/opt/ydb.tech/scripts/chaos/libchaos.sh` in the container

**Why this pattern?** It makes the file structure explicit and easy to navigate. You can see exactly what files will be in the container by looking at the `rootfs/` directory. This approach is widely used by Bitnami and improves maintainability.

### How Actions Communicate

```
┌──────────────┐
│ init action  │
│  (main.ts)   │  ← Deploys YDB cluster, starts chaos, saves state
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ User tests   │  ← Your SDK tests run here
└──────┬───────┘
       │
       ↓
┌──────────────┐
│ init action  │
│  (post.ts)   │  ← Collects metrics, uploads as artifacts
└──────┬───────┘
       │
       ↓
┌──────────────┐
│report action │  ← Downloads artifacts, generates report, posts to PR
└──────────────┘
```

### Key Architectural Patterns

#### GitHub Actions Lifecycle

The `init` action uses GitHub Actions' pre/post pattern:

1. `main.ts` runs **before** user workload
2. User's test scripts run
3. `post.ts` runs **after** (even if tests fail)

This ensures cleanup and metrics collection always happen.

#### State Management

Data flows from `main.ts` to `post.ts` using GitHub Actions' `saveState()` and `getState()` APIs. We save:

- Working directory path
- Workload name
- PR number
- Start timestamp

#### Metrics Collection

1. Define metrics as YAML (name, PromQL query, step)
2. Parse YAML at runtime
3. Query Prometheus API
4. Serialize as JSONL (one JSON object per line)

**Why JSONL?** Easier to append, process line-by-line, and less memory-intensive than JSON arrays.

#### Report Generation

1. Download current run's metrics from artifacts
2. Fetch latest successful base branch run
3. Download base branch metrics
4. Merge both datasets (current first, base second)
5. Render comparison with ASCII charts

**Why not use a database?** Keeps the action stateless and doesn't require external services.

## Chaos Testing

### Writing Chaos Scenarios

Chaos scenarios are simple shell scripts. Here's a template:

```bash
#!/bin/sh
set -e  # Fail fast

# Load helper functions
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Your description"

# Select a random target
nodeForChaos=$(get_random_database_node)
echo "Selected node: ${nodeForChaos}"

# Your chaos logic (e.g., docker stop, pause, network manipulation)
docker stop "${nodeForChaos}" -t 30
sleep 5
docker start "${nodeForChaos}"

echo "Scenario completed"
```

**Naming convention:** `NN-descriptive-name.sh` (e.g., `01-graceful-stop.sh`)

**Helper functions available:**

- `get_random_database_node` — random database node
- `get_random_storage_node` — random storage node
- `get_random_node` — any random YDB node
- `log "message"` — timestamped logging

**Golden rules:**

1. **Always restore to healthy state** — don't leave the system broken
2. **Use randomization** — avoid predictable patterns
3. **Add logging** — use `echo` statements for observability

### Example Scenarios

Check out existing scenarios in `deploy/chaos/scenarios/`:

- `01-graceful-stop.sh` — stops a node gracefully, then restarts
- `03-sigkill.sh` — sends SIGKILL to a node
- `06-ip-blackhole.sh` — simulates DNS cache poisoning

## Important Gotchas

### The `dist/` Directory

**Never edit `dist/` manually!** It's auto-generated by the bundler. When you commit source changes, husky automatically rebuilds `dist/` and stages it for you.

**Why?** GitHub Actions can only run JavaScript, not TypeScript. We bundle TypeScript into optimized JavaScript in `dist/`.

### Import Extensions

TypeScript ESM requires `.js` extensions in import paths, even though files are `.ts`:

```typescript
// ✅ Correct
import { func } from './module.js'

// ❌ Wrong (will fail at runtime)
import { func } from './module'
```

This trips up many developers! It's a TypeScript ESM requirement, not our choice.

### Docker Compose Working Directory

Always run Docker Compose commands with `cwd` set to the directory containing `compose.yml`. Docker resolves relative paths based on working directory.

### Artifact Naming

Use the pattern `{workload}-{type}.{extension}`:

- `my-workload-metrics.jsonl`
- `my-workload-logs.txt`
- `my-workload-pull.txt`

This prevents conflicts when multiple workloads run in the same workflow.

## Security Considerations

### GitHub Token

The action requires these permissions:

- `contents: read` — Read PR information and repository contents
- `pull-requests: write` — Post and update PR comments
- `checks: write` — Create GitHub Checks for SLO violations (optional, but recommended)

Always use `secrets.GITHUB_TOKEN` provided by GitHub Actions. Add the `permissions` block to your workflow (see Quick Example above).

**Without proper permissions**, you'll see warnings like:

```
Failed to create GitHub Checks: insufficient permissions. Add 'checks: write' to workflow permissions.
```

The action will still work and post PR comments, but GitHub Checks won't be created.

### Chaos Container

The chaos monkey has **privileged access** to the Docker socket. This means chaos scripts can manipulate any container. Review scripts carefully before adding them.

### Artifacts

Artifacts may contain sensitive logs and metrics. Ensure your repository access controls match your data sensitivity.

## Debugging

### Enable Verbose Logging

Set this in your workflow to see debug logs:

```yaml
env:
    ACTIONS_STEP_DEBUG: true
```

### Inspect Docker Logs

The action copies `deploy/` to `.slo/` in the working directory:

```bash
cd .slo
docker compose logs
```

### Query Prometheus

Get Prometheus container IP and query directly:

```bash
docker inspect prometheus | grep IPAddress
curl http://<ip>:9090/api/v1/query?query=up
```

### Download Artifacts

Download artifacts from the GitHub Actions UI to inspect raw data:

- **Metrics**: JSONL format (one JSON object per line)
- **Logs**: Plain text
- **Events**: JSONL format

## Contributing

We welcome contributions! Before submitting a PR, please:

1. Read this README thoroughly
2. Check out `CONTRIBUTING.txt` for the Yandex CLA details
3. Make sure your changes follow our code style
4. Test locally with `docker compose up`
5. Ensure `bun run bundle` completes without errors

External contributors must agree to the **Yandex CLA** before we can merge PRs.

## Useful Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [YDB Documentation](https://ydb.tech/docs/)
- [Prometheus Query API](https://prometheus.io/docs/prometheus/latest/querying/api/)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## License

This project is licensed under the Apache License 2.0. See [LICENSE](LICENSE) for details.

---

**Questions?** Open an issue or reach out to the maintainers. We're happy to help!
