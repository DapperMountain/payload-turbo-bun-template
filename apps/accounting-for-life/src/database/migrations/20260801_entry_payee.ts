import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/** Optional merchant payee on each transaction-entry leg (split / fee lines). */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries" ADD COLUMN IF NOT EXISTS "payee" varchar;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transaction_entries" DROP COLUMN IF EXISTS "payee";
  `)
}
