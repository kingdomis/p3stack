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

```
# in a cursor/plugins clone (e.g. %TEMP%\p3stack-split)
git fetch origin && git checkout origin/main
git subtree split --prefix=pstack -b pstack-upstream
# in p3stack
git fetch <split-clone-path> pstack-upstream
git checkout -b sync/upstream-<date>
git merge --no-ff --no-commit FETCH_HEAD
git diff <last-split-commit>..FETCH_HEAD -- skills agents docs/harness   # review behavior changes against t3-code.md
# port upstream generator changes by hand (diff scripts/generate-pstack-harness-trees.mjs since t3/upstream.json's generatorCommit)
# update t3/upstream.json (and t3-code.md if the review needs it), then: git add t3/upstream.json docs/harness/t3-code.md
node scripts/generate-t3-tree.mjs          # writes harness/, stages it, sets modes
node scripts/generate-t3-tree.mjs --check  # content, modes, and nothing unstaged
git commit                                 # one merge commit: upstream, provenance, regenerated tree
pwsh scripts/install-t3.ps1                # preflight, refresh the junction, reinstall the Claude plugin per config dir
```

The generator fails when a Cursor term it knows has no adapter text. It can't see a new Cursor term or a changed spawn behavior, so the diff review step is not optional. Conflicts land only in `README.md` (the banner) and in any upstream `.gitattributes` or `.claude-plugin/`. `harness/` is never in the split; always regenerate it.

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
