import "dotenv/config";

import { generateJWT } from "../utils/jwtHelpers.js";
import { getProjectName } from "../utils/getProjectName.js";

import {
  createCloudFormationClient,
  deleteStack,
  waitStackDeleteComplete,
  maxWaitProjectStackTime,
} from "../utils/awsHelpers.js";

import { deleteProjectAdminTable } from "../utils/services.js";
import { log, err, createSpinner } from "../utils/ui.js";

const spinner = createSpinner(
  "Deleting project...This could take a few minutes."
);

try {
  const StackName = await getProjectName();
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
