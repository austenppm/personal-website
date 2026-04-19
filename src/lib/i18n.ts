export type Locale = "en" | "ja";

export type Content = {
  nav: {
    about: string;
    research: string;
    experience: string;
    projects: string;
    contact: string;
  };
  hero: {
    badge: string;
    title1: string;
    title2: string;
    subtitle: (uni: string) => { before: string; uni: string; after: string };
    cta: string;
    resumeJa: string;
    resumeOverseas: string;
    moreFormats: string;
    uni: string;
  };
  about: {
    eyebrow: string;
    title: string;
    paragraphs: string[];
    languagesLabel: string;
    stackLabel: string;
    languages: { label: string; level: string }[];
  };
  research: {
    eyebrow: string;
    title: string;
    thesisLabel: string;
    thesisTitle: string;
    venue: string;
    advisor: string;
    date: string;
    paragraphs: string[];
    tags: string[];
  };
  experience: {
    eyebrow: string;
    title: string;
    items: {
      period: string;
      role: string;
      place: string;
      blurb: string;
      tags?: string[];
    }[];
  };
  projects: {
    eyebrow: string;
    title: string;
    more: { before: string; after: string };
    items: {
      title: string;
      blurb: string;
    }[];
  };
  contact: {
    eyebrow: string;
    title: string;
    subtitle: string;
    resumeLabel: string;
    resumesHeading: string;
    resumesSubtitle: string;
    resumes: {
      href: string;
      title: string;
      subtitle: string;
    }[];
    footer: (year: number) => string;
  };
  langToggle: {
    label: string;
    other: string;
  };
};

