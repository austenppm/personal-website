import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Lotto Picker — Loto 6 / Loto 7 / Mini Loto / Numbers",
  description:
    "Loto 6, Loto 7, Mini Loto, Numbers 3 and Numbers 4 tickets that spread numbers across tickets and avoid popular picks, plus draw statistics and a ticket checker.",
  manifest: "/tools/lotto/manifest.webmanifest",
  icons: { apple: "/tools/lotto/apple-touch-icon.png" },
  appleWebApp: { title: "Lotto", statusBarStyle: "default" },
  // Unlisted tool: reachable by URL only, kept out of search results.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#fb7d3c",
};

export default function LottoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
