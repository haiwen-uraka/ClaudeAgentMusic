// ============================================================
// Claudio Electron — electron-patch.cjs
// Preloaded via --require before the user's app
// ============================================================
//
// NOTE: With the current stripped binary, the C++ require hook
// only activates for the default_app module tree. For user apps
// and preloaded modules, require('electron') returns the npm
// package's path string.
//
// This patch records the situation and provides graceful degradation.
// ============================================================

'use strict'

const fs = require('fs')
const path = require('path')
const Module = require('module')
const natives = process.binding('natives')

const logFile = path.join(process.cwd(), 'electron-debug.log')
function log(msg) {
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`)
}

log('=== electron-patch.cjs loaded ===')
log(`Electron version: ${process.versions.electron}`)
log(`node_init available: ${!!natives['electron/js2c/node_init']}`)

// Try to load electron via the binary's internals
let realElectron = null

try {
  realElectron = require('electron')
  log(`require('electron') type: ${typeof realElectron}`)

  if (typeof realElectron === 'object' && realElectron !== null) {
    log(`require('electron') keys: ${Object.keys(realElectron).slice(0, 10).join(', ')}`)
  } else if (typeof realElectron === 'string') {
    log(`require('electron') returned path: ${realElectron.slice(-50)}`)
  }
} catch (e) {
  log(`require('electron') error: ${e.message}`)
}

// If we got the real API (not a string), patch Module._load
if (realElectron && typeof realElectron === 'object' && !realElectron.__stub) {
  const originalLoad = Module._load

  Module._load = function (request, parent, isMain) {
    if (request === 'electron' || request === 'electron/main' || request === 'electron/renderer') {
      return realElectron
    }
    return originalLoad.call(this, request, parent, isMain)
  }

  Module._cache['electron'] = realElectron
  Module._cache['electron/main'] = realElectron
  Module._cache['electron/renderer'] = realElectron
  globalThis.electron = realElectron
  globalThis.__ELECTRON_API__ = realElectron

  log('✓ Patch applied — real Electron API available')
} else {
  // Fallback: provide stub and write info for debugging
  log('✗ Could not obtain real Electron API')

  // Try to provide minimal stubs via the binary's internal module
  try {
    const nodeInitSource = natives['electron/js2c/node_init']
    if (nodeInitSource) {
      log(`node_init source available (${nodeInitSource.length} chars)`)
      // The source is webpack-bundled and depends on internal modules
      // that aren't available in user app context
    }
  } catch (e) {
    log(`node_init error: ${e.message}`)
  }

  // Write diagnostic info
  fs.writeFileSync(
    path.join(process.cwd(), 'electron-debug.json'),
    JSON.stringify({
      electronVersion: process.versions.electron,
      nodeVersion: process.versions.node,
      chromeVersion: process.versions.chrome,
      requireElectronType: typeof realElectron,
      hasNodeInit: !!natives['electron/js2c/node_init'],
      modulePath: require.resolve('electron'),
      moduleMain: require('electron/package.json')?.main,
    }, null, 2)
  )

  log('Diagnostic info written to electron-debug.json')
}
