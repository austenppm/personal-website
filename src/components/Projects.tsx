"use client";

import { motion } from "framer-motion";
import { FiExternalLink, FiGithub } from "react-icons/fi";
import Section from "./Section";
import { useLanguage } from "@/contexts/LanguageContext";

const meta = [
  {
    href: "https://github.com/austenppm/rutileamusic",
    tags: ["Python", "LLM", "Multimodal"],
    accent: "from-rose-400 to-amber-400",
  },
  {
    href: "https://github.com/austenppm/interpreter",
    tags: ["OCaml", "PLT", "Compilers"],
    accent: "from-amber-400 to-orange-500",
  },
  {
    href: "https://github.com/austenppm/audio",
    tags: ["Python", "DSP", "NumPy"],
    accent: "from-orange-500 to-rose-500",
  },
  {
    href: "https://github.com/austenppm/imagerecognition",
    tags: ["Python", "ML", "OpenCV"],
    accent: "from-rose-500 to-pink-500",
  },
  {
    href: "https://github.com/austenppm/database",
    tags: ["Python", "SQL", "Web"],
    accent: "from-amber-500 to-yellow-400",
  },
  {
    href: "https://github.com/austenppm/simpleausten",
    tags: ["Verilog", "Hardware", "CPU"],
    accent: "from-orange-400 to-rose-400",
  },
  {
    href: "https://github.com/austenppm/life_quest",
    tags: ["Flutter", "Dart", "Firebase"],
    accent: "from-rose-400 to-pink-500",
  },
  {
    href: "https://github.com/austenppm/austens-offline-latex-compiler",
    tags: ["Node.js", "React", "LaTeX"],
    accent: "from-orange-500 to-amber-400",
  },
  {
    href: "https://github.com/austenppm/weather",
    tags: ["Python", "CLI", "stdlib"],
    accent: "from-amber-500 to-orange-400",
  },
];

export default function Projects() {
  const { t } = useLanguage();
  const items = t.projects.items.map((p, i) => ({ ...p, ...meta[i] }));

  return (
    <Section
      id="projects"
      eyebrow={t.projects.eyebrow}
      title={t.projects.title}
    >
      <div className="grid sm:grid-cols-2 gap-5">
        {items.map((p, i) => (
          <motion.a
            key={p.title}
            href={p.href}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
            whileHover={{ y: -4 }}
            className="group relative block overflow-hidden rounded-3xl border border-amber-900/10 bg-white/60 backdrop-blur p-6 shadow-sm hover:shadow-xl transition-all"
          >
            <div
              aria-hidden
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${p.accent}`}
            />
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-xl font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                {p.title}
              </h3>
              <div className="flex items-center gap-2 text-stone-400 group-hover:text-orange-500 transition-colors">
                <FiGithub className="h-4 w-4" />
                <FiExternalLink className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
              </div>
            </div>
            <p className="mt-2 text-stone-700 leading-relaxed">{p.blurb}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {p.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs rounded-full bg-amber-50 border border-amber-700/15 text-amber-900 px-2.5 py-0.5"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.a>
        ))}
      </div>

      <p className="mt-10 text-stone-600">
        {t.projects.more.before}
        <a
          href="https://github.com/austenppm"
          target="_blank"
          rel="noopener noreferrer"
          className="text-orange-600 hover:underline underline-offset-4"
        >
          github.com/austenppm
        </a>
        {t.projects.more.after}
      </p>
    </Section>
  );
}
