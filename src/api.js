/* globals TD */
const electron = require('electron');
const util = require('util');
const EventEmitter = require('events').EventEmitter;

const ipcRenderer = electron.ipcRenderer;

function toCSSPropName (prop) {
  return prop
    .replace(/_/g, '-')
    .replace(/[A-Z]/g, match => `-${match.toLowerCase()}`)
    .trim();
}

const API = {
  injectStyle (rules) {
    if (!rules) {
      return;
    }
    let css = '';
    if (typeof rules === 'string') {
      css = rules;
    } else if (typeof rules === 'object') {
      for (const selector of Object.keys(rules)) {
        css += `${selector}{`;
        const styles = rules[selector];
        for (const key of Object.keys(styles)) {
          const propname = toCSSPropName(key);
          const value = styles[key].trim();
          css += `${propname}:`;
          css += `${value};`;
        }
        css += '}';
      }
    }
    const div = document.createElement('div');
    div.innerHTML = `&shy;<style>${css}</style>`;
    if (document.body) {
      document.body.appendChild(div);
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        document.body.appendChild(div);
      });
    }
  },
  modifyTemplate (name, from, to) {
    window.TD_mustaches[name] = window.TD_mustaches[name].replace(from, to);
  },
  changeFont (fonts_) {
    let fonts = '';
    if (typeof fonts_ === 'string') {
      fonts = fonts_;
    } else if (Array.isArray(fonts_)) {
      fonts = fonts_.map(f => `'${f}'`).join(',');
    } else {
      throw new TypeError('Unknown "fonts" type in API.changeFont function');
    }
    const selector = `
      html,
      body`;
    const selector2 = `
      .os-windows,
      .is-inverted-dark,
      .tweet-detail
      .tweet-translation-text`;
    API.injectStyle({
      [selector]: {
        fontFamily: fonts,
      },
      [selector2]: {
        fontFamily: 'inherit',
      },
    });
  },
  getAllAccounts () {
    return TD.storage.accountController.getAccountsForService('twitter');
  },
  toastMessage (template, params = null, messageID = null) {
    const message = TD.i(template, params);
    const indicator = TD.controller.progressIndicator;
    if (messageID) {
      return indicator.changeMessage(messageID, message);
    } else {
      return indicator.addMessage(message);
    }
  },
};

module.exports = API;
