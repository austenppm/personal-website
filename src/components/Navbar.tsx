"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import LanguageToggle from "./LanguageToggle";

export default function Navbar() {
  const { t } = useLanguage();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { href: "#about", label: t.nav.about },
    { href: "#research", label: t.nav.research },
    { href: "#experience", label: t.nav.experience },
    { href: "#projects", label: t.nav.projects },
    { href: "#contact", label: t.nav.contact },
  ];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 inset-x-0 z-50 transition-all ${
        scrolled
          ? "backdrop-blur-md bg-[#fff7ee]/70 border-b border-amber-900/10"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-5xl mx-auto flex items-center justify-between px-6 py-4 gap-4">
        <a
          href="#top"
          className="font-semibold tracking-tight text-stone-900 shrink-0"
        >
          <span className="gradient-text">Pyii</span>
          <span className="text-stone-700"> Phyo Maung</span>
        </a>
        <div className="flex items-center gap-5">
          <ul className="hidden sm:flex gap-6 text-sm text-stone-700">
            {links.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  className="hover:text-orange-600 transition-colors"
                >
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
          <LanguageToggle />
        </div>
      </nav>
    </motion.header>
  );
}
