/* globals TD */
const electron = require('electron');

const { ipcRenderer } = electron;

const config = {
  enableBadgeCountClear: false,
};

function clearNotificationBadgeCounter () {
  if (!config.enableBadgeCountClear) {
    return;
  }
  const NOTIFICATION_UNREAD_URL = 'https://api.twitter.com/1.1/activity/about_me/unread.json';
  const headers = new Headers();
  {
    const bearerToken = TD.util.getBearerTokenAuthHeader();
    const csrfToken = TD.util.getCsrfTokenHeader();
    headers.append('content-type', 'application/x-www-form-urlencoded; charset=UTF-8');
    headers.append('authorization', bearerToken);
    headers.append('x-csrf-token', csrfToken);
    headers.append('x-twitter-active-user', 'yes');
    headers.append('x-twitter-auth-type', 'OAuth2Session');
  }
  const request = new Request(`${NOTIFICATION_UNREAD_URL}?cursor=true`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: `cursor=${Date.now()}`,
  });
  fetch(request);
}

module.exports = {
  onTDReady () {
    const second = 1000;
    const minute = second * 60;
    const period = 3 * minute;
    window.setInterval(clearNotificationBadgeCounter, period);
    clearNotificationBadgeCounter();
    ipcRenderer.on('ipc.renderer.shoebill/clear-badge', (event, args) => {
      clearNotificationBadgeCounter();
    });
  },
  onConfigLoad (cfg) {
    Object.assign(config, cfg);
  },
};

