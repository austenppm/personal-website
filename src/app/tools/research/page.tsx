"use client";

import { useState, useRef, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_RESEARCH_API_URL || "https://research-api.austenppm12345.workers.dev";

interface Section {
  title: string;
  content: string;
  table?: { headers: string[]; rows: string[][] };
}

interface ResearchResult {
  company_name: string;
  industry: string;
  generated_at: string;
  sections: Section[];
  sources: string[];
}

type Status = "idle" | "authenticating" | "authenticated" | "researching" | "done" | "error";

export default function ResearchPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [error, setError] = useState("");
  const reportRef = useRef<HTMLDivElement>(null);

  // The API checks the password before the company name, so an empty request
  // answers 401 for a wrong password and 400 for a right one.
  const authenticate = useCallback(async () => {
    setStatus("authenticating");
    try {
      const res = await fetch(`${API_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: "", password }),
      });
      const ok = res.status !== 401;
      setStatus(ok ? "authenticated" : "idle");
      setPasswordError(!ok);
    } catch {
      setStatus("idle");
      setPasswordError(true);
    }
  }, [password]);

  const startResearch = useCallback(async () => {
    if (!companyName.trim()) return;
    setStatus("researching");
    setProgress("リサーチを開始しています...");
    setError("");
    setResult(null);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      let response: Response;
      try {
        response = await fetch(`${API_URL}/api/research`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ company: companyName.trim(), password }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        clearTimeout(timeout);
        throw new Error(`fetch failed: ${fetchErr instanceof Error ? fetchErr.message : String(fetchErr)}`);
      }
      clearTimeout(timeout);

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body stream");

      const decoder = new TextDecoder();
      let fullJson = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "progress") {
                setProgress(parsed.message);
              } else if (parsed.type === "result") {
                fullJson = JSON.stringify(parsed.data);
                setResult(parsed.data);
                setStatus("done");
              } else if (parsed.type === "error") {
                throw new Error(parsed.message);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }
      }

      if (!fullJson) {
        throw new Error("Stream ended without result");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
      setError(msg);
      setStatus("error");
    }
  }, [companyName, password]);

  const downloadPdf = useCallback(async () => {
    if (!reportRef.current || !result) return;
    const html2pdf = (await import("html2pdf.js")).default;
    html2pdf()
      .set({
        margin: [15, 15, 15, 15],
        filename: `${result.company_name}_調査レポート.pdf`,
        image: { type: "jpeg", quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      } as Record<string, unknown>)
      .from(reportRef.current)
      .save();
  }, [result]);

  if (status === "idle" || status === "authenticating") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950">
        <div className="w-full max-w-sm rounded-xl border border-stone-800 bg-stone-900 p-8 shadow-2xl">
          <h1 className="mb-6 text-center text-lg font-semibold text-stone-200">
            Access Required
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setPasswordError(false); }}
            onKeyDown={(e) => e.key === "Enter" && authenticate()}
            placeholder="Password"
            className={`w-full rounded-lg border bg-stone-800 px-4 py-3 text-stone-200 placeholder-stone-500 outline-none transition ${
              passwordError ? "border-red-500" : "border-stone-700 focus:border-amber-500"
            }`}
            autoFocus
          />
          {passwordError && (
            <p className="mt-2 text-sm text-red-400">Incorrect password</p>
          )}
          <button
            onClick={authenticate}
            className="mt-4 w-full rounded-lg bg-amber-600 py-3 font-medium text-white transition hover:bg-amber-500"
          >
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-950 text-stone-200">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-stone-100">
            企業調査ツール
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Company Research Tool — Powered by Gemini + Web Search
          </p>
        </header>

        <div className="mb-8 flex gap-3">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && status !== "researching" && startResearch()}
            placeholder="会社名を入力 (例: ENEOS, トヨタ自動車, Sony)"
            className="flex-1 rounded-lg border border-stone-700 bg-stone-800 px-4 py-3 text-stone-200 placeholder-stone-500 outline-none focus:border-amber-500"
            disabled={status === "researching"}
            autoFocus
          />
          <button
            onClick={startResearch}
            disabled={status === "researching" || !companyName.trim()}
            className="rounded-lg bg-amber-600 px-6 py-3 font-medium text-white transition hover:bg-amber-500 disabled:opacity-40 disabled:hover:bg-amber-600"
          >
            {status === "researching" ? "調査中..." : "調査開始"}
          </button>
        </div>

        {status === "researching" && (
          <div className="mb-8 rounded-lg border border-stone-800 bg-stone-900 p-6">
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              <span className="text-stone-300">{progress}</span>
            </div>
          </div>
        )}

        {status === "error" && (
          <div className="mb-8 rounded-lg border border-red-800 bg-red-950/50 p-6">
            <p className="text-red-300">{error}</p>
            <button
              onClick={() => setStatus("authenticated")}
              className="mt-3 text-sm text-red-400 underline hover:text-red-300"
            >
              Try again
            </button>
          </div>
        )}

        {status === "done" && result && (
          <>
            <div className="mb-6 flex justify-end">
              <button
                onClick={downloadPdf}
                className="flex items-center gap-2 rounded-lg bg-stone-800 px-5 py-2.5 text-sm font-medium text-stone-200 transition hover:bg-stone-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDFダウンロード
              </button>
            </div>

            <div
              ref={reportRef}
              className="rounded-xl border border-stone-800 bg-white p-10 text-stone-900"
              style={{ fontFamily: "'Noto Sans JP', sans-serif" }}
            >
              <h1 className="mb-1 text-2xl font-bold text-stone-900">
                {result.company_name}
              </h1>
              <p className="mb-1 text-sm text-stone-500">
                {result.industry}
              </p>
              <p className="mb-8 text-xs text-stone-400">
                調査日: {result.generated_at}
              </p>
              <hr className="mb-8 border-stone-200" />

              {result.sections.map((section, i) => (
                <div key={i} className="mb-8">
                  <h2 className="mb-3 text-lg font-bold text-stone-800 border-l-4 border-amber-500 pl-3">
                    {section.title}
                  </h2>

                  {section.table && (
                    <table className="mb-4 w-full border-collapse text-sm">
                      <thead>
                        <tr>
                          {section.table.headers.map((h, hi) => (
                            <th
                              key={hi}
                              className="border border-stone-300 bg-stone-100 px-3 py-2 text-left font-semibold"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {section.table.rows.map((row, ri) => (
                          <tr key={ri}>
                            {row.map((cell, ci) => (
                              <td key={ci} className="border border-stone-300 px-3 py-2">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-stone-700">
                    {section.content}
                  </div>
                </div>
              ))}

              {result.sources.length > 0 && (
                <div className="mt-10 border-t border-stone-200 pt-6">
                  <h2 className="mb-3 text-lg font-bold text-stone-800 border-l-4 border-amber-500 pl-3">
                    情報源 / Sources
                  </h2>
                  <ul className="list-disc pl-6 text-xs text-stone-500 space-y-1">
                    {result.sources.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
