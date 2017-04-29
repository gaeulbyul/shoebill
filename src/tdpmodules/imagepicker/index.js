/* globals $, TD */
const API = require('../../API');

// consider customElements API?
// or Framework?

const PICKER_HTML = `
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
    const dialog = this.dialog = document.createElement('div');
    dialog.classList.add('xrt-dialog-wrapper');
    dialog.innerHTML = DIALOG_HTML;
    dialog.addEventListener('click', event => {
      event.stopPropagation();
      if (dialog.isSameNode(event.target)) {
        this.close();
      }
    });
    dialog.querySelector('.xrt-close').addEventListener('click', event => {
      this.close();
    });
    dialog.querySelector('.xrt-open-original-rt').addEventListener('click', event => {
      if (this.tweet && this.tweet instanceof TD.services.TwitterStatus && 'retweet$REAL' in this.tweet) {
        this.tweet.retweet$REAL();
        this.close();
      }
    });
    document.body.appendChild(dialog);
  }
  update (tweet) {
  }
  show () {
    if (!this.tweet) {
      console.error('.tweet is null');
      return;
    }
    this.dialog.style.display = 'flex';
  }
  close () {
    this.dialog.style.display = 'none';
    this.tweet = null;
  }
}

const ImagePickerPlugin = {
  onDOMReady () {
    const dialog = new ImagePicker;
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

module.exports = ImagePickerPlugin;
