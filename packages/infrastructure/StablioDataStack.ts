import { Construct } from "constructs";
import { S3Backend, TerraformStack, Fn, TerraformOutput } from "cdktf";
import * as neon from "./.gen/providers/neon";
import * as aws from "@cdktf/provider-aws";
import * as random from "@cdktf/provider-random";
import { NodejsFunction } from "./NodeJsFunction";
import * as path from "path";

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

    new random.provider.RandomProvider(this, "random");

    const neonProject = new neon.project.Project(this, "Project", {
      name: "stablio",
      regionId: "aws-eu-central-1",
      historyRetentionSeconds: 86400,
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

    // Create backup bucket
    const backupBucket = new aws.s3Bucket.S3Bucket(this, "BackupBucket", {
      bucketPrefix: "stablio-backup-bucket",
    });

    // Create backup Lambda
    const backupFunction = new NodejsFunction(this, "BackupLambda", {
      path: path.join(__dirname, "..", "db-backup-lambda"),
      handler: "index.handler",
      environment: {
        DATABASE_SECRET: this.databaseSecret.id,
        BACKUP_BUCKET: backupBucket.bucket,
      },
    });

    // Give backup Lambda permission to write to bucket
    new aws.iamRolePolicy.IamRolePolicy(this, "BackupWriteBucketPolicy", {
      role: backupFunction.role.name,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:PutObject"],
            Resource: [backupBucket.arn + "/*"],
          },
        ],
      }),
    });

    // Give backup Lambda permission to read database secret
    new aws.iamRolePolicy.IamRolePolicy(
      this,
      "BackupReadDatabaseSecretPolicy",
      {
        role: backupFunction.role.name,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Effect: "Allow",
              Action: ["secretsmanager:GetSecretValue"],
              Resource: [this.databaseSecret.arn],
            },
          ],
        }),
      },
    );

    // Create function URL for manual invocation
    const functionUrl = backupFunction.addFunctionUrl();

    // Create CloudWatch Event Rule to trigger backup monthly
    const eventRule = new aws.cloudwatchEventRule.CloudwatchEventRule(
      this,
      "BackupSchedule",
      {
        name: "stablio-backup-schedule",
        description: "Trigger database backup monthly",
        scheduleExpression: "rate(30 days)",
      },
    );

    // Allow EventBridge to invoke the Lambda
    new aws.lambdaPermission.LambdaPermission(this, "AllowEventBridgeInvoke", {
      functionName: backupFunction.lambda.functionName,
      action: "lambda:InvokeFunction",
      principal: "events.amazonaws.com",
      sourceArn: eventRule.arn,
    });

    // Connect the Event Rule to the Lambda
    new aws.cloudwatchEventTarget.CloudwatchEventTarget(
      this,
      "BackupEventTarget",
      {
        rule: eventRule.name,
        arn: backupFunction.lambda.arn,
        targetId: "StablioBackupLambda",
      },
    );

    new TerraformOutput(this, "DatabaseSecretId", {
      value: this.databaseSecret.id,
    });

    new TerraformOutput(this, "BackupFunctionUrl", {
      value: functionUrl.functionUrl,
    });
  }
}
