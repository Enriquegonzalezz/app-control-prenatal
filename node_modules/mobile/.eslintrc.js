module.exports = {
  root: true,
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-native/all',
    'prettier',
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2021,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'react', 'react-native'],
  rules: {
    'react/react-in-jsx-scope': 'off', // React 17+ no requiere import React
    'react/prop-types': 'off', // TypeScript maneja esto
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    'react-native/no-inline-styles': 'warn',
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  env: {
    'react-native/react-native': true,
  },
};
