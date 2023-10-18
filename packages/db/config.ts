import { cleanEnv, str } from "envalid";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const SECRET_MANAGER_CLIENT = new SecretsManagerClient({});

const { DATABASE_SECRET } = cleanEnv(process.env, {
  DATABASE_SECRET: str(),
});

async function buildConfig() {
  const databaseSecretResponse = await SECRET_MANAGER_CLIENT.send(
    new GetSecretValueCommand({ SecretId: DATABASE_SECRET }),
  );
  const databaseConfig = JSON.parse(databaseSecretResponse.SecretString!);

  return {
    DATABASE_URL: `postgres://${databaseConfig.user}:${databaseConfig.password}@${databaseConfig.host}/${databaseConfig.db}`,
  };
}

export const config = buildConfig();
