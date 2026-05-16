"use client";

/**
 * KeypairWalletAdapter — non-production test wallet for Playwright E2E.
 *
 * Loaded ONLY when NEXT_PUBLIC_ENABLE_TEST_WALLET is truthy at build time.
 * Reads its keypair from `window.__ROOSTA_TEST_KEYPAIR__` (an array of 64
 * bytes) which the Playwright fixture seeds via `page.addInitScript`. If
 * the env flag is unset the file is tree-shaken; if the global is missing
 * the adapter never appears in the wallet list and Phantom/Wallet-Standard
 * discovery is unaffected.
 *
 * This is NOT a mock: it conforms to BaseSignerWalletAdapter and emits real
 * ed25519 signatures over real Transactions/VersionedTransactions. The only
 * thing "test" about it is the keypair source.
 */

import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletReadyState,
} from "@solana/wallet-adapter-base";
import { Keypair, PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import nacl from "tweetnacl";

const ADAPTER_NAME = "RoostaTestKeypair" as WalletName<"RoostaTestKeypair">;

interface WindowWithTestKeypair extends Window {
  __ROOSTA_TEST_KEYPAIR__?: number[] | Uint8Array;
}

function readKeypair(): Keypair | null {
  if (typeof window === "undefined") return null;
  const w = window as WindowWithTestKeypair;
  const seed = w.__ROOSTA_TEST_KEYPAIR__;
  if (!seed) return null;
  const arr = seed instanceof Uint8Array ? seed : Uint8Array.from(seed);
  if (arr.length !== 64) return null;
  return Keypair.fromSecretKey(arr);
}

export class KeypairWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = ADAPTER_NAME;
  url = "https://roosta.local/test-wallet";
  icon =
    "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxIDEiPjxyZWN0IHdpZHRoPSIxIiBoZWlnaHQ9IjEiIGZpbGw9IiNlODVkMmYiLz48L3N2Zz4=";
  supportedTransactionVersions = new Set<"legacy" | 0>(["legacy", 0]);

  private _keypair: Keypair | null = null;
  private _publicKey: PublicKey | null = null;
  private _connecting = false;

  get readyState(): WalletReadyState {
    return typeof window !== "undefined" && readKeypair()
      ? WalletReadyState.Installed
      : WalletReadyState.NotDetected;
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get connecting(): boolean {
    return this._connecting;
  }

  async connect(): Promise<void> {
    if (this._publicKey) return;
    this._connecting = true;
    try {
      const kp = readKeypair();
      if (!kp) throw new Error("__ROOSTA_TEST_KEYPAIR__ not set on window");
      this._keypair = kp;
      this._publicKey = kp.publicKey;
      this.emit("connect", kp.publicKey);
    } finally {
      this._connecting = false;
    }
  }

  async disconnect(): Promise<void> {
    this._keypair = null;
    this._publicKey = null;
    this.emit("disconnect");
  }

  async signTransaction<T extends Transaction | VersionedTransaction>(
    transaction: T,
  ): Promise<T> {
    if (!this._keypair) throw new Error("not connected");
    if (transaction instanceof VersionedTransaction) {
      transaction.sign([this._keypair]);
    } else {
      (transaction as Transaction).partialSign(this._keypair);
    }
    return transaction;
  }

  async signAllTransactions<T extends Transaction | VersionedTransaction>(
    transactions: T[],
  ): Promise<T[]> {
    for (const t of transactions) await this.signTransaction(t);
    return transactions;
  }

  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this._keypair) throw new Error("not connected");
    return nacl.sign.detached(message, this._keypair.secretKey);
  }
}
