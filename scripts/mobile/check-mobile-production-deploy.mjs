#!/usr/bin/env node
/**
 * Verifica se o servidor remoto do Capacitor tem os patches de safe-area / mobile.
 * Uso: node scripts/mobile/check-mobile-production-deploy.mjs [url]
 */
const baseUrl = (process.argv[2] ?? 'https://nutricao.stratostech.com.br').replace(/\/$/, '');

const markers = [
  { name: 'Bootstrap Capacitor inline', pattern: /nutrigestao-native-safe-area|data-ng-platform/ },
  { name: 'CapacitorNativeHtml (bundle)', pattern: /CapacitorNativeHtml|restoreNativeSafeAreaAfterHydration/ },
  { name: 'AndroidTopInset (bundle)', pattern: /AndroidTopInset|data-ng-native-webview-inset/ },
  { name: 'CSS safe-area android', pattern: /data-ng-platform="android"/ },
];

async function fetchText(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

function extractChunkUrls(html) {
  return [...html.matchAll(/\/_next\/static\/chunks\/[a-z0-9_.~\-]+\.js/gi)].map((m) => m[0]);
}

console.log(`\n🔍 Verificando deploy mobile em ${baseUrl}\n`);

try {
  const html = await fetchText(`${baseUrl}/login`);
  const chunkUrls = [...new Set(extractChunkUrls(html))].slice(0, 8);
  let chunks = '';
  for (const path of chunkUrls) {
    try {
      chunks += await fetchText(`${baseUrl}${path}`);
    } catch {
      // chunk opcional
    }
  }
  const corpus = html + chunks;

  let ok = 0;
  for (const { name, pattern } of markers) {
    const found = pattern.test(corpus);
    console.log(`${found ? '✅' : '❌'} ${name}`);
    if (found) ok++;
  }

  console.log(`\n${ok}/${markers.length} marcadores encontrados.`);

  if (ok === 0) {
    console.log('\n⚠️  O APK aponta para este servidor, mas o JS/CSS novo NÃO está publicado.');
    console.log('   Rebuild do APK sozinho NÃO aplica correções web.');
    console.log('   Solução imediata: rebuild APK com MainActivity.java (inset nativo).');
    console.log('   Solução completa: deploy Next.js + rebuild APK.\n');
    process.exit(1);
  }

  if (ok < markers.length) {
    console.log('\n⚠️  Deploy parcial — publique a versão mais recente do branch app_mobile.\n');
    process.exit(1);
  }

  console.log('\n✅ Deploy web parece conter os patches mobile.\n');
} catch (error) {
  console.error('Erro:', error instanceof Error ? error.message : error);
  process.exit(1);
}
