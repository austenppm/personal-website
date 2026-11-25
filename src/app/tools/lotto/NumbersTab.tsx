"use client";

// Numbers 3 / Numbers 4: picks, saved tickets, a history checker and stats.
// Draw history loads when the tab is first opened (~550 KB per game).

import { useEffect, useMemo, useState } from "react";
import {
  BET_NAMES,
  NGAMES,
  PRIZE_NAMES,
  allowed,
  averagePrizes,
  chance,
  digitStats,
  generate,
  label,
  payoutRate,
  popularity,
  prize,
  prizeOf,
  width,
  type Bet,
  type NDraw,
  type NGame,
  type NKey,
} from "./numbers";
import { Card, Stat, load, loadDraws, pct, store, yen } from "./ui";

const NKEYS: NKey[] = ["numbers3", "numbers4"];
const VIEWS = ["Picks", "Tickets", "Check", "Stats"] as const;
type View = (typeof VIEWS)[number];

interface SavedNumbers {
  id: string;
  savedAt: string;
  game: NKey;
  bet: Bet;
  targetNo: number; // draw these tickets are for
  tickets: string[];
}

const pill = (on: boolean) => `flex-1 rounded-full px-3 py-1.5 ${on ? "bg-white font-semibold shadow-sm" : "text-stone-500"}`;
const chip = (on: boolean) =>
  `rounded-full px-3 py-1 text-xs ${on ? "bg-stone-900 font-semibold text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`;
const primary = "rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 px-5 py-2 text-sm font-semibold text-white shadow hover:opacity-90 disabled:opacity-40";
const secondary = "rounded-full border border-stone-300 bg-white px-5 py-2 text-sm font-semibold hover:bg-stone-50 disabled:opacity-50";

/** A ticket as digit tiles; `win` lights them up. */
function Digits({ t, win, game }: { t: string; win?: boolean; game: NKey }) {
  const base = "inline-flex h-9 w-8 items-center justify-center rounded-lg border-2 text-base font-semibold tabular-nums";
  const style = win
    ? "border-transparent bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow"
    : game === "numbers3"
      ? "border-sky-400 bg-sky-50 text-sky-800"
      : "border-violet-400 bg-violet-50 text-violet-800";
  return (
    <span className="inline-flex gap-1">
      {[...t].map((c, i) => <span key={i} className={`${base} ${style}`}>{c}</span>)}
    </span>
  );
}

function BetPicker({ g, value, onChange }: { g: NGame; value: Bet; onChange: (b: Bet) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
      {g.bets.map((b) => (
        <button key={b} onClick={() => onChange(b)} className={pill(value === b)}>{BET_NAMES[b]}</button>
      ))}
    </div>
  );
}

const BET_HELP: Record<Bet, string> = {
  straight: "All digits in the right order.",
  box: "The same digits in any order. Pays less, wins more often.",
  set: "Half straight, half box: the exact order pays the bigger set prize, any other order the smaller one.",
  mini: "The last two digits of Numbers 3, in order.",
};

