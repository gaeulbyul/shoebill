const Promise = require('bluebird');

const path = require('path');
const fs = require('mz/fs');
const _ = require('lodash');
const mkdirp = require('mkdirp-then');

const Common = require('./common');

const CONFIG_FILE_PATH = path.join(Common.CONFIG_PATH, 'config.json');

const DEFAULT_CONFIG = {
  font: '',
  useImageViewer: false,
  imageViewerSize: 'small',
  useImagePicker: false,
  gifAutoplay: 'default',
  useThumbOnTimeline: false,
  useAltRT: false,
  filterWords: [],
  filterAsRegExp: false,
  filterApplyToUserName: false,
  filterApplyToUserBio: false,
  filterBlockedTweet: false,
  filterBlockedRT: false,
  filterUnavailableQuote: false,
  filterUnder5: false,
  filterOver10Line: false,
  // TODO: filter should {}
};
// Object.seal(DEFAULT_CONFIG);

const Config = {
  _config: Object.assign({}, DEFAULT_CONFIG),
  async load () {
    const config = Object.assign({}, DEFAULT_CONFIG);
    try {
      const configFile = await fs.readFile(CONFIG_FILE_PATH, 'utf8');
      // const configFile = fs.readFileSync(CONFIG_FILE_PATH, 'utf8');
      const json = JSON.parse(configFile);
      Object.assign(config, json);
      this._config = config;
    } catch (e) {
      console.error(e);
      console.warn('Fail to load config file! writing default config file...');
      this.save();
    }
    return config;
  },
  async save () {
    await mkdirp(Common.CONFIG_PATH);
    const jsonstr = JSON.stringify(this._config, null, 2);
    // fs.writeFileSync(CONFIG_FILE_PATH, jsonstr);
    await fs.writeFile(CONFIG_FILE_PATH, jsonstr);
    return this._config;
  },
  update (newConfig) {
    Object.assign(this._config, newConfig);
  },
  /*
  get (key, defaultValue = undefined) {
    return this._config[key] || defaultValue;
  },
  set (key, value) {
    this._config[key] = value;
  },
  setToDefault (key) {
    this._config[key] = DEFAULT_CONFIG[key];
  },
  */
};

module.exports = {
  DEFAULT_CONFIG,
  installIPC (ipcMain) {
    ipcMain.on('ipc.shoebill.config/request-load', (event, args) => {
      Config.load().then(config => {
        event.sender.send('ipcR.shoebill.config/on-load', { config });
      });
    });
    ipcMain.on('ipc.shoebill.config/update-config', (event, args) => {
      const { config } = args;
      Config.update(config);
      Config.save().then(cfg => {
        event.returnValue = cfg;
      }, error => {
        event.returnValue = null;
      });
    });
  },
};
