; Custom NSIS macros for the Ito installer
;
; customInit  — runs at installer startup (before any UI):
;               1. Force-kills every running Ito process + native helpers
;               2. Nukes the OLD installation directory and Uninstall registry
;                  keys so electron-builder never invokes the stale old
;                  uninstaller (whose own CHECK_APP_RUNNING may falsely block)
;               Result: the new installer always does a clean drop-in.
;
; customUnInstall — runs during uninstall, wipes ALL residual data from every
;               known AppData location (Roaming + Local) and all stage variants
;               (Ito, Ito-prod, Ito-dev, Ito-local) so a fresh reinstall is truly
;               a clean slate, matching native RISC-style uninstall behaviour.

; ---------------------------------------------------------------------------
; customInit — kill processes + remove old installation before upgrade
; ---------------------------------------------------------------------------
!macro customInit
  ; --- Force-kill main Electron processes (all stage variants) ---
  nsExec::ExecToLog 'taskkill /F /IM "Ito.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-dev.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-local.exe" /T'

  ; --- Kill native Rust helper binaries that may outlive the main process ---
  nsExec::ExecToLog 'taskkill /F /IM "global-key-listener.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "audio-recorder.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "text-writer.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "active-application.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "selected-text-reader.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "browser-url-reader.exe"'

  Sleep 3000

  ; --- Second pass — catch anything that respawned ---
  nsExec::ExecToLog 'taskkill /F /IM "Ito.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-dev.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-local.exe" /T'
  Sleep 2000

  ; --- Remove previous installation BEFORE electron-builder looks for it ---
  ; electron-builder one-click reads the Uninstall key, finds the old
  ; uninstaller, and runs it.  If that OLD uninstaller has a stale
  ; CHECK_APP_RUNNING it shows "Ito-dev ne peut pas être fermé" even
  ; with zero processes in Task Manager.
  ; Fix: delete the Uninstall keys + old install dirs ourselves so
  ;      electron-builder sees nothing and does a fresh install.
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito-dev"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito-local"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito-dev"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito-local"

  RMDir /r "$LOCALAPPDATA\Programs\Ito"
  RMDir /r "$LOCALAPPDATA\Programs\Ito-dev"
  RMDir /r "$LOCALAPPDATA\Programs\Ito-local"
!macroend

; ---------------------------------------------------------------------------
; customUnInstall — full deep-clean of all data and registry artefacts
; ---------------------------------------------------------------------------
!macro customUnInstall
  ; Terminate any lingering processes first
  nsExec::ExecToLog 'taskkill /F /IM "Ito.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-dev.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-local.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "global-key-listener.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "audio-recorder.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "text-writer.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "active-application.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "selected-text-reader.exe"'
  nsExec::ExecToLog 'taskkill /F /IM "browser-url-reader.exe"'
  Sleep 2000

  ; ------------------------------------------------------------------
  ; AppData\Roaming  (%APPDATA%)
  ; Covers all stage variants written by lib/main/env.ts:
  ;   app.setPath('userData', path.join(app.getPath('appData'), `Ito-${stage}`))
  ; ------------------------------------------------------------------
  RMDir /r "$APPDATA\Ito"
  RMDir /r "$APPDATA\Ito-prod"
  RMDir /r "$APPDATA\Ito-dev"
  RMDir /r "$APPDATA\Ito-local"

  ; ------------------------------------------------------------------
  ; AppData\Local  (%LOCALAPPDATA%)
  ; Electron may write cache / crash dumps here under the app name
  ; ------------------------------------------------------------------
  RMDir /r "$LOCALAPPDATA\Ito"
  RMDir /r "$LOCALAPPDATA\Ito-prod"
  RMDir /r "$LOCALAPPDATA\Ito-dev"
  RMDir /r "$LOCALAPPDATA\Ito-local"

  ; ------------------------------------------------------------------
  ; Per-user program installation directories
  ; electron-builder (perMachine=false) installs to %LOCALAPPDATA%\Programs\<productName>
  ; ------------------------------------------------------------------
  RMDir /r "$LOCALAPPDATA\Programs\Ito"
  RMDir /r "$LOCALAPPDATA\Programs\Ito-dev"
  RMDir /r "$LOCALAPPDATA\Programs\Ito-local"

  ; ------------------------------------------------------------------
  ; Windows registry — app identity keys
  ;   appId-based + productName-based (covers all stages)
  ; ------------------------------------------------------------------
  DeleteRegKey HKCU "Software\Ito"
  DeleteRegKey HKCU "Software\ito"
  DeleteRegKey HKCU "Software\Ito-dev"
  DeleteRegKey HKCU "Software\Ito-local"
  DeleteRegKey HKCU "Software\ai.ito.ito"
  DeleteRegKey HKCU "Software\ai.ito.ito-dev"
  DeleteRegKey HKCU "Software\ai.ito.ito-local"

  ; ------------------------------------------------------------------
  ; URL protocol handlers registered by electron-builder for deep links
  ;   electron-builder.config.js → protocols.schemes: ['ito'] / ['ito-dev']
  ;   Registered under HKCU\Software\Classes\{scheme}
  ; ------------------------------------------------------------------
  DeleteRegKey HKCU "Software\Classes\ito"
  DeleteRegKey HKCU "Software\Classes\ito-dev"
  DeleteRegKey HKCU "Software\Classes\ito-local"

  ; ------------------------------------------------------------------
  ; Add/Remove Programs uninstall entries (belt-and-suspenders)
  ;   appId-based (electron-builder default key name)
  ; ------------------------------------------------------------------
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito-dev"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito-local"
  ;   productName-based (legacy / fallback key name)
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito-dev"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\Ito-local"

  ; ------------------------------------------------------------------
  ; Auto-start ("Open at Login") — app.setLoginItemSettings() writes
  ;   a value under HKCU\...\Run whose name is app.getName().
  ;   prod = "ito" (package.json name), dev = "Ito (dev)", local = "Ito (local)"
  ; ------------------------------------------------------------------
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "ito"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ito"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ito (dev)"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ito (local)"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ito-dev"
  DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Ito-local"
!macroend
