# GuitarTune — Accordeur Guitar PWA

## 📋 Améliorations avec Essentia.js

Le code JavaScript a été complètement actualisé pour utiliser **essentia.js**, une librairie d'analyse audio professionnelle pour une meilleure détection de pitch et de reconnaissance d'accord.

### ✨ Nouvelles Fonctionnalités

#### 1. **Détection de Pitch Améliorée**
- Utilise essentia.js pour l'analyse spectrale (SpectralPeaks)
- Algorithme autocorrélation amélioré en fallback
- Détection plus précise des fréquences fondamentales
- Plage de fréquence: 40-2000 Hz

#### 2. **Reconnaissance d'Accord** 🎸
Le tuner détecte automatiquement les accords standards jouées:
- **Em** (Mi mineur)
- **Am** (La mineur)
- **G** (Sol majeur)
- **D** (Ré majeur)
- **A** (La majeur)
- **E** (Mi majeur)
- **C** (Do majeur)

L'accord s'affiche en bas de l'écran principale avec l'emoji 🎸

#### 3. **Analyse Historique de Notes**
- Conserve les 10 dernières notes détectées
- Améliore la fiabilité de la reconnaissance d'accord
- Permet une meilleure analyse des patterns musicaux

### 🔧 Comment Utiliser

1. Cliquez sur le bouton microphone 🎙 pour activer l'écoute
2. Jouez une note ou un accord sur votre guitare
3. Le tuner affichera:
   - La note détectée (français/anglais)
   - La fréquence en Hz
   - L'écart en cents (♯ dièse/♭ bémol)
   - L'accord reconnu (si applicable)

### 📊 Indicateurs Visuels

- **🟢 Vert**: Note en accord (±5 cents)
- **🟡 Ambre**: Légèrement désaccordée (±20 cents)
- **🔴 Rouge**: Très désaccordée (>20 cents)

### 🛠️ Détails Techniques

**Librairies:**
- `essentia.js` - Analyse audio spectrale
- Web Audio API - Capture et traitement du son
- Canvas - Visualisation de la forme d'onde

**Paramètres Audio:**
- FFT Size: 2048
- Sample Rate: 44.1kHz (standard)
- Echo Cancellation: OFF (pour mejor accuracy)
- Auto Gain: OFF (pour contrôle manuel)

### 📱 PWA (Progressive Web App)

- Fonctionne hors ligne une fois chargé
- Installation sur l'écran d'accueil
- Service Worker pour le cache
