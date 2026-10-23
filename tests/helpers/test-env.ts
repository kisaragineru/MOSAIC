export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgres://mosaic_app:app_dev_pw@localhost:5432/mosaic_test";
export const TEST_MIGRATION_DATABASE_URL =
  process.env.TEST_MIGRATION_DATABASE_URL ?? "postgres://mosaic_owner:owner_dev_pw@localhost:5432/mosaic_test";
