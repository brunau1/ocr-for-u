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
        sessionToken: config.sessionToken,
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
      const input = new AnalyzeDocumentCommand(
        {
          FeatureTypes: ["LAYOUT"],
          ...params,
        }
      );

      return this.client.send(input);
    } catch (err) {
      console.error(err);
    }
  }

  containsPersonalData(textBlocks = []) {
    const labelExp = /(cpf|cnpj|rg|nome|endereço|telefone|email)/i;
    const uppercaseLabelExp = /(CPF|CNPJ|RG|NOME|ENDEREÇO|TELEFONE|EMAIL)/;

    const containsSomeExpectedLabel = textBlocks.some((block) => {
      const { Text } = block;

      return labelExp.test(Text) || uppercaseLabelExp.test(Text);
    });

    const cpfExp =
      /([0-9]{2}[\.]?[0-9]{3}[\.]?[0-9]{3}[\/]?[0-9]{4}[-]?[0-9]{2})|([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2})/g;

    const containsCpf = textBlocks.some((block) => cpfExp.test(block.Text));

    return containsSomeExpectedLabel && containsCpf;
  }
}

module.exports = {
  OcrService,
};
