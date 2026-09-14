---
name: investigate-flaky-test
description: Investigate a GROWI flaky-test tracking issue (created by detect-flaky-ci) - reproduce, find the root cause, decide test-fix vs product-fix vs quarantine, and optionally open a PR. Usage - /investigate-flaky-test <issue-url-or-number> [--auto]
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Agent, AskUserQuestion
argument-hint: <issue-url-or-number> [--auto]
---

# investigate-flaky-test

## Overview

Investigate a GitHub issue created by `detect-flaky-ci` and labeled
`flaky/confirmed`: reproduce the non-determinism, find the root cause,
classify it, and — if approved — fix it and open a PR.

This mirrors `investigate-issue`'s shape (confidence-gated stop points,
`phase/*` label lifecycle, branch/PR conventions) so both skills feel like
the same tool. **It is a separate skill, not a mode of `investigate-issue`**,
because the actual investigation content is unrelated: no reported version to
check, no browser reproduction of user-facing steps, and the fix taxonomy
(test-side vs. product-side vs. quarantine) does not apply to ordinary bug
reports.

Supports the same two execution modes as `investigate-issue`:
- **interactive** (default): stop at every decision gate
- **autonomous** (`--auto`, or invoked from `/flaky-ci-routine`): cross a gate
  automatically at HIGH confidence, stop at MEDIUM or LOW

## Input

`$ARGUMENTS` is an issue URL or number, optionally with `--auto`. Parse the
issue number and mode the same way `investigate-issue` does.

**Precondition**: the issue must carry `flaky/confirmed` **or**
`flaky/suspected` (fetch exact label names with
`gh api repos/growilabs/growi/labels --paginate -q '.[].name'` before
comparing — never hardcode, and use REST here, not `gh label list --json`,
which a cloud routine's proxy-restricted `gh` session rejects — see Error
Handling). If it is still `flaky/observing`, stop and report that
`detect-flaky-ci` has not gathered enough evidence yet; do not attempt to
lower the bar by investigating early.

These two accepted labels mean different things and change Step 2:

- **`flaky/confirmed`** — already empirically proven (Playwright's in-run
  retry already IS the proof, or a prior vitest threshold-accumulation
  already reached two independent observations). No confirmation measurement
  is owed here before proceeding to root-cause work — go straight into Step
  2's existing evidence-gathering.
- **`flaky/suspected`** — `detect-flaky-ci`'s cheap mechanical mining (diff/
  PR mismatch, sandwich pattern, or matrix divergence) found this, but
  nothing has actually reproduced it live yet. This skill owes it exactly
  **one** confirmation measurement — a single push of the repro workflow,
  which replays the spec 3 times on current `master` (not the deeper tally
  described in Step 2's second tier, which is a separate budget for a
  different purpose) — before treating the flakiness itself as real. See
  "Step 2, `flaky/suspected` path" below.

---

## Confidence Framework

Same three levels and same autonomous/interactive behavior as
`investigate-issue` (HIGH → proceed autonomously and state the evidence,
MEDIUM/LOW → stop and ask with a recommendation). Applied at two gates in
this skill: the fix-classification gate (Step 4) and the PR gate (Step 6).

---

## Step 1: Fetch Issue Evidence

Use REST (`gh api`), not `gh issue view --json` — the latter is
GraphQL-backed and rejected by a cloud routine's proxy-restricted `gh`
session (see Error Handling):

```bash
gh api repos/growilabs/growi/issues/{ISSUE_NUMBER}
gh api repos/growilabs/growi/issues/{ISSUE_NUMBER}/comments --paginate
```

The first call gives `title`, `body`, `labels[].name`, `html_url`, `state`;
the second gives every comment (each observation `detect-flaky-ci` appended
after the first).

The title is `flaky: {IDENTITY_KEY}` (set by `detect-flaky-ci`), where
`IDENTITY_KEY` is one of:
- `vitest:{SPEC_PATH}:{TEST_TITLE}` — reproduce with vitest, precise identity.
- `playwright:{SPEC_PATH}:{TEST_TITLE}` — reproduce with Playwright, precise identity.
- `playwright:{BROWSER}` — a **job-level fallback identity**: `detect-flaky-ci`
  could not isolate which spec was flaky from the CI log alone. The issue
  body's evidence section will say so explicitly. In this case, do not guess
  a spec — read the linked run's full Playwright report first (the run URL
  in the "First observation" section) to find the actual flaky spec before
  attempting Step 2 reproduction. If the report is no longer available
  (artifact retention expired), report LOW confidence at Step 4 rather than
  guessing.

Parse the identity key from the title (split on the first `:` and then on the
last `:` to isolate `SPEC_PATH`/`TEST_TITLE` — `SPEC_PATH` values here are
project-relative paths and never contain a bare `:`, so this is unambiguous).
Collect every observation block from the body and comments (run URLs,
commits, log excerpts) — later
observations may show the failure mode drifting or repeating identically,
which is itself evidence for Step 3.

Mark as under investigation, same as `investigate-issue`:

```bash
gh issue edit {ISSUE_NUMBER} --repo growilabs/growi --remove-label "{EXACT_PHASE_NEW_LABEL}" --add-label "{EXACT_PHASE_UNDER_INVESTIGATION_LABEL}"
```

---

## Step 2: Gather Evidence

### `flaky/suspected` path: take the confirmation measurement first, in parallel

If the issue's label is `flaky/suspected` (see Precondition), start its
one-time confirmation measurement **before** doing anything else in this
step, so it runs in the background while the static analysis below reads.

The measurement is taken by `.github/workflows/flaky-repro.yml`: a push to a
`flaky-repro/**` branch whose head commit carries a `Flaky-Repro-*` git
trailer block makes that workflow replay one spec N times on real CI
infrastructure (the same toolchain, MongoDB replica set and Elasticsearch
`ci-app.yml` uses) and post the tally to the tracking issue. Driving it needs
only the two abilities this skill always has — pushing a branch and reading
REST. (`gh run rerun` is not used at this gate any more: a cloud routine's
token has no `actions:write`, so that path returned 403 and stopped every
`flaky/suspected` issue before anything was measured.)

**This is a hard gate, not an optional courtesy — Step 3 may not start
until it is satisfied.** Before reaching Step 3, write down (in your own
working notes, and later in the issue comment or PR body) one of exactly
three outcomes, decided in 2-E below: `confirmed`, `possible genuine
regression`, or `confirmation not measured`. Reaching Step 3 without one of
these three recorded is the failure mode this gate exists to catch — a
plausible-looking root cause already visible in the issue's existing
evidence (e.g. matrix divergence) is not a substitute for the measurement,
no matter how convincing that existing evidence looks.

#### 2-A: derive the repro request from the identity key

The identity key parsed in Step 1 is `vitest:{SPEC_PATH}:{TEST_TITLE}`, and
`SPEC_PATH` is **already relative to `apps/app`** (e.g.
`src/server/routes/apiv3/g2g-transfer-key-keep-alive.integ.ts`). Pass it
verbatim — the workflow rejects a repository-relative `apps/app/...` value.
Derive the vitest project from the same path:

