const { CloudFormation } = require("@aws-sdk/client-cloudformation");
const fs = require("fs");
const readline = require('readline');

const templatePath = "./tinker_admin_template.json";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// TODO: Change to promises instead of callbacks?

rl.question("Enter the region: ", (region) => {
  const cloudformation = new CloudFormation({ region });

  fs.readFile(templatePath, "utf8", (err, template) => {
    if (err) {
      console.error("Error reading template file:", err);
      rl.close();
      process.exit(1);
    }

    const stackParams = {
      StackName: "TinkerAdminStack",
      TemplateBody: template,
    };

    cloudformation.createStack(stackParams, (err, data) => {
      if (err) {
        console.error("Error creating stack:", err);
        process.exit(1);
      } else {
        console.log("Stack creation initiated:", data.StackId);
        process.exit(0);
      }
    });
  });
});
