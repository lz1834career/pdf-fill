# Publishing pdffill

Monorepo with two publishable packages:

| Package | Path | Binary |
|---------|------|--------|
| `@pdffill/core` | `packages/core` | — |
| `pdffill` | `packages/cli` | `pdffill` |

## Before first publish

1. **Replace repository URLs** in `packages/core/package.json` and `packages/cli/package.json` (`repository`, `bugs`, `homepage`) and in package `README.md` links if your Git remote is not `github.com/pdffill/pdffill`.
2. Confirm npm package names are free: `pdffill`, `@pdffill/core` (and that your account can publish under scope `@pdffill`).
3. `npm login` (enable 2FA on npm if required).

Each publishable package includes:

- `"files": ["dist", "README.md"]` — only built output ships
- `"prepublishOnly": "npm run build"` — rebuild before tarball
- `"engines": { "node": ">=18" }`
- `@pdffill/core` has `"publishConfig": { "access": "public" }` for scoped publish

Root `LICENSE` (MIT) applies to the project; npm uses `"license": "MIT"` on each package.

## Pre-publish checklist

1. Bump versions in `packages/core/package.json` and `packages/cli/package.json` (CLI depends on matching `@pdffill/core` version).
2. Update root `CHANGELOG.md` and `README.md` version headings.
3. Run from repo root:

```bash
npm install
npm run build
npm test
npm run typecheck
```

4. Dry-run pack (lists tarball contents, no upload):

```bash
npm run pack:check
```

5. Smoke-test CLI:

```bash
npx pdffill doctor examples/complex/template-complex.pdf
npx pdffill diff examples/complex/template-complex.pdf examples/complex/data.json --config examples/complex/pdffill.json
```

## Build artifacts

- `@pdffill/core` ships `dist/` via `"files": ["dist"]` (ESM + `.d.ts`).
- `pdffill` ships `dist/index.js` and declares `"bin": { "pdffill": "./dist/index.js" }`.

## Publish to npm (maintainers)

Login once: `npm login`.

Publish **core first**, then CLI. From repo root (recommended):

```bash
npm run publish:core
# wait until @pdffill/core appears on registry, then:
npm run publish:cli
```

Or manually:

```bash
cd packages/core && npm publish --access public
cd ../cli && npm publish
```

`prepublishOnly` runs `build` in each package automatically. CLI `dependencies["@pdffill/core"]` must match the version you just published.

## Versioning

Follow [SemVer](https://semver.org/):

- **MAJOR**: breaking API or CLI contract
- **MINOR**: new commands, options, exports
- **PATCH**: fixes only

Report JSON includes `"version"` from `REPORT_VERSION` in core — bump with user-visible report changes.

## Scope / name

- npm package names: `@pdffill/core`, `pdffill`
- Ensure names are available on npm before first publish

## Not published

- Root `pdf-fill` is `"private": true`
- `examples/`, `docs/` are documentation only (included in git, not necessarily in npm tarballs unless added to `"files"`)

## Consumer install

```bash
# Library only
npm install @pdffill/core

# CLI
npm install -g pdffill
# or
npx pdffill fill template.pdf data.json -o out.pdf
```
