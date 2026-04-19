"use client";

import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";

const variants: Variants = {
  hidden: { opacity: 0, y: 40 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: "easeOut" },
  },
};

export default function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <motion.section
      id={id}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.2 }}
      variants={variants}
      className="relative max-w-5xl mx-auto px-6 py-24 sm:py-32"
    >
      <p className="text-sm font-medium tracking-widest uppercase text-orange-600 mb-3">
        {eyebrow}
      </p>
      <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-stone-900 mb-10">
        {title}
      </h2>
      {children}
    </motion.section>
  );
}
