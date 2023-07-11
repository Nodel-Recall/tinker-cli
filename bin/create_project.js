import chalk from "chalk";
import ora from "ora";
import axios from "axios";

import {
  CloudFormation,
  waitUntilStackCreateComplete,
} from "@aws-sdk/client-cloudformation";
import fs from "fs";
import util from "util";
import readline from "readline";

const spinner = ora({
  text: "Deploying to AWS... This may take up to 15 minutes!",
  color: "cyan",
});

const tinkerPurple = chalk.rgb(99, 102, 241);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// const stackName = process.argv[2];
let stackName;
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

const validProjectName = (projectName) => {
  if (whiteSpace(projectName)) return false;
  const match = projectName.match(/^[a-zA-Z][a-zA-Z0-9-]+$/g);
  if (!match) {
    return false;
  }
  return match[0] === projectName;
};

const whiteSpace = (projectName) => {
  const trimmed = projectName.replace(" ", "");
  if (trimmed === projectName) {
    return false;
  }
  return true;
};

const promisifyProjectNameQuestion = () => {
  return new Promise((resolve, reject) => {
    rl.question(
      tinkerPurple(
        "Enter Project Name (alphanumeric chars and hyphens only): "
      ),
      (answer) => {
        if (!validProjectName(answer)) {
          reject(
            chalk.red(
              "Invalid Name. Alphanumeric chars and hyphens only. Name must start with an alphanumeric char."
            )
          );
        }
        resolve(answer);
      }
    );
  });
};

const getProjectName = async () => {
  try {
    return await promisifyProjectNameQuestion();
  } catch (error) {
    console.log("error getting projuct name input", error);
  }
};

stackName = await getProjectName();

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
    await axios.post(
      `https://admin.${process.env.DOMAIN_NAME}:3000`,
      { name: stackName, subdomain: `${stackName}.${process.env.DOMAIN_NAME}` },
      { Authorization: `Bearer ${jwt}` }
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
updateProjectsTable();

console.log();
console.log(tinkerPurple("Your project was created successfully!"));
process.exit(0);
