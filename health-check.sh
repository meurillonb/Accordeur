#!/bin/bash

# ═══════════════════════════════════════════════════════════════
# GuitarTune PWA - Health Check Script
# Vérifie que tous les composants fonctionnent correctement
# ═══════════════════════════════════════════════════════════════

echo "🎸 GuitarTune PWA Health Check"
echo "═══════════════════════════════════════════════════════════"

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction de vérification
check() {
  if [ $1 -eq 0 ]; then
    echo -e "${GREEN}✓${NC} $2"
  else
    echo -e "${RED}✗${NC} $2"
  fi
}

# 1. Vérification des fichiers core
echo -e "\n${BLUE}📁 Fichiers Core${NC}"
[ -f "index.html" ] && echo -e "${GREEN}✓${NC} index.html" || echo -e "${RED}✗${NC} index.html manquant"
[ -f "app.js" ] && echo -e "${GREEN}✓${NC} app.js" || echo -e "${RED}✗${NC} app.js manquant"
[ -f "style.css" ] && echo -e "${GREEN}✓${NC} style.css" || echo -e "${RED}✗${NC} style.css manquant"
[ -f "manifest.json" ] && echo -e "${GREEN}✓${NC} manifest.json" || echo -e "${RED}✗${NC} manifest.json manquant"
[ -f "sw.js" ] && echo -e "${GREEN}✓${NC} sw.js" || echo -e "${RED}✗${NC} sw.js manquant"

# 2. Vérification configuration PWA
echo -e "\n${BLUE}📱 Configuration PWA${NC}"
if [ -f "manifest.json" ]; then
  grep -q '"display": "standalone"' manifest.json && echo -e "${GREEN}✓${NC} Mode standalone" || echo -e "${RED}✗${NC} Mode standalone manquant"
  grep -q '"start_url"' manifest.json && echo -e "${GREEN}✓${NC} Start URL définie" || echo -e "${RED}✗${NC} Start URL manquante"
  grep -q '"icons"' manifest.json && echo -e "${GREEN}✓${NC} Icons configurées" || echo -e "${RED}✗${NC} Icons manquantes"
fi

# 3. Vérification Tailwind CSS
echo -e "\n${BLUE}🎨 Tailwind CSS${NC}"
[ -f "tailwind.config.js" ] && echo -e "${GREEN}✓${NC} tailwind.config.js" || echo -e "${RED}✗${NC} Configuration Tailwind manquante"
if [ -f "index.html" ]; then
  grep -q "tailwindcss.com" index.html && echo -e "${GREEN}✓${NC} CDN Tailwind chargé" || echo -e "${RED}✗${NC} CDN Tailwind manquant"
  grep -q "bg-bg-primary" index.html && echo -e "${GREEN}✓${NC} Classes Tailwind utilisées" || echo -e "${YELLOW}⚠${NC} Classes Tailwind peu utilisées"
fi

# 4. Vérification Essentia.js
echo -e "\n${BLUE}🎵 Essentia.js${NC}"
if [ -f "index.html" ]; then
  grep -q "essentia.js" index.html && echo -e "${GREEN}✓${NC} Essentia.js chargé" || echo -e "${RED}✗${NC} Essentia.js manquant"
fi
if [ -f "app.js" ]; then
  grep -q "initEssentia" app.js && echo -e "${GREEN}✓${NC} Initialisation Essentia" || echo -e "${RED}✗${NC} Init Essentia manquante"
  grep -q "detectPitchEssentia" app.js && echo -e "${GREEN}✓${NC} Détection pitch Essentia" || echo -e "${RED}✗${NC} Détection pitch manquante"
  grep -q "autoCorrelate" app.js && echo -e "${GREEN}✓${NC} Fallback autocorrélation" || echo -e "${RED}✗${NC} Fallback manquant"
fi