export const content: Record<Locale, Content> = {
  en: {
    nav: {
      about: "About",
      research: "Research",
      experience: "Experience",
      projects: "Projects",
      contact: "Contact",
    },
    hero: {
      badge: "Open to internships & part-time work in Kyoto",
      title1: "Hi, I’m",
      title2: "Pyii Phyo Maung.",
      subtitle: (uni) => ({
        before: "CS student at ",
        uni,
        after:
          " from Myanmar. I just finished my undergraduate thesis at the Symbol Emergence Systems Lab on multi-agent reinforcement learning and emergent communication, and concurrently I’m a software engineer at Senren, Inc., shipping full-stack features on GCP with Next.js, FastAPI, and Playwright. On the side I’ve built an offline Overleaf clone, a Flutter life-gamification app, an LLM that picks music for photos, a handwritten OCaml interpreter, a pipelined CPU in Verilog, and a few smaller tools. Outside of code I’ve worked at a Kyoto hotel and a kaiseki restaurant, tutored English one-on-one, and I still lead bespoke English walking tours around the city with City Unscripted. I like compilers, programming languages, and human languages — I speak five of the latter.",
      }),
      cta: "See my work",
      resumeJa: "Résumé · Japanese style (履歴書)",
      resumeOverseas: "Résumé · Overseas style (CV)",
      moreFormats: "More formats below →",
      uni: "Kyoto University",
    },
    about: {
      eyebrow: "About",
      title: "A little about me.",
      paragraphs: [
        "I was born in Yangon, went to Yangon International School, and moved to Japan in 2019 to study at Kyoto University, where I’m in the Computer Science course of the Faculty of Engineering’s Informatics department.",
        "Alongside my studies I work as a software engineer at Senren, shipping full-stack features and automation workflows on top of GCP. On the research side, I just finished my B.Eng. thesis on scaling emergent communication in multi-agent RL at the Symbol Emergence Systems Lab.",
        "I also build a lot of things for fun. An offline Overleaf clone so I can write LaTeX without the internet. A Flutter life-gamification app that turns daily habits into an RPG. An LLM-driven app that picks music for the mood of a photograph. A handwritten OCaml interpreter. A small pipelined CPU in Verilog. A CLI weather tool. Most of them live on GitHub (see Projects below).",
        "Outside of code I’ve worked as a hotel staffer, a kaiseki-restaurant waiter, and a City Unscripted tour guide in Kyoto — a pretty nice way to see your adopted city through fresh eyes every week.",
      ],
      languagesLabel: "Languages",
      stackLabel: "Stack",
      languages: [
        { label: "English", level: "Fluent" },
        { label: "Burmese", level: "Native" },
        { label: "Japanese", level: "JLPT N1" },
        { label: "Spanish", level: "Conversational" },
        { label: "Chinese", level: "Basic" },
      ],
    },
    research: {
      eyebrow: "Research",
      title: "Scaling MARL-CPC.",
      thesisLabel: "B.Eng. Thesis",
      thesisTitle:
        "Scaling MARL-CPC: Achieving Decentralized Coordination in Multi-Agent Environments",
      venue: "Symbol Emergence Systems Lab, Kyoto University",
      advisor: "Advisor: Prof. Tadahiro Taniguchi",
      date: "February 2026",
      paragraphs: [
        "MARL-CPC is a variational take on Collective Predictive Coding that gives multi-agent reinforcement-learning agents a reward-independent reason to communicate: each agent learns to send messages that let the group mutually predict one another’s observations, so communication emerges even in non-cooperative settings.",
        "Prior work showed this works for two agents exchanging a single message. My thesis extends the framework to multi-round message passing and investigates how it scales to 3–5 agents, comparing two CPC loss strategies — Final Round (loss only on the last round) and Every Round (loss accumulated each round).",
        "Across a non-cooperative Bandit coordination task, Every Round’s advantage over Final Round and prior work grew substantially with agent count — evidence that dense per-round learning signal is essential for scaling CPC-based emergent communication. Full training and evaluation pipeline implemented in PyTorch.",
      ],
      tags: [
        "Multi-Agent RL",
        "Variational Inference",
        "Emergent Communication",
        "PyTorch",
      ],
    },
    experience: {
      eyebrow: "Experience",
      title: "What I’ve been up to.",
      items: [
        {
          period: "Sep 2025 — Present",
          role: "Software Engineer",
          place: "Senren, Inc.",
          blurb:
            "Part-time, hybrid. Full-stack feature work and automation infrastructure on GCP. Day-to-day spans Next.js / React on the front-end, FastAPI and Python on the back-end, Playwright for automation, PostgreSQL on Cloud SQL, and Cloud Run for orchestration.",
          tags: ["Next.js", "FastAPI", "Playwright", "GCP", "PostgreSQL"],
        },
        {
          period: "Apr 2020 — Present",
          role: "B.Eng., Computer Science",
          place: "Kyoto University — Faculty of Engineering, Informatics",
          blurb:
            "Coursework across systems, algorithms, programming languages, signal processing, and digital design. Wrote an OCaml interpreter, a MIPS-style processor in Verilog, and several data-heavy Python projects.",
          tags: ["OCaml", "C", "Python", "Verilog"],
        },
        {
          period: "2023 · ~6 months",
          role: "English Tutor (Private)",
          place: "Private tutoring — high school students, Kyoto",
          blurb:
            "Private one-on-one English tutoring for Japanese high-school students — reading comprehension, writing, and conversation, tailored per student.",
          tags: ["English", "Tutoring"],
        },
        {
          period: "Aug 2023 — Present",
          role: "Local Tour Host",
          place: "City Unscripted — Kyoto",
          blurb:
            "Lead bespoke walking experiences for international visitors across Kyoto in English. Plan routes on the fly based on each guest’s interests, pace, and the weather.",
          tags: ["English", "Japanese", "Hospitality"],
        },
        {
          period: "Aug 2022",
          role: "Software Engineering Intern",
          place: "Konica Minolta — tomoLinks",
          blurb:
            "Worked on tomoLinks, an EdTech platform for Japanese schools. Contributed to feature work and bug hunts alongside full-time engineers.",
          tags: ["Internship", "EdTech"],
        },
        {
          period: "Oct 2022",
          role: "Waiter",
          place: "Sowaka — kaiseki restaurant, Kyoto",
          blurb:
            "Waitstaff at the kaiseki restaurant inside the Sowaka ryokan in Gion. Sharpened my keigo and learned the rhythm of Japanese hospitality from the inside.",
        },
        {
          period: "Sep 2022 — Jan 2023",
          role: "Hotel Staff",
          place: "Mitsui Garden Hotel",
          blurb: "Part-time work at a Kyoto hotel.",
        },
      ],
    },
    projects: {
      eyebrow: "Projects",
      title: "Things I’ve built.",
      more: { before: "More on ", after: "." },
      items: [
        {
          title: "Rutilea Music",
          blurb:
            "An app that uses an LLM to pick music matching the mood of a photograph. Experiments with multimodal prompting and vibe-based retrieval.",
        },
        {
          title: "OCaml Interpreter",
          blurb:
            "A from-scratch interpreter for a subset of ML, written in OCaml. Covers lexing, parsing, type inference, and evaluation.",
        },
        {
          title: "Audio Signal Processing",
          blurb:
            "Coursework-meets-curiosity: filters, FFT-based analysis, and sound synthesis experiments in Python.",
        },
        {
          title: "Image Recognition",
          blurb:
            "Classic CV pipelines and a CNN-based classifier — built while learning how much of computer vision is really just clever preprocessing.",
        },
        {
          title: "Restaurant Database",
          blurb:
            "Full-stack web app over a relational database: schema design, queries, and a small CRUD UI on top.",
        },
        {
          title: "SIMPLE CPU (Verilog)",
          blurb:
            "A simple pipelined processor implemented in Verilog for Kyoto U’s computer architecture course. Runs a small ISA end-to-end.",
        },
        {
          title: "Life Quest",
          blurb:
            "A Flutter + Firebase life-gamification app that turns your habits into an RPG: ten D&D-style stats, XP and streaks, AI-assisted stat detection, and a quest system for multi-step goals.",
        },
        {
          title: "Offline LaTeX Compiler",
          blurb:
            "A local Overleaf clone — split-pane Monaco editor with live PDF preview, file tree, drag-and-drop uploads, and auto-compile on save. Node/Express back-end, React front-end, works offline on Mac/Linux/Windows.",
        },
        {
          title: "Weather CLI",
          blurb:
            "Tiny Python CLI that hits the Open-Meteo API with optional IP-based geolocation, then renders a readable forecast in the terminal. Zero third-party deps — just the stdlib.",
        },
      ],
    },
    contact: {
      eyebrow: "Contact",
      title: "Let’s talk.",
      subtitle:
        "Internships, side projects, a good coffee in Kyoto — email is the fastest way to reach me.",
      resumeLabel: "Résumé (PDF)",
      resumesHeading: "Resumes",
      resumesSubtitle:
        "Japan and overseas hiring use different formats, so both are here. The first two are modern CVs; the last two are the Japanese JIS-style 履歴書.",
      resumes: [
        {
          href: "/resume.pdf",
          title: "CV — English",
          subtitle: "Modern one-to-two-page format, for overseas applications.",
        },
        {
          href: "/resume-ja.pdf",
          title: "職務経歴書 — 日本語",
          subtitle: "Modern CV, Japanese — for companies that accept it.",
        },
        {
          href: "/rirekisho-ja.pdf",
          title: "履歴書 — 日本語 (JIS)",
          subtitle: "Standard Japanese JIS rirekisho form, in Japanese.",
        },
        {
          href: "/rirekisho-en.pdf",
          title: "Rirekisho — English labels",
          subtitle: "Same JIS form, with English field labels.",
        },
      ],
      footer: (year) =>
        `© ${year} Pyii Phyo Maung · Built with Next.js, Tailwind, and Framer Motion in Kyoto.`,
    },
    langToggle: {
      label: "EN",
      other: "日本語",
    },
  },

  ja: {
    nav: {
      about: "自己紹介",
      research: "研究",
      experience: "経歴",
      projects: "プロジェクト",
      contact: "連絡先",
    },
    hero: {
      badge: "京都でのインターン・アルバイト募集中",
      title1: "はじめまして、",
      title2: "ピー フォー マウン です。",
      subtitle: (uni) => ({
        before: "ミャンマー出身、",
        uni,
        after:
          "工学部情報学科 計算機科学コース所属。記号創発システム研究室でマルチエージェント強化学習と創発コミュニケーションを研究し、学士論文を執筆。並行して株式会社 Senren でソフトウェアエンジニアとして、GCP 上で Next.js／FastAPI／Playwright を用いたフルスタック開発に携わっています。個人では、オフラインで動く Overleaf クローン、Flutter 製のライフ・ゲーミフィケーションアプリ、写真の雰囲気に合う曲を LLM が選ぶアプリ、OCaml 製のインタプリタ、Verilog のパイプライン CPU などを制作してきました。コードの外では、京都のホテルや京町家の割烹料理店で働いた経験、英語の個人指導の経験もあり、現在も City Unscripted で英語のオーダーメイド京都ツアーを案内しています。コンパイラ、プログラミング言語、そして人間の言葉（5か国語話します）が好きです。",
      }),
      cta: "プロジェクトを見る",
      resumeJa: "履歴書（日本式・JIS様式）",
      resumeOverseas: "職務経歴書（海外式 CV）",
      moreFormats: "他の書式はこちら →",
      uni: "京都大学",
    },
    about: {
      eyebrow: "自己紹介",
      title: "自分について少し。",
      paragraphs: [
        "ヤンゴン生まれ。Yangon International School を卒業後、2019年に来日し、現在は京都大学工学部情報学科計算機科学コースに在籍しています。",
        "学業のかたわら、株式会社 Senren でソフトウェアエンジニアとして、GCP 上でフルスタック開発と自動化ワークフローの構築・運用を担当。研究面では、記号創発システム研究室でマルチエージェント強化学習におけるコミュニケーションの創発をテーマに学士論文を執筆しました。",
        "趣味のものづくりもたくさんあります。オフラインで動く Overleaf クローン、日々の習慣を RPG 化する Flutter 製アプリ、写真の雰囲気に合う曲を LLM が選ぶアプリ、OCaml 製のインタプリタ、Verilog の小さなパイプライン CPU、CLI の天気ツールなど。多くは GitHub で公開しています（下の〈プロジェクト〉参照）。",
        "コードの外では、ホテルスタッフ、懐石料理店のホールスタッフ、City Unscripted の英語ツアーガイドとしても働いてきました。毎週新しい視点で京都を歩けるのは、なかなかに贅沢な時間です。",
      ],
      languagesLabel: "言語",
      stackLabel: "技術スタック",
      languages: [
        { label: "English（英語）", level: "流暢" },
        { label: "မြန်မာ（ビルマ語）", level: "母語" },
        { label: "日本語", level: "JLPT N1" },
        { label: "Español（スペイン語）", level: "日常会話" },
        { label: "中文（中国語）", level: "基礎" },
      ],
    },
    research: {
      eyebrow: "研究",
      title: "MARL-CPC のスケーリング。",
      thesisLabel: "学士論文",
      thesisTitle:
        "Scaling MARL-CPC: Achieving Decentralized Coordination in Multi-Agent Environments（MARL-CPC のスケーリング：マルチエージェント環境における分散協調の実現）",
      venue: "京都大学 記号創発システム研究室",
      advisor: "指導教員：谷口 忠大 教授",
      date: "2026年2月",
      paragraphs: [
        "MARL-CPC は集合的予測符号化（Collective Predictive Coding）を変分推論で定式化した枠組みで、マルチエージェント強化学習のエージェントに「報酬に依存しない」コミュニケーション学習の動機を与えます。各エージェントは、互いの観測を相互に予測しあえるようなメッセージを学習するため、非協力的な環境でもコミュニケーションが創発します。",
        "先行研究では、2エージェント・1ラウンドの設定で有効性が示されていました。本研究ではこれをマルチラウンドのメッセージ交換へと拡張し、3〜5エージェントへのスケーラビリティを検証しました。CPC 損失の計算方法として Final Round（最終ラウンドのみで損失を計算）と Every Round（各ラウンドで累積）の2戦略を比較しています。",
        "非協力的 Bandit 協調タスクでの実験結果から、エージェント数が増えるほど Every Round の Final Round および先行研究に対する優位性が顕著に拡大することを示しました。すなわち「ラウンドごとの密な学習信号」が、CPC ベースのコミュニケーション創発を大規模なエージェント群にスケーリングする鍵であることを実証しました。学習・評価パイプラインは PyTorch で実装。",
      ],
      tags: [
        "マルチエージェント強化学習",
        "変分推論",
        "コミュニケーションの創発",
        "PyTorch",
      ],
    },
    experience: {
      eyebrow: "経歴",
      title: "これまでやってきたこと。",
      items: [
        {
          period: "2025年9月 〜 現在",
          role: "ソフトウェアエンジニア",
          place: "株式会社 Senren",
          blurb:
            "アルバイト・ハイブリッド勤務。GCP 上でのフルスタック開発と自動化基盤の整備を担当。フロントエンドは Next.js / React、バックエンドは FastAPI（Python）、自動化は Playwright、DB は Cloud SQL（PostgreSQL）、実行基盤は Cloud Run を中心に、機能開発と運用改善に取り組んでいます。",
          tags: ["Next.js", "FastAPI", "Playwright", "GCP", "PostgreSQL"],
        },
        {
          period: "2020年4月 〜 現在",
          role: "工学士（計算機科学）",
          place: "京都大学 工学部 情報学科",
          blurb:
            "システム・アルゴリズム・プログラミング言語・信号処理・デジタル回路設計を幅広く学習。OCaml によるインタプリタ、Verilog での MIPS 系プロセッサ、Python による各種データ処理プロジェクトなどを制作。",
          tags: ["OCaml", "C", "Python", "Verilog"],
        },
        {
          period: "2023年（約半年間）",
          role: "英語個人講師",
          place: "個人契約 — 高校生対象（京都）",
          blurb:
            "日本人高校生を対象にマンツーマンの英語指導（読解・ライティング・会話）を実施。生徒ごとにカリキュラムをカスタマイズ。",
          tags: ["English", "個別指導"],
        },
        {
          period: "2023年8月 〜 現在",
          role: "ローカルツアーガイド",
          place: "City Unscripted — 京都",
          blurb:
            "海外からの観光客向けに、京都のオーダーメイド英語ウォーキングツアーを担当。ゲストの興味・体力・天候に応じてルートをその場で組み立てます。",
          tags: ["English", "Japanese", "接客"],
        },
        {
          period: "2022年8月",
          role: "ソフトウェアエンジニア インターン",
          place: "コニカミノルタ株式会社 — tomoLinks",
          blurb:
            "教育現場向け EdTech プラットフォーム tomoLinks の開発チームで、社員エンジニアと並行して機能開発と不具合調査を担当。",
          tags: ["インターンシップ", "EdTech"],
        },
        {
          period: "2022年10月",
          role: "ホールスタッフ（接客）",
          place: "そわか — 懐石料理店（京都・祇園）",
          blurb:
            "祇園の旅館「そわか」内の懐石料理店にてホール・接客を担当。敬語と日本のホスピタリティのリズムを現場で学びました。",
        },
        {
          period: "2022年9月 〜 2023年1月",
          role: "ホテルスタッフ",
          place: "三井ガーデンホテル",
          blurb: "京都のホテルでのアルバイト。",
        },
      ],
    },
    projects: {
      eyebrow: "プロジェクト",
      title: "作ってきたもの。",
      more: { before: "その他は ", after: " にて。" },
      items: [
        {
          title: "Rutilea Music",
          blurb:
            "写真の雰囲気にあう音楽を LLM が選ぶアプリ。マルチモーダルなプロンプトと、ムードベースの楽曲検索を試作した作品です。",
        },
        {
          title: "OCaml インタプリタ",
          blurb:
            "ML のサブセット向けインタプリタを OCaml で実装。字句解析・構文解析・型推論・評価までを一通り自前で書きました。",
        },
        {
          title: "音響信号処理",
          blurb:
            "授業＋趣味で書いた Python のコード群。各種フィルタ、FFT を用いた解析、音合成の実験などを含みます。",
        },
        {
          title: "画像認識",
          blurb:
            "古典的 CV パイプラインと CNN ベースの分類器。コンピュータビジョンの多くは「丁寧な前処理」であることを実感したプロジェクト。",
        },
        {
          title: "レストラン DB",
          blurb:
            "リレーショナル DB を土台にしたフルスタック Web アプリ。スキーマ設計・クエリ・簡易 CRUD UI まで実装。",
        },
        {
          title: "SIMPLE CPU（Verilog）",
          blurb:
            "京大のコンピュータアーキテクチャの授業で実装した、Verilog によるシンプルなパイプライン CPU。自作 ISA をエンドツーエンドで実行できます。",
        },
        {
          title: "Life Quest",
          blurb:
            "Flutter + Firebase で開発した「人生の RPG 化」アプリ。D&D 風の10種類のステータス、XP とストリーク、AI によるステータス自動判定、マルチステップのクエスト機能などを搭載。",
        },
        {
          title: "オフライン LaTeX コンパイラ",
          blurb:
            "ローカルで動作する Overleaf クローン。Monaco エディタ＋ライブ PDF プレビューの分割ビュー、ファイルツリー、ドラッグ＆ドロップアップロード、保存時の自動コンパイルに対応。Node/Express + React 構成、Mac/Linux/Windows で完全オフライン動作。",
        },
        {
          title: "天気 CLI",
          blurb:
            "Open-Meteo API を叩く小さな Python CLI。IP ベースの位置推定にも対応し、ターミナル上で読みやすい予報を表示します。外部ライブラリ依存ゼロ、標準ライブラリのみで実装。",
        },
      ],
    },
    contact: {
      eyebrow: "連絡先",
      title: "ぜひお話ししましょう。",
      subtitle:
        "インターン、共同プロジェクト、京都でのコーヒー一杯、なんでも歓迎です。メールが一番早く届きます。",
      resumeLabel: "履歴書（PDF）",
      resumesHeading: "履歴書・職務経歴書",
      resumesSubtitle:
        "日本と海外で書式が異なるため、両方ご用意しています。上の2つはモダンな書式（CV／職務経歴書）、下の2つは JIS 様式の履歴書です。",
      resumes: [
        {
          href: "/rirekisho-ja.pdf",
          title: "履歴書（JIS 様式・日本語）",
          subtitle: "日本の標準的な履歴書フォーマット。",
        },
        {
          href: "/resume-ja.pdf",
          title: "職務経歴書（日本語）",
          subtitle: "モダンな書式。海外スタイルに近い CV。",
        },
        {
          href: "/resume.pdf",
          title: "CV — English",
          subtitle: "海外応募向けの英語版 CV。",
        },
        {
          href: "/rirekisho-en.pdf",
          title: "Rirekisho — English labels",
          subtitle: "JIS 様式の英語ラベル版。",
        },
      ],
      footer: (year) =>
        `© ${year} ピー フォー マウン · 京都で Next.js + Tailwind + Framer Motion で制作。`,
    },
    langToggle: {
      label: "日本語",
      other: "EN",
    },
  },
};
