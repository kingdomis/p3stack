# pstack in T3 Code

pstack skills use Cursor names. This is p3stack's adapter. In T3 Code, read this file once per thread, then map each Cursor name in a skill with the sections below. This file is authoritative: do not also apply `docs/harness/claude-code.md`. If a Cursor field has no row, drop it and say so. Never pass a field or value the tool schema rejects.

- **`<p3stack>`** is the fixed install path `~/.p3stack/tree` (Windows `%USERPROFILE%\.p3stack\tree`). Resolve every relative link against the linking file's own folder inside `<p3stack>` (for a SKILL.md, `<p3stack>/skills/<name>/`; for a nested file, its own folder), never against the folder the skill was loaded from. In a brief, write `<p3stack>` as the absolute path, such as `C:\Users\you\.p3stack\tree`.
- **T3 only.** This tree is for T3 Code. If `delegate_task` is not in your tools, load the T3 tools first (Claude: ToolSearch `select:mcp__t3-code__orchestrator_capabilities,mcp__t3-code__delegate_task,mcp__t3-code__task_status,mcp__t3-code__task_cancel,mcp__t3-code__t3_thread_read,mcp__t3-code__t3_thread_organize,mcp__t3-code__t3_pending_request,mcp__t3-code__t3_thread_search`), or use T3's terminal bridge (`T3_ACP_MCP_CALL` on Windows, for Antigravity and other ACP agents). Only if neither works, say `p3stack needs a T3 Code thread. Use upstream pstack outside T3.` and stop.
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
| `cloud_base_branch: <b>` | Resolve `<b>` to a SHA. The brief's setup step is `git checkout --detach <sha>` in the seat's worktree, and that SHA is the seat's base. |
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

Grammar: `<model-id>-<effort>[-fast]`, effort one of `low`, `medium`, `high`, `xhigh`. Parse as upstream does: if the last token is `fast` and the token before it is an effort, drop the `-fast`. Then the last token is the effort and the rest is the model id. So `claude-opus-5-5-high-fast` is `claude-opus-5-5` at `high`, and `grok-4.7-build-fast-xhigh` is `grok-4.7-build-fast` at `xhigh`. A slug whose last token is not an effort doesn't parse: say so and treat the seat as rejected. The `driverKind` comes from the model id's vendor prefix in this table, so any catalog model resolves, including one the short capabilities list omits:

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
- **One capabilities call per thread.** Call `orchestrator_capabilities` once, before the first `delegate_task`. It serves the mode precondition and instance choice for the whole thread. Right after it, save what the thread needs (`parentThreadId`, `inheritedProviderInstanceId`, `inheritedModel`, `inheritedOptions`, both modes, and each enabled instance's `providerInstanceId`, `driverKind`, and model ids) to `<runs>\caps-<id>.json`, where `<id>` is your `parentThreadId` with every character outside `A-Za-z0-9._-` replaced by `-` (thread ids contain `:`, which Windows file names can't). If the result is no longer in your context after compaction, read that file. Never call again for that reason.
- **The list is short.** The capabilities result omits models, and its `omittedModels` count (or its absence) says nothing about how many. Dispatch a configured model as configured even when the list omits it: `delegate_task` checks it against T3's full catalog.
- **Missing model.** Only after `delegate_task` rejects a seat's model (`model_unavailable`), read the advertised models the rejection text lists. If it lists none, make one `orchestrator_capabilities(search:"<family prefix>")` call, such as `search:"claude-opus"` (T3 allows a call after an error; searching for the rejected id finds nothing). Then follow the skill's own rule (the nearest same-family slug that is advertised, or drop the seat) and name the change in your reply. Never pick a model the models file and skill don't name. Any other substitution needs the user's say-so.

## Seats

### Routing

A role resolves to a seat target. The seat is a **native subagent** only when all of these hold: its `providerInstanceId` and model are yours, it sets no option beyond yours (same effort, no tier change), it needs no worktree, and it is a single helper you wait on in the foreground. Native means Claude `Agent` with `run_in_background:false` and explicit `model` (`opus`, `sonnet`, `haiku`, or `fable`) and `effort`; Codex `spawn_agent`, then wait; Grok's or Antigravity's native subagent tool, then wait. pstack's `run_in_background: true` default does not make a seat a thread, but running beside other seats or past your own work does. **Everything else is a `delegate_task` child thread**, including same-provider seats at another effort and every background or parallel seat. Only you, the lead, dispatch seats: a native subagent can't call `delegate_task`.

