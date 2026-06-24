// ============================================================
// Claudio Electron — Preload Script
// Uses require('electron/renderer') for the renderer-process API
// ============================================================

'use strict'

const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('claudioElectron', {
  version: () => ipcRenderer.invoke('claudio:version'),
  platform: () => ipcRenderer.invoke('claudio:platform'),
  show: () => ipcRenderer.invoke('claudio:show'),
  hide: () => ipcRenderer.invoke('claudio:hide'),
  quit: () => ipcRenderer.invoke('claudio:quit'),
  openExternal: (url) => ipcRenderer.invoke('claudio:openExternal', url),
})
