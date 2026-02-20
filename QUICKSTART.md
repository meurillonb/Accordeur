# 🚀 Quick Start Guide — GuitarTune PWA

## ⚡ Démarrage en 30 secondes

### Option 1: Node.js + npm (Recommandé)
```bash
cd /workspaces/Accordeur
npm install
npm start
```
Puis ouvrez: **http://localhost:8000**

### Option 2: PHP
```bash
cd /workspaces/Accordeur
php -S localhost:8000
```

---

## ✨ Tester les Fonctionnalités PWA

### 1️⃣ Installation de l'App
```
1. Accédez à http://localhost:8000
2. Recherchez popup: "📱 Installer GuitarTune?"
3. Cliquez "Installer"
4. L'app s'ajoute à votre écran d'accueil
```

### 2️⃣ Mode Offline
```
DevTools → Application → Service Workers
→ Cochez "Offline"
→ L'app continue de fonctionner!
```

### 3️⃣ Notifications Update
```
1. Modifiez index.html
2. Changez CACHE_VERSION dans sw.js
3. Refreshez la page
4. Notification verte: "✨ Nouvelle version disponible"
```

### 4️⃣ Test sur Mobile
```
DevTools → Device Toolbar (Ctrl+Shift+M)
Sélectionnez: iPhone 12, Pixel 5, iPad...
```

### 5️⃣ Test Multi-appareils
```bash
# Depuis votre machine, accessible depuis téléphone
# Trouvez votre IP:
ipconfig getifaddr en0        # macOS
hostname -I                    # Linux
ipconfig                       # Windows

# Puis sur téléphone:
http://<YOUR_IP>:8000
```

---

## 🔍 Debugging

### Console Errors
```
DevTools → Console (F12)
Recherchez les [SW] messages pour Service Worker logs
```

### Service Worker Status
```
DevTools → Application → Service Workers
Voyez l'état: installing / installed / activated
```

### Cache Inspection
```
DevTools → Application → Cache Storage
Voyez: guitartune-static-v2, guitartune-runtime-v2
```

### Network Requests
```
DevTools → Network
Voyez which requêtes sont cached vs network
(Icône engrenage = cache)
```

---

## 🧪 Audit Lighthouse

### En DevTools
```
F12 → Lighthouse
→ Generate report
→ Observer les scores PWA
```

### Via CLI
```bash
npm run audit
# Ou directement
lighthouse http://localhost:8000 --view
```

### Via Web (production)
```
https://pagespeed.web.dev
Entrez votre URL en production
```

---

## 📱 Tester les Gestes

| Geste | Résultat |
|-------|----------|
| Appui long sur app (Android) | Affiche "Démarrer l'accordeur" shortcut |
| Clic droit icône app (Desktop) | Affiche le menu contextuel |
| Swipe para cambiar orientation | UI s'adapte automatiquement |
| Redimensionner la fenêtre | Layout s'ajuste (responsive) |

---

## 💻 Déploiement Local Avancé

### Serveur local (HTTP suffit pour le développement)
```bash
# HTTP fonctionne correctement pour tester la PWA en local
npm start
# Accédez à http://localhost:8000
# Les Service Workers fonctionnent en localhost même sans HTTPS
```

**Note**: HTTPS est requis en production, mais GitHub Pages/localhost exemptent ce besoin pour le développement.

### Docker (optionnel)
```bash
docker run -it --rm -p 8000:80 -v "$(pwd)":/var/www/html node:18-alpine npx http-server
# http://localhost:8000
```

---

## 🎯 Checklist de Test Complet

### ✅ Fonctionnalités de Base
- [ ] Microphone s'active/désactive
- [ ] Note s'affiche correctement
- [ ] Fréquence en Hz s'affiche
- [ ] Accord détecté (Em, Am, etc.)
- [ ] Jauge tourne avec la déviation
- [ ] Chromatic highlight s'active

### ✅ Responsive Design
- [ ] Mobile portrait (390px)
- [ ] Mobile landscape (844x390)
- [ ] Tablet (834x1194)
- [ ] Desktop (1920x1080)
- [ ] Ultra-wide (3440x1440)

### ✅ PWA Features
- [ ] Installation prompt
- [ ] App fonctionne standalone
- [ ] Offline mode
- [ ] Cache working
- [ ] Icons présents
- [ ] Update notification

### ✅ Performance
- [ ] Page load < 2s
- [ ] LCP < 2.5s
- [ ] FID < 100ms
- [ ] Cache hit > 80%

### ✅ Sécurité
- [ ] HTTPS fonctionne
- [ ] Permissions microphone demandées
- [ ] Headers de sécurité présents
- [ ] No console errors/warnings

---

## 📝 Fichiers Importants

| Fichier | Rôle |
|---------|------|
| `index.html` | App principale + liens CSS/JS |
| `app.js` | JavaScript externalisé |
| `style.css` | CSS externalisé |
| `manifest.json` | Configuration PWA |
| `sw.js` | Service Worker (cache & offline) |
| `package.json` | Scripts npm et dépendances |
| `.nojekyll` | Config GitHub Pages |

---

## 🐛 Problèmes Courants

### "Cannot load essentia.js"
```
Vérifiez votre connexion internet
Essentia charge depuis CDN
Fallback autocorrélation si besoin
Vérifiez la console pour les emsg
```

### "Service Worker won't register"
```
Vérifiez HTTPS (requis pour SW)
Vérifiez sw.js est accessible
F12 → Application → voir les logs
Chrome: Navigation → Scope
```

### "App n'installe pas"
```
Manifest.json doit être valide
Icons doivent être présentes
Doit avoir 192x192 minimum
Manifest doit avoir icons array
```

### "Offline ne fonctionne pas"
```
Visitez l'app une fois en ligne
Cache prendra quelques secondes
Vérifiez cache storage en DevTools
Try: Hard refresh (Ctrl+Shift+R)
```

---

## 📊 Fichiers de Configuration

### `package.json`
```json
Scripts npm pour dev, test, deploy
```

### `.gitignore`
```
Spécifie fichiers à ignorer en Git
```

---

## 🌐 En Production

Une fois testée localement:

```bash
# 1. Fix domain dans manifest.json
# 2. Générez certificat SSL (Let's Encrypt)
# 3. Déployez sur serveur HTTPS
# 4. Testez installation app
# 5. Audit final Lighthouse
# 6. Annoncez à vos utilisateurs!
```

---

## 📞 Besoin d'aide?

1. Consultez `PWA-FEATURES.md` pour détails
2. Consultez `DEPLOYMENT.md` pour production  
3. Ouvrez DevTools (F12) et inspectez
4. Vérifiez la console pour les erreurs
5. Test avec différents appareils

---

**Bon développement! 🎸✨**

Pour lancer rapidement:
```bash
cd /workspaces/Accordeur && npm start
```
