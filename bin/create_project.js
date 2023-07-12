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
import { getProjectName } from "../utils/get_project_name.js";
import "dotenv/config";

const spinner = ora({
  text: "Deploying to AWS... This may take up to 15 minutes!",
  color: "cyan",
});

const tinkerPurple = chalk.rgb(99, 102, 241);

// const stackName = process.argv[2];
const stackName = await getProjectName();
const templatePath = "./tinker_create_project_template.json";
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

    const data = await promisifyCreateStack(cloudFormation, stackParams);
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

const retrieveStackOutputs = async (cloudFormation, stackParams, spinner) => {
  try {
    let data = await promisifyDescribeStack(cloudFormation, stackParams);
    const outputs = data.Stacks[0].Outputs;

    const url = outputs.find((o) => o.OutputKey === "URL").OutputValue;
    return url;
  } catch (error) {
    spinner.fail("Deployment failed!");

    console.log("Error returning the IP Address of the Project.");
    process.exit(1);
  }
};

const updateProjectsTable = async () => {
  try {
    const jwt = generateJWT(process.env.SECRET);
    await axios.post(
      `https://admin.${process.env.DOMAIN_NAME}:3000/projects`,
      { name: stackName, domain: process.env.DOMAIN_NAME },
      { headers: { Authorization: `Bearer ${jwt}` } }
    );
  } catch (error) {
    console.error(error);
    console.log("Error updating projects");
  }
};

export const createProject = async (stackName) => {
  const template = await readTemplateFromFile(templatePath, encoding);
  const cloudFormation = new CloudFormation();
  const stackParams = {
    StackName: stackName,
    TemplateBody: template,
    Parameters: [
      {
        ParameterKey: "ProjectName",
        ParameterValue: stackName,
      },
    ],
  };

  try {
    await createStack(cloudFormation, stackParams, spinner);
    await waitStack(cloudFormation, stackName, spinner);
    const IPAddress = await retrieveStackOutputs(cloudFormation, stackParams);
    //send IPaddress with stackName to projects backend
    return IPAddress;
  } catch (e) {
    console.log("Failed attempting to retrieve Stack output.");
  }
};

await createProject(stackName);

console.log();
console.log(tinkerPurple("Your project was created successfully!"));

process.exit(0);
