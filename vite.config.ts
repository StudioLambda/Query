import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import react from '@vitejs/plugin-react'
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
  esbuild: {
    keepNames: true,
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
    rollupOptions: {
      external: ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client', 'solid-js'],
    },
  },
  plugins: [
    react({
      include: ['src/react/**/*.tsx'],
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
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
