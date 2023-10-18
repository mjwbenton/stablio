import { Construct } from "constructs";
import { S3Backend, TerraformStack, Fn, TerraformOutput } from "cdktf";
import * as neon from "./.gen/providers/neon";
import * as aws from "@cdktf/provider-aws";

export class StablioDataStack extends TerraformStack {
  readonly databaseSecret: aws.secretsmanagerSecret.SecretsmanagerSecret;

  constructor(scope: Construct, name: string) {
    super(scope, name);

    new S3Backend(this, {
      bucket: "mattb.tech-terraform-state",
      key: "stablio-data.tfstate",
      region: "us-east-1",
    });

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1",
    });

    new neon.provider.NeonProvider(this, "Neon", {});

    const neonProject = new neon.project.Project(this, "Project", {
      name: "stablio",
      regionId: "aws-eu-central-1",
    });

    this.databaseSecret = new aws.secretsmanagerSecret.SecretsmanagerSecret(
      this,
      "Secret",
      {
        namePrefix: "stablio-data",
      },
    );

    new aws.secretsmanagerSecretVersion.SecretsmanagerSecretVersion(
      this,
      "SecretVersion",
      {
        secretId: this.databaseSecret.id,
        secretString: Fn.jsonencode({
          host: neonProject.databaseHost,
          user: neonProject.databaseUser,
          password: neonProject.databasePassword,
          db: neonProject.databaseName,
        }),
      },
    );

    new TerraformOutput(this, "DatabaseSecretId", {
      value: this.databaseSecret.id,
    });
  }
}
