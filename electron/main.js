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
