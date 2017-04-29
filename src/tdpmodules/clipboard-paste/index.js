// TweetDeck Clipboard Paste script
// https://gist.github.com/zn/4f622ba80513e0f4d0dd3f13dcd085db

module.exports = {
  onDOMReady () {
    const $ = window.$;
    document.body.addEventListener('paste', event => {
      if ($('.js-add-image-button').hasClass('is-disabled')) return;
      const items = event.clipboardData.items;
      const images = [...items].filter(item => item.type.search('image/') === 0);
      if (images.length > 0) {
        event.preventDefault();
        if (!$('.app-content').hasClass('is-open')) {
          $(document).trigger('uiComposeTweet', { type: 'tweet' });
        }
        for (const image of images) {
          const files = [ image.getAsFile() ];
          $(document).trigger('uiFilesAdded', { files });
        }
      }
    });
  },
};
