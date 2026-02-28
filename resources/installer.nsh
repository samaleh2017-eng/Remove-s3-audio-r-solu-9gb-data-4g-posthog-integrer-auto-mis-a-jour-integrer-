; Custom NSIS macros for the Ito installer
;
; customInit  — runs at installer startup (before any UI), kills running instances
;               so the user never sees "please close the app and retry"
; customUnInstall — runs during uninstall, wipes ALL residual data from every
;               known AppData location (Roaming + Local) and all stage variants
;               (Ito, Ito-prod, Ito-dev, Ito-local) so a fresh reinstall is truly
;               a clean slate, matching native RISC-style uninstall behaviour.

; ---------------------------------------------------------------------------
; customInit — kill any running Ito process before installation begins
; ---------------------------------------------------------------------------
!macro customInit
  nsExec::ExecToLog 'taskkill /F /IM "Ito.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-dev.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-local.exe" /T'
  Sleep 2000
!macroend

; ---------------------------------------------------------------------------
; customUnInstall — full deep-clean of all data and registry artefacts
; ---------------------------------------------------------------------------
!macro customUnInstall
  ; Terminate any lingering processes first
  nsExec::ExecToLog 'taskkill /F /IM "Ito.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-dev.exe" /T'
  nsExec::ExecToLog 'taskkill /F /IM "Ito-local.exe" /T'
  Sleep 1000

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
  ; ------------------------------------------------------------------
  DeleteRegKey HKCU "Software\Ito"
  DeleteRegKey HKCU "Software\ito"
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
  ; ------------------------------------------------------------------
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito-dev"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\ai.ito.ito-local"
!macroend