| `SPEC_PATH` ends with | `Flaky-Repro-Project` |
|---|---|
| `.exclusive.integ.ts` | `app-integration-exclusive` |
| `.integ.ts` (any other) | `app-integration` |
| `.spec.tsx` / `.spec.jsx` | `app-components` |
| `.spec.ts` / `.spec.js` | `app-unit` |

One gap in that table: a spec under `src/features/growi-vault/__tests__/`
belongs to the `app-integration-vault` project, which the workflow's
allowlist does not accept — and `app-integration` explicitly excludes those
files, so requesting it yields `No test files found`, a failed job, and no
measurement. Do not push a request for such a spec. Record
"confirmation not measured (no repro project for vault specs)" and pause with
`flaky/needs-decision`, exactly as in 2-E's third outcome.

A `playwright:` identity never enters this gate: Playwright's in-run retry is
already the proof of non-determinism, so those issues arrive as
`flaky/confirmed`. If one somehow carries `flaky/suspected`, skip straight to
the primary tier below and state in Step 4 that no repro measurement applies
to a Playwright identity.

#### 2-B: push the request

```bash
ISSUE_NUMBER=11823
SPEC_PATH='src/server/routes/apiv3/g2g-transfer-key-keep-alive.integ.ts'
PROJECT='app-integration'
BRANCH="flaky-repro/issue-${ISSUE_NUMBER}-keep-alive"   # short slug, [a-z0-9-]

git fetch origin master
git checkout -b "$BRANCH" origin/master

# ONE -m. git reads only the LAST paragraph of the message as the trailer
# block, so splitting these lines across several -m flags makes every trailer
# but the last paragraph invisible to the workflow (measured in task 1.1/1.6
# of the flaky-ci-closed-loop spec).
git commit --allow-empty -m "$(printf 'chore: request a flaky repro for #%s\n\nFlaky-Repro-Spec: %s\nFlaky-Repro-Project: %s\nFlaky-Repro-Mode: file\nFlaky-Repro-Repeat: 3\nFlaky-Repro-Issue: %s\n' \
  "$ISSUE_NUMBER" "$SPEC_PATH" "$PROJECT" "$ISSUE_NUMBER")"

git push -u origin "$BRANCH"
REPRO_SHA=$(git rev-parse HEAD)
```

`Flaky-Repro-Mode: file` and `Flaky-Repro-Repeat: 3` are the defaults this
gate uses: 3 independent runs of the one spec, each in its own process. The
issue already documents at least one CI failure, so the only thing this
measurement has to establish is whether the spec can pass at all on unchanged
code — three runs separate that from a real regression, which fails 3/3.

**Why the branch is cut from `origin/master`, not from the failing run's
commit.** The question this gate answers is "is this spec non-deterministic
on current `master`". The failing commit cannot serve as the base anyway:
`.github/workflows/flaky-repro.yml` is not in its tree, and a workflow only
runs if its file exists on the pushed ref, so that push would start nothing
at all. If the spec no longer exists on `master`, the workflow rejects the
request (`Flaky-Repro-Spec does not exist in this commit`) and its check-run
is `failure`, which routes the issue to "confirmation not measured" in 2-E.
That is the correct outcome, not a bug — a spec that is gone from `master`
has nothing left to measure.

**No normal CI run is created by this push** (Requirement 6.7 of the
`ci-flaky-test-detection` spec): the commit is empty, and `ci-app.yml` /
`ci-app-prod.yml` do not run on `flaky-repro/**`.

#### 2-C: wait for the `flaky-repro` check-run

Do not wait here — 2-B is the last thing done before the static analysis
below. Go read that now; 2-C through 2-F then run at the end of this step,
right before Step 3, while the measurement has had time to finish. When you
come back, poll REST every 60 seconds, for at most 30 minutes from the push:

```bash
gh api "repos/growilabs/growi/commits/${REPRO_SHA}/check-runs" \
  -q '.check_runs[] | select(.name == "flaky-repro") | {status, conclusion, html_url}'
```

Three ways out of the poll:

- the check-run reports `status == "completed"` → take its `conclusion` to 2-D;
- **no check-run named `flaky-repro` has appeared within the first ~5
  minutes** → the instrument never started. Stop polling now rather than
  burning the full 30 minutes, and treat it as "confirmation not measured"
  (2-E), naming the likely causes in the stop comment: the branch name did
  not match `flaky-repro/**`, or the base commit predates `flaky-repro.yml`;
- 30 minutes elapse with the check-run still `queued` / `in_progress` →
  "confirmation not measured" as well.

The check-run's conclusion answers only "could a measurement be taken at
all": `success` means the request was valid and the runs happened (the tests
themselves may well have failed — that is the measurement), `failure` means
the request was rejected or the setup broke and nothing was measured.

#### 2-D: read the tally from the `### Repro result` comment

```bash
REPRO_RESULT_FILE="${TMPDIR:-/tmp}/flaky-repro-${ISSUE_NUMBER}.md"

gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/comments?per_page=100" --paginate --slurp \
  | jq -r --arg sha "$REPRO_SHA" '
      [ flatten[]
        | select(.body | startswith("### Repro result"))
        | select(.body | split("\n") | any(. == "- Commit: " + $sha)) ]
      | last // empty | .body' > "$REPRO_RESULT_FILE"

grep -m1 -E '^- Runs:' "$REPRO_RESULT_FILE"
grep -m1 -E '^- Failed:' "$REPRO_RESULT_FILE"
```

**The comment must be the one this push produced.** A tracking issue
accumulates `### Repro result` comments — the confirmation measurement, a
later rate measurement (second tier), the fix verification in Step 6 — so
"the newest one" is not the same thing as "mine". Match on the
`- Commit: ${REPRO_SHA}` line, the first of the result's fixed lines, and let
an empty file mean "no result for this commit" rather than silently reading
somebody else's tally. Among comments for the same commit take the **newest**
(`last`), because a manually re-run job leaves a second one.

Three details of that pipeline are load-bearing, each measured against this
repo's real data:

- `--slurp` and `-q` cannot be combined (gh 2.100.0 rejects it), hence the
  pipe into `jq` rather than gh's own `-q`;
- `--paginate -q` would apply the filter to **each page separately**, so no
  aggregation (`last`, `[...]`) may live inside `-q` — `--slurp` plus
  `flatten[]` is what makes the selection see every page at once;
- `test("^- Commit: …"; "m")` does **not** anchor per line in jq 1.8.1, so
  the `split("\n") | any(...)` form stays.

`grep -m1` matters for the same reason: the comment ends with an excerpt of
the failing run's output, and a vitest excerpt can itself contain a line
beginning with `- Failed:`. The seven fixed `- Key: value` lines
(`- Commit:`, `- Branch:`, `- Mode:`, `- Runs:`, `- Failed:`, `- Per-run:`,
`- Workflow run:`) always come first, in that order, before any note or
fenced excerpt.

**A `success` conclusion on its own is not evidence that anything was
measured.** The workflow posts the comment in a separate step that
deliberately does not fail the job, so a comment that never arrived (a locked
issue, a momentary GitHub outage) leaves the check-run green with only a
warning annotation behind it. Require **both**: the check-run completed
`success`, **and** a `### Repro result` comment carrying
`- Commit: ${REPRO_SHA}` exists with a `- Runs:` value of at least 1 and a
`- Failed:` line. If either is missing, the outcome is "confirmation not
measured" — the job summary is for human readers, and the issue's existing
static evidence is not a substitute.

