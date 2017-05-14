/* globals Vue, ELEMENT */
const electron = require('electron');
const ipcRenderer = electron.ipcRenderer;
const _ = require('lodash');
// const Promise = require('bluebird');
const Config = require('../config');
// const DEFAULT_CONFIG = Config.DEFAULT_CONFIG;

const DEFAULT_CONFIG = Object.assign({}, Config.DEFAULT_CONFIG);

// ELEMENT.locale(ELEMENT.lang.ko);
Vue.use(ELEMENT);

const trim = str => str.trim();

const app = new Vue({
  el: '#app',
  mounted () {
    this.$watch('config', newConfig => {
      const config = Object.assign({}, this.oldConfig, newConfig);
      config.filterWords = (config._filterWords || '').split('\n').map(trim);
      if ((config._filterWords || '').trim() === '') {
        config.filterWords = [];
      }
      config._filterWords = undefined;
      ipcRenderer.send('ipc.renderer.shoebill.config/update-config', { config });
    }, { deep: true });
    ipcRenderer.once('ipc.main.shoebill.config/on-load', (event, args) => {
      const { config } = args;
      config._filterWords = (config.filterWords || []).map(trim).join('\n');
      this.$set(this, 'oldConfig', Object.assign({}, args.config));
      this.$set(this, 'config', config);
    });
    ipcRenderer.send('ipc.renderer.shoebill.config/request-load');
  },
  data () {
    return {
      config: Object.assign({}, DEFAULT_CONFIG),
      oldConfig: Object.assign({}, DEFAULT_CONFIG),
    };
  },
});
