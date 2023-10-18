import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { config } from "./config";

neonConfig.fetchConnectionCache = true;

async function buildDb() {
  const { DATABASE_URL } = await config;
  const sql = neon(DATABASE_URL);
  return drizzle(sql);
}

export const db = buildDb();
