const Promise = require('bluebird');
const path = require('path');


const DATA_PATH = path.join(__dirname, '../data');

const Common = {
  DATA_PATH,
  RENDERER_DATA_PATH: path.join(DATA_PATH, 'chromium'),
  CONFIG_PATH: path.join(DATA_PATH, 'config'),
};

module.exports = Common;
