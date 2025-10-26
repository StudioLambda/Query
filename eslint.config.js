import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import solid from 'eslint-plugin-solid'
import tseslint from 'typescript-eslint'

export default defineConfig(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{js,jsx,ts,tsx}'],
  },
  { extends: [...tseslint.configs.recommended], files: ['**/*.{ts,tsx}'] },
  {
    extends: [...tseslint.configs.strictTypeChecked],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      globals: globals.browser,
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
    },
  },
  {
    files: ['src/react/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['src/solid/**/*.{ts,tsx}'],
    plugins: {
      solid: solid,
    },
    rules: {
      ...solid.configs.recommended.rules,
    },
  }
)
