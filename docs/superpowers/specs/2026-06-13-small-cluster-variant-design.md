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

### Change 2 — DNS-skip readiness script (no `depends_on`, no discovery)

Discovery was rejected after analysis: it can only enumerate nodes that have
*already* registered, so it cannot know the intended set without a fragile
"wait until the set stops growing" heuristic, and it needs a live bootstrap
endpoint. The intended set is known only to the **compose profile**, and Docker
already exposes that at runtime: **a node's container name resolves via Docker
DNS only while it is running.** That is exactly the "absent vs not-yet-ready"
signal the check needs.

Rewrite `deploy/ydb/rootfs/opt/ydb.tech/scripts/ydbd/check-readiness.sh`
(keeping `database-readiness.depends_on` unchanged — storage + init only):

1. `check_cluster_health` — keep as-is (monitoring healthcheck via storage
   endpoint returns `GOOD`, 30 retries).
2. Iterate the full topology by **container hostname** and skip the ones that
   don't resolve (absent → disabled profile); check the ones that do:
   ```sh
   DATABASE_HOSTS="ydb-database-1 ydb-database-2 ydb-database-3 ydb-database-4 ydb-database-5"
   for host in $DATABASE_HOSTS; do
       getent hosts "$host" >/dev/null 2>&1 || { log "Skipping $host (not running)"; continue; }
       check_node_responds "grpc://${host}:2136"
       checked=$((checked + 1))
   done
   [[ $checked -gt 0 ]] || { log "ERROR: No database nodes resolved"; exit 1; }
   ```
   - DNS resolves as soon as the container is attached to the network (at
     creation), well before it serves — so a present-but-starting node resolves
     and is then waited on by `check_node_responds`'s retries; an absent node
     never resolves and is skipped. `check_cluster_health` runs first and gives
     sibling containers time to be created, so present nodes resolve reliably.
   - `getent` is available (Debian + glibc base image).
3. `check_node_responds` now takes a full **endpoint** (`grpc://host:2136`)
   instead of an IP; the per-node table suffix is derived from it
   (`${endpoint//[^a-zA-Z0-9]/_}` → `rd_check_grpc___ydb_database_1_2136`),
   preserving the per-node-table race fix from `4b96fe1`. `--no-discovery` stays
   (pins each check to that specific node).

Result: works for any cluster size, keeps per-node strictness, **no hardcoded
IPs, no `depends_on`, no discovery bootstrap** — fully self-contained, matching
the existing readiness design. The only remaining constant is the topology
upper bound `1..5`, which is tolerant of absence.

**Verified locally** (colima, both modes, `READINESS_EXIT_CODE=0`):
- small (`docker compose up`, no profile): checks `ydb-database-1/2`, logs
  `Skipping ydb-database-3/4/5 (not running)`, then "all 2 running database
  node(s) are responding!".
- full (`docker compose --profile extra-nodes up`): checks all of
  `ydb-database-1..5`, no skips, "all 5 running database node(s) are responding!".

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
   DNS-skip loop + endpoint-based `check_node_responds`, replacing the hardcoded
   `.11–.15` checks. **(done, verified locally)**
3. `README.md` (Cluster size section), `CONTRIBUTING.md` (profile table +
   examples), `deploy/env.example` — document small mode + trade-off.
   **(done)**

No `init/` TypeScript changes (profile is auto-detected). `dist/` unaffected.

## Verification

E2E only (project has no unit tests for this path).

Readiness behaviour **verified locally** (colima, no workload):

- **Small** — `docker compose up -d` (profiles opt-in → `extra-nodes` off): only
  `ydb-database-1/2` created; `ydb-database-readiness` exits 0, logs skip
  `ydb-database-3/4/5` and report "all 2 running database node(s) responding".
- **Full** — `docker compose --profile extra-nodes up -d`: all five nodes
  created; readiness exits 0 with no skips ("all 5 ... responding").

Note: in the **action**, `init` enables all detected profiles by default →
`extra-nodes` on → 5 nodes (default). `disable_compose_profiles: extra-nodes`
selects the 2-node small mode. (Locally the polarity is inverted because compose
profiles are opt-in — worth a line in the docs.)

Still pending (full E2E): a real workload run + report in small mode, and
confirming Prometheus `.13–.15` down targets fire no alerts.
