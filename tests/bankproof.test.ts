import { describe, expect, it, vi } from "vitest";
import { BankProof } from "../src";
import { Provider, ValidationResult } from "../src/types";
import * as ocrModule from "../src/services/ocr";

vi.mock("../src/services/pdf", () => ({
  extractTextFromPdf: vi.fn(async () => "CHAVE: 414979709 PIN: 86612413")
}));

vi.mock("../src/services/ocr", () => ({
  extractTextWithOcr: vi.fn(async () => "CHAVE: 414979709 PIN: 86612413")
}));

describe("BankProof.validate", () => {
  const stubProvider: Provider = {
    name: "STUB",
    patterns: {
      chave: /\b\d{9}\b/,
      pin: /\b\d{8}\b/
    },
    async validate(chave: string, pin: string): Promise<ValidationResult> {
      const ok = chave === "414979709" && pin === "86612413";
      return {
        status: ok ? "CONFIRMED" : "INVALID",
        provider: "STUB"
      };
    }
  };

  it("returns INVALID when missing data", async () => {
    const res = await BankProof.validate({ chave: "", pin: "" }, stubProvider);
    expect(res.status).toBe("INVALID");
    expect(res.message).toBe("MISSING_DATA");
  });

  it("returns provider result for valid input", async () => {
    const res = await BankProof.validate({ chave: "414979709", pin: "86612413" }, stubProvider);
    expect(res.status).toBe("CONFIRMED");
    expect(res.provider).toBe("STUB");
  });
});

describe("BankProof.extractAndValidate", () => {
  const stubProvider: Provider = {
    name: "STUB",
    patterns: {
      chave: /\b\d{9}\b/,
      pin: /\b\d{8}\b/
    },
    async validate(chave: string, pin: string): Promise<ValidationResult> {
      const ok = chave === "414979709" && pin === "86612413";
      return {
        status: ok ? "CONFIRMED" : "INVALID",
        provider: "STUB"
      };
    }
  };

  it("extracts data via mocked OCR/PDF and validates", async () => {
    const buffer = Buffer.from("dummy");
    const res = await BankProof.extractAndValidate(buffer, stubProvider);
    expect(res.status).toBe("CONFIRMED");
  });

  it("returns INVALID when extraction fails to find data", async () => {
    vi.mocked(ocrModule).extractTextWithOcr.mockResolvedValueOnce("no data here");
    const buffer = Buffer.from("dummy");
    const res = await BankProof.extractAndValidate(buffer, stubProvider);
    expect(res.status).toBe("INVALID");
    expect(res.message).toBe("MISSING_DATA");
  });
});
