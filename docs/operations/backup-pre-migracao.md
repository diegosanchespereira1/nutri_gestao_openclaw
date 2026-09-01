# Backup pré-migração do Supabase cloud — runbook

Antes de aplicar as migrations do plano `docs/plano-limites-tenant-e-billing.md`.
As migrações desse plano criam **índices únicos** e trocam **FKs para `restrict`** — mudanças que não
voltam atrás sozinhas. Sem snapshot verificado, não aplicar.

## ⚠️ Estado encontrado em 2026-08-31 (antes do snapshot de emergência)

Diagnóstico feito neste repositório:

1. **Não existe nenhum backup válido.** As quatro pastas em `backups/abwzwwazdeptvafwlhon/`
   (`20260708-224948`, `20260708-225124`, `20260731-143539`, `20260731-143551`) contêm apenas
   `roles.sql` e `schema.sql` com **0 bytes**. Sem `data.sql`, sem `restore.sql`, sem `manifest.json`,
   sem `SHA256SUMS`. As quatro execuções falharam e deixaram o diretório para trás.
2. **A credencial em `scripts/database/.env.backup` é rejeitada hoje.** O pooler
   (`aws-1-sa-east-1.pooler.supabase.com:5432`) responde, o usuário está no formato correto
   (`postgres.<ref>`) e a senha não tem caracteres que exijam encoding — mas o servidor devolve
   `password authentication failed`. A senha foi rotacionada ou nunca foi a correta.

Ou seja: **o backup deste projeto não funciona desde, no mínimo, julho de 2026.**

## Correções já aplicadas

`scripts/database/backup.sh` foi endurecido:

- `trap` que **remove o diretório do snapshot** se o script falhar no meio — um snapshot incompleto é
  pior que nenhum, porque dá falsa sensação de proteção (foi exatamente o que aconteceu);
- verificação obrigatória antes de fechar o snapshot: `schema.sql` > 10 KB e com `CREATE TABLE`,
  `data.sql` > 1 KB, aviso se faltar RLS no schema ou dados das tabelas centrais
  (`profiles`, `clients`, `patients`, `team_members`).

## Passo 1 — Recuperar a credencial

Supabase Dashboard → projeto `abwzwwazdeptvafwlhon` → **Connect** → aba **Session pooler** (IPv4).
Copie a URI. Se a senha não estiver à mão: **Project Settings → Database → Reset database password**.

> Trocar a senha do banco **não** afeta o app: ele usa `anon` e `service_role` keys, não a senha do
> Postgres. Mas confira se algum script de deploy ou o self-host usa essa senha antes de rotacionar.

Atualize `scripts/database/.env.backup` (gitignored):

```bash
SUPABASE_DB_URL="postgresql://postgres.abwzwwazdeptvafwlhon:<SENHA>@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
```

## Snapshot de emergência — feito em 2026-08-31 ✅

Como a senha do banco está perdida e o `pg_dump` não estava disponível, foi criado
`scripts/database/backup-rest.mjs`: um snapshot de **dados** via PostgREST + Auth Admin API, que precisa
apenas de `node` e da `SUPABASE_SERVICE_ROLE_KEY` (a de produção está em `docker-compose-prd.env` e
**funciona**).

Primeiro snapshot válido do projeto: `backups/abwzwwazdeptvafwlhon/20260831-210901-rest/` — 13,5 MB.

```
46 tabelas com dados · 44.513 linhas · 13 usuários do Auth
6.615 arquivos no Storage (3,6 GB) — apenas o inventário
```

```bash
# rodar de novo:
SB_URL=<url> SB_KEY=<service_role> node scripts/database/backup-rest.mjs
# ou:
node scripts/database/backup-rest.mjs --env-file docker-compose-prd.env
```

### O que ele cobre e o que NÃO cobre

| | |
|---|---|
| ✅ Todas as linhas das 61 tabelas/views do schema público | NDJSON gzipado por tabela |
| ✅ Lista de usuários do Auth | **sem hash de senha** — o GoTrue não expõe; num restore todos redefinem |
| ✅ Inventário do Storage | nomes, tamanhos, datas |
| ✅ `manifest.json` + `SHA256SUMS` | verificação de integridade |
| ❌ DDL (tabelas, funções, RLS, triggers) | reproduzível de `supabase/migrations/` (187 arquivos) |
| ❌ Roles, grants, sequences | precisa de `pg_dump`/`pg_dumpall` |
| ❌ Os 3,6 GB de arquivos do Storage | fotos de pacientes e de checklists — **gap real** |

**Isto é uma rede de emergência, não um DR completo.** Para as migrations do plano — que criam índices
únicos e trocam FKs para `restrict` — ele é suficiente como ponto de retorno dos dados, porque o schema
vem das migrations. Mas o `pg_dump` continua sendo a meta.

### Storage — baixado em 2026-08-31 com `backup-storage.mjs`

`scripts/database/backup-storage.mjs` baixa os binários para dentro do snapshot. É **retomável**
(arquivo já baixado com o mesmo tamanho é pulado) e aceita `--max-seconds`, `--buckets` e `--dest`.

```bash
node scripts/database/backup-storage.mjs --snapshot backups/<ref>/<ts>-rest \
  --env-file docker-compose-prd.env --buckets checklist-fill-photos
```

Situação em `20260831-210901-rest`:

