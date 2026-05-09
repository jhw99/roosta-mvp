/**
 * Roosta web fonts — re-exported next/font instances.
 *
 * The single source of truth for these font loaders is `app/layout.tsx`
 * (Next.js requires `next/font` to be loaded from a module). This file
 * re-exports them so other modules can reference the variable / className
 * without re-instantiating the loader.
 */

import { Inter, JetBrains_Mono } from "next/font/google";

// Display and body share Inter — clean, neutral, "standard service" look
// (Notion, Linear, GitHub, OpenAI all use Inter or near-equivalents).
export const inter = Inter({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const fraunces = Inter({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  display: "swap",
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
});
