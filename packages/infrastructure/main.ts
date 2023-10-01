import { App } from "cdktf";
import { StablioEmailStack } from "./StablioEmailStack";
import { StablioIngestionStack } from "./StablioIngestionStack";

const app = new App();
const emailStack = new StablioEmailStack(app, "stablio-email");
const ingestionStack = new StablioIngestionStack(app, "stablio-ingestion");
emailStack.subscribeLambdaToNewEmails(ingestionStack, "IngestionSubscription", {
  lambda: ingestionStack.lambda,
  lambdaRole: ingestionStack.lambdaRole,
});

app.synth();
