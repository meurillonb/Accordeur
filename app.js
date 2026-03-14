/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune PWA — Application Orchestrator                   */
/* Dépend de : pitch-detection.js, platform-*.js               */
/* ═════════════════════════════════════════════════════════════ */

// ──────── CONFIG ────────
const DEBUG_MODE = window.location.search.includes('debug=true');

let audioCtx = null, analyser = null, source = null, stream = null;
let isListening = false, animFrameId = null;
let detectedNotes = [];

// ──────── DOM REFS ────────
let noteFrEl, noteUsEl, freqValEl, needleEl, statusDotEl, statusTextEl, centsEl, micBtn, micLabel, waveCanvas, waveCtx;
let chordDisplay = null;
let deferredPrompt = null;
let swRefresh = null;

function initDOM() {
  noteFrEl = document.getElementById('note-fr');
  noteUsEl = document.getElementById('note-us');
  freqValEl = document.getElementById('freq-val');
  needleEl = document.getElementById('needle');
  statusDotEl = document.getElementById('status-dot');
  statusTextEl = document.getElementById('status-text');
  centsEl = document.getElementById('cents-display');
  micBtn = document.getElementById('mic-btn');
  micLabel = document.getElementById('mic-label');
  waveCanvas = document.getElementById('waveform');
  waveCtx = waveCanvas.getContext('2d');

  // Créer élément d'affichage d'accord
  chordDisplay = createChordDisplay();
  
  // Amélioration accessibilité mobile
  improveMobileAccessibility(micBtn);
  
  // Configuration audio plateforme
  setupPlatformAudio();
  
  // Activer le mode debug si demandé
  if (DEBUG_MODE) {
    const debugPanel = document.getElementById('debug-panel');
    if (debugPanel) {
      debugPanel.classList.remove('hidden');
      console.log('Debug Mode Activated');
    }
  }
}


function createChordDisplay() {
  const div = document.createElement('div');
  div.id = 'chord-display';
  div.className = 'text-center text-sm text-accent-amber font-bold tracking-wide mt-2';
  div.style.textShadow = '0 0 10px rgba(245, 166, 35, 0.5)';
  document.querySelector('.main-display').appendChild(div);
  return div;
}

function buildStrings() {
  const stringsGrid = document.getElementById('strings-grid');
  GUITAR_STRINGS.forEach(s => {
    const div = document.createElement('div');
    div.className = 'string-btn string-status flex flex-col items-center justify-center cursor-pointer';
    div.setAttribute('data-string', s.string);
    div.setAttribute('data-note-us', s.us);
    div.setAttribute('data-freq', s.freq);
    div.innerHTML = `
      <div class="text-xs text-text-dim leading-tight">${s.string}</div>
      <div class="text-sm font-bold leading-tight">${s.us}</div>
      <div class="text-xs text-text-dim leading-tight">${s.fr}</div>
      <div class="freq-text opacity-70">${s.freq}Hz</div>
      <div class="s-status-icon text-accent-green opacity-0 transition-opacity duration-200">✓</div>
    `;
    stringsGrid.appendChild(div);
  });
}

function buildChromatic() {
  const chromGrid = document.getElementById('chromatic-grid');
  NOTE_NAMES_US.forEach((n, i) => {
    const div = document.createElement('div');
    div.className = 'chromatic-btn chroma-note flex flex-col items-center justify-center h-12 cursor-pointer';
    div.id = `chroma-${i}`;
    div.innerHTML = `
      <div class="text-sm font-mono">${n}</div>
      <div class="text-xs opacity-70">${NOTE_NAMES_FR[i]}</div>
    `;
    chromGrid.appendChild(div);
  });
}

