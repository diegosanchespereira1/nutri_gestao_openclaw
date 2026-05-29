#!/bin/bash

# Script de Publish Docker - NutriGestão
# Uso clássico: ./publish-docker.sh [username] [version]
# Exemplo: ./publish-docker.sh stratostech 0.1.0
#
# Modo dev (lê build args do ficheiro de env — copiar .env.dev.example → .env.dev):
#   ./publish-docker.sh --dev
#   ./publish-docker.sh --dev --tag DEV
#   ./publish-docker.sh --dev --tag dev-hml
#   ./publish-docker.sh --dev --tag dev --env-file .env.dev
#
# NEXT_SERVER_ACTIONS_ENCRYPTION_KEY (recomendado — Next.js Server Actions estáveis em Docker):
#   - export NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="$(openssl rand -base64 32)" antes do script, ou
#   - linha no .env.local ou .env.dev (conforme --env-file): NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=...

set -e

# Lê NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: variável de ambiente tem prioridade, senão primeira linha no ficheiro.
read_server_actions_encryption_key() {
  local from_file=""
  if [[ -f "$ENV_FILE" ]]; then
    from_file=$(awk -F= '/^NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=/{sub(/^[^=]*=/,""); print; exit}' "$ENV_FILE" 2>/dev/null || true)
  fi
  if [[ -n "${NEXT_SERVER_ACTIONS_ENCRYPTION_KEY:-}" ]]; then
    printf '%s' "$NEXT_SERVER_ACTIONS_ENCRYPTION_KEY"
  elif [[ -n "$from_file" ]]; then
    printf '%s' "$from_file"
  fi
}

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Valores padrão (não usar USERNAME — no macOS é o login curto e sobrepõe $1)
DOCKERHUB_USER="stratostech"
VERSION="0.1.0"
REPO="nutricao-stratostech"
ENV_FILE=".env.local"
DEV_MODE=false
DEV_TAG="dev"

