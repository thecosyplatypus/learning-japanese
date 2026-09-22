const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('disable-gpu'); app.commandLine.appendSwitch('no-sandbox');
const path = require('path');
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: false, width: 900, height: 720, webPreferences: { contextIsolation: false } });
  win.webContents.on('console-message', (e, l, m) => { console.log('RENDMSG[' + l + '] ' + (m || '').slice(0, 300)); });
  win.loadFile(path.join('src', 'index.html')).then(() => { setTimeout(() => { console.log('DONE'); win.destroy(); app.exit(0); }, 1800); })
     .catch(e => { console.log('LOADFAIL ' + String(e && e.message || e)); app.exit(1); });
});
