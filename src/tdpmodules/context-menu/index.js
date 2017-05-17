/* globals TD, $ */

const _ = require('lodash');
const electron = require('electron');
const API = require('../../api');

const {
  remote,
  shell,
  ipcRenderer,
} = electron;
const { Menu, clipboard } = remote;

const SEPARATOR = { type: 'separator' };

function getTweetTextWithExpandedURL (tweet) {
  const urls = tweet.entities;
  let text = tweet.text;
  if (urls.length <= 0) {
    return text;
  }
  for (const urlEntity of urls) {
    const { url, display_url, expanded_url } = urlEntity;
    text = text.replace(url, display_url);
  }
  return text;
}

const contextExtractor = {
  column (columnE) {
    const columnID = columnE.getAttribute('data-column');
    const column = TD.controller.columnManager.get(columnID);
    return {
      id: columnID,
      element: columnE,
      column,
    };
  },
  tweet (tweetE, column) {
    // TODO: check normal status, or notify-status, dm, activity{like,follow,list+}
    const tweetID = tweetE.getAttribute('data-tweet-id') || tweetE.getAttribute('data-key');
    const tweet = column.findChirp(tweetID);
    const index = column.getChirpIndex(tweetID);
    return {
      id: tweetID,
      element: tweetE,
      tweet,
    };
  },
  link (linkE) {
    const url = linkE.href;
    const fullURL = linkE.getAttribute('data-full-url');
    return {
      element: linkE,
      url,
      fullURL,
    };
  },
  hashtag (hashtagE) {
    return {
      element: hashtagE,
      hashtag: hashtagE.textContent,
    };
  },
  user (userE) {
    return {
      //element
      id: 0,
      name: '',
      nickName: '',
    };
  },
};

