import Tesseract from "tesseract.js";

export async function extractTextWithOcr(buffer: Buffer, language = "eng"): Promise<string> {
  try {
    const { data } = await Tesseract.recognize(buffer, language);
    return data.text || "";
  } catch {
    return "";
  }
}
