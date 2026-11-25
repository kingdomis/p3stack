#!/usr/bin/env node
// p3stack: generates harness/t3-code, the T3 Code plugin tree.
// Forked from cursor/plugins scripts/generate-pstack-harness-trees.mjs (commit in t3/upstream.json).
// Changes from upstream: repo-root sources from `git ls-files`, CRLF normalized on read, modes from the
// git index, synthesized p3stack manifests, the `gemini-` term, and an index-aware `--check`.

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { chmodSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, posix } from "node:path";
import { fileURLToPath } from "node:url";

const PSTACK = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = "harness";
const TREE = "t3-code";
const ADAPTER = "docs/harness/t3-code.md";
const GUIDE = "docs/guide";
const SOURCES = ["skills", "agents", GUIDE];
const MANIFESTS = ["plugin.json", ".claude-plugin/plugin.json"];
const MARKETPLACE = ".claude-plugin/marketplace.json";
const UPSTREAM = "t3/upstream.json";
const COMMAND = "node scripts/generate-t3-tree.mjs";
const GITHUB = "https://github.com/cursor/plugins";
const FORK = "https://github.com/kingdomis/p3stack";
const P3STACK = "~/.p3stack/tree";
const P3STACK_WIN = "%USERPROFILE%\\.p3stack\\tree";
const LINK = /\]\(([^)\s]+)\)/g;
const README = `# p3stack harness tree

This folder is generated from \`skills\`, \`agents\`, \`${GUIDE}\`, \`${ADAPTER}\`, \`README.md\`, \`LICENSE\`, and \`plugin.json\`. Do not edit it by hand.

\`${TREE}/\` is the T3 Code plugin root. Claude Code installs it as the \`p3stack\` plugin, and \`scripts/install-t3.ps1\` links it at \`${P3STACK}\` for Codex, Grok, and Antigravity. A relative link to a pstack file that the tree leaves out points at that file in upstream pstack on GitHub \`main\` instead.

After editing those sources, run \`${COMMAND}\` from the repository root and commit the result.
`;

const TERMS = [
  { key: "`Task`", re: /`Task`|\bTask (tool|subagent|call)/ },
  { key: "`AskQuestion`", re: /AskQuestion/ },
  { key: "todolist", re: /\btodo ?list\b/i },
  { key: "generalPurpose", re: /generalPurpose/ },
  { key: "poteto-agent", re: /poteto-agent/ },
  { key: "comment-sicko", re: /comment-sicko/ },
  { key: "`readonly: true`", re: /readonly: (true|false)|readonly\/Ask/ },
  { key: "`environment: \"cloud\"`", re: /environment: "(cloud|local)"/ },
  { key: "cloud_base_branch", re: /cloud_base_branch/ },
  { key: "`run_in_background: true`", re: /run_in_background/ },
  { key: "`resume`", re: /`resume`/ },
  { key: "`file_attachments`", re: /file_attachments/ },
  { key: "claude-", re: /\bclaude-[a-z]+-\d/ },
  { key: "grok-", re: /\bgrok-\d/ },
  { key: "gpt-", re: /\bgpt-\d/ },
  { key: "gemini-", re: /\bgemini-\d/ },
  { key: "inherit-parent", re: /inherit-parent/ },
  { key: "pstack-models.mdc", re: /pstack-models\.mdc/ },
  { key: ".cursor/skills/", re: /\.cursor\/skills/ },
  { key: "~/.cursor/plugins/", re: /\.cursor\/plugins|\.cursor-plugin/ },
  { key: ".cursor/rules/", re: /\.cursor\/rules|always-applied rule/ },
  { key: "agent-transcripts", re: /agent-transcripts|\.cursor\/projects/ },
  { key: "Cursor-only features", re: /Bugbot|Cursor [Aa]utomation|cursor\.(sh|com)\/automations|[Cc]loud [Aa]gent|built-in PR tool/ },
];
const ROUTE_KEY = "Run another pstack skill";
const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function git(args, input) {
  return execFileSync("git", args, { cwd: PSTACK, input, maxBuffer: 1 << 28, encoding: "buffer" });
}
const nulList = (buffer) => buffer.toString("utf8").split("\0").filter(Boolean);
const fail = (lines) => {
  for (const line of lines) console.log(`FAIL ${line}`);
  process.exit(1);
};

