<p align="center">
  <img width="125" height="125" src="https://github.com/tinker-base/tinker-dashboard/blob/27233f35469efd653eb95a6a0825a2a4231468d2/src/images/SVG%20Vector%20Files/tinker_logo.svg">
</p>

# Tinker
> Tinker automates the creation of backends for your web applications.
- [Overview](#overview)
- [Pre-requisites](#pre-requisites)
- [Installation](#installation)
- [Usage](#usage)
    
## Overview
Tinker is an open-source, self-hosted backend-as-a-service (BaaS) that accelerates development speed through automated configuration, deployment, and an intuitive database table editor.

Create public facing backends with minimal configuration in your AWS account through the Tinker CLI. Visualize and modify your application's data and schema with the companion Tinker dashboard.

## Pre-requisites
Before using the Tinker  CLI, make sure you have the following:
- An AWS account with a domain registered in Route 53
- The AWS CLI installed and authenticated with a user attached with AdministratorAccess policy

Backends are accessible as subdomains to the provided domain. E.g. `https://todos.mydomain.com`, `https://films.mydomain.com`.

## Installation
To install the Tinker CLI, run the following command from the terminal:
```sh
npm i -g tinker--cli
```

## Usage
The Tinker CLI provides several commands to manage your backends. Each command can be executed from the terminal.

### `tinker deploy`
Deploy the  dashboard to AWS, accessible at `https://admin.yourdomain.com` 

During the deployment process, you will be prompted to provide configuration options. Provide any of the following flags to skip its associated prompt.
```
FLAGS                                  
  -r, --region   AWS region                                       
  -d, --domain   Domain in AWS Route 53
  -z, --zone     Domain's hosting zone ID

EXAMPLE
  tinker deploy -r us-east-1 -d trytinker.com -z ABC123
```

### `tinker create`
Create a backend in AWS with a PostgreSQL database and PostgREST web server. 

During creation, you will be prompted to provide configuration options. Provide the following flag to skip its associated prompt:
```
FLAGS
  -n, --name: The name of the project. This will be used to identify the project backend.

EXAMPLE
  tinker create -n todos
```

### `tinker delete`
Delete a backend from AWS. Please note that this operation is irreversible and will delete all data and configurations for that backend. 

During deletion, you will be prompted to provide configuration options. Provide the following flag to skip its associated prompt:
```
FLAGS
  -n, --name: The name of the project backend to be deleted.

EXAMPLE
  tinker delete -n todos
```

### `tinker destroy`
Tear down all backends and the  dashboard from AWS. Please note that this operation is irreversible and will delete all data and configurations for all backends. 

Provide the optional force flag to bypass the confirmation prompt.
```sh
FLAGS
  -f, --force    Teardown tinker without confirmation

EXAMPLE
  tinker destroy -f
```
