import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  // @ts-expect-error until types are fixed
  defineConfig({
    // @ts-expect-error until types are fixed
    test: {
      update: false,
      reporters: 'verbose',
      environment: 'happy-dom',
    },
  })
)
