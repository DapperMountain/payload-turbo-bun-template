import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Optional user confirmation when cash↔holding could be buy, sell, or transfer.
 * Null = derive at read time.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum_transactions_economic_kind" AS ENUM('buy', 'sell', 'transfer');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    ADD COLUMN IF NOT EXISTS "economic_kind" "enum_transactions_economic_kind";
  `)

  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "public"."enum__transactions_v_version_economic_kind" AS ENUM('buy', 'sell', 'transfer');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    ADD COLUMN IF NOT EXISTS "version_economic_kind" "enum__transactions_v_version_economic_kind";
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_economic_kind";
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "public"."enum__transactions_v_version_economic_kind";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP COLUMN IF EXISTS "economic_kind";
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "public"."enum_transactions_economic_kind";
  `)
}
