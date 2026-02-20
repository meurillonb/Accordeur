# 🎸 GuitarTune — Progressive Web App (PWA)

Accordeur guitare professionnel avec détection d'accord IA utilisant **Essentia.js**.

## ✨ Caractéristiques PWA

### 📱 Multi-appareils
- ✅ **Desktop** - Expérience optimale sur grands écrans
- ✅ **Tablette** - Interface adaptive avec grilles flexibles
- ✅ **Mobile** - Design mobile-first, fonctionne en portrait/paysage

### 🌐 Fonctionnalité hors ligne
- 📦 Cache intelligent avec Service Worker v2
- 🔄 Stratégies de cache adaptées (cache-first, network-first)
- 📡 Sync automatique au retour en ligne
- 📊 Indicateur de statut en ligne/hors ligne

### 🚀 Installation
- 📥 Prompt d'installation native
- 🏠 Ajout à l'écran d'accueil
- ⭐ Shortcuts et actions rapides
- 🔔 Notifications des mises à jour

### 🎯 Fonctionnalités audio
- 🎶 Détection de pitch avec Essentia.js
- 🎸 Reconnaissance d'accords (Em, Am, G, D, A, E, C)
- 📊 Analyse spectrale avancée
- 📈 Visualisation d'onde en temps réel

---

## 🛠️ Installation & Déploiement

### Prérequis
- Serveur web (Apache, Nginx, Node.js, etc.)
- HTTPS obligatoire pour PWA
- Support des Service Workers

### Déploiement local (développement)

#### Avec Node.js (http-server)
```bash
cd /workspaces/Accordeur
npm install
npm start
# Accédez à http://localhost:8000
```

#### Avec PHP
```bash
cd /workspaces/Accordeur
php -S localhost:8000
```

### Déploiement en production

**Pour le moment, utilisez GitHub Pages** (zéro configuration requise - voir section GitHub Pages ci-dessus).

Pour un déploiement futur sur serveur:

#### Apache (futur)
```bash
a2enmod rewrite
a2enmod expires
a2enmod deflate
a2enmod headers
# Certificat SSL/TLS (Let's Encrypt recommandé)
```

#### Nginx
```nginx
server {
    listen 443 ssl http2;
    server_name guitartune.example.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    root /var/www/guitartune;
    
    # Cache busting
    location / {
        try_files $uri $uri/ /index.html;
        
        # Service worker & manifest
        location ~ \.(json|js)$ {
            add_header Cache-Control "public, max-age=0, must-revalidate";
        }
        
        # Static assets
        location ~ \.(css|svg|woff2)$ {
            add_header Cache-Control "public, max-age=31536000, immutable";
        }
    }
    
    # Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript;
}
```

#### Node.js (Express)
```javascript
const express = require('express');
const compression = require('compression');
const app = express();

app.use(compression());
app.use(express.static('.', {
    maxAge: '1d',
    etag: false
}));

app.get('*', (req, res) => {
    res.sendFile('./index.html');
});

app.listen(3000, () => {
    console.log('GuitarTune running on port 3000');
});
```

#### GitHub Pages 🌐 (RECOMMANDÉ)

**La méthode la plus simple et gratuite!**

```bash
# 1. Poussez votre code sur GitHub
git push origin main

# 2. Allez dans Settings → Pages
# 3. Branch: main | Folder: / 
# 4. Attendez 1-2 minutes

# C'est tout ! Votre site est en ligne à:
# https://meurillonb.github.io/Accordeur/
```

**Configuration automatique:**
- ✅ HTTPS fourni par GitHub (gratuit, renouvelé auto)
- ✅ Domaine personnalisé optionnel
- ✅ Zéro frais de serveur
- ✅ Les fichiers statiques sont servis directement

**Fichier obligatoire:**
- `.nojekyll` — Désactive Jekyll, force la livraison directe

📖 Voir [GITHUB-PAGES.md](./GITHUB-PAGES.md) pour les détails complets.

