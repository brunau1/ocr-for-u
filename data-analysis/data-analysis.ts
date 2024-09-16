import { Injectable } from "@nestjs/common";

import { AnalyzeDocumentResponse } from "@aws-sdk/client-textract";
import * as levenshtein from "fast-levenshtein";

import { EssentialDataAnalysisDto } from "../dto/essential-data-analysis.dto";
@Injectable()
export class OcrDataAnalysisService {
  private sanitizeText(text: string) {
    text = text.replace(/[^\w\s\/-]/gi, "").trim();
    return text;
  }

  private compareStrings(str1, str2) {
    const distance = levenshtein.get(str1, str2);
    return distance;
  }

  private normalizeCpf(cpf) {
    return cpf.replace(/[^\d]/g, "");
  }

  private getMostSimilarText(
    reference,
    strings = []
  ): { distance: number; text: string } {
    const mostSimilar = {
      distance: Infinity,
      text: "",
    };

    reference = reference.toLowerCase();
    strings = strings.map((str) => str.toLowerCase());

    strings.forEach((str) => {
      const distance = this.compareStrings(reference, str);

      if (distance < mostSimilar.distance) {
        mostSimilar.distance = distance;
        mostSimilar.text = str;
      }
    });

    return mostSimilar;
  }

  private hasBirthDate(reference, dates = []) {
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

  private hasPersonDocument(reference, possibleDocuments = []) {
    reference = this.normalizeCpf(reference);

    const documentWasFound = possibleDocuments.some(
      (document) => this.normalizeCpf(document) === reference
    );

    return documentWasFound;
  }

  private extractNames(texts: string[]) {
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

  private extractDates(texts: string[]) {
    const dates = [];
    const datesExp = /\b\d{1,2}[\/-]\d{1,2}[\/-]\d{4}\b/g;

    texts.forEach((text) => {
      if (text.match(datesExp) && /[a-z]/gi.test(text) === false) {
        dates.push(text);
      }
    });

    return dates;
  }

  private isDocumentExpired(dates: string[], isCnh: boolean): boolean {
    if (!isCnh) {
      return false;
    }

    const today = new Date();
    const actualYear = today.getFullYear();

    let expiration = null;
    let sameYearDate = null;

    dates.forEach((data) => {
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

  private extractPersonDocuments(texts = []) {
    const cpfs = [];
    const regexCPF = /([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2})/g;

    texts.forEach((text) => {
      if (text.match(regexCPF)) {
        cpfs.push(text);
      }
    });

    return cpfs.map((cpf) => this.normalizeCpf(cpf));
  }

  private extractRelevantDataFromRawTexts(texts: string[]): {
    names: string[];
    dates: string[];
    cpfs: string[];
  } {
    const names = this.extractNames(texts);
    const dates = this.extractDates(texts);
    const cpfs = this.extractPersonDocuments(texts);

    return {
      names,
      dates,
      cpfs,
    };
  }

  private hasEssentialData(texts: string[], documentType: string): boolean {
    const essentialData = [
      /(cpf|([0-9]{3}[\.]?[0-9]{3}[\.]?[0-9]{3}[-]?[0-9]{2}))/g,
      /(data nasciment|data de nasciment|nasciment)/gi,
    ];

    if (documentType === "CNH") {
      essentialData.push(/(validad)/gi);
    }

    const hasAllEssentialData = essentialData.every((pattern) =>
      texts.some((text) => pattern.test(text))
    );

    return hasAllEssentialData;
  }

  getDocumentType(texts: string[]): string {
    let documentType = null;

    const possibleDocumentPatterns = {
      CNH: (text) => /(habilitacao|habilitação|habilitao)/gi.test(text),
      RG: (text) => /(carteira de identidad)/gi.test(text),
    };

    documentType = Object.keys(possibleDocumentPatterns).find((type) =>
      texts.some((text) => possibleDocumentPatterns[type](text))
    );

    return documentType;
  }

  getTextFromReceivedOcrData(
    ocrData: AnalyzeDocumentResponse["Blocks"]
  ): string[] {
    return ocrData
      .map((block) => block.Text)
      .filter((text) => !!text && text.length > 2)
      .map((text) => this.sanitizeText(text));
  }

  isAllEssentialDataValid(essentialData: EssentialDataAnalysisDto): boolean {
    const { texts, documentType } = essentialData;
    const hasAllEssentialData = this.hasEssentialData(texts, documentType);

    if (!hasAllEssentialData) {
      return false;
    }

    const { names, dates, cpfs } = this.extractRelevantDataFromRawTexts(
      texts.filter((text) => text.length > 5)
    );

    const isInvalid = this.isDocumentExpired(dates, documentType === "CNH");
    const hasValidName =
      this.getMostSimilarText(essentialData.complianceInfo.name, names)
        .distance <= 3;
    const hasValidBirthDate = this.hasBirthDate(
      essentialData.complianceInfo.birthdate,
      dates
    );
    const hasValidDocument = this.hasPersonDocument(
      essentialData.complianceInfo.document,
      cpfs
    );

    const checkResults = [hasValidName, hasValidBirthDate, hasValidDocument];

    return checkResults.every((result) => result === true) && !isInvalid;
  }
}
