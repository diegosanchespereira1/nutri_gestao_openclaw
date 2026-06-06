#!/usr/bin/env node
/**
 * Aponta o Capacitor para o Next.js local (útil para validar no device físico).
 * Uso: npm run dev (outro terminal) && npm run mobile:android:local
 */
import { execSync } from 'node:child_process';
import os from 'node:os';

function lanIp() {
  const nets = os.networkInterfaces();
  for (const entries of Object.values(nets)) {
    for (const net of entries ?? []) {
      if (net.family === 'IPv4' && !net.internal) return net.address;
    }
  }
  return '127.0.0.1';
}

const ip = process.env.CAPACITOR_LAN_IP ?? lanIp();
const port = process.env.PORT ?? '3000';
const url = `http://${ip}:${port}`;

console.log(`\n📱 Capacitor → ${url}`);
console.log('   Certifique-se de que `npm run dev -- -H 0.0.0.0` está rodando.\n');

execSync(`CAP_WEBVIEW_DEBUG=true CAPACITOR_SERVER_URL=${url} npx cap sync android`, {
  stdio: 'inherit',
  env: { ...process.env, CAPACITOR_SERVER_URL: url, CAP_WEBVIEW_DEBUG: 'true' },
});

execSync('npx cap run android', { stdio: 'inherit' });
