import { App } from "cdktf";
import { StablioEmailStack } from "./StablioEmailStack";
import { StablioIngestionStack } from "./StablioIngestionStack";

const app = new App();
const emailStack = new StablioEmailStack(app, "stablio-email");
const ingestionStack = new StablioIngestionStack(app, "stablio-ingestion", {
  bucket: emailStack.emailBucket,
});
emailStack.subscribeLambdaToNewEmails(ingestionStack, "IngestionSubscription", {
  lambda: ingestionStack.lambda,
});

app.synth();
