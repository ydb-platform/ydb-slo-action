# AGENTS.md

AI coding agent guide for YDB SLO Action project.

## Project Overview

GitHub Actions toolkit for automated SLO testing of YDB database SDKs.

**Two actions:**

- `init` — deploys YDB cluster with chaos testing and Prometheus monitoring
- `report` — generates performance reports, posts them as PR comments with base branch comparison

**Stack:** TypeScript (ESM, Node.js 24), Bun (bundler), Docker Compose, GitHub Actions API, Prometheus

## Core Design Principles

### 1. Separation of Lifecycle and Logic

- Actions split into **lifecycle files** (`main.ts`, `post.ts`) and **utility modules** (`lib/`)
- Lifecycle files = thin orchestrators
- Business logic = focused modules (one per domain: Docker, GitHub API, Prometheus, etc.)
- Prevents monolithic files

### 2. Infrastructure as Code

- Docker Compose defines all infrastructure
- `bridge_mode` selects the two-pile 2DC Compose topology; the default topology remains single-pile
- Metrics = YAML files (not hardcoded)
- Chaos scenarios = shell scripts
- `deploy/` directory copied to `.slo/` at runtime
- Users customize without code changes

### 3. Artifact-Based Communication

- `init` uploads metrics/logs/PR data as artifacts
- `report` downloads artifacts from current + base branch
- Allows separate jobs, re-running reports without re-testing

### 4. Configuration Over Code

- Prometheus queries in YAML
- Docker Compose configurable via env vars
- Chaos scenarios = scripts (no rebuild needed)
- Action inputs for customization

### 5. User-Centric Design

- Action manages infrastructure only
- Users bring their own test scripts
- Sane defaults, full customization available
- Reports auto-posted to PR comments

## Code Organization

### Action Structure

```
action-name/
  ├── action.yml     # Interface definition
  ├── main.ts        # Entry point (orchestrator)
  ├── post.ts        # Cleanup/post-processing
  └── lib/           # Utility modules (single responsibility)
```

**Rules:**

- Entry points = orchestrators (high-level steps only)
- Modules = specialists (one domain each)
- Files > 150-200 lines → consider splitting
- Single responsibility principle

### Build System

- Source: `init/` and `report/`
- Output: `dist/` (auto-generated, **NEVER edit manually**)
- Husky pre-commit hook auto-rebuilds and stages `dist/`
- Run `bun run bundle` to rebuild manually

### Infrastructure

- `deploy/` = all infrastructure definitions (Docker Compose, configs, chaos scenarios, metrics)
- Copied to `.slo/` at runtime
- Local testing = CI testing

### Docker Image Structure

**Rootfs pattern**:

- Each image dir (e.g., `ydb/`, `chaos/`) has `Dockerfile` + `rootfs/` dir
- `COPY rootfs /` in Dockerfile copies entire `rootfs/` to container root
- Example: `deploy/chaos/rootfs/opt/ydb.tech/scripts/` → `/opt/ydb.tech/scripts/` in container
- Makes container filesystem structure explicit and easy to navigate

## Development Workflow

```bash
# Setup
bun install

# Development
bun run bundle  # Build and verify

# Commit (husky auto-handles dist/ rebuild and staging)
git commit -m "emoji subject"
```

**Testing:** E2E in real GitHub Actions workflows (no unit tests). Stub SLO test in repo verifies action works.

## Code Style

**TypeScript conventions:**

- ESM with `.js` extensions in imports: `import { x } from './module.js'`
- `node:` protocol for built-ins: `import * as fs from 'node:fs'`
- Prefer `let` over `const`
- No semicolons, single quotes, tabs (Prettier config)

**Formatting:** Auto via Prettier + oxlint (runs on pre-commit)

## Architectural Patterns

### GitHub Actions Lifecycle (Init Action)

1. `main.ts` runs first → deploys infrastructure, runs workload containers, waits for them
2. `post.ts` runs at job end (always) → best-effort collects artifacts, tears down, uploads