Give a cross-provider builder chunky, well-specified work: a named file scope, the data shape, and a verify command. Keep trivial or mechanical edits yourself.

### Dispatch

1. Pass the mode precondition, then record `P=$(git rev-parse HEAD)` and claim a run id and its run folder in one Git Bash command: `r="$(cygpath -u "$USERPROFILE")/.p3stack/runs"; mkdir -p "$r" && for n in 1 2 3 4 5; do id="<skill>-$(date +%Y%m%d-%H%M%S)-$(printf %04x $RANDOM)"; mkdir "$r/$id" 2>/dev/null && { echo "$id"; break; }; done`. Claude's Bash tool is Git Bash, so run it there. From PowerShell, pipe the command, in single quotes, to Git Bash's standard input: `'<command>' | & (Join-Path $env:ProgramFiles 'Git\bin\bash.exe')`. Never pass it with `-c`: Windows PowerShell 5.1 strips its inner double quotes. It builds `<runs>` from `%USERPROFILE%`, never `$HOME`, so it is the folder every other step uses. It prints the run id, `<skill>-<yyyyMMdd-HHmmss>-<4 hex digits>`, and the run folder is `<runs>\<run-id>\`. `mkdir` without `-p` is atomic, so when two runs race for one id exactly one wins and the other draws again; if nothing prints, stop and report it. Never create the run folder from PowerShell: `New-Item` can succeed on a folder another run created a moment earlier. Two runs then never share a folder or a `refs/p3stack/tmp/<run-id>` ref.
2. If any seat must see uncommitted work (a writer that builds on it, or a reviewer such as interrogate's that reviews it), run the snapshot block (below) first. Its `base` is the seats' base.
3. Issue every seat in one turn: one `delegate_task` each with `mode:"async"`, `title:"<skill> · <role> · <slug>"`, **no `role` field**, `interactionMode:"default"`, `isolation:"worktree"` when the seat writes, checks out, builds, or runs code (swarm workers that verify or measure commits included), the full `target` (`driverKind`, `providerInstanceId`, `model`, and every option from the table), and `clientRequestId:"<run-id>-<n>"`.
4. **Record every response at once** in a seat table kept in `<runs>\<run-id>\seats.md` (so compaction can't lose it): rejected (a dropout), accepted (`starting` or `running`), terminal, or cancel-requested, with the `taskId`, `childThreadId`, and a dispatch timestamp from `date`. A response that is already terminal is recorded then. Check a seat's identity by `task_status`'s `model` and `providerInstanceId` and by the `model:` line the seat reports (T3 leaves `executedModel` null for Grok and Antigravity).
5. **Continuation check**, after dispatch and after every state change: if every seat is rejected, terminal, or cancel-requested, continue the skill now (N-1 rules apply; zero results means you report the dropouts). End your turn only while at least one accepted seat is still running and can wake you. Never sleep or poll to wait.

### Briefs

A child gets only its brief. In order:

1. `Read <p3stack>/skills/poteto-mode/worker.md before anything else.`
2. For a `poteto-agent` or `comment-sicko` seat: `Read <p3stack>/agents/<name>.md and follow it.`
3. For a worktree seat: `Run git rev-parse HEAD. If it is not <P>, report that and stop.` Then, with a snapshot, `Run git merge --ff-only <S>.` Name the base SHA.
4. The skill's own task, the skill file paths, the grounding, and the output path. For interrogate, `The change under review is git diff <M> <base>` (add `-- <scope>` only when the user named a scope), with `M` the merge base of the branch with its base branch, resolved while framing. `git status` in the seat is clean, so the SHAs are the only way it sees the change.
5. For a read-only seat: `Do not edit files.`
6. The report: keyed lines anywhere in the final message, `model: <your model id>`, and for a writing seat `worktree: <absolute path>`, `base: <sha>`, `head: <sha>`, `artifact: <path relative to the worktree>`, after committing its own work on top of the base. Interrogate seats give each finding's exact command.

Never put a secret in a brief.

### Collect

- **On each wake, or a completion that arrives as a notice inside your running turn,** handle every task it names (one wake can batch several), skip a task already recorded as terminal, then run the continuation check once. Completion: `task_status(taskId)` for each named task. `completed` records the `summary`. `failed`, `cancelled`, and `interrupted` are dropouts. Find the keyed lines anywhere in the summary, not by position, and check that `base:` equals the base you sent.
- **A question wake** carries `childThreadId` and `requestId`. Answer with `t3_pending_request` if the brief already answers it. Otherwise ask the user.
- **Every `task_cancel` response is handled at once, before the continuation check,** because no wake follows any of them. `cancel_requested` is a dropout, and before settling or cleanup you confirm the stop with one `task_status` (still running: leave it and tell the user). `completed` means the seat won the race, so read its `summary` with one `task_status` and record it as a result. Any other terminal status is a dropout.
- **Approvals** wake no lead turn. The user grants them where T3 shows them. If a run stalls (an approval, a cancel from the T3 UI, or a lost wake), the user sends you any message. On a turn that is not a wake (only then), reconcile: one `task_status` per non-terminal seat in your table, then continue as above.
- **Timeouts.** Panel and read-only seats (arena runners and judge, interrogate reviewers, the show-me-your-work reviewer, `how`) have 45 minutes. On any lead turn, `task_cancel` such a seat whose dispatch timestamp is more than 45 minutes old by `date` and is not yet terminal, and handle the response as above. Builder and swarm seats have no timeout; the user cancels them from T3.
- **Read-only seats** (arena judge, `how`, the show-me-your-work reviewer, recall investigators) run in default mode. Before dispatch, record `git status --porcelain=v2` and `git diff | git hash-object --stdin` in your checkout and, for the judge, in each candidate worktree. Compare afterward and report any change.

### Snapshot block

Run it only when a seat must see uncommitted work. Write the block to `<runs>\<run-id>\snapshot.sh` and run it from your checkout with Git Bash by full path: Claude's Bash tool already is Git Bash; from PowerShell, `& (Join-Path $env:ProgramFiles 'Git\bin\bash.exe') <file> <run-id> [scope-path ...]`. Never inline it through `-c`. No scope paths means the whole tree. It prints `P`, `base`, and `snapshot` (`yes` means `base` is the snapshot `S`).

```bash
#!/usr/bin/env bash
# p3stack snapshot. Usage: snapshot.sh <run-id> [scope-path ...]
set -e
temp=""
trap 'rm -f "$temp"' EXIT
run_id="$1"; shift
named_scope=0; [ "$#" -gt 0 ] && named_scope=1
P=$(git rev-parse HEAD)
paths=()
if [ "$named_scope" = 1 ]; then
  for p in "$@"; do
    if [ -n "$(git ls-tree -r --name-only "$P" -- "$p")" ] || \
       [ -n "$(git ls-files -- "$p")" ] || [ -e "$p" ]; then
      paths+=("$p")
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
git ls-files -s -- "${paths[@]}" | GIT_INDEX_FILE="$temp" git update-index --index-info
GIT_INDEX_FILE="$temp" git add -A -- "${paths[@]}"
tree=$(GIT_INDEX_FILE="$temp" git write-tree)
rm -f "$temp"
if [ "$tree" = "$(git rev-parse "$P^{tree}")" ]; then
  echo "P=$P"; echo "base=$P"; echo "snapshot=no"; echo "reason=scope unchanged"; exit 0
