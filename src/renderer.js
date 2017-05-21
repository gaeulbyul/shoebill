/* globals Toaster */
const URL = require('url');
const path = require('path');
const electron = require('electron');

const { ipcRenderer, shell, remote } = electron;
const { BrowserWindow, Menu } = remote;

let configWindow;

function createConfigWindow () {
  if (configWindow) {
    configWindow.focus();
    return;
  }
  configWindow = new BrowserWindow({
    width: 600,
    height: 700,
    minWidth: 600,
    minHeight: 700,
    resizable: false,
    maximizable: false,
    nodeIntegration: true,
    webSecurity: false,
    // preload: path.join(__dirname, 'preload-mainview.js'),
  });
  configWindow.loadURL(URL.format({
    pathname: path.join(__dirname, 'configUI', 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));
  configWindow.once('ready-to-show', () => configWindow.show());
  configWindow.on('closed', () => {
    configWindow = null;
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const toaster = new Toaster(document.querySelector('.toast-container'));
  ipcRenderer.on('ipc.main.shoebill.config/on-load', (event, args) => {
    const { config } = args;
    if (config.font) {
      toaster.changeFont(config.font);
    }
  });
  ipcRenderer.send('ipc.renderer.shoebill.config/request-load');
  {
    const webview = document.getElementById('tweetdeck');
    webview.addEventListener('new-window', event => {
      const { url, frameName } = event;
      try {
        const parsedURL = URL.parse(url);
        if (!(['http:', 'https:', 'mailto:'].includes(parsedURL.protocol))) {
          throw new Error('Unknown protocol!');
        }
        shell.openExternal(url);
      } catch (e) {
        console.error('Error on opening url "%s"', url);
      }
    });
    webview.addEventListener('ipc-message', event => {
      const { channel, args } = event;
      if (channel === 'ipc.renderer.shoebill.ui/toast-message') {
        const { message } = args[0];
        toaster.toast(message);
      } else if (channel === 'ipc.renderer.shoebill.config/open') {
        createConfigWindow();
      }
    });
    webview.addEventListener('dom-ready', event => {
      webview.openDevTools();
    });
  }
  {
    const twebview = document.getElementById('twitter');
    twebview.addEventListener('ipc-message', event => {
      const { channel, args } = event;
    });
    twebview.addEventListener('dom-ready', event => {
      twebview.openDevTools();
    });
  }
});

window.addEventListener('beforeunload', () => {
  if (configWindow) {
    try {
      configWindow.close();
    } finally {
      configWindow = null;
    }
  }
});
