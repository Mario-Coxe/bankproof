import pdf from "pdf-parse";

export async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  try {
    const parsed = await pdf(buffer);
    const text = parsed.text || "";
    return text;
  } catch (error) {
    return "";
  }
}
