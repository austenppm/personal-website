"use client";

// Shared UI pieces for the lotto tool's tabs.

import { GAMES, type Draw, type GameKey, type Ticket } from "./lotto";

export const KEYS: GameKey[] = ["loto6", "loto7", "mini"];
export const yen = (n: number) => `¥${n.toLocaleString("en-US")}`;
export const pct = (p: number) => `${(p * 100).toFixed(1)}%`;

export type Data = Record<GameKey, Draw[]>;

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode) — keep in memory only
  }
}

export const BALL_COLORS: Record<GameKey, string> = {
  loto6: "border-amber-400 text-amber-800 bg-amber-50",
  loto7: "border-rose-400 text-rose-800 bg-rose-50",
  mini: "border-orange-400 text-orange-800 bg-orange-50",
};

export function Ball({ n, game, hit, bonus }: { n: number; game: GameKey; hit?: boolean; bonus?: boolean }) {
  const base = "inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums";
  const style = hit
    ? "border-transparent bg-gradient-to-br from-amber-400 via-orange-400 to-rose-400 text-white shadow"
    : bonus
      ? "border-dashed border-stone-400 bg-white text-stone-600"
      : BALL_COLORS[game];
  return <span className={`${base} ${style}`}>{n}</span>;
}

export function Row({ t, game, draw }: { t: Ticket; game: GameKey; draw?: Draw }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {t.map((n) => (
        <Ball key={n} n={n} game={game} hit={draw?.n.includes(n)} bonus={draw?.b.includes(n)} />
      ))}
    </div>
  );
}

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-stone-200/80 bg-white/70 p-5 shadow-sm backdrop-blur ${className}`}>
      {children}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-stone-50 px-2 py-2">
      <div className="text-stone-500">{label}</div>
      <div className="font-semibold text-stone-900">{value}</div>
      {sub && <div className="text-stone-400">{sub}</div>}
    </div>
  );
}

export function GamePicker({ value, onChange }: { value: GameKey; onChange: (k: GameKey) => void }) {
  return (
    <div className="flex gap-1 rounded-full bg-stone-100 p-1 text-sm">
      {KEYS.map((k) => (
        <button key={k} onClick={() => onChange(k)} className={`flex-1 rounded-full px-3 py-1.5 ${value === k ? "bg-white font-semibold shadow-sm" : "text-stone-500"}`}>
          {GAMES[k].name}
        </button>
      ))}
    </div>
  );
}

/** Tap-to-pick number grid. */
export function NumberGrid({
  max,
  picked,
  onToggle,
}: {
  max: number;
  picked: number[];
  onToggle: (n: number) => void;
}) {
  return (
    <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-10">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          onClick={() => onToggle(n)}
          className={`h-9 rounded-full border text-sm tabular-nums ${
            picked.includes(n) ? "border-transparent bg-gradient-to-br from-amber-400 to-rose-400 font-semibold text-white" : "border-stone-300 bg-white hover:bg-stone-50"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
