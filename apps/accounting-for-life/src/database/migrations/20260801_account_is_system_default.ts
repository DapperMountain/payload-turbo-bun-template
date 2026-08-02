import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * System Income/Expense chart accounts (`isSystemDefault`) for classical DE posting.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "accounts"
    ADD COLUMN IF NOT EXISTS "is_system_default" boolean DEFAULT false;
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "accounts" SET "is_system_default" = false WHERE "is_system_default" IS NULL;
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_accounts_v"
    ADD COLUMN IF NOT EXISTS "version_is_system_default" boolean DEFAULT false;
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "_accounts_v"
    SET "version_is_system_default" = false
    WHERE "version_is_system_default" IS NULL;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_accounts_v" DROP COLUMN IF EXISTS "version_is_system_default";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "accounts" DROP COLUMN IF EXISTS "is_system_default";
  `)
}
