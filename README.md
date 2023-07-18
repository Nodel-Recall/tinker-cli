# Tinker Admin CLI
Tinker automates the creation of backends for your web applications.

# Pre-requisites
- An AWS account with a domain registered in Route 53
- The AWS CLI installed and authenticated with a user attached with AdministratorAccess policy

# Installation
```
npm i -g tinker-admin-cli
```

# Usage
## Create admin dashboard
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

## Teardown admin dashboard and all projects
```
tinker destroy
```
