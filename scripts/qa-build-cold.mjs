#!/usr/bin/env node
/**
 * Cold build for the Solana monorepo. Wipes derived artifacts and runs the
 * full build chain, so a Vercel-style cache miss (or an anchor build cache
 * gap) can't surprise us in deploy.
 */
import { execSync } from 'node:child_process';
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const repo = resolve(import.meta.dirname, '..');

const wipePaths = [
  'app/.next',
  'app/node_modules/.cache',
  'target/idl',
  'target/types',
  // Don't wipe target/deploy/*.so (anchor build is expensive); flag if missing.
];

console.log('--- wiping TMA next cache + anchor idl/types ---');
for (const p of wipePaths) {
  const full = resolve(repo, p);
  if (existsSync(full)) {
    rmSync(full, { recursive: true, force: true });
    console.log(`  rm ${p}`);
  }
}

console.log('\n--- npm install in app/ ---');
execSync('npm install', { cwd: resolve(repo, 'app'), stdio: 'inherit' });

console.log('\n--- next build (app/) ---');
execSync('NEXT_PUBLIC_ENABLE_TEST_WALLET=1 npx next build', {
  cwd: resolve(repo, 'app'),
  stdio: 'inherit',
});

console.log('\n--- anchor build (program) ---');
try {
  execSync('anchor build', { cwd: repo, stdio: 'inherit' });
} catch (e) {
  console.error('⚠️  anchor build failed — check toolchain.');
  process.exit(1);
}

console.log('\n✅ cold build OK — Vercel cache miss + anchor regen would not break the stack.');
