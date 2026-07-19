#!/usr/bin/env bash
# Diagnóstico de rede da VPS — investiga a causa dos erros EAI_AGAIN (DNS)
# e ConnectTimeoutError vistos nos logs de produção (VPS → Supabase Cloud).
# Uso na VPS: bash diagnostico-rede-vps.sh
# Cole a saída completa na conversa para análise.

set -u
HOST_ALVO="abwzwwazdeptvafwlhon.supabase.co"

sec() { echo; echo "════════════════════════════════════════"; echo "▶ $1"; echo "════════════════════════════════════════"; }

sec "1. Tabela de conexões (conntrack) — se count ≈ max, achamos a causa"
sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max 2>/dev/null || echo "(módulo conntrack não carregado)"

sec "2. Estatísticas de descarte do conntrack"
conntrack -S 2>/dev/null | head -6 || echo "(ferramenta conntrack não instalada — ok pular, o item 1 já responde)"

sec "3. Resumo de sockets (esgotamento de portas efêmeras)"
ss -s | head -8
echo "-- portas efêmeras configuradas --"
sysctl net.ipv4.ip_local_port_range
echo "-- conexões TIME-WAIT --"
ss -tan state time-wait | wc -l

sec "4. Teste de DNS sob paralelismo (30 consultas simultâneas)"
FALHAS=0
for i in $(seq 1 30); do
  ( dig +time=2 +tries=1 +short "$HOST_ALVO" >/dev/null 2>&1 || echo "FALHA_DNS_$i" ) &
done | grep -c FALHA_DNS | { read -r n; echo "falhas: ${n:-0} de 30"; }
wait 2>/dev/null

sec "5. Teste de DNS sequencial (60 consultas, mede consistência)"
OK=0; FAIL=0
for i in $(seq 1 60); do
  if dig +time=2 +tries=1 +short "$HOST_ALVO" >/dev/null 2>&1; then OK=$((OK+1)); else FAIL=$((FAIL+1)); fi
done
echo "ok=$OK falhas=$FAIL"

sec "6. Latência TCP/TLS até o Supabase (10 amostras)"
for i in $(seq 1 10); do
  curl -s -o /dev/null -w "dns=%{time_namelookup}s tcp=%{time_connect}s tls=%{time_appconnect}s total=%{time_total}s\n" "https://$HOST_ALVO/auth/v1/health"
done

sec "7. Erros de interface de rede"
ip -s link show ens3 2>/dev/null | grep -A1 "RX:\|TX:" | head -8

sec "8. Logs do kernel — descartes de rede (7 dias)"
journalctl -k --since "7 days ago" 2>/dev/null | grep -iE "conntrack|nf_conntrack|drop|neighbour" | tail -15 || dmesg -T 2>/dev/null | grep -iE "conntrack|drop" | tail -15 || echo "(sem acesso aos logs do kernel)"

echo; echo "✔ Diagnóstico de rede concluído. Cole TODA a saída na conversa."
