const {
  TextractClient,
  AnalyzeDocumentCommand,
} = require("@aws-sdk/client-textract");
const config = require("./config");

class OcrService {
  constructor() {
    this.client = new TextractClient({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async detectText(image) {
    const params = {
      Document: {
        Bytes: image,
      },
    };

    try {
      const input = new AnalyzeDocumentCommand({
        FeatureTypes: ["TABLES", "FORMS", "SIGNATURES", "LAYOUT", "QUERIES"],
        ...params,
      });

      return this.client.send(input);
    } catch (err) {
      console.error(err);
    }
  }
}

module.exports = {
  OcrService,
};