# 5. Vérification package.json
echo -e "\n${BLUE}📦 Dependencies${NC}"
if [ -f "package.json" ]; then
  grep -q '"http-server"' package.json && echo -e "${GREEN}✓${NC} http-server" || echo -e "${RED}✗${NC} http-server manquant"
  grep -q '"tailwindcss"' package.json && echo -e "${GREEN}✓${NC} tailwindcss" || echo -e "${YELLOW}⚠${NC} tailwindcss en devDep seulement"
  grep -q '"essentia.js"' package.json && echo -e "${GREEN}✓${NC} essentia.js" || echo -e "${YELLOW}⚠${NC} essentia.js via CDN"
fi

# 6. Vérification scripts npm
echo -e "\n${BLUE}⚙️  Scripts NPM${NC}"
if [ -f "package.json" ]; then
  grep -q '"start"' package.json && echo -e "${GREEN}✓${NC} npm start" || echo -e "${RED}✗${NC} npm start manquant"
  grep -q '"dev"' package.json && echo -e "${GREEN}✓${NC} npm run dev" || echo -e "${RED}✗${NC} npm run dev manquant"
  grep -q '"build"' package.json && echo -e "${GREEN}✓${NC} npm run build" || echo -e "${YELLOW}⚠${NC} npm run build basique"
fi

# 7. Test serveur (optionnel)
echo -e "\n${BLUE}🌐 Test Serveur (optionnel)${NC}"
if command -v node &> /dev/null; then
  if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} Node.js disponible"
    if npm list http-server &> /dev/null; then
      echo -e "${GREEN}✓${NC} http-server installé"
    else
      echo -e "${YELLOW}⚠${NC} http-server non installé (npm install requis)"
    fi
  fi
else
  echo -e "${YELLOW}⚠${NC} Node.js non disponible, test serveur ignoré"
fi

# 8. Vérification responsive
echo -e "\n${BLUE}📱 Responsive Design${NC}"
if [ -f "style.css" ]; then
  grep -q "safe-area-inset" style.css && echo -e "${GREEN}✓${NC} Safe areas iOS/Android" || echo -e "${RED}✗${NC} Safe areas manquantes"
  grep -q "dvh" style.css && echo -e "${GREEN}✓${NC} Viewport dynamique" || echo -e "${YELLOW}⚠${NC} Viewport statique"
fi
if [ -f "index.html" ]; then
  grep -q "viewport-fit=cover" index.html && echo -e "${GREEN}✓${NC} Viewport cover" || echo -e "${RED}✗${NC} Viewport cover manquant"
fi

# 9. Performance optimizations
echo -e "\n${BLUE}⚡ Performance${NC}"
if [ -f "index.html" ]; then
  grep -q "defer" index.html && echo -e "${GREEN}✓${NC} Scripts defer" || echo -e "${YELLOW}⚠${NC} Scripts pas defer"
  grep -q "preconnect" index.html && echo -e "${GREEN}✓${NC} DNS preconnect" || echo -e "${YELLOW}⚠${NC} DNS preconnect manquant"
fi
if [ -f "style.css" ]; then
  grep -q "gpu-accelerated" style.css && echo -e "${GREEN}✓${NC} GPU acceleration" || echo -e "${YELLOW}⚠${NC} GPU acceleration manquante"
  grep -q "will-change" style.css && echo -e "${GREEN}✓${NC} Will-change hints" || echo -e "${YELLOW}⚠${NC} Will-change manquant"
fi

# Résumé
echo -e "\n${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🎸 Health Check Terminé!${NC}"
echo -e "\n${YELLOW}📋 Pour démarrer l'accordeur:${NC}"
echo -e "   1. ${BLUE}npm install${NC} (première fois)"
echo -e "   2. ${BLUE}npm start${NC} (démarre le serveur)"
echo -e "   3. Ouvrir ${BLUE}http://localhost:8000${NC}"
echo -e "\n${YELLOW}🚀 Pour le développement:${NC}"
echo -e "   • ${BLUE}npm run dev${NC} (mode développement)"
echo -e "   • ${BLUE}npm run build${NC} (build production)"
echo ""