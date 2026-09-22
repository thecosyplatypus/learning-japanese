const { app, BrowserWindow, Menu, shell, nativeImage } = require('electron');
const path = require('path');

const ICON_PATH = path.join(__dirname, 'icon.png');
const MIN_SPLASH_MS = 3000;   // how long the splash lingers while the app warms up

function createSplash() {
  const splash = new BrowserWindow({
    width: 360,
    height: 400,
    frame: false,
    transparent: true,
    resizable: false,
    movable: false,
    hasShadow: false,
    alwaysOnTop: true,
    center: true,
    show: false,
    icon: ICON_PATH,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false
    }
  });
  splash.loadFile(path.join(__dirname, 'src', 'splash.html'));
  splash.once('ready-to-show', () => splash.show());
  splash.on('closed', () => { if (app._splash) app._splash = null; });
  return splash;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 860,
    minHeight: 600,
    title: 'Learning Japanese',
    icon: ICON_PATH,
    backgroundColor: '#fff',
    show: false,               // shown once ready + splash time has elapsed
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
      backgroundThrottling: true
    }
  });

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  win.loadFile(path.join(__dirname, 'src', 'index.html'));
  win.setIcon(nativeImage.createFromPath(ICON_PATH));

  win.on('page-title-updated', (e) => e.preventDefault());

  win.once('ready-to-show', () => {
    const elapsed = Date.now() - app._startedAt;
    const wait = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(() => {
      if (!win.isDestroyed()) win.show();
      if (app._splash && !app._splash.isDestroyed()) app._splash.close();
    }, wait);
  });

  return win;
}

Menu.setApplicationMenu(null);

app.setAppUserModelId('learning-japanese');   // Windows taskbar grouping + icon

app.whenReady().then(() => {
  app._startedAt = Date.now();
  app._splash = createSplash();
  app._main = createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      app._startedAt = Date.now();
      app._splash = createSplash();
      app._main = createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});