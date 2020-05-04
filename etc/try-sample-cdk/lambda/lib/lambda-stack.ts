import cdk = require("@aws-cdk/core");
// 以下のコードを追加
import iam = require("@aws-cdk/aws-iam");
import lambda = require("@aws-cdk/aws-lambda");

export class LambdaStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 以下のコードを追加（IAMロール作成）
    const role = new iam.Role(this, "SampleFunctionRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      path: "/service-role/",
      inlinePolicies: {
        CloudWatchWritePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "logs:CreateLogGroup",
                "logs:CreateLogStream",
                "logs:PutLogEvents"
              ],
              resources: ["*"]
            })
          ]
        })
      }
    });

    // 以下のコードを追加（Lambda関数作成）
    new lambda.Function(this, "SampleFunction", {
      code: lambda.Code.asset("resources/sample-function"), // パスはプロジェクトのルートからのパス
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_10_X,
      role
    });
  }
}