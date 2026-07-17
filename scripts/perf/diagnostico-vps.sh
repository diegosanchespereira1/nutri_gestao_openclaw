#!/usr/bin/env bash
# Diagnóstico de produção — NutriGestão (Fase 0 do plano de auditoria)
# Uso: bash diagnostico-vps.sh [nome_do_container] [SUPABASE_URL]
# Ex.:  bash diagnostico-vps.sh "$(docker ps --filter name=nutricao --format '{{.Names}}' | head -1)" https://xxxx.supabase.co
# Cole a saída completa na conversa para análise.

set -u
CONTAINER="${1:-}"
SUPABASE_URL="${2:-}"

sec() { echo; echo "════════════════════════════════════════"; echo "▶ $1"; echo "════════════════════════════════════════"; }

sec "1. Sistema — carga, memória, disco, swap"
uptime
free -h
df -h / /var/lib/docker 2>/dev/null | head -5
swapon --show 2>/dev/null || echo "(sem swap)"
echo "CPUs: $(nproc)"

sec "2. Containers rodando"
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"

if [ -z "$CONTAINER" ]; then
  CONTAINER="$(docker ps --filter name=nutricao --format '{{.Names}}' | head -1)"
  echo "(container auto-detectado: ${CONTAINER:-NENHUM})"
fi

sec "3. Uso de recursos (snapshot 10s)"
docker stats --no-stream
sleep 5
docker stats --no-stream

if [ -n "$CONTAINER" ]; then
  sec "4. Restarts e OOM do container"
  docker inspect "$CONTAINER" --format 'RestartCount={{.RestartCount}} OOMKilled={{.State.OOMKilled}} StartedAt={{.State.StartedAt}} ExitCode={{.State.ExitCode}}'
  echo "-- Tasks do serviço (Swarm) --"
  SVC="$(docker service ls --format '{{.Name}}' | grep -i nutricao | head -1)"
  [ -n "$SVC" ] && docker service ps "$SVC" --no-trunc | head -15

  sec "5. OOM kills no kernel (últimos)"
  dmesg -T 2>/dev/null | grep -iE "oom|killed process" | tail -20 || journalctl -k --since "7 days ago" 2>/dev/null | grep -iE "oom|killed process" | tail -20 || echo "(sem acesso a dmesg/journalctl)"

  sec "6. Logs do app — erros recentes (últimas 48h)"
  docker logs --since 48h "$CONTAINER" 2>&1 | grep -iE "error|fatal|timeout|ECONN|abort|heap|memory" | tail -60

  sec "7. Logs do app — últimas 30 linhas"
  docker logs --tail 30 "$CONTAINER" 2>&1
fi

sec "8. Traefik — erros 5xx recentes"
TRAEFIK="$(docker ps --format '{{.Names}}' | grep -i traefik | head -1)"
if [ -n "$TRAEFIK" ]; then
  docker logs --since 48h "$TRAEFIK" 2>&1 | grep -E "50[0-9]|memory|timeout" | tail -40
else
  echo "(traefik não encontrado neste nó)"
fi

sec "9. Latência VPS → Supabase Cloud"
if [ -n "$SUPABASE_URL" ]; then
  for i in 1 2 3 4 5; do
    curl -s -o /dev/null -w "tentativa $i: dns=%{time_namelookup}s conexão=%{time_connect}s tls=%{time_appconnect}s total=%{time_total}s\n" "$SUPABASE_URL/auth/v1/health"
  done
else
  echo "Passe a URL do Supabase como 2º argumento para medir latência."
fi

sec "10. Eventos Docker (die/oom, 7 dias)"
docker events --since "$(date -d '7 days ago' +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -v-7d +%Y-%m-%dT%H:%M:%S)" --until "$(date +%Y-%m-%dT%H:%M:%S)" --filter event=die --filter event=oom 2>/dev/null | tail -30 || echo "(sem eventos ou sem permissão)"

echo; echo "✔ Diagnóstico concluído. Cole TODA a saída na conversa."
