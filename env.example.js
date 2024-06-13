const fs = require("fs");

const path = "./env.json";

const MongoUri = "";
const functions = {
  Niche: {
    CreateNicheFunction: "CreateNicheFunction",
    GetNicheFunction: "GetNicheFunction",
  },
  NicheApifyDatasetStatus: {
    CreateNicheApifyDatasetStatusFunction:
      "CreateNicheApifyDatasetStatusFunction",
  },
  TempPost: {
    CreateRawPostsFunction: "CreateRawPostsFunction",
  },
};

const envMapping = {
  Niche: { MongoUri: MongoUri },
  NicheApifyDatasetStatus: { MongoUri: MongoUri },
  TempPost: { MongoUri: MongoUri },
};

const createEnvVars = () => {
  const result = {};
  Object.keys(functions).forEach((key) => {
    Object.keys(functions[key]).forEach((functionKey) => {
      const envObject = {};
      Object.keys(envMapping).forEach((envvar) => {
        envObject[envvar] = envMapping[envvar];
      });
      result[functionKey] = envMapping[key];
    });
  });

  fs.writeFileSync(path, JSON.stringify(result, null, 2));
};

createEnvVars();