const menuBuilder = {
  tweet (tweet) {
    return [
      {
        label: '복사하기',
        click () {
          const twt = tweet.tweet.getMainTweet();
          const text = getTweetTextWithExpandedURL(twt);
          clipboard.writeText(text);
        },
      },
      {
        label: '복사하기 (사용자아이디 포함)',
        click () {
          const twt = tweet.tweet.getMainTweet();
          let text = getTweetTextWithExpandedURL(twt);
          text += ` (by. @${twt.user.screenName})`;
          clipboard.writeText(text);
        },
      },
      {
        label: '트윗 URL 복사하기',
        click () {
          const permalink = tweet.element.querySelector('a[rel="url"]');
          clipboard.writeText(permalink.href);
        },
      },
      {
        label: '웹 페이지 첨부용 HTML 생성...',
        click () {
          const twt = tweet.tweet.getMainTweet();
          $(document).trigger('uiShowEmbedTweet', {
            tweet: twt,
          });
        },
      },
      SEPARATOR,
      {
        label: '리트윗/인용...',
        click () {
          tweet.tweet.retweet();
        },
      },
      {
        label: '마음에 들어요/취소...',
        click () {
          $(document).trigger('uiShowFavoriteFromOptions', {
            tweet: tweet.tweet,
          });
        },
      },
      SEPARATOR,
      {
        enabled: false,
        label: '이 트윗을 필터링하기',
      },
      SEPARATOR,
      {
        label: '이 트윗을 클립보드로 캡쳐',
        click () {
          const win = remote.getCurrentWindow();
          const con = win.webContents;
          const { left: x, top: y, width, height } = tweet.element.getBoundingClientRect();
          con.capturePage({ x, y, width, height }, img => {
            clipboard.writeImage(img);
            API.toastMessage('이미지를 복사했습니다!');
          });
        },
      },
      {
        label: '이 트윗을 클립보드로 캡쳐 (익명)',
        click () {
          const win = remote.getCurrentWindow();
          const con = win.webContents;
          const censorTargets = tweet.element.querySelectorAll('.nbfc, .tweet-avatar');
          for (const el of censorTargets) {
            el.style.filter = 'blur(10px)';
          }
          const { left: x, top: y, width, height } = tweet.element.getBoundingClientRect();
          window.setTimeout(() => {
            con.capturePage({ x, y, width, height }, img => {
              clipboard.writeImage(img);
              for (const el of censorTargets) {
                el.style.filter = '';
              }
              API.toastMessage('이미지를 복사했습니다!');
            });
          }, 1000);
        },
      },
      {
        enabled: false,
        label: '이 트윗을 파일로 캡쳐...',
      },
    ];
  },
  hashtag (hashtag) {
    return [
      {
        label: '복사하기',
        click () {
          clipboard.writeText(hashtag.hashtag);
        },
      },
      {
        label: '이 태그를 포함한 트윗 작성하기',
        click () {
          const tag = hashtag.hashtag;
          $(document).trigger('uiComposeTweet', {
            type: 'tweet',
            // 'from' should be array / [tweet.account.getKey()]
            from: TD.storage.accountController.getDefaults(),
            text: `${tag} `,
          });
        },
      },
      {
        enabled: false,
        label: '필터링하기',
      },
    ];
  },
  user (user) {
    return [
      {
        label: 'ID 복사하기',
        click () {
          clipboard.writeText(`@${user.name}`);
        },
      },
      {
        label: 'ID 검색하기',
        click () {
          $(document).trigger('uiPerformSearch', {
            query: `@${user.name}`,
            columnKey: user.element.closest('.js-column').data('column'),
          });
        },
      },
      {
        label: '상세정보 보기',
        click () {
          //
        },
      },
      {
        label: '이 사용자의 whotwi.com 페이지 열기...',
        click () {
          shell.openExternal(`http://ko.whotwi.com/${user.name}`);
          //
        },
      },
    ];
  },
  image () {
    return [
      {
        label: '복사하기 (저해상도)',
      },
      {
        label: '저장하기 (저해상도)',
      },
      {
        label: '다른 이름으로 저장하기... (저해상도)',
      },
      SEPARATOR,
      {
        label: '복사하기 (원본 해상도)',
      },
      {
        label: '저장하기 (원본 해상도)',
      },
      {
        label: '다른 이름으로 저장하기... (원본 해상도)',
      },
    ];
  }
};
class ContextMenu {
  constructor (window) {
    this.window = window;
    this.attach();
  }
  attach () {
    const columnsContainer = document.querySelector('.app-columns-container');
    this.window.addEventListener('contextmenu', event => {
      const target = event.target;
      if (!columnsContainer.contains(target)) {
        return;
      }
      const context = this.getContext(event);
      const menuTemplate = this.buildMenuTemplate(context);
      const menu = Menu.buildFromTemplate(menuTemplate);
      const currentWindow = remote.getCurrentWindow();
      menu.popup(currentWindow);
    });
  }
  buildMenuTemplate (context) {
    let menu = [
      {
        label: '편집',
        role: 'editMenu',
      },
    ];
    // TODO: for-of keys?
    if (context.tweet) {
      menu = menu.concat({
        label: '트윗',
        submenu: menuBuilder.tweet(context.tweet),
      });
    }
    if (context.hashtag) {
      menu = menu.concat({
        label: `해시태그 ${context.hashtag.hashtag}`,
        submenu: menuBuilder.hashtag(context.hashtag),
      });
    }
    if (context.user) {
      menu = menu.concat({
        label: `사용자 ${context.user.name}`,
        submenu: menuBuilder.user(context.user),
      });
    }
    menu.push(SEPARATOR);
    menu.push({
      label: '새로 고침',
      role: 'reload',
    });
    return menu;
  }
  getContext (event) {
    const { target } = event;
    const context = {};
    const selection = document.getSelection();
    if (selection && selection.type === 'range') {
      context.selectedText = {
        text: selection,
      };
    }
    const columnE = target.closest('section.column');
    if (columnE) {
      context.column = contextExtractor.column(columnE);
      const column = context.column.column;
      const tweetE = target.closest('article.js-stream-item');
      if (tweetE) {
        context.tweet = contextExtractor.tweet(tweetE, column);
        const tweet = context.tweet.tweet;
      }
    }
    const hashtagE = target.closest('a[rel="hashtag"]');
    if (hashtagE) {
      context.hashtag = contextExtractor.hashtag(hashtagE);
    }
    const linkE = target.closest('a.url-ext');
    if (linkE) {
      context.link = contextExtractor.link(linkE);
    }
    return context;
  }
}

module.exports = {
  onTDReady () {
    const contextMenu = new ContextMenu(window);
  },
};