#### 2-E: decide, from the tally alone

| Reading | Outcome |
|---|---|
| `Failed` < `Runs` — at least one run passed | **confirmed** |
| `Failed` == `Runs` — every run failed | **possible genuine regression** |
| check-run `failure`; or no `flaky-repro` check-run within ~5 min; or still unfinished after 30 min; or no `### Repro result` comment for this commit, no `- Runs:` line, or `- Runs: 0` | **confirmation not measured** |

**confirmed** — a spec that passes at least once on unchanged code, with a
recorded CI failure behind it, is non-deterministic. Escalate the label
(REST, per Error Handling — the `gh issue edit` / `gh label` paths are
GraphQL-backed and a cloud routine's session rejects them):

```bash
gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/labels" -X POST -f 'labels[]=flaky/confirmed'
gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/labels/flaky%2Fsuspected" -X DELETE
```

Then record the tally in a comment, counting the CI failure the issue already
documents as one more failing sample — written as
**recorded CI failure 1 + `Failed` / `Runs` + 1**. With `- Runs: 3` and
`- Failed: 1` that reads `2 / 4`. The decision above used the workflow's own
`Failed`/`Runs`; the `+1` figure is for the record only, never fed back into
the comparison.

```bash
gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/comments" -X POST -f body="$(cat <<'EOF'
**Confirmation measurement** — the repro workflow ran this spec 3 times on
current `master` with no code change: 1 failed, 2 passed
({workflow run URL}). Counting the CI failure already recorded above as a
failing sample, the tally is **2 / 4**.

Escalated `flaky/suspected` → `flaky/confirmed`.
EOF
)"
```

Use a bold lead-in, not a `###` heading: `### Repro result` belongs to the
workflow, and `### Additional observation` / `### Backfilled observation` are
what `detect-flaky-ci` counts as occurrences. This comment must not be
mistaken for either.

**possible genuine regression** — every measured run failed on unchanged
`master` code, so "the mining hit was right and this is flaky" is no longer
the leading reading. Do **not** promote the label; leave `flaky/suspected` in
place. Write the finding to the issue (same comment shape, quoting `- Runs:`
and `- Failed:` and the workflow run URL) stating that the spec failed on
every measured run and that a real regression is the leading hypothesis, then
carry MEDIUM into Step 4 — see its confidence table.

**confirmation not measured** — nothing was measured, so this gate cannot be
crossed. Post a comment saying so (which of the conditions above applied,
the check-run URL if there is one, and the likely cause), add the
`flaky/needs-decision` label, end the comment with a single
`- Recommendation: <one line>` line, then clean up the branch (2-F) and stop:

```bash
gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/labels" -X POST -f 'labels[]=flaky/needs-decision'
```

Do not let the issue's existing static evidence stand in for the missing
measurement, and do not fold this into any later tally: a measurement that
did not happen is not evidence of anything.

#### 2-F: delete the confirmation branch

```bash
git push origin --delete "$BRANCH"
git switch -          # leave the throwaway ref before anything branches again
git branch -D "$BRANCH"
rm -f "$REPRO_RESULT_FILE"
```

Do this on **every** exit path — including the ones where no result was ever
read (rejected request, timeout, check-run absent), or `flaky-repro/**` refs
accumulate on the remote. Deleting the branch starts no workflow run (task
1.6 measured this: the `flaky-repro` run count was unchanged after its three
self-test branches were deleted).

Leaving the local branch is not cosmetic: every later step branches from
wherever HEAD is, so staying on the repro branch would make Step 5-A cut the
fix branch off it and carry the empty `chore: request a flaky repro` commit
into the fix PR.

### Primary tier — CI log analysis (always available, no live services needed)

This skill is expected to run unattended, including from a cloud routine
whose checkout has no MongoDB replica set, no Elasticsearch, and no
browsers. Do not make CI-log analysis a fallback for when reproduction
"isn't available" — treat it as the normal, primary path, and treat live
reproduction (below) as a bonus when the current environment happens to
support it.

Pull more history than what's already in the issue, using the same tools
`detect-flaky-ci` uses (the `gh api .../actions/workflows/{file}/runs` REST
calls from its Step 1 — not `gh run list --json`, for the same
version-fragility reason given there):

```bash
# Vitest: how often does this exact test appear as FAIL across recent runs
# of the job that hosts it?
gh api "repos/growilabs/growi/actions/workflows/ci-app.yml/runs?per_page=50&status=completed" \
  -q '.workflow_runs[] | {databaseId: .id, conclusion, headSha: .head_sha, createdAt: .created_at}'

# Playwright: how often does this spec/browser show up in Retry#/flaky
# evidence across recent run-playwright jobs?
gh api "repos/growilabs/growi/actions/workflows/ci-app-prod.yml/runs?per_page=50&status=completed" \
  -q '.workflow_runs[] | {databaseId: .id, conclusion, headSha: .head_sha, createdAt: .created_at}'
```

For each candidate run, fetch the relevant job's log (same method Step 0 of
`flaky-ci-routine.md` decided — `gh run view --log*` or
`mcp__github__get_job_logs`, whichever this run is using; see
`detect-flaky-ci` Step 2/2b) and grep for the test title. Build a picture of:
how often it fails, whether the failure mode is identical every time (points
to a deterministic race, easier to fix) or varies (points to genuine timing
noise), and — critically — read the **stack trace / error origin** in each
occurrence: an error surfacing from a service/model file (not the spec
itself) is your first clue toward a product-code race (see Step 3).

