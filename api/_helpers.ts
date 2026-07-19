/**
 * Shared helpers for Vercel serverless API functions.
 */
import { GoogleGenAI, Type } from "@google/genai";
import type { OperatorId, PrizeMatch } from '../src/types.js';
import type { LiveDrawResult } from '../src/scraper.js';

// ─── Permutation Helper ──────────────────────────────────────
export function getPermutations(str: string): string[] {
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
  return Array.from(new Set(permutations));
}

// ─── Lazy Gemini Client ──────────────────────────────────────
let aiClient: GoogleGenAI | null = null;
export function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY is not configured. Please add it in Vercel Environment Variables."
      );
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// ─── Format Live Draw Result ─────────────────────────────────
export function formatDraw(d: LiveDrawResult) {
  return {
    operator: d.operator,
    drawNo: d.drawNo,
    date: d.date,
    results: {
      first: d.first,
      second: d.second,
      third: d.third,
      special: (d.special || []).filter(Boolean),
      consolation: (d.consolation || []).filter(Boolean),
      additional:
        d.operator === "toto"
          ? {
              toto5D: d.toto5D ? [d.toto5D] : [],
              toto6D: d.toto6D || "",
              supreme6_58: d.supreme6_58 || [],
              power6_55: d.power6_55 || [],
              star6_50: d.star6_50 || [],
            }
          : d.operator === "damacai"
            ? {
                damacai3D: d.damacai3D || [],
              }
            : undefined,
    },
  };
}

// Re-export Type for check-live usage
export { Type };