// ──────── UI UPDATE ────────
function updateUI(note, isStabilized = true) {
  if (!note) {
    noteFrEl.textContent = '—'; noteUsEl.textContent = '—';
    noteFrEl.className = 'note-name idle'; noteUsEl.className = 'note-name idle';
    freqValEl.textContent = '— —';
    needleEl.style.left = '50%'; needleEl.style.background = 'var(--text-muted)'; needleEl.style.boxShadow = 'none';
    if (centsEl) centsEl.textContent = '';
    if (chordDisplay) chordDisplay.textContent = '';
    document.querySelectorAll('.chroma-note').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.string-status').forEach(el => {
      el.classList.remove('active', 'in-tune', 'sharp', 'flat');
      el.style.borderColor = '';
      el.style.opacity = '0.7';
    });
    return;
  }

  // Affichage toujours immédiat des informations de base
  noteFrEl.textContent = note.fr; noteUsEl.textContent = note.us;
  freqValEl.textContent = note.freq;

  // L'aiguille bouge toujours instantanément pour feedback visuel
  const pct = Math.max(2, Math.min(98, 50 + (note.cents / 100) * 50));
  needleEl.style.left = pct + '%';

  const abs = Math.abs(note.cents);
  let cls, color;

  // Indication visuelle selon précision
  if (abs <= 5) {
    cls = isStabilized ? 'active-in-tune' : 'detecting-in-tune'; 
    color = 'var(--accent-green)';
    if (centsEl) centsEl.textContent = '±' + abs + '¢';
  } else if (abs <= 20) {
    cls = isStabilized ? 'active-sharp' : 'detecting-sharp';
    color = 'var(--accent-amber)';
    if (centsEl) centsEl.textContent = (note.cents > 0 ? '+' : '') + note.cents + '¢';
  } else {
    cls = isStabilized ? 'active-flat' : 'detecting-flat';
    color = 'var(--accent-red)';
    if (centsEl) centsEl.textContent = (note.cents > 0 ? '+' : '') + note.cents + '¢';
  }

  // Aiguille colorée selon justesse
  needleEl.style.background = color; 
  needleEl.style.boxShadow = `0 0 10px ${color}, 0 0 4px ${color}`;
  
  // Notes affichées avec indication de stabilité
  noteFrEl.className = 'note-name ' + cls; 
  noteUsEl.className = 'note-name ' + cls;

  // Indication note chromatique active
  document.querySelectorAll('.chroma-note').forEach(el => el.classList.remove('active'));
  const ac = document.getElementById(`chroma-${note.noteIdx}`);
  if (ac) ac.classList.add('active');

  // Statut des cordes : toujours feedback immédiat + validation pour stabilisée
  updateStringStatusImmediate(note, abs);
  
  if (isStabilized) {
    updateStringStatus(note, abs);
    
    // Ajoute la note à l'historique pour accords
    detectedNotes.push(note);
    if (detectedNotes.length > 10) detectedNotes.shift();
  }
}

// Met à jour le statut pour les notes stabilisées
function updateStabilizedStatus(stableNote) {
  const abs = Math.abs(stableNote.cents);
  
  // Statut textuel basé sur stabilisation
  if (abs <= 5) {
    statusTextEl.textContent = 'En Accord ✓'; 
    statusDotEl.className = 'status-dot in-tune';
  } else if (abs <= 20) {
    statusTextEl.textContent = stableNote.cents > 0 ? '♯ Trop haut' : '♭ Trop bas';
    statusDotEl.className = 'status-dot listening';
  } else {
    statusTextEl.textContent = stableNote.cents > 0 ? '♯ Dièse' : '♭ Bémol';
    statusDotEl.className = 'status-dot listening';
  }
  
  // Détection d'accord basée sur notes stables
  const chord = detectChord(detectedNotes);
  if (chord && detectedNotes.length >= 3) {
    if (chordDisplay) {
      if (chordDisplay) { chordDisplay.textContent = `🎸 Accord: ${chord.name}`; chordDisplay.style.color = 'var(--accent-green)'; }
    }
  } else if (detectedNotes.length >= 3) {
    if (chordDisplay) {
      if (chordDisplay) { chordDisplay.textContent = '🔍 Accord non reconnu'; chordDisplay.style.color = 'var(--text-muted)'; }
    }
  }
}

