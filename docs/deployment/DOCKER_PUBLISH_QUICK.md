# 🚀 Quick Start: Publicar no Docker Hub

## ⚡ TL;DR - 30 Segundos

```bash
# 1. Login
docker login

# 2. Build & Push (automático)
./publish-docker.sh seu-username 0.1.0

# 3. ✅ Pronto!
```

## 📋 Variantes

### Opção 1: Script Automático (Recomendado)

```bash
# Com valores padrão (username: stratostech, version: 0.1.0)
./publish-docker.sh

# Com valores customizados
./publish-docker.sh seu-username 0.2.0
```

### Opção 2: Comandos Manuais

```bash
# Login
docker login

# Build
docker build -t nutricao-gestao:0.1.0 .

# Tag
docker tag nutricao-gestao:0.1.0 seu-username/nutricao-gestao:0.1.0
docker tag nutricao-gestao:0.1.0 seu-username/nutricao-gestao:latest

# Push
docker push seu-username/nutricao-gestao:0.1.0
docker push seu-username/nutricao-gestao:latest
```

### Opção 3: Docker Buildx (Múltiplas Arquiteturas)

```bash
docker buildx create --name mybuilder
docker buildx use mybuilder
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t seu-username/nutricao-gestao:0.1.0 \
  --push .
```

## 🔑 Primeiro Acesso ao Docker Hub

1. Criar conta: https://hub.docker.com/signup
2. Gerar token: https://hub.docker.com/settings/security
3. Login:
   ```bash
   docker login
   # Username: seu_username
   # Password: seu_token (não é a senha!)
   ```

## ✅ Verificar Publicação

```bash
# Listar imagens locais
docker images | grep nutricao-gestao

# Verificar no Docker Hub
# URL: https://hub.docker.com/r/seu-username/nutricao-gestao

# Pull para testar
docker pull seu-username/nutricao-gestao:latest
```

## 🐳 Rodar a Imagem

```bash
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anonima" \
  -e NEXT_PUBLIC_SITE_URL="https://seu-site.com.br" \
  seu-username/nutricao-gestao:latest
```

Acesse: http://localhost:3000

## 📚 Documentação Completa

Ver: `DOCKER_HUB_PUBLISH.md`

## 🆘 Troubleshooting Rápido

| Erro | Solução |
|------|---------|
| "unauthorized: authentication required" | `docker logout` → `docker login` |
| "no such file or directory" | `chmod +x publish-docker.sh` |
| "failed to solve" | `docker build --no-cache -t ...` |
| Imagem muito grande | Verificar `.dockerignore` |
