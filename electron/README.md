# Claudio — Electron Desktop 集成指南

## 当前状态

已创建完整的 Electron 项目结构，但受限于当前 Electron 二进制文件的版本：
- **二进制**: v33.2.0 (从 cdn.npmmirror.com 下载)
- **npm 包**: v33.4.11
- **问题**: 二进制的 C++ require hook 只对 `default_app` 生效，用户 app 中 `require('electron')` 返回路径字符串而非 API 对象

## 已创建的文件

```
electron/
├── main.cjs          # Electron 主进程 (等待 require('electron') 可用)
├── preload.cjs       # 预加载脚本 (contextBridge 安全桥接)
├── electron-patch.cjs # --require 预加载补丁 (调试用)
├── launcher.cjs      # 独立启动器 (备用方案)
└── tray-icon.png     # 系统托盘图标 (自动生成)

scripts/
└── generate-icon.cjs # 托盘图标生成脚本
```

## 启动方式

### 方案 A: Edge 桌面窗口 (推荐，立即可用)

```bash
# 双击运行
launch-claudio.ps1
```

或在命令行：
```powershell
powershell -ExecutionPolicy Bypass -File launch-claudio.ps1
```

### 方案 B: Electron (需要修复 require 问题)

要使用 Electron 完整功能，需要解决 `require('electron')` 的问题。可行方案：

1. **使用 electron-builder 重新打包**（推荐）
   ```bash
   npm install --save-dev electron-builder
   npx electron-builder --win nsis
   ```

2. **切换到 Tauri**（更轻量，~10MB）
   ```bash
   npm install --save-dev @tauri-apps/cli
   npx tauri init
   ```

## package.json 脚本

```json
{
  "electron:dev": "electron .",
  "generate:icon": "node scripts/generate-icon.cjs",
  "postinstall": "node scripts/generate-icon.cjs"
}
```

## 注意事项

- 启动 Electron 前确保 Fastify 服务器运行 (`npm run dev`)
- 前端服务地址: http://localhost:8080
- Electron 窗口会加载此地址
