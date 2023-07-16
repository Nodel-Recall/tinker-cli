import chalk from "chalk";
import ora from "ora";
import input from "@inquirer/input";
import select from "@inquirer/select";
import confirm from "@inquirer/confirm";

export const tinkerPurple = chalk.rgb(99, 102, 241);
export const tinkerGreen = chalk.green;

const spinnerColor = "cyan";

const regions = [
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "af-south-1",
  "ap-east-1",
  "ap-south-1",
  "ap-northeast-2",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ca-central-1",
  "eu-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-north-1",
  "me-south-1",
  "sa-east-1",
];

const instanceTypes = [
  "t1.micro",
  "t2.nano",
  "t2.micro",
  "t2.small",
  "t2.medium",
  "t2.large",
  "m1.small",
  "m1.medium",
  "m1.large",
  "m1.xlarge",
  "m2.xlarge",
  "m2.2xlarge",
  "m2.4xlarge",
  "m3.medium",
  "m3.large",
  "m3.xlarge",
  "m3.2xlarge",
  "m4.large",
  "m4.xlarge",
  "m4.2xlarge",
  "m4.4xlarge",
  "m4.10xlarge",
  "c1.medium",
  "c1.xlarge",
  "c3.large",
  "c3.xlarge",
  "c3.2xlarge",
  "c3.4xlarge",
  "c3.8xlarge",
  "c4.large",
  "c4.xlarge",
  "c4.2xlarge",
  "c4.4xlarge",
  "c4.8xlarge",
  "g2.2xlarge",
  "g2.8xlarge",
  "r3.large",
  "r3.xlarge",
  "r3.2xlarge",
  "r3.4xlarge",
  "r3.8xlarge",
  "i2.xlarge",
  "i2.2xlarge",
  "i2.4xlarge",
  "i2.8xlarge",
  "d2.xlarge",
  "d2.2xlarge",
  "d2.4xlarge",
  "d2.8xlarge",
  "hi1.4xlarge",
  "hs1.8xlarge",
  "cr1.8xlarge",
  "cc2.8xlarge",
  "cg1.4xlarge",
];

export const log = (msg) => {
  console.log(tinkerPurple(msg));
};

export const err = (msg) => {
  console.error(chalk.red(msg));
};

export const createSpinner = (text) => {
  return ora({
    text,
    color: spinnerColor,
  });
};

const projectDetailsValidator = (input) => {
  if (!input.match(/^[a-zA-Z][a-zA-Z0-9-]+$/g)) {
    return "Only letters, numbers and hyphens. Must start with a letter or number.";
  }

  return true;
};

export const getProjectDetails = async () => {
  const answer = await input({
    message: "What's the project name?",
    validate: projectDetailsValidator,
  });

  return answer;
};

export const getRegion = async () => {
  const answer = await select({
    message: "In which AWS region do you want to deploy?",
    choices: regions.map((r) => {
      return { value: r };
    }),
  });

  return answer;
};

const domainValidator = (domain) => {
  if (!domain.match(/^(?!:\/\/)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/)) {
    return "Invalid domain.";
  }

  return true;
};

export const getDomain = async () => {
  const answer = await input({
    message: "Which domain in Route 53 would you like to use?",
    validate: domainValidator,
  });

  return answer;
};

export const getHostedZoneId = async () => {
  const answer = await input({
    message: "What's the domain's hosted zone ID?",
  });

  return answer;
};

export const confirmInput = async (message) => {
  const answer = await confirm({ message });

  return answer;
};
export const getInstanceType = async () => {
  const answer = await select({
    message: "What instance type to use? t2.micro is recommended to stay within AWS's free tier.",
    choices: instanceTypes.map((i) => {
      return { value: i };
    }),
  });

  return answer;
};
