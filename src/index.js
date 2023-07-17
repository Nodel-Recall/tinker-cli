#! /usr/bin/env node

import Yargs from "yargs";

import deploy from "./commands/deploy.js";
import create from "./commands/create.js";
import deleteProject from "./commands/delete.js";
import destroy from "./commands/destroy.js";

const deployOptions = (yargs) => {
  return yargs
    .option("r", {
      alias: "region",
      describe: "AWS region",
      type: "string",
    })
    .option("d", {
      alias: "domain",
      describe: "Domain in AWS Route 53",
      type: "string",
    })
    .option("z", {
      alias: "zone",
      describe: "Domain's hosting zone ID",
      type: "string",
    });
};

const createOptions = (yargs) => {
  return yargs
    .option("n", {
      alias: "name",
      describe: "Project name",
      type: "string",
    })
    .option("i", {
      alias: "instance",
      describe: "Instance type",
      type: "string",
    });
};

const deleteOptions = (yargs) => {
  return yargs.option("n", {
    alias: "name",
    describe: "Project name",
    type: "string",
  });
};

const destroyOptions = (yargs) => {
  return yargs.option("f", {
    alias: "force",
    describe: "Teardown tinker without confirmation",
    type: "boolean",
    default: false,
  });
};

Yargs(process.argv.slice(2))
  .usage("Usage: $0 <command> [options]")
  .command("deploy", "Deploy admin portal to AWS", deployOptions, deploy)
  .example(
    "$0 deploy -r us-east-1 -d trytinker.com -z ABC123",
    "Deploy admin portal and subsequence projects to region us-east-1 with domain trytinker.com and hosting zone ID abc123"
  )
  .command("create", "Create a project backend in AWS", createOptions, create)
  .example("$0 create -n todos", "Create a backend for todos project")
  .command(
    "delete",
    "Delete a project backend in AWS",
    deleteOptions,
    deleteProject
  )
  .example("$0 delete -n todos", "Delete the todos project backend")
  .command(
    "destroy",
    "Teardown all projects and admin portal from AWS",
    destroyOptions,
    destroy
  )
  .example(
    "$0 destroy -f",
    "Teardown all projects and admin portal without confirmation"
  )
  .demandCommand(1, "Please specify a command.")
  .strict()
  .help("h")
  .alias("h", "help")
  .fail((msg, err, yargs) => {
    if (err) throw err;
    console.error(`Error: ${msg}`);
    console.error(yargs.help());
    process.exit(1);
  }).argv;
