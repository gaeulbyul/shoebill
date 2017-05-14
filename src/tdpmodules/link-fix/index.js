'use strict';

function checkHangulLink (link) {
  const fullurl = link.getAttribute('data-full-url');
  const namuwiki = /^https?:\/\/namu\.wiki\/w\/$/.test(fullurl);
  const rigvedawiki = /^https?:\/\/rigvedawiki\.net\/w\/$/.test(fullurl);
  const wikipedia = /^https?:\/\/\w+\.wikipedia\.org\/wiki\/$/.test(fullurl);
  return namuwiki || rigvedawiki || wikipedia;
}

function hangulLinkFix (link) {
  /*
  트위터에서 한글이 섞인 URL을 제대로 변환하지 못하는 문제를 수정한다.
  가령, 위키백과 페이지 링크 `https://ko.wikipedia.org/wiki/서벌`을 트윗했을 때
  `https://ko.wikipedia.org/wiki/` 부분만 링크가 걸리는 데, 이를 고쳐서
  올바르게 `https://ko.wikipedia.org/wiki/서벌`로 링크를 걸어준다.
  현재 위키백과, 나무위키 등 일부 사이트 링크에만 적용했다.
  1. link (HTMLElement)의 `data-full-url`을 가져오고,
  2. link 바로 다음에 오는 text node를 URL encode한 뒤에 1에서 가져온 URL 뒤에 붙인다.
  3. 1의 링크 주소(href)를 2에서 구한 URL로 교체한다.
  */
  const postfix = link.nextSibling;
  if (postfix) {
    const fullurl = link.getAttribute('data-full-url');
    let querystring = postfix.textContent;
    if (/^\s/.test(querystring)) return;
    querystring = querystring.split(' ')[0];
    postfix.textContent = postfix.textContent.replace(querystring, ' ');
    querystring = decodeURI(querystring);
    let fixedURL = `${fullurl}${encodeURI(querystring)}`;
    link.setAttribute('href', fixedURL);
    link.setAttribute('data-full-url', fixedURL);
    link.setAttribute('title', `${fixedURL}\n(fixed from "${querystring}")`);
    link.textContent = fixedURL;
  }
}

function linkFix (link) {
  /*
  t.co 링크를 원본 링크로 대체한다.
  원본 링크주소는 link의 `data-full-url` 속성에서 가져온다.
  */
  const fullurl = link.getAttribute('data-full-url');
  link.setAttribute('href', fullurl);
}

module.exports = {
  onDOMReady () {
    const linkFixObserver = new MutationObserver(mutations => {
      for (const mut of mutations) {
        const added = mut.addedNodes;
        for (const node of added) {
          if (!node.querySelectorAll) continue;
          const links = node.querySelectorAll('a.url-ext');
          for (const link of links) {
            link.setAttribute('data-t-co-link', link.getAttribute('href'));
            if (link.hostname === 'pic.twitter.com') {
              link.remove();
              continue;
            }
            const isHangulLink = checkHangulLink(link);
            if (isHangulLink) {
              hangulLinkFix(link);
            }
            linkFix(link);
          }
        }
      }
    });
    linkFixObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
};
