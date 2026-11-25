#requires -Version 7
<#
.SYNOPSIS
  Installs p3stack (pstack for T3 Code) on this Windows machine.

.DESCRIPTION
  Preflight first: checks every destination and stops with the full list if any check fails, leaving
  everything untouched. Then:
    - links <P3stackHome>\tree to <repo>\harness\t3-code (a directory junction)
    - installs the Claude Code plugin p3stack@p3stack in each Claude config dir (reinstalled every run)
    - junctions each skill into the Codex skills dir
    - copies each skill into the Antigravity skills dir, with a .p3stack-managed marker
  Grok imports the plugin from ~/.claude, so it gets nothing of its own.
  A failure during installation is reported per destination; a rerun repairs it.

.PARAMETER ClaudeConfigDirs
  Exactly the Claude config dirs to install into. Default: ~/.claude plus the config.homePath of every
  enabled claudeAgent instance in the T3 settings file.

.PARAMETER PreflightOnly
  Run the checks and print what would change, then stop.
#>
[CmdletBinding()]
param(
  [string[]]$ClaudeConfigDirs,
  [string]$P3stackHome = (Join-Path $env:USERPROFILE '.p3stack'),
  [string]$CodexSkillsDir = (Join-Path $env:USERPROFILE '.codex\skills'),
  [string]$AntigravitySkillsDir = (Join-Path $env:USERPROFILE '.gemini\config\skills'),
  [string]$CodexOtherSkillsDir = (Join-Path $env:USERPROFILE '.agents\skills'),
  [string]$T3Settings = (Join-Path $env:USERPROFILE '.t3\userdata\settings.json'),
  [switch]$PreflightOnly
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$tree = Join-Path $repo 'harness\t3-code'
$link = Join-Path $P3stackHome 'tree'
$linkSkills = Join-Path $link 'skills'
$defaultClaude = Join-Path $env:USERPROFILE '.claude'
$marker = '.p3stack-managed'
$plugin = 'p3stack@p3stack'

function Norm([string]$path) {
  if (-not $path) { return '' }
  $path = ($path -replace '^\\\\\?\\', '' -replace '^\\\?\?\\', '' -replace '^~', $env:USERPROFILE).Replace('/', '\')
  [IO.Path]::GetFullPath($path).TrimEnd('\').ToLowerInvariant()
}
function Get-Entry([string]$path) { Get-Item -LiteralPath $path -Force -ErrorAction SilentlyContinue }
function Test-Junction($item) { $item -and $item.LinkType -eq 'Junction' }
# A marker counts only as a plain file. A linked one (PowerShell reports LinkType HardLink or SymbolicLink)
# could point anywhere, so p3stack never trusts it or writes through it.
function Test-PlainMarker([string]$dir) { $m = Get-Entry (Join-Path $dir $marker); $m -and -not $m.PSIsContainer -and -not $m.LinkType }
# The installer makes exactly one junction shape, <name> -> <p3stack>\skills\<name>. Only that shape is ours
# to remove or prune. A junction straight to <tree>\skills\<name> holds p3stack's content but someone else
# made it, so p3stack accepts it in place and never removes it.
function Test-OurCodexJunction($item, [string]$name) {
  (Test-Junction $item) -and (Norm $item.Target) -eq (Norm (Join-Path $linkSkills $name))
}
function Test-P3stackJunction($item, [string]$name) {
  (Test-OurCodexJunction $item $name) -or ((Test-Junction $item) -and (Norm $item.Target) -eq (Norm (Join-Path $tree "skills\$name")))
}
function Remove-Junction([string]$path) { [IO.Directory]::Delete($path) }

# Runs claude with CLAUDE_CONFIG_DIR set for one config dir (unset for the default ~/.claude).
function Invoke-Claude([string]$dir, [string[]]$arguments) {
  $saved = $env:CLAUDE_CONFIG_DIR
  try {
    if ((Norm $dir) -eq (Norm $defaultClaude)) { Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue }
    else { $env:CLAUDE_CONFIG_DIR = $dir }
    $output = & claude @arguments 2>&1 | Out-String
    [pscustomobject]@{ Code = $LASTEXITCODE; Output = $output.Trim() }
  } finally {
    if ($null -eq $saved) { Remove-Item Env:CLAUDE_CONFIG_DIR -ErrorAction SilentlyContinue } else { $env:CLAUDE_CONFIG_DIR = $saved }
  }
}

$problems = [Collections.Generic.List[string]]::new()
$warnings = [Collections.Generic.List[string]]::new()
$plan = [Collections.Generic.List[string]]::new()

# --- Sources -------------------------------------------------------------------------------------------
foreach ($required in @('skills', 'agents', 'docs\harness\t3-code.md', 'plugin.json', '.claude-plugin\plugin.json')) {
  if (-not (Test-Path -LiteralPath (Join-Path $tree $required))) { $problems.Add("missing source: harness\t3-code\$required (run node scripts/generate-t3-tree.mjs)") }
}
if (-not (Test-Path -LiteralPath (Join-Path $repo '.claude-plugin\marketplace.json'))) { $problems.Add('missing source: .claude-plugin\marketplace.json') }
$skills = @()
if (Test-Path -LiteralPath (Join-Path $tree 'skills')) {
  $skills = @(Get-ChildItem -LiteralPath (Join-Path $tree 'skills') -Directory | Where-Object { Test-Path -LiteralPath (Join-Path $_.FullName 'SKILL.md') } | ForEach-Object Name)
}
if (-not (Test-Path -LiteralPath (Join-Path $env:ProgramFiles 'Git\bin\bash.exe'))) { $warnings.Add('Git Bash not found at %ProgramFiles%\Git\bin\bash.exe; p3stack snapshot and graft blocks need it') }

# --- Claude CLI and plugin validation -----------------------------------------------------------------
if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  $problems.Add('claude CLI not on PATH')
} else {
  foreach ($target in @($repo, $tree)) {
    $result = Invoke-Claude $defaultClaude @('plugin', 'validate', $target)
    if ($result.Code -ne 0) { $problems.Add("claude plugin validate $target failed:`n$($result.Output)") }
  }
}

# --- Claude config dirs --------------------------------------------------------------------------------
if ($PSBoundParameters.ContainsKey('ClaudeConfigDirs')) {
  if (-not ($ClaudeConfigDirs | Where-Object { (Norm $_) -eq (Norm $defaultClaude) })) {
    $warnings.Add("-ClaudeConfigDirs omits $defaultClaude, which Grok imports plugins from")
  }
} else {
  $ClaudeConfigDirs = @($defaultClaude)
  if (Test-Path -LiteralPath $T3Settings) {
    try {
      $settings = Get-Content -LiteralPath $T3Settings -Raw | ConvertFrom-Json
      foreach ($instance in @($settings.providerInstances.PSObject.Properties)) {
        $value = $instance.Value
        if ($value.driver -ne 'claudeAgent' -or $value.enabled -eq $false) { continue }
        $homePath = $value.config.homePath
        if ($homePath) { $ClaudeConfigDirs += ($homePath -replace '^~', $env:USERPROFILE) }
      }
    } catch { $problems.Add("can't read T3 settings at ${T3Settings}: $($_.Exception.Message). Pass -ClaudeConfigDirs explicitly") }
  } else {
    $warnings.Add("T3 settings not found at $T3Settings; installing into $defaultClaude only")
  }
}
$ClaudeConfigDirs = @($ClaudeConfigDirs | Group-Object { Norm $_ } | ForEach-Object { $_.Group[0] })
foreach ($dir in $ClaudeConfigDirs) {
  if (-not (Test-Path -LiteralPath $dir -PathType Container)) { $problems.Add("missing Claude config dir: $dir"); continue }
  $installed = Join-Path $dir 'plugins\installed_plugins.json'
  if (Test-Path -LiteralPath $installed -PathType Leaf) {
    try {
      $keys = @((Get-Content -LiteralPath $installed -Raw | ConvertFrom-Json).plugins.PSObject.Properties.Name)
      foreach ($key in $keys | Where-Object { $_ -like 'pstack@*' }) {
        $why = "upstream $key is installed in $dir. p3stack can't share a config dir with it: uninstall it there, or leave $dir out with -ClaudeConfigDirs"
        if ((Norm $dir) -eq (Norm $defaultClaude)) { $why += '. Grok imports plugins only from this dir, so it also blocks Grok' }
        $problems.Add($why)
      }
    } catch { $problems.Add("can't read ${installed}: $($_.Exception.Message)") }
  }
  # A p3stack marketplace registered from anywhere but this checkout belongs to someone else: never update or reinstall it.
  if (Get-Command claude -ErrorAction SilentlyContinue) {
    $list = Invoke-Claude $dir @('plugin', 'marketplace', 'list', '--json')
    try {
      if ($list.Code -ne 0) { throw $list.Output }
      foreach ($entry in @(($list.Output | ConvertFrom-Json) | Where-Object { $_.name -eq 'p3stack' })) {
        if ($entry.source -ne 'directory' -or (Norm "$($entry.path)") -ne (Norm $repo)) {
          $from = if ($entry.path) { $entry.path } elseif ($entry.repo) { $entry.repo } else { "$($entry.url)" }
          $problems.Add("marketplace p3stack in $dir is registered from $($entry.source) $from, not $repo. Remove it there or run the installer from that checkout. To remove it, in PowerShell: `$env:CLAUDE_CONFIG_DIR = '$($dir -replace "'", "''")'; claude plugin marketplace remove p3stack; Remove-Item Env:CLAUDE_CONFIG_DIR")
        }
      }
    } catch { $problems.Add("claude plugin marketplace list failed in ${dir}: $_") }
  }
  $plan.Add("Claude ${dir}: add or update marketplace p3stack, then reinstall $plugin")
}

# --- The fixed path ------------------------------------------------------------------------------------
$linkItem = Get-Entry $link
if ($linkItem) {
  if (-not (Test-Junction $linkItem) -or (Norm $linkItem.Target) -ne (Norm $tree)) { $problems.Add("$link exists and is not p3stack's junction to $tree") }
  else { $plan.Add("junction $link -> $tree (already in place)") }
} else {
  if (Test-Path -LiteralPath $P3stackHome -PathType Leaf) { $problems.Add("$P3stackHome is a file") }
  $plan.Add("junction $link -> $tree (create)")
}

# --- Codex junctions -----------------------------------------------------------------------------------
$codexOther = $CodexOtherSkillsDir
# Another Codex skill folder counts as a duplicate only when it holds p3stack's own skill: a junction into
# the tree, or a SKILL.md byte-identical to the tree's. Anything else is someone's skill that shadows ours.
function Test-P3stackSkill([string]$path, [string]$name) {
  $item = Get-Entry $path
  if (-not $item) { return $false }
  # Only a junction to this exact skill folder counts, and that folder must exist.
  if (Test-Junction $item) { return (Test-P3stackJunction $item $name) -and (Test-Path -LiteralPath $item.Target -PathType Container) }
  $theirs = Join-Path $path 'SKILL.md'
  if (-not (Test-Path -LiteralPath $theirs -PathType Leaf)) { return $false }
  (Get-FileHash -LiteralPath $theirs).Hash -eq (Get-FileHash -LiteralPath (Join-Path $tree "skills\$name\SKILL.md")).Hash
}
$codexSkip = @()
foreach ($name in $skills | Where-Object { Get-Entry (Join-Path $codexOther $_) }) {
  if (Test-P3stackSkill (Join-Path $codexOther $name) $name) {
    $codexSkip += $name
    $mine = Get-Entry (Join-Path $CodexSkillsDir $name)
    # A foreign entry here fails the collision check below, so it gets no duplicate warning.
    if ((Test-P3stackJunction $mine $name) -and -not (Test-OurCodexJunction $mine $name)) {
      $warnings.Add("Codex lists p3stack's $name twice: from $codexOther and from your own $($mine.FullName). p3stack removes neither; remove one to stop the duplicate")
    } elseif (Test-OurCodexJunction $mine $name) {
      $warnings.Add("Codex also lists p3stack's $name from $codexOther; p3stack relies on that copy and removes its own junction")
    } elseif (-not $mine) {
      $warnings.Add("Codex also lists p3stack's $name from $codexOther; p3stack relies on that copy and makes no junction")
    }
  } else {
    $warnings.Add("Codex also lists a different $name from $codexOther; it may shadow p3stack's $name")
  }
}
if (Test-Path -LiteralPath $CodexSkillsDir -PathType Leaf) { $problems.Add("$CodexSkillsDir is a file") }
$codexNew = 0
foreach ($name in $skills) {
  $item = Get-Entry (Join-Path $CodexSkillsDir $name)
  if (-not $item) { if ($name -notin $codexSkip) { $codexNew++ } }
  elseif (-not (Test-P3stackJunction $item $name)) { $problems.Add("collision: $($item.FullName) exists and p3stack didn't create it") }
}
$codexStale = @(Get-ChildItem -LiteralPath $CodexSkillsDir -Force -ErrorAction SilentlyContinue | Where-Object {
  # Only the installer's own junction shape, for a name that is no longer a p3stack skill, whose target is
  # gone, is stale. A current skill's junction is never stale, even while <p3stack> itself is missing.
  (Test-OurCodexJunction $_ $_.Name) -and $_.Name -notin $skills -and -not (Test-Path -LiteralPath $_.Target)
})
$plan.Add("Codex ${CodexSkillsDir}: $codexNew new junctions, $($skills.Count - $codexNew - $codexSkip.Count) in place, $($codexStale.Count) stale to remove, $($codexSkip.Count) left to $codexOther")

# --- Antigravity copies --------------------------------------------------------------------------------
if (Test-Path -LiteralPath $AntigravitySkillsDir -PathType Leaf) { $problems.Add("$AntigravitySkillsDir is a file") }
foreach ($name in $skills) {
  $dest = Join-Path $AntigravitySkillsDir $name
  $item = Get-Entry $dest
  if (-not $item) { continue }
  # Ours is a plain folder (no junction or symlink) holding a plain marker, or an empty plain folder
  # (an install stopped before its marker) that holds nothing to lose.
  $markerEntry = Get-Entry (Join-Path $dest $marker)
  if (-not $item.PSIsContainer -or $item.LinkType) {
    $problems.Add("collision: $dest is a $(if ($item.LinkType) { $item.LinkType } else { 'file' }), not a folder p3stack made")
  } elseif ($markerEntry -and -not (Test-PlainMarker $dest)) {
    $problems.Add("$dest\$marker is a link or a folder, not p3stack's marker; p3stack won't write through it")
  } elseif (-not $markerEntry -and (Get-ChildItem -LiteralPath $dest -Force | Select-Object -First 1)) {
    $problems.Add("collision: $dest exists and p3stack didn't create it")
  }
}
$agStale = @(Get-ChildItem -LiteralPath $AntigravitySkillsDir -Directory -Force -ErrorAction SilentlyContinue | Where-Object {
  -not $_.LinkType -and (Test-PlainMarker $_.FullName) -and $_.Name -notin $skills
})
$plan.Add("Antigravity ${AntigravitySkillsDir}: copy $($skills.Count) skills (each recopied), $($agStale.Count) stale to remove")

# --- Grok shadows (report only) ------------------------------------------------------------------------
if (Get-Command grok -ErrorAction SilentlyContinue) {
  try {
    Push-Location $env:TEMP
    $inspect = (& grok inspect --json 2>$null | Out-String) | ConvertFrom-Json
    foreach ($skill in $inspect.skills | Where-Object { $_.name -in $skills }) {
      $source = "$($skill.source.path)"
      if ($source -notmatch '\\plugins\\cache\\p3stack\\') {
        $warnings.Add("Grok skill $($skill.name) from $source shadows p3stack's; in Grok use p3stack:$($skill.name)")
      }
    }
  } catch { $warnings.Add("grok inspect --json failed: $($_.Exception.Message)") }
  finally { Pop-Location }
}

# --- Preflight verdict ---------------------------------------------------------------------------------
Write-Host "p3stack preflight: $repo ($($skills.Count) skills)"
foreach ($warning in $warnings) { Write-Host "WARN $warning" }
if ($problems.Count -gt 0) {
  foreach ($problem in $problems) { Write-Host "FAIL $problem" }
  Write-Host "Preflight failed with $($problems.Count) problem(s). Nothing was changed."
  exit 2
}
Write-Host 'Preflight passed. Planned changes:'
foreach ($line in $plan) { Write-Host "  - $line" }
if ($PreflightOnly) { exit 0 }

# --- Install -------------------------------------------------------------------------------------------
$results = [ordered]@{}
function Step([string]$destination, [scriptblock]$action) {
  try { & $action; $results[$destination] = 'OK' }
  catch { $results[$destination] = "FAILED: $($_.Exception.Message)" }
}

Step "junction $link" {
  New-Item -ItemType Directory -Path $P3stackHome -Force | Out-Null
  if (-not (Get-Entry $link)) { New-Item -ItemType Junction -Path $link -Target $tree | Out-Null }
}

foreach ($dir in $ClaudeConfigDirs) {
  Step "Claude $dir" {
    $list = Invoke-Claude $dir @('plugin', 'marketplace', 'list', '--json')
    if ($list.Code -ne 0) { throw "marketplace list: $($list.Output)" }
    $known = @(($list.Output | ConvertFrom-Json) | Where-Object { $_.name -eq 'p3stack' })
    $step = if ($known) { @('plugin', 'marketplace', 'update', 'p3stack') } else { @('plugin', 'marketplace', 'add', $repo) }
    $result = Invoke-Claude $dir $step
    if ($result.Code -ne 0) { throw "$($step -join ' '): $($result.Output)" }
    $installed = Invoke-Claude $dir @('plugin', 'list', '--json')
    if ($installed.Code -ne 0) { throw "plugin list: $($installed.Output)" }
    if (@(($installed.Output | ConvertFrom-Json) | Where-Object { $_.id -eq $plugin -or "$($_.name)@$($_.marketplace)" -eq $plugin })) {
      $result = Invoke-Claude $dir @('plugin', 'uninstall', $plugin)
      if ($result.Code -ne 0) { throw "plugin uninstall: $($result.Output)" }
    }
    $result = Invoke-Claude $dir @('plugin', 'install', $plugin)
    if ($result.Code -ne 0) { throw "plugin install: $($result.Output)" }
  }
}

Step "Codex $CodexSkillsDir" {
  New-Item -ItemType Directory -Path $CodexSkillsDir -Force | Out-Null
  foreach ($stale in $codexStale) { Remove-Junction $stale.FullName }
  foreach ($name in $skills) {
    $dest = Join-Path $CodexSkillsDir $name
    $item = Get-Entry $dest
    if ($name -in $codexSkip) { if (Test-OurCodexJunction $item $name) { Remove-Junction $dest } }
    elseif (-not $item) { New-Item -ItemType Junction -Path $dest -Target (Join-Path $linkSkills $name) | Out-Null }
  }
}

Step "Antigravity $AntigravitySkillsDir" {
  New-Item -ItemType Directory -Path $AntigravitySkillsDir -Force | Out-Null
  foreach ($stale in $agStale) { Remove-Item -LiteralPath $stale.FullName -Recurse -Force }
  foreach ($name in $skills) {
    $dest = Join-Path $AntigravitySkillsDir $name
    # The marker goes in first and is never removed, so a copy or a delete that fails partway is still ours
    # and the rerun repairs it. Preflight already proved an existing folder is a plain managed (or empty) folder
    # with a plain marker. An existing marker is never rewritten, so nothing is written through a link.
    New-Item -ItemType Directory -Path $dest -Force | Out-Null
    # CreateNew is atomic: if a marker already exists (this install's earlier run, or another install that got
    # there first), leave it as it is. Only that case is caught; any other error, including a failed write
    # after the create, fails this destination.
    $stream = $null
    try { $stream = [IO.File]::Open((Join-Path $dest $marker), [IO.FileMode]::CreateNew, [IO.FileAccess]::Write) }
    catch [IO.IOException] {
      if ($_.Exception.HResult -ne 0x80070050) { throw }  # ERROR_FILE_EXISTS
      if (-not (Test-PlainMarker $dest)) { throw "$dest\$marker exists and is not a plain file" }
    }
    if ($stream) {
      try { $bytes = [Text.Encoding]::UTF8.GetBytes("Managed by p3stack scripts/install-t3.ps1 from $tree. Rerun the installer to refresh.$([Environment]::NewLine)"); $stream.Write($bytes, 0, $bytes.Length) }
      finally { $stream.Dispose() }
    }
    Get-ChildItem -LiteralPath $dest -Force | Where-Object Name -ne $marker | Remove-Item -Recurse -Force
    Get-ChildItem -LiteralPath (Join-Path $tree "skills\$name") -Force | Copy-Item -Destination $dest -Recurse -Force
  }
}

Write-Host 'p3stack install results:'
foreach ($entry in $results.GetEnumerator()) { Write-Host "  $($entry.Key): $($entry.Value)" }
if (@($results.Values | Where-Object { $_ -ne 'OK' }).Count -gt 0) {
  Write-Host 'Some destinations failed. Fix the cause and rerun; the rerun repairs the rest.'
  exit 1
}
Write-Host 'Done. In T3, use Restart agent session from the command palette (Ctrl+K) so each provider reloads its skills.'
