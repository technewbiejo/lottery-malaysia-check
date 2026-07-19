/**
 * Live Malaysia 4D Results Scraper
 * Source: check4d.org (public informational site)
 * 
 * Disclaimer: This tool is for informational/educational purposes only.
 * Not affiliated with Magnum, Sports Toto, or Da Ma Cai.
 * Always verify results on official operator websites.
 */
import axios from 'axios';
import * as cheerio from 'cheerio';

export interface LiveDrawResult {
  operator: 'magnum' | 'toto' | 'damacai';
  drawNo: string;
  date: string; // e.g. "18-07-2026"
  first: string;
  second: string;
  third: string;
  special: string[];
  consolation: string[];
  // Toto extras
  toto5D?: string;   // 5D 1st prize (full 5-digit number)
  toto6D?: string;   // 6D 1st prize
  star6_50?: string[];
  power6_55?: string[];
  supreme6_58?: string[];
  // Damacai extras
  damacai3D?: string[];
}

export interface LiveScrapeResponse {
  success: boolean;
  scrapeDate: string;         // The date scraped (YYYY-MM-DD)
  drawDate: string;           // Draw date from the page (DD-MM-YYYY)
  magnum?: LiveDrawResult;
  toto?: LiveDrawResult;
  damacai?: LiveDrawResult;
  error?: string;
  source: string;
}

const BASE_URL = 'https://www.check4d.org';
const PAST_RESULTS_URL = 'https://www.check4d.org/past-results';

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Accept-Encoding': 'gzip, deflate, br',
  'Connection': 'keep-alive',
  'Upgrade-Insecure-Requests': '1',
  'Cache-Control': 'max-age=0',
};

/**
 * Parses the check4d.org HTML and extracts all draw results
 */
function parseDrawPage($: cheerio.CheerioAPI): {
  magnum: Partial<LiveDrawResult>;
  toto: Partial<LiveDrawResult>;
  damacai: Partial<LiveDrawResult>;
} {
  const getText = (id: string) => $(` #${id}`).text().trim().replace(/\*{4}/g, '').replace(/----/g, '').replace(/[^0-9]/g, '') || '';
  const getRawText = (id: string) => $(` #${id}`).text().trim();

  // ─── Magnum ───────────────────────────────────────────────────
  const magnumSpecial: string[] = [];
  for (let i = 1; i <= 13; i++) {
    const val = getText(`ms${i}`);
    if (val && val.length >= 4) magnumSpecial.push(val.slice(0, 4));
  }

  const magnumConsolation: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const val = getText(`mc${i}`);
    if (val && val.length >= 4) magnumConsolation.push(val.slice(0, 4));
  }

  const magnum: Partial<LiveDrawResult> = {
    operator: 'magnum',
    drawNo: getRawText('mdn').replace('Draw No: ', '').trim(),
    date: getRawText('mdd').replace('Date: ', '').trim(),
    first: getText('mp1').slice(0, 4),
    second: getText('mp2').slice(0, 4),
    third: getText('mp3').slice(0, 4),
    special: magnumSpecial,
    consolation: magnumConsolation,
  };

  // ─── Da Ma Cai ────────────────────────────────────────────────
  const damacaiSpecial: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const val = getText(`ds${i}`);
    if (val && val.length >= 4) damacaiSpecial.push(val.slice(0, 4));
  }

  const damacaiConsolation: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const val = getText(`dc${i}`);
    if (val && val.length >= 4) damacaiConsolation.push(val.slice(0, 4));
  }

  const damacai: Partial<LiveDrawResult> = {
    operator: 'damacai',
    drawNo: getRawText('ddn').replace('Draw No: ', '').trim(),
    date: getRawText('ddd').replace('Date: ', '').trim(),
    first: getText('dp1').slice(0, 4),
    second: getText('dp2').slice(0, 4),
    third: getText('dp3').slice(0, 4),
    special: damacaiSpecial,
    consolation: damacaiConsolation,
  };

  // ─── Sports Toto 4D ───────────────────────────────────────────
  const totoSpecial: string[] = [];
  for (let i = 1; i <= 13; i++) {
    const val = getText(`ts${i}`);
    if (val && val.length >= 4) totoSpecial.push(val.slice(0, 4));
  }

  const totoConsolation: string[] = [];
  for (let i = 1; i <= 10; i++) {
    const val = getText(`tc${i}`);
    if (val && val.length >= 4) totoConsolation.push(val.slice(0, 4));
  }

  // 5D and 6D results (from the separate Toto 5D/6D table)
  const toto5D1st = getText('tt5d1').trim(); // e.g. "84994"
  const toto6D1st = getText('tt6d1').trim(); // e.g. "811451"

  // Star Toto 6/50
  const star6_50: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const val = getRawText(`tt650${i}`).replace(/\D/g, '');
    if (val) star6_50.push(val.padStart(2, '0'));
  }
  const starBonus = getRawText('tt650ex').replace(/\D/g, '');
  if (starBonus) star6_50.push(starBonus.padStart(2, '0'));

  // Power Toto 6/55
  const power6_55: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const val = getRawText(`tt655${i}`).replace(/\D/g, '');
    if (val) power6_55.push(val.padStart(2, '0'));
  }

  // Supreme Toto 6/58
  const supreme6_58: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const val = getRawText(`tt658${i}`).replace(/\D/g, '');
    if (val) supreme6_58.push(val.padStart(2, '0'));
  }

  const toto: Partial<LiveDrawResult> = {
    operator: 'toto',
    drawNo: getRawText('tdn').replace('Draw No: ', '').trim(),
    date: getRawText('tdd').replace('Date: ', '').trim(),
    first: getText('tp1').slice(0, 4),
    second: getText('tp2').slice(0, 4),
    third: getText('tp3').slice(0, 4),
    special: totoSpecial,
    consolation: totoConsolation,
    toto5D: toto5D1st,
    toto6D: toto6D1st,
    star6_50: star6_50.length > 0 ? star6_50 : undefined,
    power6_55: power6_55.length > 0 ? power6_55 : undefined,
    supreme6_58: supreme6_58.length > 0 ? supreme6_58 : undefined,
  };

  return {
    magnum,
    toto,
    damacai,
  };
}

