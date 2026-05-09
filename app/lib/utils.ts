import BN from "bn.js";

const USDC_DECIMALS = 6;

export function formatUsdc(amount: BN | bigint | number | undefined): string {
  if (amount === undefined || amount === null) return "0.00";
  let bn: BN;
  if (BN.isBN(amount)) bn = amount;
  else if (typeof amount === "bigint") bn = new BN(amount.toString());
  else bn = new BN(amount);

  const divisor = new BN(10).pow(new BN(USDC_DECIMALS));
  const whole = bn.div(divisor).toString();
  const frac = bn.mod(divisor).toString().padStart(USDC_DECIMALS, "0");
  return `${whole}.${frac.slice(0, 2)}`;
}

export function parseUsdc(input: string): BN {
  const trimmed = (input || "0").trim();
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0".repeat(USDC_DECIMALS)).slice(0, USDC_DECIMALS);
  const wholeBn = new BN(whole || "0").mul(
    new BN(10).pow(new BN(USDC_DECIMALS))
  );
  return wholeBn.add(new BN(fracPadded || "0"));
}

export function shortAddr(addr: string | { toBase58(): string } | undefined) {
  if (!addr) return "";
  const s = typeof addr === "string" ? addr : addr.toBase58();
  if (s.length <= 10) return s;
  return `${s.slice(0, 4)}...${s.slice(-4)}`;
}

export function explorerTx(sig: string, cluster = "devnet") {
  return `https://explorer.solana.com/tx/${sig}?cluster=${cluster}`;
}

export function explorerAddr(addr: string, cluster = "devnet") {
  return `https://explorer.solana.com/address/${addr}?cluster=${cluster}`;
}

export function statusKey<T extends object>(s: T | undefined): string {
  if (!s) return "unknown";
  return Object.keys(s)[0] || "unknown";
}