---

## 📋 Structure des fichiers

```
.
├── index.html           # App principale + liens CSS/JS externes
├── app.js              # JavaScript externalisé
├── style.css           # CSS externalisé
├── manifest.json        # Configuration PWA
├── sw.js               # Service Worker (cache & offline)
├── .nojekyll           # ⚠️ Obligatoire pour GitHub Pages
└── README.md           # Documentation
```

### 📌 Notes de Configuration GitHub Pages

| Élément | Statut |
|---------|--------|
| `.nojekyll` | ✅ **Obligatoire** - Désactive Jekyll |
| `sw.js` | ✅ Utilisé pour caching |
| HTTPS | ✅ Fourni automatiquement par GitHub |
| Cache headers | Géré par Service Worker |

---

## 🔧 Configuration

### Manifest.json
Personnalisez les champs:
- `name` - Nom complet de l'app
- `short_name` - Nom court (≤12 caractères)
- `theme_color` - Couleur de la barre de navigation
- `background_color` - Couleur de fond du splash screen
- `start_url` - URL d'accueil

### Service Worker
- Version: `guitartune-v2`
- Caches: Static + Runtime
- Stratégies: Cache-first (assets), Network-first (pages)

---

## 🌍 Recommandations de déploiement

### Domaine personnalisé
1. Optez pour un domaine court et mémorable
2. HTTPS obligatoire (Let's Encrypt gratuit)
3. Redirection HTTP → HTTPS

### Performance
- **Compression**: Gzip activée
- **Cache loin**: 1 an pour les assets
- **Cache court**: 0s pour manifest/SW
- **CDN**: Envisagez Cloudflare ou Fastly

### Monitoring
- 🔍 Google Search Console
- 📊 Google Analytics
- 📱 PWA Builder (Microsoft)
- ✅ Lighthouse (Chrome DevTools)

---

## 📱 Installation sur appareils

### Android
1. Ouvrez le site
2. Menu → "Installer l'app" ou maintenez le bouton d'accueil
3. Confirmez

### iOS (via Web Clip)
1. Safari → Partage → Ajouter à l'écran d'accueil
2. Configurez le nom et l'icône

### Desktop (Windows/macOS/Linux)
1. Cliquez sur l'icône d'installation dans la barre d'adresse
2. Ou Menu → "Installer GuitarTune"
3. L'app s'ouvre dans une fenêtre indépendante

---

## 🚨 Dépannage

### L'app n'installe pas
- ✅ Vérifier HTTPS
- ✅ Vérifier manifest.json valide
- ✅ Vérifier Service Worker enregistré
- ✅ Consulter DevTools → Application

### Service Worker ne se met à pas à jour
- ✅ Forcer l'actualisation: Ctrl+Shift+R
- ✅ Aller à DevTools → Application → Clear storage
- ✅ Réenregistrer le SW

### Microphone n'accède pas
- ✅ Vérifier permissions du navigateur
- ✅ Vérifier HTTPS
- ✅ Réinitialiser les permissions du site

---

## 📊 Tests

### Test hors ligne
1. DevTools → Application → Service Workers
2. Cochez "Offline"
3. Vérifiez que l'app fonctionne

### Tests multi-appareils
- Chrome DevTools → Device Toggle
- Pour tablette: Pixel Tablet (834px)
- Pour mobile: iPhone 12 (390px)

---

## 📈 Versioning

Mettez à jour `CACHE_VERSION` dans `sw.js` et `manifest.json` lors de changements:
```javascript
const CACHE_VERSION = 'guitartune-v2';
```

Les utilisateurs recevront une notification "Nouvelle version disponible" et pourront mettre à jour.

---

## 📄 Licence

Libre d'utilisation. Crédit apprécié.

---

## 🤝 Support

Issues et améliorations bienvenues!

**GuitarTune PWA — Accordez votre guitare n'importe où, n'importe quand** 🎸
