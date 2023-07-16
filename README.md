us-east-2 HVM64 AMI is changed to Ubuntu 22.04

TODO: Update all region AMIs to Ubuntu 22.04

# Using Tinker CLI

`npm i -g`

# Pre-requisites
- An AWS account with a domain registered in Route 53
- The AWS CLI installed and authenticated with a user attached with AdministratorAccess policy

# Installation
```
npm install tinker-admin-cli
```

# Usage
## Create admin portal
```
tinker deploy
```
When prompted for the domain's hosting zone ID, look for this in Route 53, under the domain's hosted zone details.

## Create project backend
```
tinker create
```

## Delete project backend
```
tinker delete
```

## Teardown admin portal and all projects
```
tinker destroy
```
