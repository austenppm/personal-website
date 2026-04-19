"use client";

import { motion } from "framer-motion";
import { FiArrowDown, FiDownload, FiGithub, FiLinkedin, FiMail } from "react-icons/fi";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Hero() {
  const { t, locale } = useLanguage();
  const subtitle = t.hero.subtitle(t.hero.uni);
  // Japanese-style always = rirekisho in Japanese
  // Overseas-style = modern CV in current locale
  const overseasResume = locale === "ja" ? "/resume-ja.pdf" : "/resume.pdf";

  return (
    <section
      id="top"
      className="relative overflow-hidden min-h-[100svh] flex items-center"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-20 w-[520px] h-[520px] rounded-full bg-amber-300/50 blur-3xl animate-blob"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 right-[-120px] w-[480px] h-[480px] rounded-full bg-rose-300/50 blur-3xl animate-blob"
        style={{ animationDelay: "-5s" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-140px] left-1/3 w-[420px] h-[420px] rounded-full bg-orange-300/50 blur-3xl animate-blob"
        style={{ animationDelay: "-9s" }}
      />

      <div className="relative max-w-5xl mx-auto px-6 py-28 w-full">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 text-sm text-stone-700 rounded-full border border-amber-700/20 bg-white/50 backdrop-blur px-4 py-1.5 mb-6"
        >
          <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
          {t.hero.badge}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.05 }}
          className="text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05] text-stone-900"
        >
          {t.hero.title1}{" "}
          <span className="gradient-text">{t.hero.title2}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-6 max-w-2xl text-xl sm:text-2xl text-stone-700 leading-relaxed"
        >
          {subtitle.before}
          <span className="text-orange-600 font-medium">{subtitle.uni}</span>
          {subtitle.after}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-10 flex flex-wrap gap-3"
        >
          <a
            href="#projects"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white px-6 py-3 font-medium shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 hover:-translate-y-0.5 transition-all"
          >
            {t.hero.cta} <FiArrowDown className="h-4 w-4" />
          </a>
          <a
            href="/rirekisho-ja.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-stone-900/15 bg-white/60 backdrop-blur px-6 py-3 font-medium text-stone-800 hover:bg-white hover:-translate-y-0.5 transition-all"
          >
            <FiDownload className="h-4 w-4" /> {t.hero.resumeJa}
          </a>
          <a
            href={overseasResume}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-stone-900/15 bg-white/60 backdrop-blur px-6 py-3 font-medium text-stone-800 hover:bg-white hover:-translate-y-0.5 transition-all"
          >
            <FiDownload className="h-4 w-4" /> {t.hero.resumeOverseas}
          </a>
          <a
            href="#contact"
            className="inline-flex items-center text-sm font-medium text-stone-600 hover:text-orange-600 transition-colors self-center px-2"
          >
            {t.hero.moreFormats}
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-10 flex items-center gap-5 text-stone-600"
        >
          <a
            href="https://github.com/austenppm"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub"
            className="hover:text-orange-600 transition-colors"
          >
            <FiGithub className="h-5 w-5" />
          </a>
          <a
            href="https://www.linkedin.com/in/pyii-phyo-maung-70435017a/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn"
            className="hover:text-orange-600 transition-colors"
          >
            <FiLinkedin className="h-5 w-5" />
          </a>
          <a
            href="mailto:austenppm12345.career@gmail.com"
            aria-label="Email"
            className="hover:text-orange-600 transition-colors"
          >
            <FiMail className="h-5 w-5" />
          </a>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="text-stone-500"
        >
          <FiArrowDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
