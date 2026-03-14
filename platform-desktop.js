/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune — Platform: Desktop (macOS / Windows / Linux)    */
/* Détection et configuration spécifiques navigateur desktop   */
/* ═════════════════════════════════════════════════════════════ */

function detectDesktop() {
  const ua = navigator.userAgent;
  // Desktop = ni iOS, ni Android
  if (IS_IOS || IS_ANDROID) return false;
  return /Macintosh|MacIntel|Windows|Linux|X11/.test(ua);
}

// Configuration audio Desktop
function setupDesktopAudio() {
  if (!IS_DESKTOP) return;
  console.log('[Desktop] Mode standard activé');
}

// Contraintes audio Desktop (support complet)
function getDesktopAudioConstraints() {
  return {
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      sampleRate: 44100,
      sampleSize: 16
    }
  };
}

// Message d'erreur microphone Desktop
function getDesktopMicError() {
  return 'Microphone inaccessible : vérifiez les permissions de votre navigateur.';
}

// Guide d'installation PWA macOS Safari
function getMacOSInstallGuide() {
  return `
    1. Cliquez le menu "Partage" (↗️)<br/>
    2. Sélectionnez "Ajouter à la base de lecture"<br/>
    3. Confirmez
  `;
}

// Message d'erreur détaillé pour Desktop
function getDesktopMicErrorDetail(errorName) {
  switch (errorName) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return {
        message: 'Permission refusée',
        solution: 'Autorisez l\'accès au microphone dans les paramètres'
      };
    case 'NotFoundError':
      return {
        message: 'Microphone non détecté',
        solution: 'Vérifiez que votre appareil a un microphone'
      };
    case 'NotReadableError':
      return {
        message: 'Microphone en utilisation',
        solution: 'Fermez les autres apps utilisant le microphone'
      };
    default:
      return null;
  }
}
