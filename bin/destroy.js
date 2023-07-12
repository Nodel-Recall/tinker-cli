import {
  CloudFormation,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import chalk from "chalk";
import ora from "ora";
import axios from "axios";
import "dotenv/config";

const spinner = ora({
  text: "Deleting Tinker-Admin..This could take a few minutes.",
  color: "cyan",
});

const tinkerPurple = chalk.rgb(99, 102, 241);

const cloudFormation = new CloudFormation();
//placeholder til we see what the tinker CL interaction looks like
const stackParams = { StackName: "TinkerAdminStack" };

const getAllProjects = async () => {
  try {
    const response = await axios.get(
      `https://admin.${process.env.DOMAIN_NAME}:3000/projects`
    );
    return response.map((project) => project.name);
  } catch (error) {
    console.error("Could not retrieve all projects.");
  }
}; ///returns array of stackNames

const deleteAllProjects = async (cloudFormation) => {
  try {
    const activeProjects = await getAllProjects();
    await Promise.all(
      activeProjects.map((project) => deleteProject(cloudFormation, project))
    );
  } catch (error) {
    console.error("Error: Could not delete all projects: ", error);
  }
};

async function promisifyDeleteStack(cloudFormation, stackParams) {
  return new Promise((res, rej) => {
    cloudFormation.deleteStack(stackParams, (error, data) => {
      if (error) {
        rej(error);
      }
      res(error);
    });
  });
}

async function deleteProject(cloudFormation, stackName) {
  try {
    const stackParams = { StackName: stackName };
    await promisifyDeleteStack(cloudFormation, stackParams);
  } catch (error) {
    console.error(chalk.red(`Error deleting project: ${stackName}`));
    process.exit(1);
  }
}

async function deleteStack(cloudFormation, stackParams, spinner) {
  try {
    spinner.start();
    await promisifyDeleteStack(cloudFormation, stackParams);
  } catch (error) {
    spinner.fail("Failed!");
    console.error(chalk.red("Error Deleting Tinker-Admin"));
    process.exit(1);
  }
}

const waitStack = async (cloudFormation, stackName, spinner) => {
  const waiterParams = {
    client: cloudFormation,
    maxWaitTime: 900,
  };

  const describeStacksCommandInput = {
    StackName: stackName,
  };

  try {
    await waitUntilStackDeleteComplete(
      waiterParams,
      describeStacksCommandInput
    );

    spinner.succeed(tinkerPurple("Tinker-Admin has been deleted."));
  } catch (error) {
    spinner.fail("Failed.");

    console.error(
      chalk.red("Tinker-Admin could not be deleted due to Error: "),
      error
    );
    process.exit(1);
  }
};

await deleteAllProjects(cloudFormation);
await deleteStack(cloudFormation, stackParams, spinner);
await waitStack(cloudFormation, stackParams, spinner);