Read the spec file and the code path it exercises. For Playwright specs,
static-analyze for timing-dependent patterns (missing
`await expect(...).toBeVisible()` before interaction, reliance on fixed
`waitForTimeout`, selectors matching multiple elements — see the
`comments.spec.ts` "strict mode violation: resolved to 2 elements" pattern,
a real example already seen in this repo's CI).

**Second tier — measure a failure rate with the same repro workflow (always
available, no local services needed, and stronger than local
reproduction).** The confirmation gate above spends 3 runs on a yes/no
question ("does this spec ever pass on unchanged code?"). Root-cause work
sometimes needs a rate instead: "failed 1/10" and "failed 9/10" point at
very different mechanisms — the first looks like genuine timing noise, the
second like a deterministic bug that merely presents as CI-only — and they
land on different rows of Step 4's confidence table.

To take that measurement, push a second request exactly as in 2-B…2-F, on
its own branch (`flaky-repro/issue-{ISSUE_NUMBER}-rate`), with a higher
`Flaky-Repro-Repeat` — 10 is the workflow's cap. It runs on GitHub Actions'
own MongoDB replica set and Elasticsearch rather than on whatever local
environment this skill happens to be running in.

This is a **different budget** from the confirmation gate, and it costs real
CI minutes: take it once, and only when the rate would actually change the
Step 3 category or the Step 4 confidence. A `flaky/confirmed` issue that
arrives without a confirmation measurement (see Precondition) can use this
tier directly when a rate is what the root-cause read is missing.

**Bonus tier — live reproduction, only if the current environment supports
it.** Probe rather than assume:

```bash
# vitest / integ tests need a real MongoDB replica set
mongosh --eval "db.adminCommand('ping')" 2>/dev/null || echo "no mongo"
# playwright needs installed browsers
pnpm exec playwright --version 2>/dev/null && ls ~/.cache/ms-playwright 2>/dev/null
```

If available:

```bash
# vitest
cd apps/app && pnpm vitest run {SPEC_PATH_PARTIAL} --repeat=20

# playwright
cd apps/app && pnpm playwright test {SPEC_PATH_PARTIAL} --repeat-each=10
```

A local reproduction (or local pass after a fix) is strictly additional
confirmation on top of the CI-log evidence — never required to reach HIGH
confidence, and its absence is never grounds to lower confidence below what
the accumulated CI evidence alone supports.

---

## Step 3: Root-Cause and Classify

Determine which category the flake belongs to — this decides the fix
strategy in Step 4. Do not default to "just flaky, add a retry" — a race
condition in product code surfaced by a test is a real bug, not a test
problem, even though it *manifests* as flakiness. The same discipline
applies to "Environment timing": do not default to "just bump the
timeout" either — see the guardrail below.

| Category | Signature | Fix belongs in |
|---|---|---|
| **Shared/leaked state** | Test passes alone, fails alongside siblings; order-dependent; touches DB/fixtures another test also mutates | Test (isolate fixtures, don't disable parallelism — see `feedback_integ_test_isolation_per_worker` precedent: per-worker isolation, not disabling parallel execution) |
| **Missing await / race in the test** | Assertion runs before an async side effect completes; timing-dependent selector waits (Playwright) | Test |
| **Race in product code** | A fire-and-forget or unsynchronized async operation in application code (not the test) can observably run after the test's cleanup/assertion — e.g. a post-write side effect racing the same request's response | Product code |
| **Environment timing** | Legitimately slow CI runner, no logic bug, but still worth quarantine if disruptive | See guardrail below — usually a test redesign, not a bare timeout bump; quarantine only when no redesign is possible |

Use `git log --oneline -20 -- {SPEC_PATH}` and read the code under test to
tell "shared state" from "product race" — a test that fails only when run
after a specific sibling usually points at a fixture; a test that fails with
an error surfaced from a service/model file (not the spec file itself) in
the log's stack trace usually points at a product-code race worth reading
carefully before dismissing as test flakiness.

### Guardrail — a bare timeout increase is a stopgap; find what's actually driving the cost first

A numeric timeout bump (`}, 15_000)` → `}, 20_000)` and so on) is the
cheapest possible edit, and that is exactly the problem: it is easy to
reach for as *the* fix without ever asking what made the operation slow.
Left unexamined, it tends to become the default "Environment timing" fix —
and because it never touches the actual driver of the cost, it is usually
a way of avoiding the root-cause work rather than doing it. It doesn't
remove the underlying slowness; it just moves the load level at which the
test starts failing again a bit higher, and the next CI-busy period trips
it once more. Treat a bare bump as a **last resort**, not a first move —
before proposing one, identify what is actually driving the observed
duration. Two drivers show up repeatedly in this codebase; neither is
fixed by a bigger number:

**Driver 1 — the test's own wall time scales with a parameter of the
test** (a loop count, a data size, an iteration count) rather than being a
fixed cost that merely got unlucky under load. Read the test body, not
just the failing assertion. If it issues `N` real round-trips (network,
DB, filesystem) where `N` is `maxRequests`, a loop bound, or similar, and
the assertions of interest only concern the *boundary* (a limit being
reached/exceeded, a count saturating, a last-element condition), that is a
redesign opportunity, not an environment-timing dead end:

- Seed the precondition directly instead of looping to it — many
  libraries expose a lower-level primitive that reaches the same state in
  one call (e.g. `rate-limiter-flexible`'s `penalty(key, n)` reaches
  `n` consumed points through the identical internal upsert path
  `consume()` uses, in a single round-trip, instead of looping `consume()`
  `n` times — see the `consume-points.integ.ts` fix for issue #11718/PR
  #11719 for a worked example. The general shape: find the state-setting
  primitive the library already ships, confirm it goes through the same
  code path as the operation under test, and use it to jump straight to
  one step before the boundary).
- Exercise only the transition itself (the call(s) at and past the
  boundary) through the real code under test.
- This turns an O(N) cost into an O(1) cost, which removes the test's
  sensitivity to CI load rather than buying temporary headroom against it.

**Driver 2 — the cost scales with how much concurrent setup work is in
flight, not a test-local parameter.** A `beforeAll`/`afterAll` in a
`setupFiles` entry (migration replay, a singleton service cold-init, etc.)
looks like it should run once per Vitest worker — the code usually
memoizes a module-level singleton to make it look that way — but **verify
that before trusting it**: Vitest's `forks` pool resets the module
registry per test file under the default `isolate: true`, so a
"per-worker singleton" comment can be describing intent, not actual
behavior, and the cost can really be recurring on nearly every file all
run long (confirm with a throwaway `console.log` inside the memoized
branch and count how many times it fires across a few files — do not
assume from the comment). Either way — once per worker or once per file —
"this hook's own cost doesn't loop over anything, so there's nothing to
redesign" sounds like it forces driver 1's dead end, but it doesn't: the
cost still scales with **how many files/workers pay it at the same
moment**, since anything else running on the same CI runner competes for
the same CPU while each pays its own heavy setup cost (spawning a
migration subprocess, initializing a singleton, etc.). A same-commit
failure across several unrelated spec files that all timed out on the
identical `beforeAll` line, with no code change near that line, is the
signature of this shape (see `test/setup/crowi.ts`'s `getInstance()` /
`test/setup/migrate-mongo.ts` in GROWI's own `apps/app` for a worked
example — PR #11824 misclassified this as "nothing to redesign, so a bump
is fine," and the fix that replaced it, PR #11826, initially misclassified
it too, asserting the *same* per-worker premise without checking it before
publishing — a `console.log` count across a few files falsified it and
changed the story that shipped). Where this applies:

- **Measure the unloaded baseline, and don't stop at the number — check
  the model it's measuring.** Run the failing spec(s) alone (no sibling
  workers contending) and read the hook's own duration off the reporter.
  If it already sits close to the current limit, a larger timeout may be
  warranted — state the measured number. If it sits well under the limit
  (e.g. under a fifth of it), the limit was never the problem; contention
  pushed a normally-fast hook past it. But a low unloaded number only says
  the hook is fast *once* — it does not tell you whether it pays that cost
  once per worker or once per file. Confirm which, per the paragraph
  above, before describing the mechanism in a fix or a doc: "once per
  worker" and "once per file, many times over" call for the same lever
  (bound concurrency) but very different claims about how much it helps,
  and an unverified "once per worker" claim is exactly the kind of
  plausible-but-unchecked assertion this whole guardrail exists to catch.
- **Check for a same-project precedent that a bump already failed.** If a
  *different* hook sharing the same `setupFiles`/project already had its
  timeout raised for the same "environment timing" reason and still
  flaked afterward (grep prior flaky-test issues/PRs for the project
  name), that is direct evidence the bottleneck is concurrency, not any
  single hook's deadline — proposing another bump for a second hook in
  the same project repeats a fix this repo's own history already falsified.
- **Prefer bounding worker concurrency over widening the deadline.** When
  the mechanism is "N workers/files doing cold-init at once fight for the
  runner's cores," the fix that addresses the mechanism is capping
  concurrent workers (Vitest `poolOptions.forks.maxForks` /
  `poolOptions.threads.maxThreads`, sized off `availableParallelism()`
  with headroom for sibling CI services like a DB/search container) for
  that project — not a bigger number on the hook that happened to lose
  the race this time.
- **Never scope the change wider than the evidence.** `hookTimeout` (and
  `testTimeout`) are configurable per-project in `vitest.workspace.mts`
  *and* per-hook as a call's last argument. A fix aimed at one shared
  setup hook must not raise the timeout for the whole project — that
  silently triples (or more) the failure-detection window for every other
  `beforeAll`/`afterAll` in every spec file the project covers, including
  a future genuine hang unrelated to this flake.

Both drivers reduce to the same discipline: **find what the time is
actually being spent on, and address that** — a scaling parameter to
redesign around, or contention to bound — rather than reaching for the
timeout value because it's the line the stack trace happened to point at.

Only accept a bare timeout bump when:
- neither driver applies and no other driver can be identified after
  actually reading the test/hook and its call path (rare — most cases
  reduce to one of the two above), or
- as a **modest safety margin layered on top of a fix that already
  addressed the real driver** — not as the fix itself. State explicitly
  why the margin is still there (e.g. "no CI history yet for this
  reshaped test, and local/CI timing can differ") rather than leaving it
  unexplained.

A proposed fix that is only a numeric timeout change, with no evidence
either driver was checked, is not HIGH confidence at Step 4 regardless of
how clean the diff looks — see the confidence table there. Route it
through the MEDIUM path and present the redesign or concurrency-capping
alternative explicitly rather than defaulting to the bump.

---

## Step 4: Fix-Approach Decision Gate

**Confidence assessment:**

| Situation | Confidence |
|---|---|
| Root cause pinpointed (category from Step 3 is clear, consistent with the Step 2 repro tally) + fix is surgical (1-2 files) | HIGH |
| Root cause identified but fix touches product code with broader blast radius, or category is ambiguous between "shared state" and "product race" | MEDIUM |
| The repro tally is `Failed == Runs` — every measured run failed on unchanged `master` code (Step 2's "possible genuine regression") | MEDIUM — flag this explicitly, do not silently treat it as a flaky-test fix. Quote the `- Runs:` / `- Failed:` values and say that a real regression is the leading hypothesis; the mining hit that produced a `flaky/suspected` label is not empirical proof on its own, and the label stays `flaky/suspected` |
| The confirmation was not measured at all — check-run `failure`, no `flaky-repro` check-run, the 30-minute wait elapsed, or no readable `### Repro result` comment for this commit (Step 2, 2-E) | MEDIUM at best, never HIGH — nothing was measured, which is not proof of anything in either direction. Say explicitly that the required confirmation measurement never produced a tally, distinct from "measured and failed every run" above, and that the issue's existing static evidence (e.g. matrix divergence, a diff/PR mismatch) does not substitute for it. This is a `flaky/needs-decision` stop at Step 2; if a human decision brought the investigation back here, state which reading of the evidence that decision supplied |
| Proposed fix is a bare timeout increase, with no check for whether the test's cost scales with a parameter (see the Step 3 guardrail) | MEDIUM at best — go back and check for a redesign before treating this as HIGH, even if the diff is small and clean |
| CI evidence and the repro tally together do not localize a cause | LOW |

**In `autonomous` mode:**
- **HIGH** → proceed to Step 5 automatically. State the category and planned fix.
- **MEDIUM or LOW** → stop and ask, presenting: reproduction result, suspected
  category, why confidence isn't HIGH, and a recommendation among: 1) proceed
  with the best-guess fix, 2) quarantine with a comment linking this issue
  (only ever a stop-gate outcome, never an autonomous default), 3) escalate
  for human review of the product code, 4) close as unable to reproduce after
  N cycles (only if reproduction attempts genuinely found nothing across
  every method in Step 2).

