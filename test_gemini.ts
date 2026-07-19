import { GoogleGenAI, Type } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY || "";
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function test() {
  try {
    const formattedDate = "2026-07-15";
    const prompt = `Find the official Malaysia 4D lottery draw results for Wednesday, Saturday, or Sunday draws on ${formattedDate} (Magnum 4D, Sports Toto, and Da Ma Cai 1+3D).
You must search Google for the exact results on this date.
Then, output a clean JSON object containing the winning numbers.
Strictly adhere to the following JSON structure:
{
  "magnum": {
    "drawNo": "e.g. 123/26",
    "date": "${formattedDate}",
    "first": "4-digit number",
    "second": "4-digit number",
    "third": "4-digit number",
    "special": ["ten 4-digit numbers"],
    "consolation": ["ten 4-digit numbers"]
  },
  "toto": {
    "drawNo": "e.g. 5432/26",
    "date": "${formattedDate}",
    "first": "4-digit number",
    "second": "4-digit number",
    "third": "4-digit number",
    "special": ["ten 4-digit numbers"],
    "consolation": ["ten 4-digit numbers"],
    "toto5D": ["e.g. '12345'"],
    "toto6D": "e.g. '123456'"
  },
  "damacai": {
    "drawNo": "e.g. 4321/26",
    "date": "${formattedDate}",
    "first": "4-digit number",
    "second": "4-digit number",
    "third": "4-digit number",
    "special": ["ten 4-digit numbers"],
    "consolation": ["ten 4-digit numbers"]
  }
}`;

    console.log("Sending request to Gemini with Search Grounding...");
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // We use 2.5-flash since 3.5-flash might not support search grounding under all keys
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            magnum: {
              type: Type.OBJECT,
              properties: {
                drawNo: { type: Type.STRING },
                date: { type: Type.STRING },
                first: { type: Type.STRING },
                second: { type: Type.STRING },
                third: { type: Type.STRING },
                special: { type: Type.ARRAY, items: { type: Type.STRING } },
                consolation: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["drawNo", "date", "first", "second", "third", "special", "consolation"]
            },
            toto: {
              type: Type.OBJECT,
              properties: {
                drawNo: { type: Type.STRING },
                date: { type: Type.STRING },
                first: { type: Type.STRING },
                second: { type: Type.STRING },
                third: { type: Type.STRING },
                special: { type: Type.ARRAY, items: { type: Type.STRING } },
                consolation: { type: Type.ARRAY, items: { type: Type.STRING } },
                toto5D: { type: Type.ARRAY, items: { type: Type.STRING } },
                toto6D: { type: Type.STRING }
              },
              required: ["drawNo", "date", "first", "second", "third", "special", "consolation"]
            },
            damacai: {
              type: Type.OBJECT,
              properties: {
                drawNo: { type: Type.STRING },
                date: { type: Type.STRING },
                first: { type: Type.STRING },
                second: { type: Type.STRING },
                third: { type: Type.STRING },
                special: { type: Type.ARRAY, items: { type: Type.STRING } },
                consolation: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ["drawNo", "date", "first", "second", "third", "special", "consolation"]
            }
          },
          required: ["magnum", "toto", "damacai"]
        }
      }
    });

    console.log("Success! Response from Gemini:");
    console.log(response.text);
  } catch (error) {
    console.error("Error during test:", error);
  }
}

test();