fi
S=$(git commit-tree "$tree" -p "$P" -m "p3stack snapshot $run_id")
git update-ref "refs/p3stack/tmp/$run_id" "$S"
echo "P=$P"; echo "base=$S"; echo "snapshot=yes"
```

While snapshot-based writing seats run, only read, or edit files outside their scope: the graft assumes your checkout still equals the snapshot.

### Handoff and graft

Worktrees share your repo's object store, so you can read a seat's files by path, run `git show <head>:<path>`, and rerun its repros in its worktree. A judge's brief lists each candidate's worktree, base, and head, and it scores `git diff <base> <head>`, never your own uncommitted work. To bring a seat's work into your checkout, write this block to `<runs>\<run-id>\graft.sh` and run it the same way with `<run-id> <base> <head>`. It applies the diff, restores modes that `git apply` drops under `core.filemode=false`, and prints `named: <path>` for each new executable it staged. Name those in your report.

```bash
#!/usr/bin/env bash
# p3stack graft. Usage: graft.sh <run-id> <base> <head>
set -e
run_id="$1"; base="$2"; head="$3"
patch=$(git rev-parse --path-format=absolute --git-path "p3stack-graft-$run_id.patch")
trap 'rm -f "$patch"' EXIT
git diff --binary "$base" "$head" > "$patch"
if [ -s "$patch" ]; then
  git apply "$patch"
