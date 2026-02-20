# GitHub Pages Configuration for GuitarTune PWA

## ⚙️ Configuration GitHub Pages

Ce guide explique comment déployer **GuitarTune** sur GitHub Pages de manière optimale.

### 🚀 Déploiement Automatique

#### 1. Paramètres du Dépôt
- Allez dans **Settings → Pages** 
- **Source**: `Deploy from a branch`
- **Branch**: `main` (ou votre branche par défaut)
- **Folder**: `/` (racine, qui contient `index.html`)
- ✅ Cliquez sur **Save**

#### 2. Fichiers Clés

- **`.nojekyll`** — Obligatoire pour GitHub Pages
  - Désactive le traitement Jekyll
  - Force la livraison directe des fichiers statiques
  - **Important**: Le fichier est vide, juste sa présence suffit

- **`manifest.json`** — Configuration PWA
  - N'a pas besoin de modification
  - GitHub Pages servira correctement les manifests

- **`sw.js`** — Service Worker
  - Fonctionne nativement sur GitHub Pages (HTTPS obligatoire)
  - Câchera tous les assets

### 🔒 HTTPS & Sécurité

GitHub Pages fournit **HTTPS automatiquement** :
- ✅ Certificat SSL gratuit
- ✅ Renouvellement automatique
- ✅ Requis pour les PWA (obligatoire)

**Votre PWA sera accessible à:**
```
https://meurillonb.github.io/Accordeur/
```

### 📋 Caching Hors Ligne

**Gestion du caching:**
- Le Service Worker `sw.js` gère le caching côté client
- Stratégies: cache-first pour assets statiques, network-first pour pages
- Suffisant pour une expérience hors ligne complète

### 🔧 Configuration Avancée (Optionnel)

#### Custom Domain (Optionnel)

Si vous avez un domaine personnel:
1. Allez dans **Settings → Pages → Custom domain**
2. Entrez votre domaine (ex: `guitartune.com`)
3. Mettez à jour les DNS chez votre registraire
4. GitHub Pages renouvellera le certificat SSL

### ✅ Vérification Déploiement

Après l'activation:

1. **Attendez 1-2 minutes** pour le déploiement initial
2. **Vérifiez** : https://meurillonb.github.io/Accordeur/
3. **Testez la PWA:**
   - Ouvrez DevTools (F12) → **Application → Manifest** 
   - Vérifiez le manifest.json
   - Vérifiez le Service Worker dans **Service Workers**
4. **Testez l'installation:**
   - Sur mobile: tapez l'URL et cherchez "Installer l'app"
   - Sur desktop: l'icône "installer" apparaît dans la barre

### 🐛 Dépannage

**Le mode offline ne fonctionne pas ?**
- Effectuez un rechargement complet (**Ctrl+Shift+R** ou **Cmd+Shift+R**)
- Le Service Worker doit d'abord être enregistré

**Les fichiers static ne se cachent pas ?**
- Vérifiez que `sw.js` génère les caches correctement
- Cherchez les erreurs dans DevTools → **Application → Service Workers**

**L'installation PWA ne fonctionne pas ?**
- Vérifiez que vous utilisez **HTTPS** (GitHub Pages le fournit automatiquement)
- Vérifiez le `manifest.json` est valide
- Cherchez les erreurs console DevTools

### 📊 Fichiers Obligatoires pour GitHub Pages

```
/
├── index.html          ← Ouvrir quand on visite le site
├── manifest.json       ← PWA metadata
├── sw.js              ← Service Worker
├── app.js             ← Logic
├── style.css          ← Styles
├── .nojekyll          ← ✅ OBLIGATOIRE
└── GITHUB-PAGES.md    ← Cette doc
```

### 🌐 Résumé de Votre URL

| URL | Accès |
|-----|-------|
| `https://github.com/meurillonb/Accordeur` | Dépôt GitHub |
| `https://meurillonb.github.io/Accordeur/` | Site PWA en ligne |

---

**Questions?** Vérifiez la [Documentation PWA](./PWA-FEATURES.md) ou [Guide de Déploiement](./DEPLOYMENT.md).
