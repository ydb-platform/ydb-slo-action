# Fail-on-workload-error & robust main↔post lifecycle

- **Date:** 2026-06-18
- **Status:** Approved (design)
- **Action:** `init`
- **Branch:** `feat/fail-on-workload-error` (off `v2`, PR back into `v2`)

## Background

The `init` action has two lifecycle entry points: `main.ts` deploys the YDB
cluster and runs workload containers; `post.ts` runs at the end of the job
(always, even on failure) to collect artifacts, tear down infrastructure, and
write a job summary. State crosses the boundary via `saveState()`/`getState()`.

Two problems motivate this work.

### 1. A failed workload is silently swallowed

`waitForWorkloads()` (`init/main.ts:119-163`) awaits `Promise.all` over
`waitForContainerCompletion()` calls. `waitForContainerCompletion`
(`init/lib/docker.ts:216-281`) correctly throws when a container exits non-zero
or times out — but the caller's `catch` (`init/main.ts:155-157`) only logs the
error. It never sets `failed='workload'` and never exits non-zero. As a result
the run **always** proceeds to metric collection and reporting regardless of
whether the workload crashed. The `saveState('failed','workload')` path at
`init/main.ts:36-40` is effectively dead code.

A future "topics" workload needs the opposite: a simple pass/fail smoke test
where a crashed workload fails the whole run instead of silently producing a
green result. ("No metrics, no report" in that scenario is a consequence of
disabling telemetry and of workflow-level report gating — both orthogonal to
this flag, see Feature A and Rollout.)

### 2. `post` assumes every component is present and has no error boundary

`post()` (`init/post.ts:18-55`) runs each collection step as if everything it
deployed is present and healthy, and it has no top-level error boundary
(`post()` is invoked at `init/post.ts:178` with no surrounding `try`). So *any*
absent or unhealthy component — a disabled compose profile, a missing container,
an unhealthy service, a network blip — can turn a collection step into an
unhandled rejection that skips teardown (`docker compose down`) and artifact
upload, leaking containers.

The instance that crashes today is telemetry. With `disable_compose_profiles:
telemetry` there is no `ydb-prometheus` container, so:

- `getContainerIp('ydb-prometheus')` returns `null` and the code falls back to
  the unresolvable `http://prometheus:9090`.
- `collectAlertsFromPrometheus` (`init/lib/alerts.ts:11-40`) has **no** try/catch
  around its `queryRange` fetch, and `collectAlerts` (`init/post.ts:66-83`) does
  not wrap it either, so the alerts query throws and crashes `post()`. (Metrics
  are softer: `collectMetricsFromPrometheus` swallows per-metric errors and
  returns `[]`.)

Telemetry is only the example that breaks first. The underlying problem is that
`post` is not resilient to any component being absent — the fix must be general,
not a telemetry special-case.

## Goals

- Add an opt-in `fail_on_workload_error` input (default `false`) that fails the
  whole run when a workload container exits non-zero or times out.
- Guarantee the cluster-failure path fails the run **unconditionally**,
  independent of `fail_on_workload_error`.
- Make `post` a pure best-effort diagnostic collector: it collects everything
  available, always tears down, always uploads, and never crashes — regardless
  of what failed.
- Keep existing SLO comparison runs behaving exactly as today by default.

## Non-goals

- Improving *why* the cluster sometimes fails to start, or the readiness check
  logic itself (`check-readiness.sh`). Diagnosis is out of scope; this work only
  guarantees the failure is surfaced and diagnostic artifacts are captured.
- A unified "smoke vs SLO mode" abstraction. The flags stay orthogonal and
  composable (`fail_on_workload_error` + `disable_compose_profiles`).
- Per-workload (current vs baseline) failure control. Single global flag.
- Changes to the `report` action beyond what it already handles
  (`report/main.ts:66` already renders a clean failure card from `meta.failed`).
