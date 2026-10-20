// Lotto logic, ported from the Python CLI (~/Programming/personal/lotto).
//
// Every combination is equally likely to be drawn, so nothing here changes the
// odds of the jackpot. What it does optimize:
//  - tickets share no numbers, which raises P(at least one prize) per draw
//  - numbers people over-pick (birthdays 1-31, 7s, patterns) are avoided, which
//    raises the payout if you do win, since prizes are split among fewer winners

export type GameKey = "loto6" | "loto7" | "mini";

export interface Game {
  key: GameKey;
  name: string;
  pick: number;
  maxNum: number;
  bonus: number;
  price: number;
  tiers: number;
  days: string;
  perYear: number; // draws per year
}

export interface Draw {
  no: number;
  date: string;
  n: number[]; // main numbers, sorted
  b: number[]; // bonus numbers
  w: number[]; // winners per tier
  p: number[]; // yen per winning ticket per tier
}

export type Ticket = number[];

export const GAMES: Record<GameKey, Game> = {
  loto6: { key: "loto6", name: "Loto 6", pick: 6, maxNum: 43, bonus: 1, price: 200, tiers: 5, days: "Mon & Thu", perYear: 104 },
  loto7: { key: "loto7", name: "Loto 7", pick: 7, maxNum: 37, bonus: 2, price: 300, tiers: 6, days: "Fri", perYear: 52 },
  mini: { key: "mini", name: "Mini Loto", pick: 5, maxNum: 31, bonus: 1, price: 200, tiers: 4, days: "Tue", perYear: 52 },
};

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return Math.round(r);
}

export const combinations = (g: Game) => comb(g.maxNum, g.pick);

/** Prize tier (1 = jackpot) or null. */
export function tier(g: Game, main: number, bonus: number): number | null {
  const b = bonus > 0;
  if (main === g.pick) return 1;
  if (main === g.pick - 1) return b ? 2 : 3;
  if (g.key === "mini") return main === 3 ? 4 : null;
  if (g.key === "loto6") return main === 4 ? 4 : main === 3 ? 5 : null;
  if (main === 5) return 4;
  if (main === 4) return 5;
  if (main === 3 && b) return 6;
  return null;
}

/** Exact probability of each prize tier for one ticket. */
export function tierOdds(g: Game): number[] {
  const total = combinations(g);
  const losers = g.maxNum - g.pick - g.bonus;
  const probs = new Array(g.tiers).fill(0);
  for (let m = 0; m <= g.pick; m++) {
    for (let b = 0; b <= Math.min(g.bonus, g.pick - m); b++) {
      const t = tier(g, m, b);
      if (t) probs[t - 1] += (comb(g.pick, m) * comb(g.bonus, b) * comb(losers, g.pick - m - b)) / total;
    }
  }
  return probs;
}

/** Average payout per tier over past draws that had winners in that tier. */
export function averagePrizes(g: Game, draws: Draw[]): number[] {
  return Array.from({ length: g.tiers }, (_, t) => {
    const paid = draws.map((d) => d.p[t]).filter((p) => p > 0);
    return paid.length ? Math.round(paid.reduce((a, b) => a + b, 0) / paid.length) : 0;
  });
}

export function score(g: Game, ticket: Ticket, d: Draw) {
  const s = new Set(ticket);
  const main = d.n.filter((x) => s.has(x)).length;
  const bonus = d.b.filter((x) => s.has(x)).length;
  return { main, tier: tier(g, main, bonus) };
}

// ---------- statistics ----------

export interface NumberStat {
  number: number;
  total: number;
  recent: number;
  gap: number;
}

export function numberStats(g: Game, draws: Draw[], window = 100): NumberStat[] {
  const total = new Array(g.maxNum + 1).fill(0);
  const recent = new Array(g.maxNum + 1).fill(0);
  const last = new Array(g.maxNum + 1).fill(-1);
  draws.forEach((d, i) => {
    for (const x of d.n) {
      total[x]++;
      last[x] = i;
      if (i >= draws.length - window) recent[x]++;
    }
  });
  return Array.from({ length: g.maxNum }, (_, i) => ({
    number: i + 1,
    total: total[i + 1],
    recent: recent[i + 1],
    gap: draws.length - last[i + 1] - 1,
  }));
}

function maxRun(t: Ticket): number {
  let best = 1, run = 1;
  for (let i = 1; i < t.length; i++) {
    run = t[i] === t[i - 1] + 1 ? run + 1 : 1;
    best = Math.max(best, run);
  }
  return best;
}

const oddCount = (t: Ticket) => t.filter((x) => x % 2).length;
const sum = (t: Ticket) => t.reduce((a, b) => a + b, 0);

function percentile(values: number[], q: number): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.round(q * (s.length - 1))))];
}

