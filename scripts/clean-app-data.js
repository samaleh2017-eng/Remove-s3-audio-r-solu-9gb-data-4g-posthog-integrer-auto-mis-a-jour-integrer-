#!/usr/bin/env node

const os = require('os')
const fs = require('fs')
const path = require('path')

const platform = os.platform()

// All known stage variants used by lib/main/env.ts:
//   app.setPath('userData', path.join(app.getPath('appData'), `Ito-${stage}`))
const APP_NAME_VARIANTS = ['Ito', 'Ito-prod', 'Ito-dev', 'Ito-local']

const getPathsToRemove = () => {
  if (platform === 'darwin') {
    const appSupport = path.join(os.homedir(), 'Library', 'Application Support')
    return APP_NAME_VARIANTS.map(name => path.join(appSupport, name))
  }

  if (platform === 'win32') {
    const roaming = process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming')
    const local = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const programsLocal = path.join(local, 'Programs')

    return [
      ...APP_NAME_VARIANTS.map(name => path.join(roaming, name)),
      ...APP_NAME_VARIANTS.map(name => path.join(local, name)),
      ...APP_NAME_VARIANTS.map(name => path.join(programsLocal, name)),
    ]
  }

  // Linux
  const configDir = path.join(os.homedir(), '.config')
  return APP_NAME_VARIANTS.map(name => path.join(configDir, name.toLowerCase()))
}

const pathsToRemove = getPathsToRemove()
let removed = 0

for (const targetPath of pathsToRemove) {
  if (fs.existsSync(targetPath)) {
    fs.rmSync(targetPath, { recursive: true, force: true })
    console.log(`✓ Removed: ${targetPath}`)
    removed++
  }
}

if (removed === 0) {
  console.log('ℹ No app data found — already clean.')
} else {
  console.log(`\n✓ Removed ${removed} director${removed === 1 ? 'y' : 'ies'}.`)
}