- An input controlling whether `report` runs on a failed `init`. That is
  workflow orchestration (`needs:`/`if:`, or `workflow_run.conclusion` for the
  cross-workflow fork pattern), not an `init`/`report` input — see Rollout.

## Design principle

> `main` owns the definitive pass/fail decision. `post` is best-effort
> diagnostics + cleanup, and never decides pass/fail.

`post` skips a given artifact only when its source is genuinely unavailable
(the component was not deployed, or there is no time window) — never as a
reaction to failure, and never via an enumerated list of special cases. This is
what lets a failed run still produce "artifacts as usual" for diagnosis.

## State contract (main → post)

`main` records what it did; `post` acts only on what `main` recorded. **No new
state keys are introduced** — the existing contract is sufficient:

| Key        | Values                          | Written by                  | Meaning |
|------------|---------------------------------|-----------------------------|---------|
| `cwd`      | path                            | `main` (start)              | `.slo` working dir |
| `workload` | string                          | `main` (start)              | artifact name prefix |
| `pull`     | number                          | `main` (start)              | PR number |
| `commit`   | sha                             | `main` (start)              | commit |
| `start`    | ISO string                      | `main` (`waitForWorkloads`) | workload window start |
| `finish`   | ISO string                      | `main` (`waitForWorkloads`) | workload window end |
| `failed`   | `'' \| 'cluster' \| 'workload'` | `main`                      | failure reason; now `'workload'` is reachable |

The only behavioral change to the contract is that `failed='workload'` becomes
reachable (Feature A).

### `post` discovers what exists; it is never told

`post` does **not** rely on state to know which components were deployed. Each
collector discovers its source at runtime and degrades on its own (consistent
with the project's "settle via discovery" direction). No flag enumerates which
profiles are on. Concretely for the telemetry case, the metrics/alerts collector
reuses the `getContainerIp('ydb-prometheus')` call it already makes — collection
runs before `docker compose down`, so a non-empty IP means Prometheus is
queryable and `null`/empty means it is absent — and the broken fallback to
`http://prometheus:9090` (`init/post.ts:77,96`) is dropped. The same
discover-or-skip shape applies to any source, not just Prometheus.

## Feature A — `fail_on_workload_error`

### Interface (`init/action.yml`)

```yaml
fail_on_workload_error:
  description: "Fail the whole run if any workload container exits non-zero or
    times out."
  required: false
  default: "false"
```

Parsed with the existing idiom `getInput('fail_on_workload_error') === 'true'`
(mirrors `report/main.ts:31`).

### Behavior (`init/main.ts` `waitForWorkloads`)

- Replace `Promise.all` with `Promise.allSettled`. This also fixes a latent bug:
  `Promise.all` rejects on the first failure, so today the default path truncates
  the metric window while the other workload is still running. `allSettled` waits
  for every workload to finish its window.
- Save `finish` **before** any throw, so `post` always has a valid window for
  diagnostic metrics even on a fail-mode crash.
- After settling, collect the rejected results:
  - If there are failures and `fail_on_workload_error` is `true`: `throw` an
    aggregated error. The existing `main()` catch (`init/main.ts:34-40`) sets
    `failed='workload'`, logs, and `exit(1)`.
  - Otherwise: emit a `warning()` per failed workload and continue. Metrics and
    report are still produced (current behavior preserved).

### Reporting on failure is workflow orchestration, not a flag

`fail_on_workload_error` only fails the run; it does **not** itself skip metrics
or the report. In fail mode `main` exits non-zero → the `init` step fails →
whether a report is produced is decided by the workflow, not this action
(`needs:`/`if:` in one workflow, `workflow_run.conclusion` across workflows — see
Rollout). `post` still uploads `metadata` (with `failed`) and logs, so a report
that *is* run on a failed init renders the existing failure card
(`report/main.ts:66`) rather than crashing.

## Feature B — robust `post` + cluster-failure diagnostics

### Resilience is structural, not case-by-case

Three layers together make `post` produce whatever it can and always clean up —
for *any* absent or unhealthy component, not an enumerated list:

**1. Per-collector isolation.** Each artifact is produced by an independent,
self-guarding step. A step that cannot reach its source returns an empty result
and logs why; it never throws out of itself. Today only the metrics path behaves
this way (`collectMetricsFromPrometheus` swallows per-metric errors); the alerts
path does not, which is the concrete crash. Every collector gets the same
treatment, so a new source added later is resilient by the same rule.

**2. Top-level error boundary + guaranteed teardown.** `post()` wraps collection
in try/catch with `docker compose down` in `finally`, then best-effort upload
and summary — so even an unforeseen throw cannot leak containers or skip upload:

```
async function post() {
  try { /* collect + write all four artifacts (each guarded) */ }
  catch (err) { warning(...) }
  finally { /* docker compose down — ALWAYS */ }

  try { /* uploadArtifacts */ } catch (err) { warning(...) }
  try { /* failed ? failedSummary : workloadSummary */ } catch (err) { warning(...) }
}
post()
```

`post` never calls `setFailed`: the job's pass/fail comes from `main` (deploy /
workload) and `report` (thresholds). A best-effort collector that flips the job
result would mask the real cause.

