import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Account visibility (US-3.2): all_members | admins.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_accounts_visibility" AS ENUM ('all_members', 'admins');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "accounts"
    ADD COLUMN IF NOT EXISTS "visibility" "enum_accounts_visibility"
    DEFAULT 'all_members'::"enum_accounts_visibility";
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "accounts" SET "visibility" = 'all_members' WHERE "visibility" IS NULL;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "accounts" ALTER COLUMN "visibility" SET NOT NULL;
  `)

  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum__accounts_v_version_visibility" AS ENUM ('all_members', 'admins');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_accounts_v"
    ADD COLUMN IF NOT EXISTS "version_visibility" "enum__accounts_v_version_visibility"
    DEFAULT 'all_members'::"enum__accounts_v_version_visibility";
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "_accounts_v" SET "version_visibility" = 'all_members' WHERE "version_visibility" IS NULL;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_accounts_v" ALTER COLUMN "version_visibility" SET NOT NULL;
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_accounts_v" DROP COLUMN IF EXISTS "version_visibility";
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "enum__accounts_v_version_visibility";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "accounts" DROP COLUMN IF EXISTS "visibility";
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "enum_accounts_visibility";
  `)
}
