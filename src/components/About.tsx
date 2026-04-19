"use client";

import { motion } from "framer-motion";
import Section from "./Section";
import { useLanguage } from "@/contexts/LanguageContext";

const stack = [
  "Python",
  "TypeScript",
  "Next.js",
  "React",
  "FastAPI",
  "Playwright",
  "OCaml",
  "C",
  "Java",
  "PostgreSQL",
  "GCP",
  "Verilog",
];

export default function About() {
  const { t } = useLanguage();
  return (
    <Section id="about" eyebrow={t.about.eyebrow} title={t.about.title}>
      <div className="grid md:grid-cols-5 gap-10">
        <div className="md:col-span-3 space-y-5 text-lg leading-relaxed text-stone-700">
          {t.about.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="md:col-span-2 space-y-8">
          <div>
            <h3 className="text-sm font-medium tracking-widest uppercase text-stone-500 mb-3">
              {t.about.languagesLabel}
            </h3>
            <ul className="space-y-2">
              {t.about.languages.map((l) => (
                <li
                  key={l.label}
                  className="flex items-center justify-between text-stone-800"
                >
                  <span>{l.label}</span>
                  <span className="text-sm text-stone-500">{l.level}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium tracking-widest uppercase text-stone-500 mb-3">
              {t.about.stackLabel}
            </h3>
            <div className="flex flex-wrap gap-2">
              {stack.map((s, i) => (
                <motion.span
                  key={s}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.04, duration: 0.35 }}
                  className="text-sm rounded-full border border-amber-700/20 bg-white/70 backdrop-blur px-3 py-1 text-stone-800"
                >
                  {s}
                </motion.span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Section>
  );
}
