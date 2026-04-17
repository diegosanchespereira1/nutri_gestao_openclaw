# Stack Conventions — NutriGestão

## Convenção de Linguagem (obrigatória)

- Todo texto visível para utilizadores finais (labels, botões, mensagens de erro, toasts, empty states e emails) deve usar **português do Brasil (pt-BR)**.
- Evitar termos de português de Portugal, por exemplo:
  - usar **senha** em vez de *palavra-passe*
  - usar **salvar** em vez de *guardar*
  - usar **cadastro** em vez de *registo*
  - usar **link** em vez de *ligação* (quando for URL/ação de email)
- Em reviews, qualquer regressão para pt-PT deve ser tratada como ajuste obrigatório antes do merge.

## Supabase Client Patterns

### Server Component (leitura)
```typescript
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('clients')
    .select(`
      id, name, type,
      establishments(id, name, type)
    `)
    .order('name')

  if (error) throw error
  return <ClientList clients={data} />
}
```

### Server Action (mutação)
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createClient(formData: FormData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const name = formData.get('name') as string
  const type = formData.get('type') as 'PF' | 'PJ'

  if (!name?.trim()) {
    return { error: 'Nome é obrigatório' }
  }

  const { error } = await supabase
    .from('clients')
    .insert({ name, type, user_id: user.id })

  if (error) {
    console.error('Erro ao criar cliente:', error)
    return { error: 'Erro ao salvar. Tente novamente.' }
  }

  revalidatePath('/app/clientes')
  redirect('/app/clientes')
}
```

### Client Component com useActionState
```typescript
'use client'
import { useActionState } from 'react'
import { createClient } from './actions'

export function ClientForm() {
  const [state, action, isPending] = useActionState(createClient, null)

  return (
    <form action={action}>
      {state?.error && (
        <p className="text-sm text-destructive">{state.error}</p>
      )}
      <input name="name" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Salvando...' : 'Salvar'}
      </button>
    </form>
  )
}
```

## Padrões de Migração SQL

### Template completo de tabela nova
```sql
-- Story X.Y: Descrição
-- Migration: supabase/migrations/YYYYMMDDHHMMSS_nome.sql

CREATE TABLE IF NOT EXISTS nome_tabela (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Campos da tabela
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),

  -- Metadados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_nome_tabela_user_id ON nome_tabela(user_id);
CREATE INDEX IF NOT EXISTS idx_nome_tabela_created_at ON nome_tabela(user_id, created_at DESC);

-- Trigger de updated_at
DROP TRIGGER IF EXISTS set_updated_at ON nome_tabela;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON nome_tabela
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS
ALTER TABLE nome_tabela ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own data" ON nome_tabela
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON nome_tabela
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON nome_tabela
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON nome_tabela
  FOR DELETE USING (auth.uid() = user_id);

-- Comentários
COMMENT ON TABLE nome_tabela IS 'Story X.Y: Descrição do propósito';
COMMENT ON COLUMN nome_tabela.user_id IS 'Tenant identifier — profissional dono dos dados';
```

### Tabela com relação (estabelecimento filho de cliente)
```sql
-- Chave estrangeira que respeita RLS
-- O user_id é propagado para garantir isolamento
CREATE TABLE establishments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  -- ...
);

-- Policy com join para verificar ownership do pai
CREATE POLICY "Users can view own establishments" ON establishments
  FOR SELECT USING (auth.uid() = user_id);
```

## Padrões de Componente UI

### Card de listagem com ações
```typescript
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ItemCardProps {
  item: { id: string; name: string; status: string }
  onEdit?: () => void
}

export function ItemCard({ item, onEdit }: ItemCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{item.name}</CardTitle>
        <span className={cn(
          'text-xs px-2 py-1 rounded-full',
          item.status === 'active' ? 'bg-teal-100 text-teal-800' : 'bg-gray-100 text-gray-600'
        )}>
          {item.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      </CardHeader>
      <CardContent className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          Editar
        </Button>
      </CardContent>
    </Card>
  )
}
```

### Estado vazio (empty state)
```typescript
import { FolderOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function EmptyState({ title, description, action, actionLabel }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-sm">{description}</p>
      {action && (
        <Button onClick={action} className="mt-4">{actionLabel}</Button>
      )}
    </div>
  )
}
```

### Skeleton loader
```typescript
import { Skeleton } from '@/components/ui/skeleton'

export function ItemListSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      ))}
    </div>
  )
}
```

## Upload de Arquivos (Supabase Storage)

```typescript
// Server Action para upload
export async function uploadPhoto(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')

  const file = formData.get('photo') as File
  const ext = file.name.split('.').pop()
  const path = `${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage
    .from('photos') // bucket configurado no Supabase
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error
  return { path }
}
```

## Tratamento de Erros do Supabase

```typescript
// Tradução de erros comuns para PT-BR
function translateSupabaseError(error: PostgrestError): string {
  if (error.code === '23505') return 'Este registro já existe.'
  if (error.code === '23503') return 'Não é possível excluir: existem registros vinculados.'
  if (error.code === '42501') return 'Sem permissão para esta ação.'
  return 'Erro inesperado. Tente novamente.'
}
```

## Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
# NUNCA expor SUPABASE_SERVICE_ROLE_KEY no client
```
