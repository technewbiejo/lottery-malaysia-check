import axios from "axios";
import * as cheerio from "cheerio";
import fs from "fs";

async function test() {
  try {
    const url = "https://www.check4d.com/past-results/2026-07-15";
    console.log("Fetching past page...");
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      timeout: 10000
    });
    
    const $ = cheerio.load(response.data);
    
    // Write HTML to local file for visual check if needed
    fs.writeFileSync("past_date_results.html", response.data);
    
    console.log("Parsing tables...");
    
    // Find all tables with class resultTable2
    $(".resultTable2").each((i, table) => {
      console.log(`\n--- TABLE ${i} ---`);
      
      // Let's print out the text rows
      $(table).find("tr").each((trIdx, tr) => {
        const cells: string[] = [];
        $(tr).find("td, th").each((tdIdx, td) => {
          cells.push($(td).text().trim().replace(/\s+/g, " "));
        });
        console.log(`  Row ${trIdx}:`, cells);
      });
    });

  } catch (error: any) {
    console.error("Error parsing:", error.message || error);
  }
}

test();
