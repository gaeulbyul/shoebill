/* globals $, TD */
const API = require('../../api');

module.exports = {
  onDOMReady () {
    document.addEventListener('keydown', event => {
      if (!event.ctrlKey) return;
      if (!/Digit\d/.test(event.code)) return;
      let key = parseInt(event.keyCode, 10) - 48;
      if (Number.isNaN(key)) return;
      key = (key === 0 ? 10 : (key - 1));
      const accounts = TD.storage.accountController.getAccountsForService('twitter');
      const defaultAccount = accounts[key];
      if (!defaultAccount) return;
      const accountKey = `twitter:${defaultAccount.state.userId}`;
      // let msgTemplate = 'Switching Account to {{name}} (@{{username}})...';
      // const mID = API.toastMessage(msgTemplate, { name, username });
      TD.storage.accountController.setDefault(accountKey);
      $('.js-drawer[data-drawer=compose]').trigger('uiAccountsSelected', {
        accountKeys: [ accountKey ],
      });
      const msgTemplate = '기본 계정을 {{name}}(@{{username}})(으)로 전환했습니다.';
      API.toastMessage(msgTemplate, defaultAccount.state);
    });
  },
};
