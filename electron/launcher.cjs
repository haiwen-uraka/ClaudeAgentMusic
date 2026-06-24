#!/usr/bin/env node
/**
 * Claudio — Electron Launcher
 *
 * This script spawns the Electron binary directly and serves as
 * the bridge between the user's app and the Electron APIs.
 *
 * Usage: node electron/launcher.cjs
 */

'use strict'

const { spawn } = require('child_process')
const path = require('path')
const fs = require('fs')
const http = require('http')
const os = require('os')

const ELECTRON_DIR = path.join(__dirname, 'node_modules', 'electron', 'dist')
const ELECTRON_EXE = path.join(ELECTRON_DIR, 'electron.exe')
const MAIN_SCRIPT = path.join(__dirname, 'main.cjs')
const PATCH_SCRIPT = path.join(__dirname, 'electron-patch.cjs')
const TRAY_ICON = path.join(__dirname, 'tray-icon.png')

// ── Step 1: Create IPC server for app ↔ launcher communication ──
const IPC_PORT = 19723 // Claudio's birthday ;)
let ipcClients = []

const ipcServer = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${IPC_PORT}`)

  if (url.pathname === '/api/ipc' && req.method === 'POST') {
    let body = ''
    req.on('data', (chunk) => { body += chunk })
    req.on('end', () => {
      try {
        const msg = JSON.parse(body)
        // Forward IPC message to electron main process
        if (mainWindow && mainWindow.webContents) {
          mainWindow.webContents.send('ipc-from-launcher', msg)
        }
        res.writeHead(200)
        res.end(JSON.stringify({ ok: true }))
      } catch {
        res.writeHead(400)
        res.end(JSON.stringify({ error: 'Invalid JSON' }))
      }
    })
  } else if (url.pathname === '/api/ipc' && req.method === 'GET') {
    // SSE for messages from electron → app
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    })
    ipcClients.push(res)
    req.on('close', () => {
      ipcClients = ipcClients.filter((c) => c !== res)
    })
  } else {
    res.writeHead(404)
    res.end('Not Found')
  }
})

ipcServer.listen(IPC_PORT, '127.0.0.1', () => {
  console.log(`[launcher] IPC server listening on port ${IPC_PORT}`)
})

// ── Step 2: Spawn Electron with patch preload ────────────────
console.log('[launcher] Starting Electron...')
console.log('[launcher] Binary:', ELECTRON_EXE)
console.log('[launcher] Main:', MAIN_SCRIPT)

const electronProc = spawn(ELECTRON_EXE, [
  '--require', PATCH_SCRIPT,
  MAIN_SCRIPT,
], {
  cwd: path.join(__dirname, '..'),
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    CLAUDIO_IPC_PORT: String(IPC_PORT),
    ELECTRON_RUN_AS_NODE: '',
  },
})

electronProc.stdout.on('data', (data) => {
  process.stdout.write(data)
})

electronProc.stderr.on('data', (data) => {
  process.stderr.write(data)
})

electronProc.on('exit', (code) => {
  console.log(`[launcher] Electron exited with code ${code}`)
  ipcServer.close()
  if (code !== 0) {
    console.log('[launcher] If Electron failed to start, make sure the server is running: npm run dev')
  }
  process.exit(code || 0)
})

// ── Step 3: Graceful shutdown ────────────────────────────────
function shutdown() {
  console.log('\n[launcher] Shutting down...')
  electronProc.kill('SIGTERM')
  ipcServer.close()
  setTimeout(() => process.exit(0), 2000)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

// Forward messages from IPC clients to electron
function broadcastToElectron(msg) {
  if (electronProc.stdin.writable) {
    electronProc.stdin.write(JSON.stringify(msg) + '\n')
  }
}