State passed via `saveState()`/`getState()`: cwd, workload name, PR number, commit, start/finish timestamps, failure reason (`failed`).

**Lifecycle resilience contract:**

- `main` owns the definitive pass/fail decision. Cluster deploy failure fails the run unconditionally; a workload failure fails the run only when `fail_on_workload_error: true`.
- `post` is best-effort diagnostics + cleanup and never decides pass/fail. It discovers what exists (e.g. probes for the Prometheus container) instead of assuming, degrades each collector to an empty artifact when its source is absent, guarantees teardown via `finally`, and never crashes. Whether a report runs on a failed init is workflow orchestration (`needs:`/`if:`, or `workflow_run.conclusion`), not an action input.

### Metrics Collection

1. Define metrics in YAML: `name`, PromQL `query`, optional `type`, optional `step`
2. (Optional) Control numeric precision in reports with `round` (number step), e.g. `round: 0.01` to round to 2 decimal places.
    - Rounding is applied consistently to instant values and aggregated range values during analysis/report rendering.
    - This avoids floating-point noise in charts/tables without adding name-based heuristics in code.
3. Parse YAML at runtime
4. Query Prometheus API
5. Serialize as JSONL (not JSON array)

### Report Generation

1. Download current run metrics from artifacts
2. Fetch latest successful base branch workflow run
3. Download base branch metrics
4. Merge (current first, base second)
5. Render with ASCII charts

## Chaos Testing

**Principle:** Simple shell scripts, easy to write/understand.

**Pattern:**

```bash
#!/bin/sh
set -e
. /opt/ydb.tech/scripts/chaos/libchaos.sh

echo "Scenario: Description"
nodeForChaos=$(get_random_database_node)
# chaos logic (docker stop/pause/network manipulation)
# restore to healthy state
echo "Scenario completed"
```

**Naming:** `NN-descriptive-name.sh` (e.g., `01-graceful-stop.sh`)

**Helper functions:** `get_random_database_node`, `get_random_storage_node`, `get_random_node`, `log "msg"`

**Rules:**

- Always restore system to healthy state
- Bridge scenarios run from a separate directory and must restore both `PRIMARY/SYNCHRONIZED` health and the original `PRIMARY`
- Leave a stabilization delay between bridge configuration transitions; reported pile roles can change before the configuration quorum is ready
- Use randomization (random node selection)
- Add `echo` for observability

## Commit Format

```
emoji subject (max 80 chars)

Body: WHAT and WHY (not HOW). Wrap at 80 chars.
```

**Emojis:** ✨ feature | 🐛 fix | 📝 docs | ♻️ refactor | 🔧 config/build | 🐳 docker | 🧪 tests | 🚀 CI/CD

**Style:** Imperative mood, capital after emoji, no period at end of subject

## User Interaction

**Minimal inputs:**

- `github_token` (API access)
- `workload_name` (test identifier)

**Extension points:**

- Custom metrics: `metrics_yaml` or `metrics_yaml_path` input
- Custom chaos: add scenarios to fork
- Custom analysis: download artifacts

**Report:** Finds existing comment and updates (one per workload)

## Critical Constraints

1. **Never edit `dist/` manually** — auto-generated, changes will be lost
2. **Import paths must include `.js`** — `import { x } from './module.js'` (ESM requirement)
3. **Docker Compose `cwd` matters** — always set to directory with `compose.yml`
4. **Artifact naming:** `{workload}-{type}.{extension}` (e.g., `my-workload-metrics.jsonl`)
5. **Husky handles dist/ rebuild** — don't commit `dist/` manually

## Security

- `github_token`: minimum permissions (resolve PR, artifacts, comments)
- Chaos container: privileged Docker socket access (review scripts carefully)
- Artifacts may contain sensitive data (logs, metrics)

---

**Update this file when:** core architectural decisions, design patterns, workflow, or coding standards change. Focus on PRINCIPLES, not file listings.
