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

Nothing in compose `depends_on` references `database-3/4/5`, so gating them via
the profile does not break startup ordering.

### Why not `depends_on` on the database nodes (deliberate constraint)

The natural fix for "how many nodes to wait for" would be to add the database
nodes to `database-readiness.depends_on` (`condition: service_healthy`,
`required: false` for the profiled ones). **We deliberately do not do this** —
it would fight an existing design decision, recorded in git history:

- `e60ae5b` removed the direct `database-N: service_healthy` dependencies (then
  on `chaos-monkey`/workloads) and replaced them with a single
  `database-readiness` container that depends only on storage + init steps.
- Follow-ups show why the healthcheck is an unreliable readiness signal:
  `4439478` switched the per-node check from `scheme ls` (read) to
  `CREATE TABLE` (DDL/write); `9c123ef` raised retries 10→30 (nodes ready much
  later than the port opens); `4b96fe1` gave each node its own `rd_check_<ip>`
  table (nodes become serve-ready at different times).

So `ydbd`'s healthcheck (gRPC port open) fires well before a dynamic node can
serve `SELECT 1`/DDL. The readiness *script* — a tolerant poller with retries —
is the real gate, and it must stay self-contained. The "0 endpoints at start"
problem is therefore solved **inside the script** (Change 2), not via compose
`depends_on`.

### Change 2 — discovery-based readiness script (no `depends_on`)

Rewrite `deploy/ydb/rootfs/opt/ydb.tech/scripts/ydbd/check-readiness.sh` to
verify the nodes the cluster *actually* has, replacing the hardcoded `.11–.15`
loop — while keeping `database-readiness.depends_on` unchanged (storage + init
only):

1. `check_cluster_health` — keep as-is (monitoring healthcheck via storage
   endpoint returns `GOOD`, 30 retries).
2. **Discover + wait for the set to settle.** Poll the registered database
   endpoints and wait until the set stops growing — this replaces the hardcoded
   "expected count" without `depends_on` and without knowing N in advance:
   ```
   ydb --endpoint grpc://172.28.0.11:2136 --database /Root/testdb discovery list
   ```
   - `database-1` (`172.28.0.11`) is a non-profiled core node → present in both
     modes. (Storage `172.28.0.10` is a fallback bootstrap candidate.)
   - Output lines look like `grpc://172.28.0.11:2136 [az] #table_service …`;
     extract `host:port` (`grep -oE 'grpcs?://[^ ]+'` → strip scheme).
   - Loop: read the current set; if empty, retry; if the set is unchanged for
     `K` consecutive polls, treat it as settled and proceed. Bound the whole
     loop with a total timeout so a flapping cluster fails honestly.
   - Settling at 2 (small) or 5 (full) is automatic. The residual risk of
     settling before a very-late node is the same exposure the workload itself
     has (it also connects via discovery) — acceptable and consistent.
3. Run the existing per-node `check_node_responds` (SQL `SELECT 1` + DDL
   `CREATE TABLE IF NOT EXISTS rd_check_<id>`, with `--no-discovery` to pin the
   specific node) over each **discovered** endpoint instead of the hardcoded
   `.11–.15`.
   - Generalize `check_node_responds` to accept a `host:port` endpoint; derive
     the table suffix from it (sanitize `.`/`:` → `_`).

Result: works for any node count, keeps per-node strictness, zero hardcoded IP
list, **no compose `depends_on`** — matching both the chaos layer's dynamic
discovery and the existing self-contained-readiness design.

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
   `database-readiness.depends_on` stays unchanged (storage + init only).
2. `deploy/ydb/rootfs/opt/ydb.tech/scripts/ydbd/check-readiness.sh` —
   discovery + settle loop replacing the hardcoded `.11–.15` checks.
3. `deploy/env.example` + user docs — document small mode + trade-off.

No `init/` TypeScript changes (profile is auto-detected). `dist/` unaffected.

## Verification

E2E only (project has no unit tests for this path):

- **Default run** (no `disable_compose_profiles`): 5 database nodes start,
  readiness passes, workload completes — unchanged behavior.
- **Small run** (`disable_compose_profiles: extra-nodes`): only
  `database-1/2` start; readiness settles on exactly 2 endpoints and passes;
  workload completes; Prometheus shows `.13–.15` down without firing alerts.
- Locally: `disable_compose_profiles=extra-nodes` equivalent via
  `docker compose --profile telemetry --profile workload-current up` (omit
  `extra-nodes`) and confirm `ydb-database-3/4/5` are absent and
  `ydb-database-readiness` exits 0.