function updateStringStatus(note, abs) {
  document.querySelectorAll('.string-status').forEach(stringEl => {
    stringEl.classList.remove('active', 'in-tune', 'sharp', 'flat');
    const stringNote = stringEl.getAttribute('data-note-us');
    const stringFreq = parseFloat(stringEl.getAttribute('data-freq'));
    const detectedFreq = parseFloat(note.freq);
    
    // Différenciation par fréquence plutôt que par note seule (évite confusion E grave/aigu)
    const freqDiff = Math.abs(detectedFreq - stringFreq);
    const isMatchingString = (
      note.us === stringNote && 
      freqDiff < 50 // Tolérance élargie à 50Hz
    );
    
    if (isMatchingString) {
      stringEl.classList.add('active');
      
      // Seuils plus permissifs pour validation visuelle
      if (abs <= 10) { // Plus permissif : 10 cents au lieu de 5
        stringEl.classList.add('in-tune');
      } else if (abs <= 25) { // Plus permissif : 25 cents au lieu de 20
        stringEl.classList.add(note.cents > 0 ? 'sharp' : 'flat');
      } else {
        stringEl.classList.add('flat'); // Très désaccordé
      }
    }
  });
}

// Version pour affichage immédiat (moins restrictive)
function updateStringStatusImmediate(note, abs) {
  if (!note) return;
  
  document.querySelectorAll('.string-status').forEach(stringEl => {
    const stringNote = stringEl.getAttribute('data-note-us');
    const stringFreq = parseFloat(stringEl.getAttribute('data-freq'));
    const detectedFreq = parseFloat(note.freq);
    
    const freqDiff = Math.abs(detectedFreq - stringFreq);
    const isCloseMatch = (
      note.us === stringNote && 
      freqDiff < 60 // Encore plus permissif pour feedback immédiat
    );
    
    if (isCloseMatch) {
      // Feedback visuel léger pour indication immédiate
      stringEl.style.borderColor = abs <= 15 ? 'var(--accent-green)' : 'var(--accent-amber)';
      stringEl.style.opacity = '1';
    } else {
      // Reset style si pas correspondant
      stringEl.style.borderColor = '';
      stringEl.style.opacity = '0.7';
    }
  });
}

// ──────── CANVAS ────────
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = waveCanvas.parentElement.getBoundingClientRect();
  waveCanvas.width = rect.width * dpr;
  waveCanvas.height = rect.height * dpr;
  waveCanvas.style.width = rect.width + 'px';
  waveCanvas.style.height = rect.height + 'px';
  waveCtx.scale(dpr, dpr);
  return { w: rect.width, h: rect.height };
}

function drawIdle() {
  const { w, h } = resizeCanvas();
  waveCtx.fillStyle = '#14141f'; waveCtx.fillRect(0, 0, w, h);
  waveCtx.strokeStyle = 'rgba(255,255,255,0.08)'; waveCtx.lineWidth = 1;
  waveCtx.beginPath(); waveCtx.moveTo(0, h / 2); waveCtx.lineTo(w, h / 2); waveCtx.stroke();
}

function drawWaveform(data) {
  const dpr = window.devicePixelRatio || 1;
  const rect = waveCanvas.parentElement.getBoundingClientRect();
  const W = rect.width, H = rect.height;
  if (waveCanvas.width !== W * dpr) resizeCanvas();
  waveCtx.fillStyle = '#14141f'; waveCtx.fillRect(0, 0, W, H);
  waveCtx.lineWidth = 1.5; waveCtx.strokeStyle = 'rgba(245,166,35,0.7)';
  waveCtx.beginPath();
  const sl = W / data.length;
  let x = 0;
  for (let i = 0; i < data.length; i++) {
    const y = (data[i] / 128.0) * H / 2;
    i === 0 ? waveCtx.moveTo(x, y) : waveCtx.lineTo(x, y);
    x += sl;
  }
  waveCtx.lineTo(W, H / 2); waveCtx.stroke();
}

