import axios from "axios";

async function test() {
  const dates = ["2026-07-15", "15-07-2026", "260715"];
  
  for (const date of dates) {
    const urls = [
      `https://www.check4d.com/past-results/${date}`,
      `https://www.check4d.com/${date}`,
      `https://www.check4d.com/past-results.php?date=${date}`
    ];
    
    for (const url of urls) {
      try {
        console.log(`Checking ${url}...`);
        const response = await axios.get(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          },
          timeout: 5000
        });
        console.log(`  -> SUCCESS! Status: ${response.status}, HTML length: ${response.data.length}`);
        
        // Check if there is draw results in the HTML
        if (response.data.includes("Magnum") || response.data.includes("Toto")) {
          console.log(`  -> Page contains lottery data!`);
          // Save a sample
          const fs = require("fs");
          fs.writeFileSync(`success_page_${date}.html`, response.data);
        }
      } catch (error: any) {
        console.log(`  -> Failed: ${error.message || error}`);
      }
    }
  }
}

test();
