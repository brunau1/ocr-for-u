const credentials = {
  region: "AWS_REGION",
  accessKeyId: "AWS_ACCESS_KEY_ID",
  secretKey: "AWS_SECRET_ACCESS_KEY",
  sessionToken: "AWS_SESSION_TOKEN",
};

module.exports = {
  region: process.env[credentials.region],
  accessKeyId: process.env[credentials.accessKeyId],
  secretAccessKey: process.env[credentials.secretKey],
  sessionToken: process.env[credentials.sessionToken],
};