export default function NumbersTab() {
  const [key, setKey] = useState<NKey>(() => load("lotto.numbers.game", "numbers3"));
  const [view, setView] = useState<View>("Picks");
  const [data, setData] = useState<Partial<Record<NKey, NDraw[]>>>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState<SavedNumbers[]>(() => load("lotto.numbers.saved", []));

  useEffect(() => {
    if (data[key]) return;
    loadDraws<NDraw>(key)
      .then((res) => setData((d) => ({ ...d, [key]: res.draws })))
      .catch((e) => setError(String(e)));
  }, [key, data]);

  const choose = (k: NKey) => {
    setKey(k);
    store("lotto.numbers.game", k);
  };
  const updateSaved = (next: SavedNumbers[]) => {
    setSaved(next);
    store("lotto.numbers.saved", next);
  };

  const g = NGAMES[key];
  const draws = data[key];

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
          {NKEYS.map((k) => (
            <button key={k} onClick={() => choose(k)} className={pill(key === k)}>{NGAMES[k].name}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-1">
          {VIEWS.map((v) => (
            <button key={v} onClick={() => setView(v)} className={chip(view === v)}>
              {v}
              {v === "Tickets" && saved.length > 0 && <span className="ml-1 opacity-70">{saved.length}</span>}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-stone-500">
          {g.digits} digits from 0–9, drawn Monday to Friday · ¥{g.price} a ticket
        </p>
      </Card>

      {error && <Card><p className="text-sm text-rose-600">Couldn&apos;t load draw data: {error}</p></Card>}
      {!draws && !error && <p className="px-1 text-sm text-stone-500">Loading {g.name} history…</p>}
      {draws && view === "Picks" && <Picks key={key} g={g} draws={draws} onSave={(s) => updateSaved([...saved, s])} />}
      {view === "Tickets" && <Tickets data={data} saved={saved} onDelete={(id) => updateSaved(saved.filter((s) => s.id !== id))} />}
      {draws && view === "Check" && <Check key={key} g={g} draws={draws} />}
      {draws && view === "Stats" && <Stats g={g} draws={draws} />}
    </div>
  );
}

// ---------------- Picks ----------------

function Picks({ g, draws, onSave }: { g: NGame; draws: NDraw[]; onSave: (s: SavedNumbers) => void }) {
  const [bet, setBet] = useState<Bet>(() => load(`lotto.numbers.bet.${g.key}`, "box"));
  const [count, setCount] = useState<number>(() => load("lotto.numbers.count", 5));
  const [smart, setSmart] = useState(true);
  const [seed, setSeed] = useState(0);
  const [saved, setSavedFlag] = useState(false);

  const pop = useMemo(() => popularity(g, draws, bet), [g, draws, bet]);
  // `seed` only forces a fresh draw when "New picks" is pressed.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tickets = useMemo(() => generate(g, smart ? pop : null, count, bet), [g, pop, count, bet, smart, seed]);
  const rate = useMemo(() => payoutRate(g, draws, bet), [g, draws, bet]);

  const winChance = tickets.reduce((a, t) => a + chance(g, bet, t), 0); // distinct tickets never win the same draw
  const worth = tickets.length ? tickets.reduce((a, t) => a + pop.multiplier(t), 0) / tickets.length : 1;
  const next = draws.at(-1)!.no + 1;

  const changeBet = (b: Bet) => {
    setBet(b);
    store(`lotto.numbers.bet.${g.key}`, b);
    setSavedFlag(false);
  };
  const changeCount = (v: number) => {
    const n = Math.max(1, Math.min(50, Math.floor(v) || 1));
    setCount(n);
    store("lotto.numbers.count", n);
    setSavedFlag(false);
  };
  const save = () => {
    onSave({ id: `${Date.now()}-${g.key}`, savedAt: new Date().toISOString(), game: g.key, bet, targetNo: next, tickets });
    setSavedFlag(true);
  };

  return (
    <>
      <Card>
        <BetPicker g={g} value={bet} onChange={changeBet} />
        <p className="mt-2 text-xs text-stone-500">{BET_HELP[bet]}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm">
          <label className="flex items-center gap-2">
            <button className="h-7 w-7 rounded-full border border-stone-300 hover:bg-stone-100" onClick={() => changeCount(count - 1)}>−</button>
            <input
              type="number"
              min={1}
              max={50}
              inputMode="numeric"
              value={count}
              onChange={(e) => changeCount(Number(e.target.value))}
              className="w-14 rounded-lg border border-stone-300 bg-white py-0.5 text-center tabular-nums"
            />
            <button className="h-7 w-7 rounded-full border border-stone-300 hover:bg-stone-100" onClick={() => changeCount(count + 1)}>+</button>
            tickets
          </label>
          <div className="flex gap-1">
            <button onClick={() => { setSmart(true); setSavedFlag(false); }} className={chip(smart)}>Unpopular</button>
            <button onClick={() => { setSmart(false); setSavedFlag(false); }} className={chip(!smart)}>Random</button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => { setSeed(seed + 1); setSavedFlag(false); }} className={primary}>New picks</button>
          <button onClick={save} disabled={saved || !tickets.length} className={secondary}>{saved ? "Saved ✓" : "Save for next draw"}</button>
        </div>
      </Card>

      <Card>
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-lg font-semibold">{g.name} · {BET_NAMES[bet]}</h3>
          <span className="text-xs text-stone-500">draw #{next} · Mon–Fri</span>
        </div>
        <div className="space-y-2">
          {tickets.map((t) => (
            <div key={t} className="flex flex-wrap items-center gap-3">
              <Digits t={t} game={g.key} />
              <span className="text-xs text-stone-500">
                {label(bet, t)} · 1 in {Math.round(1 / chance(g, bet, t)).toLocaleString("en-US")} · worth ~{pop.multiplier(t).toFixed(2)}×
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
          <Stat label="cost" value={yen(tickets.length * g.price)} />
          <Stat label="any win" value={pct(winChance)} sub={`1 in ${Math.round(1 / winChance).toLocaleString("en-US")}`} />
          <Stat label="expected back" value={pct(rate * worth)} sub={`average ticket: ${pct(rate)}`} />
        </div>
        <p className="mt-3 text-xs text-stone-500">
          Every number is equally likely to come up. “Worth” is learned from {draws.length.toLocaleString("en-US")} past payouts:
          numbers fewer people play pay more when they win. It makes losing slower, not winning likelier.
        </p>
      </Card>
    </>
  );
}

// ---------------- Saved tickets ----------------

function Tickets({ data, saved, onDelete }: { data: Partial<Record<NKey, NDraw[]>>; saved: SavedNumbers[]; onDelete: (id: string) => void }) {
  if (!saved.length)
    return <Card><p className="text-sm text-stone-600">No saved Numbers tickets yet. Make picks and tap “Save for next draw”.</p></Card>;
  return (
    <div className="space-y-4">
      {[...saved].reverse().map((s) => {
        const g = NGAMES[s.game];
        const draw = data[s.game]?.find((d) => d.no === s.targetNo);
        const results = draw ? s.tickets.map((t) => prize(s.bet, t, draw.n)) : [];
        const won = draw ? results.reduce((a, p) => a + (p ? prizeOf(g, draw, p) : 0), 0) : 0;
        return (
          <Card key={s.id}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-semibold">{g.name} {BET_NAMES[s.bet]} · draw #{s.targetNo}</h3>
              <button onClick={() => onDelete(s.id)} className="text-xs text-stone-400 hover:text-rose-600">remove</button>
            </div>
            {draw ? (
              <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span>{draw.date} result:</span>
                <Digits t={draw.n} game={s.game} />
              </div>
            ) : (
              <p className="mb-3 text-xs text-stone-500">
                {data[s.game] ? `Waiting for draw #${s.targetNo}. The result shows up here once it’s drawn.` : `Open ${g.name} once to load its results.`}
              </p>
            )}
            <div className="space-y-2">
              {s.tickets.map((t, i) => (
                <div key={t} className="flex flex-wrap items-center gap-3">
                  <Digits t={t} game={s.game} win={!!results[i]} />
                  {draw && (
                    <span className="text-xs text-stone-600">
                      {results[i] ? `${PRIZE_NAMES[results[i]!]} ${yen(prizeOf(g, draw, results[i]!))}` : "no win"}
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

function Check({ g, draws }: { g: NGame; draws: NDraw[] }) {
  const [bet, setBet] = useState<Bet>("straight");
  const [input, setInput] = useState("");
  const w = width(g, bet);
  const t = input.slice(0, w);

  const result = useMemo(() => {
    if (t.length !== w || !allowed(bet, t)) return null;
    const wins = draws.flatMap((d) => {
      const p = prize(bet, t, d.n);
      return p ? [{ d, p }] : [];
    });
    return { wins, won: wins.reduce((a, x) => a + prizeOf(g, x.d, x.p), 0), expected: draws.length * chance(g, bet, t) };
  }, [t, w, bet, draws, g]);

  return (
    <>
      <Card>
        <BetPicker g={g} value={bet} onChange={(b) => { setBet(b); setInput(input.slice(0, width(g, b))); }} />
        <p className="mt-3 text-sm text-stone-600">Type {w} digits to see how they would have done in every past draw.</p>
        <input
          inputMode="numeric"
          autoComplete="off"
          placeholder={"0123".slice(0, w)}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/\D/g, "").slice(0, w))}
          className="mt-3 w-32 rounded-xl border border-stone-300 bg-white px-3 py-2 text-center text-2xl tracking-[0.4em] tabular-nums"
        />
        {t.length === w && !allowed(bet, t) && (
          <p className="mt-2 text-xs text-rose-600">Every digit is the same, so {BET_NAMES[bet].toLowerCase()} isn&apos;t sold on it. Use straight.</p>
        )}
      </Card>
      {result && (
        <Card>
          <p className="text-sm">
            {label(bet, t)} across {draws.length.toLocaleString("en-US")} draws: <b>{result.wins.length}</b> wins (expected{" "}
            {result.expected.toFixed(1)}). Spent {yen(draws.length * g.price)}, won <b>{yen(result.won)}</b>.
          </p>
          <ul className="mt-3 space-y-1 text-xs text-stone-600">
            {result.wins.slice(-10).reverse().map(({ d, p }) => (
              <li key={d.no}>
                #{d.no} {d.date} — drawn {d.n}, {PRIZE_NAMES[p]} {yen(prizeOf(g, d, p))}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

// ---------------- Stats ----------------

function Stats({ g, draws }: { g: NGame; draws: NDraw[] }) {
  const last = draws.at(-1)!;
  // The React Compiler memoizes these per game.
  const st = digitStats(g, draws);
  const avg = averagePrizes(g, draws);
  const traits = popularity(g, draws, "straight").traits();
  const rates = Object.fromEntries(g.bets.map((b) => [b, payoutRate(g, draws, b)]));
  const TRAIT_NAMES: Record<string, string> = {
    "date=true": "looks like a date (MMDD)",
    "ways=1": "all digits the same",
    "ways=6": g.digits === 4 ? "two pairs (1122)" : "all digits different",
    "ways=3": "one pair",
    "lead0=true": "starts with 0",
    "run=true": "a run like 123",
    [`high=${g.digits}`]: "every digit 5 or higher",
    "high=0": "every digit 4 or lower",
  };
  const shown = traits.filter((x) => TRAIT_NAMES[x.name]);
  const chipCls = "rounded-full bg-stone-100 px-2 py-0.5 text-xs tabular-nums";

  return (
    <>
      <Card>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-stone-500">Latest #{last.no} ({last.date})</span>
          <Digits t={last.n} game={g.key} />
        </div>
        <p className="mt-2 text-xs text-stone-500">
          {g.prizes.filter((k) => prizeOf(g, last, k)).map((k) => `${PRIZE_NAMES[k]} ${yen(prizeOf(g, last, k))}`).join(" · ")}
        </p>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Odds and returns</h3>
        <table className="w-full text-sm tabular-nums">
          <thead className="text-xs text-stone-500">
            <tr>
              <th className="py-1 text-left font-normal">Bet</th>
              <th className="py-1 text-right font-normal">Odds</th>
              <th className="py-1 text-right font-normal">Average prize</th>
              <th className="py-1 text-right font-normal">Back per ¥200</th>
            </tr>
          </thead>
          <tbody>
            {g.bets.map((b) => {
              const t = b === "mini" ? "12" : "1234".slice(0, g.digits);
              return (
                <tr key={b} className="border-t border-stone-100">
                  <td className="py-1">{BET_NAMES[b]}</td>
                  <td className="py-1 text-right">1 in {Math.round(1 / chance(g, b, t)).toLocaleString("en-US")}</td>
                  <td className="py-1 text-right">
                    {b === "set" ? `${yen(avg.set_straight)} / ${yen(avg.set_box)}` : yen(avg[b])}
                  </td>
                  <td className="py-1 text-right">{pct(rates[b])}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-stone-500">
          Last 500 draws. Box odds and prizes are for {g.digits === 3 ? "6-way (all digits different)" : "24-way (all digits different)"}; set shows exact / any other order.
        </p>
      </Card>
      <Card>
        <h3 className="mb-1 font-semibold">What pays more</h3>
        <p className="mb-3 text-xs text-stone-500">Straight prize when drawn, compared with an average number, from every past payout.</p>
        <ul className="space-y-1 text-sm">
          {shown.map((x) => (
            <li key={x.name} className="flex justify-between gap-3">
              <span>{TRAIT_NAMES[x.name]}</span>
              <span className={`tabular-nums ${x.mult < 1 ? "text-rose-600" : "text-emerald-700"}`}>{x.mult.toFixed(2)}×</span>
            </li>
          ))}
        </ul>
      </Card>
      <Card>
        <h3 className="mb-2 font-semibold">Each position, last 100 draws</h3>
        <div className="space-y-3 text-sm">
          {Array.from({ length: g.digits }, (_, pos) => {
            const col = st.filter((s) => s.position === pos);
            const byRecent = [...col].sort((a, b) => b.recent - a.recent);
            const byGap = [...col].sort((a, b) => b.gap - a.gap);
            return (
              <div key={pos}>
                <div className="mb-1 text-stone-500">Digit {pos + 1}</div>
                <div className="flex flex-wrap gap-1">
                  {byRecent.slice(0, 3).map((s) => <span key={`h${s.digit}`} className={chipCls}>hot {s.digit} ×{s.recent}</span>)}
                  {byRecent.slice(-3).reverse().map((s) => <span key={`c${s.digit}`} className={chipCls}>cold {s.digit} ×{s.recent}</span>)}
                  {byGap.slice(0, 2).map((s) => <span key={`g${s.digit}`} className={chipCls}>{s.digit} unseen {s.gap}</span>)}
                </div>
              </div>
            );
          })}
          <p className="text-xs text-stone-500">Expected about 10 each. Hot and cold digits don&apos;t predict the next draw.</p>
        </div>
      </Card>
    </>
  );
}
