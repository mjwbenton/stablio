import { Construct } from "constructs";
import { TerraformStack, S3Backend } from "cdktf";
import * as aws from "@cdktf/provider-aws";

const HOSTED_ZONE_ID = "Z2GPSB1CDK86DH";
const EMAIL_DOMAIN = "stablio.mattb.tech";

export class StablioEmailStack extends TerraformStack {
  readonly emailBucket: aws.s3Bucket.S3Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id);

    new S3Backend(this, {
      bucket: "mattb.tech-terraform-state",
      key: "stablio-email.tfstate",
      region: "us-east-1",
    });

    new aws.provider.AwsProvider(this, "AWS", {
      region: "eu-west-1",
    });

    this.setupSESForDomain();
    this.emailBucket = new aws.s3Bucket.S3Bucket(this, "EmailBucket", {
      bucketPrefix: "stablio-email-bucket",
    });
    this.createEmailRule(this.emailBucket);
  }

  private setupSESForDomain() {
    const domainIdentity = new aws.sesDomainIdentity.SesDomainIdentity(
      this,
      "SESDomainIdentity",
      {
        domain: EMAIL_DOMAIN,
      },
    );

    const domainVerificationRecord = new aws.route53Record.Route53Record(
      this,
      "DomainVerificationRecord",
      {
        zoneId: HOSTED_ZONE_ID,
        name: `_amazonses.${EMAIL_DOMAIN}`,
        type: "TXT",
        ttl: 600,
        records: [domainIdentity.verificationToken],
      },
    );

    new aws.sesDomainIdentityVerification.SesDomainIdentityVerification(
      this,
      "SESDomainIdentityVerification",
      {
        domain: EMAIL_DOMAIN,
        dependsOn: [domainVerificationRecord],
      },
    );

    new aws.route53Record.Route53Record(this, "MXRecord", {
      zoneId: HOSTED_ZONE_ID,
      name: EMAIL_DOMAIN,
      type: "MX",
      ttl: 1800,
      records: ["10 inbound-smtp.eu-west-1.amazonaws.com"],
    });
  }

  private createEmailRule(bucket: aws.s3Bucket.S3Bucket) {
    const emailRuleSet = new aws.sesReceiptRuleSet.SesReceiptRuleSet(
      this,
      "SESRuleSet",
      {
        ruleSetName: "stablio-email-rule-set",
      },
    );

    const callerIdentity = new aws.dataAwsCallerIdentity.DataAwsCallerIdentity(
      this,
      "CallerIdentity",
      {},
    );

    const bucketPolicy = new aws.s3BucketPolicy.S3BucketPolicy(
      this,
      "SESBucketPolicy",
      {
        bucket: bucket.bucket,
        policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "AllowSESPuts",
              Effect: "Allow",
              Principal: {
                Service: "ses.amazonaws.com",
              },
              Action: "s3:PutObject",
              Resource: `${bucket.arn}/*`,
              Condition: {
                StringEquals: {
                  "aws:Referer": callerIdentity.accountId,
                },
              },
            },
          ],
        }),
      },
    );

    new aws.sesReceiptRule.SesReceiptRule(this, "SESRule", {
      name: "stablio-import-rule",
      enabled: true,
      ruleSetName: emailRuleSet.ruleSetName,
      recipients: ["import@stablio.mattb.tech"],
      scanEnabled: false,
      s3Action: [
        {
          bucketName: bucket.bucket,
          position: 1,
        },
      ],
      dependsOn: [bucketPolicy],
    });

    new aws.sesActiveReceiptRuleSet.SesActiveReceiptRuleSet(
      this,
      "SESActiveRuleSet",
      {
        ruleSetName: emailRuleSet.ruleSetName,
      },
    );
  }

  public subscribeLambdaToNewEmails(
    scope: Construct,
    id: string,
    { lambda }: { lambda: aws.lambdaFunction.LambdaFunction },
  ) {
    new aws.s3BucketNotification.S3BucketNotification(
      scope,
      `${id}BucketNotification`,
      {
        bucket: this.emailBucket.bucket,
        lambdaFunction: [
          {
            lambdaFunctionArn: lambda.arn,
            events: ["s3:ObjectCreated:*"],
          },
        ],
      },
    );
    new aws.lambdaPermission.LambdaPermission(scope, `${id}Permission`, {
      functionName: lambda.functionName,
      action: "lambda:InvokeFunction",
      principal: "s3.amazonaws.com",
      sourceArn: this.emailBucket.arn,
    });
    new aws.iamRolePolicy.IamRolePolicy(scope, `${id}ReadS3Permission`, {
      role: lambda.role,
      policy: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Action: ["s3:GetObject", "s3:ListBucket"],
            Resource: [this.emailBucket.arn + "/*"],
          },
        ],
      }),
    });
  }
}
