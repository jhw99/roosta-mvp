import { Keypair, Connection, LAMPORTS_PER_SOL, SystemProgram, Transaction } from "@solana/web3.js";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const cacheDir = "/home/jhenry/workspace/jhw99/Roosta/e2e/.cache";
fs.mkdirSync(cacheDir, { recursive: true });
const file = path.join(cacheDir, "test-keypair.json");

let testKp;
if (fs.existsSync(file)) {
  testKp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, "utf8"))));
} else {
  testKp = Keypair.generate();
  fs.writeFileSync(file, JSON.stringify(Array.from(testKp.secretKey)));
}

const localKp = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(path.join(os.homedir(), ".config/solana/id.json"), "utf8")))
);

const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const balance = await conn.getBalance(testKp.publicKey);
console.log("test kp:", testKp.publicKey.toBase58(), "balance:", balance / LAMPORTS_PER_SOL, "SOL");
if (balance < LAMPORTS_PER_SOL) {
  console.log("funding from local keypair...");
  const { blockhash, lastValidBlockHeight } = await conn.getLatestBlockhash();
  const tx = new Transaction().add(
    SystemProgram.transfer({ fromPubkey: localKp.publicKey, toPubkey: testKp.publicKey, lamports: LAMPORTS_PER_SOL })
  );
  tx.recentBlockhash = blockhash;
  tx.feePayer = localKp.publicKey;
  tx.partialSign(localKp);
  const sig = await conn.sendRawTransaction(tx.serialize());
  await conn.confirmTransaction({ signature: sig, blockhash, lastValidBlockHeight });
  console.log("funded:", sig);
} else {
  console.log("already funded");
}
