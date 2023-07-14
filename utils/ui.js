import chalk from "chalk";

export const tinkerPurple = chalk.rgb(99, 102, 241);
export const tinkerGreen = chalk.green;

export const log = (msg) => {
  console.log(tinkerPurple(msg));
};

export const err = (msg) => {
  console.error(chalk.red(msg));
};
