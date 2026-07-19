import * as cheerio from "cheerio";
import fs from "fs";

function test() {
  try {
    const html = fs.readFileSync("past_date_results.html", "utf8");
    const $ = cheerio.load(html);
    
    console.log("Analyzing check4d tables 0 to 14...");
    
    $(".resultTable2").slice(0, 15).each((i, table) => {
      const tableText = $(table).text().trim().replace(/\s+/g, " ");
      const firstRow = $(table).find("tr").first().text().trim().replace(/\s+/g, " ");
      
      console.log(`Table ${i}:`);
      console.log(`  First Row: "${firstRow}"`);
      console.log(`  Rows:`);
      $(table).find("tr").each((trIdx, tr) => {
        const cells: string[] = [];
        $(tr).find("td, th").each((tdIdx, td) => {
          cells.push($(td).text().trim().replace(/\s+/g, " "));
        });
        console.log(`    Row ${trIdx}:`, cells);
      });
    });

  } catch (error: any) {
    console.error("Error reading file:", error.message || error);
  }
}

test();
