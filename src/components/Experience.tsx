"use client";

import { motion } from "framer-motion";
import Section from "./Section";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Experience() {
  const { t } = useLanguage();
  return (
    <Section
      id="experience"
      eyebrow={t.experience.eyebrow}
      title={t.experience.title}
    >
      <ol className="relative border-l-2 border-dashed border-orange-300/60 pl-8 space-y-10">
        {t.experience.items.map((item, i) => (
          <motion.li
            key={item.period + item.role}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.5, delay: i * 0.07 }}
            className="relative"
          >
            <span
              aria-hidden
              className="absolute -left-[39px] top-1.5 h-4 w-4 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 shadow-md shadow-rose-500/30 ring-4 ring-[#fff7ee]"
            />
            <p className="text-sm font-medium tracking-wider uppercase text-orange-600">
              {item.period}
            </p>
            <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-stone-900">
              {item.role}
            </h3>
            <p className="text-stone-600 mb-2">{item.place}</p>
            <p className="text-stone-700 leading-relaxed">{item.blurb}</p>
            {item.tags && (
              <div className="mt-3 flex flex-wrap gap-2">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs rounded-full bg-amber-100/60 border border-amber-700/15 text-amber-900 px-2.5 py-0.5"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </motion.li>
        ))}
      </ol>
    </Section>
  );
}
