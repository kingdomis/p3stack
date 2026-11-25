# pstack in T3 Code

pstack skills use Cursor names. This is p3stack's adapter. In T3 Code, read this file once per thread, and again after a compaction while a run is open (then find the run whose `<runs>\<run-id>\seats.md` has a `lead:` line equal to your thread id, the `currentThreadId` that `t3_thread_list` returns. If more than one run names you, a run with `phase: cleanup` resumes cleanup and the newest run id is the active skill. Read that table, and run Collect's sweep before any dispatch; a terminal seat's brief and full summary can be re-read with `t3_thread_read` on its thread and `task_status`), then map each Cursor name in a skill with the sections below. This file is authoritative: do not also apply `docs/harness/claude-code.md`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

- **`<p3stack>`** is the fixed install path `~/.p3stack/tree` (Windows `%USERPROFILE%\.p3stack\tree`). Resolve every relative link against the linking file's own folder inside `<p3stack>` (for a SKILL.md, `<p3stack>/skills/<name>/`; for a nested file, its own folder), never against the folder the skill was loaded from. In a brief, write `<p3stack>` as the absolute path, such as `C:\Users\you\.p3stack\tree`.
- **T3 only.** This tree is for T3 Code. If `delegate_task` is not in your tools, load the T3 tools first (Claude: ToolSearch `select:mcp__t3-code__orchestrator_capabilities,mcp__t3-code__delegate_task,mcp__t3-code__task_status,mcp__t3-code__task_cancel,mcp__t3-code__t3_thread_read,mcp__t3-code__t3_thread_list,mcp__t3-code__t3_thread_organize,mcp__t3-code__t3_pending_request,mcp__t3-code__t3_thread_search`), or use T3's terminal bridge (`T3_ACP_MCP_CALL` on Windows, for Antigravity and other ACP agents). Only if neither works, say `p3stack needs a T3 Code thread. Use upstream pstack outside T3.` and stop.
- **Mode precondition.** A skill that starts seats needs a lead whose own `orchestrator_capabilities` result shows `interactionMode` `default` and `runtimeMode` `full-access`. Otherwise say so and stop. A child can't run in a broader mode than its lead.
- **Run state** lives in `<runs>` = `~/.p3stack/runs` (Windows `%USERPROFILE%\.p3stack\runs`), never `%TEMP%`, which is per-session for Antigravity.
- **Models file.** Ignore any `~/.claude/rules/pstack-models.md` role lines (upstream pstack's file). The p3stack file is `~/.p3stack/pstack-models.md` (see Models).

## Tools

| Cursor | T3 Code |
| --- | --- |
| `Task` | A seat. See Seats for when it is a native subagent and when it is a `delegate_task` child thread. |
| `AskQuestion` | Your provider's native question tool (Claude `AskUserQuestion`). Without one, ask in plain text. |
| Open a todolist, or copy steps into the todolist tool | Your provider's native todo or plan tool (Claude `TodoWrite`, Codex `update_plan`). Without one, keep the list in your reply and update it at each phase. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<p3stack>/skills/<name>/SKILL.md` and follow it. Claude's `Skill` tool refuses `disable-model-invocation` skills. When you tell the user to type it, write `/p3stack:<name>` on Claude and the bare `<name>` on Codex, Grok, and Antigravity. On Grok, if a native Grok skill shadows the name, use the plugin-qualified `p3stack:<name>`. |
| `Grep`, `Glob` | Your shell with `rg` when there is no search tool. |

## Subagent fields

| Cursor | T3 Code |
| --- | --- |
| `subagent_type: generalPurpose` | Native: Claude `general-purpose`, Codex `spawn_agent`. Thread: a plain brief. |
| `poteto-agent`, `comment-sicko` | Native Claude: `p3stack:poteto-agent`, `p3stack:comment-sicko`. Thread, or a non-Claude lead: brief line 2 is `Read <p3stack>/agents/<name>.md and follow it.` |
| The `model:` line in `poteto-agent`'s file | A Cursor slug. Never pass it. Every native `Agent` call that spawns `p3stack:poteto-agent` passes `model` and `effort` from the seat's slug. |
| `readonly: true` | A read-only seat (see Seats). Native Claude: `Explore`. The brief says `Do not edit files.`, and you compare the baseline afterward. |
| `readonly: false` | Default. T3 children keep the T3 MCP tools. |
| `environment: "cloud"` | A `delegate_task` seat with `isolation:"worktree"` on this machine. Never `target.environmentId`. |
| `environment: "local"` | A seat with no `isolation` (it runs in your checkout). Use it only for a seat that reads, never for parallel writers. |
| `cloud_base_branch: <b>` | Resolve `<b>` to a SHA. The brief's setup step is `git checkout --detach <sha>` in the seat's worktree instead of the `P` check and snapshot merge (Briefs item 3), and that SHA is the seat's base. |
| `run_in_background: true` | Ignore it for routing. See Seats, Routing. |
| `resume` | A fresh `delegate_task` with the earlier result pasted into its brief. Never `t3_thread_send` to a settled seat (skipped in v1). |
| `file_attachments` | List the absolute paths in the brief. |

## Models

Read `~/.p3stack/pstack-models.md` (Windows `%USERPROFILE%\.p3stack\pstack-models.md`) before any skill that names a role. It replaces Cursor's `~/.cursor/rules/pstack-models.mdc` and nothing loads it for you. If the file doesn't exist, or a role's line is missing, use the defaults below, never the skill's own upstream default:

```
feature, refactoring: claude-opus-5-5-xhigh
bug-fix: claude-opus-5-5-xhigh
perf-issue: claude-opus-5-5-xhigh
hillclimb: claude-opus-5-5-xhigh
judgment and prose: claude-opus-5-5-xhigh
swarm workers: claude-opus-5-5-high
arena runners: claude-opus-5-5-high, gemini-4-neon-xhigh, gpt-6.2-sol-xhigh, grok-4.7-build-fast-xhigh
arena cross-judge pool: gpt-6.2-sol-xhigh, gemini-4-neon-xhigh, grok-4.7-build-fast-xhigh, claude-opus-5-5-high
interrogate reviewers: claude-opus-5-5-high, gemini-4-neon-xhigh, gpt-6.2-sol-xhigh, grok-4.7-build-fast-xhigh
```

A skill's own default slug (such as `claude-fable-5-2-high` or `claude-opus-5-5-high-fast`) is used only where neither the file nor this table has the role.

### Slug to seat target

`inherit-parent` and `auto` are aliases, resolved first by the last table row below. Every other slug follows the grammar `<model-id>-<effort>[-fast]`, effort one of `low`, `medium`, `high`, `xhigh`. Parse as upstream does: if the last token is `fast` and the token before it is an effort, drop the `-fast`. Then the last token is the effort and the rest is the model id. So `claude-opus-5-5-high-fast` is `claude-opus-5-5` at `high`, and `grok-4.7-build-fast-xhigh` is `grok-4.7-build-fast` at `xhigh`. A slug whose last token is not an effort doesn't parse: say so and treat the seat as rejected. The `driverKind` comes from the model id's vendor prefix in this table, so any catalog model resolves, including one the short capabilities list omits:

| Prefix (examples) | `driverKind` | Effort option | Other options, always passed |
| --- | --- | --- | --- |
| `claude-` (`claude-opus-5-5`, `claude-sonnet-5-5`, `claude-haiku-5-5`, `claude-fable-5-2`) | `claudeAgent` | `effort` | `ultracode:false`. Also `fastMode:false` on a model that offers it (Opus, Fable) unless the user asks for fast mode. A trailing `-fast` in a slug is ignored. |
| `gemini-` (`gemini-4-neon`, `-carbon`, `-argon`, `-hydrogen`) | `antigravity` | `thought_level` | none |
| `grok-` (`grok-4.7-build-fast`, `grok-4.7`) | `grok` | `reasoningEffort` | none. "Fast" is part of the model id. |
| `gpt-` (`gpt-6.2-sol`, `gpt-6.2-astra`, `gpt-6.1-sol`, `gpt-6-astra`) | `codex` | `reasoningEffort` | `serviceTier:"default"` unless the user asks for fast mode (`priority`) |
| `inherit-parent`, `auto` | yours | yours | yours. Through `delegate_task` it still passes `ultracode:false`, `fastMode:false`, and `serviceTier:"default"` where the model offers them. |

Families for the skills' same-family fallback rules are the ones arena Phase A defines (`claude-fable-*`, `claude-*`, `gemini-*`, and otherwise the text before the first hyphen, so `gpt` and `grok`). The vendor for the judge check is the `driverKind`, so Fable counts as Claude.

- **Instance.** Vendor and family go by `driverKind`, never `providerInstanceId`. For a seat whose `driverKind` is yours, use your `inheritedProviderInstanceId`. Otherwise, for `claudeAgent`, use the default Claude instance: in `~/.t3/userdata/settings.json` `providerInstances`, the entry with `driver: "claudeAgent"`, not `enabled: false` (a missing `enabled` counts as enabled), whose `config.homePath` is unset or, after expanding `~` and normalizing separators and case, equals `%USERPROFILE%\.claude`. If that can't be read, the first listed. For any other `driverKind`, the first enabled instance that lists the model, or, for a model the list omits, the first enabled instance of that `driverKind`.
- **Vendor check.** Your vendor is the `driverKind` of the provider entry whose `providerInstanceId` equals your `inheritedProviderInstanceId`. All Claude models and instances are one vendor. The cross-judge is the first pool entry with another `driverKind`.
- **Always pass the effort.** Defaults differ by machine and model. Never write or pass an effort above `xhigh`.
- **One capabilities call per thread.** Call `orchestrator_capabilities` once, before the first `delegate_task`. It serves the mode precondition and instance choice for the whole thread. Right after it, save what the thread needs (`parentThreadId`, `inheritedProviderInstanceId`, `inheritedModel`, `inheritedOptions`, both modes, and each enabled instance's `providerInstanceId`, `driverKind`, and model ids, each with its effort values) to `<runs>\caps-<id>.json`, where `<id>` is your `parentThreadId` with every character outside `A-Za-z0-9._-` replaced by `-` (thread ids contain `:`, which Windows file names can't). If the result is no longer in your context after compaction, read that file. Never call again for that reason.
- **The list is short.** The capabilities result omits models, and its `omittedModels` count (or its absence) says nothing about how many. Dispatch a configured model as configured even when the list omits it: `delegate_task` checks it against T3's full catalog.
- **Missing model.** Only after `delegate_task` rejects a seat's model (`model_unavailable`): Dispatch step 4 records the row as `fallback pending`, which holds the continuation check, and you resolve it in the same turn (a later turn that finds such a row resumes here). Read the advertised models the rejection text lists. If it lists none, make one `orchestrator_capabilities(search:"<family prefix>")` call, such as `search:"claude-opus"` (T3 allows a call after an error; searching for the rejected id finds nothing). Then follow the skill's own fallback, in its own order (swarm tries the `swarm workers` default from the table above before a same-family slug; others take the nearest advertised same-family slug, or drop the seat), and name the change in your reply. A substitute is a new seat with a new number: in one `seats.md` rewrite, write its `planned` row (Dispatch step 3, naming the seat it replaces) and mark the old row rejected; then dispatch it, in the same turn when the skill's rule allows it. If the rule drops the seat, mark it rejected. Any other substitution needs the user's say-so: mark the row `pending substitution` with the proposed substitute's slug, which still holds the continuation check, and ask in plain text. On a yes, make the same one rewrite, then dispatch. On a no, mark it rejected.

## Seats

### Routing

A role resolves to a seat target. The seat is a **native subagent** only when all of these hold: its `providerInstanceId` and model are yours, it sets no option beyond yours (same effort, no tier change), it needs no worktree, and it is a single helper you wait on in the foreground. Native means Claude `Agent` with `run_in_background:false` and explicit `model` (`opus`, `sonnet`, `haiku`, or `fable`) and `effort`; Codex `spawn_agent`, then wait; Grok's or Antigravity's native subagent tool, then wait. pstack's `run_in_background: true` default does not make a seat a thread, but running beside other seats or past your own work does. **Everything else is a `delegate_task` child thread**, including same-provider seats at another effort and every background or parallel seat. Only you, the lead, dispatch seats: a native subagent can't call `delegate_task`.

Give a cross-provider builder chunky, well-specified work: a named file scope, the data shape, and a verify command. Keep trivial or mechanical edits yourself.

### Dispatch

1. Pass the mode precondition, then record `P=$(git rev-parse HEAD)` and claim a run id and its run folder in one Git Bash command: `r="$(cygpath -u "$USERPROFILE")/.p3stack/runs"; mkdir -p "$r" && for n in 1 2 3 4 5; do id="<skill>-$(date +%Y%m%d-%H%M%S)-$(printf %04x $RANDOM)"; mkdir "$r/$id" 2>/dev/null && { echo "$id"; break; }; done`. Claude's Bash tool is Git Bash, so run it there. From PowerShell, pipe the command, in single quotes, to Git Bash's standard input: `'<command>' | & (Join-Path $env:ProgramFiles 'Git\bin\bash.exe')`. Never pass it with `-c`: Windows PowerShell 5.1 strips its inner double quotes. It builds `<runs>` from `%USERPROFILE%`, never `$HOME`, so it is the folder every other step uses. It prints the run id, `<skill>-<yyyyMMdd-HHmmss>-<4 hex digits>`, and the run folder is `<runs>\<run-id>\`. `mkdir` without `-p` is atomic, so when two runs race for one id exactly one wins and the other draws again; if nothing prints, stop and report it. Never create the run folder from PowerShell: `New-Item` can succeed on a folder another run created a moment earlier. Two runs then never share a folder or a `refs/p3stack/tmp/<run-id>` ref.
2. If any seat must see uncommitted work (a writer that builds on it, or a reviewer such as interrogate's that reviews it), run the snapshot block (below) first. Its `base` is the seats' base.
3. **Before every batch of seats**, the run's first or a later one (a skill's later phase, a respawn, a substitute), write the seat table `<runs>\<run-id>\seats.md` first, so a cut-off or compaction can't lose it:
   - **Header:** `seats: <N>`, then `lead: <your thread id>` (the `currentThreadId` that `t3_thread_list` returns), `P`, the seats' base, `M` when the skill uses one, the skill and phase, this adapter's path, and the inputs the skill's next phase needs (for arena the rubric and candidate labels, and in Phase E the selected base and each integration done so far; for swarm the SHAs, the measurement, and the selection rule), or the path of a file in the run folder that holds them. Rewrite the header whenever these change with no batch to follow, such as on entering arena's Phase E and after each integration lands.
   - **Batch line:** `dispatch: <seat numbers> · session: ?` for this batch. Step 4 fills in the session.
   - **Rows:** one `planned` row per new seat, numbered after any existing seats, with `N` raised to match: `n`, its title, its target, and what it is for (phase, role or slice, and attempt). A respawn or substitute always takes a new number and names the seat it replaces.
   - Seats are numbered 1 to N, and a number with no row is a missing row. Keep the header and every `dispatch:` line on every rewrite.

   Then issue the batch in one turn: one `delegate_task` each with `mode:"async"`, `title:"<run-id>-<n> · <role> · <slug>"` (T3 cuts a child's title to 72 characters, so the run id, which starts with the skill name, comes first and survives), **no `role` field**, `interactionMode:"default"`, `isolation:"worktree"` when the seat writes, checks out, builds, or runs code (swarm workers that verify or measure commits included), the full `target` (`driverKind`, `providerInstanceId`, `model`, and every option from the table), and `clientRequestId:"<run-id>-<n>"`.
4. **Record every response at once:** as soon as the batch's calls return, in the same turn and before any other step, fill in each row and the batch line's session: the part between `command%3Amcp%3A` and the next `%3A` in a returned `taskId`. Calls in one turn normally share it; if two differ, split the line by session. A later turn can have another session. Whenever you fill in or rebuild a row whose batch line has no session, add it from the row's `taskId`. Classify each response:
   - **Accepted** (`starting`, `queued`, `running`, or `waiting`): record the `taskId`, `childThreadId`, and a UTC dispatch timestamp from `date -u`.
   - Already **terminal**: record it as accepted, the same way, then collect it as Completion does (one `task_status` for the summary). If the turn is cut off first, the row is still accepted, so the next sweep collects it.
   - **Rejected**: a returned task that is rejected, or a typed failure. No child exists. A `model_unavailable` row becomes `fallback pending` (see Models, Missing model); any other is rejected.
   - **Uncertain**: `orchestration_error`, a transport error, or no response. T3 may have created the child, possibly a moment later. After every call in the batch has returned, run the id check (Collect) on it once, under each session the batch returned. If the batch returned none, use the session of another batch from this same turn; if there is none, run Collect's sweep once now instead, and a listed child gives the batch its session. Found: record it as above. Otherwise mark the row `unknown`: a later turn's sweep settles it, and Collect's last item asks about it.

   A completion notice that arrives while you dispatch waits until this step is done; then handle it as Collect does, before step 5. If the turn is cut off first, Collect's first item repairs the table on a later turn. Check a seat's identity by `task_status`'s `model` and `providerInstanceId` and by the `model:` line the seat reports (T3 leaves `executedModel` null for Grok and Antigravity).
5. **Continuation check**, after dispatch and after every state change. Continue the skill only when no row is `planned`, `unknown`, `fallback pending`, `pending substitution`, or accepted, and every seat number on a `dispatch:` line has a row. For a number that has none, apply the sweep's rule for a missing row now, then check again.
   - When the skill's own stop rule is met while seats still run (swarm's `first pass`), `task_cancel` the remaining accepted seats, handle each response (Collect), then check again.
   - The skill's own minimums and fallback order come before N-1: arena needs at least two usable runners (with fewer, report the dropouts and go to After a run), and a rejected or dropped judge walks the rest of its pool under the cross-vendor rule. Otherwise N-1 rules apply; zero results means you report the dropouts.
   - If the `seats:` line is lost, re-derive `N` from the `dispatch:` lines and write it back. If the `dispatch:` lines are lost too and no session is known, the table is lost (an accepted residual): tell the user, and continue with the rows you have.

   End your turn only while at least one accepted seat is still running and can wake you, or while you wait on the user: an answer about an `unknown` row, a `pending substitution`, or a seat's question; an approval in T3; or a cancelled seat's stop (say that any message resumes the run). Never sleep or poll to wait.

### Briefs

A child gets only its brief. In order:

1. `Read <p3stack>/skills/poteto-mode/worker.md before anything else.`
2. For a `poteto-agent` or `comment-sicko` seat: `Read <p3stack>/agents/<name>.md and follow it.`
3. For a worktree seat: `Run git rev-parse HEAD. If it is not <P>, report that and stop.` Then, with a snapshot, `Run git merge --ff-only <S>.` A seat with its own base (`cloud_base_branch`) instead gets `Run git checkout --detach <sha>.` Name the seat's base SHA, record it in its row, and check its `base:` against that.
4. The skill's own task, the skill file paths, the grounding, and the output path. For interrogate, `The change under review is git --literal-pathspecs diff <M> <base>` (add `-- <scope>` only when the user named a scope, each path quoted for the seat's shell and relative to the repo root), with `M` the merge base of the branch with its base branch, resolved while framing. `git status` in the seat is clean, so the SHAs are the only way it sees the change.
5. For a read-only seat: `Do not edit files.` For a panel or read-only seat: `You have 45 minutes; report what you have before then.`
6. The report: keyed lines anywhere in the final message, `model: <your model id>`; for every worktree seat also `worktree: <absolute path>` and `base: <sha>`; for a writing seat also `head: <sha>` and `artifact: <path relative to the worktree>`, after committing its own work on top of the base. A judge names the candidate labels it scored. Interrogate seats give each finding's exact command.

Never put a secret in a brief.

### Collect

- **Matching.** A thread or task is seat `n` when the last part of its id (after the final `%3A`) is exactly `<run-id>-<n>`, and, for a listed thread, its `parentThreadId` equals the list result's `currentThreadId`. Never match on a title: titles change and T3 truncates them.
- **The id check** for seat `n`: `task_status` on `node:delegated-task:command%3Amcp%3A<uuid>%3Adelegate-task%3A<run-id>-<n>`, with `<uuid>` the session of the batch line that names `n`. It needs no list, so paging, clipped output, and renames can't hide a seat. `task_not_found` is authoritative only under the session of the seat's own batch.
- **First, on every turn after the run's first dispatch turn** (a wake turn or any other turn) while the run folder exists, before anything below: if `delegate_task` responses from an earlier, cut-off turn are still in your context and not in the table, record them as step 4 does (a `model_unavailable` among them becomes `fallback pending`), but take each dispatch timestamp from the child's `createdAt` in the sweep's list. Then sweep once. A cut-off turn can lose a row or a delivered completion, and this recovers both. A wake for a run whose folder is already deleted needs no action.
  - Call `t3_thread_list` with `includeSubagents:true`, `titleContains:"<run-id>"`, and `limit:100`, following `nextCursor` until it is null.
  - **A `planned`, `unknown`, `not sent`, `dropout (user)`, or missing row whose child is listed:** fill it in as accepted. Its `taskId` is the child's `threadId` with the leading `thread:` replaced by `node:`; its dispatch timestamp is the child's `createdAt`.
  - **A `planned`, `unknown`, or missing row that isn't listed** (a `not sent` or `dropout (user)` row that isn't listed stays as it is): run the id check when its batch has a session. Found: fill it in from the result (a running seat takes `date -u` now as its timestamp; a terminal one is recorded as Completion does). `task_not_found`: `not sent`, a dropout. With no session known for its batch, mark it `unknown`; Collect's last item asks about it. If the user's message on this turn says that seat is not in T3, record `dropout (user)`. Any other answer keeps it `unknown`, and later sweeps keep checking.
  - Never re-send a seat's `delegate_task` to find it: T3 matches `clientRequestId` only within one MCP session, so a re-send on a later turn can start a second copy.
  - **Every accepted row:** if the list shows its child terminal (`completed`, `failed`, `cancelled`, or `interrupted`), its completion may have been delivered in a lost turn. Run one `task_status` and record the result as Completion does. If `task_status` still says `running`, leave the row. If the list shows the child `waiting`, run one `task_status` and handle a pending question or approval as reconcile does.
- **On each wake, or a completion that arrives as a notice inside your running turn,** handle every task it names (one wake can batch several), skip a task already recorded as terminal, then run the continuation check once. A named task that matches seat `n` whose row has no `taskId` fills that row in first, with its `childThreadId` from `task_status`. Completion: `task_status(taskId)` for each named task. `completed` records the `summary`; copy its keyed lines into the row. `failed`, `cancelled`, and `interrupted` are dropouts. A wake for a `stop unconfirmed` seat confirms its stop (`stop confirmed`), and if it `completed`, its summary is a result. Find the keyed lines anywhere in the summary, not by position. For a worktree seat, check that `base:` is present and equals the base you sent; if not, report it and don't graft that seat's work.
- **A question wake** carries `childThreadId` and `requestId`. Answer with `t3_pending_request` if the brief already answers it. Otherwise record the `requestId` and the question in the seat's row as `question relayed`, and ask the user in your reply. When the user answers, write the answer into the row, send it with `t3_pending_request`, and clear the mark only after that call succeeds. On a later turn, send a saved answer first; if T3 says the request is already resolved, clear the mark. Collect's last item asks again about a row with no saved answer on any turn whose user message didn't answer it, since a cut-off turn may have lost the question. Handle each `requestId` once per turn: skip one already in a row or answered this turn.
- **Every `task_cancel` response is handled at once, before the continuation check,** because no wake follows any of them. `cancel_requested` is a dropout for the results, recorded as `cancel-requested, stop unconfirmed`. Before cleanup, confirm the stop with one `task_status`. Still running: leave it unconfirmed and tell the user. Whenever a cancelled seat turns out `completed` (in the cancel response, this `task_status`, or a wake), it won the race: read its `summary` with one `task_status`, record it as a result, and mark it `stop confirmed`. Any other terminal status is a dropout, `stop confirmed`. `task_not_cancellable`: read it with one `task_status` and record it as Completion does.
- **An Interrupt from the T3 UI** on a seat normally wakes you with that seat `interrupted`. A Stop on your own thread also stops its seats, which come back `cancelled`. Handle both as completions (dropouts).
- **Approvals** wake no lead turn. The user grants them where T3 shows them. If a run stalls (an approval, a lost wake, or a UI cancel that didn't wake you), the user sends you any message. On a turn that is not a wake (only then), reconcile after the sweep: one `task_status` per accepted seat that has a `taskId`, and per `stop unconfirmed` seat, to confirm its stop. If it shows `hasPendingQuestion`, list that child's requests with `t3_pending_request` and handle them as a question wake. If a `question relayed` seat shows no pending question, it was answered elsewhere (such as in its thread): clear the mark. If it shows a `pendingApproval`, tell the user which seat waits for approval in T3.
- **Tool errors.** An error from `t3_thread_list`, `task_status`, `task_cancel`, `t3_pending_request`, or `t3_thread_organize` changes no row and is never `task_not_found`. Try the call once more in the same turn; if it fails again, try again on the next turn, and tell the user if no running seat can wake you.
- **Timeouts.** Panel and read-only seats (arena runners and judge, interrogate reviewers, the show-me-your-work reviewer, `how`, recall investigators) have 45 minutes. On any lead turn, `task_cancel` such a seat whose dispatch timestamp is more than 45 minutes old by `date -u` and that is still accepted (not terminal or cancel-requested), and handle the response as above. Builder and swarm seats have no timeout; the user cancels them from T3.
- **Read-only seats** (arena judge, `how`, the show-me-your-work reviewer, recall investigators) run in default mode. Before dispatch, write a baseline to `<runs>\<run-id>\baseline.txt`, in your checkout and, for the judge, in each candidate worktree. Run each command in Git Bash from that repo's root (`cd "$(git rev-parse --show-toplevel)" && set -o pipefail && ...`):
  - `git rev-parse HEAD`;
  - `git status --porcelain=v2`;
  - `git diff --binary --no-relative --no-color --no-ext-diff --no-textconv | git hash-object --stdin`, and the same with `--cached`;
  - the untracked files' names, `git -c core.quotePath=false ls-files -o --exclude-standard | git hash-object --stdin`, and raw bytes, `git -c core.quotePath=false ls-files -o --exclude-standard | sed "/\/$/d" | git hash-object --no-filters --stdin-paths | git hash-object --stdin`. The `sed` drops an embedded repo's folder entry. A non-zero exit, such as a locked file, means the check failed: report it.

  Compare afterward and report any change. The baseline doesn't cover ignored files or embedded repositories; say so when the judge was given such paths.
- **Last, after everything above on this turn:** ask, or ask again (a cut-off turn may have lost the question), about each row still `unknown`, `pending substitution`, or `question relayed` that this turn's user message didn't answer. Ask in plain text in your reply, not with a question tool, and name each seat by `<run-id>-<n>`, the start of its title. For `unknown`, ask whether that seat appears in T3, and say that if it doesn't, you'll record it as a dropout. For `pending substitution`, name the proposed substitute and ask whether to dispatch it. For `question relayed` with no saved answer, repeat the seat's question. Then end your turn.

### Snapshot block

Run it only when a seat must see uncommitted work. Write the block to `<runs>\<run-id>\snapshot.sh` and run it once per run, before the first batch, from your checkout with Git Bash by full path (it works from any folder of the checkout; scope paths are relative to that folder): Claude's Bash tool already is Git Bash; from PowerShell, `& (Join-Path $env:ProgramFiles 'Git\bin\bash.exe') <file> <run-id> [scope-path ...]`. Never inline it through `-c`. No scope paths means the whole tree. It prints `P`, `base`, and `snapshot` (`yes` means `base` is the snapshot `S`), and `skipped=<path>` for a scope path that is git-ignored or matches nothing; tell the user the seats won't see those.

```bash
#!/usr/bin/env bash
# p3stack snapshot. Usage: snapshot.sh <run-id> [scope-path ...]
set -eo pipefail
export GIT_LITERAL_PATHSPECS=1  # a path such as src/[A].js is a name, not a pattern
temp=""
trap '[ -z "$temp" ] || rm -f "$temp" "$temp.new"' EXIT
run_id="$1"; shift
prefix=$(git rev-parse --show-prefix)  # scope paths are relative to where it was run
cd "$(git rev-parse --show-toplevel)"  # every Git path below is from the repo root
named_scope=0; [ "$#" -gt 0 ] && named_scope=1
P=$(git rev-parse HEAD)
paths=()
if [ "$named_scope" = 1 ]; then
  for p in "$@"; do
    p="$prefix$p"
    in_p=$(git ls-tree -r --name-only "$P" -- "$p")  # each lookup stops the script if Git fails
    in_index=$(git ls-files -- "$p")
    untracked=$(git ls-files -o --exclude-standard -- "$p")
    if [ -n "$in_p$in_index$untracked" ]; then
      paths+=("$p")
    else
      echo "skipped=$p"  # git-ignored, or matches nothing
    fi
  done
  if [ "${#paths[@]}" -eq 0 ]; then
    echo "P=$P"; echo "base=$P"; echo "snapshot=no"; echo "reason=named scope resolved to no paths"; exit 0
  fi
else
  paths=(.)
fi
temp=$(git rev-parse --path-format=absolute --git-path "p3stack-idx-$run_id")
rm -f "$temp"
GIT_INDEX_FILE="$temp" git read-tree "$P"
# Your staged state in scope: staged entries, then staged removals.
git ls-files -s -- "${paths[@]}" | awk '$3==0' | GIT_INDEX_FILE="$temp" git update-index --index-info
git diff --cached --no-renames --name-only --diff-filter=D -z "$P" -- "${paths[@]}" | GIT_INDEX_FILE="$temp" git update-index --force-remove -z --stdin
# Your working files in scope: tracked ones as they are now, then untracked ones that aren't ignored.
tracked=()
for p in "${paths[@]}"; do
  in_temp=$(GIT_INDEX_FILE="$temp" git ls-files -- "$p")
  [ -z "$in_temp" ] || tracked+=("$p")
done
if [ "${#tracked[@]}" -gt 0 ]; then
  GIT_INDEX_FILE="$temp" git add -u -- "${tracked[@]}"
fi
# Untracked relative to the temp index, so a conflicted file that P lacks is included.
GIT_INDEX_FILE="$temp" git ls-files -o --exclude-standard -z -- "${paths[@]}" > "$temp.new"
if [ -s "$temp.new" ]; then
  GIT_INDEX_FILE="$temp" git add --pathspec-from-file="$temp.new" --pathspec-file-nul
fi
tree=$(GIT_INDEX_FILE="$temp" git write-tree)
rm -f "$temp" "$temp.new"
if [ "$tree" = "$(git rev-parse "$P^{tree}")" ]; then
  echo "P=$P"; echo "base=$P"; echo "snapshot=no"; echo "reason=scope unchanged"; exit 0
fi
S=$(git commit-tree "$tree" -p "$P" -m "p3stack snapshot $run_id")
git update-ref "refs/p3stack/tmp/$run_id" "$S"
echo "P=$P"; echo "base=$S"; echo "snapshot=yes"
```

While snapshot-based writing seats run, only read, or edit files outside their scope: the graft assumes your checkout still equals the snapshot.

### Handoff and graft

Worktrees share your repo's object store, so you can read a seat's files by path, run `git show <head>:<path>`, and rerun its repros in its worktree. A judge's brief lists each candidate's worktree, base, and head, and it scores `git diff <base> <head>`, never your own uncommitted work. To bring a seat's work into your checkout, write this block to `<runs>\<run-id>\graft.sh` and run it the same way with `<run-id> <base> <head>`. It refuses a head that isn't based on `base`, applies the diff, restores modes that `git apply` drops under `core.filemode=false`, and prints `named: <path>` for each new executable it staged and `symlink: <path>` for each link the seat added or changed (under `core.symlinks=false` Git writes a link as a plain file). Name those in your report. If a graft is cut off or fails after the patch applied, run it again: when every changed path is a regular file (or a deletion) that already matches `head`, it only restores the modes. Otherwise `git apply` stops loudly with nothing changed; then compare your checkout with `head` and finish by hand. If `git apply` refuses a fresh graft (a case-only rename on Windows, for example), nothing is changed either: report it and apply that seat's change by hand.

```bash
#!/usr/bin/env bash
# p3stack graft. Usage: graft.sh <run-id> <base> <head>
set -eo pipefail
export GIT_LITERAL_PATHSPECS=1  # a path such as src/[A].js is a name, not a pattern
run_id="$1"; base="$2"; head="$3"
cd "$(git rev-parse --show-toplevel)"  # apply and stage from the repo root, wherever it was run
patch=$(git rev-parse --path-format=absolute --git-path "p3stack-graft-$run_id.patch")
modes=$(git rev-parse --path-format=absolute --git-path "p3stack-graft-$run_id.modes")
names=$(git rev-parse --path-format=absolute --git-path "p3stack-graft-$run_id.names")
trap 'rm -f "$patch" "$modes" "$names"' EXIT
# A head not built on base would revert work that base holds.
git merge-base --is-ancestor "$base" "$head" || { echo "head $head is not based on $base: not grafting" >&2; exit 1; }
# Fixed format whatever diff.noprefix, diff.relative, diff.context, color, or textconv say.
git diff --binary -U3 --no-relative --no-color --no-ext-diff --no-textconv --src-prefix=a/ --dst-prefix=b/ "$base" "$head" > "$patch"
git diff --raw -z --no-renames --no-relative "$base" "$head" > "$modes"
git diff -z --name-only --no-renames --no-relative "$base" "$head" > "$names"
# Content already matches head (a rerun after a partial graft) only if every changed path is a
# regular file in head whose working file holds head's bytes, or is absent where head deletes it.
# Anything else (a symlink, a folder, a submodule) goes to git apply, which stops loudly if it was applied.
applied=yes
while IFS= read -r -d '' path; do
  entry=$(git ls-tree "$head" -- "$path")  # "<mode> <type> <sha>\t<path>", empty if head deletes it
  if [ -z "$entry" ]; then
    if [ -e "$path" ] || [ -L "$path" ]; then applied=no; break; fi
    continue
  fi
  mode=$(printf '%s' "$entry" | cut -d' ' -f1)
  want=$(printf '%s' "$entry" | cut -d' ' -f3 | cut -f1)
  case "$mode" in 100644|100755) ;; *) applied=no; break ;; esac
  if [ -L "$path" ] || [ ! -f "$path" ]; then applied=no; break; fi
  # Filtered or raw: a blob stored with CRLF matches only raw under core.autocrlf.
  if [ "$(git hash-object -- "$path")" != "$want" ] && \
     [ "$(git hash-object --no-filters -- "$path")" != "$want" ]; then applied=no; break; fi
