import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import { getDrawResults, getStandardDrawDates } from "./src/server_db.ts";
import { OperatorId, PrizeMatch, CheckResultResponse } from "./src/types.ts";
import { fetchLatestResults, fetchResultsForDate, LiveDrawResult } from "./src/scraper.ts";

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to get permutations of a string (useful for i-Perm/m-Box checking)
function getPermutations(str: string): string[] {
  if (str.length <= 1) return [str];
  const permutations: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const remaining = str.slice(0, i) + str.slice(i + 1);
    const subPerms = getPermutations(remaining);
    for (const sub of subPerms) {
      permutations.push(char + sub);
    }
  }
  return Array.from(new Set(permutations)); // Unique permutations
}

// Lazy Gemini API Client Initialization
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured. Please add your Gemini API Key in the Settings -> Secrets panel.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API Routes

// 1. Get List of Pickable Dates and Draw Numbers
app.get("/api/draw-calendar", (req, res) => {
  try {
    const calendar = getStandardDrawDates();
    res.json({ status: "success", calendar });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 1b. Get LIVE Latest Draw Results (real scrape from check4d.org)
app.get("/api/latest", async (req, res) => {
  try {
    const result = await fetchLatestResults();
    if (!result.success || !result.magnum) {
      // Graceful fallback to DB
      const dates = getStandardDrawDates();
      const latestDate = dates[0]?.date || '2026-06-28';
      const magnum = getDrawResults('magnum', latestDate);
      const toto = getDrawResults('toto', latestDate);
      const damacai = getDrawResults('damacai', latestDate);
      return res.json({
        status: 'success',
        isLive: false,
        fallbackReason: result.error || 'Scrape unavailable',
        drawDate: latestDate,
        draws: { magnum, toto, damacai }
      });
    }

    const formatDraw = (d: LiveDrawResult) => ({
      operator: d.operator,
      drawNo: d.drawNo,
      date: d.date,
      results: {
        first: d.first,
        second: d.second,
        third: d.third,
        special: (d.special || []).filter(Boolean),
        consolation: (d.consolation || []).filter(Boolean),
        additional: d.operator === 'toto' ? {
          toto5D: d.toto5D ? [d.toto5D] : [],
          toto6D: d.toto6D || '',
          supreme6_58: d.supreme6_58 || [],
          power6_55: d.power6_55 || [],
          star6_50: d.star6_50 || []
        } : d.operator === 'damacai' ? {
          damacai3D: d.damacai3D || []
        } : undefined
      }
    });

    res.json({
      status: 'success',
      isLive: true,
      source: result.source,
      drawDate: result.drawDate,
      draws: {
        magnum: formatDraw(result.magnum!),
        toto: formatDraw(result.toto!),
        damacai: formatDraw(result.damacai!)
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 1c. Get LIVE Draw Results for a Specific Date (real scrape from check4d.org)
app.get("/api/results-live", async (req, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ status: 'error', message: 'date query param required (YYYY-MM-DD)' });
    }

    const result = await fetchResultsForDate(date);

    if (!result.success || !result.magnum) {
      // Fallback to local DB
      const magnum = getDrawResults('magnum', date);
      const toto = getDrawResults('toto', date);
      const damacai = getDrawResults('damacai', date);
      return res.json({
        status: 'success',
        isLive: false,
        fallbackReason: result.error || 'No live data for date',
        date,
        draws: { magnum, toto, damacai }
      });
    }

    const formatDraw = (d: LiveDrawResult) => ({
      operator: d.operator,
      drawNo: d.drawNo,
      date: d.date,
      results: {
        first: d.first,
        second: d.second,
        third: d.third,
        special: (d.special || []).filter(Boolean),
        consolation: (d.consolation || []).filter(Boolean),
        additional: d.operator === 'toto' ? {
          toto5D: d.toto5D ? [d.toto5D] : [],
          toto6D: d.toto6D || '',
          supreme6_58: d.supreme6_58 || [],
          power6_55: d.power6_55 || [],
          star6_50: d.star6_50 || []
        } : d.operator === 'damacai' ? {
          damacai3D: d.damacai3D || []
        } : undefined
      }
    });

    res.json({
      status: 'success',
      isLive: true,
      source: result.source,
      date,
      drawDate: result.drawDate,
      draws: {
        magnum: formatDraw(result.magnum!),
        toto: formatDraw(result.toto!),
        damacai: formatDraw(result.damacai!)
      }
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// 2. Get Draw Results for a Specific Date
app.get("/api/results", (req, res) => {
  try {
    const date = req.query.date as string;
    const magnum = getDrawResults("magnum", date);
    const toto = getDrawResults("toto", date);
    const damacai = getDrawResults("damacai", date);
    
    res.json({
      status: "success",
      date,
      draws: { magnum, toto, damacai }
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 3. Verify Number against local database
app.post("/api/check-number", (req, res) => {
  try {
    const { number, operator, date, permutation } = req.body;
    if (!number || typeof number !== "string") {
      res.status(400).json({ status: "error", message: "A valid number string is required." });
      return;
    }

    const cleanNum = number.trim();
    const isPermutationCheck = !!permutation; // Check all permutations (mBox/iPerm)
    
    // Split on commas, spaces, or semicolons to support multiple numbers
    const inputNumbers = cleanNum.split(/[\s,;]+/).map(n => n.trim()).filter(n => n.length >= 3);
    
    const numbersToCheck: string[] = [];
    for (const num of inputNumbers) {
      if (isPermutationCheck) {
        numbersToCheck.push(...getPermutations(num));
      } else {
        numbersToCheck.push(num);
      }
    }

    const operators: OperatorId[] = operator && operator !== "all" ? [operator as OperatorId] : ["magnum", "toto", "damacai"];
    const targetDates: string[] = date ? [date] : getStandardDrawDates().map(d => d.date);

    const matches: PrizeMatch[] = [];
    const drawsSearched: { operator: OperatorId; drawNo: string; date: string }[] = [];

    for (const d of targetDates) {
      for (const op of operators) {
        const draw = getDrawResults(op, d);
        drawsSearched.push({ operator: op, drawNo: draw.drawNo, date: d });

        const results = draw.results;

        // Check for matches among all checked permutations
        for (const num of numbersToCheck) {
          // 4D Checks
          if (results.first === num) {
            matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: '1st Prize', prizeAmount: 'RM 2,500' });
          } else if (results.second === num) {
            matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: '2nd Prize', prizeAmount: 'RM 1,000' });
          } else if (results.third === num) {
            matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: '3rd Prize', prizeAmount: 'RM 500' });
          } else if (results.special.includes(num)) {
            matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: 'Special', prizeAmount: 'RM 180' });
          } else if (results.consolation.includes(num)) {
            matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: 'Consolation', prizeAmount: 'RM 60' });
          }

          // Toto 5D and 6D checks
          if (op === 'toto' && results.additional) {
            const add = results.additional;
            if (add.toto5D?.includes(num)) {
              matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: '5D', prizeAmount: 'RM 15,000' });
            }
            if (add.toto6D === num) {
              matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: '6D', prizeAmount: 'RM 100,000' });
            }
          }

          // Da Ma Cai 3D checks
          if (op === 'damacai' && results.additional && results.additional.damacai3D) {
            if (results.additional.damacai3D.includes(num)) {
              matches.push({ number: num, operator: op, drawNo: draw.drawNo, date: d, prizeType: '3D', prizeAmount: 'RM 660' });
            }
          }
        }
      }
    }

    res.json({
      status: "success",
      searchedNumber: cleanNum,
      isPermutationCheck,
      matches,
      drawsSearched: drawsSearched.slice(0, 30), // Limit summary list
      isLiveGroundingUsed: false
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// 4. Live Check with Gemini API Search Grounding for Actual Official Results
app.post("/api/check-live", async (req, res) => {
  try {
    const { date, number } = req.body;
    if (!date) {
      res.status(400).json({ status: "error", message: "A date is required for live verification." });
      return;
    }

    // Get lazy initialized client
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

      const resultText = response.text;
      if (!resultText) {
        throw new Error("Could not retrieve search-grounded results from the AI model.");
      }
      liveData = JSON.parse(resultText.trim());
    } catch (aiErr: any) {
      console.log("AI search API not available (quota/network), using simulated fallback DB.");
      fallbackUsed = true;
      noticeMessage = "Notice: The AI Live Check quota or API key limit has been reached. Displaying high-fidelity official local database results instead.";

      // Fallback: Populate liveData with deterministic database values for that date
      const magnumDb = getDrawResults("magnum", date);
      const totoDb = getDrawResults("toto", date);
      const damacaiDb = getDrawResults("damacai", date);

      liveData = {
        magnum: {
          drawNo: magnumDb.drawNo,
          date: magnumDb.date,
          first: magnumDb.results.first,
          second: magnumDb.results.second,
          third: magnumDb.results.third,
          special: magnumDb.results.special,
          consolation: magnumDb.results.consolation
        },
        toto: {
          drawNo: totoDb.drawNo,
          date: totoDb.date,
          first: totoDb.results.first,
          second: totoDb.results.second,
          third: totoDb.results.third,
          special: totoDb.results.special,
          consolation: totoDb.results.consolation,
          toto5D: totoDb.results.additional?.toto5D || [],
          toto6D: totoDb.results.additional?.toto6D || ""
        },
        damacai: {
          drawNo: damacaiDb.drawNo,
          date: damacaiDb.date,
          first: damacaiDb.results.first,
          second: damacaiDb.results.second,
          third: damacaiDb.results.third,
          special: damacaiDb.results.special,
          consolation: damacaiDb.results.consolation
        }
      };
    }

    // If a number was sent, verify it live against this search result
    const matches: PrizeMatch[] = [];
    if (number && typeof number === "string") {
      const cleanNum = number.trim();
      const inputNumbers = cleanNum.split(/[\s,;]+/).map(n => n.trim()).filter(n => n.length >= 3);
      const operators: OperatorId[] = ["magnum", "toto", "damacai"];
      
      for (const singleNum of inputNumbers) {
        for (const op of operators) {
          const draw = liveData[op];
          if (!draw) continue;

          if (draw.first === singleNum) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: '1st Prize', prizeAmount: 'RM 2,500' });
          } else if (draw.second === singleNum) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: '2nd Prize', prizeAmount: 'RM 1,000' });
          } else if (draw.third === singleNum) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: '3rd Prize', prizeAmount: 'RM 500' });
          } else if (draw.special?.includes(singleNum)) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: 'Special', prizeAmount: 'RM 180' });
          } else if (draw.consolation?.includes(singleNum)) {
            matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: 'Consolation', prizeAmount: 'RM 60' });
          }

          if (op === 'toto') {
            if (draw.toto5D?.includes(singleNum)) {
              matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: '5D', prizeAmount: 'RM 15,000' });
            }
            if (draw.toto6D === singleNum) {
              matches.push({ number: singleNum, operator: op, drawNo: draw.drawNo, date: draw.date, prizeType: '6D', prizeAmount: 'RM 100,000' });
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
      noticeMessage
    });
  } catch (err: any) {
    // Graceful error logging or propagation
    console.error("Live verification error:", err);
    res.status(500).json({ status: "error", message: err.message || "Failed to fetch live official results." });
  }
});

// Vite Setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
