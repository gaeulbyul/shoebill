const Promise = require('bluebird');
const fs = require('mz/fs');
const path = require('path');
const twemoji = require('twemoji');
const API = require('../../api');

const EmojiPadHTML = `
  <header class="emoji-category"></header>
  <div class="emoji-container"></div>
  <div class="emoji-tabs"></div>
`;

const EmojiPadButtonHTML = `
  <div class="btn btn-on-blue padding-v--9 emojipad--entry-point">
    <img class="emoji" src="https://twemoji.maxcdn.com/2/72x72/1f600.png" style="pointer-events:none;">
  </div>
`;

const rootElement = document.createElement('div');

module.exports = {
  onDOMReady () {
    const $ = window.$;
    const loadCSS = async () => {
      const filepath = path.join(__dirname, 'emojipad.css');
      const css = await fs.readFile(filepath, 'utf8');
      API.injectStyle(css);
    };
    loadCSS();
    const init = async () => {
      API.modifyTemplate(
        'compose/docked_compose.mustache',
        '<div class="js-send-button-container',
        `${EmojiPadButtonHTML} <div class="js-send-button-container`);
      rootElement.className = 'emojipad';
      rootElement.innerHTML = EmojiPadHTML;
      rootElement.addEventListener('click', e => e.stopPropagation());
      const filepath = path.join(__dirname, 'emoji.json');
      const emojiDataFile = await fs.readFile(filepath, 'utf8');
      const emojiData = JSON.parse(emojiDataFile);
      // TODO: better var name...
      for (const data of emojiData) {
        data.data = data.data.map(x => {
          const chr = x.map(y => twemoji.convert.fromCodePoint(y)).join('');
          return twemoji.parse(chr);
        });
      }
      const container = rootElement.querySelector('.emoji-container');
      const tabContainer = rootElement.querySelector('.emoji-tabs');
      for (const [i, emojiGroup] of emojiData.entries()) {
        const page = document.createElement('div');
        const inner = document.createElement('div');
        page.className = 'emoji-page';
        page.setAttribute('data-page-index', i);
        page.appendChild(inner);
        container.appendChild(page);
        for (const emoji of emojiGroup.data) {
          const cell = document.createElement('div');
          cell.className = 'emoji-item';
          cell.innerHTML = emoji;
          inner.appendChild(cell);
          const img = cell.querySelector('img');
          if (!img) {
            continue;
          }
          img.addEventListener('click', event => {
            event.preventDefault();
            const char = event.currentTarget.alt;
            const tweetComposeTextArea = document.querySelector('.js-compose-text');
            tweetComposeTextArea.value += char;
            $(tweetComposeTextArea).trigger('change');
            /*
            const changeEvent = document.createEvent('HTMLEvents');
            changeEvent.initEvent('change', false, true);
            tweetComposeTextArea.dispatchEvent(event);
            */
          });
        }
        const btn = document.createElement('button');
        btn.className = 'emoji-tab';
        btn.innerHTML = twemoji.parse(emojiGroup.icon);
        btn.addEventListener('click', event => {
          const ev = new CustomEvent('emojipad-switch-tab', {
            detail: {
              index: i,
            },
          });
          rootElement.dispatchEvent(ev);
        });
        tabContainer.appendChild(btn);
      }
      rootElement.addEventListener('emojipad-show', event => {
        const {x, y} = event.detail;
        const {style} = event.currentTarget;
        style.display = 'inline-block';
        style.left = `${x}px`;
        style.top = `${y}px`;
      });
      rootElement.addEventListener('emojipad-hide', event => {
        event.currentTarget.style.display = 'none';
      });
      rootElement.addEventListener('emojipad-switch-tab', event => {
        const index = event.detail.index;
        const rootE = event.currentTarget;
        const header = rootE.querySelector('.emoji-category');
        const pages = rootE.querySelectorAll('.emoji-page');
        const tabs = rootE.querySelectorAll('.emoji-tab');
        header.textContent = emojiData[index].name;
        [...pages, ...tabs].forEach(el => el.classList.remove('active'));
        [pages[index], tabs[index]].forEach(el => el.classList.add('active'));
        const container = rootE.querySelector('.emoji-container');
        if (index === 0) {
          container.classList.add('first-tab');
        }
        if (index === (emojiData.length - 1)) {
          container.classList.add('last-tab');
        }
      });
      document.body.appendChild(rootElement);
      rootElement.dispatchEvent(new CustomEvent('emojipad-switch-tab', {
        detail: {
          index: 0,
        },
      }));
    };
    init();
  },
  onTDReady () {
    const emojiButton = document.querySelector('.emojipad--entry-point');
    emojiButton.addEventListener('click', event => {
      event.preventDefault();
      const ev = new CustomEvent('emojipad-show', {
        detail: {
          x: event.clientX,
          y: event.clientY,
        },
      });
      rootElement.dispatchEvent(ev);
    });
    document.body.addEventListener('click', event => {
      if (!(event.target.isSameNode(emojiButton)) && (rootElement.style.display !== 'none')) {
        const ev = new CustomEvent('emojipad-hide');
        rootElement.dispatchEvent(ev);
      }
    });
  },
};

