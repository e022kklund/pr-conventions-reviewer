// @ts-check
import tseslint from 'typescript-eslint';

// Only github/ may talk to GitHub and only llm/ may talk to the model.
const githubSdk = {
  group: ['@actions/github', '@actions/github/*'],
  message: 'Only src/github/ may import @actions/github.',
};
const anthropicSdk = {
  group: ['@anthropic-ai/sdk', '@anthropic-ai/sdk/*'],
  message: 'Only src/llm/ may import @anthropic-ai/sdk.',
};

// review/ must stay pure: no SDKs, no network, no file system, no processes.
const impureInReview = {
  group: [
    '@actions/*',
    '@anthropic-ai/*',
    'fs',
    'fs/*',
    'node:fs',
    'node:fs/*',
    'http',
    'https',
    'node:http',
    'node:https',
    'child_process',
    'node:child_process',
  ],
  message: 'src/review/ must stay pure (no I/O, no SDK imports). See CLAUDE.md.',
};

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'eslint.config.mjs'] },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-restricted-imports': ['error', { patterns: [githubSdk, anthropicSdk] }],
    },
  },
  {
    files: ['src/github/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [anthropicSdk] }] },
  },
  {
    files: ['src/llm/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [githubSdk] }] },
  },
  {
    files: ['src/review/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [impureInReview] }],
      'no-restricted-globals': [
        'error',
        { name: 'process', message: 'src/review/ must not read process or process.env.' },
      ],
    },
  },
);