**In `interactive` mode:** always ask.

**Quarantine guardrail**: never mark a test `.skip`/`.todo` as the
autonomous-HIGH default outcome. Quarantine is legitimate only as an
explicitly chosen MEDIUM/LOW-gate outcome (interactive approval, or
autonomous only when the category is "Environment timing" with no code path
to fix), and the quarantine commit must reference this issue number in a
comment so it is discoverable later.

---

## Step 5: Implement

### 5-A: Branch

```bash
ISSUE_NUMBER=11823
FIX_BRANCH="fix/flaky-${ISSUE_NUMBER}-{short-description}"   # short slug, [a-z0-9-]

git fetch origin master
git checkout -b "$FIX_BRANCH" origin/master
```

Cut it from `origin/master` for the reason 2-B spells out: a workflow only
runs if its file exists on the pushed ref, so a fix branch based on a commit
that predates `.github/workflows/flaky-repro.yml` produces no `flaky-repro`
check-run at all, and 6-B would then have nothing to gate on.

### 5-B: Fix

Apply the fix matching the Step 3 category. Whatever the category, the
verification bar is higher than a normal bug fix: a flaky test that "looks
fixed" after one green run has not been shown to be fixed.

Both essential-test-design and essential-test-patterns skills apply here —
consult them if the fix touches test code, same as any other test change in
this repo (`.claude/rules/testing.md`).

**Verification comes before the PR, not after it.** The fix commit carries a
Repro Request of its own (5-C), so pushing the branch measures the fix the
same way Step 2 measured the flake: the repro workflow replays the spec three
times against the fixed code and posts the tally to the tracking issue, while
`ci-app.yml` runs the ordinary suites on the same commit. Step 6 reads both
and only then decides whether a PR is opened at all. If the environment
happens to support local execution (probed in Step 2), run that too as a fast
pre-push sanity check, but it never substitutes for the measurement in Step 6.

### 5-C: Commit

The fix commit's message **ends** with the Repro Request trailer block — that
is what makes the push measurable. Git reads only the **last paragraph** of a
message as trailers, so `Fixes #{ISSUE_NUMBER}` may come before the block but
never after it, and the five trailers must be consecutive lines inside a
single `-m`: splitting them across several `-m` flags puts each in its own
paragraph and the workflow then sees only the last one (measured in task
1.1/1.6 of the flaky-ci-closed-loop spec).

**The same applies to this session's own signature lines.** Commits made from
Claude Code end with `Co-Authored-By:` and `Claude-Session:` trailers, and
those must go **inside that same final paragraph**, alongside the
`Flaky-Repro-*` lines — never as a paragraph of their own after them. A blank
line between the two groups makes the signature the last paragraph, which
means git reports only `Co-Authored-By` / `Claude-Session` as trailers, the
workflow sees no `Flaky-Repro-Spec`, and the push measures nothing. Use the
exact signature lines this session was given, in place of the placeholders
below:

