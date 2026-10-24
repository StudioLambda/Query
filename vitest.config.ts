import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      setupFiles: './setupTests.ts',
      environment: 'happy-dom',
      /** Concurrent tests own their mocks; clearing globally resets active siblings. */
      clearMocks: false,
    },
  })
)
