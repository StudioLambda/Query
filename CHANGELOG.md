# Changelog

## [1.5.8] - 2026-04-12

### 🐛 Bug Fixes

- Resolve high-severity audit issues in core query and React bindings
## [1.5.7] - 2026-03-23

### 📚 Documentation

- Document CI/CD workflow structure and rationale

### ⚙️ Miscellaneous Tasks

- *(release)* V1.5.7
## [1.5.6] - 2026-03-23

### ⚙️ Miscellaneous Tasks

- *(ci)* Skip prepack during npm publish to avoid double build
- *(release)* V1.5.6
## [1.5.5] - 2026-03-23

### ⚙️ Miscellaneous Tasks

- *(ci)* Merge CI and release into a single workflow
- *(release)* V1.5.5
## [1.5.4] - 2026-03-23

### ⚙️ Miscellaneous Tasks

- *(docs)* Fix changelog
- *(release)* V1.5.4
## [1.5.3] - 2026-03-23

### ⚙️ Miscellaneous Tasks

- *(ci)* Merge publish into release workflow
- *(release)* V1.5.3
## [1.5.2] - 2026-03-23

### 📚 Documentation

- Document commit type conventions for CI changes

### ⚙️ Miscellaneous Tasks

- *(release)* V1.5.2
## [1.5.1] - 2026-03-23

### 🐛 Bug Fixes

- *(ci)* Use annotated tags so --follow-tags pushes them

### ⚙️ Miscellaneous Tasks

- *(ci)* Simplify git-cliff config and upgrade GitHub Actions to v5
- *(release)* V1.5.1
## [1.5.0] - 2026-03-23

### 🚀 Features

- Improve tests
- Remove memos
- *(tests)* Github actions reporter
- Add agent skill and improve readonly type safety
- *(react)* Use useEffectEvent for effect event handlers
- *(ci)* Add automated releases with git-cliff and npm trusted publishing

### 🐛 Bug Fixes

- Remove unecesary dependency
- Upgrade node version
- *(tests)* Revert to default reporter
- Disable no-shadow lint rule and remove dead code in query

### 📚 Documentation

- Add comprehensive JSDoc documentation to all exported APIs

### 🎨 Styling

- Format with oxfmt

### ⚙️ Miscellaneous Tasks

- Migrate from eslint+prettier to oxlint+oxfmt
- Bump version to 1.5.0
- Update all dev dependencies to latest versions
- *(release)* V1.5.0
## [1.4.0] - 2025-10-26

### 🚀 Features

- Bump version to 1.3.0
- Upgrade deps + fix linting errors
- *(react)* React compiler
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
- *(react)* Preserve hooks and component names and fixes to broadcast channel

### 💼 Other

- *(ci)* Only build if pr to main

### ⚙️ Miscellaneous Tasks

- *(ci)* Rename ci jobs
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

- *(react)* Prefetching + prefetch tags
- *(package)* Update dependencies

### 🐛 Bug Fixes

- *(react)* Fix useQueryBasic's initial render
- *(react)* Export prefetch tags
- *(package)* Update lock
## [1.1.1] - 2025-02-15

### 🚀 Features

- *(react)* Add useQueryBasic hook + update dependencies
- *(package)* Update package version

### 🐛 Bug Fixes

- *(react)* Simplified initial state
## [1.1.0] - 2025-01-27

### 🚀 Features

- *(query)* Separate types
- *(ci)* Add ci for tests

### 🐛 Bug Fixes

- *(query,react)* Fixes to implementation
- *(tests)* Remove ts expect err
- *(tests)* React global act
## [1.0.0] - 2025-01-04

### 🚀 Features

- Update bundling
- New release
- Snapshot
- Caches + events
- *(core)* Refactor to lambda query
- *(core)* Add keywords

### 🐛 Bug Fixes

- *(core)* Types
- *(query)* Default generic type

### ⚙️ Miscellaneous Tasks

- Update spelling and fix typos
