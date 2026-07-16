# Permissões do workspace — clientes, estabelecimentos e pacientes

Documento canónico do modelo de acesso à carteira (dados mestres) no NutriGestão.

Atualizado em: 2026-07-16  
Migrations: `20260830210000_allow_workspace_team_update_clients.sql`, `20260830220000_workspace_team_edit_patients_delete_gestao.sql`

## Matriz de acesso

| Ação | Titular da conta | Membro da equipa (ex.: nutricionista) | Cargo `gestao` | `admin` / `super_admin` (plataforma) |
|------|------------------|----------------------------------------|----------------|--------------------------------------|
| SELECT (mesmo tenant) | Sim | Sim | Sim | Via policies admin onde aplicável |
| INSERT clientes | Sim | Sim | Sim | — |
| UPDATE `clients` / `establishments` / `patients` | Sim | Sim | Sim | — |
| DELETE `clients` / `establishments` / `patients` | Sim | Não | Sim | Sim |

Isolamento multi-tenant: linhas com `owner_user_id` / `user_id` = `workspace_account_owner_id()`. Membros resolvem o titular via RPC / `team_members`.

## Helpers na aplicação (`lib/workspace.ts`)

| Função | Uso |
|--------|-----|
| `getWorkspaceAccountOwnerId` | UUID do titular (RPC `workspace_account_owner_id`, fallback `team_members`) |
| `isTeamMember` | `authUserId !== workspaceOwnerId` |
| `isWorkspaceGestaoMember` | Linha em `team_members` com `job_role = 'gestao'` |
| `canManageTeamMembers` | Titular, gestão ou admin/super_admin |
| `canDeleteWorkspaceMasterData` | Mesmo critério — apagar clientes / estabelecimentos / pacientes |

Server Actions relevantes: `lib/actions/clients.ts`, `lib/actions/establishments.ts`, `lib/actions/patients.ts`. A UI da zona de perigo só aparece quando `canDeleteWorkspaceMasterData` é verdadeiro.

## RLS (Postgres)

### UPDATE (equipa do workspace)

Policies `*_update_own` em `clients`, `establishments` e `patients` exigem:

- tenant correto (`owner_user_id` / `user_id` = `workspace_account_owner_id()`);
- utilizador em `workspace_member_user_ids()`;
- LGPD não bloqueia o actor (`profile_lgpd_is_actively_blocked`).

### DELETE (gestão+)

Função `SECURITY DEFINER`:

```sql
public.workspace_can_delete_master_data()
```

Verdadeiro se o actor for titular, membro com `job_role = 'gestao'`, ou `profiles.role` em `admin` / `super_admin`.

Usada em `clients_delete_own`, `establishments_delete_own`, `patients_delete_own`.

## UX — ficha do cliente

Em `components/clientes/client-form.tsx` (`mode="edit"`):

1. Por defeito: campos em modo leitura (sem botão Salvar).
2. Com permissão de edição: botão “Editar dados” (Pencil).
3. Em edição: campos habilitados + “Salvar alterações” + “Cancelar”.
4. Após sucesso: regressa à leitura e `router.refresh()`.

Criação (`mode="create"`) permanece sempre editável.

## Performance do save

Após `UPDATE`/`INSERT` de cliente, `revalidatePathsAfterClientSave` invalida apenas:

- `/clientes`
- `/clientes/[id]/editar`
- `/estabelecimentos` (se o estabelecimento PJ foi tocado)

Não revalida dashboard, visitas, checklists nem pacientes nesse caminho — `revalidatePath` não grava no banco; só limpa cache RSC do Next.js.

## Referências

- Código: [`lib/workspace.ts`](../../lib/workspace.ts)
- Form: [`components/clientes/client-form.tsx`](../../components/clientes/client-form.tsx)
- Testes unitários: [`lib/workspace.test.ts`](../../lib/workspace.test.ts)
- Testes RLS (isolamento entre tenants): [`tests/rls/`](../../tests/rls/)
