// Numbers 3 / Numbers 4 logic, ported from the Python CLI (lotto/numbers.py).
//
// Pick 3 or 4 digits (0-9, repeats allowed). Every number is equally likely to
// be drawn, but prizes are pari-mutuel, so a number many people play pays less
// when it comes up. The picker learns which numbers pay more from ~30 years of
// real payouts; judged before each draw, its picks paid 11-14% more than
// average. That lifts the return from ~45% to ~50% of what you spend.

export type NKey = "numbers3" | "numbers4";
export type Bet = "straight" | "box" | "set" | "mini";
export type PrizeKind = "straight" | "box" | "set_straight" | "set_box" | "mini";

export interface NGame {
  key: NKey;
  name: string;
  digits: number;
  price: number;
  prizes: PrizeKind[]; // prize columns, in the order of NDraw.p
  bets: Bet[];
  perYear: number;
}

export interface NDraw {
  no: number;
  date: string;
  n: string; // e.g. "0721"; leading zeros kept
  p: number[]; // yen per winning ¥200 ticket, per prize in NGame.prizes (0 if nobody won)
}

export const NGAMES: Record<NKey, NGame> = {
  numbers3: {
    key: "numbers3", name: "Numbers 3", digits: 3, price: 200,
    prizes: ["straight", "box", "set_straight", "set_box", "mini"], bets: ["straight", "box", "set", "mini"], perYear: 250,
  },
  numbers4: {
    key: "numbers4", name: "Numbers 4", digits: 4, price: 200,
    prizes: ["straight", "box", "set_straight", "set_box"], bets: ["straight", "box", "set"], perYear: 250,
  },
};

export const BET_NAMES: Record<Bet, string> = { straight: "Straight", box: "Box", set: "Set", mini: "Mini" };
export const PRIZE_NAMES: Record<PrizeKind, string> = {
  straight: "straight", box: "box", set_straight: "set (exact)", set_box: "set (any order)", mini: "mini",
};

export const width = (g: NGame, bet: Bet) => (bet === "mini" ? 2 : g.digits);
export const prizeOf = (g: NGame, d: NDraw, kind: PrizeKind) => d.p[g.prizes.indexOf(kind)] ?? 0;
const sorted = (t: string) => [...t].sort().join("");
const fact = (n: number): number => (n <= 1 ? 1 : n * fact(n - 1));

/** Distinct orderings of the digits: N3 6/3/1, N4 24/12/6/4/1. */
export function ways(t: string): number {
  const counts = new Map<string, number>();
  for (const c of t) counts.set(c, (counts.get(c) ?? 0) + 1);
  let n = fact(t.length);
  for (const c of counts.values()) n /= fact(c);
  return n;
}

/** Box and set need at least two orderings (no 777 or 7777). */
export const allowed = (bet: Bet, t: string) => bet === "straight" || bet === "mini" || ways(t) > 1;

/** Which prize a ticket wins, or null. */
export function prize(bet: Bet, t: string, result: string): PrizeKind | null {
  if (bet === "mini") return t === result.slice(-2) ? "mini" : null;
  const exact = t === result, perm = sorted(t) === sorted(result);
  if (bet === "straight") return exact ? "straight" : null;
  if (bet === "box") return perm ? "box" : null;
  return exact ? "set_straight" : perm ? "set_box" : null;
}

/** Probability one ticket wins anything. */
export function chance(g: NGame, bet: Bet, t: string): number {
  if (bet === "mini") return 1 / 100;
  return (bet === "straight" ? 1 : ways(t)) / 10 ** g.digits;
}

export const label = (bet: Bet, t: string) => (bet === "box" || bet === "set" ? `${BET_NAMES[bet]} · ${ways(t)}-way` : BET_NAMES[bet]);

/** The prize whose payouts tell us how popular a ticket is for this bet. */
const prizeKind = (bet: Bet): PrizeKind => (bet === "set" ? "set_box" : bet);

function every(w: number): string[] {
  return Array.from({ length: 10 ** w }, (_, i) => String(i).padStart(w, "0"));
}

// ---------- statistics ----------

export interface DigitStat {
  position: number;
  digit: number;
  total: number;
  recent: number;
  gap: number; // draws since this digit last came up in this position
}

