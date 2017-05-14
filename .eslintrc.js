module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true,
    commonjs: true,
  },
  // extends: 'eslint:recommended',
  extends: 'airbnb-base',
  parser: 'babel-eslint', // for better async-await parse
  rules: {
    'indent': [
      'error',
      2,
      {
        SwitchCase : 1,
      }
    ],
    'linebreak-style': [
      'error',
      'unix',
    ],
    quotes: [
      'error',
      'single',
    ],
    // object literal에서 따옴표 안 써도 됨.
    'quote-props': [
      'error',
      'as-needed',
    ],
    'semi': [
      'error',
      'always',
    ],
    'brace-style': [
      'error',
      '1tbs',
    ],
    'keyword-spacing': [
      'error',
      {
        before: true,
        after: true,
      }
    ],
    'space-unary-ops': [
      'error',
    ],
    'space-infix-ops': [
      'error',
    ],
    'space-in-parens': [
      'error',
    ],
    'space-before-function-paren': [
      'error',
      'always',
    ],
    'eqeqeq': [
      'error',
    ],
    'no-console': [
      'warn',
    ],
    'no-undef': [
      'error',
    ],
    'no-unused-vars': [
      'off',
    ],
    'comma-dangle': [
      'error',
      'always-multiline',
    ],
    'arrow-parens': [
      'error',
      'as-needed',
    ],
    'arrow-spacing': [
      'error',
      {
        before: true,
        after: true,
      }
    ],
    'curly': [
      'error',
      'multi-line',
      'consistent',
    ],
    // removed for-of restriction from airbnb-base
    'no-restricted-syntax': [
      'error',
      'ForInStatement',
      'WithStatement',
    ],
    'no-continue': [
      'off',
    ],
    'no-multi-assign': [
      'off',
    ],
    'no-else-return': [
      'warn',
    ],
    'no-param-reassign': [
      'off',
    ],
    'func-names': [
      'off',
    ],
  },
};
