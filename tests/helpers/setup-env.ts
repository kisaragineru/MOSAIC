import { afterAll } from "vitest";
import { closeDb } from "@/server/db/client";
import { TEST_DATABASE_URL } from "./test-env";

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.APP_ORIGIN = "http://localhost:3000";
delete process.env.ANTHROPIC_API_KEY;

afterAll(async () => {
  await closeDb();
});
