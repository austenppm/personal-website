"use client";

import { motion } from "framer-motion";
import { FiBookOpen } from "react-icons/fi";
import Section from "./Section";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Research() {
  const { t } = useLanguage();
  const r = t.research;

  return (
    <Section id="research" eyebrow={r.eyebrow} title={r.title}>
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="relative overflow-hidden rounded-3xl border border-amber-900/10 bg-white/60 backdrop-blur p-6 sm:p-10 shadow-sm"
      >
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
        />

        <div className="flex items-start gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md shadow-orange-500/20">
            <FiBookOpen className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium tracking-widest uppercase text-orange-600">
              {r.thesisLabel} · {r.date}
            </p>
            <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-stone-900 leading-snug">
              {r.thesisTitle}
            </h3>
            <p className="mt-1 text-stone-600">
              {r.venue}
              <span className="text-stone-400"> · </span>
              {r.advisor}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-stone-700 leading-relaxed">
          {r.paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {r.tags.map((tag) => (
            <span
              key={tag}
              className="text-xs rounded-full bg-amber-50 border border-amber-700/15 text-amber-900 px-2.5 py-0.5"
            >
              {tag}
            </span>
          ))}
        </div>
      </motion.article>
    </Section>
  );
}
