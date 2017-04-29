const url = require('url');
const path = require('path');
const electron = require('electron');
const { ipcRenderer } = electron;
const { BrowserWindow } = electron.remote;

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
  configWindow.loadURL(url.format({
    pathname: path.join(__dirname, 'configUI', 'index.html'),
    protocol: 'file:',
    slashes: true,
  }));
  configWindow.once('ready-to-show', () => configWindow.show());
  configWindow.on('closed', () => {
    configWindow = null;
  });
  return configWindow;
}

class Toaster {
  constructor (container) {
    if (!container) {
      throw new Error('please give container element');
    }
    this.container = container;
    this.toasts = {};
  }
  toast (message) {
    const toastID = Date.now() + (Math.random() * 100);
    const toast = this.toasts[toastID] = document.createElement('div');
    toast.classList.add('toast');
    toast.setAttribute('data-toast-id', toastID);
    {
      const text = document.createElement('div');
      text.classList.add('text');
      text.textContent = message;
      toast.appendChild(text);
    }
    {
      const close = document.createElement('div');
      close.classList.add('close');
      close.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
      close.addEventListener('click', event => {
        this.close(toastID);
      });
      toast.appendChild(close);
    }
    this.container.appendChild(toast);
    toast.style.transform = 'translateY(0)';
    window.setTimeout(() => this.close(toastID), 5000);
  }
  close (toastID) {
    const toast = this.toasts[toastID];
    if (!toast) return;
    this.toasts[toastID] = null;
    toast.classList.add('hiding');
    toast.addEventListener('animationend', event => {
      toast.innerHTML = '';
      toast.style.display = 'none';
      toast.remove();
    });
  }
  changeFont (font) {
    this.container.style.fontFamily = font;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toaster = new Toaster(document.querySelector('.toast-container'));
  ipcRenderer.on('ipcR.shoebill.config/on-load', (event, args) => {
    const { config } = args;
    if (config.font) {
      toaster.changeFont(config.font);
    }
  });
  ipcRenderer.send('ipc.shoebill.config/request-load');
  const webview = document.getElementById('tweetdeck');
  webview.addEventListener('ipc-message', event => {
    const { channel, args } = event;
    if (channel === 'ipcM.shoebill.ui/toast-message') {
      const { message } = args[0];
      toaster.toast(message);
    } else if (channel === 'ipcM.shoebill.config/open') {
      createConfigWindow();
    }
  });
  webview.addEventListener('dom-ready', event => {
    webview.openDevTools();
    const webContents = webview.getWebContents();
  });
});

window.addEventListener('beforeunload', () => {
  try {
    configWindow.close();
    configWindow = null;
  } catch (e) {}
});