done < "$names"
if [ ! -s "$patch" ]; then
  echo "empty diff: nothing to graft"
elif [ "$applied" = yes ]; then
  echo "content already matches head: restoring modes only"
else
  git apply --whitespace=nowarn "$patch"
fi
{
  while IFS= read -r -d '' meta && IFS= read -r -d '' path; do
    newmode=$(printf '%s' "$meta" | cut -d' ' -f2)
    case "$newmode" in
      100644|100755) ;;
      120000) echo "symlink: $path (check that it was written and staged as a link)"; continue ;;
      *) continue ;;
    esac
    entry=$(git ls-files -s -- "$path" | awk '$3==0' | head -n1)
    if [ -n "$entry" ]; then
      curmode=$(printf '%s' "$entry" | cut -d' ' -f1)
      blob=$(printf '%s' "$entry" | cut -d' ' -f2)
      if [ "$curmode" != "$newmode" ]; then
        git update-index --cacheinfo "$newmode,$blob,$path"
      fi
    elif [ "$newmode" = 100755 ]; then
      git add -f --chmod=+x -- "$path"
      echo "named: $path"
    fi
  done
} < "$modes"
```

Under `core.autocrlf=true`, `git apply` writes the grafted files with CRLF in the working tree. The content and staged blobs are unchanged.

### After a run

In this order, so a cut-off at any point leaves the table to recover from:
1. `task_cancel` stragglers and handle each response as above. Write the synthesis to `<runs>\<run-id>\synthesis.md` and in your reply, linking each seat's thread; name a seat that never had a thread (rejected, `not sent`, or `dropout (user)`) by its number and outcome.
2. Settle each child that is terminal or `stop confirmed` with `t3_thread_organize({threadId, action:"settle"})`. Never archive: an archived thread refuses messages. If a cancelled seat is still stopping, or a settle still fails after its retry (Tool errors), add `phase: cleanup` to the header of `seats.md`, leave that child unsettled, and don't do step 3. Tell the user which seat is still stopping or unsettled and that any message resumes cleanup. On that turn, reconcile confirms the stop, and `phase: cleanup` means you don't write the synthesis again: show the saved `synthesis.md` in your reply, since a cut-off may have lost it, and go on from this step.
3. Last, once every child is settled, run the sweep once more. If it fills in a `not sent` or `dropout (user)` row, `task_cancel` that seat if it runs, report it, and go back to step 2. If the sweep still fails after its retry, add `phase: cleanup`, don't delete, and tell the user that any message resumes cleanup. Otherwise, delete `refs/p3stack/tmp/<run-id>` (`git update-ref -d`) and the run folder `<runs>\<run-id>\`, keeping the thread's caps file. The folder holds only files. In Git Bash, delete them, then the folder, by the literal path, not a shell variable: `rm -f "<runs-path>/<run-id>"/* && rmdir "<runs-path>/<run-id>"`. Here `<runs-path>` is the Git Bash path that `cygpath -u "$USERPROFILE"` gives, plus `/.p3stack/runs`, such as `/c/Users/<name>/.p3stack/runs`, written out literally. The double quotes survive PowerShell's single-quoted pipe to Git Bash. Never use `rm -r`, `rm -rf`, or a variable in the path, because permission rules commonly stop such commands for approval.

If a later turn finds the run folder already deleted but your reply with the synthesis was cut off, write the synthesis again from your context or the seats' threads (`t3_thread_list` with the run id still finds them).

A worktree seat leaves its `t3/<slug>` branch and its worktree under `~/.t3/worktrees/<repo>/` after settling. T3's opt-in Storage cleanup removes the worktree; the branch stays until someone deletes it. A new review or re-check is a new `delegate_task`, never a send to an old seat.

## setup-pstack

`setup-pstack` writes `~/.p3stack/pstack-models.md` in place of `~/.cursor/rules/pstack-models.mdc`. Run it in its own thread. Follow its steps with these changes:

- **Detect.** Use your one `orchestrator_capabilities` call. The detected slugs are `<model-id>-<effort>` for each model listed on any enabled instance and each of its effort values among `low`, `medium`, `high`, `xhigh` (never `max`, `ultra`, or `ultrathink`). Offer only choices that call confirms. A default whose model the short list omits is not offered: name it and offer the nearest confirmed same-family slug.
- **Validate** (replaces step 4 for a slug the user types). `inherit-parent` and `auto` always pass. For anything else, first drop a trailing `-fast` tier suffix and say so. The rest must parse as `<model-id>-<effort>` with an effort of `xhigh` or below and a known vendor prefix, and when the call lists its model, an effort the call lists for that model (effort ranges differ by model); otherwise ask again. If the call didn't confirm its model, say so and write it only after the user confirms it; a seat checks it at dispatch.
- **Load.** Skip step 2's migration rules. The p3stack file never had legacy values.
- **Defaults.** Step 5's defaults are exactly the Models table above: no Fable in the panels, no `-fast` tier suffix.
- **Budget.** Upstream's ladder, applied to each entry: every slug, panel entries included, takes its own default effort moved by the budget. At `medium`, `claude-opus-5-5-high` becomes `claude-opus-5-5-medium` and each `-xhigh` entry becomes `-high`. Replace "Opus 5.5 always runs its `-fast` slug" with: never write a trailing `-fast` tier suffix after the effort (`grok-4.7-build-fast` keeps the `-fast` inside its model id).
- **Write.** Write the whole file with no frontmatter: the first comment line, `# defaults: 3`, the `# budget` line, then one line per role in the Models table's order above. Leave out upstream's `inherit-parent`/`auto` comment line (it names Cursor's `Task` `model` field); the aliases run the seat on your own target, as in the table above. Write UTF-8 without a BOM, LF line ends, and one final newline. From PowerShell, use `[IO.File]::WriteAllText` with the lines joined by `[char]10`, never `Set-Content` or `Out-File`. A re-run with the same answers writes the same bytes.
- **Confirm.** The file applies to the next skill that reads it, in any thread on this machine.

## Paths

| Cursor | T3 Code |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | The provider's own skill folders: Claude and Grok `.claude/skills/` or `~/.claude/skills/`, Codex `~/.codex/skills/`, Antigravity `~/.gemini/config/skills/`. Ask the user which provider a new skill is for. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | `<p3stack>` and its `plugin.json`. Never search plugin caches for pstack. |
| `.cursor/rules/*.mdc`, always-applied rules | `AGENTS.md`, or `CLAUDE.md` for Claude-only rules. The models file is the exception. See Models. |
| `~/.cursor/rules/pstack-models.mdc` | `~/.p3stack/pstack-models.md` (Windows `%USERPROFILE%\.p3stack\pstack-models.md`). Read it yourself; nothing loads it. Upstream's `~/.claude/rules/pstack-models.md` is not this file. See Models. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | `<p3stack>/<path>` when that file exists. Read the local copy and never fetch it. Give the user the URL when they need a link. |
| Transcripts in `~/.cursor/projects/<slug>/agent-transcripts/` | `t3_thread_read(threadId, view:"activity")` on your own thread and your child threads, and `t3_thread_search` for earlier threads in this project. There is no provider-native transcript fallback in v1. |

## Windows

| Cursor | T3 Code on Windows |
| --- | --- |
| `/tmp/...` | `%TEMP%\...` (Git Bash: `$TEMP`). Arena's non-git fallback (`/tmp/arena-<slug>/candidate-<n>/` when there is no git worktree) is not in v1: arena needs a git-backed T3 project with a `HEAD`, so say so and stop. |
| Running a `.sh` script or the git blocks above | Git Bash by full path, never a bare `bash`, which can resolve to WSL. From PowerShell: `& (Join-Path $env:ProgramFiles 'Git\bin\bash.exe') <script>` (`%ProgramFiles%` does not expand in PowerShell). |
| `date` | In PowerShell `date` is `Get-Date`: use `(Get-Date).ToUniversalTime().ToString('o')` for timestamps, which are UTC like T3's `createdAt`. Run ids come from the Git Bash command in Dispatch step 1. |
| `sleep` to wait | Never. Claude blocks a foreground `sleep`. Wakes deliver results; timeouts use `date`. |

## Cursor-only features

T3 Code has no Cursor Automations, Bugbot, Cursor cloud agents, Cursor's built-in PR tool, Cursor babysit, `/loop`, Custom Modes, or Cursor plugins such as `cursor-team-kit`. When a step needs one, put one line in your reply, `Skipped in T3 Code: <step>. <reason>.`, then go on to the next step. Do not stop, ask, or retry. When a later step needs what the skipped step made, leave a placeholder and name it in the line.

| Cursor | T3 Code |
| --- | --- |
| Cursor Automations: routines, `update_state` routine calls, `api2.cursor.sh/automations` webhooks, routine wakes, and `SendToUser` secret requests | Skip with the line. |
| Bugbot | Bugbot comments on a PR are ordinary review threads, so triage them with the forge command the step gives. Skip a step that starts, waits for, or configures Bugbot. |
| Cursor cloud agents | `environment: "cloud"` maps to a worktree seat, as in Subagent fields. A Project worker or coordinator is a long-lived T3 thread. Skip a step that needs the cloud agent itself. |
| A built-in PR tool | When T3's `pull_request_*` tools are listed, use them (they link the PR to the thread). Otherwise use the forge command the step gives, such as `gh pr create`. That is not a skip. |
| The Babysit playbook, Cursor's babysit skill, `watch-pr` | Skipped in v1. Write the line. |
| The Autonomous run playbook's `/loop` wake and other unattended wakes | Skipped in v1. Write the line. |
| The Worktree cleanup playbook and `worktree-audit.sh` | Skipped in v1 (they read Cursor transcripts and force-remove worktrees). T3 settlement and Storage cleanup handle seat worktrees. |
| `/deslop`, `control-ui`, `control-cli` from `cursor-team-kit` | Skip with the line. For `control-ui`, T3's `preview_*` tools can drive a web UI when the step needs evidence. |
| Custom Modes, Plan Mode, `/loop` (in poteto-help) | Not in T3. A long-lived T3 thread holds a standing task. p3stack seats never use plan mode. |
