"use client";

import { useEffect, useRef, useState } from "react";
import { GAMES, averagePrizes, masks, popcount, spread, tier, tierOdds, type Game, type GameKey, type Ticket } from "./lotto";
import { Ball, Card, GamePicker, NumberGrid, Row, yen, type Data } from "./ui";

type Mode = "random" | "fixed";

const PERIODS = [1, 5, 10, 25, 50, 100, 1000, Infinity];
const SPEEDS: [string, number][] = [
  ["Slow", 2],
  ["Normal", 10],
  ["Fast", 200],
  ["Faster", 5000],
  ["Extreme", Infinity],
];
const STOPS: [number, string][] = [
  [1, "1st prize"],
  [2, "2nd prize or better"],
  [3, "3rd prize or better"],
  [0, "never stop early"],
];
const MAX_POINTS = 400;
const LOG_SIZE = 15;

interface Win {
  draw: number;
  tier: number;
  ticket: Ticket;
  drawn: number[];
  bonus: number[];
}

/** Mutable simulation state, kept in a ref and copied to React state once per frame. */
interface Sim {
  draws: number;
  paid: number;
  won: number;
  tiers: number[];
  tierWon: number[];
  best: number;
  biggest: Win | null;
  series: number[]; // balance sampled every `every` draws, starting at draw 0
  every: number;
  log: Win[];
  last: { drawn: number[]; bonus: number[]; tickets: Ticket[] } | null;
  stopped: string | null;
  target: number; // stop after this many draws
}

const newSim = (g: Game, target: number): Sim => ({
  draws: 0,
  paid: 0,
  won: 0,
  tiers: new Array(g.tiers).fill(0),
  tierWon: new Array(g.tiers).fill(0),
  best: 0,
  biggest: null,
  series: [0],
  every: 1,
  log: [],
  last: null,
  stopped: null,
  target,
});

const snapshot = (s: Sim): Sim => ({
  ...s,
  tiers: [...s.tiers],
  tierWon: [...s.tierWon],
  series: [...s.series],
  log: [...s.log],
});

/** k distinct numbers from 1..max via partial Fisher-Yates on a reusable pool. */
function pickInto(pool: number[], k: number): number[] {
  for (let i = 0; i < k; i++) {
    const j = i + Math.floor(Math.random() * (pool.length - i));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, k);
}

function elapsed(g: Game, draws: number): string {
  const days = (draws * 365.25) / g.perYear;
  const y = Math.floor(days / 365.25);
  const m = Math.floor((days - y * 365.25) / 30.44);
  return `${y.toLocaleString("en-US")} yr ${m} mo`;
}