else
  echo "empty diff: nothing to graft"
fi
rm -f "$patch"
git diff --raw -z --no-renames "$base" "$head" | {
  while IFS= read -r -d '' meta && IFS= read -r -d '' path; do
    newmode=$(printf '%s' "$meta" | cut -d' ' -f2)
    case "$newmode" in 100644|100755) ;; *) continue ;; esac
    entry=$(git ls-files -s -- "$path" | awk '$3==0' | head -n1)
    if [ -n "$entry" ]; then
      curmode=$(printf '%s' "$entry" | cut -d' ' -f1)
      blob=$(printf '%s' "$entry" | cut -d' ' -f2)
      if [ "$curmode" != "$newmode" ]; then
        git update-index --cacheinfo "$newmode,$blob,$path"
      fi
    elif [ "$newmode" = 100755 ]; then
      git add --chmod=+x -- "$path"
      echo "named: $path"
    fi
  done
}
```

Under `core.autocrlf=true`, `git apply` writes the grafted files with CRLF in the working tree. The content and staged blobs are unchanged.

### After a run

`task_cancel` stragglers and handle each response as above. Delete `refs/p3stack/tmp/<run-id>` (`git update-ref -d`) and the run folder `<runs>\<run-id>\` (keep the thread's caps file). Settle each child with `t3_thread_organize({threadId, action:"settle"})`; never archive (an archived thread refuses messages). A worktree seat leaves its `t3/<slug>` branch and its worktree under `~/.t3/worktrees/<repo>/` after settling. T3's opt-in Storage cleanup removes the worktree; the branch stays until someone deletes it. A new review or re-check is a new `delegate_task`, never a send to an old seat. In the synthesis, link each seat's thread.

## setup-pstack

`setup-pstack` writes `~/.p3stack/pstack-models.md` in place of `~/.cursor/rules/pstack-models.mdc`. Run it in its own thread. Follow its steps with these changes:

- **Detect.** Use your one `orchestrator_capabilities` call. The detected slugs are `<model-id>-<effort>` for each model listed on any enabled instance and each of its effort values among `low`, `medium`, `high`, `xhigh` (never `max`, `ultra`, or `ultrathink`). Offer only choices that call confirms. A default whose model the short list omits is not offered: name it and offer the nearest confirmed same-family slug.
- **Validate** (replaces step 4 for a slug the user types). `inherit-parent` and `auto` always pass. Anything else must parse as `<model-id>-<effort>` with an effort of `xhigh` or below and a known vendor prefix; otherwise ask again. Drop a trailing `-fast` tier suffix and say so. If the call didn't confirm its model, say so and write it only after the user confirms it; a seat checks it at dispatch.
- **Load.** Skip step 2's migration rules. The p3stack file never had legacy values.
- **Defaults.** Step 5's defaults are exactly the Models table above: no Fable in the panels, no `-fast` tier suffix.
- **Budget.** Upstream's ladder, applied to each entry: every slug, panel entries included, takes its own default effort moved by the budget. At `medium`, `claude-opus-5-5-high` becomes `claude-opus-5-5-medium` and each `-xhigh` entry becomes `-high`. Replace "Opus 5.5 always runs its `-fast` slug" with: never write a trailing `-fast` tier suffix after the effort (`grok-4.7-build-fast` keeps the `-fast` inside its model id).
- **Write.** Write the whole file with no frontmatter: the first comment line, `# defaults: 3`, the `# budget` line, then one line per role in the Models table's order above. Leave out upstream's `inherit-parent`/`auto` comment line (it names Cursor's `Task` `model` field); the aliases run the seat on your own target, as in the table above. A re-run with the same answers writes the same bytes.
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
| `date` | In PowerShell `date` is `Get-Date`: use `Get-Date -Format o` for timestamps. Run ids come from the Git Bash command in Dispatch step 1. |
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
