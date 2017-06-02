/* globals Toaster */
const URL = require('url');
const path = require('path');
const electron = require('electron');
const NeDB = require('nedb');
const common = require('./common');

const { ipcRenderer, shell, remote } = electron;
const { BrowserWindow, Menu } = remote;

const MOBILE_BROWSER_UA = 'Mozilla/5.0 (Linux; Android 7.1.1; Nexus 5X Build/N4F26I) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.91 Mobile Safari/537.36';

const userDB = new NeDB({
  autoload: true,
  filename: path.join(common.CONFIG_PATH, 'user.db'),
});

let configWindow;
const miniWindows = [];

function createMiniWindow (customOptions = {}) {
  const defaultOptions = {
    width: 640,
    height: 480,
    minWidth: 320,
    minHeight: 240,
  };
  const securityOptions = {
    nodeIntegration: false,
    webSecurity: true,
  };
  const options = Object.assign({}, defaultOptions, customOptions, securityOptions);
  const miniWindow = new BrowserWindow(options);
  miniWindows.push(miniWindow);
  miniWindow.once('ready-to-show', () => miniWindow.show());
  const webContents = miniWindow.webContents;
  webContents.on('new-window', (event, url) => {
    event.preventDefault();
    shell.openExternal(url);
  });
  return miniWindow;
}

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

function openLink (url) {
  const parsedURL = URL.parse(url);
  const { protocol, hostname } = parsedURL;
  if (!(['http:', 'https:'].includes(protocol))) {
    throw new Error('Unknown protocol!');
  } else if (protocol === 'mailto:') {
    shell.openExternal(url);
    return;
  }
  const loadURLOptions = {
    httpReferer: 'https://tweetdeck.twitter.com/',
  };
  const miniWindow = createMiniWindow();
  if (hostname === 'mobile.twitter.com') {
    miniWindow.loadURL(url, loadURLOptions);
    return;
  }
  if (hostname === 'twitter.com') {
    loadURLOptions.userAgent = MOBILE_BROWSER_UA;
    miniWindow.loadURL(url, loadURLOptions);
    return;
  }
  shell.openExternal(url);
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
      openLink(url);
    });
    webview.addEventListener('ipc-message', event => {
      const webContents = webview.getWebContents();
      const { channel, args } = event;
      if (channel === 'ipc.renderer.shoebill.ui/toast-message') {
        const { message } = args[0];
        toaster.toast(message);
      } else if (channel === 'ipc.renderer.shoebill.config/open') {
        createConfigWindow();
      } else if (channel === 'ipc.renderer.shoebill.ui/load-user-note') {
        const { id } = args[0];
        userDB.findOne({ id }, (err, user) => {
          const note = (user && user.note) ? user.note : '';
          webContents.send('ipc.renderer.shoebill.ui/onload-user-note', {
            id,
            note,
          });
        });
      } else if (channel === 'ipc.renderer.shoebill.ui/update-user-note') {
        const { id, note } = args[0];
        userDB.update({ id }, {
          $set: { note },
        }, {
          upsert: true,
        }, err => {
          if (err) {
            console.error(err);
          }
        });
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
      // twebview.openDevTools();
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
  for (const win of miniWindows) {
    try {
      win.close();
    } finally {
      // ignore error
    }
  }
});
