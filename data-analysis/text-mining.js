const fs = require("fs");
const Path = require("path");
const levenshtein = require("fast-levenshtein");

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

  analyseData(data[1]);
}

function compareStrings(str1, str2) {
  const distance = levenshtein.get(str1, str2);
  return distance;
}

function getMostSimilarText(reference, strings = []) {
  const mostSimilar = {
    distance: Infinity,
    text: "",
  };

  reference = reference.toLowerCase();
  strings = strings.map((str) => str.toLowerCase());

  strings.forEach((str) => {
    const distance = compareStrings(reference, str);

    if (distance < mostSimilar.distance) {
      mostSimilar.distance = distance;
      mostSimilar.text = str;
    }
  });

  return mostSimilar;
}

function checkIfHasBirthDate(reference, dates = []) {
  const refDate = new Date(reference);

  if (isNaN(refDate.getTime())) {
    return false;
  }

  const birthDateWasFound = dates.some((date) => {
    const dateSplit = date.split(/[\/-]/);
    const formattedDate = `${dateSplit[2]}-${
      dateSplit[1].length > 1 ? dateSplit[1] : `0${dateSplit[1]}`
    }-${
      dateSplit[0].length > 1 ? dateSplit[0] : `0${dateSplit[0]}`
    }T00:00:00.000+00:00`;

    const currDate = new Date(formattedDate);
    return currDate.getTime() === refDate.getTime();
  });

  return birthDateWasFound;
}

function wasDocumentFound(reference, possibleDocuments = []) {
  reference = normalizeCpf(reference);

  const documentWasFound = possibleDocuments.some(
    (document) => normalizeCpf(document) === reference
  );

  return documentWasFound;
}

function extractRelevantData(data) {
  //   console.log("Dados para análise:", data);

  const names = extractNames(data);
  console.log("Nomes encontrados:", names);

  const dates = extractDates(data);
  console.log("Datas encontradas:", dates);

  const cpfs = extractDocuments(data);
  console.log("CPFs encontrados:", cpfs);

  const hasExpirationLabel = data.some((text) => /(validad)/gi.test(text));

  return {
    names,
    dates,
    cpfs,
    hasExpirationLabel,
  };
}

function normalizeCpf(cpf) {
  return cpf.replace(/[^\d]/g, "");
}

function getDocumentType(texts = []) {
  const possibleDocumentPatterns = {
    CNH: (text) => /(habilitacao|habilitação|habilitao)/gi.test(text),
    RG: (text) => /(carteira de identidad)/gi.test(text),
  };

  const documentType = Object.keys(possibleDocumentPatterns).find((type) =>
    texts.some((text) => possibleDocumentPatterns[type](text))
  );

  return documentType;
}

function hasEssentialData(texts = [], docType) {
  const essentialData = [
    /(cpf|([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2}))/g,
    /(data nasciment|data de nasciment|nascimento)/gi,
  ];

  if (docType === "CNH") {
    essentialData.push(/(validad)/gi);
  }

  const hasAllEssentialData = essentialData.every((pattern) =>
    texts.some((text) => text.match(pattern))
  );

  console.log("Dados essenciais encontrados?", hasAllEssentialData);

  return hasAllEssentialData;
}

function analyseData(data) {
  const dataToValidate = {
    names: ["João da Silva", "Maria de Souza", "giulia de paula lage"],
    dates: [
      "01/01/2022",
      "01/01/2023",
      new Date("1995-01-24T00:00:00.000+00:00"),
    ],
    cpfs: ["12345678901", "123.456.789-01", "10724283692"],
  };

  const { names, dates, cpfs, hasExpirationLabel } = extractRelevantData(data);
  const isExpired = isDocumentExpired(dates, hasExpirationLabel);
  const documentType = getDocumentType(data);
  const hasEssential = hasEssentialData(data, documentType);

  console.log("Tipo de documento:", documentType);
  console.log("Possui label de validade:", hasExpirationLabel ? "Sim" : "Não");
  console.log("Documento expirado:", isExpired ? "Sim" : "Não");
  console.log("Possui dados essenciais:", hasEssential ? "Sim" : "Não");

  const currName = dataToValidate.names[2];
  // valid name -> distance <= 3
  const mostSimilarName = getMostSimilarText(currName, names);
  //   console.log(
  //     `Nome mais similar com ${currName}: ${mostSimilarName.text} - Distância: ${mostSimilarName.distance}`
  //   );

  console.log(
    "o nome é válido?",
    mostSimilarName.distance <= 3 ? "Sim" : "Não"
  );

  const currDate = dataToValidate.dates[2];

  const hasBirthDate = checkIfHasBirthDate(currDate, dates);

  console.log("Data de nascimento encontrada?", hasBirthDate ? "Sim" : "Não");

  const currCpf = dataToValidate.cpfs[2];

  const documentFound = wasDocumentFound(currCpf, cpfs);

  console.log("CPF encontrado?", documentFound ? "Sim" : "Não");

  console.log("dados comaparados com os dados de validação", {
    currName,
    currDate,
    currCpf,
  });

  const checkResults = [
    mostSimilarName.distance <= 3,
    hasBirthDate,
    documentFound,
  ];

  const conclusion = checkResults.every((result) => result === true) && !isExpired;

  console.log("Conclusão:", conclusion ? "Documento válido" : "Documento inválido");
}

function sanitizeText(text) {
  // Remover símbolos e caracteres especiais, exceto - e /
  text = text.replace(/[^\w\s\/-]/gi, "").trim();
  return text;
}

function extractNames(texts = []) {
  const commonWords =
    /(diretor|carteira|stadual|republic|ssinatur|ssinad|digital|ministr|data|federativ|secretaria|transport|transit|ministerio|filiacao|nacionalidad|habilitacao|registr|emiss|local)/i;

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
    if (text.match(datesExp) && /[a-z]/gi.test(text) === false) {
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

    if (parseInt(year) > actualYear) {
      expiration = data;
    }

    if (parseInt(year) === actualYear) {
      sameYearDate = data;
    }
  });

  if (!expiration && !sameYearDate) {
    return true;
  }

  return false;
}
function extractDocuments(texts = []) {
  // Regex para capturar CPF em qualquer formato válido
  const cpfs = [];
  const regexCPF = /([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2})/g;

  texts.forEach((text) => {
    if (text.match(regexCPF)) {
      cpfs.push(text);
    }
  });

  // formata os cpfs encontrados
  return cpfs.map((cpf) => normalizeCpf(cpf));
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
