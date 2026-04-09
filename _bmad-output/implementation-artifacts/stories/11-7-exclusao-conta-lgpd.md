# Story 11.7: Bloqueio de Acesso por LGPD (retenção 10 anos, leitura admin)

## Revisão (substitui especificação anterior)

Esta story **substitui** a versão anterior da 11.7 que descrevia “exclusão imediata de dados”, retenção de **5 anos** e soft-delete agressivo. O modelo correto para o produto é:

- **“Excluir conta” = bloquear acesso externo do titular**, não apagar dados clínicos.
- **Retenção legal mínima: 10 anos** (documentação em UI e especificação técnica).
- **Escrita bloqueada** em cadastros/pacientes afetados até **desbloqueio explícito** por `admin` ou `super_admin`.
- **Leitura** de dados clínicos para `admin` / `super_admin` mantida para solicitações legais.
- **Fora de escopo:** Firebase / FCM (push) neste ciclo.

## Contexto

Stories 11.1–11.6 cobriram segurança, auditoria, consentimentos e notificações. A 11.7 passa a implementar o fluxo de **pedido de encerramento de conta** alinhado ao LGPD: o titular pode pedir que deixe de aceder à plataforma, enquanto a operação **retém e protege** dados de saúde pelo período legal, com **bloqueio de escrita** e **acesso administrativo só leitura** onde aplicável.

## Contexto de negócio (OBRIGATÓRIO)

1. Não implementar Firebase/FCM por enquanto.
2. Retenção legal mínima é de **10 anos** (não 5).
3. “Excluir conta” **não** significa apagar dados clínicos.
4. Ao solicitar exclusão, o sistema deve **bloquear acesso externo** do titular (conta e, quando aplicável, cadastro de paciente) à plataforma.
5. Perfis internos `admin` e `super_admin` mantêm **acesso de leitura** aos dados clínicos para atendimento de solicitações legais (alinhado a `lib/roles.ts`: `canAccessAdminArea`).
6. Enquanto bloqueado, **não** pode haver inserção/atualização/remoção de dados clínicos desse cadastro (defesa em profundidade: server actions + RLS).
7. A escrita só volta após **desbloqueio explícito** por `admin` ou `super_admin`.

## Objetivo

Implementar **“bloqueio LGPD com retenção de 10 anos”**:

- Bloquear login e uso de fluxos externos pelo titular após confirmação do fluxo.
- Preservar dados clínicos para consulta administrativa.
- Impedir alterações em registos vinculados ao cadastro bloqueado.
- Permitir desbloqueio controlado e auditado.

## Stack & Convenções

- **Framework:** Next.js App Router, TypeScript strict (sem `any`).
- **Auth / sessão:** `@supabase/ssr`.
- **Papéis:** `lib/roles.ts` — `ProfileRole`: `user` | `admin` | `super_admin`; `canAccessAdminArea` para rotas `/admin`.
- **Email transacional:** Resend (já usado no projeto), sem Firebase.
- **Rotas:** área profissional `app/(app)/configuracoes/deletar-conta/` → URL `/configuracoes/deletar-conta`.

## Requisitos funcionais (resumo)

- **FR69 (ajustado):** O titular pode solicitar **encerramento de acesso** à conta; dados clínicos permanecem retidos conforme obrigação legal (10 anos); escrita suspensa até desbloqueio administrativo.
- **Bloqueio:** estado explícito com metadados (ver MVP).
- **Auditoria:** eventos `ACCOUNT_BLOCKED_LGPD`, `ACCOUNT_UNBLOCKED`, `WRITE_BLOCKED_LGPD` (tentativa de escrita durante bloqueio).

## Escopo funcional (MVP)

### A. Bloqueio de conta / cadastro

Criar estado de bloqueio com metadados (em `profiles` e/ou entidade de paciente, conforme modelo de dados atual):

| Campo | Descrição |
|-------|-----------|
| `blocked_at` | Quando entrou em bloqueio |
| `blocked_reason` | Ex.: `lgpd_account_closure` |
| `blocked_until` | Opcional (ex.: revisão) |
| `blocked_by` | Quem aplicou bloqueio (admin/super_admin ou sistema) |
| `unblocked_at` | Quando desbloqueado |
| `unblocked_by` | Admin/super_admin que desbloqueou |

**Quando bloqueado:**

- Titular **não** autentica ou recebe mensagem clara de conta inativa/bloqueada.
- Dados permanecem em **leitura** para `admin` e `super_admin` (policies RLS + rotas servidor).

### B. Escrita proibida durante bloqueio

- Bloquear `INSERT` / `UPDATE` / `DELETE` em dados clínicos ligados ao cadastro bloqueado (paciente, visitas, avaliações, etc. — mapear tabelas no desenho da migração).
- Mensagem de erro padronizada (PT): *«Cadastro bloqueado por LGPD. Solicite desbloqueio a um administrador.»*

### C. Desbloqueio

- Ação administrativa (UI em `/admin` ou secção de conformidade) para desbloquear.
- Após desbloqueio, escrita volta ao comportamento normal.
- Auditoria completa (quem, quando, motivo).

### D. Auditoria e conformidade

Registar em `audit_log` (ou equivalente):

- `ACCOUNT_BLOCKED_LGPD`
- `ACCOUNT_UNBLOCKED`
- `WRITE_BLOCKED_LGPD` (tentativa de mutação com contexto: tabela, `record_id`, `user_id`)

## Regras de autorização

- **`user`:** sem bypass; não desbloqueia; não lê dados de outro tenant.
- **`admin` / `super_admin`:** leitura de dados bloqueados para fins legais + ação de desbloqueio (confirmar no UI se ambos ou só `super_admin`).
- Reutilizar `canAccessAdminArea` e políticas existentes; não duplicar lógica de role em strings soltas.

