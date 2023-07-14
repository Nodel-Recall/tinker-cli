import {
  EC2Client,
  CreateKeyPairCommand,
  DescribeKeyPairsCommand,
} from "@aws-sdk/client-ec2";

export const createKeys = async (region) => {
  const client = new EC2Client({ region });
  try {
    const keysExist = await doTinkerKeysExist(client);
    if (!keysExist) {
      const command = new CreateKeyPairCommand({ KeyName: "tinker_keys" });
      const response = await client.send(command);
      // console.log(response.KeyMaterial); //still working out what to do with the secret access key
    }
  } catch (error) {
    console.error("Error: EC2 Keys could not be created");
  }
};

const doTinkerKeysExist = async (client) => {
  try {
    const command = new DescribeKeyPairsCommand({}); ///Didn't filter specifically for tinker_keys because if it isn't found, it raises an error
    const response = await client.send(command);
    for (let key of response.KeyPairs) {
      if (key.KeyName === "tinker_keys") {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error("Error: Could not describe active EC2 keys in this region.");
  }
};
