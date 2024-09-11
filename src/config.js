const credentials = {
  region: "AWS_REGION",
  accessKeyId: "AWS_ACCESS_KEY_ID",
  secretKey: "AWS_SECRET_ACCESS_KEY",
};

module.exports = {
  region: process.env[credentials.region],
  accessKeyId: process.env[credentials.accessKeyId],
  secretAccessKey: process.env[credentials.secretKey],
};
