# p3stack fork notes

p3stack is [pstack](https://github.com/cursor/plugins/tree/main/pstack) by poteto (Lauren Tan), ported to run from T3 Code threads on Windows. Upstream skill files stay byte-identical. The port is an adapter (`docs/harness/t3-code.md`) plus a generated plugin tree (`harness/t3-code/`), the same pattern upstream uses for Claude Code. License: MIT, unchanged (`LICENSE`).

## Install (per machine)

From PowerShell in this checkout: `pwsh scripts/install-t3.ps1`. It runs a preflight first and changes nothing if any check fails. Then it:

- links `%USERPROFILE%\.p3stack\tree` to `harness\t3-code` (a junction; every skill and brief uses that path)
- installs the Claude Code plugin `p3stack` in `~/.claude` and in each enabled T3 Claude instance's config dir (Grok imports it from `~/.claude`)
- junctions each skill into `~/.codex/skills`, and copies each skill into `~/.gemini/config/skills` for Antigravity (Antigravity skips junctions)

Then, in each open T3 thread, use **Restart agent session** from the command palette (Ctrl+K). Run `setup-pstack` (`/p3stack:setup-pstack` on Claude) once per machine where you start a lead. It writes `~/.p3stack/pstack-models.md`.

## Upstream sync

Don't sync while a p3stack run is active: `<p3stack>` is a junction into this working tree.

Run the p3stack steps in **this checkout**: the one the installer registered (the `p3stack` marketplace and `~/.p3stack/tree` point at it). From another clone or worktree the installer's preflight refuses. Start from `main`, the branch that holds `harness/` (upstream's own `main` lives in `cursor/plugins`), with a clean tree. Run the commands in Git Bash or PowerShell 7 (Windows PowerShell 5.1 rejects `&&`).

```
# in a cursor/plugins clone (e.g. %TEMP%\p3stack-split)
git fetch origin && git checkout origin/main
git subtree split --prefix=pstack -b pstack-upstream
git diff <generatorCommit>..origin/main -- scripts/generate-pstack-harness-trees.mjs   # upstream generator changes to port by hand
# in this p3stack checkout, on main, clean
git fetch <split-clone-path> pstack-upstream
git checkout -b sync/upstream-<date>
git merge --no-ff --no-commit FETCH_HEAD      # to back out: git merge --abort, git checkout main, git branch -D sync/upstream-<date>
git diff --stat <splitCommit>..MERGE_HEAD    # every upstream change, including plugin.json and docs/guide
git diff <splitCommit>..MERGE_HEAD -- skills agents docs   # review behavior changes against t3-code.md
# resolve each conflict and git add it: the generator refuses while a path outside harness/ is unmerged
# update t3/upstream.json (fields below), then git add it and every source you changed (t3-code.md, ported generator code)
node scripts/generate-t3-tree.mjs          # writes harness/, stages it, sets modes
node scripts/generate-t3-tree.mjs --check  # harness/ content, modes, nothing unstaged under harness/
git status                                 # nothing unstaged anywhere: --check doesn't see an unstaged source
git commit                                 # one merge commit: upstream, provenance, regenerated tree
git checkout main && git merge --ff-only sync/upstream-<date> && git branch -d sync/upstream-<date>
git push origin main
pwsh scripts/install-t3.ps1                # preflight, junction, Claude plugin per config dir, Codex junctions, Antigravity copies
grok inspect --json                        # after a version bump: p3stack's path must end in the new version
```

The `t3/upstream.json` fields:
- `pstackVersion`: `plugin.json`'s `version`.
- `cursorPluginsCommit`: the last `cursor/plugins` commit that touches `pstack/` (`git log -1 --format=%H origin/main -- pstack`).
- `splitCommit`: `git rev-parse MERGE_HEAD`.
- `generatorCommit`: the `cursor/plugins` commit whose generator you reviewed (`git log -1 --format=%H origin/main -- scripts/generate-pstack-harness-trees.mjs`), whether or not anything needed porting.

`<splitCommit>` and `<generatorCommit>` in the commands are the values before you update them. Review against `MERGE_HEAD`, which stays fixed while the merge is open; `FETCH_HEAD` changes with any later fetch. If upstream changed only its generator, the split is unchanged and the merge says "Already up to date": port the change by hand on `main`, update `generatorCommit`, regenerate, and commit it as fork work. Then use **Restart agent session** in each open T3 thread.

The generator fails when a Cursor term it knows has no adapter text, and when `pstackVersion` doesn't match `plugin.json`. It can't see a new Cursor term or a changed spawn behavior, so the diff review step is not optional. Conflicts land only in `README.md` (an edit next to the banner) and in any upstream `.gitattributes` or `.claude-plugin/`. `harness/` is never in the split; always regenerate it. After a version bump, Claude Code keeps the old version's folder under `plugins/cache/p3stack/p3stack/`; `installed_plugins.json` names only the new one. If `grok inspect --json` shows p3stack's path under the old version, delete that old folder.

## Conventions

- Never edit an upstream-owned file except the README banner. Fork content lives in new files: `docs/harness/t3-code.md`, `t3/**`, `scripts/*t3*`, `FORK.md`, `.gitattributes`, `.claude-plugin/marketplace.json`. Never hand-edit `harness/`.
- Commit messages: `t3: …` for fork work, `sync: upstream pstack <upstream-sha>` for merges.
- Keep the branch that holds `harness/` checked out in this checkout. The junction follows the working tree, so do other work in a separate worktree.
- The local `/build-plan/` line in `.gitignore` belongs in `.git/info/exclude`, so `.gitignore` stays upstream's.

## Things to know

- Codex and Antigravity have no `disable-model-invocation`, so they can auto-trigger p3stack skills with generic names such as `tdd`, `why`, or `teach`.
- Plain Claude Code on `~/.claude`, plain Grok, plain Codex, and plain Antigravity also load p3stack. Its 22 flagged skills send them to the adapter, which stops outside T3. Upstream `pstack` can't be installed in the same Claude config dir; the installer refuses.
- Antigravity's skills are copies, so a skill edit reaches it only after an installer run.
- Seat worktrees and their `t3/<slug>` branches remain after a run settles. T3's opt-in Storage cleanup removes the worktrees.
