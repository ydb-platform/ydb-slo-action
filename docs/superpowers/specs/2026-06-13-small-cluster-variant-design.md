# Small cluster variant (2 database nodes) via compose profile

**Date:** 2026-06-13
**Status:** Approved design, pending implementation plan

## Goal

Let users deploy the SLO cluster with **2 database nodes** instead of the
default 5, for faster / cheaper smoke runs — without breaking the existing
5-node default and without adding a new `action.yml` input. Reuse the existing
compose-profile mechanism.

## Non-goals (YAGNI)

- Arbitrary node count (`database_nodes: N`) — not requested; presets via
  profile are enough.
- A new dedicated action input — `disable_compose_profiles` already exists.
- Cleaning up Prometheus "down" targets / dead `extra_hosts` — harmless, out of
  scope (see "Left untouched").
- Touching storage topology — stays at 1 storage node.

## Background: where node count is currently hardcoded

5 database nodes (`database-1..5`, static IPs `172.28.0.11–15`) appear in:

| Location | What | Impact in small mode |
| --- | --- | --- |
| `deploy/compose.yml` | services `database-3/4/5` + static IPs | **the knob** |
| `deploy/compose.yml` | `extra_hosts` `ydb:172.28.0.13..15` in both workloads | dead bootstrap entries — harmless (SDK discovers via live `.11/.12`) |
| `deploy/prometheus.yml` | scrape targets `ydb-database-3..5` (2 jobs) | targets show `down` — harmless (no `up==0` alert; metric queries aggregate only live series) |
| `deploy/ydb/.../check-readiness.sh` | hardcoded per-IP checks `.11–.15` | **BLOCKER** — `.13/.14/.15` never respond → `database-readiness` fails → `workload-*`/`chaos-monkey` never start → deploy fails |
| `init/lib/alerts.test.ts` | `ydb-database-3/4` as test fixtures | none — chaos-alert test data, not count-coupled |
| chaos scenarios | `get_random_database_node` | none — already discovers live nodes dynamically via `docker ps` |
| `metrics.yaml` / `thresholds.yaml` | — | none — keyed on workload SDK metrics (`sdk_operation_*`), not node count |

Cluster validity: `config.yaml` has `erasure: none`, a single storage host, and
`self_management_config.enabled`. Database (dynamic) nodes are stateless compute
for tenant `/Root/testdb`; 2 of them is valid (even 1 works).

Note: static `container_name` + fixed IPs rule out `docker compose --scale`,
which is why a profile (not scaling) is the mechanism.

## Design

### Change 1 — `extra-nodes` profile on database-3/4/5

In `deploy/compose.yml`, add `profiles: [extra-nodes]` to services
`database-3`, `database-4`, `database-5`.

- Services without a `profiles:` key (`database-1`, `database-2`, storage,
  `storage-init`, `database-init`, `database-readiness`, …) always start.
- `init/main.ts` already collects every compose profile via
  `getComposeProfiles()` and passes them through `COMPOSE_PROFILES`, **enabled by
  default**. So the default run keeps all 5 nodes → backward compatible.
- `disable_compose_profiles: extra-nodes` filters the profile out →
  `database-3/4/5` do not start → 2-node cluster.

Nothing in compose `depends_on` references `database-3/4/5`, so gating them does
not break startup ordering.

### Change 2 — discovery-based readiness (required)

Rewrite `deploy/ydb/rootfs/opt/ydb.tech/scripts/ydbd/check-readiness.sh` so it
verifies the nodes the cluster *actually* has, not a hardcoded IP list:

1. `check_cluster_health` — keep as-is (monitoring healthcheck via storage
   endpoint returns `GOOD`).
2. **Discover** the tenant's database endpoints by asking an always-on node:
   ```
   ydb --endpoint grpc://172.28.0.11:2136 --database /Root/testdb discovery list
   ```
   - `database-1` (`172.28.0.11`) is a non-profiled core node → present in both
     modes. (Storage `172.28.0.10` is a fallback bootstrap candidate.)
   - Output lines look like `grpc://172.28.0.11:2136 [az] #table_service …`;
     extract `host:port` (`grep -oE 'grpcs?://[^ ]+'` → strip scheme).
   - Poll with retries until the set is non-empty (dynamic nodes register
     slightly after the cluster reports `GOOD`); fail after the timeout budget.
3. Run the existing per-node `check_node_responds` (SQL `SELECT 1` + DDL
   `CREATE TABLE IF NOT EXISTS …`, with `--no-discovery` to pin the specific
   node) over each **discovered** endpoint instead of the hardcoded `.11–.15`.
   - Generalize `check_node_responds` to accept a `host:port` endpoint; derive
     the table suffix from it (sanitize `.`/`:` → `_`).

Result: works for any node count, keeps per-node strictness, zero hardcoded IP
list — matching the chaos layer's dynamic-discovery philosophy.

CLI verified against docs for YDB CLI `stable-25-3`: the subcommand is
`discovery list` (not `list-endpoints`). Exact output parsing + whether the
storage node can also serve tenant discovery to be confirmed during E2E.

### Change 3 — documentation

- `deploy/env.example`: note how to run small mode locally
  (`disable_compose_profiles` env / compose `--profile` usage).
- User-facing docs (README / action docs): document
  `disable_compose_profiles: extra-nodes` → 2-node cluster, with the trade-off
  note below.

### Left untouched (verified safe)

- `prometheus.yml` — 3 down targets in small mode; no `up==0` alert exists;
  metric queries aggregate only live series.
- workload `extra_hosts` — 3 dead `ydb:172.28.0.1x` entries; YDB SDK bootstraps
  discovery through the live `.11/.12`.
- chaos scripts — already dynamic.
- `metrics.yaml` / `thresholds.yaml` / `alerts.test.ts` — not node-count coupled.

## Trade-offs / notes

- In small mode, chaos is harsher relative to cluster size (killing 1 of 2 nodes
  = −50% compute vs −20% with 5). Small mode suits fast smoke runs more than
  strict SLO gating — call this out in the docs.

## Files to change

1. `deploy/compose.yml` — add `profiles: [extra-nodes]` to `database-3/4/5`.
2. `deploy/ydb/rootfs/opt/ydb.tech/scripts/ydbd/check-readiness.sh` — discovery
   loop replacing hardcoded `.11–.15`.
3. `deploy/env.example` + user docs — document small mode + trade-off.

No `init/` TypeScript changes (profile is auto-detected). `dist/` unaffected.

## Verification

E2E only (project has no unit tests for this path):

- **Default run** (no `disable_compose_profiles`): 5 database nodes start,
  readiness passes, workload completes — unchanged behavior.
- **Small run** (`disable_compose_profiles: extra-nodes`): only
  `database-1/2` start; readiness discovers exactly 2 endpoints and passes;
  workload completes; Prometheus shows `.13–.15` down without firing alerts.
- Locally: `disable_compose_profiles=extra-nodes` equivalent via
  `docker compose --profile telemetry --profile workload-current up` (omit
  `extra-nodes`) and confirm `ydb-database-3/4/5` are absent and
  `ydb-database-readiness` exits 0.
