# Windows 桌面打包实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Chat with GeoGebra Web 应用打包为 Windows 便携版 .exe，双击即可运行。

**Architecture:** Electron 主进程 spawn Next.js standalone 服务器作为子进程，BrowserWindow 加载 localhost 页面。生产模式下用 `ELECTRON_RUN_AS_NODE=1` 让 Electron 二进制作为 Node.js 运行 standalone server.js。开发模式下自动检测并启动 Next.js dev server。

**Tech Stack:** Electron, electron-builder, Next.js standalone output

---

### Task 1: 安装 Electron 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 安装 electron 和 electron-builder**

```bash
bun add -D electron electron-builder
```

- [ ] **Step 2: 验证安装成功**

```bash
npx electron --version
npx electron-builder --version
```

Expected: 两个命令均输出版本号（electron ~35.x, electron-builder ~26.x）

- [ ] **Step 3: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add electron and electron-builder dev dependencies"
```

---

### Task 2: 创建 electron/main.js — Electron 主进程

**Files:**
- Create: `electron/main.js`

- [ ] **Step 1: 创建 electron 目录**

```bash
mkdir -p electron
```

- [ ] **Step 2: 创建 electron/main.js**

```javascript
const { app, BrowserWindow, dialog } = require('electron');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const http = require('http');
const net = require('net');

const PORT = 17365;
const DEV_PORT = 3000;
const MAX_WAIT_MS = 30000;
const CHECK_INTERVAL_MS = 500;

let nextProcess = null;
let mainWindow = null;

function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(true));
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}

function killProcessOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const result = execFileSync('netstat', ['-ano'], { encoding: 'utf8' });
      const lines = result.split('\n').filter(
        (line) => line.includes(`:${port}`) && line.includes('LISTENING')
      );
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && /^\d+$/.test(pid)) {
          execFileSync('taskkill', ['/PID', pid, '/F'], { stdio: 'ignore' });
        }
      }
    } else {
      const result = execFileSync('lsof', ['-ti', `:${port}`], {
        encoding: 'utf8',
      });
      const pids = result.trim().split('\n').filter(Boolean);
      for (const pid of pids) {
        if (/^\d+$/.test(pid)) {
          process.kill(parseInt(pid, 10), 'SIGKILL');
        }
      }
    }
  } catch {
    // Port is free
  }
}

function waitForServer(port, maxWaitMs) {
  return new Promise((resolve) => {
    const start = Date.now();
    function check() {
      if (Date.now() - start > maxWaitMs) {
        resolve(false);
        return;
      }
      const req = http.get(`http://localhost:${port}/chat/`, (res) => {
        res.resume();
        resolve(res.statusCode < 400);
      });
      req.on('error', () => {
        setTimeout(check, CHECK_INTERVAL_MS);
      });
      req.setTimeout(2000, () => {
        req.destroy();
        setTimeout(check, CHECK_INTERVAL_MS);
      });
    }
    check();
  });
}

async function startNextServer() {
  if (!app.isPackaged) {
    const inUse = await isPortInUse(DEV_PORT);
    if (!inUse) {
      nextProcess = spawn('bun', ['run', 'dev'], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
      });
    }
    return DEV_PORT;
  }

  const inUse = await isPortInUse(PORT);
  if (inUse) {
    killProcessOnPort(PORT);
    await new Promise((r) => setTimeout(r, 1000));
  }

  const serverPath = path.join(process.resourcesPath, 'standalone', 'server.js');
  nextProcess = spawn(process.execPath, [serverPath], {
    env: {
      ...process.env,
      PORT: String(PORT),
      HOSTNAME: 'localhost',
      ELECTRON_RUN_AS_NODE: '1',
    },
    stdio: 'pipe',
  });

  nextProcess.on('error', (err) => {
    console.error('Failed to start Next.js server:', err);
  });

  nextProcess.stdout?.on('data', (data) => {
    console.log(`[Next.js] ${data.toString().trim()}`);
  });

  nextProcess.stderr?.on('data', (data) => {
    console.error(`[Next.js] ${data.toString().trim()}`);
  });

  return PORT;
}

