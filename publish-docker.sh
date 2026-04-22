#!/bin/bash

# Script de Publish Docker - NutriGestão
# Uso: ./publish-docker.sh [username] [version]
# Exemplo: ./publish-docker.sh stratostech 0.1.0

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Valores padrão
USERNAME=${1:-stratostech}
VERSION=${2:-0.1.0}
REPO="nutricao-gestao"

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
echo "  Username: $USERNAME"
echo "  Repositório: $REPO"
echo "  Versão: $VERSION"
echo "  URL Final: docker.io/$USERNAME/$REPO:$VERSION"
echo ""

# Step 1: Build
echo -e "${BLUE}[1/4] Fazendo build da imagem Docker...${NC}"
if docker build -t $REPO:$VERSION .; then
    echo -e "${GREEN}✓ Build concluído${NC}"
else
    echo -e "${RED}✗ Erro durante build${NC}"
    exit 1
fi

# Step 2: Tagging
echo ""
echo -e "${BLUE}[2/4] Tagueando imagem...${NC}"
docker tag $REPO:$VERSION $USERNAME/$REPO:$VERSION
echo -e "${GREEN}  ✓ Tag: $USERNAME/$REPO:$VERSION${NC}"

docker tag $REPO:$VERSION $USERNAME/$REPO:latest
echo -e "${GREEN}  ✓ Tag: $USERNAME/$REPO:latest${NC}"

# Step 3: Push versão específica
echo ""
echo -e "${BLUE}[3/4] Fazendo push da versão específica...${NC}"
if docker push $USERNAME/$REPO:$VERSION; then
    echo -e "${GREEN}✓ Push de $VERSION concluído${NC}"
else
    echo -e "${RED}✗ Erro durante push${NC}"
    exit 1
fi

# Step 4: Push latest
echo ""
echo -e "${BLUE}[4/4] Fazendo push da versão latest...${NC}"
if docker push $USERNAME/$REPO:latest; then
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
echo -e "   https://hub.docker.com/r/$USERNAME/$REPO"
echo ""
echo -e "${BLUE}🐳 Para usar a imagem:${NC}"
echo -e "   docker pull $USERNAME/$REPO:$VERSION"
echo -e "   docker pull $USERNAME/$REPO:latest"
echo ""
echo -e "${BLUE}🚀 Para rodar:${NC}"
echo -e "   docker run -p 3000:3000 \\"
echo -e "     -e NEXT_PUBLIC_SUPABASE_URL='...' \\"
echo -e "     -e NEXT_PUBLIC_SUPABASE_ANON_KEY='...' \\"
echo -e "     -e NEXT_PUBLIC_SITE_URL='...' \\"
echo -e "     $USERNAME/$REPO:latest"
echo ""

# Mostrar informações da imagem
echo -e "${BLUE}📊 Informações da Imagem:${NC}"
docker images $USERNAME/$REPO --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
