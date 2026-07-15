import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Import sync footholds on transactions (US-6.2): source, externalId, importBatch.
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum_transactions_source" AS ENUM ('manual', 'import');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions"
    ADD COLUMN IF NOT EXISTS "source" "enum_transactions_source"
    DEFAULT 'manual'::"enum_transactions_source";
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "transactions" SET "source" = 'manual' WHERE "source" IS NULL;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" ALTER COLUMN "source" SET NOT NULL;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "external_id" varchar;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "import_batch" varchar;
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "transactions_external_id_idx"
    ON "transactions" ("external_id");
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "transactions_import_batch_idx"
    ON "transactions" ("import_batch");
  `)
  await payload.db.drizzle.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "transactions_workspace_external_id_unique"
    ON "transactions" ("workspace_id", "external_id")
    WHERE "external_id" IS NOT NULL AND "external_id" <> '';
  `)

  await payload.db.drizzle.execute(sql`
    DO $$ BEGIN
      CREATE TYPE "enum__transactions_v_version_source" AS ENUM ('manual', 'import');
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v"
    ADD COLUMN IF NOT EXISTS "version_source" "enum__transactions_v_version_source"
    DEFAULT 'manual'::"enum__transactions_v_version_source";
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "_transactions_v" SET "version_source" = 'manual' WHERE "version_source" IS NULL;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" ALTER COLUMN "version_source" SET NOT NULL;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" ADD COLUMN IF NOT EXISTS "version_external_id" varchar;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" ADD COLUMN IF NOT EXISTS "version_import_batch" varchar;
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "_transactions_v_version_version_external_id_idx"
    ON "_transactions_v" ("version_external_id");
  `)
  await payload.db.drizzle.execute(sql`
    CREATE INDEX IF NOT EXISTS "_transactions_v_version_version_import_batch_idx"
    ON "_transactions_v" ("version_import_batch");
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "_transactions_v_version_version_import_batch_idx";
  `)
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "_transactions_v_version_version_external_id_idx";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_import_batch";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_external_id";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "_transactions_v" DROP COLUMN IF EXISTS "version_source";
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "enum__transactions_v_version_source";
  `)

  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "transactions_workspace_external_id_unique";
  `)
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "transactions_import_batch_idx";
  `)
  await payload.db.drizzle.execute(sql`
    DROP INDEX IF EXISTS "transactions_external_id_idx";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP COLUMN IF EXISTS "import_batch";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP COLUMN IF EXISTS "external_id";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "transactions" DROP COLUMN IF EXISTS "source";
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "enum_transactions_source";
  `)
}
