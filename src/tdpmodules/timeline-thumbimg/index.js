/* globals $, TD */

const config = {
  useThumbOnTimeline: false,
};

module.exports = {
  onDOMReady () {
    TD.services.TwitterMedia.prototype.small = function () {
      const size = config.useThumbOnTimeline ? ':thumb' : ':small';
      switch (this.service) {
        case 'twitter':
          return this.getTwitterPreviewUrl(size);
        case 'twitpic':
        case 'yfrog':
        case 'lockerz':
        case 'vine':
          return this.large();
        case 'youtube':
          return 'https://img.youtube.com/vi/' + this.mediaId + '/mqdefault.jpg';
      }
    };
  },
  onConfigLoad (cfg) {
    Object.assign(config, cfg);
  },
};