| Bucket | Arquivos | Tamanho | Status |
|---|---:|---:|---|
| `checklist-fill-photos` | 6.253 | 1.715,9 MB | ✅ completo |
| `profile-photos` | 3 | 0,5 MB | ✅ completo |
| `professional-signatures` | 4 | 0,1 MB | ✅ completo |
| `tenant-logos` | 1 | 0,0 MB | ✅ completo |
| `patient-photos`, `client-exams`, `client-logos`, `technical-recipe-images` | 0 | — | vazios no cloud |
| `checklist-dossier-pdfs` | 354 | **1.943 MB** | ❌ **não baixado — sem espaço em disco** |

**Tudo que é original está salvo.** Os `checklist-dossier-pdfs` são artefatos **gerados** pelo app
(`lib/pdf/build-approved-dossier-pdf.ts`, a partir das sessões aprovadas + das fotos), então são
reconstruíveis a partir do que já está no snapshot. São o único bucket ausente, e o de menor prejuízo.

> ⚠️ **O disco está cheio.** No momento do backup: 461 GB no volume, **598 MB livres** (100% de uso).
> Não foi possível baixar os 1,9 GB dos dossiês, e essa folga é arriscada para o dia a dia da máquina.
> Para incluí-los, liberar espaço ou apontar para outro destino:
> ```bash
> node scripts/database/backup-storage.mjs --snapshot backups/<ref>/<ts>-rest \
>   --env-file docker-compose-prd.env --buckets checklist-dossier-pdfs \
>   --dest /Volumes/<HD-externo>/nutrigestao-storage
> ```

### Gaps a fechar

1. **`checklist-dossier-pdfs` (1,9 GB)** — falta espaço. Regenerável, mas idealmente também salvo.
2. **Senhas do Auth.** Só o `pg_dump` da schema `auth` traz os hashes. Sem isso, um restore obriga todos
   os 13 usuários a redefinir a senha.
3. **A senha do banco**, para voltar ao caminho principal (Passo 1 e 2 abaixo).
4. **Cópia offsite** — hoje o snapshot existe só neste disco, que está cheio.

## Passo 2 — Garantir o `pg_dump` na versão certa

`libpq` é só o **cliente** Postgres — as ferramentas de linha de comando que conversam com o banco na
nuvem. Não instala servidor nenhum, não muda nada no Supabase. É o equivalente a instalar o `psql`.

Se o Homebrew não for uma opção, alternativas sem brew:

| Caminho | Comando |
|---|---|
| **Postgres.app** (macOS, sem terminal) | baixar em postgresapp.com e adicionar `/Applications/Postgres.app/Contents/Versions/latest/bin` ao PATH |
| **Docker** (se houver) | `docker run --rm postgres:17 pg_dump "$SUPABASE_DB_URL" --schema-only` |
| **Homebrew** | `brew install libpq` + `export PATH="/opt/homebrew/opt/libpq/bin:$PATH"` |
| **Nenhum deles** | usar `backup-rest.mjs` acima e fechar os gaps listados |

```bash
pg_dump --version
```

**A versão do `pg_dump` precisa ser maior ou igual à do servidor.** Se o Supabase estiver em PG 17 e o
`pg_dump` local for 14, o dump falha com *"server version mismatch"* — um dos candidatos para as falhas
anteriores. Conferir a versão do servidor:

```bash
psql "$SUPABASE_DB_URL" -c "select version();"
```

## Passo 3 — Rodar e conferir

```bash
cd ~/GIT/Nutricao_stratosTech
./scripts/database/backup.sh
```

Só considere feito se, ao final, existir em `backups/abwzwwazdeptvafwlhon/<timestamp>/`:

```
roles.sql.gz  schema.sql.gz  data.sql.gz  restore.sql.gz  manifest.json  SHA256SUMS
```

Conferência mínima (30 segundos, evita repetir o erro de julho):

```bash
D=backups/abwzwwazdeptvafwlhon/$(ls -1 backups/abwzwwazdeptvafwlhon | tail -1)
ls -lh "$D"                                   # nenhum arquivo com 0 bytes
( cd "$D" && shasum -a 256 -c SHA256SUMS )    # checksums batem
gunzip -c "$D/schema.sql.gz" | grep -c 'CREATE POLICY'   # RLS presente
gunzip -c "$D/data.sql.gz" | grep -c '^COPY public.patients'
```

## Passo 4 — Ensaiar a restauração (o passo que quase todo mundo pula)

Um backup nunca testado não é um backup. Restaure em um projeto Supabase **novo e descartável**:

```bash
./scripts/database/restore.sh "$D" --target-url "postgresql://postgres.NOVOREF:PWD@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
```

Depois, no projeto restaurado, rodar `supabase/scripts/verify_workspace_tenant_integrity.sql` e conferir
as contagens de `profiles`, `clients`, `patients`, `team_members` contra a produção.

## Passo 5 — Cópia fora da máquina

`backups/` é gitignored e vive só no seu disco. Um HD com defeito apaga a única cópia.
Sincronizar para S3/R2/Backblaze ou disco externo, e só então aplicar migration em produção.

## Passo 6 — Não deixar quebrar de novo

- Cron diário (o README já sugere) **mais** um alerta quando o snapshot mais recente tiver mais de 48h.
  A falha de julho passou despercebida porque nada avisava.
- Confirmar se o plano do Supabase inclui backup automático diário / PITR. Isso é uma rede a mais, não
  substituta: o snapshot pré-migração é seu ponto de retorno controlado.

## Antes de cada migration do plano

Além do snapshot, rodar os scripts de pré-condição (ver `docs/plano-limites-tenant-e-billing-TAREFAS.md` §7):
duplicatas de documento em `profiles`/`patients`/`clients`, `member_user_id` ativo em mais de um workspace,
e exames órfãos. São essas condições que fazem a migration falhar em produção e passar em teste.