```bash
# $ISSUE_NUMBER is the one 5-A set.
SPEC_PATH='src/server/routes/apiv3/g2g-transfer-replace-procedure.exclusive.integ.ts'
PROJECT='app-integration-exclusive'   # derived with 2-A's table

git commit -m "$(printf 'fix(scope): stabilize flaky test — %s\n\nFixes #%s\n\nFlaky-Repro-Spec: %s\nFlaky-Repro-Project: %s\nFlaky-Repro-Mode: file\nFlaky-Repro-Repeat: 3\nFlaky-Repro-Issue: %s\nCo-Authored-By: %s\nClaude-Session: %s\n' \
  '{short root cause}' "$ISSUE_NUMBER" "$SPEC_PATH" "$PROJECT" "$ISSUE_NUMBER" \
  '{Co-Authored-By value for this session}' '{Claude-Session URL for this session}')"

# Confirm git sees all of them as one trailer block before pushing:
git log -1 --format='%(trailers:only=true)'
```

That last command is the check that matters: it must list the five
`Flaky-Repro-*` lines. If it prints only the signature lines, the paragraph
split happened — amend the message rather than pushing.

`Flaky-Repro-Spec` and `Flaky-Repro-Project` are derived exactly as in 2-A
(path relative to `apps/app`, project from the filename suffix), and
`Mode: file` / `Repeat: 3` are the same defaults — here they ask a different
question: not "does this spec ever pass" but "does it pass three times out of
three on the fixed code".

**A Playwright fix carries no trailers.** The repro workflow's project
allowlist is vitest-only, so there is nothing for it to replay. Commit such a
fix with the plain message (`fix(scope): …` plus `Fixes #{ISSUE_NUMBER}`) and
take the Playwright row of 6-B; a trailer-less push to `fix/flaky-**` is
treated as "no request" and its job exits 0 without measuring anything, which
task 1.1 made deliberate so that a Playwright PR is not painted red by a
workflow with no work to do.

---

## Step 6: Verify via Real CI, Then the PR Readiness Gate

The fix branch already carries its own Repro Request (5-C), so verification
happens **on the branch, before any PR exists**: 6-A waits for both
measurements on the fix commit, 6-B decides from them whether a PR is opened
at all, and 6-C opens it — ready for review from the moment it is created.

Step 5 and 6-A through 6-C share shell variables (`$ISSUE_NUMBER`,
`$FIX_BRANCH`, `$FIX_SHA`, `$CHECKS_FILE`, `$REPRO_RESULT_FILE`, `$runs`,
`$failed`). Run them as one script; in a fresh shell, re-establish
`ISSUE_NUMBER` and `FIX_BRANCH` from the values 5-A used and `FIX_SHA` with
`git rev-parse`, rather than inventing new ones. The one pair that must never
be split is the PR creation and its `**Fix PR**:` marker comment in 6-C.

*(The older shape of this step — `gh pr create --draft`, then `gh run rerun` /
`gh run watch` for a repeat-green tally, then `gh pr ready` — is gone, and
none of those commands appears anywhere in this skill any more. A cloud
routine's token has no `actions:write`, so the reruns returned 403, and
marking a PR ready is a GraphQL mutation its session blocks; PRs #11824,
#11853 and #11863 each ended up in draft, with no tally and a paragraph asking
a human to click "Ready for review". The push-triggered repro workflow
replaces the tally, and REST PR creation replaces the draft/ready dance.)*

### 6-A: Push the fix and wait for both measurements

```bash
# $ISSUE_NUMBER and $FIX_BRANCH are the ones 5-A set.
IS_PLAYWRIGHT_FIX=false   # true only for a Playwright identity, which asks for no measurement (5-C)

git push -u origin "$FIX_BRANCH"
FIX_SHA=$(git rev-parse HEAD)

CHECKS_FILE="${TMPDIR:-/tmp}/flaky-fix-checks-${ISSUE_NUMBER}.json"
STARTED=$(date +%s)
STARTUP_GRACE=$(( STARTED + 5 * 60 ))
DEADLINE=$(( STARTED + 45 * 60 ))

# Newest check-run per name. A commit carries two entries per job once a PR
# exists (push event + pull_request event), and a superseded push leaves
# `cancelled` ones behind; evaluating every entry would let a stale one block
# the gate with no way out but the timeout.
CHECKS_JQ='[ flatten[] | .check_runs[] ] | group_by(.name) | map(sort_by(.started_at) | last)'

while :; do
  gh api "repos/growilabs/growi/commits/${FIX_SHA}/check-runs?per_page=100" \
    --paginate --slurp | jq "$CHECKS_JQ" > "$CHECKS_FILE"

  repro_status=$(jq -r '[ .[] | select(.name == "flaky-repro") ] | last | .status // "absent"' "$CHECKS_FILE")
  ci_total=$(jq '[ .[] | select(.name | startswith("ci-app-")) ] | length' "$CHECKS_FILE")
  ci_pending=$(jq '[ .[] | select(.name | startswith("ci-app-")) | select(.status != "completed") ] | length' "$CHECKS_FILE")
  now=$(date +%s)

  if [ "$ci_total" -gt 0 ] && [ "$ci_pending" -eq 0 ] \
     && { [ "$repro_status" = 'completed' ] || [ "$IS_PLAYWRIGHT_FIX" = true ]; }; then
    break
  fi

  # Nothing started within the grace period: the trigger never matched, and
  # waiting out the other 40 minutes would only delay the same answer.
  if [ "$now" -ge "$STARTUP_GRACE" ]; then
    if [ "$ci_total" -eq 0 ]; then
      echo 'no ci-app-* check-run within 5 minutes — not measured'
      break
    fi
    if [ "$IS_PLAYWRIGHT_FIX" != true ] && [ "$repro_status" = 'absent' ]; then
      echo 'no flaky-repro check-run within 5 minutes — not measured'
      break
    fi
  fi

  if [ "$now" -ge "$DEADLINE" ]; then
    echo 'wait capped at 45 minutes'
    break
  fi
  sleep 60
done

jq -r '.[] | select(.name == "flaky-repro" or (.name | startswith("ci-app-")))
       | "\(.name)\t\(.status)\t\(.conclusion)"' "$CHECKS_FILE"
```

**Which checks count.** Take **every** check-run whose name starts with
`ci-app-`; do not hardcode a list. Today `ci-app.yml` produces
`ci-app-lint (24.x)`, `ci-app-test (24.x, 6.0)` and `(24.x, 8.0)`,
`ci-app-test-integration (24.x, 8.0, 8, 8.19.16)` and `(24.x, 8.0, 9, 9.3.3)`,
and `ci-app-launch-dev (24.x, 6.0)` and `(24.x, 8.0)` — but those matrix cells
change with the supported Node and MongoDB versions, and the `ci-app-` prefix
is the stable part. `test-prod-node24 / …` (`ci-app-prod.yml`) is **not** part
of this gate: that workflow's push trigger is an allowlist of `master` and
`dev/*`, so it never runs on a fix branch.

45 minutes is the cap for the whole wait, not per check: `ci-app-test-integration`
alone usually takes 20–30 minutes, while the repro workflow's three file-mode
runs finish long before it.

