import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getDrawResults } from "../src/server_db";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const date = req.query.date as string;
    const magnum = getDrawResults("magnum", date);
    const toto = getDrawResults("toto", date);
    const damacai = getDrawResults("damacai", date);

    res.json({
      status: "success",
      date,
      draws: { magnum, toto, damacai },
    });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
}
