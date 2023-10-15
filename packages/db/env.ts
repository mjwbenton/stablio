import "dotenv/config";
import { cleanEnv, str } from "envalid";

export const { DATABASE_URL } = cleanEnv(process.env, {
  DATABASE_URL: str(),
});