// Index entries: path -> { mode, sha }.
function indexEntries(pathspecs) {
  const entries = new Map();
  for (const record of nulList(git(["ls-files", "-s", "-z", "--", ...pathspecs]))) {
    const [meta, path] = record.split("\t");
    const [mode, sha, stage] = meta.split(" ");
    if (stage === "0") entries.set(path, { mode, sha });
  }
  return entries;
}

// A file is binary if it holds a NUL byte (git's heuristic). Text is normalized to LF on read.
function read(path, executable) {
  const raw = readFileSync(join(PSTACK, path));
  const binary = raw.includes(0);
  const bytes = binary ? raw : Buffer.from(raw.toString("utf8").replace(/\r\n/g, "\n"));
  return { bytes, executable, binary };
}

// A conflicted source would copy its conflict markers into the tree, so refuse until every merge conflict outside
// harness/ is resolved. A conflict inside harness/ is fine: regenerating resolves it.
const unmerged = [...new Set(nulList(git(["ls-files", "-u", "-z", "--", ".", `:(exclude)${OUT}`])).map((record) => record.split("\t")[1]))];
if (unmerged.length > 0) fail(unmerged.map((path) => `${path} is unmerged. Resolve the conflict and \`git add\` it before generating.`));

const untracked = nulList(git(["ls-files", "--others", "--exclude-standard", "-z", "--", ...SOURCES]));
if (untracked.length > 0) fail(untracked.map((path) => `${path} is untracked. Commit it, ignore it, or delete it before generating.`));

const index = indexEntries(["."]);
const tracked = nulList(git(["ls-files", "-z", "--", ...SOURCES]));
const sources = new Map();
for (const path of [...tracked, ADAPTER, "README.md", "LICENSE"]) {
  if (!existsSync(join(PSTACK, path))) fail([`${path} is in the source list but missing from the working tree`]);
  sources.set(path, read(path, index.get(path)?.mode === "100755"));
}
const text = (path) => sources.get(path).bytes.toString("utf8");

const skills = [...new Set(tracked.filter((path) => /^skills\/[^/]+\/SKILL\.md$/.test(path)).map((path) => path.split("/")[1]))].sort();

function classify(skill) {
  const others = skills.filter((name) => name !== skill).join("|");
  const route = new RegExp(`the \\*\\*(?<bold>${others})\\*\\* skill|\`/(?<command>${others})\``, "g");
  const linksToSkill = (line, name) => line.includes(`(../${name}/`);
  const namesBareSkill = (line) =>
    [...line.matchAll(route)].some(({ groups }) => !linksToSkill(line, groups.bold ?? groups.command));
  const usesCursorNames = new Set();
  for (const path of [...sources.keys()].filter((path) => path.startsWith(`skills/${skill}/`) && path.endsWith(".md"))) {
    const body = text(path);
    for (const term of TERMS) if (term.re.test(body)) usesCursorNames.add(term.key);
    if (body.split("\n").some(namesBareSkill)) usesCursorNames.add(ROUTE_KEY);
  }
  const wrap = usesCursorNames.size > 0 && /^# /m.test(text(`skills/${skill}/SKILL.md`));
  return { usesCursorNames, wrap };
}

