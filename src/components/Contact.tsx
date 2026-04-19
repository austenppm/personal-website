"use client";

import { motion } from "framer-motion";
import { FiGithub, FiLinkedin, FiMail, FiFileText, FiDownload } from "react-icons/fi";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Contact() {
  const { t } = useLanguage();

  const links = [
    {
      label: "austenppm12345.career@gmail.com",
      href: "mailto:austenppm12345.career@gmail.com",
      icon: FiMail,
    },
    {
      label: "github.com/austenppm",
      href: "https://github.com/austenppm",
      icon: FiGithub,
    },
    {
      label: "LinkedIn",
      href: "https://www.linkedin.com/in/pyii-phyo-maung-70435017a/",
      icon: FiLinkedin,
    },
  ];

  return (
    <section
      id="contact"
      className="relative overflow-hidden max-w-5xl mx-auto px-6 py-28 sm:py-36"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-10 left-1/2 -translate-x-1/2 w-[700px] h-[300px] rounded-full bg-gradient-to-r from-amber-300/40 via-orange-300/40 to-rose-300/40 blur-3xl"
      />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative text-center"
      >
        <p className="text-sm font-medium tracking-widest uppercase text-orange-600 mb-3">
          {t.contact.eyebrow}
        </p>
        <h2 className="text-4xl sm:text-6xl font-semibold tracking-tight text-stone-900">
          {t.contact.title}
        </h2>
        <p className="mt-5 max-w-xl mx-auto text-lg text-stone-700 leading-relaxed">
          {t.contact.subtitle}
        </p>

        <div className="mt-10 grid sm:grid-cols-3 gap-3 max-w-2xl mx-auto">
          {links.map(({ label, href, icon: Icon }) => (
            <motion.a
              key={label}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              whileHover={{ y: -2 }}
              className="group flex min-w-0 items-center gap-3 rounded-2xl border border-amber-900/10 bg-white/70 backdrop-blur px-5 py-4 text-stone-800 hover:border-orange-500/40 hover:bg-white transition-all"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md shadow-orange-500/20">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-medium group-hover:text-orange-600 transition-colors">
                {label}
              </span>
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* ---------- Resumes grid ---------- */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative mt-20"
      >
        <div className="flex items-center gap-3 mb-2">
          <FiFileText className="h-5 w-5 text-orange-600" />
          <h3 className="text-xl sm:text-2xl font-semibold text-stone-900">
            {t.contact.resumesHeading}
          </h3>
        </div>
        <p className="text-stone-600 max-w-2xl">
          {t.contact.resumesSubtitle}
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-3">
          {t.contact.resumes.map(({ href, title, subtitle }, i) => (
            <motion.a
              key={href}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              whileHover={{ y: -2 }}
              className="group relative overflow-hidden rounded-2xl border border-amber-900/10 bg-white/70 backdrop-blur p-5 hover:border-orange-500/40 hover:bg-white transition-all"
            >
              <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500"
              />
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 text-white shadow-md shadow-orange-500/20 mt-0.5">
                  <FiDownload className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-stone-900 group-hover:text-orange-600 transition-colors">
                    {title}
                  </p>
                  <p className="mt-1 text-sm text-stone-600 leading-relaxed">
                    {subtitle}
                  </p>
                </div>
              </div>
            </motion.a>
          ))}
        </div>
      </motion.div>

      <footer className="relative mt-24 border-t border-amber-900/10 pt-8 text-center text-sm text-stone-500">
        <p>{t.contact.footer(new Date().getFullYear())}</p>
      </footer>
    </section>
  );
}
