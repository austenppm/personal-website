// Shared by the build-time snapshot (scripts/fetch-lotto-data.mjs) and the
// live Cloudflare Pages Function (functions/api/lotto/[game].js).

export const SOURCES = {
  mini: { url: "https://miniloto.thekyo.jp/data/miniloto.csv", pick: 5, bonus: 1, tiers: 4 },
  loto6: { url: "https://loto6.thekyo.jp/data/loto6.csv", pick: 6, bonus: 1, tiers: 5 },
  loto7: { url: "https://loto7.thekyo.jp/data/loto7.csv", pick: 7, bonus: 2, tiers: 6 },
};

const int = (s) => Number((s ?? "").trim().replace(/,/g, "")) || 0;

export function parse(game, text) {
  const draws = [];
  for (const line of text.split(/\r?\n/).slice(1)) {
    const row = line.split(",");
    const [y, m, d] = (row[1] ?? "").trim().split("/").map(Number);
    if (!y || !m || !d) continue;
    let i = 2;
    const take = (k) => row.slice(i, (i += k)).map(int);
    const n = take(game.pick).sort((a, b) => a - b);
    const b = take(game.bonus);
    const w = take(game.tiers);
    const p = take(game.tiers);
    if (n.length !== game.pick || n.some((x) => !x)) continue;
    const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    draws.push({ no: int(row[0]), date, n, b, w, p });
  }
  return draws.sort((a, b) => a.no - b.no);
}

/** Fetches and parses one game's full history. `init` is passed to fetch. */
export async function fetchDraws(key, init = {}) {
  const game = SOURCES[key];
  const res = await fetch(game.url, { ...init, headers: { "User-Agent": "Mozilla/5.0 pyiiphyomaung.com" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const text = new TextDecoder("shift_jis").decode(await res.arrayBuffer());
  const draws = parse(game, text);
  if (draws.length < 100) throw new Error(`only ${draws.length} draws parsed`);
  return { updated: new Date().toISOString(), draws };
}