// ──────── AUDIO LOOP ────────
function processAudio() {
  if (!analyser) return;
  const buf = new Float32Array(analyser.fftSize);
  const timeBuf = new Uint8Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(buf);
  analyser.getByteTimeDomainData(timeBuf);
  drawWaveform(timeBuf);

  // Utilise Essentia pour la détection si disponible, sinon fallback
  let rawFreq = -1;
  if (essentia) {
    try {
      rawFreq = detectPitchEssentia(buf);
    } catch (e) {
      console.warn('Essentia error, using fallback');
      rawFreq = autoCorrelate(buf, audioCtx.sampleRate);
    }
  } else {
    rawFreq = autoCorrelate(buf, audioCtx.sampleRate);
  }

  if (rawFreq > 40 && rawFreq < 2000) {
    // Affichage immédiat pour feedback visuel (aiguille + osimero)
    const immediateNote = freqToNote(rawFreq);
    updateUI(immediateNote, false); // false = affichage non-stabilisé
    
    // Stabilisation en parallèle pour assistance accord
    const stabilizedFreq = stabilizeFrequency(rawFreq);
    if (stabilizedFreq) {
      const stableNote = freqToNote(stabilizedFreq);
      // Met à jour uniquement le statut et l'assistance (pas l'aiguille)
      updateStabilizedStatus(stableNote);
    }
    
    // Mode debug
    if (DEBUG_MODE) {
      console.log(`🎵 Raw frequency: ${rawFreq.toFixed(2)} Hz`);
      if (stabilizedFreq) {
        console.log(`🔗 Stabilized frequency: ${stabilizedFreq.toFixed(2)} Hz`);
        console.log(`📊 Stability: ${stabilityCounter}/${STABILITY_THRESHOLD}`);
      }
      console.log(`🎼 Note: ${immediateNote.us}/${immediateNote.fr}, Cents: ${immediateNote.cents > 0 ? '+' : ''}${immediateNote.cents}`);
      
      let rms = 0;
      for (let i = 0; i < buf.length; i++) {
        rms += buf[i] * buf[i];
      }
      rms = Math.sqrt(rms / buf.length);
      
      // Affichage debug
      const debugFreq = document.getElementById('debug-freq');
      const debugMethod = document.getElementById('debug-method');
      const debugRms = document.getElementById('debug-rms');
      const debugBuffer = document.getElementById('debug-buffer');
      
      if (debugFreq) debugFreq.textContent = `${rawFreq.toFixed(2)} Hz${stabilizedFreq ? ` (stable: ${stabilizedFreq.toFixed(2)})` : ''}`;
      if (debugMethod) debugMethod.textContent = essentia ? 'Essentia.js' : 'AutoCorrelation';
      if (debugRms) debugRms.textContent = rms.toFixed(4);
      if (debugBuffer) debugBuffer.textContent = `${buf.length} samples`;
    }
  } else {
    // Reset affichage
    updateUI(null, false);
    statusTextEl.textContent = 'En écoute...';
    statusDotEl.className = 'status-dot listening';
    if (chordDisplay) chordDisplay.textContent = '';
  }
  animFrameId = requestAnimationFrame(processAudio);
}

// ──────── MICROPHONE CONTROL ────────
async function startListening() {
  try {
    // Initialise Essentia
    await initEssentia();

    console.log('[Audio] Platform:', PLATFORM_NAME);

    // Contraintes audio adaptées à la plateforme
    const audioConstraints = getPlatformAudioConstraints();

    // 1. D'abord demander le micro (déclenche la permission iOS)
    console.log('[Audio] Requesting microphone...');
    stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    console.log('[Audio] Microphone granted, tracks:', stream.getAudioTracks().length);

    // 2. Ensuite créer l'AudioContext (après le geste utilisateur)
    if (!audioCtx || audioCtx.state === 'closed') {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    // 3. Resume si suspendu (obligatoire iOS)
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }
    console.log('[Audio] AudioContext state:', audioCtx.state, '| sampleRate:', audioCtx.sampleRate);
    
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 4096; // Augmenté pour meilleure résolution fréquentielle (~10.8Hz à 44.1kHz)
    analyser.smoothingTimeConstant = 0.3; // Réduit pour réponse plus rapide
    
    source = audioCtx.createMediaStreamSource(stream);
    
    // Filtre passe-haut plus permissif pour guitare
    const hpFilter = audioCtx.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 30; // 30Hz - preserve Mi grave (82.41Hz) avec marge
    hpFilter.Q.value = 0.7;
    
    // Compressor optimisé pour instruments acoustiques
    const compressor = audioCtx.createDynamicsCompressor();
    compressor.threshold.value = -35; // Seuil plus haut pour préserver la dynamique
    compressor.knee.value = 15; // Transition plus douce
    compressor.ratio.value = 6; // Compression plus modérée
    compressor.attack.value = 0.01; // Attack plus rapide pour guitar picking
    compressor.release.value = 0.1; // Release adapté aux notes de guitare
    
    // Filtre passe-bas pour supprimer les bruits HF
    const lpFilter = audioCtx.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 1500; // Limite pour harmoniques guitare
    lpFilter.Q.value = 0.5;
    
    // Chaîne: source -> HPF -> compressor -> LPF -> analyser
    source.connect(hpFilter);
    hpFilter.connect(compressor);
    compressor.connect(lpFilter);
    lpFilter.connect(analyser);
    isListening = true;
    micBtn.classList.add('active');
    
    // Change l'icône pour version active (SVG rouge)
    const micIcon = micBtn.querySelector('.mic-icon');
    if (micIcon) {
      micIcon.innerHTML = `
        <circle cx="12" cy="12" r="3" fill="currentColor"></circle>
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" fill="currentColor"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      `;
      micIcon.style.color = '#ef4444'; // Rouge quand actif
    }
    
    micLabel.textContent = 'Actif';
    statusDotEl.className = 'status-dot listening';
    statusTextEl.textContent = 'En écoute...';
    detectedNotes = [];
    if (chordDisplay) chordDisplay.textContent = '';
    processAudio();
  } catch (e) { 
    console.error('Microphone error:', e);
    
    // Nettoyage en cas d'erreur
    if (audioCtx && audioCtx.state !== 'closed') {
      try { audioCtx.close(); } catch(err) {}
    }
    audioCtx = null;
    if (stream) stream.getTracks().forEach(t => t.stop());
    stream = null;
    
    alert(getPlatformMicErrorAlert(e));
    
    // Reset états
    isListening = false;
    micBtn.classList.remove('active');
    
    // Restaure icône microphone (orange)
    const micIcon = micBtn.querySelector('.mic-icon');
    if (micIcon) {
      micIcon.innerHTML = `
        <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
        <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
        <line x1="12" y1="19" x2="12" y2="23"></line>
        <line x1="8" y1="23" x2="16" y2="23"></line>
      `;
      micIcon.style.color = '#f5a623';
    }
    
    micLabel.textContent = 'Erreur';
  }
}

