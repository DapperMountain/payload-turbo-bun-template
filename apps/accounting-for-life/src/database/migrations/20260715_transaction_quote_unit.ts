import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Transaction-level quote/valuation unit for mixed-currency journals.
 * Effective quote = quoteUnit ?? workspace.reportingCurrency.
 * When quote ≠ reporting, quoteToReportingRate snapshots reporting per 1 quote.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    ADD COLUMN IF NOT EXISTS "quote_unit_id" uuid;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    ADD COLUMN IF NOT EXISTS "quote_to_reporting_rate" numeric;
  `)

  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "transactions"
      ADD CONSTRAINT "transactions_quote_unit_id_units_id_fk"
      FOREIGN KEY ("quote_unit_id") REFERENCES "units"("id")
      ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "transactions_quote_unit_idx"
    ON "transactions" USING btree ("quote_unit_id");
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    ADD COLUMN IF NOT EXISTS "version_quote_unit_id" uuid;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    ADD COLUMN IF NOT EXISTS "version_quote_to_reporting_rate" numeric;
  `)

  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      ALTER TABLE "_transactions_v"
      ADD CONSTRAINT "_transactions_v_version_quote_unit_id_units_id_fk"
      FOREIGN KEY ("version_quote_unit_id") REFERENCES "units"("id")
      ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "_transactions_v_version_version_quote_unit_idx"
    ON "_transactions_v" USING btree ("version_quote_unit_id");
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    DROP CONSTRAINT IF EXISTS "_transactions_v_version_quote_unit_id_units_id_fk";
  `)
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "_transactions_v_version_version_quote_unit_idx";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_quote_to_reporting_rate";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_quote_unit_id";
  `)

  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP CONSTRAINT IF EXISTS "transactions_quote_unit_id_units_id_fk";
  `)
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "transactions_quote_unit_idx";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP COLUMN IF EXISTS "quote_to_reporting_rate";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP COLUMN IF EXISTS "quote_unit_id";
  `)
}
