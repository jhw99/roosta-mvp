import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppWalletProvider } from "@/components/wallet-provider";
import { Header } from "@/components/header";
import { fraunces, inter, jetbrainsMono } from "@/lib/fonts";
import { ROOSTA_BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  metadataBase: new URL(ROOSTA_BRAND.url),
  title: {
    default: "Roosta — On-chain Social Savings on Solana",
    template: "%s | Roosta",
  },
  description: ROOSTA_BRAND.description,
  keywords: [
    "Roosta",
    "ROSCA",
    "Solana",
    "Web3",
    "Savings",
    "USDC",
    "Korean kye",
    "Tanda",
    "Sou-sou",
    "Social fintech",
    "On-chain savings",
  ],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "android-chrome-192x192", url: "/android-chrome-192x192.png" },
      { rel: "android-chrome-512x512", url: "/android-chrome-512x512.png" },
    ],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    type: "website",
    url: ROOSTA_BRAND.url,
    siteName: "Roosta",
    title: "Roosta — On-chain Social Savings on Solana",
    description: ROOSTA_BRAND.description,
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Roosta — On-chain social savings on Solana",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Roosta — On-chain Social Savings on Solana",
    description: ROOSTA_BRAND.description,
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAFAF7" },
    { media: "(prefers-color-scheme: dark)", color: "#1A1A1A" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className={`${fraunces.variable} ${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body
        className="min-h-full flex flex-col"
        style={{ fontFamily: "var(--font-body)" }}
      >
        <AppWalletProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-[var(--border)] mt-12">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted)]">
              <span>Roosta · Devnet · open source</span>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[var(--primary)]"
              >
                GitHub ↗
              </a>
            </div>
          </footer>
        </AppWalletProvider>
      </body>
    </html>
  );
}
