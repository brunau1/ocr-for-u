const fs = require("fs");
const Path = require("path");

function readTextualData() {
  // le os arquivos json da pasta public
  const folder = "../public";
  const path = Path.resolve(__dirname, folder);

  const files = fs.readdirSync(Path.resolve(__dirname, path));

  let data = [];
  files.forEach((file) => {
    if (file.includes(".json")) {
      const content = fs.readFileSync(`${path}/${file}`, "utf-8");

      data.push(JSON.parse(content));
    }
  });

  data = data.map((file) => {
    return file
      .map((block) => block.Text)
      .filter((text) => !!text && text.length > 5)
      .map((text) => sanitizeText(text));
  });

  fs.writeFileSync(`${path}/textual-data.json`, JSON.stringify(data, null, 2));

  console.log("Textual data saved successfully!");

  console.log("Dados para pegar os nomes:", data[2]);

  const names = extractNames(data[2]);
  console.log("Nomes encontrados:", names);

  const dates = extractDates(data[2]);
  console.log("Datas encontradas:", dates);

  const cpfs = extractDocuments(data[2]);
  console.log("CPFs encontrados:", cpfs);

  const hasLabel = data[2].some((text) => /(validad)/gi.test(text));
  const isExpired = isDocumentExpired(dates, hasLabel);

  console.log("Documento expirado:", isExpired);
}

function sanitizeText(texto) {
  // Remover símbolos e caracteres especiais, exceto - e /
  texto = texto.replace(/[^\w\s\/-]/gi, "").trim();
  return texto;
}

function extractNames(texts = []) {
  const commonWords =
    /(diretor|carteira|estadual|republica|assinatura|assinado|digital|ministro|data|federativa|secretaria|transporte|transito|ministerio|filiacao|nacionalidade|habilitacao|registro|emissor|local)/i;

  const nameExp =
    /\b[A-ZÁ-Ú][a-zá-ú]+\s?(?:(?:de|do|da|dos|das|e)\s)?[A-ZÁ-Ú][a-zá-ú]+(?:\s[A-ZÁ-Ú][a-zá-ú]+)+\b/gi;

  const names = [];
  texts.forEach((text) => {
    if (
      text.match(nameExp) &&
      /[0-9]/g.test(text) === false &&
      !commonWords.test(text)
    ) {
      names.push(text);
    }
  });

  return names;
}

function extractDates(texts = []) {
  // Regex para capturar datas no formato dd/mm/yyyy ou dd-mm-yyyy
  const dates = [];
  const datesExp = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g;

  texts.forEach((text) => {
    if (text.match(datesExp)) {
      dates.push(text);
    }
  });

  return dates;
}

function isDocumentExpired(datas = [], hasExpirationLabel) {
  if (!hasExpirationLabel) {
    return false;
  }

  const today = new Date();
  const actualYear = today.getFullYear();

  let expiration = null;
  let sameYearDate = null;

  datas.forEach((data) => {
    const [_, __, year] = data.split(/[\/-]/);

    if (parseInt(year) > parseInt(actualYear)) {
      expiration = data;
    }

    if (parseInt(year) === parseInt(actualYear)) {
      sameYearDate = data;
    }
  });

  if (!expiration && !sameYearDate) {
    return true;
  }

  return false;
}
function extractDocuments(texts = []) {
  // Regex para capturar CPF em qualquer formato
  const cpfs = [];
  const regexCPF = /([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2})/g;

  texts.forEach((text) => {
    if (text.match(regexCPF)) {
      cpfs.push(text);
    }
  });

  // formata os cpfs encontrados
  return cpfs.map((cpf) => {
    return cpf.replace(/[^\d]/g, "");
  });
}

function wordCount(text) {
  // Remover símbolos e caracteres especiais
  let cleanedText = text.replace(/[^\w\s]/gi, "").toLowerCase();

  // Dividir o texto em palavras
  const words = cleanedText.split(/\s+/);

  // Contar a frequência de cada palavra
  const wordCount = {};
  words.forEach((word) => {
    if (word in wordCount) {
      wordCount[word]++;
    } else {
      wordCount[word] = 1;
    }
  });

  // Ordenar as palavras pela frequência
  let commonWords = Object.entries(wordCount).sort((a, b) => b[1] - a[1]);

  console.log("Palavras mais comuns:", commonWords);
}

readTextualData();
