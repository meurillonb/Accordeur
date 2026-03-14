/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune — Platform: Common                               */
/* Orchestration plateforme, détection, utilitaires partagés   */
/* ═════════════════════════════════════════════════════════════ */

// ──────── DÉTECTION PLATEFORME GLOBALE ────────
const IS_IOS = detectIOS();
const IS_ANDROID = detectAndroid();
const IS_DESKTOP = detectDesktop();

const PLATFORM_NAME = IS_IOS ? 'iOS' : IS_ANDROID ? 'Android' : IS_DESKTOP ? 'Desktop' : 'Unknown';
console.log('[Platform]', PLATFORM_NAME, '| iOS:', IS_IOS, '| Android:', IS_ANDROID, '| Desktop:', IS_DESKTOP, '| UA:', navigator.userAgent);

// ──────── CONFIGURATION AUDIO PAR PLATEFORME ────────
function getPlatformAudioConstraints() {
  if (IS_IOS) return getIOSAudioConstraints();
  if (IS_ANDROID) return getAndroidAudioConstraints();
  return getDesktopAudioConstraints();
}

function setupPlatformAudio() {
  if (IS_IOS) setupIOSAudio();
  else if (IS_ANDROID) setupAndroidAudio();
  else setupDesktopAudio();
}

// ──────── MESSAGES D'ERREUR PAR PLATEFORME ────────
function getPlatformMicError(error) {
  const errorName = error ? error.name : '';
  
  // Essaie d'abord les messages spécifiques plateforme
  let detail = null;
  if (IS_IOS) detail = getIOSMicErrorDetail(errorName);
  else if (IS_ANDROID) detail = getAndroidMicErrorDetail(errorName);
  else detail = getDesktopMicErrorDetail(errorName);
  
  if (detail) return detail;
  
  // Messages génériques par type d'erreur
  switch (errorName) {
    case 'NotAllowedError':
      return { message: 'Permission refusée', solution: 'Autorisez l\'accès au microphone' };
    case 'NotFoundError':
      return { message: 'Microphone non détecté', solution: 'Vérifiez que votre appareil a un microphone' };
    case 'NotReadableError':
      return { message: 'Microphone en utilisation', solution: 'Fermez les autres apps utilisant le microphone' };
    case 'PermissionDeniedError':
      return { message: 'Permission de microphone refusée', solution: 'Autorisez l\'accès au microphone dans les paramètres' };
    default:
      return { message: 'Erreur microphone : ' + errorName, solution: '' };
  }
}

function getPlatformMicErrorAlert(error) {
  if (IS_IOS) return getIOSMicError();
  if (IS_ANDROID) return getAndroidMicError();
  return getDesktopMicError() + (error ? ' ' + error.message : '');
}

// ──────── GUIDES D'INSTALLATION PWA ────────
function getPlatformInstallGuide() {
  if (IS_IOS) return { platform: 'iOS', html: getIOSInstallGuide() };
  if (IS_ANDROID) return { platform: 'Android', html: getAndroidInstallGuide() };
  // macOS Safari
  const ua = navigator.userAgent;
  const isMac = /Macintosh|MacIntel/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edge|OPR|Firefox/.test(ua);
  if (isMac && isSafari) return { platform: 'macOS', html: getMacOSInstallGuide() };
  return null;
}

// ──────── ACCESSIBILITÉ MOBILE ────────
function improveMobileAccessibility(micBtn) {
  if (!micBtn) return;
  
  // Feedback tactile (si disponible)
  micBtn.addEventListener('click', () => {
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }
  });
  
  // Focus amélioré pour navigation clavier
  micBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      micBtn.click();
    }
  });
}
