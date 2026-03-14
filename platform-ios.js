/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune — Platform: iOS                                  */
/* Détection et configuration spécifiques iOS / iPadOS         */
/* ═════════════════════════════════════════════════════════════ */

// Détection iOS robuste (iOS 15 à 26+, iPadOS, iPhone 15 Pro, etc.)
function detectIOS() {
  const ua = navigator.userAgent;
  // Méthode 1: UA classique (iOS < 17)
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // Méthode 2: iPad avec desktop UA (iPadOS 13+)
  if (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) return true;
  // Méthode 3: Safari mobile WebKit (iOS 17+, 26+)
  if (/Macintosh/.test(ua) && 'ontouchend' in document) return true;
  // Méthode 4: webkit spécifique iOS
  if (window.webkit && window.webkit.messageHandlers) return true;
  // Méthode 5: Vérifie les API spécifiques iOS
  if (/AppleWebKit/.test(ua) && /Mobile/.test(ua)) return true;
  return false;
}

// Configuration audio spéciale iOS
function setupIOSAudio() {
  if (!IS_IOS) return;
  console.log('[iOS] Mode compatible activé');
}

// Contraintes audio iOS (pas de sampleRate/channelCount/sampleSize)
function getIOSAudioConstraints() {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false
    }
  };
}

// Message d'erreur microphone spécifique iOS
function getIOSMicError() {
  return 'Microphone non accessible.\n\n1. Vérifiez : Réglages > Safari > Microphone\n2. Rechargez cette page\n3. Appuyez sur Autoriser quand demandé';
}

// Guide d'installation PWA iOS
function getIOSInstallGuide() {
  return `
    1. Tapez le bouton Partage (↗️)<br/>
    2. Sélectionnez "Sur l'écran d'accueil"<br/>
    3. Confirmez
  `;
}

// Message d'erreur détaillé pour iOS
function getIOSMicErrorDetail(errorName) {
  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        message: 'Permission refusée',
        solution: 'Vérifiez: Réglages → GuitarTune → Microphone'
      };
    default:
      return null;
  }
}
