/* globals TD */
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const Promise = require('bluebird');
const path = require('path');
const fs = require('mz/fs');
const API = require('./api');
const fixLogin = require('./fix-login');

fixLogin(window);

const moduleToLoad = [
  // 'example',
  'emojipad',
  'imageviewer',
  'clipboard-paste',
  'gif-autoplay',
  'link-fix',
  'switch-account',
  'timeline-thumbimg',
  'tweet-filter',
  'rt-dialog',
  'context-menu',
  'badge-clear',
  'user-notes',
  // 'imagepicker',
  // 'favorite-downloader',
  // 'followers',
];

function toast (message) {
  ipcRenderer.sendToHost('ipc.renderer.shoebill.ui/toast-message', { message });
}

const loadedModules = [];

if (location.hostname === 'tweetdeck.twitter.com') {
  for (const m of moduleToLoad) {
    const modpath = `./tdpmodules/${m}`;
    const mod = require(modpath);
    loadedModules.push(mod);
    mod.onLoad && mod.onLoad();
    if ('onDOMReady' in mod) {
      document.addEventListener('DOMContentLoaded', mod.onDOMReady);
    }
    const csspath = path.join(__dirname, modpath, 'index.css');
    fs.readFile(csspath, 'utf8').then(css => {
      API.injectStyle(css);
    }, error => {
      if (error.code !== 'ENOENT') {
        console.error(error);
        throw error;
      }
    });
  }
  ipcRenderer.on('ipc.main.shoebill.config/on-load', (event, args) => {
    const { config } = args;
    if (config.font) {
      API.changeFont(config.font);
    }
    for (const mod of loadedModules) {
      mod.onConfigLoad && mod.onConfigLoad(config);
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    ipcRenderer.send('ipc.renderer.shoebill.config/request-load');
    const $ = window.$;
    for (const mod of loadedModules) {
      if ('css' in mod) {
        API.injectStyle(mod.css);
      }
    }
    $(document).on('TD.ready', () => {
      for (const mod of loadedModules) {
        mod.onTDReady && mod.onTDReady();
      }
    });
    $(document.body).on('contextmenu', '.js-app-settings', event => {
      event.preventDefault();
      ipcRenderer.sendToHost('ipc.renderer.shoebill.config/open');
    });
    TD.controller.progressIndicator.addMessage$REAL = TD.controller.progressIndicator.addMessage;
    TD.controller.progressIndicator.addMessage = function (msg) {
      toast(msg);
    };
  });
}

Object.assign(window, {
  toast,
});
