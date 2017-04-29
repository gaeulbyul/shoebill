/* globals $, TD */
const API = require('../../API');

// consider customElements API?
// or Framework?

const DIALOG_HTML = `
  <div class="xrt-dialog">
    <div class="xrt-target-tweet">
      <div class="user"></div>
      <div class="text"></div>
    </div>
    <div class="xrt-account-select">
    </div>
    <div class="xrt-bottom-buttons">
      <button class="xrt-button xrt-open-original-rt">기존 RT창 열기</button>
      <button class="xrt-button xrt-close">닫기</button>
    </div>
  </div>
`;

let config = {
  useAltRT: false,
};

class RTDialog {
  constructor () {
    this.tweet = null;
    const wrapper = this.wrapper = document.createElement('div');
    wrapper.classList.add('xrt-dialog-wrapper');
    wrapper.innerHTML = DIALOG_HTML;
    const dialog = this.dialog = wrapper.querySelector('.xrt-dialog');
    wrapper.addEventListener('click', event => {
      event.stopPropagation();
      if (wrapper.isSameNode(event.target)) {
        this.close();
      }
    });
    wrapper.querySelector('.xrt-close').addEventListener('click', event => {
      this.close();
    });
    wrapper.querySelector('.xrt-open-original-rt').addEventListener('click', event => {
      if (this.tweet && this.tweet instanceof TD.services.TwitterStatus && 'retweet$REAL' in this.tweet) {
        this.tweet.retweet$REAL();
        this.close();
      }
    });
    document.body.appendChild(wrapper);
  }
  update (tweet) {
    const dialog = this.dialog;
    this.tweet = tweet;
    const originalTweet = tweet.retweetedStatus || tweet;
    const tweetUser = dialog.querySelector('.xrt-target-tweet .user');
    tweetUser.textContent = `${originalTweet.user.name} (@${originalTweet.user.screenName})`;
    const tweetText = dialog.querySelector('.xrt-target-tweet .text');
    tweetText.textContent = originalTweet.text;
    const accountSelect = dialog.querySelector('.xrt-account-select');
    accountSelect.innerHTML = '';
    const accounts = API.getAllAccounts();
    for (const account of accounts) {
      const accountItem = document.createElement('div');
      accountItem.classList.add('xrt-account');
      accountItem.innerHTML = `
        <div class="xrt-username"></div>
        <div class="xrt-buttons">
          <button class="xrt-button xrt-button-rt" data-action="Retweet">
            리트윗
          </button>
          <button class="xrt-button xrt-button-cancelrt" data-action="CancelRetweet">
            리트윗 취소
          </button>
          <button class="xrt-button xrt-button-quote">
            인용
          </button>
        </div>
      `;
      const { name, username } = account.state;
      accountItem.querySelector('.xrt-username').textContent  = `${name} (@${username})`;
      const rtButton = accountItem.querySelector('.xrt-button-rt');
      rtButton.addEventListener('click', event => {
        $(document).trigger('uiRetweet', {
          id: tweet.id,
          from: [ account.privateState.key ],
        });
      });
      const cancelButton = accountItem.querySelector('.xrt-button-cancelrt');
      cancelButton.addEventListener('click', event => {
        $(document).trigger('uiUndoRetweet', {
          tweetId: tweet.id,
          from: account.privateState.key,
        });
      });
      const quoteButton = accountItem.querySelector('.xrt-button-quote');
      quoteButton.addEventListener('click', event => {
        tweet.quoteTo([ account.privateState.key ]);
        this.close();
      });
      accountSelect.appendChild(accountItem);
    }
    this.onRTSuccess = (event, t) => {
      tweet.setRetweeted(true);
      API.toastMessage('리트윗 성공!');
    };
    this.onRTError = (event, t) => {
      let message = TD.i('리트윗 실패!');
      if (t.response.errors) {
        t.response.errors.forEach(e => {
          message += ` (${e.message})`;
        });
      }
      API.toastMessage(message);
    };
    this.onRTCancelSuccess = (event, t) => {
      API.toastMessage('리트윗 취소 성공!');
    };
    this.onRTCancelError = (event, t) => {
      API.toastMessage('리트윗 취소 오류!');
    };
  }
  show () {
    if (!this.tweet) {
      console.error('.tweet is null');
      return;
    }
    $(document).on('dataRetweetSuccess', this.onRTSuccess);
    $(document).on('dataRetweetError', this.onRTError);
    $(document).on('dataUndoRetweetSuccess', this.onRTCancelSuccess);
    $(document).on('dataUndoRetweetError', this.onRTCancelError);
    $(document).on('dataUndoRetweetSuccess', TD.controller.feedManager.handleUndoRetweetSuccess);
    $(document).on('dataUndoRetweetError', TD.controller.feedManager.handleUndoRetweetError);
    this.wrapper.style.display = 'flex';
    this.dialog.classList.add('visible');
  }
  close () {
    $(document).off('dataRetweetSuccess', this.onRTSuccess);
    $(document).off('dataRetweetError', this.onRTError);
    $(document).off('dataUndoRetweetSuccess', this.onRTCancelSuccess);
    $(document).off('dataUndoRetweetError', this.onRTCancelError);
    $(document).off('dataUndoRetweetSuccess', TD.controller.feedManager.handleUndoRetweetSuccess);
    $(document).off('dataUndoRetweetError', TD.controller.feedManager.handleUndoRetweetError);
    this.wrapper.style.display = 'none';
    this.dialog.classList.remove('visible');
    this.tweet = null;

  }
}

const RTDialogPlugin = {
  onDOMReady () {
    const dialog = new RTDialog;
    // dialog.show();
    TD.services.TwitterStatus.prototype.retweet$REAL = TD.services.TwitterStatus.prototype.retweet;
    TD.services.TwitterStatus.prototype.retweet = function () {
      if (!config.useAltRT) {
        return TD.services.TwitterStatus.prototype.retweet$REAL.call(this);
      }
      dialog.update(this);
      dialog.show();
    };
  },
  onTDReady () {},
  onConfigLoad (cfg) {
    Object.assign(config, cfg);
  },
};

module.exports = RTDialogPlugin;

/**************

*open dialog
 TD.services.TwitterStatus.prototype.retweet = function() {
        var e = 1 === TD.storage.accountController.getAccountsForService("twitter").length;
        this.isRetweeted && e ? (this.setRetweeted(!1),
        $(document).trigger("uiUndoRetweet", {
            tweetId: this.getMainTweet().id,
            from: this.account.getKey()
        })) : new TD.components.ActionDialog(this)
    }
//this = tweet





*/
