/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune — Platform: Android                              */
/* Détection et configuration spécifiques Android              */
/* ═════════════════════════════════════════════════════════════ */

function detectAndroid() {
  return /Android/.test(navigator.userAgent);
}

// Configuration audio Android
function setupAndroidAudio() {
  if (!IS_ANDROID) return;
  console.log('[Android] Mode compatible activé');
}

// Contraintes audio Android (supporte plus d'options qu'iOS)
function getAndroidAudioConstraints() {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: 44100
    }
  };
}

// Message d'erreur microphone spécifique Android
function getAndroidMicError() {
  return 'Microphone inaccessible.\n\nVérifiez les permissions dans les paramètres de votre navigateur.';
}

// Guide d'installation PWA Android (Chrome)
function getAndroidInstallGuide() {
  return `
    1. Tapez le menu ⋮ en haut à droite<br/>
    2. Sélectionnez "Installer l'application"<br/>
    3. Confirmez
  `;
}

// Message d'erreur détaillé pour Android
function getAndroidMicErrorDetail(errorName) {
  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        message: 'Permission refusée',
        solution: 'Autorisez l\'accès au microphone dans les paramètres du navigateur'
      };
    default:
      return null;
  }
}
