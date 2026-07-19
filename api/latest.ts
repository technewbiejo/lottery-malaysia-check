import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchLatestResults } from "../src/scraper";
import { getStandardDrawDates, getDrawResults } from "../src/server_db";
import { formatDraw } from "./_helpers";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const result = await fetchLatestResults();
    if (!result.success || !result.magnum) {
      // Graceful fallback to DB
      const dates = getStandardDrawDates();
      const latestDate = dates[0]?.date || "2026-06-28";
      const magnum = getDrawResults("magnum", latestDate);
      const toto = getDrawResults("toto", latestDate);
      const damacai = getDrawResults("damacai", latestDate);
      return res.json({
        status: "success",
        isLive: false,
        fallbackReason: result.error || "Scrape unavailable",
        drawDate: latestDate,
        draws: { magnum, toto, damacai },
      });
    }

    res.json({
      status: "success",
      isLive: true,
      source: result.source,
      drawDate: result.drawDate,
      draws: {
        magnum: formatDraw(result.magnum!),
        toto: formatDraw(result.toto!),
        damacai: formatDraw(result.damacai!),
      },
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
}
