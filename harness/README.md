# p3stack harness tree

This folder is generated from `skills`, `agents`, `docs/guide`, `docs/harness/t3-code.md`, `README.md`, `LICENSE`, and `plugin.json`. Do not edit it by hand.

`t3-code/` is the T3 Code plugin root. Claude Code installs it as the `p3stack` plugin, and `scripts/install-t3.ps1` links it at `~/.p3stack/tree` for Codex, Grok, and Antigravity. A relative link to a pstack file that the tree leaves out points at that file in upstream pstack on GitHub `main` instead.

After editing those sources, run `node scripts/generate-t3-tree.mjs` from the repository root and commit the result.
