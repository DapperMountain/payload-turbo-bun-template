# Commit messages

Use **[Devmoji](https://github.com/folke/devmoji)**-style messages: [Conventional Commits](https://www.conventionalcommits.org/) structure plus a **gitmoji-inspired emoji** after the colon (Unicode emoji, not `:shortcode:` in the final message).

## Format

```text
type(scope): <emoji> <subject>

[optional body]

[optional footer]
```

| Part | Rules |
|------|--------|
| **type** | `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore` |
| **scope** | Optional, lowercase; package or area (`deps`, `design-system`, `access`, `i18n`, `docker`, `agents`, `app`, …) |
| **emoji** | One Devmoji/gitmoji-style symbol (see table below) |
| **subject** | Imperative, concise; no trailing period |

### Examples (from this repo)

```text
chore(deps): ⬆️ bump Payload, Next, Bun, and lockfile
chore(agents): 🔧 centralize rules and vendored Payload skills
refactor(config): ♻️ extract Zod env config into config/app
test(app): ✅ add Bun preload, env fixtures, and test docs
feat(i18n): 🌐 wire Payload custom translations for runtime and config
docs(app): 📄 add conventions, testing guide, and agent overlay
chore(docker): 🐳 enable test database service and rename compose services
```

## Common type → emoji mapping

Inspired by [Devmoji](https://github.com/folke/devmoji#devmoji-codes) / [gitmoji](https://gitmoji.dev/). Pick the closest match; scope can refine meaning.

| Type | Emoji | When |
|------|-------|------|
| `feat` | ✨ | New user-facing or API behavior |
| `fix` | 🐛 | Bug fix |
| `docs` | 📄 | Documentation only |
| `refactor` | ♻️ | Restructure without behavior change |
| `test` | ✅ | Tests, fixtures, test docs |
| `chore` | 🔧 | Tooling, repo hygiene, misc maintenance |
| `chore(deps)` | ⬆️ | Dependency upgrades |
| `style` / UI | 💄 | Look-and-feel, Tamagui/CSS, design-system |
| `ci` / deploy | 👷 / 🚀 | CI, release, deploy pipelines |
| `docker` / infra | 🐳 | Compose, Dockerfiles |
| `i18n` / l10n | 🌐 | Translations, locales |
| `security` | 🔒 | Security fixes or hardening |
| `config` | ⚙️ | Env, Zod config, settings |

## Optional: Devmoji CLI

Not required for the repo. Helpful when writing messages locally:

```bash
bunx devmoji --commit <<< "feat(ui): add language switcher"
# → feat(ui): ✨ add language switcher
```

Install hooks that auto-emojify: `bunx devmoji git commit` (see Devmoji docs). This repo uses a **validate-only** hook instead (below).

## Enforcement (no Husky)

Local validation uses **[bun-git-hooks](https://www.npmjs.com/package/bun-git-hooks)** (not Husky). Hooks install automatically on **`bun install`** via the package `postinstall` and [`git-hooks.config.ts`](../git-hooks.config.ts). Re-run manually if needed:

```bash
bun run hooks:install
```

The `commit-msg` hook runs [`scripts/validate-commit-msg.ts`](../scripts/validate-commit-msg.ts).

**Verify:**

```bash
test -x .git/hooks/commit-msg && head -1 .git/hooks/commit-msg
```

**Skip hook install** (CI images, one-off clones):

```bash
SKIP_INSTALL_GIT_HOOKS=1 bun install
```

**Skip for one commit (emergency only):**

```bash
git commit --no-verify -m "..."
```

**CI:** Pull requests run [`.github/workflows/commit-messages.yml`](../.github/workflows/commit-messages.yml) (no local install required).

## Authors (humans only)

Do **not** add `Co-authored-by:` trailers (or similar) that credit AI agents, assistants, or automation tools (e.g. Cursor, Copilot, Claude). Commits in this repo should list **human git authors only**, unless a maintainer explicitly requests a specific co-author.

Agents creating commits must follow the same rule — see [`.agents/rules/commits.mdc`](../.agents/rules/commits.mdc).

## Agents

When creating commits, follow [`.agents/rules/commits.mdc`](../.agents/rules/commits.mdc) and this file. Split changes into focused commits by type/area when the user asks for multiple commits.
