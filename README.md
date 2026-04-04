# NutriGestão

SaaS de nutrição (planeamento em `_bmad-output/planning-artifacts/`).

## Requisitos

- Node.js 20+
- Opcional: [Supabase CLI](https://supabase.com/docs/guides/cli) para desenvolvimento local

## Configuração

1. Copiar variáveis de ambiente:

   ```bash
   cp .env.example .env.local
   ```

2. Preencher `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (projeto Supabase cloud ou local).

   Com stack local na pasta `supabase/`:

   ```bash
   supabase start
   supabase status
   ```

   Usar a **anon** key e a API URL indicadas (nunca expor **service role** no browser).

## Comandos

| Comando        | Descrição              |
|----------------|------------------------|
| `npm run dev`  | Servidor de desenvolvimento (Next.js) |
| `npm run build`| Build de produção      |
| `npm run start`| Servidor após `build`  |
| `npm run lint` | ESLint                 |

## Stack (Story 1.1)

- Next.js (App Router), TypeScript, Tailwind CSS v4
- Auth/sessão Supabase via `@supabase/ssr` e cookies (middleware + server client)

## UI (Story 1.2)

- [shadcn/ui](https://ui.shadcn.com/) (base-nova) — `components/ui/*`
- Temas NutriGestão: `app/styles/theme-nutri-teal.css` (defeito no `<html>`) e `theme-nutri-ref-a.css` (demo na página inicial)
- Espelho dos tokens de planeamento: `_bmad-output/planning-artifacts/theme-nutri-*.css`

## Área logada (Story 1.3)

- Rotas sob `app/(app)/` com layout partilhado: sidebar fixa a partir de **1024px** (`lg`), menu em **Sheet** (ícone *hamburger*) abaixo disso — inclui &lt;768px conforme UX.
- Entrada de demonstração: `/inicio` (ligação também na página `/`).
- *Skip link* “Saltar para conteúdo” no shell (WCAG).

## Autenticação e perfil (Stories 1.4–1.9)

- **Público:** `/login`, `/register`, `/forgot-password`, `/auth/reset-password`, `/auth/callback`.
- **Palavra-passe visível:** em `/login` e `/register`, cada campo de palavra-passe tem um botão com ícone de olho (mostrar/ocultar o texto enquanto se escreve); implementação em `components/auth/password-field.tsx`.
- **Área logada:** middleware + layout exigem sessão; **Sair** no menu (invalida sessão).
- **Perfil / CRN:** `/perfil` (tabela `profiles` — aplicar migração em `supabase/migrations/`).
- **2FA (TOTP):** `/definicoes/seguranca` (requer MFA ativo no projeto Supabase).

Checklist de configuração Supabase (URLs, MFA, migrações):  
`_bmad-output/implementation-artifacts/epic-1-supabase-equipe-checklist.md`

### Recuperar palavra-passe (email → nova palavra-passe)

O pedido em `/forgot-password` usa `redirectTo` para **`/auth/callback?next=/auth/reset-password`** (igual ao fluxo PKCE do registo). Sem isto, o código da ligação do email não é trocado por sessão no servidor e o fluxo falha.

No Dashboard Supabase → **Authentication → URL Configuration**, as **Redirect URLs** devem incluir, no mínimo:

- `http://localhost:3000/auth/callback` (e `http://127.0.0.1:3000/auth/callback` se usar esse host)
- A URL de produção equivalente com `/auth/callback`

Se o email abrir noutro host que o da app (ex. `127.0.0.1` vs `localhost`), defina `NEXT_PUBLIC_SITE_URL` igual ao host que recebe o clique (ver `.env.example`).

### `POST .../auth/v1/recover` 429 (Too Many Requests)

O GoTrue limita quantos emails de recuperação podem ser pedidos **por endereço IP e por email** num intervalo de tempo. Várias tentativas seguidas (ou testes no mesmo dia) bastam para atingir o limite — não implica necessariamente um bug. Aguardar alguns minutos costuma resolver. Em desenvolvimento, repetir “Enviar instruções” ou pedidos falhados contam para o mesmo limite.

### “email rate limit exceeded” (Dashboard ou Auth logs)

É o **limite global de emails de autenticação** do projeto (confirmação de conta, recuperação de palavra-passe, *magic link*, etc.), não só recuperação. Depois de muitos testes, o SMTP integrado do Supabase deixa de enviar até a janela resetar (pode ser **horas**, conforme plano e política atual). Mitigações: aguardar; reduzir emails de teste (ex. desativar “Confirm email” em dev); em **Authentication → Emails** configurar **SMTP próprio** (limites passam a depender do teu fornecedor); rever quotas do [plano Supabase](https://supabase.com/pricing).

### Consola do browser: `POST .../auth/v1/token 400 (Bad Request)`

Quando o login **falha** (palavra-passe errada, conta inexistente, email ainda não confirmado, etc.), o Supabase Auth responde com **HTTP 400** e o Chrome/DevTools mostram esse pedido na consola — **não indica por si um bug na app**, só que o servidor recusou o *grant* com palavra-passe. Veja a mensagem em vermelho no formulário de login (`mapSupabaseLoginError` em `lib/map-supabase-auth-error.ts`). Em desenvolvimento, se quiser entrar sem abrir o email de confirmação: no Dashboard Supabase → Authentication → Providers → Email, pode desativar temporariamente “Confirm email”.
