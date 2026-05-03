# Windows 桌面打包设计

## 概述

将 Chat with GeoGebra Web 应用打包为 Windows 便携版（免安装 `.exe`），用户双击即可运行。目标用户为教育场景的师生，需极简操作体验。

## 需求总结

| 项目 | 决策 |
|------|------|
| 运行模式 | AI 对话按配置走（云端/本地 API），GeoGebra 离线运行 |
| 目标用户 | 教育用户（师生），技术能力有限 |
| 安装形态 | 便携版（免安装），双击 `.exe` 直接运行 |
| 开发环境 | macOS 交叉编译 Windows 便携版 |
| 更新机制 | MVP 阶段不需要，手动下载替换 |
| 技术方案 | Electron（方案 A） |

## 架构

```
用户双击 ChatWithGeoGebra.exe
  │
  ▼
Electron Main Process (electron/main.js)
  ├── 检测端口 17365 占用 → 被占用则 kill 旧进程
  ├── spawn Next.js standalone server (resources/standalone/server.js)
  ├── 轮询 localhost:17365/healthz 直到服务就绪（最多 15s）
  ├── 创建 BrowserWindow
  │   ├── 加载 localhost:17365/chat/
  │   ├── 设置窗口标题、图标
  │   └── DevTools 仅开发模式开启
  └── 管理窗口生命周期（关闭时 kill 子进程）
```

### 端口策略

- 固定端口 `17365`（不常见端口，冲突概率低）
- 启动前检测端口占用状态
- 端口被占用 → 检查是否为同应用实例 → 是则 kill 后重启 → 否则提示用户端口冲突

### 进程生命周期

1. `app.on('ready')` — 检测端口、启动 Next.js 服务、等待就绪、创建窗口
2. `app.on('window-all-closed')` — kill Next.js 子进程 + `app.quit()`
3. `app.on('before-quit')` — 确保 Next.js 子进程被终止

## 项目结构

在现有项目中新增 `electron/` 目录，不改变现有代码结构：

```
chat-with-geogebra-next/
├── electron/
│   ├── main.js              # Electron 主进程
│   ├── preload.js           # preload 脚本（如需要）
│   └── electron-builder.yml # 打包配置
├── app/                      # 现有 Next.js 代码（不变）
├── public/GeoGebra/          # 现有静态文件（不变）
└── package.json              # 新增 electron 相关依赖和 scripts
```

## 打包流程

```
next build (standalone 模式)
  → 复制 .next/standalone/ + public/GeoGebra/ → electron/resources/
  → electron-builder --win portable
  → 输出 ChatWithGeoGebra.exe
```

打包体积预估：~300-350MB（Chromium ~150MB + Node + GeoGebra 115MB + 应用代码）

## 构建命令

```bash
bun run dev             # 纯 Web 开发（不变）
bun run electron:dev    # 启动 Next.js dev server（支持热更新）+ Electron BrowserWindow 加载 localhost
bun run electron:build  # next build → 复制资源 → electron-builder 打包
```

**`electron:dev` 模式**：Electron 主进程直接连接 `bun run dev` 启动的 Next.js dev server（localhost:3000），支持 HMR 热更新，无需构建 standalone 产物。

**package.json 新增依赖：**
- `devDependencies`: `electron`, `electron-builder`

**交叉编译：** macOS 上通过 `electron-builder --win` 直接打包 Windows 便携版。

## 对现有代码的影响

**核心原则：现有代码零改动。**

| 改动项 | 说明 |
|--------|------|
| `package.json` | 新增 electron devDependencies + scripts |
| `electron/` 目录 | 全新文件 |
| `next.config.ts` | 无需修改（已配置 `output: 'standalone'`） |
| `.gitignore` | 新增 `dist-electron/`、`release/` 构建产物 |
| 现有页面/API | 零改动 — Electron BrowserWindow 与浏览器环境一致 |

不需要改动的原因：
- `useChat` hook 在 localhost 环境正常工作
- GeoGebra `window.ggbApplet` 在 Electron BrowserWindow 中可用
- API 路由由内嵌的 Next.js standalone 服务处理
- Zustand localStorage 持久化在 Electron 中照常工作
