import type { GitHooksConfig } from 'bun-git-hooks'

/** Devmoji + Conventional Commits — see docs/COMMITS.md */
export default {
  'commit-msg': 'bun scripts/validate-commit-msg.ts $1',
} satisfies GitHooksConfig