Two endings leave the wait without a measurement. Both route to 6-B's "not
measured" row, and both are visible within about five minutes — which is why
the loop leaves after `$STARTUP_GRACE` instead of burning the full 45:

- **no `flaky-repro` check-run appears** — the branch name did not match
  `fix/flaky-**`, or its base predates `flaky-repro.yml` (5-A);
- **no `ci-app-*` check-run appears** — `ci-app.yml`'s push trigger has a
  `paths` filter, so a fix touching nothing under `apps/app/**`, `packages/**`
  or the listed root files starts no run at all.

Then read the tally **for this commit** — 2-D's pipeline with `$FIX_SHA`:

```bash
REPRO_RESULT_FILE="${TMPDIR:-/tmp}/flaky-fix-repro-${ISSUE_NUMBER}.md"

gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/comments?per_page=100" --paginate --slurp \
  | jq -r --arg sha "$FIX_SHA" '
      [ flatten[]
        | select(.body | startswith("### Repro result"))
        | select(.body | split("\n") | any(. == "- Commit: " + $sha)) ]
      | last // empty | .body' > "$REPRO_RESULT_FILE"

grep -m1 -E '^- Runs:' "$REPRO_RESULT_FILE"
grep -m1 -E '^- Failed:' "$REPRO_RESULT_FILE"
```

Pinning on `- Commit: ${FIX_SHA}` matters more here than at 2-D. The issue
already holds the confirmation measurement's result — a different commit,
usually with a non-zero `- Failed:` — and reading "the newest comment" would
report whichever of the two happened to land last. An **empty**
`$REPRO_RESULT_FILE` is not an error: it is the "not measured" reading, and
`grep` printing nothing is exactly how that shows up. The three `gh`/`jq`
details behind this pipeline (`--slurp` cannot be combined with `-q`,
`--paginate -q` filters each page separately, jq's `"m"` flag does not anchor
per line) are documented at 2-D, and `grep -m1` is there for the same reason:
the comment ends with an excerpt of the run's output, which can itself contain
a line starting with `- Failed:`.

### 6-B: The PR gate — decided here, and only here

**A PR is created if and only if all three of these hold for `$FIX_SHA`:**

1. the `### Repro result` comment pinned to `$FIX_SHA` exists and reads
   `- Failed: 0`, with `- Runs:` at least the repeat that was requested
   (3 by default);
2. at least one `ci-app-*` check-run exists on `$FIX_SHA`, and **every** one
   of them has `conclusion == "success"` (an empty set is "nothing ran", not
   "nothing failed" — it never passes this condition);
3. the diff touches only what Step 3 identified: a test-side fix stays inside
   the spec file and its fixtures; a product-side fix stays inside the module
   Step 3 named. Anything wider is MEDIUM — the tally proves the spec is
   stable, not that the extra code is right.

Anything else means **no PR**. There is no partial credit and no second place
where this call is made: 6-C assumes the gate has already been passed.

```bash
runs=$(grep -m1 -E '^- Runs:' "$REPRO_RESULT_FILE" | sed 's/^- Runs: *//')
failed=$(grep -m1 -E '^- Failed:' "$REPRO_RESULT_FILE" | sed 's/^- Failed: *//')
ci_not_success=$(jq -r '[ .[] | select(.name | startswith("ci-app-"))
                          | select(.conclusion != "success")
                          | "\(.name)=\(.conclusion)" ] | join(", ")' "$CHECKS_FILE")

echo "repro:  Runs=${runs:-none}  Failed=${failed:-none}"
echo "ci-app not success: ${ci_not_success:-none}"
```

**Why the check-run's own conclusion cannot stand in for condition 1.** A push
to `fix/flaky-**` whose commit carries no trailers is treated as "no request":
the job exits 0 and its check-run is `success` having measured nothing. A
comment that never arrived (a locked issue, a momentary GitHub outage) leaves
the same green check-run behind, since the posting step deliberately does not
fail the job. So `success` here means "nothing broke", never "the fix was
measured" — the `- Failed:` and `- Runs:` lines are the evidence, and their
absence is a "not measured" reading.

**A Playwright fix takes this gate with condition 1 removed** (that is what
`IS_PLAYWRIGHT_FIX=true` marks in 6-A), because it requested no measurement:
conditions 2 and 3 open its PR, and the Verification section says where the
real evidence comes from instead (6-C). The `flaky-repro` check-run on such a
commit is the no-op `success` just described — ignore it.

