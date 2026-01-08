import { ExtractedData, ProviderPatterns } from "../types";

export function normalizeText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function pickFirst(text: string, regex?: RegExp): string | undefined {
  if (!regex) return undefined;
  const match = text.match(regex);
  return match?.[1] ?? match?.[0];
}

export function extractDataFromText(text: string, patterns: ProviderPatterns): ExtractedData {
  const normalized = normalizeText(text);
  const chave = pickFirst(normalized, patterns.chave);
  const pin = pickFirst(normalized, patterns.pin);

  return { chave, pin, text: normalized };
}