async function createWindow() {
  const port = await startNextServer();
  const url = `http://localhost:${port}/chat/`;

  const ready = await waitForServer(port, MAX_WAIT_MS);
  if (!ready) {
    const message = app.isPackaged
      ? '服务启动超时，请重启应用。'
      : `开发服务器未就绪。\n请先运行 bun run dev，再启动 Electron。`;
    dialog.showErrorBox('启动失败', message);
    app.quit();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'Chat with GeoGebra',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadURL(url);

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function cleanup() {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  cleanup();
  app.quit();
});

app.on('before-quit', cleanup);
```

- [ ] **Step 3: Commit**

```bash
git add electron/main.js
git commit -m "feat: add Electron main process with Next.js server management"
```

---

### Task 3: 创建 electron-builder.yml — 打包配置

**Files:**
- Create: `electron/electron-builder.yml`

- [ ] **Step 1: 创建 electron/electron-builder.yml**

```yaml
appId: com.chatwithgeogebra.app
productName: ChatWithGeoGebra
directories:
  output: release
files:
  - electron/**/*
  - package.json
extraResources:
  - from: .next/standalone
    to: standalone
    filter:
      - "**/*"
  - from: .next/static
    to: standalone/.next/static
    filter:
      - "**/*"
  - from: public/GeoGebra
    to: standalone/public/GeoGebra
    filter:
      - "**/*"
win:
  target: portable
```

**说明：**
- `extraResources` 将 Next.js standalone 产物、静态文件、GeoGebra 小程序复制到 `resources/standalone/`
- `win.target: portable` 生成免安装便携版 .exe
- `files` 仅包含 Electron 代码和 package.json（不包含 Next.js 源码）

- [ ] **Step 2: Commit**

```bash
git add electron/electron-builder.yml
git commit -m "feat: add electron-builder config for Windows portable"
```

---

### Task 4: 更新 package.json — 添加 Electron scripts

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加 Electron scripts 和 main 字段**

在 `package.json` 中添加 `main` 字段和两条 scripts。

`main` 字段（与 `name` 同级）：
```json
"main": "electron/main.js",
```

新增 scripts：
```json
"electron:dev": "electron .",
"electron:build": "next build && electron-builder --config electron/electron-builder.yml --win portable"
```

完整 scripts 应为：
```json
"main": "electron/main.js",
"scripts": {
  "dev": "bun run --bun next dev --turbopack",
  "build": "bun run --bun next build",
  "start": "bun run --bun next start",
  "lint": "bun run --bun next lint",
  "search:test": "tsx scripts/test-search-commands.ts",
  "electron:dev": "electron .",
  "electron:build": "next build && electron-builder --config electron/electron-builder.yml --win portable"
}
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "feat: add electron scripts and main entry to package.json"
```

---

### Task 5: 更新 .gitignore — 排除 Electron 构建产物

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: 追加 Electron 构建产物目录**

在 `.gitignore` 末尾添加：

```
# electron
/release/
/dist-electron/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add electron build output to .gitignore"
```

---

### Task 6: 手动验证 — electron:dev 模式

**Files:** 无新文件

- [ ] **Step 1: 启动 Electron 开发模式**

```bash
bun run electron:dev
```

Expected:
1. 如果 dev server 未运行，自动执行 `bun run dev`
2. 控制台显示 `[Next.js]` 日志输出
3. Electron 窗口打开，加载 `localhost:3000/chat/`
4. 页面正常显示，GeoGebra 小程序可交互
5. AI 对话功能正常（配置好 API Key 后）
6. 关闭窗口后，子进程被清理

- [ ] **Step 2: 验证端口冲突处理**

1. 在终端手动运行 `bun run dev`（占用 3000 端口）
2. 另开终端运行 `bun run electron:dev`
3. Expected: Electron 检测到端口已被占用，直接连接现有 dev server，不重复启动

- [ ] **Step 3: 验证超时提示**

1. 不启动 dev server
2. 临时修改 `DEV_PORT` 为一个未使用的端口（如 39999）再运行
3. Expected: 30s 后弹出错误对话框 "开发服务器未就绪"
4. 恢复 `DEV_PORT = 3000`

---

### Task 7: 手动验证 — electron:build 完整构建

**Files:** 无新文件

- [ ] **Step 1: 执行完整构建**

```bash
bun run electron:build
```

Expected:
1. `next build` 完成，输出 standalone 产物到 `.next/standalone/`
2. `electron-builder` 打包：
   - 复制 `.next/standalone/` → `resources/standalone/`
   - 复制 `.next/static/` → `resources/standalone/.next/static/`
   - 复制 `public/GeoGebra/` → `resources/standalone/public/GeoGebra/`
   - 生成 Windows portable .exe
3. 产物位于 `release/` 目录

- [ ] **Step 2: 检查产物**

```bash
ls -lh release/
```

Expected: 存在 `ChatWithGeoGebra.exe` 或类似的 portable .exe 文件

- [ ] **Step 3: 在 Windows 环境验证**

> 注意：macOS 上交叉编译生成的 .exe 需在真实 Windows 环境运行验证

1. 将 .exe 复制到 Windows 机器
2. 双击运行
3. Expected: 窗口打开，加载 GeoGebra，AI 对话功能正常
4. 关闭窗口后，进程完全退出
