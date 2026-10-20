export interface Env {
  GEMINI_API_KEY: string;
  ALLOWED_ORIGIN: string;
  PASSWORD: string;
}

const CORS_HEADERS = (origin: string) => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
});

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin") || "";
    const allowedOrigins = [env.ALLOWED_ORIGIN, "http://localhost:3000", "http://localhost:3001", "http://localhost:3002"];
    const corsOrigin = allowedOrigins.includes(origin) ? origin : env.ALLOWED_ORIGIN;
    const cors = CORS_HEADERS(corsOrigin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const url = new URL(request.url);

    if (url.pathname === "/api/research" && request.method === "POST") {
      return handleResearch(request, env, cors);
    }

    if (url.pathname === "/" || url.pathname === "") {
      return new Response(RESEARCH_PAGE_HTML(), {
        headers: { "Content-Type": "text/html;charset=UTF-8" },
      });
    }

    return new Response("Not found", { status: 404, headers: cors });
  },
};

async function handleResearch(
  request: Request,
  env: Env,
  cors: Record<string, string>
): Promise<Response> {
  let body: { company?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON", { status: 400, headers: cors });
  }

  if (!env.PASSWORD || body.password !== env.PASSWORD) {
    return new Response("Unauthorized", { status: 401, headers: cors });
  }

  const company = body.company?.trim();
  if (!company) {
    return new Response(JSON.stringify({ error: "会社名を入力してください" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }
  if (company.length > 100) {
    return new Response(JSON.stringify({ error: "会社名が長すぎます" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  }

  const send = (_type: string, _payload: unknown) => {};

  try {
    const sections = await runResearch(company, env.GEMINI_API_KEY, send);

    const result = {
      company_name: company,
      industry: sections.industry || "—",
      generated_at: new Date().toISOString().split("T")[0],
      sections: sections.sections,
      sources: sections.sources,
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}

interface ResearchOutput {
  industry: string;
  sections: Array<{
    title: string;
    content: string;
    table?: { headers: string[]; rows: string[][] };
  }>;
  sources: string[];
}

const MODEL_CANDIDATES = [
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-1.5-flash",
];

let resolvedModel: string | null = null;

async function findWorkingModel(apiKey: string): Promise<string> {
  if (resolvedModel) return resolvedModel;

  for (const model of MODEL_CANDIDATES) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${apiKey}`;
    try {
      const res = await fetch(url, { method: "GET" });
      if (res.ok) {
        resolvedModel = model;
        return model;
      }
    } catch {
      continue;
    }
  }

  resolvedModel = MODEL_CANDIDATES[0];
  return resolvedModel;
}

async function callGeminiOnce(
  model: string,
  prompt: string,
  apiKey: string,
  useGrounding: boolean
): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const requestBody: Record<string, unknown> = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 16384 },
  };
  if (useGrounding) {
    requestBody.tools = [{ google_search: {} }];
  }
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
}

async function callGemini(
  prompt: string,
  apiKey: string,
  useGrounding: boolean = true
): Promise<string> {
  const maxRetries = 3;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const model = await findWorkingModel(apiKey);
    const res = await callGeminiOnce(model, prompt, apiKey, useGrounding);

    if (res.status === 404) {
      resolvedModel = null;
      continue;
    }

    if (res.status === 503 || res.status === 429) {
      // Try next model in the list
      const currentIdx = MODEL_CANDIDATES.indexOf(model);
      if (currentIdx < MODEL_CANDIDATES.length - 1) {
        resolvedModel = MODEL_CANDIDATES[currentIdx + 1];
        continue;
      }
      // No more models — wait and retry current
      await new Promise((r) => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API error ${res.status}: ${errText}`);
    }

    const data: any = await res.json();
    const parts = data.candidates?.[0]?.content?.parts;
    if (!parts) {
      const blocked = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
      if (blocked) throw new Error(`Gemini blocked: ${blocked}`);
      throw new Error("No response from Gemini");
    }

    return parts.map((p: any) => p.text || "").join("");
  }

  throw new Error("Gemini API failed after retries — all models busy. Please try again in a minute.");
}

function parseJson(raw: string, fallback: any): any {
  try {
    const cleaned = raw.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleaned);
  } catch {
    return fallback;
  }
}

async function runResearch(
  company: string,
  apiKey: string,
  send: (type: string, data: unknown) => void
): Promise<ResearchOutput> {
  send("progress", `入力を確認中...`);

  const validatePrompt = `あなたは企業名バリデーターです。以下の入力が実在する企業・法人・組織の名前（略称・通称・英語名含む）かどうか判定してください。
入力: "${company.replace(/"/g, '')}"
JSONだけ返してください: {"valid": true} または {"valid": false}`;

  let skipResearch = false;
  try {
    const valRaw = await callGemini(validatePrompt, apiKey, false);
    const valResult = parseJson(valRaw, { valid: true });
    if (valResult.valid === false) skipResearch = true;
  } catch {
    // Validation failed (rate limit, block, etc) — proceed with research anyway
  }
  if (skipResearch) {
    throw new Error(`「${company}」は実在する企業として認識できませんでした。正式な企業名で再度お試しください。`);
  }

  send("progress", `Geminiに接続中...`);

  const overviewPrompt = `あなたは日本の大手企業を調査する専門リサーチアナリストです。以下の企業について、IR資料・有価証券報告書・公式プレスリリース・ニュース記事を元に、正確で詳細な情報を日本語で調査してください。数値は最新の公開情報を使ってください。

企業名: ${company}

以下の情報を調査し、JSON形式で返してください。マークダウンのコードブロックは使わず、純粋なJSONだけを返してください。

重要ルール:
- すべてのフィールドに必ず情報を入れてください。空文字列""や空配列[]は禁止です。
- 正確な情報が見つからない場合は、業界知識・公開情報に基づく推定を「（推定）」と明記して記載してください。
- business_segmentsは最低3つ以上記載してください。

{
  "industry": "業界（例: エネルギー、IT、製造業）",
  "overview": "会社の概要説明。事業の全体像、歴史的背景、現在の戦略的方向性を含めて8-12文で詳しく記述",
  "segments_overview": "事業セグメント全体の概説。主力事業と収益構造を3-5文で記述",
  "metrics": {
    "正式名称": "...",
    "設立": "...",
    "本社所在地": "...",
    "代表者": "代表取締役社長の氏名と就任年",
    "従業員数（単体）": "人数と時点",
    "従業員数（連結）": "人数と時点",
    "連結売上高": "金額と会計期",
    "連結営業利益": "金額と会計期",
    "連結子会社数": "...",
    "持分法適用会社数": "...",
    "上場区分": "証券コードを含む",
    "主要事業": "...",
    "海外売上比率": "...",
    "時価総額": "概算",
    "主要拠点": "国内外の主要拠点"
  },
  "business_segments": [
    {"name": "セグメント名", "revenue": "売上高", "description": "事業内容の詳細（3-4文）"}
  ],
  "sources": ["情報源のURL or 名前"]
}`;

  const orgPrompt = `あなたは日本の大手企業のIT・セキュリティ体制を調査する専門アナリストです。

企業名: ${company}

この企業の以下について、できるだけ具体的な部署名・人名・体制を含めて日本語で詳しく調査してください。JSON形式で返してください。マークダウンのコードブロックは使わず、純粋なJSONだけを返してください。

重要ルール:
- すべてのフィールドに必ず情報を入れてください。空文字列""や空配列[]は禁止です。
- 正確な情報が見つからない場合は、業界の一般的な傾向や公開情報に基づく推定を「（推定）」と明記して記載してください。
- key_personnelは最低5名、subsidiariesは最低3社記載してください。

{
  "org_structure": "組織構造の詳細説明。持株会社体制の有無、主要事業部門の構成、意思決定構造を含めて8-12文で記述",
  "subsidiaries_overview": "グループ会社・子会社の全体像を3-5文で概説",
  "it_organization": "IT・デジタル部門の詳細。CIO/CDO/CTOの有無、IT子会社の存在、IT部門の規模・名称・役割を含めて8-12文で記述",
  "it_strategy": "IT・デジタル戦略の詳細。DX中期計画、AI活用方針（生成AI・エージェントAI含む）、クラウド戦略（AWS/Azure/GCP等の採用状況）、データ活用基盤、IT投資額や方針を含めて10-15文で記述",
  "security_posture": "サイバーセキュリティ体制の詳細。CSIRT/SOCの有無、セキュリティ方針（ゼロトラスト等）、過去のインシデントとその対応、セキュリティ投資や認証取得状況を含めて8-12文で記述",
  "key_personnel": [
    {"name": "氏名", "title": "役職（正式名称）", "note": "担当領域と経歴の要約"}
  ],
  "subsidiaries": [
    {"name": "会社名", "role": "グループ内での役割", "employees": "従業員数（わかれば）", "note": "特記事項"}
  ],
  "tech_stack": "判明している技術スタック・導入ソリューション（ERP、クラウド、セキュリティ製品、AI基盤等）を詳しく列挙（5-8文）",
  "sources": ["情報源"]
}`;

  const newsPrompt = `あなたは日本の大手企業の動向と競争環境を調査する専門アナリストです。

企業名: ${company}

この企業の最新の動向と業界での立ち位置を日本語で詳しく調査してください。JSON形式で返してください。マークダウンのコードブロックは使わず、純粋なJSONだけを返してください。

重要ルール:
- すべてのフィールドに必ず情報を入れてください。空文字列""や空配列[]は禁止です。
- 正確な情報が見つからない場合は、業界の一般的な傾向や公開情報に基づく推定を「（推定）」と明記して記載してください。
- recent_newsは最低5件、partnershipsは最低3件、competitorsは最低3社記載してください。

{
  "recent_news": [
    {"date": "YYYY/MM頃", "headline": "ニュース概要", "detail": "詳細説明（3-4文）", "significance": "この動向の戦略的意味"}
  ],
  "news_summary": "最新ニュース全体のまとめ。主要な動向と経営への影響を3-5文で概説",
  "partnerships": [
    {"partner": "提携先", "date": "時期", "description": "提携内容と目的（2-3文）"}
  ],
  "partnerships_summary": "提携・アライアンス戦略の全体像を3-5文で概説",
  "financial_trend": "直近3-5年の業績トレンド。売上・利益の推移、成長率、注目すべき財務指標の変化を8-12文で詳しく記述",
  "competitors": [
    {"name": "競合企業名", "comparison": "この企業との比較ポイント（3-4文）"}
  ],
  "competitors_summary": "競合環境の全体像と差別化ポイントを3-5文で概説",
  "market_position": "市場ポジションの詳細分析。市場シェア、業界ランキング、差別化要因、強みと弱みを8-12文で記述",
  "future_outlook": "今後の見通し・中期経営計画・成長戦略を5-8文で記述",
  "sources": ["情報源"]
}`;

  send("progress", `${company} の基本情報・組織・市場動向を同時調査中...`);

  const [overviewRaw, orgRaw, newsRaw] = await Promise.all([
    callGemini(overviewPrompt, apiKey).then((r) => { send("progress", "基本情報・事業セグメント ✓"); return r; }),
    callGemini(orgPrompt, apiKey).then((r) => { send("progress", "組織構造・IT戦略・セキュリティ ✓"); return r; }),
    callGemini(newsPrompt, apiKey).then((r) => { send("progress", "ニュース・競合・市場分析 ✓"); return r; }),
  ]);

  send("progress", "ARGUS営業戦略を分析中...");

  const overview = parseJson(overviewRaw, { industry: "—", overview: overviewRaw, metrics: {}, business_segments: [], sources: [] });
  const org_pre = parseJson(orgRaw, { org_structure: "", it_organization: "", it_strategy: "", security_posture: "", key_personnel: [], subsidiaries: [], tech_stack: "" });
  const news_pre = parseJson(newsRaw, { recent_news: [], financial_trend: "", market_position: "", future_outlook: "" });

  const researchSummary = `企業名: ${company}
業界: ${overview.industry || "不明"}
概要: ${overview.overview || ""}
組織構造: ${org_pre.org_structure || ""}
IT組織: ${org_pre.it_organization || ""}
IT戦略: ${org_pre.it_strategy || ""}
セキュリティ体制: ${org_pre.security_posture || ""}
技術スタック: ${org_pre.tech_stack || ""}
業績トレンド: ${news_pre.financial_trend || ""}
市場ポジション: ${news_pre.market_position || ""}
今後の見通し: ${news_pre.future_outlook || ""}`;

  const salesPrompt = `あなたはSENDA（AX Security）のARGUS営業戦略アナリストです。以下の企業調査結果を元に、ARGUSの営業戦略を日本語で詳細に分析してください。

■ SENDA-ARGUS製品概要:
SENDA-ARGUSは「AI Execution Trust Engine」です。AIそのもののセキュリティではなく、AIが業務を自律的に実行する際の「実行権限の統制基盤」です。

ARGUSの5つのコアアーキテクチャ:
1. Delegated Authority Engine: 人間→AIへの権限委譲を構造化。誰が、どのAIに、何を、どこまで実行させてよいかを定義
2. Execution Firewall: AIのActionを実行直前にALLOW / DENY / HUMAN APPROVALで制御。Policy違反・権限超過を実行前にブロック
3. Transaction Mandate: AIが実行するTransaction（発注・承認・ERP更新・契約・在庫変更等）に対して、金額/数量/取引先/目的/期限等の制約を強制
4. Device Authenticity: AIがPhysical設備（Robot/Edge/PLC/IoT）へ命令を出す際の接続先デバイスの真正性確認
5. Evidence Layer: 誰が権限を与え、どのPolicyで判定し、何が実行されたかを改ざん不能な形で記録・証明

ARGUSの3つの実行領域:
- Digital: AI Agent → MCP/API → 社内System/ERP/Database（Agent Runtime統制）
- Transaction: AI → 発注/承認/調達/契約/決済（取引実行の権限統制）
- Physical: AI → Robot/Edge/PLC/IoT/設備（物理デバイスへの実行統制）

ARGUSのポジショニング:
- 既存のAI、ERP、Cloud、セキュリティ製品を「置き換えない」
- それらの「間に入る」Independent Trust Layer
- 「AIを止めるSecurity」ではなく「AIに安全に権限を与えるInfrastructure」

■ 調査対象企業の情報:
${researchSummary}

■ 以下のJSON形式で分析結果を返してください。マークダウンのコードブロックは使わず、純粋なJSONだけを返してください。

重要ルール:
- すべてのフィールドに必ず詳細な情報を入れてください。空文字列""や空配列[]は禁止です。
- 企業の具体的な状況（DX戦略、AI活用状況、組織体制、業界特性）に基づいて具体的に分析してください。一般論は不要です。
- 各テキストフィールドは最低8文以上で詳しく記述してください。

{
  "executive_summary": "エグゼクティブサマリー（BLUF）。この企業に対するARGUS営業の結論を最初に3-5文で簡潔に述べる。適合度、最優先ユースケース、最初にアプローチすべき部署、推奨アクションを含める。経営陣が30秒で判断できる密度で書く",
  "product_fit": "ARGUS適合性の総合分析。この企業のAI活用状況・DX戦略・IT体制・セキュリティ方針と、ARGUSの5つのコアアーキテクチャがどう噛み合うかを具体的に15-20文で分析。Digital/Transaction/Physicalの3領域それぞれについて、この企業における具体的なユースケースを挙げて説明",
  "fit_score": "適合度（高/中/低）とその理由を1文で",
  "use_cases": [
    {"area": "Digital/Transaction/Physical", "title": "ユースケース名", "scenario": "この企業の具体的な業務におけるARGUS適用シナリオを5-8文で詳述。どの部署の、どの業務フローで、AIがどのようなActionを取り、ARGUSがどう制御するかまで具体的に", "argus_components": "関連するARGUSコンポーネント（Delegated Authority / Execution Firewall / Transaction Mandate / Device Authenticity / Evidence Layer）", "priority": "優先度（高/中/低）"}
  ],
  "org_strategy": "組織攻略戦略。どの部署・どの役職に、どの順番でアプローチすべきかを具体的に15-20文で分析。最初のコンタクト先、技術評価者、予算決裁者、事業スポンサーを特定し、それぞれへの説明ポイントを含める。IT子会社がある場合はその活用方法も含める",
  "approach_routes": [
    {"priority": "優先順位（1,2,3...）", "target": "対象部署・役職", "message": "この相手に伝えるべきメッセージ（2-3文）", "argus_entry": "ARGUSのどの機能から入るか"}
  ],
  "poc_proposal": "3段階PoC提案の全体像。Phase 1（Agent/MCP）→ Phase 2（Transaction）→ Phase 3（Physical AI）の流れを、この企業の具体的な業務に当てはめて15-20文で詳述",
  "poc_phases": [
    {"phase": "Phase 1/2/3", "theme": "テーマ", "target_system": "対象システム・業務", "question": "このPhaseで答えるべき最大の問い", "argus_role": "ARGUSの役割", "risk_level": "リスクレベル（低/中/高）", "duration": "想定期間"}
  ],
  "talking_points": "初回面談でのトークポイント。最初の一言、核心の問いかけ、ARGUSの説明（3文以内）、この企業特有の刺さるポイントを含めて10-15文で記述。「AIを導入しませんか」ではなく「すでに進めているAI活用の次に必要な実行権限の統制」という切り口",
  "objection_handling": [
    {"objection": "想定される反論・懸念", "response": "対応方法（2-3文）"}
  ],
  "long_term_vision": "中長期的なアカウント戦略。この企業グループ全体への展開可能性、子会社・関連会社・取引先への波及効果、業界全体への影響を8-12文で記述",
  "sources": ["分析に使用した情報源や根拠"]
}`;

  const salesRaw = await callGemini(salesPrompt, apiKey);
  send("progress", "ARGUS営業戦略分析 ✓");

  send("progress", "レポートを生成中...");
  const org = parseJson(orgRaw, { org_structure: orgRaw, it_organization: "", it_strategy: "", security_posture: "", key_personnel: [], subsidiaries: [], tech_stack: "", sources: [] });
  const news = parseJson(newsRaw, { recent_news: [], partnerships: [], financial_trend: "", competitors: [], market_position: "", future_outlook: "", sources: [] });

  const metricsEntries = Object.entries(overview.metrics || {});
  const metricsTable = metricsEntries.length > 0
    ? { headers: ["項目", "値"], rows: metricsEntries.map(([k, v]) => [k, String(v)]) }
    : undefined;

  const segmentsTable = (overview.business_segments || []).length > 0
    ? {
        headers: ["セグメント", "売上高", "事業内容"],
        rows: (overview.business_segments as any[]).map((s: any) => [s.name || "", s.revenue || "", s.description || ""]),
      }
    : undefined;

  const personnelTable = (org.key_personnel || []).length > 0
    ? {
        headers: ["氏名", "役職", "備考"],
        rows: (org.key_personnel as any[]).map((p: any) => [p.name || "", p.title || "", p.note || ""]),
      }
    : undefined;

  const subsidiariesTable = (org.subsidiaries || []).length > 0
    ? {
        headers: ["会社名", "役割", "従業員数", "備考"],
        rows: (org.subsidiaries as any[]).map((s: any) => [s.name || "", s.role || "", s.employees || "—", s.note || ""]),
      }
    : undefined;

  const newsTable = (news.recent_news || []).length > 0
    ? {
        headers: ["時期", "概要", "詳細", "戦略的意味"],
        rows: (news.recent_news as any[]).map((n: any) => [n.date || "", n.headline || "", n.detail || "", n.significance || ""]),
      }
    : undefined;

  const partnershipsTable = (news.partnerships || []).length > 0
    ? {
        headers: ["提携先", "時期", "内容"],
        rows: (news.partnerships as any[]).map((p: any) => [p.partner || "", p.date || "", p.description || ""]),
      }
    : undefined;

  const competitorsTable = (news.competitors || []).length > 0
    ? {
        headers: ["競合企業", "比較ポイント"],
        rows: (news.competitors as any[]).map((c: any) => [c.name || "", c.comparison || ""]),
      }
    : undefined;

  const sections = [
    {
      title: "1. 会社概要",
      content: overview.overview || "",
      table: metricsTable,
    },
    {
      title: "2. 事業セグメント",
      content: overview.segments_overview || "",
      table: segmentsTable,
    },
    {
      title: "3. 組織構造",
      content: org.org_structure || "",
    },
    {
      title: "4. グループ会社・子会社",
      content: org.subsidiaries_overview || "",
      table: subsidiariesTable,
    },
    {
      title: "5. 経営陣・キーパーソン",
      content: "",
      table: personnelTable,
    },
    {
      title: "6. IT・デジタル組織",
      content: org.it_organization || "",
    },
    {
      title: "7. IT・デジタル戦略",
      content: org.it_strategy || "",
    },
    {
      title: "8. 技術スタック・導入ソリューション",
      content: org.tech_stack || "",
    },
    {
      title: "9. セキュリティ体制",
      content: org.security_posture || "",
    },
    {
      title: "10. 最新ニュース・動向",
      content: news.news_summary || "",
      table: newsTable,
    },
    {
      title: "11. 提携・パートナーシップ",
      content: news.partnerships_summary || "",
      table: partnershipsTable,
    },
    {
      title: "12. 業績トレンド",
      content: news.financial_trend || "",
    },
    {
      title: "13. 業界ポジション・市場分析",
      content: news.market_position || "",
    },
    {
      title: "14. 競合分析",
      content: news.competitors_summary || "",
      table: competitorsTable,
    },
    {
      title: "15. 今後の見通し・成長戦略",
      content: news.future_outlook || "",
    },
  ].map((s) => (!s.content && !s.table) ? { ...s, content: "該当情報なし" } : s);

  // Sales intelligence
  const sales = parseJson(salesRaw, {
    executive_summary: "", product_fit: "", fit_score: "", use_cases: [], org_strategy: "",
    approach_routes: [], poc_proposal: "", poc_phases: [],
    talking_points: "", objection_handling: [], long_term_vision: "", sources: []
  });

  const useCasesTable = (sales.use_cases || []).length > 0
    ? {
        headers: ["領域", "ユースケース", "シナリオ", "ARGUSコンポーネント", "優先度"],
        rows: (sales.use_cases as any[]).map((u: any) => [u.area || "", u.title || "", u.scenario || "", u.argus_components || "", u.priority || ""]),
      }
    : undefined;

  const approachTable = (sales.approach_routes || []).length > 0
    ? {
        headers: ["優先順位", "対象部署・役職", "メッセージ", "ARGUS入口"],
        rows: (sales.approach_routes as any[]).map((a: any) => [a.priority || "", a.target || "", a.message || "", a.argus_entry || ""]),
      }
    : undefined;

  const pocTable = (sales.poc_phases || []).length > 0
    ? {
        headers: ["Phase", "テーマ", "対象システム", "最大の問い", "ARGUSの役割", "リスク", "期間"],
        rows: (sales.poc_phases as any[]).map((p: any) => [p.phase || "", p.theme || "", p.target_system || "", p.question || "", p.argus_role || "", p.risk_level || "", p.duration || ""]),
      }
    : undefined;

  const objectionTable = (sales.objection_handling || []).length > 0
    ? {
        headers: ["想定される反論・懸念", "対応方法"],
        rows: (sales.objection_handling as any[]).map((o: any) => [o.objection || "", o.response || ""]),
      }
    : undefined;

  // BLUF + Sales first, then detailed research
  const allSections = [
    {
      title: "1. エグゼクティブサマリー（BLUF）",
      content: sales.executive_summary || "",
    },
    {
      title: "2. ARGUS適合性分析",
      content: (sales.product_fit || "") + (sales.fit_score ? "\n\n適合度: " + sales.fit_score : ""),
    },
    {
      title: "3. ARGUSユースケース分析",
      content: "",
      table: useCasesTable,
    },
    {
      title: "4. 組織攻略戦略・アプローチ",
      content: sales.org_strategy || "",
      table: approachTable,
    },
    {
      title: "5. 3段階PoC提案",
      content: sales.poc_proposal || "",
      table: pocTable,
    },
    {
      title: "6. 初回面談トークポイント",
      content: sales.talking_points || "",
    },
    {
      title: "7. 想定Q&A・反論対応",
      content: "",
      table: objectionTable,
    },
    {
      title: "8. 中長期アカウント戦略",
      content: sales.long_term_vision || "",
    },
    ...sections.map((s, i) => ({ ...s, title: `${i + 9}. ${s.title.replace(/^\d+\.\s*/, "")}` })),
  ].map((s) => (!s.content && !s.table) ? { ...s, content: "該当情報なし" } : s);

  const allSources = [
    ...(overview.sources || []),
    ...(org.sources || []),
    ...(news.sources || []),
    ...(sales.sources || []),
  ];
  const uniqueSources = [...new Set(allSources)].filter(Boolean);

  return {
    industry: overview.industry || "—",
    sections: allSections,
    sources: uniqueSources,
  };
}

function RESEARCH_PAGE_HTML(): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>企業調査ツール</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"><\/script>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Noto Sans JP',sans-serif;background:#0c0a09;color:#e7e5e4;min-height:100vh}
.container{max-width:56rem;margin:0 auto;padding:3rem 1.5rem}
h1{font-size:1.5rem;font-weight:700;color:#f5f5f4}
.sub{font-size:.875rem;color:#78716c;margin-top:.25rem}
.input-row{display:flex;gap:.75rem;margin:2rem 0}
input[type=text],input[type=password]{flex:1;background:#1c1917;border:1px solid #44403c;border-radius:.5rem;padding:.75rem 1rem;color:#e7e5e4;font-size:1rem;outline:none;font-family:inherit}
input:focus{border-color:#d97706}
button{background:#d97706;color:#fff;border:none;border-radius:.5rem;padding:.75rem 1.5rem;font-weight:500;cursor:pointer;font-family:inherit;font-size:1rem}
button:hover{background:#b45309}
button:disabled{opacity:.4;cursor:default}
.btn-dl{background:#292524;color:#e7e5e4;font-size:.875rem;display:inline-flex;align-items:center;gap:.5rem}
.btn-dl:hover{background:#44403c}
.progress{background:#1c1917;border:1px solid #292524;border-radius:.5rem;padding:1.5rem;margin-bottom:2rem}
.prog-header{display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem}
.spinner{width:1.25rem;height:1.25rem;border:2px solid #d97706;border-top-color:transparent;border-radius:50%;animation:spin 1s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.prog-log{list-style:none;padding:0;margin:0}
.prog-log li{font-size:.875rem;color:#a8a29e;padding:.25rem 0;opacity:0;animation:fadeIn .3s ease forwards}
.prog-log li.done{color:#d97706}
.prog-log li:last-child{color:#e7e5e4}
@keyframes fadeIn{to{opacity:1}}
.error-box{background:rgba(127,29,29,.3);border:1px solid #991b1b;border-radius:.5rem;padding:1.5rem;margin-bottom:2rem;color:#fca5a5}
.error-box a{color:#fca5a5;text-decoration:underline;cursor:pointer}
.report{background:#fff;color:#1c1917;border-radius:.75rem;padding:2.5rem;border:1px solid #292524}
.report h1{color:#1c1917;font-size:1.5rem}
.report .meta{font-size:.875rem;color:#78716c;margin-bottom:.5rem}
.report .date{font-size:.75rem;color:#a8a29e;margin-bottom:2rem}
.report hr{border:none;border-top:1px solid #e7e5e4;margin-bottom:2rem}
.section{margin-bottom:2rem}
.section h2{font-size:1.125rem;font-weight:700;color:#292524;border-left:4px solid #d97706;padding-left:.75rem;margin-bottom:.75rem}
.section p,.section .content{font-size:.875rem;line-height:1.7;color:#44403c;white-space:pre-wrap}
.section .content ul,.section .content ol{white-space:normal}
.section .content li{margin-bottom:.25rem}
.section .content strong{color:#1c1917}
table{width:100%;border-collapse:collapse;font-size:.875rem;margin-bottom:1rem}
th{background:#f5f5f4;border:1px solid #d6d3d1;padding:.5rem .75rem;text-align:left;font-weight:600}
td{border:1px solid #d6d3d1;padding:.5rem .75rem}
.sales-divider{margin:2.5rem 0;padding:.75rem;background:#f5f5f4;border:1px solid #d6d3d1;border-radius:.5rem;text-align:center;font-weight:600;color:#78716c;font-size:.875rem;letter-spacing:.05em}
.sources{margin-top:2.5rem;border-top:1px solid #e7e5e4;padding-top:1.5rem}
.sources h2{font-size:1.125rem;font-weight:700;color:#292524;border-left:4px solid #d97706;padding-left:.75rem;margin-bottom:.75rem}
.sources li{font-size:.75rem;color:#78716c;margin-bottom:.25rem}
.auth-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh}
.auth-box{width:100%;max-width:24rem;background:#1c1917;border:1px solid #292524;border-radius:.75rem;padding:2rem;box-shadow:0 25px 50px rgba(0,0,0,.5)}
.auth-box h1{text-align:center;font-size:1.125rem;margin-bottom:1.5rem}
.auth-box input{width:100%;margin-bottom:.25rem}
.auth-box button{width:100%;margin-top:1rem}
.pw-err{color:#f87171;font-size:.875rem;margin-top:.5rem}
.dl-row{display:flex;justify-content:flex-end;margin-bottom:1.5rem}
.hidden{display:none}
</style>
</head>
<body>
<div id="auth" class="auth-wrap">
<div class="auth-box">
<h1>Access Required</h1>
<input type="password" id="pw" placeholder="Password" autofocus>
<div id="pw-err" class="pw-err hidden">Incorrect password</div>
<button onclick="auth()">Enter</button>
</div>
</div>

<div id="app" class="container hidden">
<header>
<h1>企業調査ツール</h1>
<p class="sub">Company Research Tool — Powered by Gemini + Web Search</p>
</header>
<div class="input-row">
<input type="text" id="company" placeholder="会社名を入力 (例: ENEOS, トヨタ自動車, カプコン)">
<button id="go-btn" onclick="startResearch()">調査開始</button>
</div>
<div id="progress" class="progress hidden"><div class="prog-header"><div class="spinner"></div><span id="prog-text">調査中...</span></div><ul id="prog-log" class="prog-log"></ul></div>
<div id="error" class="error-box hidden"></div>
<div id="dl-row" class="dl-row hidden"><button class="btn-dl" onclick="downloadPdf()">PDFダウンロード</button></div>
<div id="report" class="report hidden"></div>
</div>

<script>
let PASSWORD = '';
let resultData = null;

// The server checks the password before the company name, so an empty
// request answers 401 for a wrong password and 400 for a right one.
async function auth() {
  const pw = document.getElementById('pw').value;
  const res = await fetch('/api/research', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({company: '', password: pw})
  });
  if (res.status !== 401) {
    PASSWORD = pw;
    document.getElementById('auth').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('company').focus();
  } else {
    document.getElementById('pw-err').classList.remove('hidden');
  }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !document.getElementById('auth').classList.contains('hidden')) auth();
});

async function startResearch() {
  const company = document.getElementById('company').value.trim();
  if (!company) return;
  const btn = document.getElementById('go-btn');
  btn.disabled = true; btn.textContent = '調査中...';
  document.getElementById('progress').classList.remove('hidden');
  document.getElementById('error').classList.add('hidden');
  document.getElementById('dl-row').classList.add('hidden');
  document.getElementById('report').classList.add('hidden');
  document.getElementById('prog-log').innerHTML = '';
  document.getElementById('prog-text').textContent = '調査中...';
  document.querySelector('#progress .spinner').style.display = '';
  resultData = null;

  try {
    const log = document.getElementById('prog-log');
    function addStep(msg) {
      const prev = log.lastElementChild;
      if (prev) prev.classList.add('done');
      const li = document.createElement('li');
      li.textContent = msg;
      log.appendChild(li);
    }

    addStep('入力を確認中...');
    const fetchStart = Date.now();
    let stepIdx = 0;
    const timedSteps = [
      {msg: 'Geminiに接続中...', at: 3000},
      {msg: company + ' の基本情報・組織・市場動向を同時調査中...', at: 6000},
      {msg: '会社概要・事業セグメントを分析中...', at: 12000},
      {msg: '組織構造・IT戦略・セキュリティ体制を調査中...', at: 20000},
      {msg: '最新ニュース・競合・市場分析を取得中...', at: 32000},
      {msg: 'ARGUS営業戦略を分析中...', at: 45000},
      {msg: 'ユースケース・PoC・アプローチ戦略を生成中...', at: 55000},
      {msg: 'データを統合中...', at: 70000},
    ];
    const ticker = setInterval(function() {
      if (stepIdx >= timedSteps.length) { clearInterval(ticker); return; }
      if (Date.now() - fetchStart >= timedSteps[stepIdx].at) {
        addStep(timedSteps[stepIdx].msg);
        stepIdx++;
      }
    }, 500);

    const res = await fetch('/api/research', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({company, password: PASSWORD})
    });
    clearInterval(ticker);
    addStep('レポートを生成中...');
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'HTTP ' + res.status);

    const prev = log.lastElementChild;
    if (prev) prev.classList.add('done');
    const li = document.createElement('li');
    li.textContent = '調査完了 ✓';
    li.style.color = '#16a34a';
    li.style.fontWeight = '600';
    log.appendChild(li);
    document.querySelector('#progress .spinner').style.display = 'none';
    document.getElementById('prog-text').textContent = '完了';

    await new Promise(function(r){ setTimeout(r, 1500); });
    document.getElementById('progress').classList.add('hidden');

    resultData = json;
    renderReport(json);
    btn.disabled = false; btn.textContent = '調査開始';
  } catch(e) {
    document.getElementById('error').innerHTML = e.message + '<br><a onclick="startResearch()">Try again</a>';
    document.getElementById('error').classList.remove('hidden');
    document.getElementById('progress').classList.add('hidden');
    btn.disabled = false; btn.textContent = '調査開始';
  }
}

document.getElementById('company').addEventListener('keydown', e => {
  if (e.key === 'Enter') startResearch();
});

function renderReport(r) {
  let h = '<h1>' + esc(r.company_name) + '</h1>';
  h += '<p class="meta">' + esc(r.industry) + '</p>';
  h += '<p class="date">調査日: ' + esc(r.generated_at) + '</p><hr>';
  for (let si = 0; si < r.sections.length; si++) {
    const s = r.sections[si];
    if (s.title && s.title.startsWith('9.')) {
      h += '<div class="sales-divider">企業調査詳細</div>';
    }
    h += '<div class="section"><h2>' + esc(s.title) + '</h2>';
    if (s.table) {
      h += '<table><thead><tr>';
      for (const th of s.table.headers) h += '<th>' + esc(th) + '</th>';
      h += '</tr></thead><tbody>';
      for (const row of s.table.rows) {
        h += '<tr>';
        for (const td of row) h += '<td>' + md(td) + '</td>';
        h += '</tr>';
      }
      h += '</tbody></table>';
    }
    if (s.content) h += '<div class="content">' + md(s.content) + '</div>';
    h += '</div>';
  }
  if (r.sources && r.sources.length) {
    h += '<div class="sources"><h2>情報源 / Sources</h2><ul>';
    for (const s of r.sources) h += '<li>' + esc(s) + '</li>';
    h += '</ul></div>';
  }
  document.getElementById('report').innerHTML = h;
  document.getElementById('report').classList.remove('hidden');
  document.getElementById('dl-row').classList.remove('hidden');
}

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

function md(s) {
  if (!s) return '';
  let t = esc(s);
  t = t.replace(/\\*\\*(.+?)\\*\\*/g, '<strong>$1</strong>');
  t = t.replace(/(?:^|\\n)#{1,4}\\s+(.+)/g, function(m,p){ return '<strong>' + p + '</strong>'; });
  t = t.replace(/(?:^|\\n)---(?:\\n|$)/g, '<hr style="border:none;border-top:1px solid #d6d3d1;margin:.75rem 0">');
  const lines = t.split('\\n');
  let out = '', inUl = false, inOl = false;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    const bm = l.match(/^[\\*\\-]\\s+(.+)/);
    const nm = l.match(/^\\d+\\.\\s+(.+)/);
    if (bm) {
      if (!inUl) { if (inOl) { out += '</ol>'; inOl = false; } out += '<ul style="margin:.5rem 0;padding-left:1.5rem">'; inUl = true; }
      out += '<li>' + bm[1] + '</li>';
    } else if (nm) {
      if (!inOl) { if (inUl) { out += '</ul>'; inUl = false; } out += '<ol style="margin:.5rem 0;padding-left:1.5rem">'; inOl = true; }
      out += '<li>' + nm[1] + '</li>';
    } else {
      if (inUl) { out += '</ul>'; inUl = false; }
      if (inOl) { out += '</ol>'; inOl = false; }
      out += l + '\\n';
    }
  }
  if (inUl) out += '</ul>';
  if (inOl) out += '</ol>';
  return out;
}

function downloadPdf() {
  if (!resultData) return;
  html2pdf().set({
    margin: [15,15,15,15],
    filename: resultData.company_name + '_調査レポート.pdf',
    image: {type:'jpeg',quality:0.95},
    html2canvas: {scale:2,useCORS:true},
    jsPDF: {unit:'mm',format:'a4',orientation:'portrait'}
  }).from(document.getElementById('report')).save();
}
<\/script>
</body>
</html>`;
}
