# Changelog

## [unreleased]

### ⚙️ Miscellaneous Tasks

- _(ci)_ Simplify git-cliff config and upgrade GitHub Actions to v5

## [1.5.0] - 2026-03-23

### 🚀 Features

- Improve tests
- Remove memos
- _(tests)_ Github actions reporter
- Add agent skill and improve readonly type safety
- _(react)_ Use useEffectEvent for effect event handlers
- _(ci)_ Add automated releases with git-cliff and npm trusted publishing

### 🐛 Bug Fixes

- Remove unecesary dependency
- Upgrade node version
- _(tests)_ Revert to default reporter
- Disable no-shadow lint rule and remove dead code in query

### 📚 Documentation

- Add comprehensive JSDoc documentation to all exported APIs

### 🎨 Styling

- Format with oxfmt

### ⚙️ Miscellaneous Tasks

- Migrate from eslint+prettier to oxlint+oxfmt
- Bump version to 1.5.0
- Update all dev dependencies to latest versions
- _(release)_ V1.5.0

## [1.4.0] - 2025-10-26

### 🚀 Features

- Bump version to 1.3.0
- Upgrade deps + fix linting errors
- _(react)_ React compiler
- Bump version to 1.4.0
- Add .nvmrc file

### 🐛 Bug Fixes

- Ci node version
- Type imports
- Only build on ci
- Format check on ci
- Typo in ci
- Remove wildcard from ignore dist in eslint
- Query on provider
- _(react)_ Preserve hooks and component names and fixes to broadcast channel

### 💼 Other

- _(ci)_ Only build if pr to main

### ⚙️ Miscellaneous Tasks

- _(ci)_ Rename ci jobs
- Rename prettier config file

## [1.3.0] - 2025-09-09

### 🚀 Features

- Bump deps
- Added devEngines
- Upgrade deps, fixes to snapshop and more tests

### 🐛 Bug Fixes

- Wrong name on test file

## [1.2.0] - 2025-02-22

### 🚀 Features

- _(react)_ Prefetching + prefetch tags
- _(package)_ Update dependencies

### 🐛 Bug Fixes

- _(react)_ Fix useQueryBasic's initial render
- _(react)_ Export prefetch tags
- _(package)_ Update lock

## [1.1.1] - 2025-02-15

### 🚀 Features

- _(react)_ Add useQueryBasic hook + update dependencies
- _(package)_ Update package version

### 🐛 Bug Fixes

- _(react)_ Simplified initial state

## [1.1.0] - 2025-01-27

### 🚀 Features

- _(query)_ Separate types
- _(ci)_ Add ci for tests

### 🐛 Bug Fixes

- _(query,react)_ Fixes to implementation
- _(tests)_ Remove ts expect err
- _(tests)_ React global act

## [1.0.0] - 2025-01-04

### 🚀 Features

- Update bundling
- New release
- Snapshot
- Caches + events
- _(core)_ Refactor to lambda query
- _(core)_ Add keywords

### 🐛 Bug Fixes

- _(core)_ Types
- _(query)_ Default generic type

### ⚙️ Miscellaneous Tasks

- Update spelling and fix typos
