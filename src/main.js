const electron = require('electron');
const path = require('path');
const URL = require('url');
const config = require('./config');
const Downloader = require('./downloader');

const {
  app,
  shell,
  BrowserWindow,
  ipcMain,
} = electron;

app.setPath('userData', path.join(__dirname, '../data/chromium'));
config.installIPC(ipcMain);

let mainWindow;

function createMainWindow () {
  mainWindow = new BrowserWindow({
    show: false,
    width: 800,
    height: 600,
    title: 'Project Shoebill',
    backgroundColor: '#1c6399',
    nodeIntegration: true,
    webSecurity: false,
  });

  mainWindow.loadURL(URL.format({
    pathname: path.join(__dirname, 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));

  mainWindow.webContents.openDevTools();

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const downloader = new Downloader;
  downloader.installIPC(ipcMain, mainWindow.webContents);
}

app.makeSingleInstance((commandLine, workingDirectory) => {
  // Someone tried to run a second instance, we should focus our window.
  if (mainWindow) {
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  }
});

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
