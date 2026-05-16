"use client";

import { useMemo, ReactNode } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-wallets";
import "@solana/wallet-adapter-react-ui/styles.css";
import { KeypairWalletAdapter } from "./test-wallet-adapter";

// Gate the test wallet behind a build-time env flag so it never ships in
// production. Set NEXT_PUBLIC_ENABLE_TEST_WALLET=1 only for Playwright runs.
const ENABLE_TEST_WALLET = process.env.NEXT_PUBLIC_ENABLE_TEST_WALLET === "1";

export function AppWalletProvider({ children }: { children: ReactNode }) {
  const endpoint =
    process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

  // Note: Backpack and most modern wallets are auto-discovered via the
  // Wallet Standard, so we only need to register legacy adapters here.
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      ...(ENABLE_TEST_WALLET ? [new KeypairWalletAdapter()] : []),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
