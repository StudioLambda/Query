import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
// import solid from 'vite-plugin-solid'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /query:(.*)/,
        replacement: fileURLToPath(new URL('./src/query/$1', import.meta.url)),
      },
      {
        find: /query\/react:(.*)/,
        replacement: fileURLToPath(new URL('./src/react/$1', import.meta.url)),
      },
      // {
      //   find: /query\/solid:(.*)/,
      //   replacement: fileURLToPath(new URL('./src/solid/$1', import.meta.url)),
      // },
    ],
  },
  build: {
    sourcemap: true,
    lib: {
      entry: {
        query: 'src/query/index.ts',
        query_react: 'src/react/index.ts',
        // 'query-solid': 'src/solid/index.ts',
      },
      formats: ['es', 'cjs'],
    },
    rolldownOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'solid-js'],
      output: {
        keepNames: true,
      },
    },
  },
  plugins: [
    react({
      include: ['src/react/**/*.tsx'],
    }),
    babel({
      include: ['src/react/**/*.tsx'],
      presets: [reactCompilerPreset()],
    }),
    // solid({
    //   include: ['src/solid/**/*.tsx'],
    // }),
    dts({
      include: ['**/*.ts*'],
      exclude: ['**/*.test.ts*'],
      outDir: '../../dist',
      root: './src/query',
    }),
    dts({
      include: ['**/*.ts*'],
      exclude: ['**/*.test.ts*'],
      outDir: '../../dist',
      root: './src/react',
    }),
    // dts({
    //   include: ['**/*.ts*'],
    //   exclude: ['**/*.test.ts*'],
    //   outDir: '../../dist',
    //   root: './src/solid',
    // }),
  ],
})
