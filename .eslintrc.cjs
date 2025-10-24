module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true
  },
  extends: ['eslint:recommended'],
  ignorePatterns: ['assets/scripts/event-config.js'],
  overrides: [
    {
      files: ['scripts/**/*.js'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off'
      }
    }
  ],
  rules: {
    'no-console': 'off'
  }
};
