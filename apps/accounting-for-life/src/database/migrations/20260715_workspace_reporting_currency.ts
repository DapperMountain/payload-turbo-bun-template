import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Workspace reporting currency (US-2.2) — optional FK to `units` for FX / reportingAmount.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "workspaces"
    ADD COLUMN IF NOT EXISTS "reporting_currency_id" uuid;
  `)
  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "workspaces"
      ADD CONSTRAINT "workspaces_reporting_currency_id_units_id_fk"
      FOREIGN KEY ("reporting_currency_id") REFERENCES "units"("id")
      ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "workspaces_reporting_currency_idx"
    ON "workspaces" USING btree ("reporting_currency_id");
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "workspaces" DROP CONSTRAINT IF EXISTS "workspaces_reporting_currency_id_units_id_fk";
  `)
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "workspaces_reporting_currency_idx";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "workspaces" DROP COLUMN IF EXISTS "reporting_currency_id";
  `)
}
