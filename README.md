us-east-2 HVM64 AMI is changed to Ubuntu 22.04

TODO: Update all region AMIs to Ubuntu 22.04

## Using Tinker CLI

`npm i -g`

$ Tinker-init : initial setup before deployment. Requires user's AWS credentials, connects to AWS CLI and stores AWS credentials into users `~/.aws/credentials` file.

$ Tinker-deploy : takes the users aws credentials in `~/.aws/credtials` file and send a request to AWS CloudFormation using AWS SDK to provision an EX2 and deploys the tinker docker image (or something to that extent) on that EC2.
