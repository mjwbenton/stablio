import { App } from "cdktf";
import { StablioEmailStack } from "./StablioEmailStack";
import { StablioIngestionStack } from "./StablioIngestionStack";
import { StablioDataStack } from "./StablioDataStack";
import { StablioApiStack } from "./StablioApiStack";

const app = new App();
const dataStack = new StablioDataStack(app, "stablio-data");
const ingestionStack = new StablioIngestionStack(app, "stablio-ingestion", {
  databaseSecret: dataStack.databaseSecret,
});
const emailStack = new StablioEmailStack(app, "stablio-email");
emailStack.subscribeLambdaToNewEmails(
  ingestionStack,
  "EmailParseSubscription",
  {
    lambda: ingestionStack.emailParseLambda,
    lambdaRole: ingestionStack.emailParseLambdaRole,
  },
);
new StablioApiStack(app, "stablio-api", {
  databaseSecret: dataStack.databaseSecret,
});

app.synth();