## Critérios de aceitação (Given / When / Then)

1. **Given** cadastro ativo, **When** o fluxo de pedido LGPD é concluído (e/ou admin aplica bloqueio), **Then** o titular perde acesso externo e o estado passa a **bloqueado**.
2. **Given** cadastro bloqueado, **When** qualquer fluxo tenta **escrever** dados clínicos associados, **Then** a operação falha com o erro de bloqueio padronizado.
3. **Given** cadastro bloqueado, **When** `admin` ou `super_admin` consulta dados, **Then** a **leitura** funciona conforme RLS.
4. **Given** cadastro bloqueado, **When** `admin` ou `super_admin` executa desbloqueio, **Then** a escrita volta a ser permitida para esse cadastro.
5. **Given** bloqueio, desbloqueio ou tentativa de escrita bloqueada, **Then** o `audit_log` regista evento com identificação suficiente para compliance.
6. **Given** qualquer ecrã ou email do fluxo, **Then** o texto menciona **retenção de 10 anos** (não 5) e deixa claro que **não há eliminação imediata de dados clínicos**.

## Fora de escopo (explícito)

- Firebase / FCM (push).
- Hard delete de dados clínicos.
- Automações complexas de purge ao fim do período (pode ficar story futura).
- Implementação completa de “direito ao apagamento” com eliminação física — aqui o modelo é **bloqueio + retenção**.

## Entregáveis esperados

- [ ] Esta story atualizada (ficheiro atual).
- [ ] Migração SQL: colunas/índices de bloqueio em `profiles` e/ou `patients` (ou tabela de estado dedicada).
- [ ] Ajustes RLS / policies: leitura admin em bloqueio; escrita negada para `user` em cadastro bloqueado.
- [ ] Server actions: pedido de bloqueio pelo titular; `blockAccountLgpd` / `unblockAccountLgpd` (nomes finais à escolha da implementação) com auditoria.
- [ ] UI `/configuracoes/deletar-conta`: copy e fluxo a refletir **bloqueio de acesso**, timeline **10 anos**, sem prometer “apagar já”.
- [ ] UI admin: desbloqueio auditado (mínimo viável).
- [ ] Testes: bloqueio, escrita negada, leitura admin, desbloqueio (Vitest e/ou RLS conforme padrão do repo).
- [ ] `_bmad-output/implementation-artifacts/sprint-status.yaml` — manter `11-7-exclusao-conta-lgpd` coerente com o estado da sprint após implementação.

## Qualidade obrigatória

- TypeScript strict sem `any`.
- Não expor tokens sensíveis em respostas JSON ao cliente.
- Mensagens de erro claras em português.
- Dupla verificação: regras no servidor **e** RLS onde aplicável.

## Tarefas de implementação (checklist para o agente dev)

### Dados e RLS

- [ ] Modelar `blocked_*` / `unblocked_*` (e `blocked_reason`) no sítio certo do schema multi-tenant.
- [ ] Políticas: INSERT/UPDATE/DELETE negados para dados clínicos do cadastro bloqueado quando `auth.uid()` é o profissional titular; leitura admin via claim/role já usado no projeto.
- [ ] Triggers ou validação centralizada para tentativas de escrita (log `WRITE_BLOCKED_LGPD`).

### Backend

- [ ] Ajustar `lib/actions/account-deletion.ts` (ou renomear para ações de “bloqueio LGPD”) para não simular “delete imediato” nem devolver segredos.
- [ ] Integração email (Resend): texto com retenção **10 anos** e links seguros (sem token em resposta HTTP).
- [ ] `proxy.ts` / sessão: negar login ou marcar sessão inválida para conta bloqueada (definir com `profiles`).

### Frontend

- [ ] Página `app/(app)/configuracoes/deletar-conta/page.tsx` + modais: copy e estados (pendente / bloqueado / desbloqueio admin).
- [ ] Área admin: ação de desbloqueio com confirmação e motivo opcional.

### Testes

- [ ] Testes unitários mínimos das regras de bloqueio (helpers).
- [ ] Onde existir suite RLS, casos para escrita bloqueada vs leitura admin.

## Arquivos prováveis (ajustar na implementação)

- `supabase/migrations/*_lgpd_block_retention_10y.sql` (novo nome sugerido)
- `lib/types/account-deletion.ts` ou `lib/types/lgpd-block.ts`
- `lib/actions/account-deletion.ts` (refatorar semântica)
- `lib/email/send-account-deletion-email-resend.ts` (copy 10 anos)
- `app/(app)/configuracoes/deletar-conta/page.tsx`
- `components/settings/deletion-request-modal.tsx`, `deletion-status-card.tsx`
- `app/(admin)/admin/...` (desbloqueio, se aplicável)
- `tests/...` (novos casos)

## Definição de pronto (DoD)

- [ ] Todos os critérios de aceitação verificados.
- [ ] `tsc` sem erros; lint limpo nos ficheiros tocados.
- [ ] Documentação de retenção **10 anos** visível ao utilizador e refletida na story/implementação.
- [ ] Sprint status atualizado quando a implementação for concluída.

---

## Dev Agent Record

### Debug Log

- (preencher durante implementação)

### Completion Notes

- (preencher ao concluir)

### File List

- (preencher ao concluir)

### Change Log

- 2026-04-10 — Story reescrita: bloqueio LGPD, retenção 10 anos, sem apagar dados clínicos; fora de escopo Firebase.

### Status

- **Story spec:** `ready-for-dev` (conteúdo alinhado ao novo modelo; implementação pendente de refactor face ao código legado da 11.7 anterior)
