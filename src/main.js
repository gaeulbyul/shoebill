const electron = require('electron');
const {
  app,
  shell,
  BrowserWindow,
  ipcMain,
} = electron;

const path = require('path');
const url = require('url');

const config = require('./config');
config.installIPC(ipcMain);

app.setPath('userData', path.join(__dirname, '../data/chromium'));

let mainWindow;

function createMainWindow () {
  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    backgroundColor: '#1c6399',
    nodeIntegration: true,
    webSecurity: false,
  });

  mainWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.on('new-window', (event, url) => {
    shell.openExternal(url);
  });
}


app.on('ready', () => {
  createMainWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createMainWindow();
  }
});