# Compatibilidade com uso antigo positional args.
if [[ $# -gt 0 && "${1:0:1}" != "-" ]]; then
  DOCKERHUB_USER="$1"
  shift
fi
if [[ $# -gt 0 && "${1:0:1}" != "-" ]]; then
  VERSION="$1"
  shift
fi

# Flags novas.
while [[ $# -gt 0 ]]; do
  case "$1" in
    --dev)
      DEV_MODE=true
      shift
      ;;
    --tag)
      DEV_TAG="${2:-}"
      shift 2
      ;;
    --user)
      DOCKERHUB_USER="${2:-}"
      shift 2
      ;;
    --repo)
      REPO="${2:-}"
      shift 2
      ;;
    --env-file)
      ENV_FILE="${2:-}"
      shift 2
      ;;
    *)
      echo -e "${RED}✗ Flag inválida: $1${NC}"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Docker Hub Publisher - NutriGestão${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"

# Verificar se Docker está instalado
if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker não está instalado${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker detectado${NC}"

# Verificar se está logado no Docker
if ! docker info > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠ Não está logado no Docker Hub${NC}"
    echo -e "${YELLOW}  Executando: docker login${NC}"
    docker login
fi

echo -e "${GREEN}✓ Autenticado no Docker${NC}"

# Informações da build
echo ""
echo -e "${BLUE}📦 Informações da Build:${NC}"
echo "  Docker Hub user: $DOCKERHUB_USER"
echo "  Repositório: $REPO"
if [[ "$DEV_MODE" == true ]]; then
    echo "  Modo: DEV"
    echo "  Tag: $DEV_TAG"
    echo "  Env file: $ENV_FILE"
    echo "  URL Final: docker.io/$DOCKERHUB_USER/$REPO:$DEV_TAG"
else
    echo "  Versão: $VERSION"
    echo "  Env file (opcional, p/ chave de actions): $ENV_FILE"
    echo "  URL Final: docker.io/$DOCKERHUB_USER/$REPO:$VERSION"
fi
SA_KEY_PREVIEW="$(read_server_actions_encryption_key)"
if [[ -n "$SA_KEY_PREVIEW" ]]; then
    echo -e "  ${GREEN}NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: definida (build)${NC}"
else
    echo -e "  ${YELLOW}NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: ausente — recomendado para produção${NC}"
fi
echo ""

if [[ "$DEV_MODE" == true ]]; then
    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${RED}✗ Arquivo de env não encontrado: $ENV_FILE${NC}"
        exit 1
    fi

    # Lê apenas chaves necessárias para build (não exporta arquivo inteiro).
    NEXT_PUBLIC_SUPABASE_URL_VALUE=$(awk -F= '/^NEXT_PUBLIC_SUPABASE_URL=/{sub(/^[^=]*=/,""); print; exit}' "$ENV_FILE")
    NEXT_PUBLIC_SUPABASE_ANON_KEY_VALUE=$(awk -F= '/^NEXT_PUBLIC_SUPABASE_ANON_KEY=/{sub(/^[^=]*=/,""); print; exit}' "$ENV_FILE")
    NEXT_PUBLIC_SITE_URL_VALUE=$(awk -F= '/^NEXT_PUBLIC_SITE_URL=/{sub(/^[^=]*=/,""); print; exit}' "$ENV_FILE")

    if [[ -z "$NEXT_PUBLIC_SUPABASE_URL_VALUE" || -z "$NEXT_PUBLIC_SUPABASE_ANON_KEY_VALUE" ]]; then
        echo -e "${RED}✗ NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY ausentes em $ENV_FILE${NC}"
        exit 1
    fi

    if [[ -z "$NEXT_PUBLIC_SITE_URL_VALUE" ]]; then
        NEXT_PUBLIC_SITE_URL_VALUE="https://nutricao.stratostech.com.br"
        echo -e "${YELLOW}⚠ NEXT_PUBLIC_SITE_URL ausente; usando fallback: $NEXT_PUBLIC_SITE_URL_VALUE${NC}"
    fi

    BUILD_ID="$(git rev-parse --short HEAD 2>/dev/null || echo dev)"
    DEV_BUILD_ARGS=(
      --platform linux/amd64
      --build-arg "NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL_VALUE"
      --build-arg "NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY_VALUE"
      --build-arg "NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL_VALUE"
      --build-arg "NEXT_PUBLIC_APP_BUILD_ID=$BUILD_ID"
    )
    SA_KEY_DEV="$(read_server_actions_encryption_key)"
    if [[ -n "$SA_KEY_DEV" ]]; then
      DEV_BUILD_ARGS+=(--build-arg "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$SA_KEY_DEV")
    fi

    echo -e "${BLUE}[1/3] Build DEV com build-args do env...${NC}"
    if docker buildx build \
      "${DEV_BUILD_ARGS[@]}" \
      -t "$DOCKERHUB_USER/$REPO:$DEV_TAG" \
      --push .; then
        echo -e "${GREEN}✓ Buildx/push DEV concluído${NC}"
    else
        echo -e "${RED}✗ Erro durante buildx/push DEV${NC}"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✓ Publicação DEV concluída${NC}"
    echo -e "${BLUE}🐳 Imagem:${NC} $DOCKERHUB_USER/$REPO:$DEV_TAG"
    exit 0
fi

# Step 1: Build (modo clássico)
BUILD_ID="$(git rev-parse --short HEAD 2>/dev/null || echo "$VERSION")"
CLASSIC_BUILD_ARGS=(-t "$REPO:$VERSION" --build-arg "NEXT_PUBLIC_APP_BUILD_ID=$BUILD_ID")
SA_KEY_CLASSIC="$(read_server_actions_encryption_key)"
if [[ -n "$SA_KEY_CLASSIC" ]]; then
  CLASSIC_BUILD_ARGS+=(--build-arg "NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=$SA_KEY_CLASSIC")
fi

echo -e "${BLUE}[1/4] Fazendo build da imagem Docker...${NC}"
if docker build "${CLASSIC_BUILD_ARGS[@]}" .; then
    echo -e "${GREEN}✓ Build concluído${NC}"
else
    echo -e "${RED}✗ Erro durante build${NC}"
    exit 1
fi

# Step 2: Tagging
echo ""
echo -e "${BLUE}[2/4] Tagueando imagem...${NC}"
docker tag $REPO:$VERSION $DOCKERHUB_USER/$REPO:$VERSION
echo -e "${GREEN}  ✓ Tag: $DOCKERHUB_USER/$REPO:$VERSION${NC}"

docker tag $REPO:$VERSION $DOCKERHUB_USER/$REPO:latest
echo -e "${GREEN}  ✓ Tag: $DOCKERHUB_USER/$REPO:latest${NC}"

# Step 3: Push versão específica
echo ""
echo -e "${BLUE}[3/4] Fazendo push da versão específica...${NC}"
if docker push $DOCKERHUB_USER/$REPO:$VERSION; then
    echo -e "${GREEN}✓ Push de $VERSION concluído${NC}"
else
    echo -e "${RED}✗ Erro durante push${NC}"
    exit 1
fi

# Step 4: Push latest
echo ""
echo -e "${BLUE}[4/4] Fazendo push da versão latest...${NC}"
if docker push $DOCKERHUB_USER/$REPO:latest; then
    echo -e "${GREEN}✓ Push de latest concluído${NC}"
else
    echo -e "${RED}✗ Erro durante push${NC}"
    exit 1
fi

# Sucesso
echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Publicação concluída com sucesso!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BLUE}📍 Repositório no Docker Hub:${NC}"
echo -e "   https://hub.docker.com/r/$DOCKERHUB_USER/$REPO"
echo ""
echo -e "${BLUE}🐳 Para usar a imagem:${NC}"
echo -e "   docker pull $DOCKERHUB_USER/$REPO:$VERSION"
echo -e "   docker pull $DOCKERHUB_USER/$REPO:latest"
echo ""
echo -e "${BLUE}🚀 Para rodar:${NC}"
echo -e "   docker run -p 3000:3000 \\"
echo -e "     -e NEXT_PUBLIC_SUPABASE_URL='...' \\"
echo -e "     -e NEXT_PUBLIC_SUPABASE_ANON_KEY='...' \\"
echo -e "     -e NEXT_PUBLIC_SITE_URL='...' \\"
echo -e "     $DOCKERHUB_USER/$REPO:latest"
echo ""

# Mostrar informações da imagem
echo -e "${BLUE}📊 Informações da Imagem:${NC}"
docker images $DOCKERHUB_USER/$REPO --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
