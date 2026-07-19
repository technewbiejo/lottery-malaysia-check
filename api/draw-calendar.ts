import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getStandardDrawDates } from "../src/server_db";

export default function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const calendar = getStandardDrawDates();
    res.json({ status: "success", calendar });
  } catch (err: any) {
    res.status(500).json({ status: "error", message: err.message });
  }
}