function stopListening() {
  isListening = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (source) { try { source.disconnect(); } catch(e) {} }
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx && audioCtx.state !== 'closed') { 
    try { audioCtx.close(); } catch(e) {} 
  }
  audioCtx = null;
  analyser = null;
  source = null;
  stream = null;
  detectedNotes = [];
  
  // Reset du système de stabilisation
  resetStabilization();
  
  micBtn.classList.remove('active');
  
  // Restaure l'icône microphone inactive (orange)
  const micIcon = micBtn.querySelector('.mic-icon');
  if (micIcon) {
    micIcon.innerHTML = `
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
      <line x1="12" y1="19" x2="12" y2="23"></line>
      <line x1="8" y1="23" x2="16" y2="23"></line>
    `;
    micIcon.style.color = '#f5a623';
  }
  
  micLabel.textContent = 'Écouter';
  statusDotEl.className = 'status-dot off';
  statusTextEl.textContent = 'Inactif';
  updateUI(null);
  setTimeout(drawIdle, 50);
}

// ──────── PWA MANAGEMENT ────────
async function initPWA() {
  // Détecter la plateforme et navigateur
  const ua = navigator.userAgent;
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua) && !IS_IOS;
  
  const isChrome = /Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edge|OPR|Firefox/.test(ua);
  
  const supportsBeforeInstallPrompt = 'onbeforeinstallprompt' in window;
  
  console.log(`[PWA] Platform: ${PLATFORM_NAME}`);
  console.log(`[PWA] Browser: ${isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'unknown'}`);
  console.log(`[PWA] beforeinstallprompt support: ${supportsBeforeInstallPrompt}`);

  // Handle install prompt (Windows, Android, Linux - Chrome/Edge based browsers)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    showInstallPrompt();
  });
  
  // Afficher les guides spécifiques par plateforme
  const installGuide = getPlatformInstallGuide();
  if (installGuide && !supportsBeforeInstallPrompt) {
    showAppleInstallGuide(installGuide.platform, installGuide.html);
  } else if (!supportsBeforeInstallPrompt && !isChrome && !isEdge && !isFirefox) {
    // Autres navigateurs sans support
    console.warn('[PWA] Installation not supported in this browser');
  }

  // Handle app installed
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App was installed');
    deferredPrompt = null;
    showNotification('App installée !', 'GuitarTune est maintenant sur votre écran d\'accueil');
  });

  // Handle display mode change
  window.addEventListener('displaychange', (e) => {
    console.log('[PWA] Display mode:', navigator.standalone);
  });

  // Register service worker
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('sw.js', { scope: './' });
      console.log('[SW] Registration successful:', registration);

      // Check for updates every 30 seconds (more responsive)
      setInterval(() => {
        console.log('[SW] Checking for updates...');
        registration.update();
      }, 30000); // Check every 30 seconds instead of 60

      // Also check on visibility change (when user returns to app)
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          console.log('[SW] Page visible again, checking for updates');
          registration.update();
        }
      });

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[SW] Update found, new worker installing');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New SW ready
            console.log('[SW] New SW ready, showing update notification');
            showUpdateNotification(registration);
          }
        });
      });
    } catch (error) {
      console.warn('[SW] Registration failed:', error);
    }
  }

  // Handle online/offline
  window.addEventListener('online', () => {
    updateOnlineStatus(true);
    console.log('[PWA] Online');
  });

  window.addEventListener('offline', () => {
    updateOnlineStatus(false);
    console.log('[PWA] Offline');
  });

  // Initial status
  updateOnlineStatus(navigator.onLine);
}

