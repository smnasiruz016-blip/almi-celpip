import type { Metadata } from "next";
import { Inter, Allura } from "next/font/google";
import "./globals.css";
import { GlobalHeader } from "@/components/GlobalHeader";
import { GlobalFooter } from "@/components/GlobalFooter";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const allura = Allura({ variable: "--font-allura", subsets: ["latin"], weight: "400", display: "swap" });

const SITE_URL = "https://almicelpip.almiworld.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AlmiCELPIP — Canadian English Language Proficiency Index Program practice with honest AI feedback",
    template: "%s · AlmiCELPIP",
  },
  description:
    "Practise CELPIP — all four skills — with honest per-skill estimates on the Canadian Language Benchmark (CLB 1–12) and AI feedback. Covers CELPIP-General and CELPIP-General LS. Original material, never copied from CELPIP. Part of the AlmiWorld family.",
  applicationName: "AlmiCELPIP",
  authors: [{ name: "AlmiWorld" }],
  keywords: ["Canadian English Language Proficiency Index Program", "CELPIP", "CELPIP practice", "CELPIP preparation", "CELPIP General", "CELPIP General LS", "CELPIP writing", "CELPIP speaking", "CLB", "Canadian Language Benchmark", "AlmiCELPIP", "AlmiWorld"],
  openGraph: {
    title: "AlmiCELPIP — honest Canadian English Language Proficiency Index Program practice",
    description: "Original practice with a per-skill CLB estimate (1–12), honest AI feedback, and both CELPIP-General and General LS.",
    url: SITE_URL,
    siteName: "AlmiCELPIP",
    type: "website",
    locale: "en_US",
  },
  twitter: { card: "summary_large_image", title: "AlmiCELPIP — Canadian English Language Proficiency Index Program practice", description: "Honest CELPIP practice on the CLB scale — an estimate per skill, ranges not inflated numbers." },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large" } },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${allura.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <GlobalHeader />
        <div className="flex flex-1 flex-col">{children}</div>
        <GlobalFooter />
      </body>
    </html>
  );
}
