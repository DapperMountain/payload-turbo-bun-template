import { sql, type MigrateDownArgs, type MigrateUpArgs } from '@payloadcms/db-postgres'

/**
 * Remap legacy unit kinds (currency/commodity/other) to fiat/crypto/custom (US-2.1).
 */
export async function up({ payload }: MigrateUpArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units" ALTER COLUMN "kind" DROP DEFAULT;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units" ALTER COLUMN "kind" TYPE text USING "kind"::text;
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "units" SET "kind" = 'fiat' WHERE "kind" = 'currency';
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "units" SET "kind" = 'custom' WHERE "kind" IN ('commodity', 'other');
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "enum_units_kind";
  `)
  await payload.db.drizzle.execute(sql`
    CREATE TYPE "enum_units_kind" AS ENUM ('fiat', 'crypto', 'custom');
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units"
    ALTER COLUMN "kind" TYPE "enum_units_kind" USING "kind"::"enum_units_kind";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units" ALTER COLUMN "kind" SET DEFAULT 'fiat'::"enum_units_kind";
  `)
}

export async function down({ payload }: MigrateDownArgs): Promise<void> {
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units" ALTER COLUMN "kind" DROP DEFAULT;
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units" ALTER COLUMN "kind" TYPE text USING "kind"::text;
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "units" SET "kind" = 'currency' WHERE "kind" = 'fiat';
  `)
  await payload.db.drizzle.execute(sql`
    UPDATE "units" SET "kind" = 'other' WHERE "kind" IN ('crypto', 'custom');
  `)
  await payload.db.drizzle.execute(sql`
    DROP TYPE IF EXISTS "enum_units_kind";
  `)
  await payload.db.drizzle.execute(sql`
    CREATE TYPE "enum_units_kind" AS ENUM ('currency', 'commodity', 'other');
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units"
    ALTER COLUMN "kind" TYPE "enum_units_kind" USING "kind"::"enum_units_kind";
  `)
  await payload.db.drizzle.execute(sql`
    ALTER TABLE "units" ALTER COLUMN "kind" SET DEFAULT 'currency'::"enum_units_kind";
  `)
}