/** What a typical winning combination looks like, learned from history. */
export interface Shape {
  sumLo: number;
  sumHi: number;
  oddOk: Set<number>;
  runMax: number;
  past: Set<string>;
}

export function shape(draws: Draw[]): Shape {
  const odds = new Map<number, number>();
  for (const d of draws) odds.set(oddCount(d.n), (odds.get(oddCount(d.n)) ?? 0) + 1);
  return {
    sumLo: percentile(draws.map((d) => sum(d.n)), 0.1),
    sumHi: percentile(draws.map((d) => sum(d.n)), 0.9),
    oddOk: new Set([...odds].filter(([, v]) => v / draws.length >= 0.05).map(([k]) => k)),
    runMax: percentile(draws.map((d) => maxRun(d.n)), 0.95),
    past: new Set(draws.map((d) => d.n.join(","))),
  };
}

function fits(s: Shape, t: Ticket): boolean {
  const total = sum(t);
  return (
    total >= s.sumLo && total <= s.sumHi && s.oddOk.has(oddCount(t)) && maxRun(t) <= s.runMax && !s.past.has(t.join(","))
  );
}

/** Rejects shapes people love to pick: arithmetic progressions, same-last-digit clumps. */
function unpopularOk(t: Ticket): boolean {
  const diffs = new Set(t.slice(1).map((x, i) => x - t[i]));
  const digits = new Map<number, number>();
  for (const x of t) digits.set(x % 10, (digits.get(x % 10) ?? 0) + 1);
  return diffs.size > 1 && Math.max(...digits.values()) <= 2;
}

// ---------- ticket generation ----------

function unpopularWeights(g: Game): number[] {
  return Array.from({ length: g.maxNum }, (_, i) => {
    const n = i + 1;
    let w = 1;
    if (n <= 31 && g.maxNum > 31) w *= 0.6;
    if (n % 10 === 7) w *= 0.8;
    return w;
  });
}

function sample(g: Game, weights: number[], rand: () => number): Ticket {
  const pool = Array.from({ length: g.maxNum }, (_, i) => i + 1);
  const w = [...weights];
  const picked: number[] = [];
  for (let k = 0; k < g.pick; k++) {
    let r = rand() * w.reduce((a, b) => a + b, 0);
    let i = 0;
    while (i < w.length - 1 && (r -= w[i]) > 0) i++;
    picked.push(pool.splice(i, 1)[0]);
    w.splice(i, 1);
  }
  return picked.sort((a, b) => a - b);
}

/**
 * n unpopular tickets that spread numbers as evenly as possible: no shared
 * numbers while they fit (Loto 6: 7 tickets, Loto 7: 5), and beyond that every
 * number is used about equally often, which keeps tickets least correlated.
 */
export function spread(g: Game, draws: Draw[], n: number, rand: () => number = Math.random, restarts?: number): Ticket[] {
  const base = unpopularWeights(g);
  const filt = draws.length ? shape(draws) : null;
  restarts ??= Math.max(3, Math.min(200, Math.round(2000 / Math.max(1, n))));
  let best: Ticket[] = [];
  let bestScore = Infinity;
  for (let r = 0; r < restarts; r++) {
    const tickets: Ticket[] = [];
    const seen = new Set<string>();
    const uses = new Array(g.maxNum + 1).fill(0);
    for (let k = 0; k < n; k++) {
      // Penalize each number by how much more it has been used than the least-used number.
      let least = Infinity;
      for (let x = 1; x <= g.maxNum; x++) least = Math.min(least, uses[x]);
      const w = base.map((x, i) => x * 0.02 ** (uses[i + 1] - least));
      let found: Ticket | null = null;
      for (let a = 0; a < 500 && !found; a++) {
        const t = sample(g, w, rand);
        if (seen.has(t.join(",")) || (filt && !fits(filt, t)) || !unpopularOk(t)) continue;
        found = t;
      }
      if (!found) break;
      tickets.push(found);
      seen.add(found.join(","));
      found.forEach((x) => uses[x]++);
    }
    if (tickets.length < n) continue;
    // Total shared numbers over all ticket pairs = sum over numbers of C(uses, 2).
    const score = uses.reduce((a, u) => a + (u * (u - 1)) / 2, 0);
    if (score < bestScore) {
      best = tickets;
      bestScore = score;
      if (score === 0) break;
    }
  }
  // Fully disjoint sets are already as good as it gets; past that, even
  // spreading is only a proxy, so optimize the prize chance directly.
  if (best.length > Math.floor(g.maxNum / g.pick) && filt) {
    best = maximizeCoverage(g, best, filt, base, rand);
  }
  return best;
}

// Number sets as two 32-bit masks (numbers 1-32 in lo, 33-64 in hi) for fast overlap counts.
export const popcount = (x: number) => {
  x -= (x >>> 1) & 0x55555555;
  x = (x & 0x33333333) + ((x >>> 2) & 0x33333333);
  return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
};

