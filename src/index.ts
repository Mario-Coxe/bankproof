import { extractTextFromPdf } from "./services/pdf";
import { extractTextWithOcr } from "./services/ocr";
import { extractDataFromText } from "./utils/parse";
import { isPdfBuffer, toBuffer } from "./utils/file";
import { resolveLogger } from "./logger";
import {
  ExtractAndValidateOptions,
  Provider,
  ValidateInput,
  ValidationResult
} from "./types";

export class BankProof {
  private static mask(value: string): string {
    if (value.length <= 4) return "***";
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  static async validate(input: ValidateInput, provider: Provider, options?: ExtractAndValidateOptions): Promise<ValidationResult> {
    const logger = resolveLogger(options?.logger);
    if (!input?.chave || !input?.pin) {
      logger.warn("MISSING_DATA", { provider: provider.name });
      return {
        status: "INVALID",
        provider: provider.name,
        message: "MISSING_DATA"
      };
    }

    return provider.validate(input.chave, input.pin, { ...options, logger });
  }

  static async extractAndValidate(
    file: Buffer | ArrayBuffer | Uint8Array,
    provider: Provider,
    options?: ExtractAndValidateOptions
  ): Promise<ValidationResult> {
    const logger = resolveLogger(options?.logger);
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
      logger.warn("MISSING_DATA", { provider: provider.name, source: pdfFile ? "pdf" : "ocr" });
      return {
        status: "INVALID",
        provider: provider.name,
        message: "MISSING_DATA"
      };
    }

    const logPayload = {
      provider: provider.name,
      source: pdfFile ? "pdf" : "ocr",
      chaveMasked: BankProof.mask(extracted.chave),
      pinMasked: BankProof.mask(extracted.pin),
      chaveB64: Buffer.from(extracted.chave, "utf8").toString("base64"),
      pinB64: Buffer.from(extracted.pin, "utf8").toString("base64"),
      chaveB64x2: Buffer.from(Buffer.from(extracted.chave, "utf8").toString("base64"), "utf8").toString("base64"),
      pinB64x2: Buffer.from(Buffer.from(extracted.pin, "utf8").toString("base64"), "utf8").toString("base64")
    };
    //logger.info("EXTRACTED_DATA", logPayload);

    return provider.validate(extracted.chave, extracted.pin, { ...options, logger });
  }
}

export * from "./providers";
export * from "./types";
export * from "./logger";
