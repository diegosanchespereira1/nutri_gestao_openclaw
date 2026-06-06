# Docker Hub Publish - NutriGestão

## 📋 Pré-requisitos

1. **Docker instalado**: https://www.docker.com/products/docker-desktop
2. **Conta no Docker Hub**: https://hub.docker.com
3. **Credenciais do Docker Hub**: seu username e token de acesso

## 🔑 Passo 1: Login no Docker Hub

```bash
docker login
```

**Quando pedir:**
- Username: seu username do Docker Hub
- Password: seu token de acesso (gere em https://hub.docker.com/settings/security)

## 🏗️ Passo 2: Build da Imagem Docker

```bash
# Build com tag local
docker build \
  --build-arg NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co" \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anonima" \
  --build-arg NEXT_PUBLIC_SITE_URL="https://seu-site.com.br" \
  -t nutricao-gestao:0.1.0 \
  .

# Ou simplesmente:
docker build -t nutricao-gestao:0.1.0 .
```

### ⚠️ Variáveis de Ambiente Necessárias:

- `NEXT_PUBLIC_SUPABASE_URL` - URL do seu projeto Supabase
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Chave anônima do Supabase
- `NEXT_PUBLIC_SITE_URL` - URL do seu site em produção

## 🏷️ Passo 3: Tag para Docker Hub

```bash
# Replace SEU_USERNAME com seu username do Docker Hub
docker tag nutricao-gestao:0.1.0 seu-username/nutricao-gestao:0.1.0
docker tag nutricao-gestao:0.1.0 seu-username/nutricao-gestao:latest
```

**Exemplo:**
```bash
docker tag nutricao-gestao:0.1.0 stratostech/nutricao-gestao:0.1.0
docker tag nutricao-gestao:0.1.0 stratostech/nutricao-gestao:latest
```

## 🚀 Passo 4: Push para Docker Hub

```bash
# Push versão específica
docker push seu-username/nutricao-gestao:0.1.0

# Push latest
docker push seu-username/nutricao-gestao:latest
```

## ✅ Verificação

1. Acesse https://hub.docker.com/repositories
2. Procure por `seu-username/nutricao-gestao`
3. Verifique se as tags `0.1.0` e `latest` aparecem

## 🐳 Usar a Imagem (Pull)

```bash
docker pull seu-username/nutricao-gestao:latest

# Ou rodá-la
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="https://seu-projeto.supabase.co" \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="sua-chave-anonima" \
  -e NEXT_PUBLIC_SITE_URL="https://seu-site.com.br" \
  seu-username/nutricao-gestao:latest
```

## 📜 Script Automatizado (Opcional)

Crie um arquivo `publish-docker.sh`:

```bash
#!/bin/bash

USERNAME=${1:-stratostech}
VERSION="0.1.0"
REPO="nutricao-gestao"

echo "🐳 Building Docker image..."
docker build -t $REPO:$VERSION .

echo "🏷️  Tagging image..."
docker tag $REPO:$VERSION $USERNAME/$REPO:$VERSION
docker tag $REPO:$VERSION $USERNAME/$REPO:latest

echo "🚀 Pushing to Docker Hub..."
docker push $USERNAME/$REPO:$VERSION
docker push $USERNAME/$REPO:latest

echo "✅ Done! Image published to Docker Hub"
echo "📍 URL: https://hub.docker.com/r/$USERNAME/$REPO"
```

**Uso:**
```bash
chmod +x publish-docker.sh
./publish-docker.sh stratostech
```

## 🔐 Segurança

⚠️ **NUNCA commitar credenciais no código!**

### Para variáveis sensíveis em produção:

1. Use Docker secrets (Swarm)
2. Use environment variables (Kubernetes)
3. Use AWS Secrets Manager / Azure Key Vault
4. Use Supabase edge functions para proxy

### No `.dockerignore`:
```
.env
.env.local
.git
node_modules
.next
```

## 📊 Tagging Strategy (Recomendado)

```bash
# Versionado (semantic versioning)
docker tag ... seu-username/nutricao-gestao:0.1.0
docker tag ... seu-username/nutricao-gestao:0.1

# Latest
docker tag ... seu-username/nutricao-gestao:latest

# Git commit hash (para rastreabilidade)
docker tag ... seu-username/nutricao-gestao:abc1234
```

## 🔄 CI/CD com GitHub Actions (Futuro)

```yaml
name: Publish to Docker Hub

on:
  push:
    tags:
      - 'v*'

jobs:
  docker:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: docker/setup-buildx-action@v2
      
      - uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_TOKEN }}
      
      - uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: |
            ${{ secrets.DOCKER_USERNAME }}/nutricao-gestao:${{ github.ref_name }}
            ${{ secrets.DOCKER_USERNAME }}/nutricao-gestao:latest
          build-args: |
            NEXT_PUBLIC_SUPABASE_URL=${{ secrets.SUPABASE_URL }}
            NEXT_PUBLIC_SUPABASE_ANON_KEY=${{ secrets.SUPABASE_ANON_KEY }}
            NEXT_PUBLIC_SITE_URL=${{ secrets.SITE_URL }}
```

## 📱 Testar a Imagem Localmente

```bash
# Build
docker build -t nutricao-gestao:test .

# Rodar
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_SUPABASE_URL="..." \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY="..." \
  -e NEXT_PUBLIC_SITE_URL="..." \
  nutricao-gestao:test

# Testar
curl http://localhost:3000
```

## 🆘 Troubleshooting

### "unauthorized: authentication required"
```bash
docker logout
docker login
```

### "error reading from server: dial tcp: lookup docker.io on X: no such host"
- Verifique conexão de internet

### "failed to solve with frontend dockerfile.v0"
```bash
docker build --no-cache -t nutricao-gestao:0.1.0 .
```

## 📚 Referências

- [Docker Build Reference](https://docs.docker.com/engine/reference/commandline/build/)
- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Next.js Docker Guide](https://nextjs.org/docs/deployment/docker)