**3. Discover, don't assume.** A collector that needs a component discovers it at
runtime rather than assuming presence (see "`post` discovers what exists"). The
telemetry case is the instance: the metrics/alerts collector keys off the
`ydb-prometheus` IP and skips cleanly when it is empty.

Result: the full four-file artifact set (`<workload>-logs.txt`, `-alerts.jsonl`,
`-metrics.jsonl`, `-metadata.json`) is always written and uploaded — empty where
a source was absent — so the set stays consistent and the `report` loaders never
break. User-provided extra artifacts from `.slo/extra/`
(`collectExtraArtifacts`) are still appended to the upload — pre-existing
behavior, preserved. What each step yields:

- **Logs** — always (`collectComposeLogs` needs no Prometheus; the primary
  diagnostic for a cluster failure).
- **Metadata** — always.
- **Metrics & alerts** — when `ydb-prometheus` is discoverable **and** a
  `start`/`finish` window exists. `failed` does **not** gate this: diagnostic
  metrics are still collected on a fail-mode crash if Prometheus was up.

### `writeFailedSummary` points to the logs artifact (`init/post.ts:166-176`)

Today it inlines workload logs via `summary.addCodeBlock` — empty for a cluster
failure, and for a real failure potentially huge (the job summary has a 1 MiB
limit) and redundant with the uploaded `<workload>-logs.txt` artifact. Instead,
the failed summary is just a heading naming the failure type plus a one-line
pointer to that artifact; logs are not duplicated into the summary:

- heading: `Failed <workload> (<cluster|workload>).`
- body: a pointer to the `<workload>-logs.txt` artifact attached to the run.

Full per-failure-type logs still reach the artifact: `collectLogs` already
gathers logs across the active profiles into `<workload>-logs.txt`.

### `collectMetadata` without a window (`init/post.ts:106-147`)

On a cluster failure `main` exits before `waitForWorkloads`, so `start`/`finish`
are unset. Today `new Date('')` yields `Invalid Date` and `duration_ms: NaN`.
Guard: when `start`/`finish` are absent, omit them (or write `null`) and omit
`duration_ms`. `failed:'cluster'` is still written.

### Cluster failure is unconditional (no code change, documented + preserved)

`database-readiness` (`restart: no`) runs on every `up`, and `workload-current`
depends on it via `service_completed_successfully`
(`deploy/compose.yml:287-289`). So `docker compose up --detach` blocks on
readiness and exits non-zero if it fails; the retry loop
(`init/main.ts:80-108`) catches it and throws after 3 attempts → `main` catch
sets `failed='cluster'` + `exit(1)`. This path runs **before** `waitForWorkloads`
and is therefore independent of `fail_on_workload_error`. The refactor must
preserve it.

## Behavior matrix

