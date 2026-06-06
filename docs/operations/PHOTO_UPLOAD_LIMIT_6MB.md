# Aumento do Limite de Upload de Fotos para 6MB

## 📋 Resumo

Foi aumentado o limite máximo de tamanho de arquivo para upload de fotos de checklist de **1MB** para **6MB**, permitindo que fotos tiradas com câmara de telemóvel (que typically excedem 1MB) sejam enviadas sem problemas.

## 🎯 Problema Identificado

- Usuários recebiam erro ao tentar fazer upload de imagens com mais de 1MB
- Fotos de câmara de telemóvel geralmente têm 2-5MB dependendo da resolução
- Sistema estava rejeitando uploads válidos

## ✅ Solução Implementada

### 1. **Constante no Backend (já configurada)**
**Arquivo**: `lib/constants/checklist-fill-photos-storage.ts`
```typescript
export const CHECKLIST_FILL_PHOTO_MAX_BYTES = 6 * 1024 * 1024; // 6 MB
```
✅ **Status**: Já estava correto no código

### 2. **Validação no Server Action (já configurada)**
**Arquivo**: `lib/actions/checklist-fill-photos.ts` (linha 241-243)
```typescript
if (file.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) {
  return { ok: false, error: "A imagem é demasiado grande (máx. 6 MB)." };
}
```
✅ **Status**: Já valida corretamente

### 3. **Texto de Ajuda (já configurado)**
**Arquivo**: `components/checklists/checklist-item-photos.tsx` (linha 178)
```typescript
<p>
  Em telemóvel ou tablet, use <strong>Tirar foto</strong> para abrir a câmara;{" "}
  <strong>Galeria</strong> para escolher uma imagem já guardada. Formatos JPEG,
  PNG ou WebP até 6 MB. A localização é opcional se o browser permitir.
</p>
```
✅ **Status**: Já menciona 6 MB

### 4. **Configuração Local (Supabase CLI)**
**Arquivo**: `supabase/config.toml` (linha 108)
```toml
[storage]
file_size_limit = "50MiB"
```
✅ **Status**: Já permite 50MiB (mais que 6MB necessário)

## 🔧 Ação Necessária no Supabase Hosted

Para o ambiente de **produção** (Supabase hosted), você precisa:

1. Aceder ao dashboard do Supabase: https://app.supabase.com
2. Navegar até: **Storage** → **Buckets**
3. Encontrar o bucket `checklist-fill-photos`
4. Clicar em **Edit**
5. Alterar **Max file size** para `6 MiB` (ou 6291456 bytes)
6. Salvar

## 📊 Resumo de Limites

| Tipo | Localização | Limite | Status |
|------|---|---|---|
| Código TypeScript | `lib/constants/checklist-fill-photos-storage.ts` | 6 MB | ✅ Correto |
| Validação Server Action | `lib/actions/checklist-fill-photos.ts` | 6 MB | ✅ Correto |
| Texto de Ajuda | `components/checklists/checklist-item-photos.tsx` | 6 MB | ✅ Correto |
| Local Supabase | `supabase/config.toml` | 50 MB | ✅ Suficiente |
| **Supabase Hosted** | **Dashboard** | **Precisa ↑** | ⚠️ Ação manual |

## 🎯 Próximos Passos

1. **Testar em desenvolvimento local** ✅ Pronto
   - Upload de imagens até 6MB já funciona

2. **Deploy para staging** (se aplicável)
   - Aplicar as mudanças antes de fazer deploy

3. **Configurar no Supabase hosted** (IMPORTANTE)
   - Abrir dashboard e alterar o limite do bucket
   - Sem essa etapa, o ambiente de produção ainda rejeitará uploads > 1MB

## 🔍 Verificação

Para verificar se está funcionando:

1. Navegue até um dossier
2. Abra a seção de anexar fotos
3. Tiue uma foto com a câmara ou escolha uma da galeria
4. A foto deve ter entre 2-5MB (tamanho típico de câmara)
5. Clique em "Tirar foto" ou "Galeria"
6. A imagem deve fazer upload sem erros

## 📝 Notas Técnicas

- O limite de 6MB é baseado em:
  - Resolução típica de câmaras de telemóvel: 12-48MP
  - Compressão JPEG padrão: resulta em 2-5MB
  - Margem de segurança: 6MB permite até compressão mínima
- Tipos suportados: JPEG, PNG, WebP
- Localização (GPS) é capturada automaticamente quando disponível
- Máximo de 12 fotos por item (configurable em `CHECKLIST_FILL_PHOTOS_MAX_PER_ITEM`)

## 🔗 Referências

- [Supabase Storage Limits](https://supabase.com/docs/guides/storage/storage-limits)
- [File Upload Handling](lib/actions/checklist-fill-photos.ts)
- [Configuration](lib/constants/checklist-fill-photos-storage.ts)
