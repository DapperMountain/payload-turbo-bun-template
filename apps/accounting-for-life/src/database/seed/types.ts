/** Options for running a seeder outside `onInit` (e.g. `bun run db:seed`). */
export type SeedRunOptions = {
  /** Run even when `DATA_SEED_ENABLED` is false. */
  force?: boolean
}
