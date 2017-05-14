/* globals Vue, ELEMENT */

Vue.use(ELEMENT);

document.addEventListener('DOMContentLoaded', () => {
  const downloader = new Vue({
    el: '#downloader-ui',
    methods: {
      updateProgress (queue) {
        this.$set(this, 'downloads', queue);
      },
    },
    data () {
      return {
        downloads: [],
      };
    },
  });
  ipcRenderer.on('ipc.main.shoebill.downloader/report-progress', (event, args) => {
    const { queue } = args;
    downloader.updateProgress(queue);
    console.dir(queue);
  });
});
