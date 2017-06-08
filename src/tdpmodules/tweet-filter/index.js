/* global $, TD */
const API = require('../../api');

const config = {
  filterWords: [],
  filterAsRegExp: false,
  filterApplyToUserName: false,
  filterApplyToUserBio: false,
  filterBlockedTweet: false,
  filterBlockedRT: false,
  filterUnavailableQuote: false,
  filterUnder5: false,
  filterOver10Line: false,
};

let MyIDs = [];

function getMyIDs () {
  if (!MyIDs.length) {
    MyIDs = TD.storage.accountController.getAccountsForService('twitter').map(n => n.state.userId);
  }
  return MyIDs;
}

function isBlocked (userID) {
  const accounts = API.getAllAccounts();
  for (const account of accounts) {
    const key = account.privateState.key;
    const client = TD.controller.clients.getClient(key);
    if (client.blocks[userID]) {
      return true;
    }
  }
  return false;
}

function filterCheck (config, text) {
  for (const word of config.filterWords) {
    if (word.trim() === '') {
      continue;
    }
    if (config.filterAsRegExp) {
      try {
        const pattern = new RegExp(word, 'i');
        if (pattern.test(text)) {
          return true;
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          console.error('RegExp SyntaxError! "%s"', word);
        }
        return false;
      }
    } else if (text.includes(word.toLowerCase())) {
      return true;
    }
  }
  return false;
}
// true -> 보인다. / false -> 거른다.
function filterTweet (originalTweet) {
  let tweet = originalTweet;
  if (tweet.targetTweet) {
    tweet = tweet.targetTweet;
  } else if (tweet.retweetedStatus) {
    tweet = tweet.retweetedStatus;
  }
  /* TODO
  const myIDs = getMyIDs();
  if (myIDs.includes(tweet.user.id)) {
    return true;
  }
  */
  if (config.filterBlockedTweet && isBlocked(tweet.user.id)) {
    return false;
  }
  if (config.filterBlockedRT && isBlocked(originalTweet.user.id)) {
    return false;
  }
  const text = tweet.text.toLowerCase();
  /* TODO
  if (config.stripWhitespace) {
    text = text.replace(/\s+/g, '');
  }
  */
  if (filterCheck(config, text)) {
    return false;
  }
  if (config.filterApplyToUserName) {
    const userName = tweet.user.name.toLowerCase();
    if (filterCheck(config, userName)) {
      return false;
    }
  }
  if (config.filterApplyToUserBio) {
    const bio = tweet.user.description.toLowerCase();
    if (filterCheck(config, bio)) {
      return false;
    }
  }
  if (config.filterUnavailableQuote && tweet.quotedTweetMissing) {
    return false;
  }
  if (config.filterUnder5 && tweet.text.length <= 5) {
    return false;
  }
  if (config.filterOver10Line) {
    const over10Line = (tweet.text.match(/\n/g) || []).length + 1 > 10;
    if (over10Line) {
      return false;
    }
  }
  return true;
}

module.exports = {
  onDOMReady () {
    TD.vo.Filter.prototype.pass$REAL = TD.vo.Filter.prototype.pass;
    TD.vo.Filter.prototype.pass = tweet => {
      const builtinFilterResult = TD.vo.Filter.prototype.pass$REAL(tweet);
      if (!(tweet instanceof TD.services.TwitterStatus)) {
        return builtinFilterResult;
      }
      if (!builtinFilterResult) {
        return false;
      }
      let extraFilterResult = true;
      try {
        extraFilterResult = filterTweet(tweet);
      } catch (e) {
        console.error(e);
        return true;
      }
      return extraFilterResult;
    };
  },
  onConfigLoad (cfg) {
    Object.assign(config, cfg);
  },
};
