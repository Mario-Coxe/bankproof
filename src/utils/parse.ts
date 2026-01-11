import { ExtractedData, ProviderPatterns } from "../types";

export function normalizeText(raw: string): string {
  return raw.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function cloneGlobal(regex: RegExp): RegExp {
  const flags = regex.flags.includes("g") ? regex.flags : `${regex.flags}g`;
  return new RegExp(regex.source, flags);
}

function pickDistinct(text: string, regex?: RegExp, disallow?: string): string | undefined {
  if (!regex) return undefined;
  const r = cloneGlobal(regex);
  let match: RegExpExecArray | null;
  while ((match = r.exec(text)) !== null) {
    const candidate = match[1] ?? match[0];
    if (!candidate) continue;
    const digits = extractDigits(candidate);
    if (!digits) continue;
    if (disallow && digits === disallow) continue;
    return digits;
  }
  return undefined;
}

function extractDigits(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D+/g, "");
  return digits.length > 0 ? digits : undefined;
}

export function extractDataFromText(text: string, patterns: ProviderPatterns): ExtractedData {
  const normalized = normalizeText(text);

  // First pass: chave
  const chave = pickDistinct(normalized, patterns.chave);
  // Second pass: pin, distinct from chave if possible
  const pin = pickDistinct(normalized, patterns.pin, chave);

  return { chave, pin, text: normalized };
}