export function masks(nums: number[]): [number, number] {
  let lo = 0, hi = 0;
  for (const x of nums) {
    if (x <= 32) lo |= 1 << (x - 1);
    else hi |= 1 << (x - 33);
  }
  return [lo >>> 0, hi >>> 0];
}

/**
 * Local search: on a fixed sample of simulated draws, swap single numbers in
 * tickets whenever that makes more of the draws win at least one prize. Swaps
 * must keep tickets distinct and passing the shape / unpopular filters, and
 * replacement numbers are drawn with the unpopular weights.
 */
function maximizeCoverage(
  g: Game,
  start: Ticket[],
  filt: Shape,
  weights: number[],
  rand: () => number,
  samples = 20_000,
  iters = Math.min(10_000, Math.max(3000, 30 * start.length)),
): Ticket[] {
  const k = g.pick + g.bonus;
  const pool = Array.from({ length: g.maxNum }, (_, i) => i + 1);
  const mainLo = new Uint32Array(samples), mainHi = new Uint32Array(samples);
  const bonusLo = new Uint32Array(samples), bonusHi = new Uint32Array(samples);
  for (let s = 0; s < samples; s++) {
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(rand() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    [mainLo[s], mainHi[s]] = masks(pool.slice(0, g.pick));
    [bonusLo[s], bonusHi[s]] = masks(pool.slice(g.pick, k));
  }
  const wins = (t: Ticket) => {
    const [lo, hi] = masks(t);
    const out = new Uint8Array(samples);
    for (let s = 0; s < samples; s++) {
      const main = popcount(lo & mainLo[s]) + popcount(hi & mainHi[s]);
      if (main >= 3) out[s] = tier(g, main, popcount(lo & bonusLo[s]) + popcount(hi & bonusHi[s])) ? 1 : 0;
    }
    return out;
  };

  const tickets = start.map((t) => [...t]);
  const seen = new Set(tickets.map((t) => t.join(",")));
  const winRows = tickets.map(wins);
  const cover = new Uint32Array(samples); // how many tickets win each sampled draw
  for (const row of winRows) for (let s = 0; s < samples; s++) cover[s] += row[s];
  const total = weights.reduce((a, b) => a + b, 0);

  for (let it = 0; it < iters; it++) {
    const i = Math.floor(rand() * tickets.length);
    const old = tickets[i];
    let r = rand() * total, x = 0;
    while (x < weights.length - 1 && (r -= weights[x]) > 0) x++;
    const incoming = x + 1;
    if (old.includes(incoming)) continue;
    const pos = Math.floor(rand() * g.pick);
    const cand = old.map((v, j) => (j === pos ? incoming : v)).sort((a, b) => a - b);
    const key = cand.join(",");
    if (seen.has(key) || !fits(filt, cand) || !unpopularOk(cand)) continue;
    const next = wins(cand);
    const prev = winRows[i];
    let delta = 0;
    for (let s = 0; s < samples; s++) {
      if (prev[s] && !next[s] && cover[s] === 1) delta--;
      else if (!prev[s] && next[s] && cover[s] === 0) delta++;
    }
    if (delta < 0) continue; // accept ties so the search can drift across plateaus
    for (let s = 0; s < samples; s++) cover[s] += next[s] - prev[s];
    seen.delete(old.join(","));
    seen.add(key);
    tickets[i] = cand;
    winRows[i] = next;
  }
  return tickets;
}

export function randomTickets(g: Game, n: number, rand: () => number = Math.random): Ticket[] {
  const w = new Array(g.maxNum).fill(1);
  const seen = new Set<string>();
  while (seen.size < n) seen.add(sample(g, w, rand).join(","));
  return [...seen].map((t) => t.split(",").map(Number));
}

/** Monte Carlo estimate of P(at least one ticket wins any prize) in one draw. */
export function prizeChance(g: Game, tickets: Ticket[], trials = 40_000, rand: () => number = Math.random): number {
  const sets = tickets.map((t) => new Set(t));
  const pool = Array.from({ length: g.maxNum }, (_, i) => i + 1);
  const k = g.pick + g.bonus;
  let hits = 0;
  for (let t = 0; t < trials; t++) {
    // partial Fisher-Yates: first k entries are the draw
    for (let i = 0; i < k; i++) {
      const j = i + Math.floor(rand() * (pool.length - i));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (const s of sets) {
      let main = 0, bonus = 0;
      for (let i = 0; i < g.pick; i++) if (s.has(pool[i])) main++;
      for (let i = g.pick; i < k; i++) if (s.has(pool[i])) bonus++;
      if (tier(g, main, bonus)) {
        hits++;
        break;
      }
    }
  }
  return hits / trials;
}

/** Seeded PRNG so a week's plan is stable across reloads. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
