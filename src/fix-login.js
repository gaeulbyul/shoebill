// PC version of twitter login page has problem.
// redirect to mobile version
module.exports = window => {
  const { document, location } = window;
  const isPCLoginPage = (location.hostname + location.pathname) === 'twitter.com/login';
  if (isPCLoginPage) {
    location.hostname = 'mobile.twitter.com';
  }

  document.addEventListener('DOMContentLoaded', () => {
  // Twitter login fix for electron
    const isMobileLoginPage = (location.hostname + location.pathname) === 'mobile.twitter.com/login';
    if (isMobileLoginPage) {
      document.addEventListener('submit', event => {
        const form = event.target;
        const redirectAfterLogin = form.elements.redirect_after_login;
        if (redirectAfterLogin && !(/tweetdeck/.test(redirectAfterLogin.value))) {
          event.preventDefault();
          console.log('fixing redirect url...');
          redirectAfterLogin.value = 'https://tweetdeck.twitter.com/';
          form.submit();
        }
      });
    }
  });
};