export function digitStats(g: NGame, draws: NDraw[], window = 100): DigitStat[] {
  const out: DigitStat[] = [];
  for (let pos = 0; pos < g.digits; pos++) {
    const total = new Array(10).fill(0), recent = new Array(10).fill(0), last = new Array(10).fill(-1);
    draws.forEach((d, i) => {
      const v = Number(d.n[pos]);
      total[v]++;
      last[v] = i;
      if (i >= draws.length - window) recent[v]++;
    });
    for (let v = 0; v < 10; v++) out.push({ position: pos, digit: v, total: total[v], recent: recent[v], gap: draws.length - last[v] - 1 });
  }
  return out;
}

/** Average prize over recent draws; box prizes over draws with all digits different (the usual box). */
export function averagePrizes(g: NGame, draws: NDraw[], last = 500): Record<PrizeKind, number> {
  const most = fact(g.digits);
  const out = {} as Record<PrizeKind, number>;
  for (const k of g.prizes) {
    const paid = draws.slice(-last).filter((d) => prizeOf(g, d, k) > 0 && ((k !== "box" && k !== "set_box") || ways(d.n) === most)).map((d) => prizeOf(g, d, k));
    out[k] = paid.length ? Math.round(paid.reduce((a, b) => a + b, 0) / paid.length) : 0;
  }
  return out;
}

/** Average return per yen staked on one ticket, over recent draws. */
export function payoutRate(g: NGame, draws: NDraw[], bet: Bet, last = 500): number {
  let total = 0, n = 0;
  const all = 10 ** g.digits;
  for (const d of draws.slice(-last)) {
    const w = ways(d.n);
    if (bet === "mini") total += prizeOf(g, d, "mini") / 100;
    else if (bet === "straight") total += prizeOf(g, d, "straight") / all;
    else if (w === 1) continue; // box and set aren't sold on 777
    else if (bet === "box") total += (prizeOf(g, d, "box") * w) / all;
    else total += (prizeOf(g, d, "set_straight") + prizeOf(g, d, "set_box") * (w - 1)) / all;
    n++;
  }
  return n ? total / n / g.price : 0;
}

// ---------- popularity, learned from payouts ----------

type Features = Record<string, string>;

const isDate = (x: string) => {
  const m = Number(x.slice(0, 2)), d = Number(x.slice(2));
  return m >= 1 && m <= 12 && d >= 1 && d <= 31;
};

function permutations(t: string): string[] {
  if (t.length <= 1) return [t];
  return [...t].flatMap((c, i) => permutations(t.slice(0, i) + t.slice(i + 1)).map((rest) => c + rest));
}

/** What makes a number popular. Box and set prizes depend only on which digits come up. */
function features(g: NGame, kind: PrizeKind, t: string): Features {
  const boxy = kind === "box" || kind === "set_box";
  if (boxy) t = sorted(t);
  const d = [...t].map(Number);
  const steps = new Set(d.slice(1).map((x, i) => x - d[i]));
  const run = t.length > 2 && steps.size === 1 && (steps.has(1) || steps.has(-1));
  const f: Features = {
    ways: String(ways(t)),
    high: String(d.filter((x) => x >= 5).length), // birthdays and dates favour low digits
    run: String(run),
    number: t,
  };
  if (!boxy && kind !== "mini") f.lead0 = String(t[0] === "0");
  if (g.digits === 4 && kind !== "mini") f.date = String(boxy ? permutations(t).some(isDate) : isDate(t)); // MMDD, e.g. birthdays
  return f;
}

const SHRINK: Record<string, number> = { number: 3 }; // patterns use 20

