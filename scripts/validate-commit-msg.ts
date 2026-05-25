/**
 * Validates the first line of a git commit message (Devmoji + Conventional Commits).
 *
 * Usage:
 *   bun scripts/validate-commit-msg.ts .git/COMMIT_EDITMSG   # commit-msg hook
 *   bun scripts/validate-commit-msg.ts --message "feat: ✨ add x"
 *   bun scripts/validate-commit-msg.ts --range origin/main..HEAD
 */

const TYPES = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'] as const

/** type(scope): <emoji> subject — emoji is non-ASCII start of description */
const SUBJECT_RE = new RegExp(
  `^(${TYPES.join('|')})(\\([a-z0-9][a-z0-9.-]*\\))?:\\s+(\\S+)\\s+(.+)$`,
)

const EMOJI_RE = /\p{Extended_Pictographic}/u

function firstLine(message: string): string {
  for (const line of message.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    return trimmed
  }
  return ''
}

export function validateCommitSubject(line: string): { ok: true } | { ok: false; error: string } {
  if (!line) {
    return { ok: false, error: 'Commit message is empty.' }
  }

  if (/^Merge /i.test(line) || /^Revert /i.test(line)) {
    return { ok: true }
  }

  const match = line.match(SUBJECT_RE)
  if (!match) {
    return {
      ok: false,
      error:
        'Subject must match: type(scope): <emoji> <description>\n' +
        `  Types: ${TYPES.join(', ')}\n` +
        '  Example: feat(i18n): 🌐 add locale switcher',
    }
  }

  const emojiToken = match[3]
  const description = match[4]

  if (!EMOJI_RE.test(emojiToken)) {
    return {
      ok: false,
      error:
        `Missing emoji after ": " (got "${emojiToken}").\n` +
        '  Example: refactor(access): ♻️ modularize access policies',
    }
  }

  if (description.length < 3) {
    return { ok: false, error: 'Description after emoji is too short.' }
  }

  return { ok: true }
}

function readMessageFile(path: string): string {
  return Bun.file(path).text()
}

async function commitsInRange(range: string): Promise<string[]> {
  const proc = Bun.spawn(['git', 'log', '--format=%s', range], {
    stdout: 'pipe',
    stderr: 'inherit',
  })
  const out = await new Response(proc.stdout).text()
  const code = await proc.exited
  if (code !== 0) process.exit(code)
  return out
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args[0] === '--message') {
    const line = args[1] ?? ''
    const result = validateCommitSubject(line)
    if (!result.ok) {
      console.error(result.error)
      process.exit(1)
    }
    return
  }

  if (args[0] === '--range') {
    const range = args[1]
    if (!range) {
      console.error('Usage: --range <git-rev-range>')
      process.exit(1)
    }
    const subjects = await commitsInRange(range)
    for (const subject of subjects) {
      const result = validateCommitSubject(subject)
      if (!result.ok) {
        console.error(`Invalid commit: ${subject}\n${result.error}`)
        process.exit(1)
      }
    }
    return
  }

  const file = args[0]
  if (!file) {
    console.error('Usage: validate-commit-msg.ts <commit-msg-file> | --message "..." | --range A..B')
    process.exit(1)
  }

  const message = await readMessageFile(file)
  const result = validateCommitSubject(firstLine(message))
  if (!result.ok) {
    console.error(result.error)
    console.error('\nSee docs/COMMITS.md')
    process.exit(1)
  }
}

main()
