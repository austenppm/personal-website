"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GAMES,
  combinations,
  numberStats,
  prizeChance,
  randomTickets,
  score,
  spread,
  tierOdds,
  type Draw,
  type Game,
  type GameKey,
  type Ticket,
} from "./lotto";
import Simulator from "./Simulator";
import { Ball, Card, GamePicker, KEYS, NumberGrid, Row, Stat, load, pct, store, yen, type Data } from "./ui";

interface SavedSet {
  id: string;
  savedAt: string;
  game: GameKey;
  targetNo: number; // draw these tickets are for
  tickets: Ticket[];
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

// ---------------- Plan ----------------

function makePlan(data: Data, counts: Record<GameKey, number>): Partial<Record<GameKey, Ticket[]>> {
  const plan: Partial<Record<GameKey, Ticket[]>> = {};
  for (const k of KEYS) if (counts[k] > 0) plan[k] = spread(GAMES[k], data[k], counts[k]);
  return plan;
}

function PlanTab({ data, onSave }: { data: Data; onSave: (s: SavedSet[]) => void }) {
  // Rendered only after draw data loads on the client, so reading storage here is safe.
  const [counts, setCounts] = useState<Record<GameKey, number>>(() => load("lotto.counts", { loto6: 5, loto7: 5, mini: 0 }));
  const [plan, setPlan] = useState(() => makePlan(data, counts));
  const [chances, setChances] = useState<Partial<Record<GameKey, [number, number]>>>({});
  const [saved, setSaved] = useState(false);

  const regenerate = (c: Record<GameKey, number>) => {
    setPlan(makePlan(data, c));
    setSaved(false);
    setChances({});
  };

  // Prize odds are a Monte Carlo estimate; run after paint so picks show instantly.
  useEffect(() => {
    const id = setTimeout(() => {
      const out: Partial<Record<GameKey, [number, number]>> = {};
      for (const k of KEYS) {
        const t = plan[k];
        if (!t?.length) continue;
        const g = GAMES[k];
        // Keep the simulation around 400k ticket-checks however many tickets there are.
        const trials = Math.max(2000, Math.min(40_000, Math.round(400_000 / t.length)));
        const rand = Array.from({ length: 10 }, () => prizeChance(g, randomTickets(g, t.length), trials / 10));
        out[k] = [prizeChance(g, t, trials), rand.reduce((a, b) => a + b, 0) / rand.length];
      }
      setChances(out);
    }, 30);
    return () => clearTimeout(id);
  }, [plan]);

  const setCount = (k: GameKey, v: number) => {
    // The only real ceiling is every possible combination.
    const next = { ...counts, [k]: Math.max(0, Math.min(combinations(GAMES[k]), Math.floor(v) || 0)) };
    setCounts(next);
    store("lotto.counts", next);
    regenerate(next);
  };

  const perDraw = KEYS.reduce((a, k) => a + (plan[k]?.length ?? 0) * GAMES[k].price, 0);

  const save = () => {
    const sets: SavedSet[] = KEYS.filter((k) => plan[k]?.length).map((k) => ({
      id: `${Date.now()}-${k}`,
      savedAt: new Date().toISOString(),
      game: k,
      targetNo: data[k].at(-1)!.no + 1,
      tickets: plan[k]!,
    }));
    onSave(sets);
    setSaved(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 text-sm">
              <span className="w-20 font-medium">{GAMES[k].name}</span>
              <button className="h-7 w-7 rounded-full border border-stone-300 hover:bg-stone-100" onClick={() => setCount(k, counts[k] - 1)}>−</button>
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={counts[k]}
                onChange={(e) => setCount(k, Number(e.target.value))}
                className="w-14 rounded-lg border border-stone-300 bg-white py-0.5 text-center tabular-nums"
              />
              <button className="h-7 w-7 rounded-full border border-stone-300 hover:bg-stone-100" onClick={() => setCount(k, counts[k] + 1)}>+</button>
            </label>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => regenerate(counts)} className="rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90">
            New picks
          </button>
          <button onClick={save} disabled={saved || perDraw === 0} className="rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50">
            {saved ? "Saved ✓" : "Save for next draw"}
          </button>
        </div>
      </Card>

      {KEYS.filter((k) => plan[k]?.length).map((k) => {
        const g = GAMES[k];
        const t = plan[k]!;
        const last = data[k].at(-1)!;
        const c = chances[k];
        return (
          <Card key={k}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-lg font-semibold">{g.name}</h3>
              <span className="text-xs text-stone-500">draw #{last.no + 1} · {g.days}</span>
            </div>
            <div className="space-y-2">
              {t.map((x) => <Row key={x.join()} t={x} game={k} />)}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <Stat label="cost" value={yen(t.length * g.price)} />
              <Stat label="any prize" value={c ? pct(c[0]) : "…"} sub={c ? `random: ${pct(c[1])}` : ""} />
              <Stat label="jackpot" value={`1 in ${Math.round(combinations(g) / t.length).toLocaleString("en-US")}`} />
            </div>
          </Card>
        );
      })}

      {perDraw > 0 && (
        <p className="px-1 text-sm text-stone-600">
          {`${yen(perDraw)} per draw. Lotteries pay back about half of sales, so over time expect roughly ${yen(perDraw / 2)} back per draw on average. Only play what you're happy to spend on fun.`}
        </p>
      )}
    </div>
  );
}

// ---------------- My tickets ----------------

function MyTicketsTab({ data, saved, onDelete }: { data: Data; saved: SavedSet[]; onDelete: (id: string) => void }) {
  if (!saved.length)
    return <Card><p className="text-sm text-stone-600">No saved tickets yet. Generate picks and tap “Save for next draw”.</p></Card>;
  return (
    <div className="space-y-4">
      {[...saved].reverse().map((s) => {
        const g = GAMES[s.game];
        const draw = data[s.game].find((d) => d.no === s.targetNo);
        const results = draw ? s.tickets.map((t) => score(g, t, draw)) : [];
        const won = draw ? results.reduce((a, r) => a + (r.tier ? draw.p[r.tier - 1] : 0), 0) : 0;
        return (
          <Card key={s.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{g.name} · draw #{s.targetNo}</h3>
              <button onClick={() => onDelete(s.id)} className="text-xs text-stone-400 hover:text-rose-600">remove</button>
            </div>
            {draw ? (
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-stone-500">
                <span className="mr-1">{draw.date} result:</span>
                {draw.n.map((n) => <Ball key={n} n={n} game={s.game} />)}
                {draw.b.map((n) => <Ball key={`b${n}`} n={n} game={s.game} bonus />)}
              </div>
            ) : (
              <p className="mb-3 text-xs text-stone-500">Waiting for draw #{s.targetNo} — results show up here automatically once it’s drawn.</p>
            )}
            <div className="space-y-2">
              {s.tickets.map((t, i) => (
                <div key={t.join()} className="flex flex-wrap items-center gap-3">
                  <Row t={t} game={s.game} draw={draw} />
                  {draw && (
                    <span className="text-xs text-stone-600">
                      {results[i].main} hit{results[i].tier ? ` · ${results[i].tier}等 ${yen(draw.p[results[i].tier! - 1])}` : ""}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {draw && (
              <p className="mt-3 text-sm">
                Spent {yen(s.tickets.length * g.price)}, won <span className="font-semibold">{yen(won)}</span>
              </p>
            )}
          </Card>
        );
      })}
    </div>
  );
}

// ---------------- Check ----------------

function CheckTab({ data }: { data: Data }) {
  const [key, setKey] = useState<GameKey>("loto6");
  const [picked, setPicked] = useState<number[]>([]);
  const g = GAMES[key];

  const toggle = (n: number) =>
    setPicked((p) => (p.includes(n) ? p.filter((x) => x !== n) : p.length < g.pick ? [...p, n].sort((a, b) => a - b) : p));

  const result = useMemo(() => {
    if (picked.length !== g.pick) return null;
    const draws = data[key];
    let best = 0;
    const wins: { d: Draw; main: number; tier: number }[] = [];
    for (const d of draws) {
      const r = score(g, picked, d);
      best = Math.max(best, r.main);
      if (r.tier) wins.push({ d, main: r.main, tier: r.tier });
    }
    const won = wins.reduce((a, w) => a + w.d.p[w.tier - 1], 0);
    return { best, wins, won, spent: draws.length * g.price, n: draws.length };
  }, [picked, data, key, g]);

  return (
    <div className="space-y-4">
      <Card>
        <GamePicker value={key} onChange={(k) => { setKey(k); setPicked([]); }} />
        <p className="mt-3 text-sm text-stone-600">Pick {g.pick} numbers to see how they would have done in every past draw.</p>
        <div className="mt-3">
          <NumberGrid max={g.maxNum} picked={picked} onToggle={toggle} />
        </div>
        {picked.length > 0 && (
          <button onClick={() => setPicked([])} className="mt-3 text-xs text-stone-500 hover:text-stone-800">clear</button>
        )}
      </Card>
      {result && (
        <Card>
          <p className="text-sm">
            Across {result.n.toLocaleString("en-US")} draws: best match <b>{result.best}</b>, <b>{result.wins.length}</b> prizes.
            Spent {yen(result.spent)}, won <b>{yen(result.won)}</b>.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-stone-600">
            {result.wins.slice(-10).reverse().map((w) => (
              <li key={w.d.no}>
                #{w.d.no} {w.d.date} — {w.main} hit, {w.tier}等 {yen(w.d.p[w.tier - 1])}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------- Stats ----------------

function StatsTab({ data }: { data: Data }) {
  const [key, setKey] = useState<GameKey>("loto6");
  const g: Game = GAMES[key];
  const draws = data[key];
  const st = useMemo(() => numberStats(g, draws), [g, draws]);
  const last = draws.at(-1)!;
  const maxTotal = Math.max(...st.map((s) => s.total));
  const minTotal = Math.min(...st.map((s) => s.total));
  const byRecent = [...st].sort((a, b) => b.recent - a.recent);
  const byGap = [...st].sort((a, b) => b.gap - a.gap);
  const chip = (label: string, n: number) => (
    <span key={label + n} className="rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums">{label}</span>
  );

  return (
    <div className="space-y-4">
      <Card>
        <GamePicker value={key} onChange={setKey} />
        <div className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
          <span className="mr-1 text-stone-500">Latest #{last.no} ({last.date})</span>
          {last.n.map((n) => <Ball key={n} n={n} game={key} />)}
          {last.b.map((n) => <Ball key={`b${n}`} n={n} game={key} bonus />)}
        </div>
      </Card>
      <Card>
        <h3 className="mb-1 font-semibold">How often each number has been drawn</h3>
        <p className="mb-4 text-xs text-stone-500">
          {draws.length.toLocaleString("en-US")} draws. Expected {(draws.length * g.pick / g.maxNum).toFixed(0)} each; the spread you see
          ({minTotal}–{maxTotal}) is normal randomness.
        </p>
        <div className="flex h-32 items-end gap-[2px]">
          {st.map((s) => (
            <div key={s.number} className="group relative flex-1" style={{ height: `${(s.total / maxTotal) * 100}%` }}>
              <div className="h-full rounded-t bg-gradient-to-t from-amber-400 to-rose-400 opacity-80 group-hover:opacity-100" />
              <div className="pointer-events-none absolute -top-6 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-stone-800 px-1.5 py-0.5 text-[10px] text-white group-hover:block">
                {s.number}: {s.total}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-stone-400"><span>1</span><span>{g.maxNum}</span></div>
      </Card>
      <Card>
        <div className="space-y-3 text-sm">
          <div><div className="mb-1 text-stone-500">Hot (last 100 draws)</div><div className="flex flex-wrap gap-1">{byRecent.slice(0, 8).map((s) => chip(`${s.number} ×${s.recent}`, s.number))}</div></div>
          <div><div className="mb-1 text-stone-500">Cold (last 100 draws)</div><div className="flex flex-wrap gap-1">{byRecent.slice(-8).reverse().map((s) => chip(`${s.number} ×${s.recent}`, s.number))}</div></div>
          <div><div className="mb-1 text-stone-500">Longest since drawn</div><div className="flex flex-wrap gap-1">{byGap.slice(0, 8).map((s) => chip(`${s.number} · ${s.gap} draws`, s.number))}</div></div>
          <p className="text-xs text-stone-500">Hot, cold and overdue numbers don&apos;t predict the next draw — testing on all past draws shows they hit at exactly the chance rate.</p>
        </div>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Odds per ticket</h3>
        <div className="grid grid-cols-3 gap-2 text-center text-xs sm:grid-cols-6">
          {tierOdds(g).map((p, i) => (
            <Stat key={i} label={`${i + 1}等`} value={`1 in ${Math.round(1 / p).toLocaleString("en-US")}`} />
          ))}
        </div>
      </Card>
    </div>
  );
}

// ---------------- About ----------------

function AboutTab() {
  return (
    <Card className="space-y-3 text-sm leading-relaxed text-stone-700">
      <h3 className="text-base font-semibold text-stone-900">What this does — and doesn&apos;t</h3>
      <p>
        Every combination is equally likely in every draw. The machine has no memory, so “hot”, “cold” and “overdue”
        numbers can&apos;t predict anything — backtesting every strategy on hundreds of past draws confirms they all hit at the
        chance rate.
      </p>
      <p>What the picks do optimize:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>No shared numbers between tickets.</b> Your tickets cover as many different numbers as possible, raising the chance that at least one wins a prize (Loto 6: ~12.9% → ~13.7%; Loto 7: ~17.7% → ~19.0% for 5 tickets).</li>
        <li><b>Unpopular numbers.</b> Many players pick birthdays (1–31), 7s and patterns. Prizes are split between winners, so avoiding those raises the payout if you win — the odds stay the same.</li>
        <li><b>Typical shape.</b> Tickets look like real draws (normal sum, odd/even mix, no long runs) and never repeat a past result.</li>
      </ul>
      <p>
        Japanese lotteries return about 45–50% of sales as prizes, so the long-run expectation is losing about half of what you
        spend. Treat it as entertainment with a fixed budget.
      </p>
      <h3 className="pt-2 text-base font-semibold text-stone-900">Install as an app</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li><b>Android (Chrome):</b> menu ⋮ → <i>Install app</i> / <i>Add to Home screen</i>.</li>
        <li><b>macOS Safari:</b> File → <i>Add to Dock</i>. <b>macOS Chrome:</b> install icon in the address bar.</li>
        <li><b>iPhone (Safari):</b> Share → <i>Add to Home Screen</i>.</li>
      </ul>
    </Card>
  );
}

// ---------------- Page ----------------

/** Live data from the Pages Function, falling back to the build-time snapshot. */
async function loadGame(k: GameKey): Promise<{ updated: string; draws: Draw[] }> {
  try {
    const res = await fetch(`/api/lotto/${k}`);
    if (res.ok) return await res.json();
  } catch {
    // offline or running under `next dev` — use the snapshot
  }
  const res = await fetch(`/tools/lotto/data/${k}.json`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const TABS = ["Plan", "Tickets", "Simulate", "Check", "Stats", "About"] as const;
type Tab = (typeof TABS)[number];

export default function LottoPage() {
  const [data, setData] = useState<Data | null>(null);
  const [updated, setUpdated] = useState("");
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Plan");
  const [saved, setSaved] = useState<SavedSet[]>([]);
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    Promise.all(KEYS.map(loadGame))
      .then((res) => {
        setData(Object.fromEntries(KEYS.map((k, i) => [k, res[i].draws])) as Data);
        setUpdated(res[0].updated);
        setSaved(load("lotto.saved", []));
      })
      .catch((e) => setError(String(e)));

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/tools/lotto/sw.js", { scope: "/tools/lotto/" }).catch(() => {});
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const updateSaved = (next: SavedSet[]) => {
    setSaved(next);
    store("lotto.saved", next);
  };

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-8">
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            <span className="gradient-text">Lotto</span> Picker
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Loto 6 · Loto 7 · Mini Loto
            {updated && ` · updated ${new Date(updated).toLocaleDateString("en-CA")}`}
          </p>
        </div>
        {installEvent && (
          <button
            onClick={() => installEvent.prompt().then(() => setInstallEvent(null))}
            className="shrink-0 rounded-full border border-orange-300 bg-white px-4 py-1.5 text-sm font-medium text-orange-700 hover:bg-orange-50"
          >
            Install app
          </button>
        )}
      </header>

      <nav className="mb-5 flex gap-0.5 overflow-x-auto rounded-full bg-white/70 p-1 text-sm shadow-sm">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-full px-2 py-1.5 text-[13px] sm:px-3 sm:text-sm ${tab === t ? "bg-stone-900 font-semibold text-white" : "text-stone-600 hover:bg-stone-100"}`}
          >
            {t}
            {t === "Tickets" && saved.length > 0 && <span className="ml-1 text-xs opacity-70">{saved.length}</span>}
          </button>
        ))}
      </nav>

      {error && <Card><p className="text-sm text-rose-600">Couldn&apos;t load draw data: {error}</p></Card>}
      {!data && !error && <p className="text-sm text-stone-500">Loading draw history…</p>}
      {data && tab === "Plan" && <PlanTab data={data} onSave={(s) => updateSaved([...saved, ...s])} />}
      {data && tab === "Tickets" && <MyTicketsTab data={data} saved={saved} onDelete={(id) => updateSaved(saved.filter((s) => s.id !== id))} />}
      {data && tab === "Simulate" && <Simulator data={data} />}
      {data && tab === "Check" && <CheckTab data={data} />}
      {data && tab === "Stats" && <StatsTab data={data} />}
      {tab === "About" && <AboutTab />}
    </main>
  );
}
