import * as cheerio from "cheerio";
import fs from "fs";

interface DrawResults {
  first: string;
  second: string;
  third: string;
  special: string[];
  consolation: string[];
  additional?: {
    toto5D?: string[];
    toto6D?: string;
    jackpot?: string[];
    power6_55?: string[];
    supreme6_58?: string[];
    star6_50?: string[];
    damacai3D?: string[];
  };
}

interface DrawData {
  operator: 'magnum' | 'toto' | 'damacai';
  drawNo: string;
  date: string;
  results: DrawResults;
}

function cleanNumber(num: string): string {
  return num.replace(/\D/g, "");
}

function parseHtml(html: string, dateStr: string): Record<string, DrawData> | null {
  const $ = cheerio.load(html);
  const tables = $(".resultTable2");
  
  let magnumData: DrawData | null = null;
  let damacaiData: DrawData | null = null;
  let totoData: DrawData | null = null;

  tables.each((idx, table) => {
    const tableText = $(table).text();
    const firstRowText = $(table).find("tr").first().text().trim().replace(/\s+/g, " ");

    // 1. Parse Magnum
    if (firstRowText.includes("Magnum 4D")) {
      const drawInfoTable = tables.eq(idx + 1);
      const prizesTable = tables.eq(idx + 2);
      const specialTable = tables.eq(idx + 3);
      const consolationTable = tables.eq(idx + 4);

      const drawNoText = drawInfoTable.find("tr").first().find("td").eq(1).text().trim();
      const drawNo = drawNoText.replace("Draw No:", "").trim();

      const first = cleanNumber(prizesTable.find("tr").eq(0).find("td").eq(1).text().trim());
      const second = cleanNumber(prizesTable.find("tr").eq(1).find("td").eq(1).text().trim());
      const third = cleanNumber(prizesTable.find("tr").eq(2).find("td").eq(1).text().trim());

      const special: string[] = [];
      specialTable.find("tr").slice(1).each((_, tr) => {
        $(tr).find("td").each((_, td) => {
          const num = $(td).text().trim();
          if (num && num !== "----" && num !== "****") {
            special.push(cleanNumber(num));
          }
        });
      });

      const consolation: string[] = [];
      consolationTable.find("tr").slice(1).each((_, tr) => {
        $(tr).find("td").each((_, td) => {
          const num = $(td).text().trim();
          if (num && num !== "----" && num !== "****") {
            consolation.push(cleanNumber(num));
          }
        });
      });

      magnumData = {
        operator: "magnum",
        drawNo,
        date: dateStr,
        results: { first, second, third, special, consolation }
      };
    }

    // 2. Parse Da Ma Cai
    if (firstRowText.includes("Da Ma Cai 1+3D")) {
      const drawInfoTable = tables.eq(idx + 1);
      const prizesTable = tables.eq(idx + 2);
      const specialTable = tables.eq(idx + 3);
      const consolationTable = tables.eq(idx + 4);

      const drawNoText = drawInfoTable.find("tr").first().find("td").eq(1).text().trim();
      const drawNo = drawNoText.replace("Draw No:", "").trim();

      const first = cleanNumber(prizesTable.find("tr").eq(0).find("td").eq(1).text().trim());
      const second = cleanNumber(prizesTable.find("tr").eq(1).find("td").eq(1).text().trim());
      const third = cleanNumber(prizesTable.find("tr").eq(2).find("td").eq(1).text().trim());

      const special: string[] = [];
      specialTable.find("tr").slice(1).each((_, tr) => {
        $(tr).find("td").each((_, td) => {
          const num = $(td).text().trim();
          if (num && num !== "----" && num !== "****") {
            special.push(cleanNumber(num));
          }
        });
      });

      const consolation: string[] = [];
      consolationTable.find("tr").slice(1).each((_, tr) => {
        $(tr).find("td").each((_, td) => {
          const num = $(td).text().trim();
          if (num && num !== "----" && num !== "****") {
            consolation.push(cleanNumber(num));
          }
        });
      });

      const damacai3D = [first.slice(-3), second.slice(-3), third.slice(-3)].filter(Boolean);

      damacaiData = {
        operator: "damacai",
        drawNo,
        date: dateStr,
        results: {
          first, second, third, special, consolation,
          additional: { damacai3D }
        }
      };
    }

    // 3. Parse Sports Toto 4D
    if (firstRowText.includes("SportsToto 4D")) {
      const drawInfoTable = tables.eq(idx + 1);
      const prizesTable = tables.eq(idx + 2);
      const specialTable = tables.eq(idx + 3);
      const consolationTable = tables.eq(idx + 4);

      const drawNoText = drawInfoTable.find("tr").first().find("td").eq(1).text().trim();
      const drawNo = drawNoText.replace("Draw No:", "").trim();

      const first = cleanNumber(prizesTable.find("tr").eq(0).find("td").eq(1).text().trim());
      const second = cleanNumber(prizesTable.find("tr").eq(1).find("td").eq(1).text().trim());
      const third = cleanNumber(prizesTable.find("tr").eq(2).find("td").eq(1).text().trim());

      const special: string[] = [];
      specialTable.find("tr").slice(1).each((_, tr) => {
        $(tr).find("td").each((_, td) => {
          const num = $(td).text().trim();
          if (num && num !== "----" && num !== "****") {
            special.push(cleanNumber(num));
          }
        });
      });

      const consolation: string[] = [];
      consolationTable.find("tr").slice(1).each((_, tr) => {
        $(tr).find("td").each((_, td) => {
          const num = $(td).text().trim();
          if (num && num !== "----" && num !== "****") {
            consolation.push(cleanNumber(num));
          }
        });
      });

      totoData = {
        operator: "toto",
        drawNo,
        date: dateStr,
        results: { first, second, third, special, consolation, additional: {} }
      };
    }

    // 4. Parse Toto 5D, 6D, Lotto
    if (firstRowText.includes("SportsToto 5D, 6D, Lotto")) {
      if (!totoData) return; // Must have Sports Toto 4D parsed first
      
      const drawInfoTable = tables.eq(idx + 1);
      const toto5DTable = tables.eq(idx + 2);
      const toto6DTable = tables.eq(idx + 3);
      const starTotoTable = tables.eq(idx + 4);
      const powerTotoTable = tables.eq(idx + 5);
      const supremeTotoTable = tables.eq(idx + 6);

      // Parse 5D: 1st, 2nd, 3rd
      const toto5D: string[] = [];
      const first5D = cleanNumber(toto5DTable.find("tr").eq(1).find("td").eq(1).text().trim());
      const second5D = cleanNumber(toto5DTable.find("tr").eq(2).find("td").eq(1).text().trim());
      const third5D = cleanNumber(toto5DTable.find("tr").eq(3).find("td").eq(1).text().trim());
      if (first5D) toto5D.push(first5D);
      if (second5D) toto5D.push(second5D);
      if (third5D) toto5D.push(third5D);

      // Parse 6D: 1st
      const toto6D = cleanNumber(toto6DTable.find("tr").eq(1).find("td").eq(1).text().trim());

      // Parse Star Toto 6/50
      const star6_50: string[] = [];
      starTotoTable.find("tr").eq(1).find("td").each((_, td) => {
        const val = $(td).text().trim();
        if (val && val !== "+") {
          star6_50.push(val.padStart(2, '0'));
        }
      });

      // Parse Power Toto 6/55
      const power6_55: string[] = [];
      powerTotoTable.find("tr").eq(1).find("td").each((_, td) => {
        const val = $(td).text().trim();
        if (val) {
          power6_55.push(val.padStart(2, '0'));
        }
      });

      // Parse Supreme Toto 6/58
      const supreme6_58: string[] = [];
      supremeTotoTable.find("tr").eq(1).find("td").each((_, td) => {
        const val = $(td).text().trim();
        if (val) {
          supreme6_58.push(val.padStart(2, '0'));
        }
      });

      totoData.results.additional = {
        toto5D,
        toto6D,
        star6_50,
        power6_55,
        supreme6_58
      };
    }
  });

  if (!magnumData || !damacaiData || !totoData) {
    return null;
  }

  return { magnum: magnumData, damacai: damacaiData, toto: totoData };
}

function test() {
  const html = fs.readFileSync("past_date_results.html", "utf8");
  const parsed = parseHtml(html, "2026-07-15");
  console.log("Parsed Draw results:", JSON.stringify(parsed, null, 2));
}

test();
