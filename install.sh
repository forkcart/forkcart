#!/usr/bin/env bash
set -euo pipefail

# ForkCart Installer
# Usage: curl -fsSL https://forkcart.com/install.sh | bash
#   or:  curl -fsSL https://forkcart.com/install.sh | bash -s my-shop

REPO="forkcart/forkcart"
GREEN='\033[0;32m'
CYAN='\033[0;36m'
DIM='\033[2m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

PROJECT_NAME="${1:-my-shop}"

echo ""
echo -e "  ${BOLD}${CYAN}🍴 ForkCart Installer${NC}"
echo ""

# Check prerequisites
check() {
  if command -v "$1" &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} $1 found"
    return 0
  else
    echo -e "  ${RED}✖${NC} $1 not found"
    return 1
  fi
}

MISSING=0
check node || MISSING=1
check pnpm || MISSING=1
check git  || MISSING=1

if [ "$MISSING" -eq 1 ]; then
  echo ""
  echo -e "  ${RED}Missing prerequisites. Install them first:${NC}"
  echo -e "  ${DIM}Node.js 22+: https://nodejs.org${NC}"
  echo -e "  ${DIM}pnpm:        npm install -g pnpm${NC}"
  echo ""
  exit 1
fi

echo ""

# Get latest release tag
echo -ne "  ${CYAN}⠋${NC} Checking latest version..."
TAG=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" 2>/dev/null | grep '"tag_name"' | head -1 | sed 's/.*: *"//;s/".*//' || echo "")

if [ -z "$TAG" ]; then
  TAG="main"
  echo -e "\r  ${GREEN}✓${NC} Using development branch (no releases yet)"
else
  echo -e "\r  ${GREEN}✓${NC} Latest version: ${BOLD}$TAG${NC}"
fi

# Clone
echo -ne "  ${CYAN}⠋${NC} Downloading ForkCart..."
if [ "$TAG" = "main" ]; then
  git clone --depth 1 "https://github.com/$REPO.git" "$PROJECT_NAME" &>/dev/null
else
  git clone --depth 1 --branch "$TAG" "https://github.com/$REPO.git" "$PROJECT_NAME" &>/dev/null
fi
rm -rf "$PROJECT_NAME/.git"
echo -e "\r  ${GREEN}✓${NC} Downloaded ForkCart $TAG"

# Install
echo -ne "  ${CYAN}⠋${NC} Installing dependencies..."
cd "$PROJECT_NAME"
pnpm install --silent &>/dev/null
echo -e "\r  ${GREEN}✓${NC} Installed dependencies"

# Launch installer
echo ""
echo -e "  ${BOLD}${GREEN}🚀 Launching setup wizard...${NC}"
echo ""
echo -e "  Open ${BOLD}${CYAN}http://localhost:4200${NC} in your browser"
echo -e "  ${DIM}The wizard will configure your database, create an admin"
echo -e "  account, and start your store automatically.${NC}"
echo ""

pnpm installer