function updateOnlineStatus(isOnline) {
  const indicator = document.getElementById('online-indicator');
  const footerText = document.getElementById('footer-text');
  
  if (isOnline) {
    indicator?.classList.remove('offline');
    if (footerText) footerText.textContent = '🟢 En ligne · GuitarTune PWA';
  } else {
    indicator?.classList.add('offline');
    if (footerText) footerText.textContent = '⚫ Hors ligne · GuitarTune PWA';
  }
}

function showInstallPrompt() {
  const installDiv = document.createElement('div');
  installDiv.id = 'install-prompt';
  installDiv.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 12px;
    right: 12px;
    background: linear-gradient(135deg, #f5a623, #ff8c00);
    border-radius: 12px;
    padding: 16px;
    z-index: 999;
    box-shadow: 0 8px 32px rgba(245, 166, 35, 0.4);
    animation: slideUp 0.3s ease;
    font-size: 14px;
    color: #000;
  `;

  installDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 12px;">📱 Installer GuitarTune ?</div>
    <div style="font-size: 12px; margin-bottom: 12px; opacity: 0.9;">Accédez rapidement depuis votre écran d'accueil</div>
    <div style="display: flex; gap: 8px;">
      <button id="install-yes" style="
        flex: 1;
        padding: 10px 16px;
        border: none;
        background: #000;
        color: #f5a623;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
      ">Installer</button>
      <button id="install-no" style="
        flex: 1;
        padding: 10px 16px;
        border: 1px solid rgba(0,0,0,0.3);
        background: rgba(0,0,0,0.1);
        color: #000;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
      ">Plus tard</button>
    </div>
  `;

  document.body.appendChild(installDiv);

  document.getElementById('install-yes').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`[PWA] User response: ${outcome}`);
      deferredPrompt = null;
      installDiv.remove();
    }
  });

  document.getElementById('install-no').addEventListener('click', () => {
    installDiv.remove();
  });
}

function showAppleInstallGuide(platform, instructionsHtml) {
  const guideDiv = document.createElement('div');
  guideDiv.id = 'apple-install-guide';
  guideDiv.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 12px;
    right: 12px;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    border-radius: 12px;
    padding: 16px;
    z-index: 999;
    box-shadow: 0 8px 32px rgba(34, 197, 94, 0.4);
    animation: slideUp 0.3s ease;
    font-size: 14px;
    color: #fff;
  `;

  guideDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 12px;">Installer sur ${platform}</div>
    <div style="font-size: 12px; margin-bottom: 12px; opacity: 0.95;">
      ${instructionsHtml}
    </div>
    <button id="apple-close" style="
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 12px;
    ">Compris</button>
  `;

  document.body.appendChild(guideDiv);

  document.getElementById('apple-close').addEventListener('click', () => {
    guideDiv.remove();
  });
  
  // Auto-fermer après 8 secondes
  setTimeout(() => {
    if (guideDiv.parentElement) guideDiv.remove();
  }, 8000);
}

