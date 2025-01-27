import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      update: false,
      reporters: 'verbose',
      environment: 'happy-dom',
    },
  })
)
