import * as cheerio from "cheerio";
import fs from "fs";

function test() {
  try {
    const html = fs.readFileSync("past_date_results.html", "utf8");
    const $ = cheerio.load(html);
    
    console.log("Analyzing check4d tables...");
    
    $(".resultTable2").each((i, table) => {
      const tableText = $(table).text().trim().replace(/\s+/g, " ");
      
      // Look for headings or identifying text
      const firstRow = $(table).find("tr").first().text().trim().replace(/\s+/g, " ");
      
      console.log(`Table ${i}:`);
      console.log(`  First Row: "${firstRow}"`);
      console.log(`  Preview (first 150 chars): "${tableText.substring(0, 150)}"`);
    });

  } catch (error: any) {
    console.error("Error reading file:", error.message || error);
  }
}

test();
