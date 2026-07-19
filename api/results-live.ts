import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchResultsForDate } from '../src/scraper.js';
import { getDrawResults } from '../src/server_db.js';
import { formatDraw } from './_helpers.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res
        .status(400)
        .json({ status: "error", message: "date query param required (YYYY-MM-DD)" });
    }

    const result = await fetchResultsForDate(date);

    if (!result.success || !result.magnum) {
      // Fallback to local DB
      const magnum = getDrawResults("magnum", date);
      const toto = getDrawResults("toto", date);
      const damacai = getDrawResults("damacai", date);
      return res.json({
        status: "success",
        isLive: false,
        fallbackReason: result.error || "No live data for date",
        date,
        draws: { magnum, toto, damacai },
      });
    }

    res.json({
      status: "success",
      isLive: true,
      source: result.source,
      date,
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
