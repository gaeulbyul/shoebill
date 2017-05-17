/* globals $, TD */
const API = require('../../api');

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
    <div class="xrt-hate-quote-notice">
      <div class="notice">
        해당 사용자의 프로필에 다음과 같이 명기되어있습니다.
        (사용자에 따라 인용트윗을 싫어하거나 제한을 둘 수 있다는 점에 유의해주세요)
      </div>
      <hr>
      <div class="bio"></div>
    </div>
    <div class="xrt-bottom-buttons">
      <button class="xrt-button xrt-open-original-rt">기존 RT창 열기</button>
      <button class="xrt-button xrt-close">닫기</button>
    </div>
  </div>
`;

const config = {
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
    document.addEventListener('keydown', event => {
      if (!this.tweet) return; // probably rt-dialog is hidden
      const code = event.code;
      if (code === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.close();
      }
    });
    document.body.appendChild(wrapper);
  }
  update (tweet) {
    const dialog = this.dialog;
    this.tweet = tweet;
    const originalTweet = tweet.getMainTweet();
    const tweetUser = dialog.querySelector('.xrt-target-tweet .user');
    tweetUser.textContent = `${originalTweet.user.name} (@${originalTweet.user.screenName})`;
    const tweetText = dialog.querySelector('.xrt-target-tweet .text');
    tweetText.textContent = originalTweet.text;
    const accountSelect = dialog.querySelector('.xrt-account-select');
    accountSelect.innerHTML = '';
    const accounts = API.getAllAccounts();
    if (originalTweet.user.isProtected) {
      this.close();
      API.toastMessage('프로텍트 계정의 트윗은 리트윗할 수 없습니다.');
      return;
    }
    for (const account of accounts) {
      const accountItem = document.createElement('div');
      accountItem.classList.add('xrt-account');
      accountItem.innerHTML = `
        <img class="xrt-profile-image">
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
      const { name, username, profileImageURL } = account.state;
      accountItem.querySelector('.xrt-profile-image').src = profileImageURL;
      accountItem.querySelector('.xrt-username').textContent = `${name} (@${username})`;
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
    {
      // 사용자에 따라 인용RT를 싫어하는 경우가 있을 수 있다.
      // 그래서 프로필에  "인용"이란 단어가 있으면 경고문을 표시하도록 함.
      const warnPattern = /인용|quote/ig;
      const userBio = originalTweet.user.bio();
      const hateQuote = dialog.querySelector('.xrt-hate-quote-notice');
      const bioE = hateQuote.querySelector('.bio');
      if (warnPattern.test(userBio)) {
        hateQuote.style.display = 'block';
        bioE.innerHTML = tweet.user.bio(); // or .textContent = .user.description?
        // bioE.innerHTML = bioE.innerHTML.replace(warnPattern, q => `<strong>${q}</strong>`);
      } else {
        hateQuote.style.display = 'none';
        bioE.innerHTML = '';
      }
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