| Reading | Confidence | What happens |
|---|---|---|
| Conditions 1, 2 and 3 all hold | HIGH | open the PR (6-C) |
| Conditions 1 and 2 hold, condition 3 does not — the diff reached beyond what Step 3 identified | MEDIUM | no PR; stop and ask, quoting the tally and naming the files outside the expected scope |
| Condition 1 fails with `- Failed:` ≥ 1 — the spec still fails on the fixed code | LOW | no PR; the fix does not work. Quote the failing run's excerpt |
| Condition 2 fails — some `ci-app-*` conclusion is not `success` (`failure`, `cancelled`, `timed_out`), or no `ci-app-*` check-run exists at all | LOW | no PR; the fix broke something, the push was superseded (measure the next push's SHA), or `ci-app.yml`'s `paths` filter never matched |
| Condition 1 fails for want of a measurement — no `### Repro result` comment for `$FIX_SHA`, no `- Runs:` line, or `- Runs: 0`, including the 45-minute cap and 6-A's two early exits | MEDIUM at best, never HIGH | no PR; nothing was measured, which is evidence in neither direction |
| Playwright fix (condition 1 does not apply) with conditions 2 and 3 holding | HIGH | open the PR (6-C) |

**Autonomous**: HIGH → 6-C. MEDIUM or LOW → no PR; pause as below.
**Interactive**: always ask, using the same readings.

When the gate is not passed, leave the branch pushed — it is the evidence —
write what failed to the tracking issue, add `flaky/needs-decision`, and stop:

```bash
gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/comments" -X POST -f body="$(cat <<EOF
**Fix gate not passed** — no PR was opened.

- Fix commit: \`${FIX_SHA}\` on \`${FIX_BRANCH}\`
- Condition 1 (repro tally): {\`- Runs:\` / \`- Failed:\` for this commit, or "no result comment for this commit"} ({check-run URL})
- Condition 2 (normal CI): ${ci_not_success:-all ci-app-* success}
- Condition 3 (scope): {the files the diff touches, against what Step 3 identified}
- {one-line reading of which condition failed, pointing at the excerpt in the result comment when there is one}
- Recommendation: {one line}
EOF
)"

gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/labels" -X POST -f 'labels[]=flaky/needs-decision'
```

Leave the phase label at `{EXACT_PHASE_UNDER_INVESTIGATION_LABEL}` — the
investigation is paused, not resolved — and open the comment with a bold
lead-in rather than a `###` heading, for the reason 2-E gives.

### 6-C: Open the PR, ready for review, by REST

The gate is 6-B; do not re-derive the condition here.

Create the PR and post the marker comment in the **same shell invocation** —
`$PR_HTML_URL` lives only as long as the shell that set it, and a separate
tool call starts a fresh one with no memory of it:

```bash
PR_BODY_FILE="${TMPDIR:-/tmp}/flaky-fix-pr-body-${ISSUE_NUMBER}.md"
REPRO_RUN_URL=$(grep -m1 -E '^- Workflow run:' "$REPRO_RESULT_FILE" | sed 's/^- Workflow run: *//')
CI_RUN_URL=$(gh api "repos/growilabs/growi/actions/workflows/ci-app.yml/runs?head_sha=${FIX_SHA}&per_page=1" \
  -q '.workflow_runs[0].html_url')

cat > "$PR_BODY_FILE" <<EOF
## Summary

{description of the fix}

## Root Cause

{category from Step 3 + specific mechanism}

## Verification

- Repro workflow on this fix commit (\`${FIX_SHA}\`): \`- Runs: ${runs}\`,
  \`- Failed: ${failed}\` — the spec was replayed ${runs} times against the
  fixed code without a single failure. ${REPRO_RUN_URL}
- Normal CI on the same commit: every \`ci-app-*\` check \`success\`. ${CI_RUN_URL}

Fixes #${ISSUE_NUMBER}
EOF

PR_HTML_URL=$(gh api repos/growilabs/growi/pulls -X POST \
  -f title="fix: stabilize flaky test in {short scope}" \
  -f head="$FIX_BRANCH" \
  -f base=master \
  -F draft=false \
  -F "body=@${PR_BODY_FILE}" \
  -q '.html_url')

gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}/comments" -X POST \
  -f body="**Fix PR**: ${PR_HTML_URL}"
```

`-F draft=false` is the whole of the readiness story: `-F` converts the
literal `false` into a JSON boolean, which is what the endpoint's `draft`
field expects — use `-F` here, not `-f`, which sends every value as a string.
`-F "body=@<path>"` reads the field's value from a file, which keeps a
multi-paragraph Markdown body out of the argument list.

The marker must be its own comment — a fixed one-line marker, never appended
to another comment — and its exact text must be `**Fix PR**: {PR_HTML_URL}`.
That exact string is what the Dashboard Updater matches on, so do not add a
heading or extra wording that would break the match, and do not reuse
`detect-flaky-ci`'s `### Additional observation` / `### Backfilled observation`
headings here: this comment is deliberately excluded from that issue's
observation count.

**For a Playwright fix**, replace the Verification section with this — there
is no repro tally to quote, and the end-to-end evidence arrives later:

```markdown
## Verification

- Normal CI on this commit: every `ci-app-*` check `success`. {ci-app run URL}
- End-to-end verification is delegated to the `run-playwright` job in this
  PR's CI pipeline. It does not run on a fix-branch push, and
  `reusable-app-prod.yml` gates it on `head_ref` starting with
  `mergify/merge-queue/`, so it executes when this PR enters the merge queue,
  with Playwright's own `retries: 2` on top. If the spec still needs a retry
  there, `detect-flaky-ci` observes it and the tracking issue comes back.
```

Then move the issue's phase label. Read the current set and PATCH it back as
one array:

```bash
LABELS_FILE="${TMPDIR:-/tmp}/flaky-fix-labels-${ISSUE_NUMBER}.json"

gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}" -q '[.labels[].name]' \
  | jq -c --arg rm '{EXACT_PHASE_UNDER_INVESTIGATION_LABEL}' \
          --arg add '{EXACT_PHASE_RESOLVED_LABEL}' \
          '{labels: ((map(select(. != $rm)) + [$add]) | unique)}' > "$LABELS_FILE"

gh api "repos/growilabs/growi/issues/${ISSUE_NUMBER}" -X PATCH --input "$LABELS_FILE"
```

Fetch the exact label names first (`gh api repos/growilabs/growi/labels
--paginate -q '.[].name'`, as the Precondition already requires) — never
hardcode them. The whole-array PATCH is used here instead of 2-E's
`POST /labels` plus `DELETE /labels/{name}` pair because the phase labels
begin with an emoji (`1️⃣`, `5️⃣`), which a DELETE would have to carry
percent-encoded in the URL path, while PATCH keeps the name in the JSON body.
PATCH replaces the entire set, so it must be computed from the labels read
immediately before it — which is also what keeps `flaky/confirmed` on the
issue.

### 6-D: There is no ready-flip step

The PR is ready for review the moment 6-C creates it, so nothing follows.
Turning a draft PR into a ready one is `markPullRequestReadyForReview`, a
GraphQL-only mutation with no REST equivalent — `PUT .../ready_for_review`
404s, and a direct `PATCH .../pulls/{n} -F draft=false` was tried on #11824
and did not flip it — and a cloud routine's session blocks GraphQL. Creating
the PR non-draft removes that dependency entirely: readiness is decided by
6-B's gate, before the PR exists, rather than by a state change afterwards.

`flaky/confirmed` stays on the issue — it is a permanent record that this was
a real, confirmed flake, not something to remove on resolution. If the same
identity key resurfaces after this merges, `detect-flaky-ci`'s "existing
CLOSED issue found" path reopens it automatically; that recurrence check is
the long-term backstop this skill's verification ultimately relies on, on top
of 6-B's tally.

---

## Error Handling

- Any `gh issue`/`gh label`/`gh pr` command fails with a GraphQL/proxy error
  (e.g. "This GraphQL query is not enabled for this session"): switch that
  specific call to its `gh api` REST equivalent and continue — see
  `detect-flaky-ci`'s Error Handling for the same note and example mutation
  form. `gh run ...` commands (Actions API) are never affected by this,
  since Actions has no GraphQL API to begin with.
- Issue is neither `flaky/confirmed` nor `flaky/suspected`: stop, do not
  investigate (see Precondition).
- The fix commit's `flaky-repro` check-run is absent or `failure`, or it
  completed without a `### Repro result` comment carrying that commit's SHA
  (Step 6-A): the fix was **not measured**. Do not read a `success`
  conclusion as verification — a trailer-less push and a comment that failed
  to post both leave the check green — and do not let Step 2's confirmation
  tally or a fully green `ci-app-*` set stand in for it. Open no PR, post
  what happened, add `flaky/needs-decision`, end the comment with a
  `- Recommendation:` line, and stop. (A Playwright fix is the one exception,
  and only because it requests no measurement: its gate is the `ci-app-*` set
  plus the scope condition — see Step 6-B.)
- A human approves proceeding with a best-guess fix at a MEDIUM gate for an
  issue that came in as `flaky/suspected` and whose confirmation measurement
  came back `Failed == Runs` (Step 2/Step 4): the label is still
  `flaky/suspected` at that point, not `flaky/confirmed` — do not silently
  promote it, and nothing later in this run changes that. In particular a
  `- Failed: 0` tally at Step 6 is **not** grounds to promote it: that tally
  measures the *fixed* code, and a spec passing after a change says nothing
  about whether the original was non-deterministic. Leave the label as-is and
  let the PR body's Root Cause section carry the caveat that the flakiness was
  never empirically reproduced.
- Reproduction impossible in devcontainer (e.g. browser deps missing): fall
  back to log-based analysis, note the limitation, and do not let this alone
  push confidence below what the CI evidence already supports.
- Fix requires product-code changes with security/auth/data implications:
  treat as MEDIUM or LOW regardless of how clear the race looks — this skill
  is not a substitute for `security-reviewer` on sensitive code paths.
