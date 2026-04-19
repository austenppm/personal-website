import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { LanguageProvider } from "@/contexts/LanguageContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoJP = Noto_Sans_JP({
  variable: "--font-noto-jp",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Pyii Phyo Maung — Software Engineer / Kyoto University",
  description:
    "Personal website of Pyii Phyo Maung. Software engineer at Senren, CS student at Kyoto University, based in Kyoto. Projects, experience, and contact.",
  metadataBase: new URL("https://pyiiphyomaung.com"),
  openGraph: {
    title: "Pyii Phyo Maung",
    description:
      "Software engineer at Senren · CS @ Kyoto University · Kyoto, Japan",
    url: "https://pyiiphyomaung.com",
    siteName: "Pyii Phyo Maung",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${notoJP.variable} scroll-smooth antialiased`}
    >
      <body className="min-h-screen overflow-x-hidden bg-[#fff7ee] text-stone-900 selection:bg-amber-300/60">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
