import type { VercelRequest, VercelResponse } from "@vercel/node";
import type { OperatorId, PrizeMatch } from "../src/types";
import { getStandardDrawDates, getDrawResults } from "../src/server_db";
import { getPermutations } from "./_helpers";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ status: "error", message: "Method not allowed" });
  }

  try {
    const { number, operator, date, permutation } = req.body;
    if (!number || typeof number !== "string") {
      return res
        .status(400)
        .json({ status: "error", message: "A valid number string is required." });
    }

    const cleanNum = number.trim();
    const isPermutationCheck = !!permutation;

    // Split on commas, spaces, or semicolons to support multiple numbers
    const inputNumbers = cleanNum
      .split(/[\s,;]+/)
      .map((n: string) => n.trim())
      .filter((n: string) => n.length >= 3);

    const numbersToCheck: string[] = [];
    for (const num of inputNumbers) {
      if (isPermutationCheck) {
        numbersToCheck.push(...getPermutations(num));
      } else {
        numbersToCheck.push(num);
      }
    }

    const operators: OperatorId[] =
      operator && operator !== "all" ? [operator as OperatorId] : ["magnum", "toto", "damacai"];
    const targetDates: string[] = date ? [date] : getStandardDrawDates().map((d) => d.date);

    const matches: PrizeMatch[] = [];
    const drawsSearched: { operator: OperatorId; drawNo: string; date: string }[] = [];

    for (const d of targetDates) {
      for (const op of operators) {
        const draw = getDrawResults(op, d);
        drawsSearched.push({ operator: op, drawNo: draw.drawNo, date: d });

        const results = draw.results;

        for (const num of numbersToCheck) {
          // 4D Checks
          if (results.first === num) {
            matches.push({
              number: num, operator: op, drawNo: draw.drawNo, date: d,
              prizeType: "1st Prize", prizeAmount: "RM 2,500",
            });
          } else if (results.second === num) {
            matches.push({
              number: num, operator: op, drawNo: draw.drawNo, date: d,
              prizeType: "2nd Prize", prizeAmount: "RM 1,000",
            });
          } else if (results.third === num) {
            matches.push({
              number: num, operator: op, drawNo: draw.drawNo, date: d,
              prizeType: "3rd Prize", prizeAmount: "RM 500",
            });
          } else if (results.special.includes(num)) {
            matches.push({
              number: num, operator: op, drawNo: draw.drawNo, date: d,
              prizeType: "Special", prizeAmount: "RM 180",
            });
          } else if (results.consolation.includes(num)) {
            matches.push({
              number: num, operator: op, drawNo: draw.drawNo, date: d,
              prizeType: "Consolation", prizeAmount: "RM 60",
            });
          }

          // Toto 5D and 6D checks
          if (op === "toto" && results.additional) {
            const add = results.additional;
            if (add.toto5D?.includes(num)) {
              matches.push({
                number: num, operator: op, drawNo: draw.drawNo, date: d,
                prizeType: "5D", prizeAmount: "RM 15,000",
              });
            }
            if (add.toto6D === num) {
              matches.push({
                number: num, operator: op, drawNo: draw.drawNo, date: d,
                prizeType: "6D", prizeAmount: "RM 100,000",
              });
            }
          }

          // Da Ma Cai 3D checks
          if (op === "damacai" && results.additional && results.additional.damacai3D) {
            if (results.additional.damacai3D.includes(num)) {
              matches.push({
                number: num, operator: op, drawNo: draw.drawNo, date: d,
                prizeType: "3D", prizeAmount: "RM 660",
              });
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
      drawsSearched: drawsSearched.slice(0, 30),
      isLiveGroundingUsed: false,
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
}