const median = (v: number[]) => {
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/**
 * Additive model of log(prize / that year's median prize) for one prize type.
 * A positive effect means numbers with that trait returned more than usual when
 * they came up, i.e. fewer people played them. Fit by backfitting with each
 * level's mean shrunk toward zero, so rare traits don't get extreme effects.
 */
export class Popularity {
  effects: Record<string, Map<string, number>> = {};
  private rankedCache = new Map<Bet, { top: string[]; weights: number[] }>();

  constructor(private g: NGame, draws: NDraw[], private kind: PrizeKind = "straight", rounds = 6) {
    const w = kind === "mini" ? 2 : g.digits;
    // A 3-way box pays about double a 6-way box because it's half as likely,
    // so box prizes are compared as prize x orderings (the expected return).
    const boxy = kind === "box" || kind === "set_box";
    const rows: { f: Features; year: string; y: number }[] = [];
    for (const d of draws) {
      const p = prizeOf(g, d, kind);
      if (p > 0) rows.push({ f: features(g, kind, d.n.slice(-w)), year: d.date.slice(0, 4), y: Math.log(p * (boxy ? ways(d.n) : 1)) });
    }
    const byYear = new Map<string, number[]>();
    for (const r of rows) byYear.set(r.year, [...(byYear.get(r.year) ?? []), r.y]);
    const med = new Map([...byYear].map(([y, v]) => [y, median(v)]));
    const resid = rows.map((r) => r.y - med.get(r.year)!);
    const groups = rows.length ? Object.keys(rows[0].f) : [];
    for (const grp of groups) this.effects[grp] = new Map();
    for (let round = 0; round < rounds; round++) {
      for (const grp of groups) {
        const eff = this.effects[grp];
        const sums = new Map<string, number>(), counts = new Map<string, number>();
        rows.forEach((r, i) => {
          const v = r.f[grp];
          sums.set(v, (sums.get(v) ?? 0) + resid[i] + (eff.get(v) ?? 0));
          counts.set(v, (counts.get(v) ?? 0) + 1);
        });
        const k = SHRINK[grp] ?? 20;
        const next = new Map([...sums].map(([v, s]) => [v, s / (counts.get(v)! + k)]));
        rows.forEach((r, i) => {
          const v = r.f[grp];
          resid[i] += (eff.get(v) ?? 0) - next.get(v)!;
        });
        this.effects[grp] = next;
      }
    }
  }

  /** Expected prize relative to an average number, e.g. 1.2 = pays 20% more. */
  multiplier(t: string): number {
    const f = features(this.g, this.kind, t);
    let s = 0;
    for (const [grp, v] of Object.entries(f)) s += this.effects[grp]?.get(v) ?? 0;
    return Math.exp(s);
  }

  /** The 30% of tickets that should pay the most, with sampling weights favouring the best. */
  ranked(bet: Bet): { top: string[]; weights: number[] } {
    let r = this.rankedCache.get(bet);
    if (!r) {
      const mult = new Map(every(width(this.g, bet)).filter((t) => allowed(bet, t)).map((t) => [t, this.multiplier(t)]));
      const top = [...mult.keys()].sort((a, b) => mult.get(b)! - mult.get(a)!).slice(0, Math.floor((mult.size * 3) / 10));
      r = { top, weights: top.map((t) => mult.get(t)! ** 4) };
      this.rankedCache.set(bet, r);
    }
    return r;
  }

  /** Traits sorted from most popular (pays least) to least popular. */
  traits(): { name: string; mult: number }[] {
    return Object.entries(this.effects)
      .filter(([grp]) => grp !== "number")
      .flatMap(([grp, eff]) => [...eff].map(([v, e]) => ({ name: `${grp}=${v}`, mult: Math.exp(e) })))
      .sort((a, b) => a.mult - b.mult);
  }
}

export const popularity = (g: NGame, draws: NDraw[], bet: Bet) => new Popularity(g, draws, prizeKind(bet));

// ---------- ticket generation ----------

/** n distinct tickets. Box and set tickets never share a digit set, so no two can win the same draw. */
export function generate(
  g: NGame,
  pop: Popularity | null,
  n: number,
  bet: Bet,
  rand: () => number = Math.random,
): string[] {
  const w = width(g, bet);
  let pick: () => string;
  if (pop) {
    const { top, weights } = pop.ranked(bet);
    const total = weights.reduce((a, b) => a + b, 0);
    pick = () => {
      let r = rand() * total, i = 0;
      while (i < weights.length - 1 && (r -= weights[i]) > 0) i++;
      return top[i];
    };
  } else {
    pick = () => Array.from({ length: w }, () => Math.floor(rand() * 10)).join("");
  }
  const tickets: string[] = [];
  const seen = new Set<string>();
  for (let a = 0; a < n * 2000 && tickets.length < n; a++) {
    const t = pick();
    const key = bet === "box" || bet === "set" ? sorted(t) : t;
    if (seen.has(key) || !allowed(bet, t)) continue;
    seen.add(key);
    tickets.push(t);
  }
  return tickets;
}
