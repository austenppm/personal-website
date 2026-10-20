// Writes a snapshot of Mini Loto / Loto 6 / Loto 7 draw history to
// public/tools/lotto/data/. The app prefers the live /api/lotto/<game>
// function and falls back to this snapshot. On network failure the existing
// files are kept so the build never breaks.

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SOURCES, fetchDraws } from "./lotto-source.mjs";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "tools", "lotto", "data");

await mkdir(OUT, { recursive: true });
for (const key of Object.keys(SOURCES)) {
  try {
    const data = await fetchDraws(key);
    await writeFile(join(OUT, `${key}.json`), JSON.stringify(data));
    const last = data.draws.at(-1);
    console.log(`lotto ${key}: ${data.draws.length} draws, latest #${last.no} ${last.date}`);
  } catch (e) {
    console.warn(`lotto ${key}: fetch failed (${e.message}); keeping existing data`);
  }
}