export default function Simulator({ data }: { data: Data }) {
  const [key, setKey] = useState<GameKey>("loto6");
  const [mode, setMode] = useState<Mode>("random");
  const [count, setCount] = useState(10);
  const [fixed, setFixed] = useState<Ticket[]>([]);
  const [picked, setPicked] = useState<number[]>([]);
  const [years, setYears] = useState(100);
  const [speed, setSpeed] = useState(Infinity);
  const [stopTier, setStopTier] = useState(1);
  const [running, setRunning] = useState(false);
  const [view, setView] = useState<Sim | null>(null);

  const g = GAMES[key];
  const sim = useRef<Sim | null>(null);
  const speedRef = useRef(speed);
  const raf = useRef(0);
  const prizes = useRef<number[]>([]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const perDraw = mode === "random" ? count : fixed.length;
  const avg = averagePrizes(g, data[key]);
  const odds = tierOdds(g);
  const logTier = g.tiers - 2; // log only the rarer prizes (Loto 6/7: 3等/4等 and up)

  const reset = () => {
    cancelAnimationFrame(raf.current);
    sim.current = null;
    setRunning(false);
    setView(null);
  };

  const run = () => {
    const pool = Array.from({ length: g.maxNum }, (_, i) => i + 1);
    const tPool = [...pool];
    const fixedMasks = fixed.map(masks);
    const k = g.pick + g.bonus;
    const s = sim.current!;
    let carry = 0;
    let prev = performance.now();

    const step = () => {
      const all = pickInto(pool, k);
      const drawn = all.slice(0, g.pick);
      const bonus = all.slice(g.pick);
      const [mLo, mHi] = masks(drawn);
      const [bLo, bHi] = masks(bonus);
      let tickets: Ticket[];
      let tm: [number, number][];
      if (mode === "random") {
        tickets = [];
        const seen = new Set<string>();
        while (tickets.length < count) {
          const t = pickInto(tPool, g.pick).sort((a, b) => a - b);
          const id = t.join(",");
          if (seen.has(id)) continue;
          seen.add(id);
          tickets.push(t);
        }
        tm = tickets.map(masks);
      } else {
        tickets = fixed;
        tm = fixedMasks;
      }
      s.draws++;
      s.paid += tickets.length * g.price;
      for (let i = 0; i < tm.length; i++) {
        const [lo, hi] = tm[i];
        const main = popcount(lo & mLo) + popcount(hi & mHi);
        if (main > s.best) s.best = main;
        if (main < 3) continue;
        const t = tier(g, main, popcount(lo & bLo) + popcount(hi & bHi));
        if (!t) continue;
        s.tiers[t - 1]++;
        s.tierWon[t - 1] += prizes.current[t - 1];
        s.won += prizes.current[t - 1];
        const win = { draw: s.draws, tier: t, ticket: tickets[i], drawn: [...drawn].sort((a, b) => a - b), bonus };
        if (!s.biggest || t <= s.biggest.tier) s.biggest = win;
        if (t <= logTier) {
          s.log.push(win);
          if (s.log.length > LOG_SIZE) s.log.shift();
        }
        if (stopTier && t <= stopTier && !s.stopped) s.stopped = `Won ${t}等 in draw ${s.draws.toLocaleString("en-US")}`;
      }
      s.last = { drawn: [...drawn].sort((a, b) => a - b), bonus, tickets };
      if (s.draws % s.every === 0) {
        s.series.push(s.won - s.paid);
        if (s.series.length > MAX_POINTS) {
          s.series = s.series.filter((_, i) => i % 2 === 0);
          s.every *= 2;
        }
      }
    };

    const done = () => s.stopped !== null || s.draws >= s.target;

    const frame = (now: number) => {
      const sp = speedRef.current;
      if (sp === Infinity) {
        const end = performance.now() + 12;
        while (!done() && performance.now() < end) for (let i = 0; i < 200 && !done(); i++) step();
      } else {
        carry += (sp * (now - prev)) / 1000;
        while (carry >= 1 && !done()) {
          step();
          carry--;
        }
      }
      prev = now;
      setView(snapshot(s));
      if (done()) setRunning(false);
      else raf.current = requestAnimationFrame(frame);
    };
    setRunning(true);
    raf.current = requestAnimationFrame(frame);
  };

  const start = () => {
    if (!sim.current) {
      sim.current = newSim(g, years * g.perYear);
      prizes.current = avg;
    }
    run();
  };

  const pause = () => {
    cancelAnimationFrame(raf.current);
    setRunning(false);
  };

  const extend = () => {
    if (!sim.current) return;
    sim.current.target = sim.current.draws + 50 * g.perYear;
    sim.current.stopped = null;
    run();
  };

  const togglePick = (n: number) => {
    const next = picked.includes(n) ? picked.filter((x) => x !== n) : [...picked, n].sort((a, b) => a - b);
    if (next.length === g.pick) {
      if (!fixed.some((t) => t.join() === next.join())) setFixed([...fixed, next]);
      setPicked([]);
    } else if (next.length < g.pick) setPicked(next);
    reset();
  };

  const quickPick = () => {
    const t = pickInto(Array.from({ length: g.maxNum }, (_, i) => i + 1), g.pick).sort((a, b) => a - b);
    if (!fixed.some((x) => x.join() === t.join())) setFixed([...fixed, t]);
    reset();
  };

  const locked = running || view !== null;
  const finished = view !== null && !running && (view.stopped !== null || view.draws >= view.target);
  const btn = "rounded-full px-5 py-2 text-sm font-semibold disabled:opacity-40";
  const primary = `${btn} bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white shadow hover:opacity-90`;
  const secondary = `${btn} border border-stone-300 bg-white hover:bg-stone-50`;
  const chip = (on: boolean) =>
    `rounded-full px-3 py-1 text-xs ${on ? "bg-stone-900 font-semibold text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`;

  return (
    <div className="space-y-4">
      <Card>
        <div className={locked ? "pointer-events-none opacity-60" : ""}>
          <GamePicker value={key} onChange={(k) => { setKey(k); setFixed([]); setPicked([]); reset(); }} />

          <div className="mt-4 flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
            {(["random", "fixed"] as Mode[]).map((m) => (
              <button key={m} onClick={() => { setMode(m); reset(); }} className={`flex-1 rounded-full px-3 py-1.5 ${mode === m ? "bg-white font-semibold shadow-sm" : "text-stone-500"}`}>
                {m === "random" ? "New random tickets every draw" : "Same numbers every draw"}
              </button>
            ))}
          </div>

          {mode === "random" ? (
            <label className="mt-4 flex items-center gap-2 text-sm">
              Quick-pick
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => { setCount(Math.max(1, Math.floor(Number(e.target.value)) || 1)); reset(); }}
                className="w-16 rounded-lg border border-stone-300 bg-white py-0.5 text-center tabular-nums"
              />
              tickets per draw ({yen(count * g.price)})
            </label>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-stone-600">
                Tap {g.pick} numbers to add a ticket{picked.length ? ` (${picked.length}/${g.pick})` : ""}.
              </p>
              <NumberGrid max={g.maxNum} picked={picked} onToggle={togglePick} />
              <div className="flex flex-wrap gap-2">
                <button onClick={quickPick} className={secondary}>+ Quick pick</button>
                <button onClick={() => { setFixed([...fixed, ...spread(g, data[key], 5).filter((t) => !fixed.some((x) => x.join() === t.join()))]); reset(); }} className={secondary}>
                  + 5 picker tickets
                </button>
                {fixed.length > 0 && <button onClick={() => { setFixed([]); reset(); }} className="px-2 text-xs text-stone-500 hover:text-stone-800">clear all</button>}
              </div>
              {fixed.length > 0 && (
                <div className="space-y-2">
                  {fixed.map((t) => (
                    <div key={t.join()} className="flex items-center gap-2">
                      <Row t={t} game={key} />
                      <button onClick={() => { setFixed(fixed.filter((x) => x !== t)); reset(); }} className="text-xs text-stone-400 hover:text-rose-600">remove</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 w-14 text-stone-500">Period</span>
              {PERIODS.map((y) => (
                <button key={y} onClick={() => setYears(y)} className={chip(years === y)}>
                  {y === Infinity ? "Endless" : `${y.toLocaleString("en-US")} yr`}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="mr-1 w-14 text-stone-500">Stop at</span>
              {STOPS.map(([t, label]) => (
                <button key={t} onClick={() => setStopTier(t)} className={chip(stopTier === t)}>{label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1 text-sm">
          <span className="mr-1 w-14 text-stone-500">Speed</span>
          {SPEEDS.map(([label, v]) => (
            <button key={label} onClick={() => { setSpeed(v); speedRef.current = v; }} className={chip(speed === v)}>{label}</button>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {running ? (
            <button onClick={pause} className={primary}>Pause</button>
          ) : finished ? (
            <button onClick={extend} className={primary}>Continue +50 years</button>
          ) : (
            <button onClick={start} disabled={perDraw === 0} className={primary}>{view ? "Resume" : "Start"}</button>
          )}
          {view && <button onClick={reset} className={secondary}>Reset</button>}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Draws are simulated with the real odds; prizes use each tier&apos;s average real payout ({avg.map((p, i) => `${i + 1}等 ${yen(p)}`).join(", ")}).
        </p>
      </Card>

      {view && <Results g={g} gameKey={key} view={view} perDraw={perDraw} odds={odds} running={running} />}
    </div>
  );
}

function Results({
  g,
  gameKey,
  view,
  perDraw,
  odds,
  running,
}: {
  g: Game;
  gameKey: GameKey;
  view: Sim;
  perDraw: number;
  odds: number[];
  running: boolean;
}) {
  const balance = view.won - view.paid;
  const returned = view.paid ? view.won / view.paid : 0;
  return (
    <>
      <Card>
        {view.stopped && !running && (
          <p className="mb-3 rounded-xl bg-gradient-to-r from-amber-100 to-rose-100 px-3 py-2 text-sm font-semibold">🎉 {view.stopped}</p>
        )}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Big label="Time" value={elapsed(g, view.draws)} sub={`${view.draws.toLocaleString("en-US")} draws`} />
          <Big label="Paid" value={yen(view.paid)} sub={`${(view.draws * perDraw).toLocaleString("en-US")} tickets`} />
          <Big label="Won" value={yen(view.won)} sub={`${(returned * 100).toFixed(1)}% returned`} />
          <Big label="Balance" value={`${balance < 0 ? "−" : "+"}${yen(Math.abs(balance))}`} sub={`best match: ${view.best}`} />
        </div>
        <BalanceChart series={view.series} every={view.every} perYear={g.perYear} />
      </Card>

      {view.last && (
        <Card>
          <div className="mb-2 flex flex-wrap items-center gap-1.5 text-sm">
            <span className="mr-1 text-stone-500">Draw {view.draws.toLocaleString("en-US")}</span>
            {view.last.drawn.map((n) => <Ball key={n} n={n} game={gameKey} />)}
            {view.last.bonus.map((n) => <Ball key={`b${n}`} n={n} game={gameKey} bonus />)}
          </div>
          <div className="max-h-48 space-y-1.5 overflow-y-auto">
            {view.last.tickets.slice(0, 20).map((t) => (
              <Row key={t.join()} t={t} game={gameKey} draw={{ no: 0, date: "", n: view.last!.drawn, b: view.last!.bonus, w: [], p: [] }} />
            ))}
            {view.last.tickets.length > 20 && <p className="text-xs text-stone-400">+{view.last.tickets.length - 20} more tickets</p>}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="mb-2 font-semibold">Prizes won</h3>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-stone-500">
            <tr>
              <th className="py-1 text-left font-normal">Tier</th>
              <th className="py-1 text-right font-normal">Won</th>
              <th className="py-1 text-right font-normal">Expected</th>
              <th className="py-1 text-right font-normal">Total</th>
            </tr>
          </thead>
          <tbody>
            {view.tiers.map((c, i) => (
              <tr key={i} className="border-t border-stone-100">
                <td className="py-1">{i + 1}等</td>
                <td className="py-1 text-right font-semibold">{c.toLocaleString("en-US")}</td>
                <td className="py-1 text-right text-stone-500">{fmtExpected(view.draws * perDraw * odds[i])}</td>
                <td className="py-1 text-right">{yen(view.tierWon[i])}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {view.biggest && (
          <p className="mt-3 text-xs text-stone-600">
            Biggest: {view.biggest.tier}等 in draw {view.biggest.draw.toLocaleString("en-US")} ({elapsed(g, view.biggest.draw)}) with {view.biggest.ticket.join(" ")}
          </p>
        )}
      </Card>

      {view.log.length > 0 && (
        <Card>
          <h3 className="mb-2 font-semibold">Recent notable wins</h3>
          <ul className="space-y-1 text-xs text-stone-600">
            {[...view.log].reverse().map((w, i) => (
              <li key={`${w.draw}-${i}`}>
                <span className="font-semibold text-stone-800">{w.tier}等</span> · {elapsed(g, w.draw)} · ticket {w.ticket.join(" ")} · drawn {w.drawn.join(" ")} + {w.bonus.join(" ")}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function fmtExpected(x: number): string {
  if (x >= 100) return Math.round(x).toLocaleString("en-US");
  if (x >= 1) return x.toFixed(1);
  return x.toFixed(3);
}

function Big({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-semibold tabular-nums text-stone-900">{value}</div>
      <div className="text-xs text-stone-400">{sub}</div>
    </div>
  );
}

/** Single-series line: balance over simulated years, with a zero baseline and hover readout. */
function BalanceChart({ series, every, perYear }: { series: number[]; every: number; perYear: number }) {
  const [hover, setHover] = useState<number | null>(null);
  if (series.length < 2) return null;
  const W = 600, H = 150, PL = 4, PR = 4, PT = 8, PB = 8;
  const lo = Math.min(0, ...series), hi = Math.max(0, ...series);
  const span = hi - lo || 1;
  const x = (i: number) => PL + (i / (series.length - 1)) * (W - PL - PR);
  const y = (v: number) => PT + ((hi - v) / span) * (H - PT - PB);
  const path = series.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  const years = ((series.length - 1) * every) / perYear;
  const fmtYears = (yrs: number) => (yrs < 1 ? `${Math.round(yrs * 12)} mo` : `${yrs.toFixed(yrs < 10 ? 1 : 0)} yr`);
  const signed = (v: number) => `${v < 0 ? "−" : "+"}${yen(Math.abs(Math.round(v)))}`;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const fx = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(series.length - 1, Math.round(((fx - PL) / (W - PL - PR)) * (series.length - 1)))));
  };

  return (
    <div className="relative mt-5">
      <div className="mb-1 flex justify-between text-xs text-stone-500">
        <span>Balance over time</span>
        <span className="tabular-nums">{signed(lo)} to {signed(hi)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img" aria-label={`Balance over ${fmtYears(years)}, ending at ${signed(series.at(-1)!)}`}>
        <line x1={PL} x2={W - PR} y1={y(0)} y2={y(0)} stroke="#d6d3d1" strokeWidth={1} />
        <path d={path} fill="none" stroke="#ea580c" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {hover !== null && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={PT} y2={H - PB} stroke="#a8a29e" strokeWidth={1} strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(series[hover])} r={4} fill="#ea580c" stroke="#fff" strokeWidth={2} />
          </>
        )}
      </svg>
      <div className="flex justify-between text-xs text-stone-400">
        <span>start</span>
        <span>{fmtYears(years)}</span>
      </div>
      {hover !== null && (
        <div
          className="pointer-events-none absolute top-5 -translate-x-1/2 whitespace-nowrap rounded-lg bg-stone-900 px-2 py-1 text-xs text-white shadow"
          style={{ left: `${(x(hover) / W) * 100}%` }}
        >
          {fmtYears((hover * every) / perYear)}: {signed(series[hover])}
        </div>
      )}
    </div>
  );
}