/**
 * Convert DD-MM-YYYY string to YYYY-MM-DD 
 */
function toIsoDate(ddmmyyyy: string): string {
  const match = ddmmyyyy.match(/(\d{2})-(\d{2})-(\d{4})/);
  if (!match) return ddmmyyyy;
  return `${match[3]}-${match[2]}-${match[1]}`;
}

/**
 * Fetch LATEST draw results (latest draw page from check4d.org)
 */
export async function fetchLatestResults(): Promise<LiveScrapeResponse> {
  try {
    const res = await axios.get(BASE_URL, {
      headers: HEADERS,
      timeout: 12000,
    });

    const $ = cheerio.load(res.data as string);
    const { magnum, toto, damacai } = parseDrawPage($);

    const drawDate = magnum.date || toto.date || damacai.date || '';
    const isoDate = toIsoDate(drawDate);

    if (!magnum.first) {
      throw new Error('No real data available for this date');
    }

    return {
      success: true,
      scrapeDate: new Date().toISOString().split('T')[0],
      drawDate,
      magnum: magnum as LiveDrawResult,
      toto: toto as LiveDrawResult,
      damacai: damacai as LiveDrawResult,
      source: BASE_URL,
    };
  } catch (err: any) {
    return {
      success: false,
      scrapeDate: new Date().toISOString().split('T')[0],
      drawDate: '',
      error: err.message || 'Failed to fetch results',
      source: BASE_URL,
    };
  }
}

/**
 * Fetch results for a specific date by using the past-results page with date param
 * Format expected: YYYY-MM-DD
 */
export async function fetchResultsForDate(dateYYYYMMDD: string): Promise<LiveScrapeResponse> {
  // Convert YYYY-MM-DD to DD/MM/YYYY for the URL param
  const parts = dateYYYYMMDD.split('-');
  if (parts.length !== 3) {
    return {
      success: false,
      scrapeDate: dateYYYYMMDD,
      drawDate: '',
      error: 'Invalid date format. Expected YYYY-MM-DD',
      source: BASE_URL,
    };
  }

  const [year, month, day] = parts;
  const ddmmyyyy = `${day}/${month}/${year}`;

  try {
    // check4d.org supports date param as ?date=DD/MM/YYYY
    const url = `${PAST_RESULTS_URL}?date=${encodeURIComponent(ddmmyyyy)}`;
    const res = await axios.get(url, {
      headers: HEADERS,
      timeout: 15000,
    });

    const $ = cheerio.load(res.data as string);
    const { magnum, toto, damacai } = parseDrawPage($);

    const drawDate = magnum.date || toto.date || damacai.date || '';

    if (!magnum.first) {
      throw new Error('No real data available for this date');
    }

    return {
      success: true,
      scrapeDate: new Date().toISOString().split('T')[0],
      drawDate,
      magnum: magnum as LiveDrawResult,
      toto: toto as LiveDrawResult,
      damacai: damacai as LiveDrawResult,
      source: url,
    };
  } catch (err: any) {
    return {
      success: false,
      scrapeDate: dateYYYYMMDD,
      drawDate: '',
      error: err.message || 'Failed to fetch results for date',
      source: PAST_RESULTS_URL,
    };
  }
}
