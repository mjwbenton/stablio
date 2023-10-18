import { db } from "./db";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function run() {
  await migrate(await db, { migrationsFolder: "drizzle" });
}
run();
