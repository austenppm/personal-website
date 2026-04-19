"use client";

import { motion } from "framer-motion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function LanguageToggle() {
  const { locale, toggle } = useLanguage();
  return (
    <motion.button
      type="button"
      onClick={toggle}
      whileTap={{ scale: 0.94 }}
      aria-label={`Switch to ${locale === "en" ? "Japanese" : "English"}`}
      className="relative inline-flex items-center gap-1 rounded-full border border-amber-900/15 bg-white/60 backdrop-blur px-3 py-1.5 text-sm font-medium text-stone-700 hover:border-orange-500/40 hover:text-orange-600 transition-colors"
    >
      <span className={locale === "en" ? "text-orange-600" : "text-stone-400"}>
        EN
      </span>
      <span className="text-stone-300">/</span>
      <span className={locale === "ja" ? "text-orange-600" : "text-stone-400"}>
        日本語
      </span>
    </motion.button>
  );
}