const classes = new Map(skills.map((skill) => [skill, classify(skill)]));
const problems = [];
const users = new Map();
for (const [skill, { usesCursorNames, wrap }] of classes) {
  if (usesCursorNames.size > 0 && !wrap) problems.push(`skills/${skill}/SKILL.md uses Cursor names but has no H1`);
  for (const key of usesCursorNames) users.set(key, [...(users.get(key) ?? []), skill]);
  const frontmatter = text(`skills/${skill}/SKILL.md`).match(/^---\n([\s\S]*?)\n---/)?.[1] ?? "";
  const name = frontmatter.match(/^name:(.*)$/m)?.[1].trim().replace(/^(["'])(.*)\1$/, "$2");
  if (name !== skill) problems.push(`skills/${skill}/SKILL.md has name ${JSON.stringify(name ?? "")}, not its folder name ${skill}`);
  if (!SKILL_NAME.test(skill) || skill.length > 64) problems.push(`skills/${skill} is not lowercase words joined by hyphens, at most 64 characters`);
}
const adapter = text(ADAPTER);
// Every key needs a mapping, used or not, so removing one always fails here. The guard catches a mapping
// lost by accident (an upstream sync, an edit), not crafted Markdown, so it reads only a strict subset of
// Markdown, the shapes the adapter uses. Anything outside that subset is never a mapping, so a stricter
// reading can only fail loudly; it can't pass a missing row. A mapping is:
// - a column-0 ATX heading (`# ` to `###### `) whose text is the key, or
// - a comma-separated item in the first cell of a column-0 table body row that is the key itself or the
//   key followed by " (" or ":". A table starts after a blank line with a column-0 `|...|` header,
//   then a column-0 delimiter `| --- | ... |` with the header's cell count; its body runs while lines
//   start with `|` at column 0.
// Skipped (skipping too much only ever fails loudly):
// - fenced code: ``` or ~~~ at any indent (a tab counts as 4 columns), closed only by the same character at
//   least as long, indented at most 3 columns or the opener's indent, whichever is more;
// - HTML: a line starting with `<`, or holding `<!--`, starts HTML. `<!--` runs through `-->`, `<![CDATA[`
//   through `]]>`, `<?` through `?>`, `<!X` through `>`, <pre>, <script>, <style> and <textarea> through
//   their closing tag, and any other tag through the next blank line. Whatever follows a terminator on the
//   same line is scanned again, so `</pre><!--` opens a comment. Inside a fence or HTML, markers are text.
// ROWS names the item for upstream keys whose adapter row reads differently; TERMS stays as upstream has it.
const ROWS = {
  todolist: "Open a todolist",
  generalPurpose: "subagent_type: generalPurpose",
  "pstack-models.mdc": "~/.cursor/rules/pstack-models.mdc",
  ".cursor/rules/": ".cursor/rules/*.mdc",
  "agent-transcripts": "Transcripts in ~/.cursor/projects/<slug>/agent-transcripts/",
};
const plain = (text) => text.replaceAll("`", "").trim();
const names = (item, key) => item === key || item.startsWith(`${key} (`) || item.startsWith(`${key}:`);
// Escaped pipes don't split cells.
const cells = (line) => line.trim().replace(/^\|/, "").replace(/(?<!\\)\|$/, "").split(/(?<!\\)\|/);
const isHeader = (line) => /^\|.*\|\s*$/.test(line);
const isDelimiter = (line, header) => /^\|(\s*:?-+:?\s*\|)+\s*$/.test(line) && cells(line).length === cells(header).length;
const columns = (lead) => lead.replaceAll("\t", "    ").length;
// Follows HTML openers and terminators through `text`; returns the terminator still open at its end
// ("blank" for a block that ends at the next blank line), or null.
const htmlFrom = (text) => {
  let rest = text;
  for (;;) {
    const at = rest.search(/<(!--|!\[CDATA\[|\?|!?[A-Za-z]|\/[A-Za-z])/);
    if (at < 0) return null;
    rest = rest.slice(at);
    const tag = rest.match(/^<(\/?)([A-Za-z][A-Za-z0-9-]*)/);
    const end = rest.startsWith("<!--") ? "-->" : rest.startsWith("<![CDATA[") ? "]]>" : rest.startsWith("<?") ? "?>"
      : rest.startsWith("<!") ? ">" : !tag[1] && /^(pre|script|style|textarea)$/i.test(tag[2]) ? `</${tag[2].toLowerCase()}>` : "blank";
    if (end === "blank") return end;
    const close = rest.toLowerCase().indexOf(end, end === ">" ? 2 : 1);
    if (close < 0) return end;
    rest = rest.slice(close + end.length);
  }
};
const mapped = new Set();
const lines = adapter.split("\n");
let fence = null;
let html = null; // the open HTML terminator, "blank", or null
let inTable = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (fence) {
    const close = line.match(/^([ \t]*)(`+|~+)\s*$/);
    if (close && close[2][0] === fence.char && close[2].length >= fence.length && columns(close[1]) <= Math.max(3, fence.indent)) fence = null;
    continue;
  }
  if (html) {
    if (html === "blank") { if (line.trim() === "") html = null; continue; }
    const at = line.toLowerCase().indexOf(html);
    if (at >= 0) html = htmlFrom(line.slice(at + html.length));
    continue;
  }
  const open = line.match(/^([ \t]*)(`{3,}|~{3,})/);
  if (open) { fence = { indent: columns(open[1]), char: open[2][0], length: open[2].length }; inTable = false; continue; }
  if (/^\s*</.test(line) || line.includes("<!--")) {
    html = htmlFrom(/^\s*</.test(line) ? line : line.slice(line.indexOf("<!--")));
    inTable = false;
    continue;
  }
  if (inTable && line.startsWith("|")) {
    for (const item of (line.split("|")[1] ?? "").split(",")) mapped.add(plain(item));
    continue;
  }
  inTable = (i === 0 || lines[i - 1].trim() === "") && isHeader(line) && isDelimiter(lines[i + 1] ?? "", line);
  if (inTable) i++; // skip the delimiter; the header row is not a mapping
  else if (/^#{1,6} /.test(line)) mapped.add(plain(line.replace(/^#{1,6} /, "")));
}
for (const key of [...TERMS.map(({ key }) => key), ROUTE_KEY]) {
  const using = users.get(key);
  const want = plain(ROWS[key] ?? key);
  if (![...mapped].some((item) => names(item, want))) problems.push(`T3 Code adapter has no row for ${key}${using ? `, used by ${using.join(", ")}` : ""}`);
}

// Identity: p3stack manifests carry upstream's version; t3/upstream.json and the marketplace must agree.
const upstream = JSON.parse(readFileSync(join(PSTACK, "plugin.json"), "utf8"));
const provenance = JSON.parse(readFileSync(join(PSTACK, UPSTREAM), "utf8"));
const marketplace = JSON.parse(readFileSync(join(PSTACK, MARKETPLACE), "utf8"));
const manifest = {
  $schema: upstream.$schema,
  name: "p3stack",
  version: upstream.version,
  description: `pstack ${upstream.version} for T3 Code. A fork of poteto's (Lauren Tan's) pstack: ${upstream.description}`,
  author: { name: "Tony Evans" },
  homepage: FORK,
  repository: FORK,
  license: upstream.license,
  keywords: [...upstream.keywords, "t3code"],
};
if (provenance.pstackVersion !== upstream.version) problems.push(`${UPSTREAM} pstackVersion ${provenance.pstackVersion} is not plugin.json version ${upstream.version}`);
const entries = marketplace.plugins ?? [];
if (marketplace.name !== manifest.name) problems.push(`${MARKETPLACE} name ${JSON.stringify(marketplace.name)} is not ${manifest.name}`);
if (entries.length !== 1 || entries[0].name !== manifest.name || entries[0].source !== `./${OUT}/${TREE}`) {
  problems.push(`${MARKETPLACE} must list exactly one plugin, ${manifest.name}, with source ./${OUT}/${TREE}`);
}
if (entries.some((entry) => "version" in entry)) problems.push(`${MARKETPLACE} plugin entries carry no version; the manifests do`);
if (problems.length > 0) fail(problems);

// The repo-relative path that a relative link in `from` points at, if that path exists.
function resolve(from, href) {
  const target = href.replace(/[#?].*/, "");
  if (!target || /^[a-z][a-z0-9+.-]*:/i.test(target)) return undefined;
  const path = posix.join(posix.dirname(from), target).replace(/\/$/, "");
  return existsSync(join(PSTACK, path)) ? path : undefined;
}

function has(files, path) {
  return files.has(path) || [...files.keys()].some((key) => key.startsWith(`${path}/`));
}

function render() {
  const files = new Map([...sources].map(([path, entry]) => [path, { ...entry }]));
  const line =
    `Read the p3stack adapter at \`${P3STACK}/${ADAPTER}\` (Windows: \`${P3STACK_WIN}\\${ADAPTER.replaceAll("/", "\\")}\`) once per thread before you follow this skill. ` +
    "It maps pstack's Cursor names to T3 Code, and outside T3 Code it tells you to stop.";
  for (const [skill, { wrap }] of classes) {
    const entry = files.get(`skills/${skill}/SKILL.md`);
    if (wrap) entry.bytes = Buffer.from(entry.bytes.toString("utf8").replace(/^(# .*)\n+/m, (_, h1) => `${h1}\n\n${line}\n\n`));
  }
  const json = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  for (const path of MANIFESTS) files.set(path, { bytes: json, executable: false, binary: false });
  for (const [path, entry] of files) {
    if (!path.endsWith(".md")) continue;
    const body = entry.bytes.toString("utf8").replace(LINK, (link, href) => {
      const target = resolve(path, href);
      if (!target || target.split("/")[0] === ".." || has(files, target)) return link;
      const kind = statSync(join(PSTACK, target)).isDirectory() ? "tree" : "blob";
      return `](${GITHUB}/${kind}/main/pstack/${target}${href.slice(href.search(/[#?]|$/))})`;
    });
    entry.bytes = Buffer.from(body);
  }
  return files;
}

const files = render();
const rendered = new Map([["README.md", { bytes: Buffer.from(README), executable: false }]]);
const dangling = [];
for (const [path, entry] of files) {
  rendered.set(`${TREE}/${path}`, entry);
  if (!path.endsWith(".md")) continue;
  for (const [, href] of entry.bytes.toString("utf8").matchAll(LINK)) {
    const target = resolve(path, href);
    if (target && !has(files, target)) dangling.push(`${OUT}/${TREE}/${path} links to ${href}, which is not in the tree`);
  }
}
if (dangling.length > 0) fail(dangling);

const objectFormat = git(["rev-parse", "--show-object-format"]).toString().trim();
const blobId = (bytes) => createHash(objectFormat).update(`blob ${bytes.length}\0`).update(bytes).digest("hex");
const modeOf = ({ executable }) => (executable ? "100755" : "100644");
const repoPath = (path) => `${OUT}/${path}`;

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return lstatSync(path).isDirectory() ? walk(path) : [path];
  });
}

// harness/ must be a plain folder tree. A symlink, junction or hard link there would let the update
// read or change files outside this checkout, so refuse before touching anything.
const links = [];
const scan = (path) => {
  const stat = lstatSync(path, { throwIfNoEntry: false });
  if (!stat) return;
  const rel = path.slice(PSTACK.length + 1).replaceAll("\\", "/");
  if (stat.isSymbolicLink()) return links.push(`${rel} is a symlink or junction.`);
  if (stat.isFile() && stat.nlink > 1) return links.push(`${rel} is a hard link (${stat.nlink} names).`);
  if (stat.isDirectory()) for (const name of readdirSync(path)) scan(join(path, name));
};
scan(join(PSTACK, OUT));
if (links.length > 0) fail(links.map((problem) => `${problem} ${OUT}/ must hold only real files and folders.`));

if (process.argv.includes("--check")) {
  const drift = [];
  const staged = indexEntries([OUT]);
  for (const [path, entry] of rendered) {
    const full = join(PSTACK, OUT, path);
    const isFile = lstatSync(full, { throwIfNoEntry: false })?.isFile();
    const have = isFile ? readFileSync(full) : undefined;
    const want = staged.get(repoPath(path));
    if (!have) drift.push(`${repoPath(path)}: ${existsSync(full) ? "not a file" : "missing"} in the working tree`);
    else if (!have.equals(entry.bytes)) drift.push(`${repoPath(path)}: working tree differs from the render`);
    if (!want) drift.push(`${repoPath(path)}: not in the index`);
    else {
      if (want.sha !== blobId(entry.bytes)) drift.push(`${repoPath(path)}: index differs from the render`);
      if (want.mode !== modeOf(entry)) drift.push(`${repoPath(path)}: index mode ${want.mode}, want ${modeOf(entry)}`);
    }
  }
  for (const path of staged.keys()) {
    if (!rendered.has(path.slice(OUT.length + 1))) drift.push(`${path}: in the index but not in the render`);
  }
  const onDisk = existsSync(join(PSTACK, OUT)) ? walk(join(PSTACK, OUT)).map((path) => posix.normalize(path.slice(PSTACK.length + 1).replaceAll("\\", "/"))) : [];
  for (const path of onDisk) if (!rendered.has(path.slice(OUT.length + 1))) drift.push(`${path}: on disk but not in the render`);
  for (const path of nulList(git(["diff", "--name-only", "-z", "--", OUT]))) drift.push(`${path}: unstaged change`);
  for (const path of nulList(git(["ls-files", "--others", "--exclude-standard", "-z", "--", OUT]))) drift.push(`${path}: untracked`);
  for (const record of nulList(git(["ls-files", "-u", "-z", "--", OUT]))) drift.push(`${record.split("\t")[1]}: unmerged`);
  const unique = [...new Set(drift)].sort();
  for (const line of unique.slice(0, 20)) console.log(line);
  if (unique.length > 20) console.log(`... and ${unique.length - 20} more`);
  if (unique.length > 0) {
    console.log(`${OUT}/ is out of date. Run \`${COMMAND}\` and commit the result.`);
    process.exit(1);
  }
  console.log(`${OUT}/ is up to date (${rendered.size} files).`);
} else {
  // Update in place: write only changed files and delete only stale ones, so a file-sync client
  // watching the checkout never sees the whole folder vanish and reappear.
  const root = join(PSTACK, OUT);
  const existing = existsSync(root) ? walk(root) : [];
  for (const full of existing) {
    const path = full.slice(root.length + 1).replaceAll("\\", "/");
    if (!rendered.has(path)) rmSync(full, { force: true });
  }
  for (const [path, entry] of rendered) {
    const full = join(root, path);
    mkdirSync(dirname(full), { recursive: true });
    // A sync can leave a folder where a file belongs; the scan above already refused links, so this stays inside harness/.
    if (lstatSync(full, { throwIfNoEntry: false })?.isDirectory()) rmSync(full, { recursive: true, force: true });
    // Replace rather than write through, so a changed file never edits whatever else shares its inode.
    if (!existsSync(full) || !readFileSync(full).equals(entry.bytes)) {
      rmSync(full, { force: true });
      writeFileSync(full, entry.bytes);
    }
    chmodSync(full, entry.executable ? 0o755 : 0o644);
  }
  const prune = (dir) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (lstatSync(full).isDirectory()) prune(full);
    }
    if (dir !== root && readdirSync(dir).length === 0) rmSync(dir, { recursive: true, force: true });
  };
  prune(root);
  // core.filemode=false ignores chmodSync, so set each generated path's mode in the index.
  git(["add", "-A", "--", OUT]);
  const staged = indexEntries([OUT]);
  const fix = { "+x": [], "-x": [] };
  for (const [path, entry] of rendered) {
    if (staged.get(repoPath(path))?.mode !== modeOf(entry)) fix[entry.executable ? "+x" : "-x"].push(repoPath(path));
  }
  for (const [flag, paths] of Object.entries(fix)) {
    for (let i = 0; i < paths.length; i += 100) git(["update-index", `--chmod=${flag}`, "--", ...paths.slice(i, i + 100)]);
  }
  const wrapped = [...classes.values()].filter(({ wrap }) => wrap).length;
  console.log(`${skills.length} skills, ${wrapped} SKILL.md files with the adapter line, ${rendered.size} files staged under ${OUT}/`);
}
