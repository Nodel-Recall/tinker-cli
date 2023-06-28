console.log("hello world");

const AWS = require("aws-sdk");

const cloudformation = new AWS.CloudFormation({ region: "us-east-1" }); // Specify the desired AWS

const stackParams = {
  StackName: "MyStack", // Specify the desired stack name
  TemplateBody: `
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyInstance:
    Type: "AWS::EC2::Instance"
    Properties:
      ImageId: "ami-024e6efaf93d85776"
      InstanceType: "t2.micro"
  `,
  Capabilities: ["CAPABILITY_IAM"], // Optional capabilities required for the stack
  Tags: [
    {
      Key: "Environment",
      Value: "Production",
    },
    // Add more tags as needed
  ],
};

cloudformation.createStack(stackParams, (err, data) => {
  if (err) {
    console.error("Error creating stack:", err);
  } else {
    console.log("Stack creation initiated:", data.StackId);
  }
});
