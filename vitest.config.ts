import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

const isGithubActions = process.env.GITHUB_ACTIONS === 'true'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      reporters: isGithubActions ? 'github-actions' : 'tree',
      setupFiles: './setupTests.ts',
      environment: 'happy-dom',
    },
  })
)
