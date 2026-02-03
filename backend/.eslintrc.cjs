module.exports = {
  root: true,
  env: {
    es2022: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint'
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-non-null-assertion': 'warn',

    // General
    'no-console': 'off', // Console is allowed in backend
    'prefer-const': 'error',
    'no-var': 'error'
  },
  ignorePatterns: [
    'dist',
    '.wrangler',
    'node_modules',
    '*.config.js',
    '*.config.ts',
    'drizzle'
  ]
};
