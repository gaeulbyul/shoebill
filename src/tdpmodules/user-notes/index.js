/* globals $, TD */
const electron = require('electron');
const path = require('path');
const fs = require('mz/fs');
const Vue = require('vue');
const Compiler = require('vue-template-compiler');

const ipcRenderer = electron.ipcRenderer;
const compile = Compiler.compileToFunctions;

const TEMPLATE_HACK_HTML = `
  {{#twitterProfile}}
    {{#profile}}
      <span hidden class="user-id" style="display:none">
        {{id}}
      </span>
    {{/profile}}
  {{/twitterProfile}}
`;

const USER_NOTE_HTML = `
  <div id="user-note-app">
    <div class="user-note-control">
      사용자 메모:
    </div>
    <textarea class="user-note-area" v-model.lazy="note" placeholder="여기에 사용자별 메모를 작성할 수 있습니다. 여기에 적은 내용은 다른 사용자가 볼 수 없습니다.">
    </textarea>
  </div>
`;

const IPCBus = new Vue();
ipcRenderer.on('ipc.renderer.shoebill.ui/onload-user-note', (event, args) => {
  const { id, note } = args;
  IPCBus.$emit('onload-user-note', args);
});


const App = Vue.extend({
  data () {
    return {
      id: '',
      note: '',
    };
  },
  watch: {
    note (newNote) {
      ipcRenderer.sendToHost('ipc.renderer.shoebill.ui/update-user-note', {
        id: this.id,
        note: newNote,
      });
    },
  },
  mounted () {
    IPCBus.$on('onload-user-note', args => {
      const { id, note } = args;
      this.$set(this, 'id', id);
      this.$set(this, 'note', note);
    });
  },
  methods: {
    loadNote (id) {
      ipcRenderer.sendToHost('ipc.renderer.shoebill.ui/load-user-note', {
        id,
      });
    },
  },
  render: compile(USER_NOTE_HTML).render,
});

module.exports = {
  onDOMReady () {
    TD.mustaches['twitter_profile.mustache'] += TEMPLATE_HACK_HTML;
  },
  onTDReady () {
    const observeMe = document.querySelector('.js-modals-container');
    new MutationObserver(mutations => {
      for (const mut of mutations) {
        for (const node of mut.addedNodes) {
          if (!node.className) continue;
          let userID;
          const userIDElement = node.querySelector('.user-id');
          if (node.matches('.user-id')) {
            userID = node.textContent.trim();
          } else if (userIDElement) {
            userID = userIDElement.textContent.trim();
          }
          if (!userID) {
            continue;
          }
          if (document.getElementById('user-note-app')) {
            continue;
          }
          const appContainer = document.createElement('div');
          $('.prf-header').after(appContainer);
          const app = new App({
            el: appContainer,
          });
          app.loadNote(userID);
        }
      }
    }).observe(observeMe, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });
  },
};
