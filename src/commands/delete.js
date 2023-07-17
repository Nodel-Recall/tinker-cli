import "dotenv/config";

import { generateJWT } from "../utils/jwtHelpers.js";

import {
  createCloudFormationClient,
  deleteStack,
  waitStackDeleteComplete,
  maxWaitProjectStackTime,
} from "../utils/awsHelpers.js";

import { deleteProjectAdminTable } from "../utils/services.js";
import { log, err, createSpinner, getProjectDetails } from "../utils/ui.js";

const spinner = createSpinner(
  "Tearing down in AWS... This may take up to 15 minutes!"
);

const deleteProject = async ({ name }) => {
  try {
    let StackName;
    if (!name) {
      StackName = await getProjectDetails();
    } else {
      StackName = name;
    }

    const stackParams = { StackName };
    const cloudFormation = createCloudFormationClient(process.env.REGION);
    const jwt = await generateJWT(process.env.SECRET);

    spinner.start();

    await deleteStack(cloudFormation, stackParams, process.env.DOMAIN);
    await deleteProjectAdminTable(jwt, StackName, process.env.DOMAIN);
    await waitStackDeleteComplete(
      cloudFormation,
      StackName,
      maxWaitProjectStackTime
    );

    spinner.succeed("Deletion complete!");
    log("");
    log("Project deleted successfully!");

    process.exit(0);
  } catch (error) {
    spinner.fail("Deletion failed!");
    err(error);

    process.exit(1);
  }
};

export default deleteProject;
