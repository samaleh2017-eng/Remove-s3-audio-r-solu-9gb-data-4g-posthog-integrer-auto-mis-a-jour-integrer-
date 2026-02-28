#Requires -Version 5.1
<#
.SYNOPSIS
    Ito — Complete Windows Uninstall & Cleanup Script

.DESCRIPTION
    Terminates all running Ito processes and removes every trace of the application:
      - AppData\Roaming  (%APPDATA%)      for all stage variants
      - AppData\Local    (%LOCALAPPDATA%) for all stage variants
      - %LOCALAPPDATA%\Programs\Ito*      (per-user NSIS install dirs)
      - Windows registry entries           (HKCU\Software\*)

    Use this before reinstalling to guarantee a completely fresh installation,
    equivalent to a native RISC-style uninstall.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\uninstall-windows.ps1

.NOTES
    No administrator rights required (all paths are per-user).
    Safe to run even if Ito is not installed.
#>

[CmdletBinding()]
param()

$ErrorActionPreference = 'SilentlyContinue'

# ── Helpers ────────────────────────────────────────────────────────────────────

function Write-Step  { param($msg) Write-Host "==> $msg" -ForegroundColor Cyan }
function Write-Done  { param($msg) Write-Host "    OK  $msg" -ForegroundColor Green }
function Write-Skip  { param($msg) Write-Host "    --  $msg" -ForegroundColor DarkGray }
function Write-Warn  { param($msg) Write-Host "    !!  $msg" -ForegroundColor Yellow }

# ── 1. Kill running processes ──────────────────────────────────────────────────

Write-Step 'Terminating running Ito processes…'

$processNames = @('Ito', 'Ito-dev', 'Ito-local')

foreach ($name in $processNames) {
    $procs = Get-Process -Name $name -ErrorAction SilentlyContinue
    if ($procs) {
        $procs | Stop-Process -Force -ErrorAction SilentlyContinue
        Write-Done "Killed: $name ($($procs.Count) instance(s))"
    } else {
        Write-Skip "Not running: $name"
    }
}

Start-Sleep -Seconds 2

# ── 2. Remove AppData directories ─────────────────────────────────────────────

Write-Step 'Removing AppData directories…'

# All stage variants used by lib/main/env.ts:
#   app.setPath('userData', path.join(app.getPath('appData'), `Ito-${stage}`))
$appNameVariants = @('Ito', 'Ito-prod', 'Ito-dev', 'Ito-local')

$roaming  = $env:APPDATA
$local    = $env:LOCALAPPDATA
$programs = Join-Path $local 'Programs'

$directories = @(
    # Roaming — primary userData location
    ($appNameVariants | ForEach-Object { Join-Path $roaming $_ }),
    # Local — Electron cache, crash dumps, etc.
    ($appNameVariants | ForEach-Object { Join-Path $local $_ }),
    # Per-user NSIS install directories (electron-builder perMachine=false)
    ($appNameVariants | ForEach-Object { Join-Path $programs $_ })
) | ForEach-Object { $_ }   # flatten

foreach ($dir in $directories) {
    if (Test-Path $dir) {
        try {
            Remove-Item -Path $dir -Recurse -Force -ErrorAction Stop
            Write-Done "Removed: $dir"
        } catch {
            Write-Warn "Could not remove: $dir — $($_.Exception.Message)"
        }
    } else {
        Write-Skip "Not found: $dir"
    }
}

# ── 3. Clean Windows registry ──────────────────────────────────────────────────

Write-Step 'Cleaning registry entries…'

$registryKeys = @(
    'HKCU:\Software\Ito',
    'HKCU:\Software\ito',
    'HKCU:\Software\ai.ito.ito',
    'HKCU:\Software\ai.ito.ito-dev',
    'HKCU:\Software\ai.ito.ito-local',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito',
    'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito'
)

foreach ($key in $registryKeys) {
    if (Test-Path $key) {
        try {
            Remove-Item -Path $key -Recurse -Force -ErrorAction Stop
            Write-Done "Removed registry key: $key"
        } catch {
            Write-Warn "Could not remove key: $key — $($_.Exception.Message)"
        }
    } else {
        Write-Skip "Key not found: $key"
    }
}

# ── Done ───────────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host '==> Cleanup complete. You can now reinstall Ito for a fresh start.' -ForegroundColor Green
