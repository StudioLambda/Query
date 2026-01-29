# AGENTS.md

Guidelines for AI coding agents working in this repository.

## Project Overview

`@studiolambda/query` is a lightweight, isomorphic, framework-agnostic async data management library (SWR-style). It has bindings for React 19+ and Solid.js.

## Build/Lint/Test Commands

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run dev

# Run a single test file
npx vitest run src/query/query.test.ts

# Run tests matching a pattern
npx vitest run -t "can query resources"

# Run with coverage
npm run test:cover

# Lint
npm run lint

# Format code
npm run format

# Check formatting
npm run format:check

# Build (runs format:check and lint first)
npm run build

# Build without checks
npm run build:only
```

## Directory Structure

```
src/
  query/       # Core library (framework-agnostic)
  react/       # React bindings
    hooks/     # useQuery, useQueryBasic, etc.
    components/# QueryProvider, QueryPrefetch, etc.
  solid/       # Solid.js bindings (partial)
```

## Code Style

### Formatting (Oxfmt)

- Single quotes, no semicolons
- 2-space indentation (no tabs)
- 100 character line width
- Trailing commas: `es5`
- Always use parentheses in arrow functions: `(x) => x`
- Configuration: `.oxfmtrc.json`

### Imports

1. External/framework imports first, then internal imports
2. Use path aliases: `query:index`, `query/react:context`, `query/react:hooks/useQuery`
3. Use inline `type` keyword for type imports:
   ```typescript
   import { type Options } from 'query:index'
   ```
4. Multi-line imports with trailing comma:
   ```typescript
   import { type Caches, type CacheType, type ItemsCacheItem } from 'query:cache'
   ```

### TypeScript

- Strict mode enabled with `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`
- Use `interface` for object shapes, `type` for unions and function signatures
- Use `readonly` on interface properties
- Generic type parameters with defaults: `<T = unknown>`
- Explicit type assertions when needed: `as T`

### Naming Conventions

| Element            | Convention                    | Example                               |
| ------------------ | ----------------------------- | ------------------------------------- |
| Files (modules)    | camelCase                     | `useQuery.ts`, `cache.ts`             |
| Files (components) | PascalCase                    | `QueryProvider.tsx`                   |
| Test files         | `.test.ts`/`.test.tsx` suffix | `query.test.ts`                       |
| Functions          | camelCase                     | `createQuery`, `defaultFetcher`       |
| React hooks        | `use` prefix                  | `useQuery`, `useQueryActions`         |
| Types/Interfaces   | PascalCase                    | `Cache`, `Configuration`              |
| Function types     | `*Function` suffix            | `FetcherFunction`, `MutationFunction` |
| Props interfaces   | `*Props` suffix               | `QueryProviderProps`                  |

### Functions

- Use `function` declarations for named/exported functions (not arrow functions)
- Use arrow functions only for callbacks and inline functions
- Use `async/await` for async code

```typescript
// Correct - regular function for exports
export function createQuery(options?: Configuration): Query {
  // ...
}

// Correct - arrow for callbacks
events.addEventListener(`${event}:${key}`, listener)
```

### Exports

- **Named exports only** - never use default exports
- Use barrel files (`index.ts`) for re-exports
- Factory pattern for main API: `createQuery()` returns object with methods

### Error Handling

- Simple `throw new Error('message')` for errors
- Try-catch with event emission pattern for async operations
- Explicit empty catch `catch(() => {})` when intentionally silencing errors

### Comments

- JSDoc-style block comments for function documentation
- Inline comments for explaining specific logic
- Document interface properties with JSDoc

```typescript
/**
 * Subscribes to a given keyed event.
 */
function subscribe<T = unknown>(...) {
  // For the refetching event, we want to immediately return...
}
```

## Testing

- Test framework: Vitest with happy-dom environment
- Use `describe.concurrent()` for parallel test execution
- Destructure `expect` from test context: `it('...', async ({ expect }) => { ... })`
- React tests use `act()` and `createRoot`

```typescript
import { describe, it, vi } from 'vitest'

describe.concurrent('feature', function () {
  it('does something', async ({ expect }) => {
    // test code
    expect(result).toBe(expected)
  })
})
```

## OxLint

- Configuration: `.oxlintrc.json`
- React plugin enabled with hooks rules
- Vitest plugin enabled for test files
- TypeScript plugin enabled
- `react-in-jsx-scope` rule disabled (using new JSX transform)
- Use `// oxlint-disable-next-line` to disable rules inline

## Environment

- Node.js 25+ (see `.nvmrc`)
- npm 11+ (package manager)
- TypeScript ~5.9.3
- React 19.2+ (peer dependency)
