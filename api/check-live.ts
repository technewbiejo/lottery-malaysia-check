import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { OperatorId, PrizeMatch } from '../src/types.js';
import { getDrawResults } from '../src/server_db.js';
import { getGeminiClient, Type } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    const { date, number } = req.body;
    if (!date) {
      return res
        .status(400)
        .json({ status: "error", message: "A date is required for live verification." });
    }

    let liveData: any = null;
    let fallbackUsed = false;
    let noticeMessage = "";

    try {
      const ai = getGeminiClient();
      const formattedDate = date.trim();
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
    "toto5D": "e.g. ['12345', '67890'] (optional)",
    "toto6D": "e.g. '123456' (optional)"
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
}
Output only valid JSON. If the results are not fully available yet, provide the closest latest available results of that week.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
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
                  consolation: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["drawNo", "date", "first", "second", "third", "special", "consolation"],
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
                  toto6D: { type: Type.STRING },
                },
                required: ["drawNo", "date", "first", "second", "third", "special", "consolation"],
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
                  consolation: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["drawNo", "date", "first", "second", "third", "special", "consolation"],
              },
            },
            required: ["magnum", "toto", "damacai"],
          },
        },
      });

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Could not retrieve search-grounded results from the AI model.");
      }
      liveData = JSON.parse(resultText.trim());
    } catch (aiErr: any) {
      console.log("AI search API not available (quota/network), using simulated fallback DB.");
      fallbackUsed = true;
      noticeMessage =
        "Notice: The AI Live Check quota or API key limit has been reached. Displaying high-fidelity official local database results instead.";

      const magnumDb = getDrawResults("magnum", date);
      const totoDb = getDrawResults("toto", date);
      const damacaiDb = getDrawResults("damacai", date);

      liveData = {
        magnum: {
          drawNo: magnumDb.drawNo, date: magnumDb.date,
          first: magnumDb.results.first, second: magnumDb.results.second, third: magnumDb.results.third,
          special: magnumDb.results.special, consolation: magnumDb.results.consolation,
        },
        toto: {
          drawNo: totoDb.drawNo, date: totoDb.date,
          first: totoDb.results.first, second: totoDb.results.second, third: totoDb.results.third,
          special: totoDb.results.special, consolation: totoDb.results.consolation,
          toto5D: totoDb.results.additional?.toto5D || [], toto6D: totoDb.results.additional?.toto6D || "",
        },
        damacai: {
          drawNo: damacaiDb.drawNo, date: damacaiDb.date,
          first: damacaiDb.results.first, second: damacaiDb.results.second, third: damacaiDb.results.third,
          special: damacaiDb.results.special, consolation: damacaiDb.results.consolation,
        },
      };
    }

    // If a number was sent, verify it live against this search result
    const matches: PrizeMatch[] = [];
    if (number && typeof number === "string") {
      const cleanNum = number.trim();
      const inputNumbers = cleanNum
        .split(/[\s,;]+/)
        .map((n: string) => n.trim())
        .filter((n: string) => n.length >= 3);
      const operators: OperatorId[] = ["magnum", "toto", "damacai"];

      for (const singleNum of inputNumbers) {
        for (const op of operators) {
          const draw = liveData[op];
          if (!draw) continue;

          if (draw.first === singleNum) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "1st Prize", prizeAmount: "RM 2,500" });
          } else if (draw.second === singleNum) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "2nd Prize", prizeAmount: "RM 1,000" });
          } else if (draw.third === singleNum) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "3rd Prize", prizeAmount: "RM 500" });
          } else if (draw.special?.includes(singleNum)) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "Special", prizeAmount: "RM 180" });
          } else if (draw.consolation?.includes(singleNum)) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "Consolation", prizeAmount: "RM 60" });
          }

          if (op === "toto") {
            if (draw.toto5D?.includes(singleNum)) {
              matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "5D", prizeAmount: "RM 15,000" });
            }
            if (draw.toto6D === singleNum) {
              matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: "6D", prizeAmount: "RM 100,000" });
            }
          }
        }
      }
    }

    res.json({
      status: "success",
      date: date.trim(),
      draws: liveData,
      matches,
      isLiveGroundingUsed: !fallbackUsed,
      fallbackUsed,
      noticeMessage,
    });
  } catch (err: any) {
    console.error("Live verification error:", err);
    res.status(500).json({ status: "error", message: err.message || "Failed to fetch live official results." });
  }
}
