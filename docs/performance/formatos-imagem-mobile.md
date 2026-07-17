# Formatos de imagem em dispositivos móveis — referência e estratégia de upload

**Contexto:** auditoria de uploads (jul/2026). Uploads falhavam de forma diferente conforme o aparelho porque cada SO/fabricante produz formatos distintos e o app só aceitava JPEG/PNG/WebP no servidor.

## 1. O que cada plataforma produz

### iOS (iPhone/iPad)

| Origem | Formato | Observações |
|---|---|---|
| Câmera padrão (iOS 11+) | **HEIC** (HEIF/HEVC) | Padrão de fábrica ("Alta eficiência"). MIME às vezes vazio ao selecionar da galeria |
| Câmera em "Mais compatível" | JPEG | Ajustes → Câmera → Formatos |
| ProRAW (iPhone 12 Pro+) | **DNG** | RAW — browser não decodifica; deve ser rejeitado com mensagem clara |
| Capturas de tela | PNG | |
| Fotos recebidas (WhatsApp etc.) | JPEG | Já comprimidas |
| Safari com `accept="image/jpeg,..."` | Transcodifica HEIC→JPEG automaticamente | Só quando o accept NÃO inclui `image/*`/heic |
| Live Photos | HEIC + MOV | Ao selecionar, entrega o still (HEIC) |

### Android

| Origem | Formato | Observações |
|---|---|---|
| Câmera padrão (maioria) | JPEG | |
| Samsung com "Fotos HEIF" ativado | **HEIC** | Igual iPhone; comum em Galaxy S/Note |
| Pixel/apps com economia | **WebP** | Também gerado por apps de edição |
| Android 12+ (galeria/edição) | **AVIF** | Crescente; browser decodifica (Chrome 85+), mas servidor rejeitava |
| Android 14+ (Ultra HDR) | JPEG com gain map | Compatível — decodifica como JPEG normal |
| Modo RAW | DNG | Rejeitar com mensagem clara |
| Motion Photos (Samsung/Pixel) | JPEG com MP4 embutido | Chega como .jpg grande — compressão resolve |
| Capturas de tela | PNG | |

### Peculiaridades de MIME (já tratadas em `lib/images/image-mime.ts`)

`image/jpg`, `image/pjpeg`, `image/jfif`, `image/x-png`, MIME vazio ou `application/octet-stream` (comum ao vir de apps de mensagens/arquivos) → resolvidos por alias + extensão.

## 2. Tamanhos reais (por que compressão no cliente é obrigatória)

Câmeras atuais: 12MP (iPhone base) a 200MP (Galaxy Ultra). Foto típica: JPEG 3–8MB; HEIC 2–5MB que **cresce ao converter para JPEG** (4–10MB). Sem redimensionar, qualquer limite de 5–6MB rejeita fotos legítimas — era a principal causa de "não consigo enviar foto" fora do checklist.

## 3. Estratégia adotada

**Princípio: o servidor só recebe JPEG/PNG/WebP pequenos; toda conversão acontece no dispositivo.**

Pipeline único em `lib/images/prepare-image-upload.ts`:

1. Rejeição imediata e explicada de RAW/TIFF/PSD (`.dng`, `.cr2`, `.nef`, `.arw`, `.tif`, `.psd`).
2. HEIC/HEIF → JPEG via `heic-to/csp` (WASM, compatível com a CSP de produção).
3. Decodificação universal (`createImageBitmap` com fallback `<img>`): cobre JPEG, PNG, WebP, **AVIF**, GIF, BMP e aplica orientação EXIF.
4. Redimensionamento ao lado máximo do caso de uso (1920px checklist; 1600px paciente; 1024px logo; 512px avatar).
5. Recompressão JPEG com qualidade degressiva (0.85 → 0.7 → 0.55) até caber no limite; PNG preservado quando transparência importa (logos).
6. Mensagens de erro específicas por causa (formato RAW, falha HEIC, imagem ilegível, excesso após compressão).

Benefícios: elimina rejeições por formato/tamanho, reduz upload de ~5MB para ~300–800KB (menos banda 4G, menos RAM na VPS, menos storage no Supabase).

## 4. Estado da adoção por campo

| Campo | Status |
|---|---|
| Foto de paciente | ✅ Migrado para `prepareImageForUpload` (jul/2026) |
| Fotos de checklist | ⚠️ Pipeline próprio equivalente (HEIC + compressão 1920px) — migrar para o util comum por consistência |
| Logo do cliente (`client-form`) | ❌ Pendente — sem HEIC, sem compressão |
| Logo do tenant (`tenant-logo-form`) | ❌ Pendente |
| Imagem de receita (`recipe-image-field`) | ❌ Pendente |
| Foto/assinatura de perfil (`perfil-form`) | ❌ Pendente |
| Exames do cliente (aceita `image/*`) | ❌ Pendente — HEIC selecionável mas rejeitado no servidor |

Ao migrar cada campo: usar `accept="image/*"` (deixar o pipeline filtrar, com mensagens claras) e remover validações de tamanho pré-compressão.

## 5. Nota arquitetural (Fase 4 do plano)

Mesmo comprimidas, as fotos passam pela VPS (RAM) antes do Supabase Storage. Quando o volume crescer, migrar para **signed upload URLs** (browser → Storage direto), tirando a VPS do caminho do upload — ver plano de auditoria, achado A4.
