import { db } from "./db";
import { migrate } from "drizzle-orm/neon-http/migrator";

async function run() {
  await migrate(db, { migrationsFolder: "drizzle" });
}
run();
