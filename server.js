import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.disable("x-powered-by");

// Раздача статики (index.html и всё рядом)
app.use(express.static(__dirname, { extensions: ["html"] }));

async function getDiscordId() {
  // 1) config.json
  try {
    const raw = await fs.readFile(path.join(__dirname, "config.json"), "utf-8");
    const j = JSON.parse(raw);
    if (j?.discord_id) return String(j.discord_id).trim();
  } catch {}

  // 2) fallback: попробуем вытащить из index.html (если там есть DISCORD_ID = "...")
  try {
    const html = await fs.readFile(path.join(__dirname, "index.html"), "utf-8");
    const m = html.match(/discordIdForSpotify:\s*["'](\d+)["']/) || html.match(/DISCORD_ID\s*=\s*["'](\d+)["']/);
    if (m) return m[1];
  } catch {}

  return null;
}

app.get("/api/discord", async (req, res) => {
  const id = await getDiscordId();
  if (!id) return res.status(500).json({ error: "DISCORD_ID not configured" });

  try {
    const r = await fetch(`https://lanyard.rest/v1/users/${id}`, {
      headers: { accept: "application/json" }
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(r.status).json({
        error: "Lanyard error",
        status: r.status,
        body: text.slice(0, 500)
      });
    }

    const j = await r.json();
    return res.json({ success: true, data: j.data });
  } catch (e) {
    return res.status(500).json({ error: "Fetch failed", message: String(e) });
  }
});

app.listen(PORT, () => {
  console.log(`Server running: http://localhost:${PORT}`);
});