function showMicrophoneError(error) {
  const { message: errorMessage, solution } = getPlatformMicError(error);

  const errorDiv = document.createElement('div');
  errorDiv.style.cssText = `
    position: fixed;
    bottom: 24px;
    left: 12px;
    right: 12px;
    background: linear-gradient(135deg, #ef4444, #dc2626);
    border-radius: 12px;
    padding: 16px;
    z-index: 999;
    box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);
    animation: slideUp 0.3s ease;
    font-size: 14px;
    color: #fff;
  `;

  errorDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px;">⚠️ ${errorMessage}</div>
    <div style="font-size: 12px; margin-bottom: 12px; opacity: 0.95;">${solution}</div>
    <button style="
      width: 100%;
      padding: 10px 16px;
      border: none;
      background: rgba(255,255,255,0.2);
      color: #fff;
      border-radius: 6px;
      font-weight: 600;
      cursor: pointer;
      font-size: 12px;
    ">Fermer</button>
  `;

  document.body.appendChild(errorDiv);
  
  errorDiv.querySelector('button').addEventListener('click', () => {
    errorDiv.remove();
  });
  
  // Auto-fermer après 6 secondes
  setTimeout(() => {
    if (errorDiv.parentElement) errorDiv.remove();
  }, 6000);
}

function showUpdateNotification(registration) {
  const updateDiv = document.createElement('div');
  updateDiv.id = 'update-prompt';
  updateDiv.style.cssText = `
    position: fixed;
    top: env(safe-area-inset-top, 0);
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #22c55e, #16a34a);
    padding: 16px;
    z-index: 999;
    font-size: 14px;
    color: #fff;
    text-align: center;
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.4);
    animation: slideDown 0.3s ease;
  `;

  updateDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 8px;">✨ Nouvelle version disponible</div>
    <div style="font-size: 12px; margin-bottom: 12px; opacity: 0.9;">
      GuitarTune a été mise à jour
    </div>
    <div style="display: flex; gap: 8px;">
      <button id="update-btn" style="
        flex: 1;
        padding: 10px 16px;
        border: none;
        background: #fff;
        color: #22c55e;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
      ">Mettre à jour</button>
      <button id="update-later" style="
        flex: 1;
        padding: 10px 16px;
        border: 1px solid rgba(255,255,255,0.3);
        background: rgba(255,255,255,0.1);
        color: #fff;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 12px;
      ">Plus tard</button>
    </div>
  `;

  document.body.appendChild(updateDiv);

  document.getElementById('update-btn').addEventListener('click', () => {
    console.log('[SW] User accepted update');
    // Tell the service worker to update
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    swRefresh = registration.installing;
    swRefresh.addEventListener('statechange', () => {
      if (swRefresh.state === 'activated') {
        console.log('[SW] New SW activated, reloading page');
        window.location.reload();
      }
    });
  });

  document.getElementById('update-later').addEventListener('click', () => {
    console.log('[SW] User dismissed update notification');
    updateDiv.remove();
    // Ask again in 5 minutes
    setTimeout(() => {
      if (updateDiv.parentElement) {
        showUpdateNotification(registration);
      }
    }, 300000); // 5 minutes
  });

  // Auto-ask again in 10 minutes if user doesn't interact
  const timeoutId = setTimeout(() => {
    if (updateDiv.parentElement) {
      updateDiv.remove();
      showUpdateNotification(registration);
    }
  }, 600000); // 10 minutes

  // Clear timeout if user interacts
  updateDiv.addEventListener('click', () => clearTimeout(timeoutId));
}

function showNotification(title, message) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body: message,
      icon: 'logo.svg'
    });
  }
}

// ──────── INITIALIZATION ────────
window.addEventListener('load', () => {
  initDOM();
  buildStrings();
  buildChromatic();
  drawIdle();
  initEssentia().then(() => {
    console.log('Essentia.js ready');
  }).catch(e => {
    console.log('Essentia.js fallback mode:', e.message);
  });

  // ──────── PWA INSTALLATION ────────
  initPWA();

  // Attach microphone button listener
  micBtn.addEventListener('click', async (e) => { 
    e.preventDefault();
    e.stopPropagation();
    if (isListening) {
      stopListening();
    } else {
      try {
        await startListening();
      } catch (err) {
        console.error('Error starting listening:', err);
        showMicrophoneError(err);
      }
    }
  });
});

window.addEventListener('resize', () => { if (!isListening) drawIdle(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.ready.then(() => {
  // Request notification permission
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
});
