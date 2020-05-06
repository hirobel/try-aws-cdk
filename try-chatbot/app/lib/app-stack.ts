import * as cdk from '@aws-cdk/core';

import chatbot = require("@aws-cdk/aws-chatbot");
import iam = require("@aws-cdk/aws-iam");
import sns = require("@aws-cdk/aws-sns");
import lambda = require("@aws-cdk/aws-lambda");
import cloudwatch = require("@aws-cdk/aws-cloudwatch");
import * as cloudwatch_actions from '@aws-cdk/aws-cloudwatch-actions';
import * as logs from '@aws-cdk/aws-logs';

export class AppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda
    const LAMBDA_CUSTOM_NAME = `chatbot-func`;
    const lambdarole = new iam.Role(this, "SampleFunctionRole", {
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
    const chatbotfunc = new lambda.Function(this, "chatbot-func", {
      functionName: LAMBDA_CUSTOM_NAME,
      code: lambda.Code.asset("src/chatbot-func-code"),
      handler: "index.handler",
      runtime: lambda.Runtime.NODEJS_10_X,
      role: lambdarole
    });    

    // SNS
    const topic = new sns.Topic(this, 'chatbot-topic', {
        topicName: "chatbot-topic",
        displayName: 'Customer subscription topic'
    });

    // CW
    const logGroup = logs.LogGroup.fromLogGroupName(this, 'log-group', '/aws/lambda/' + chatbotfunc.functionName);
    new logs.MetricFilter(this, `metricfilter-referenceerror`, {
      filterPattern: { logPatternString: "[ERROR,WARN]" },
      logGroup: logGroup,
      metricNamespace: 'chatbot-test',
      metricName: 'metricfilter-referenceerror',
    });
    const metric = new cloudwatch.Metric({
      namespace: "chatbot-test",
      metricName: "metricfilter-referenceerror"
    });
    const alarm = new cloudwatch.Alarm(this, 'chatbot-alerm', {
      alarmName: 'chatbot-alerm',
      metric: metric,
      threshold: 1,
      evaluationPeriods: 1,
      datapointsToAlarm: 1,
      treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING
    });
    alarm.addAlarmAction(new cloudwatch_actions.SnsAction(topic));

    // IAM
    const chatbotrole = new iam.Role(this, "chatbot-role", {
      assumedBy: new iam.ServicePrincipal("chatbot.amazonaws.com"),
      path: "/service-role/",
      inlinePolicies: {
        CloudWatchWritePolicy: new iam.PolicyDocument({
          statements: [
            new iam.PolicyStatement({
              actions: [
                "cloudwatch:Describe*",
                "cloudwatch:Get*",
                "cloudwatch:List*"
              ],
              resources: ["*"]
            })
          ]
        })
      }
    });

    // Chatbot
    const slackChannelId =  process.env.SLACK_CHANNEL_ID || "";
    const slackWorkspaceId =  process.env.SLACK_WORKSPACE_ID || "";
    new chatbot.CfnSlackChannelConfiguration(this, "chatbot-slack-test", {
      "configurationName" : "chatbot-slack-test",
      "iamRoleArn" : chatbotrole.roleArn,
      "slackChannelId" : slackChannelId,
      "slackWorkspaceId" : slackWorkspaceId,
      "snsTopicArns" : [topic.topicArn],
    });

    // The code that defines your stack goes here
  }
}
