import Tesseract from "tesseract.js";

export async function extractTextWithOcr(buffer: Buffer, language = "eng"): Promise<string> {
  try {
    const { data } = await Tesseract.recognize(buffer, language);
    const text = data.text || "";
    return text;
  } catch (error) {
    return "";
  }
}
