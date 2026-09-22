const { app, BrowserWindow } = require('electron');
app.commandLine.appendSwitch('no-sandbox'); app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(() => {
  const win = new BrowserWindow({ show: true, width: 900, height: 740, webPreferences: { contextIsolation: false } });
  win.webContents.on('console-message', (e, l, m) => { console.log('RENDERMSG[' + l + '] ' + String(m || '').slice(0, 400)); });
  win.loadFile('src/index.html').then(() => {
    setTimeout(() => { console.log('READY'); }, 2500);
  }).catch(err => { console.log('LOADFAIL ' + String((err && err.message) || err)); });
});
