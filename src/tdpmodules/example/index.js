const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;

module.exports = {
  onLoad () {
    console.log('onload');
  },
  onDOMReady () {
    console.log('dom ready!');
  },
  onTDReady () {
    console.info('td ready!');
  },
  onConfigLoad (config) {
    console.log('config loaded! %j', config);
  },
};

