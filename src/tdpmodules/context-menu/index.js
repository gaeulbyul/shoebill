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
    // this.prepareElement();
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
        /*
        const hashtags = tweet.entities.hashtags;
        if (hashtags.length > 0) {
          context.hashtags = hashtags.map(o => o.text);
        }
        */
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
  /*
  prepareElement () {
    const document = this.window.document;
    const menu = document.createElement('div');
    const blocker = document.createElement('div');
    Object.assign(this, { menu, blocker });
    menu.id = 'context-menu';
    blocker.id = 'context-menu-blocker';
    menu.innerHTML = CONTEXT_MENU_HTML;
    blocker.addEventListener('click', event => {
      if (!(menu.contains(event.target))) {
        this.hide();
      }
    });
  }
  show (x, y) {
    const { menu, blocker } = this;
    menu.style.display = 'block';
    // 참고: https://www.sitepoint.com/building-custom-right-click-context-menu-javascript/#positioning-our-context-menu
    const { offsetWidth: menuWidth, offsetHeight: menuHeight } = menu;
    const { innerWidth: windowWidth, innerHeight: windowHeight } = window;
    if ((windowWidth - x) < menuWidth) {
      menu.style.left = `${windowWidth - menuWidth}px`;
    } else {
      menu.style.left = `${x}px`;
    }
    if ((windowHeight - y) < menuHeight) {
      menu.style.top = `${windowWidth - menuWidth}px`;
    } else {
      menu.style.left = `${y}px`;
    }
    blocker.style.display = 'block';
  }
  hide () {
    const { menu, blocker } = this;
    menu.style.display = 'none';
    blocker.style.display = 'none';
  }
  */
}

module.exports = {
  onDOMReady () {
  },
  onTDReady () {
    const contextMenu = new ContextMenu(window);
    // contextMenu.addListener
  },
};


/* contexts:
contexts.tweet
contexts.user
contexts.hashtag
contexts.selectedText
contexts.input
contexts.column
contexts.image
contexts.gif
contexts.video (vine?)
contexts.youtube
contexts.link
contexts.onimageviewer
contexts.rtdialog
contexts.[tweetdeck-native]userdialog?

c=new ContextMenu(element)
//c.addActionHandler('copy', (event, args) => {})
//c.attachTo(document.body)
*/

function findTweet (id) {
  for (const key of Object.keys(TD.controller.columnManager.getAll())) {
    const col = TD.controller.columnManager.getAll()[key];
    const t = col.findChirp(id);
    if (t) return t;
  }
}

/*
<article class="stream-item js-stream-item  is-draggable  is-actionable" data-key="861858064479133696" data-account-key="twitter:2594273106" data-drag-type="tweet" data-tweet-id="861858064479133696">
  <div class="js-stream-item-content item-box js-show-detail ">
    <div class="js-tweet tweet        ">
      <header class="tweet-header js-tweet-header flex flex-row flex-align--baseline">
        <a class="account-link link-complex block flex-auto" href="https://twitter.com/jhs_onliu" rel="user" target="_blank">
          <div class="obj-left item-img tweet-img position-rel">
            <img class="tweet-avatar avatar  pin-top" src="https://pbs.twimg.com/profile_images/3781086394/1aaea205ea7154e5fc8956405b811743_normal.jpeg" width="48" height="48" alt="jhs_onliu's avatar">
          </div>
          <div class="nbfc ">
            <span class="account-inline txt-ellipsis"> <b class="fullname link-complex-target">OnLiU☆P</b>   <span class="username txt-mute">@jhs_onliu</span> </span>
          </div>
        </a> <time class="tweet-timestamp js-timestamp txt-mute flex-shrink--0" datetime="2017-05-09T08:19:09.000Z" data-time="1494317949000">  <a class="txt-small no-wrap" href="https://twitter.com/jhs_onliu/status/861858064479133696" rel="url" target="_blank">1h</a>  </time> </header>
      <div class="tweet-body js-tweet-body">
        <div class="nbfc txt-small txt-ellipsis">
          <div class="other-replies txt-ellipsis"> Replying to <a href="#" class="js-other-replies-link other-replies-link" data-recipient-ids="2594273106">  @gaeulbyul   </a> </div>
        </div>
        <p class="js-tweet-text tweet-text with-linebreaks " lang="ko">에엣? 머, 머징...</p>
        <div class="js-card-container margin-tm is-hidden"></div>
      </div>
      <footer class="tweet-footer cf">
        <ul class="js-tweet-actions tweet-actions full-width ">
          <li class="tweet-action-item pull-left margin-r--13">
            <a class="js-reply-action tweet-action position-rel" href="#" rel="reply"> <i class="icon icon-reply txt-center"></i> <span class="is-vishidden">Reply</span> <span class="reply-triangle"></span> </a>
          </li>
          <li class="tweet-action-item pull-left margin-r--13">
            <a class="tweet-action" href="#" rel="retweet"> <i class="icon icon-retweet icon-retweet-toggle txt-center"></i> <span class="is-vishidden">Retweet</span> </a>
          </li>
          <li class="tweet-action-item pull-left margin-r--13 margin-l--1">
            <a class="js-show-tip tweet-action position-rel" href="#" rel="favorite" title="  Like from gaeulbyul   "> <i class="icon icon-favorite icon-favorite-toggle txt-center"></i> <span class="is-vishidden"> Like </span> </a>
          </li>
          <li class="tweet-action-item position-rel pull-left margin-r--13">
            <a class="tweet-action" href="#" rel="actionsMenu" data-user-id="347002223" data-chirp-id="861858064479133696" data-account-key="twitter:2594273106" data-actions-menu-position="" data-parent-chirp-id=""> <i class="icon icon-more txt-right"></i> <span class="is-vishidden">More options</span> </a>
          </li>
          <li class="feature-customtimelines tweet-drag-handle tweet-action-item pull-right margin-l--7"> <span class="tweet-action" href="https://twitter.com/jhs_onliu/status/861858064479133696"> <i class="icon icon-move txt-right txt-right"></i> <span class="is-vishidden">Drag to collection</span> </span>
          </li>
        </ul>
      </footer>
    </div>
  </div>
</article>
*/
