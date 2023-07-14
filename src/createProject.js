import chalk from "chalk";
import ora from "ora";
import axios from "axios";

import {
  CloudFormation,
  waitUntilStackCreateComplete,
} from "@aws-sdk/client-cloudformation";
import fs from "fs";
import util from "util";
import { generateJWT } from "../utils/generateJWT.js";
import { getProjectName } from "../utils/getProjectName.js";
import "dotenv/config";

// ALB listener rules must have unique priorities from 1-50000
// Rule for admin is 1, so projects must be offset
// Rule number is determined from projects' primary key
const ruleNumberOffset = 1;
const maxRuleNumber = 50000;

const spinner = ora({
  text: "Deploying to AWS... This may take up to 15 minutes!",
  color: "cyan",
});

const tinkerPurple = chalk.rgb(99, 102, 241);

const stackName = await getProjectName();
const templatePath = process.env.DEVELOPMENT ? "./empty_template.json" : "./tinker_create_project_template.json";
const encoding = "utf8";

const readFileAsync = util.promisify(fs.readFile);

const readTemplateFromFile = async (templatePath, encoding) => {
  try {
    let template = await readFileAsync(templatePath, encoding);
    return template;
  } catch (error) {
    console.error(chalk.red("Error creating project:"), error);
    process.exit(1);
  }
};

const promisifyCreateStack = async (cloudFormation, stackParams) => {
  return new Promise((resolve, reject) => {
    cloudFormation.createStack(stackParams, (error, data) => {
      if (error) {
        console.log(error);
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

const createStack = async (cloudFormation, stackParams) => {
  try {
    spinner.start();

    await promisifyCreateStack(cloudFormation, stackParams);
  } catch (error) {
    setTimeout(() => {
      spinner.fail("Deployment failed!");
    }, 1000);

    console.log("Stack creation failed.");
    process.exit(1);
  }
};

const waitStack = async (cloudFormation, stackName, spinner) => {
  const waiterParams = {
    client: cloudFormation,
    maxWaitTime: 900,
  };

  const describeStacksCommandInput = {
    StackName: stackName,
  };

  try {
    await waitUntilStackCreateComplete(
      waiterParams,
      describeStacksCommandInput
    );
    spinner.succeed("Deployment complete!");
  } catch (error) {
    spinner.fail("Deployment failed!");
    console.log("Timed out waiting for Stack to complete.");
    process.exit(1);
  }
};

const promisifyDescribeStack = async (cloudFormation, stackParams) => {
  return new Promise((resolve, reject) => {
    cloudFormation.describeStacks(stackParams, (error, data) => {
      if (error) {
        reject(error);
      } else {
        resolve(data);
      }
    });
  });
};

const getStackOutputs = async (cloudFormation, stackParams) => {
  try {
    let data = await promisifyDescribeStack(cloudFormation, stackParams);
    const outputs = data.Stacks[0].Outputs;

    return outputs;
  } catch (error) {
    console.log("Error retrieving stack outputs");
    process.exit(1);
  }
};

const getRegion = (stackOutputs) => {
  return stackOutputs.find((o) => o.OutputKey === "TinkerRegion").OutputValue;
};
const getAdminDomain = (stackOutputs) => {
  return stackOutputs.find((o) => o.OutputKey === "TinkerAdminDomain")
    .OutputValue;
};

const getDomain = async (stackOutputs) => {
  return stackOutputs.find((o) => o.OutputKey === "TinkerDomainName")
    .OutputValue;
};

const updateProjectsTable = async (jwt, projectDomain) => {
  try {
    await axios.post(
      `https://${adminDomain}:3000/projects`,
      { name: stackName, domain: projectDomain },
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
  } catch (error) {
    console.error(error);
    console.log("Error updating projects");
    process.exit(1);
  }
};

const getNextProjectId = async (jwt, adminDomain) => {
  try {
    const response = await axios.post(
      `https://${adminDomain}:3000/rpc/get_next_project_id`,
      null,
      {
        headers: { Authorization: `Bearer ${jwt}` },
      }
    );

    return response.data;
  } catch (error) {
    console.error(error);
    console.log("Error getting next project Id");
    process.exit(1);
  }
};

export const createProject = async (region, stackName, ProjectId) => {
  const template = await readTemplateFromFile(templatePath, encoding);
  const cloudFormation = new CloudFormation({ region });
  const stackParams = {
    StackName: stackName,
    TemplateBody: template,
    Parameters: [
      {
        ParameterKey: "ProjectName",
        ParameterValue: stackName,
      },
      {
        ParameterKey: "RulePriority",
        ParameterValue: (ProjectId + ruleNumberOffset) % maxRuleNumber,
      },
    ],
  };

  try {
    await createStack(cloudFormation, stackParams, spinner);
    await waitStack(cloudFormation, stackName, spinner);
  } catch (e) {
    console.log("Failed attempting to retrieve Stack output.");
  }
};

const tinkerAdminStack = "TinkerAdminStack";

const cloudFormation = new CloudFormation();
const jwt = await generateJWT(process.env.SECRET);

let stackOutputs = await getStackOutputs(cloudFormation, {
  StackName: tinkerAdminStack,
});

let adminDomain = await getAdminDomain(stackOutputs);
let domain = await getDomain(stackOutputs);
let region = await getRegion(stackOutputs);

const ProjectId = Number(await getNextProjectId(jwt, adminDomain));

await createProject(region, stackName, ProjectId);
await updateProjectsTable(jwt, `${stackName}.${domain}`);

console.log();
console.log(tinkerPurple("Your project was created successfully!"));

process.exit(0);
