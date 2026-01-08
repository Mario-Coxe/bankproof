import { extractTextFromPdf } from "./services/pdf";
import { extractTextWithOcr } from "./services/ocr";
import { extractDataFromText } from "./utils/parse";
import { isPdfBuffer, toBuffer } from "./utils/file";
import {
  ExtractAndValidateOptions,
  Provider,
  ValidateInput,
  ValidationResult
} from "./types";

export class BankProof {
  static async validate(input: ValidateInput, provider: Provider, options?: ExtractAndValidateOptions): Promise<ValidationResult> {
    if (!input?.chave || !input?.pin) {
      return {
        status: "INVALID",
        provider: provider.name,
        message: "MISSING_DATA"
      };
    }

    return provider.validate(input.chave, input.pin, options);
  }

  static async extractAndValidate(
    file: Buffer | ArrayBuffer | Uint8Array,
    provider: Provider,
    options?: ExtractAndValidateOptions
  ): Promise<ValidationResult> {
    const buffer = toBuffer(file);

    let text = "";
    const pdfFile = isPdfBuffer(buffer);

    if (pdfFile) {
      text = await extractTextFromPdf(buffer);
      if (!text.trim()) {
        text = await extractTextWithOcr(buffer, options?.language);
      }
    } else {
      text = await extractTextWithOcr(buffer, options?.language);
    }

    const extracted = extractDataFromText(text, provider.patterns);

    if (!extracted.chave || !extracted.pin) {
      return {
        status: "INVALID",
        provider: provider.name,
        message: "MISSING_DATA"
      };
    }

    return provider.validate(extracted.chave, extracted.pin, options);
  }
}

export * from "./providers";
export * from "./types";
