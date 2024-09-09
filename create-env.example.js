const fs = require("fs");

const devPath = "./dev.env.json";
const prodPath = "./prod.env.json";

const envs = {
  dev: {
    InvincibleUrl: "",
    KairosQueueUrl: "",
    SQSExecutionRoleArn: "",
  },
  prod: {
    InvincibleUrl: "",
    KairosQueueUrl: "",
    SQSExecutionRoleArn: "",
  },
};

const functionEnvMapping = {
  AssignPagesToRawPostsFunction: [
    "InvincibleUrl",
    "KairosQueueUrl",
    "SQSExecutionRoleArn",
  ],
};

const createEnvFile = (env, path) => {
  const envVars = {};

  Object.keys(functionEnvMapping).forEach((functionName) => {
    envVars[functionName] = {};
    functionEnvMapping[functionName].forEach((envVar) => {
      envVars[functionName][envVar] = env[envVar];
    });
  });

  fs.writeFileSync(path, JSON.stringify(envVars, null, 2));
};

createEnvFile(envs.dev, devPath);
createEnvFile(envs.prod, prodPath);

console.log("Environment files created successfully.");
