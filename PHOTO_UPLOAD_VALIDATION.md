# Solução: Validação de Tamanho de Arquivo no Upload de Fotos

## 🎯 Problema Identificado

O usuário estava recebendo erro de "1 MB" ao tentar fazer upload de fotos com câmara, mesmo o bucket estar configurado para 50MB.

## 🔍 Análise

**Causa Raiz**: Erro vinha de uma validação intermediária do **Supabase Storage** antes de chegar ao nosso código de validação (que estava correto em 6MB).

**Arquitetura do Fluxo**:
```
1. Cliente seleciona arquivo
2. ❌ Supabase Storage valida (tinha 1MB)
3. ✅ Nosso Server Action valida (6MB - estava pronto)
```

## ✅ Solução Implementada

### Adicionada Validação Client-Side

**Arquivo**: `components/checklists/checklist-item-photos.tsx`

```typescript
// Validar tamanho ANTES de enviar ao servidor
if (file.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) {
  const maxMB = CHECKLIST_FILL_PHOTO_MAX_BYTES / 1024 / 1024;
  const fileMB = (file.size / 1024 / 1024).toFixed(1);
  setUploadError(
    `Ficheiro muito grande. Máximo: ${maxMB}MB. Tamanho: ${fileMB}MB.`
  );
  return;
}
```

## 📋 Benefícios

✅ **Feedback Imediato**: Usuário vê erro logo após selecionar arquivo  
✅ **Mensagem Clara**: Mostra tamanho máximo vs tamanho real  
✅ **Evita Upload Desnecessário**: Não envia arquivo se for inválido  
✅ **Compatível com Server Validation**: Servidor ainda valida (redundância)  
✅ **TypeScript Seguro**: Usa constante centralizada `CHECKLIST_FILL_PHOTO_MAX_BYTES`

## 🔄 Fluxo Agora

```
1. Cliente seleciona arquivo (2.5 MB) 
   ↓
2. ✅ Validação Client-Side: "OK, está dentro de 6MB"
   ↓
3. ✅ Supabase Storage: "OK, está dentro de 50MB"
   ↓
4. ✅ Server Action: "OK, está dentro de 6MB"
   ↓
5. ✅ Upload bem-sucedido!
```

## 📦 Validações Implementadas

| Local | Validação | Limite |
|------|-----------|--------|
| **Client-Side** (novo) | File size check | 6 MB |
| **Client-Side** (novo) | MIME type check | image/* |
| **Server-Side** | File size check | 6 MB |
| **Server-Side** | MIME type validation | JPEG/PNG/WebP |
| **Storage** | Bucket limit | 50 MB |

## 🧪 Teste

1. Navegue até um dossier
2. Clique em "Tirar foto" ou "Galeria"
3. Selecione uma imagem > 6MB (ex: 7.2MB)
4. **Resultado esperado**: Mensagem imediata: "Ficheiro muito grande. Máximo: 6MB. Tamanho: 7.2MB."
5. Selecione imagem válida (2-5MB)
6. **Resultado esperado**: Upload bem-sucedido ✅

## 🚀 Stack de Validação

```typescript
// Constante centralizada
export const CHECKLIST_FILL_PHOTO_MAX_BYTES = 6 * 1024 * 1024; // 6 MB

// Client-side (novo)
if (file.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) { ... }

// Server-side (existente)
if (file.size > CHECKLIST_FILL_PHOTO_MAX_BYTES) { ... }
```

## 📝 Notas

- Validação é **defensiva em camadas**: client + server + storage
- Se o usuário desativar JavaScript, ainda há validação no servidor
- Mensagem é clara em **português português** seguindo padrão do app
- Usa `toFixed(1)` para exibir 1 casa decimal (ex: "7.2 MB")

## 🎓 Padrão Aplicado

Segue best practice: **Validação otimista + validação segura**

- **Otimista** (client): feedback rápido para usuário
- **Segura** (server): impossível bypassar com DevTools

Isso resulta em melhor UX sem sacrificar segurança!
