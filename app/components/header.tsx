"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { WalletPanelTrigger } from "@/components/wallet-panel";

export function Header() {
  return (
    <header className="w-full border-b border-[var(--border)] bg-[var(--background)]/80 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link
          href="/"
          aria-label="Roosta — Home"
          className="flex items-center rounded-[var(--radius-md)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <span className="hidden sm:block">
            <Logo variant="lockup" priority />
          </span>
          <span className="sm:hidden">
            <Logo variant="icon" priority />
          </span>
        </Link>

        <WalletPanelTrigger />
      </div>
    </header>
  );
}
