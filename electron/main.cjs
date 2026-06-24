// ============================================================
// Claudio Electron — Main Process
// ============================================================
// Gracefully handles environments where require('electron')
// returns a string path (stripped binary) or the real API.
// ============================================================

'use strict'

const path = require('path')
const fs = require('fs')

// ── Load Electron API ──────────────────────────────────────
const electronRaw = require('electron')
let electron

if (typeof electronRaw === 'string') {
  // Stripped binary: require('electron') returns the binary path
  // We can't access the full Electron API in this mode.
  // The app will run in "web view" mode (just a browser window).
  console.warn('[main] Electron API not available (stripped binary). Running in web view mode.')
  console.warn('[main] For full Electron features, use: npm run electron:dev (with proper binary)')
  electron = null
} else {
  electron = electronRaw
}

const { app, BrowserWindow, Tray, Menu, ipcMain, nativeImage, shell } = electron || {}
let mainWindow = null
let tray = null
let isQuitting = false

// ── Window ─────────────────────────────────────────────────
function createWindow() {
  if (!BrowserWindow) {
    console.error('[main] BrowserWindow not available — cannot create window')
    process.exit(1)
  }

  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
    minWidth: 360,
    minHeight: 520,
    backgroundColor: '#0d0d14',
    title: 'Claudio - AI Radio',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  mainWindow.loadURL('http://localhost:8080')

  mainWindow.on('minimize', (e) => {
    e.preventDefault()
    mainWindow.hide()
  })

  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })
}

// ── System Tray ────────────────────────────────────────────
function createTray() {
  if (!Tray || !nativeImage) return

  let trayIcon = null

  const iconPath = path.join(__dirname, 'tray-icon.png')
  if (fs.existsSync(iconPath)) {
    try {
      trayIcon = nativeImage.createFromPath(iconPath)
      if (trayIcon.isEmpty()) trayIcon = null
    } catch { /* ignore */ }
  }

  if (!trayIcon) {
    const svg = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16">',
      '<circle cx="8" cy="8" r="7" fill="#00e676"/>',
      '<circle cx="8" cy="8" r="3" fill="#0d0d14"/>',
      '</svg>',
    ].join('')
    trayIcon = nativeImage.createFromDataURL(
      `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
    )
  }

  tray = new Tray(trayIcon)
  tray.setToolTip('Claudio - AI Radio')

  const ctxMenu = Menu.buildFromTemplate([
    { label: 'Show Claudio', click: () => mainWindow?.show() },
    { label: 'Hide', click: () => mainWindow?.hide() },
    { type: 'separator' },
    { label: 'Quit', click: () => { isQuitting = true; app.quit() } },
  ])

  tray.setContextMenu(ctxMenu)

  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      mainWindow?.show()
    }
  })
}

// ── App Lifecycle ──────────────────────────────────────────
if (app) {
  app.whenReady().then(() => {
    createWindow()
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
      }
    })
  })

  app.on('window-all-closed', () => {
    // Keep running in tray
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  // ── IPC Handlers ───────────────────────────────────────────
  if (ipcMain) {
    ipcMain.handle('claudio:version', () => '0.1.0')
    ipcMain.handle('claudio:platform', () => process.platform)
    ipcMain.handle('claudio:show', () => mainWindow?.show())
    ipcMain.handle('claudio:hide', () => mainWindow?.hide())
    ipcMain.handle('claudio:quit', () => { isQuitting = true; app.quit() })
    if (shell) {
      ipcMain.handle('claudio:openExternal', (_, url) => shell.openExternal(url))
    }
  }
} else {
  // No electron — just wait for the server and exit
  console.error('[main] Electron not available. Use launch-claudio.ps1 for Edge app mode.')
  process.exit(1)
}
