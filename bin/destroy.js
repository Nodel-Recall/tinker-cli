import {
  CloudFormationClient,
  DescribeStacksCommand,
  DeleteStackCommand,
  waitUntilStackDeleteComplete,
} from "@aws-sdk/client-cloudformation";
import chalk from "chalk";
import ora from "ora";
import axios from "axios";
import "dotenv/config";

import { generateJWT } from "../utils/generateJWT.js";

const spinner = ora({
  text: "Tearing down Tinker... this may take a few minutes",
  color: "cyan",
}).start();

const tinkerPurple = chalk.rgb(99, 102, 241);

const cloudFormation = new CloudFormationClient();
const stackParams = { StackName: "TinkerAdminStack" };

const getStackOutputs = async (cloudFormation, stackParams) => {
  try {
    const command = new DescribeStacksCommand(stackParams);
    const response = await cloudFormation.send(command);
    const outputs = response.Stacks[0].Outputs;
    return outputs;
  } catch (error) {
    console.log("Error retrieving stack outputs");
    process.exit(1);
  }
};

const getAdminDomain = (stackOutputs) => {
  return stackOutputs.find((o) => o.OutputKey === "TinkerAdminDomain")
    .OutputValue;
};

const getAllProjects = async (adminDomain, jwt) => {
  try {
    const response = await axios.get(`https://${adminDomain}:3000/projects`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    return response.data.map((project) => project.name);
  } catch (error) {
    console.error(chalk.red("Could not retrieve all projects."));
    process.exit(1);
  }
};

const deleteAllProjects = async (jwt, cloudFormation, adminDomain, spinner) => {
  try {
    const activeProjects = await getAllProjects(adminDomain, jwt);
    const deleteProjectPromises = activeProjects.map((project) =>
      deleteProject(cloudFormation, project, spinner)
    );
    await Promise.all(deleteProjectPromises);

    const waitProjectDeletionPromises = activeProjects.map((project) => {
      return waitStack(cloudFormation, project, spinner);
    });

    await Promise.all(waitProjectDeletionPromises);
  } catch (error) {
    console.error("Error: Could not delete all projects: ", error);
  }
};

const deleteProject = async (cloudFormation, StackName, spinner) => {
  try {
    spinner.text = `Deleting ${StackName}`;
    const stackParams = { StackName: StackName };
    await cloudFormation.send(new DeleteStackCommand(stackParams));
  } catch (error) {
    console.error(chalk.red(`Error deleting project: ${StackName}`));
    process.exit(1);
  }
};

const deleteStack = async (cloudFormation, stackParams, spinner) => {
  try {
    spinner.text = `Deleting ${stackParams.StackName}`;
    console.log("Deleting TinkerAdmin project");
    await cloudFormation.send(new DeleteStackCommand(stackParams));
  } catch (error) {
    spinner.fail("Failed!");
    console.error(chalk.red("Error Deleting Tinker-Admin"), error);
    process.exit(1);
  }
};

const waitStack = async (cloudFormation, StackName, spinner) => {
  try {
    const waiterParams = {
      client: cloudFormation,
      maxWaitTime: 900,
    };

    const describeStacksCommandInput = {
      StackName: StackName,
    };

    spinner.text = `Waiting for ${StackName} to complete deletion`;
    await waitUntilStackDeleteComplete(
      waiterParams,
      describeStacksCommandInput
    );
  } catch (error) {
    spinner.fail("Failed.");

    console.error(chalk.red("Project could not be deleted."), error);
    process.exit(1);
  }
};

const destroyTinker = async (
  jwt,
  cloudFormation,
  stackParams,
  adminDomain,
  spinner
) => {
  try {
    await deleteAllProjects(jwt, cloudFormation, adminDomain, spinner);
    await deleteStack(cloudFormation, stackParams, spinner);
    await waitStack(cloudFormation, stackParams.StackName, spinner);
    spinner.succeed(tinkerPurple("Tinker has been deleted."));
  } catch (error) {
    console.error(chalk.red("Error: Could not destroy Tinker."));
    process.exit(1);
  }
};

const stackOutputs = await getStackOutputs(cloudFormation, stackParams);
const adminDomain = getAdminDomain(stackOutputs);

const jwt = await generateJWT(process.env.SECRET);

await destroyTinker(jwt, cloudFormation, stackParams, adminDomain, spinner);
