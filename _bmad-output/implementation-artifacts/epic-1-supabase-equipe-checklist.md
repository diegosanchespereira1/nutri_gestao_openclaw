# Épico 1 — checklist Supabase (equipe / operações)

Documento para **revisão conjunta** quando algo no auth/MFA/recuperação não bater com o esperado. O código assume estes pontos no projeto Supabase.

## 1. URLs de redirecionamento (Auth)

Em **Authentication → URL Configuration**:

- **Site URL**: origem da app em dev/prod (ex.: `http://127.0.0.1:3000`, `https://…`).
- **Redirect URLs** (adicionar todas as que usar):
  - `http://127.0.0.1:3000/auth/callback`
  - `http://127.0.0.1:3000/auth/reset-password`
  - Idem para o domínio de produção.

Sem isto, confirmação de email, OAuth (futuro) e **reset de palavra-passe** falham após o clique no link.

## 2. Email (confirmação de registo)

Se **“Confirm email”** estiver ativo, o utilizador precisa de abrir o link do email (fluxo PKCE → `/auth/callback`).  
Se estiver desativo, o registo pode devolver sessão imediata (a app trata os dois casos).

## 3. MFA / 2FA (Story 1.9)

- Ativar **MFA (TOTP)** nas definições de Auth do Supabase, conforme documentação atual do projeto.
- Se `mfa.enroll` falhar no browser, verificar primeiro se o método TOTP está permitido no *dashboard*.

## 4. Base de dados

Aplicar migrações (local ou remoto):

```bash
supabase db push
# ou, em CI: supabase migration up
```

Ficheiro: `supabase/migrations/20260331120000_profiles.sql` (tabela `profiles`, RLS, trigger pós-`auth.users`).

## 5. Política de recuperação de palavra-passe

A UI segue o PRD: **mensagem genérica** após pedido de reset (não revela se o email existe).  
O Supabase, por defeito, também evita enumeração na API de reset — validar em *staging* com tráfego real.

## 6. Problemas conhecidos / escalação

| Sintoma | Onde olhar |
|--------|------------|
| “Invalid redirect URL” | Redirect URLs + Site URL |
| Sessão não persiste após login | Cookies; mesmo domínio; middleware |
| Perfil não criado ao registo | Trigger `on_auth_user_created`; logs Postgres |
| QR 2FA não aparece | Formato `qr_code` (SVG vs data URL); consola |
| Reset password não abre sessão | Link expirado; Redirect URL de reset |

*Última atualização: 2026-03-31*