| Failure | Fails run via | Depends on `fail_on_workload_error`? | `post` artifacts |
|---|---|---|---|
| Cluster did not start | `deployInfra` throw → `failed='cluster'` → `exit 1` | **No** — always | cluster/init logs + metadata (no window); summary points to logs artifact |
| Workload crashed, fail mode | `waitForWorkloads` throw → `failed='workload'` → `exit 1` | Yes (only when `true`) | logs + metadata + metrics/alerts (if Prometheus present); summary points to logs artifact |
| Workload crashed, default | not failed (`warning`) | Yes (`false` → continue) | full set + report built |
| A component disabled (e.g. telemetry), success | not failed | n/a | every available artifact; empty file for the absent source |
| Normal success | not failed | n/a | full set + report built |

## Files touched

- `init/action.yml` — add `fail_on_workload_error` input.
- `init/main.ts` — `allSettled` + fail-mode throw + save `finish` before throw
  in `waitForWorkloads`. (No new state.)
- `init/post.ts` — error boundary + guaranteed teardown; discovery-gated
  metrics/alerts (skip when no Prometheus IP, drop the `http://prometheus:9090`
  fallback); `collectAlerts` guard; `writeFailedSummary` → failure-typed heading
  + pointer to the logs artifact (no inlined logs); `collectMetadata` without
  window.
- `README.md`, `AGENTS.md` — document the new input and the main↔post contract.
- `dist/` — rebuilt via `bun run bundle`, force-added (`git add -f dist`).

## Testing

The project tests via E2E in real GitHub Actions workflows. Unit tests are
reserved for non-trivial pure functions (e.g. `parseAlertsFromRange` in
`init/lib/alerts.test.ts`, `getComposeProfiles` in `init/lib/docker.test.ts`).

The decisions added here are trivial boolean guards — the fail-fast check
(`failFast && failures.length > 0` in `waitForWorkloads`) and the Prometheus
availability check (`!prometheusIp || !start || !finish` in `collectMetrics`/
`collectAlerts`). They are inlined at their call sites, not extracted into a
module or unit-tested. Correctness is covered by `bun run bundle` (transpile),
the existing suite, and E2E runs of the scenarios in the behavior matrix.

## Rollout

- Default `false` keeps every existing SLO run unchanged.
- A topics smoke test opts in with `fail_on_workload_error: true`. "No metrics,
  no report" is not produced by this flag — it falls out of orthogonal choices:
  metrics are absent because telemetry is disabled
  (`disable_compose_profiles: telemetry,chaos`), and the report is gated off at
  the workflow level.

### Controlling the report on failure (orchestration, no input)

Same workflow, two jobs (no fork support needed):

```yaml
report:
  needs: test
  # no `if:`            -> report skipped when `test` fails (default)
  # if: ${{ !cancelled() }} -> always report (failure card on failure)
  # if: ${{ failure() }}    -> report only on failure
```

Across workflows via `workflow_run` — required for PRs from forks, where the
`pull_request` token is read-only and cannot post comments:

```yaml
# .github/workflows/slo-report.yml — runs in the base repo with write perms
on:
  workflow_run:
    workflows: ["SLO Test"]   # = name: of the SLO workflow
    types: [completed]
permissions:
  contents: read
  pull-requests: write
  checks: write
jobs:
  report:
    runs-on: ubuntu-latest
    # decide whether to report on a failed init:
    if: ${{ github.event.workflow_run.conclusion == 'success' }}
    steps:
      - uses: ydb-platform/ydb-slo-action/report@v2
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          github_run_id: ${{ github.event.workflow_run.id }}   # the SLO run
```

`report` already supports this: it downloads artifacts from another run via
`github_run_id` (`report/lib/artifacts.ts:33-40`) and reads the PR number from
`meta.pull` (`report/main.ts:62`).

## Future work (not in this spec)

- An explicit, workload-independent readiness gate in `main` to catch a
  "`compose up` succeeded but the cluster is actually broken" case independent of
  the flag. Deferred because root-cause diagnosis of cluster start-up is a
  separate effort.
