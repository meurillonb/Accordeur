/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune PWA - Application Launcher */
/* ═════════════════════════════════════════════════════════════ */

// ──────── CONFIG ────────
const NOTE_NAMES_US = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

// Mode debug pour tester la détection
const DEBUG_MODE = window.location.search.includes('debug=true');

const GUITAR_STRINGS = [
  { string: 1, us: 'E', fr: 'Mi', freq: 82.41 },
  { string: 2, us: 'A', fr: 'La', freq: 110.00 },
  { string: 3, us: 'D', fr: 'Ré', freq: 146.83 },
  { string: 4, us: 'G', fr: 'Sol', freq: 196.00 },
  { string: 5, us: 'B', fr: 'Si', freq: 246.94 },
  { string: 6, us: 'e', fr: 'Mi', freq: 329.63 },
];

// Accords standards (triplets de fréquences: corde6, corde5, corde4)
const COMMON_CHORDS = [
  { name: 'Em', notes: ['E2', 'A2', 'D3'], tolerance: 8 },
  { name: 'Am', notes: ['E2', 'A2', 'C3'], tolerance: 8 },
  { name: 'G', notes: ['E2', 'B2', 'G3'], tolerance: 8 },
  { name: 'D', notes: ['D2', 'A2', 'D3'], tolerance: 8 },
  { name: 'A', notes: ['E2', 'A2', 'E3'], tolerance: 8 },
  { name: 'E', notes: ['E2', 'B2', 'E3'], tolerance: 8 },
  { name: 'C', notes: ['E2', 'G2', 'C3'], tolerance: 8 },
];

let audioCtx = null, analyser = null, source = null, stream = null;
let isListening = false, animFrameId = null;
let essentia = null;
let detectedNotes = []; // Historique des dernières notes détectées

// Système de stabilisation pour guitares réelles
let frequencyHistory = []; // Historique des fréquences détectées
let stableFrequency = null; // Fréquence stable actuelle
let stabilityCounter = 0; // Compteur de stabilité
const STABILITY_THRESHOLD = 5; // Nombre de détections cohérentes requises
const FREQUENCY_TOLERANCE = 8; // Tolérance en Hz pour considérer 2 fréquences comme identiques

// ──────── ESSENTIA.JS INIT ────────
async function initEssentia() {
  try {
    essentia = new Essentia(EssentiaWASM);
    console.log('Essentia.js initialized');
  } catch (e) {
    console.warn('Essentia.js not available, using fallback:', e.message);
  }
}

// ──────── PITCH DETECTION ────────

// Stabilise les détections de fréquence pour guitares réelles
function stabilizeFrequency(newFreq) {
  if (newFreq < 60 || newFreq > 500) return null; // Zone guitare uniquement
  
  // Ajoute à l'historique
  frequencyHistory.push(newFreq);
  if (frequencyHistory.length > 10) frequencyHistory.shift();
  
  // Vérifie la cohérence avec la fréquence stable actuelle
  if (stableFrequency !== null) {
    const diff = Math.abs(newFreq - stableFrequency);
    
    if (diff <= FREQUENCY_TOLERANCE) {
      // Fréquence cohérente, augmente la stabilité
      stabilityCounter++;
      stableFrequency = (stableFrequency * 0.8) + (newFreq * 0.2); // Lissage
      return stableFrequency;
    } else {
      // Fréquence différente, reset
      stabilityCounter = 0;
      stableFrequency = null;
    }
  }
  
  // Pas de fréquence stable, recherche de consensus dans l'historique
  if (frequencyHistory.length >= STABILITY_THRESHOLD) {
    const recent = frequencyHistory.slice(-STABILITY_THRESHOLD);
    let consensusFreq = null, maxCount = 0;
    
    for (let i = 0; i < recent.length; i++) {
      let count = 0;
      const baseFreq = recent[i];
      
      for (let j = 0; j < recent.length; j++) {
        if (Math.abs(recent[j] - baseFreq) <= FREQUENCY_TOLERANCE) {
          count++;
        }
      }
      
      if (count > maxCount) {
        maxCount = count;
        consensusFreq = baseFreq;
      }
    }
    
    // Si consensus trouvé (3+ détections cohérentes), devient stable
    if (maxCount >= 3) {
      stableFrequency = consensusFreq;
      stabilityCounter = maxCount;
      return stableFrequency;
    }
  }
  
  return null; // Pas encore stable
}

function freqToNote(freq) {
  if (!freq || freq < 20) return null;
  const noteNum = 12 * (Math.log2(freq / 440)) + 69;
  const noteInt = Math.round(noteNum);
  const cents = Math.round((noteNum - noteInt) * 100);
  const noteIdx = ((noteInt % 12) + 12) % 12;
  return { noteIdx, cents, us: NOTE_NAMES_US[noteIdx], fr: NOTE_NAMES_FR[noteIdx], freq: freq.toFixed(1) };
}

// Essentia pitch detection optimisé pour guitares acoustiques 
function detectPitchEssentia(audioBuffer) {
  if (!essentia || !audioBuffer) return -1;
  try {
    // Pré-emphasis pour renforcer les hautes fréquences
    const preEmphasized = new Float32Array(audioBuffer.length);
    for (let i = 1; i < audioBuffer.length; i++) {
      preEmphasized[i] = audioBuffer[i] - 0.97 * audioBuffer[i - 1];
    }
    
    // Applique une fenêtre de Hann
    const windowed = essentia.arrayToVector(preEmphasized);
    const windowed_hann = essentia.Windowing(windowed, 'hann');
    
    // Calcul du spectre avec zero-padding pour meilleure résolution
    const spectrum = essentia.Spectrum(windowed_hann);
    
    // Détection robuste avec plusieurs méthodes
    try {
      // Méthode 1: Spectral Peaks avec filtrage harmonique
      const { peaks_frequencies, peaks_magnitudes } = essentia.SpectralPeaks(
        spectrum, 
        20, // Plus de pics pour analyse harmonique
        40, // Seuil minimum plus bas 
        10000, // Fréquence max pour guitare
        0.5  // Tolédance harmonique
      );
      
      // Trouve la fréquence fondamentale parmi les pics
      if (peaks_frequencies.length > 0) {
        // Cherche le pic dominant dans la plage guitare (60-500Hz)
        let bestFreq = -1, bestMag = 0;
        
        for (let i = 0; i < peaks_frequencies.length; i++) {
          const freq = peaks_frequencies[i];
          const mag = peaks_magnitudes[i];
          
          // Zone principale des cordes de guitare 
          if (freq >= 60 && freq <= 500 && mag > bestMag && mag > 0.003) {
            bestFreq = freq;
            bestMag = mag;
          }
        }
        
        if (bestFreq > 0) return bestFreq;
        
        // Si pas trouvé, prend le premier pic significatif
        if (peaks_magnitudes[0] > 0.002) {
          return peaks_frequencies[0];
        }
      }
      
    } catch (peaksError) {
      console.warn('SpectralPeaks error:', peaksError);
    }
    
    // Méthode 2: YinFFT comme fallback
    try {
      const yinFreq = essentia.PitchYinFFT(windowed_hann);
      if (yinFreq > 60 && yinFreq < 500) {
        return yinFreq;
      }
    } catch (yinError) {
      console.warn('YinFFT error:', yinError);
    }
    
  } catch (e) {
    console.warn('Essentia detection error:', e);
  }
  return -1;
}

// Fallback: autocorrélation améliorée pour guitares acoustiques
function autoCorrelate(buf, sr) {
  const SIZE = buf.length, MAX = Math.floor(SIZE / 2);
  
  // Détection de niveau audio plus sensible
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.003) return -1; // Seuil plus bas pour guitares acoustiques

  // Pré-emphasis pour améliorer détection fondamentale
  const emphasized = new Float32Array(SIZE);
  for (let i = 1; i < SIZE; i++) {
    emphasized[i] = buf[i] - 0.95 * buf[i - 1];
  }

  // Recherche optimisée pour guitares (60Hz-500Hz principalement)  
  const minPeriod = Math.floor(sr / 500); // 500Hz max
  const maxPeriod = Math.floor(sr / 60);  // 60Hz min
  const searchStart = Math.max(minPeriod, 8);
  const searchEnd = Math.min(maxPeriod, MAX);
  
  let best = -1, bestC = 0;
  let foundCandidate = false;
  
  // Autocorrélation avec seuil plus permissif
  for (let o = searchStart; o < searchEnd; o++) {
    let correlation = 0, normA = 0, normB = 0;
    
    for (let i = 0; i < MAX; i++) {
      const a = emphasized[i];
      const b = emphasized[i + o];
      correlation += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    // Coefficient de corrélation normalisé
    const normalizedCorr = normA * normB > 0 ? correlation / Math.sqrt(normA * normB) : 0;
    
    // Seuil plus permissif pour guitares (0.6 au lieu de 0.9)
    if (normalizedCorr > 0.6 && normalizedCorr > bestC) {
      bestC = normalizedCorr;
      best = o;
      foundCandidate = true;
    }
  }
  
  // Affinage par interpolation parabolique si confident
  if (foundCandidate && bestC > 0.7 && best > searchStart && best < searchEnd - 1) {
    const y1 = bestC;
    let y0 = 0, y2 = 0;
    
    // Recalcule la corrélation pour les points adjacents
    for (let i = 0; i < MAX; i++) {
      const a = emphasized[i];
      y0 += a * emphasized[i + best - 1];
      y2 += a * emphasized[i + best + 1];
    }
    
    const denom = 2 * (2 * y1 - y0 - y2);
    if (Math.abs(denom) > 0.0001) {
      const offset = (y2 - y0) / denom;
      best += offset;
    }
  }
  
  return foundCandidate ? sr / best : -1;
}

// ──────── CHORD DETECTION ────────
function detectChord(notes) {
  if (!notes || notes.length < 3) return null;
  
  // Extrait les fréquences des 3 cordes principales
  const freqs = notes.slice(0, 3).map(n => n ? parseFloat(n.freq) : null).filter(f => f);
  if (freqs.length < 3) return null;

  let bestChord = null, bestMatch = 0;

  COMMON_CHORDS.forEach(chord => {
    let match = 0;
    chord.notes.forEach((noteStr, i) => {
      const expectedNote = freqToNote(getNoteFrequency(noteStr));
      if (expectedNote && freqs[i]) {
        const detectedNote = freqToNote(freqs[i]);
        const diff = Math.abs(detectedNote.cents);
        if (diff < chord.tolerance * 2) {
          match += (100 - diff) / 100;
        }
      }
    });

    if (match > bestMatch) {
      bestMatch = match;
      bestChord = chord;
    }
  });

  return bestMatch > 1.5 ? bestChord : null;
}

// Obtient la fréquence d'une note (ex: 'E2' -> 82.41 Hz)
function getNoteFrequency(noteStr) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = noteStr.slice(0, -1);
  const octave = parseInt(noteStr.slice(-1));
  const semitones = (notes.indexOf(note) || 0) - 9; // A0 = 27.5 Hz
  return 27.5 * Math.pow(2, octave + (semitones / 12));
}

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
  
  // Activer le mode debug si demandé
  if (DEBUG_MODE) {
    document.getElementById('debug-panel').classList.remove('hidden');
    console.log('🔧 Debug Mode Activated');
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
    div.className = 'string-btn string-status flex flex-col items-center justify-center h-16 cursor-pointer';
    div.setAttribute('data-string', s.string);
    div.setAttribute('data-note-us', s.us);
    div.setAttribute('data-freq', s.freq);
    div.innerHTML = `
      <div class="text-xs text-text-dim">${s.string}</div>
      <div class="text-sm font-bold">${s.us}</div>
      <div class="text-xs text-text-dim">${s.fr}</div>
      <div class="text-xs opacity-70">${s.freq}Hz</div>
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
function updateUI(note) {
  if (!note) {
    noteFrEl.textContent = '—'; noteUsEl.textContent = '—';
    noteFrEl.className = 'note-name idle'; noteUsEl.className = 'note-name idle';
    freqValEl.textContent = '— —';
    needleEl.style.left = '50%'; needleEl.style.background = 'var(--text-muted)'; needleEl.style.boxShadow = 'none';
    centsEl.textContent = '';
    chordDisplay.textContent = '';
    document.querySelectorAll('.chroma-note').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.string-status').forEach(el => el.classList.remove('active', 'in-tune', 'sharp', 'flat'));
    return;
  }

  // Ajoute la note à l'historique
  detectedNotes.push(note);
  if (detectedNotes.length > 10) detectedNotes.shift();

  noteFrEl.textContent = note.fr; noteUsEl.textContent = note.us;
  freqValEl.textContent = note.freq;

  const pct = Math.max(2, Math.min(98, 50 + (note.cents / 100) * 50));
  needleEl.style.left = pct + '%';

  const abs = Math.abs(note.cents);
  let cls, color;

  if (abs <= 5) {
    cls = 'active-in-tune'; color = 'var(--green)';
    statusTextEl.textContent = 'En Accord ✓'; statusDotEl.className = 'status-dot in-tune';
    centsEl.textContent = '±' + abs + '¢';
  } else if (abs <= 20) {
    cls = 'active-sharp'; color = 'var(--amber)';
    statusTextEl.textContent = note.cents > 0 ? '♯ Trop haut' : '♭ Trop bas';
    statusDotEl.className = 'status-dot listening';
    centsEl.textContent = (note.cents > 0 ? '+' : '') + note.cents + '¢';
  } else {
    cls = 'active-flat'; color = 'var(--red)';
    statusTextEl.textContent = note.cents > 0 ? '♯ Dièse' : '♭ Bémol';
    statusDotEl.className = 'status-dot listening';
    centsEl.textContent = (note.cents > 0 ? '+' : '') + note.cents + '¢';
  }

  noteFrEl.className = 'note-name ' + cls; noteUsEl.className = 'note-name ' + cls;
  needleEl.style.background = color; needleEl.style.boxShadow = `0 0 8px ${color}`;

  document.querySelectorAll('.chroma-note').forEach(el => el.classList.remove('active'));
  const ac = document.getElementById(`chroma-${note.noteIdx}`);
  if (ac) ac.classList.add('active');

  // Mettre à jour le statut des cordes
  document.querySelectorAll('.string-status').forEach(stringEl => {
    stringEl.classList.remove('active', 'in-tune', 'sharp', 'flat');
    const stringNote = stringEl.getAttribute('data-note-us');
    const stringFreq = parseFloat(stringEl.getAttribute('data-freq'));
    
    // Vérifie si la note détectée correspond à cette corde (même note, fréquence proche)
    if (note.us === stringNote && Math.abs(parseFloat(note.freq) - stringFreq) < 30) {
      stringEl.classList.add('active');
      if (abs <= 5) {
        stringEl.classList.add('in-tune');
      } else if (abs <= 20) {
        stringEl.classList.add('sharp');
      } else {
        stringEl.classList.add('flat');
      }
    }
  });

  // Détection d'accord
  const chord = detectChord(detectedNotes);
  if (chord && detectedNotes.length >= 3) {
    chordDisplay.textContent = `🎸 Accord: ${chord.name}`;
    chordDisplay.style.color = 'var(--green)';
  } else if (detectedNotes.length >= 3) {
    chordDisplay.textContent = '🔍 Accord non reconnu';
    chordDisplay.style.color = 'var(--text-muted)';
  }
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

  // Stabilise la fréquence pour guitares réelles
  const stabilizedFreq = stabilizeFrequency(rawFreq);
  
  if (stabilizedFreq && stabilizedFreq > 60 && stabilizedFreq < 500) {
    const note = freqToNote(stabilizedFreq);
    updateUI(note);
    
    // Mode debug : affichage des détails de détection
    if (DEBUG_MODE) {
      console.log(`🎵 Raw frequency: ${rawFreq.toFixed(2)} Hz`);
      console.log(`🔗 Stabilized frequency: ${stabilizedFreq.toFixed(2)} Hz`);
      console.log(`📊 Stability: ${stabilityCounter}/${STABILITY_THRESHOLD}`);
      console.log(`🎼 Note: ${note.us}/${note.fr}, Cents: ${note.cents > 0 ? '+' : ''}${note.cents}`);
      
      // Calculer RMS pour le niveau audio
      let rms = 0;
      for (let i = 0; i < buf.length; i++) {
        rms += buf[i] * buf[i];
      }
      rms = Math.sqrt(rms / buf.length);
      
      // Afficher les infos de debug dans l'interface
      document.getElementById('debug-freq').textContent = `${stabilizedFreq.toFixed(2)} Hz (raw: ${rawFreq.toFixed(2)})`;
      document.getElementById('debug-method').textContent = essentia ? 'Essentia.js' : 'AutoCorrelation';
      document.getElementById('debug-rms').textContent = rms.toFixed(4);
      document.getElementById('debug-buffer').textContent = `${buf.length} samples`;
    }
  } else {
    statusTextEl.textContent = stabilityCounter > 0 ? 
      `En cours... (${stabilityCounter}/${STABILITY_THRESHOLD})` : 
      'En écoute...';
    statusDotEl.className = 'status-dot listening';
    chordDisplay.textContent = '';
  }
  animFrameId = requestAnimationFrame(processAudio);
}

// ──────── MICROPHONE CONTROL ────────
async function startListening() {
  try {
    // Initialise Essentia
    await initEssentia();

    // iOS nécessite des paramètres différents
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const audioConstraints = {
      audio: isIOS ? {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false
      } : {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    };

    stream = await navigator.mediaDevices.getUserMedia(audioConstraints);
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
    micBtn.textContent = '🔴';
    micLabel.textContent = 'Actif';
    statusDotEl.className = 'status-dot listening';
    statusTextEl.textContent = 'En écoute...';
    detectedNotes = [];
    chordDisplay.textContent = '';
    processAudio();
  } catch (e) { 
    alert('Microphone inaccessible : ' + e.message); 
  }
}

function stopListening() {
  isListening = false;
  if (animFrameId) cancelAnimationFrame(animFrameId);
  if (source) source.disconnect();
  if (stream) stream.getTracks().forEach(t => t.stop());
  if (audioCtx) audioCtx.close();
  audioCtx = null;
  analyser = null;
  source = null;
  stream = null;
  detectedNotes = [];
  
  // Reset du système de stabilisation
  frequencyHistory = [];
  stableFrequency = null;
  stabilityCounter = 0;
  
  micBtn.classList.remove('active');
  micBtn.textContent = '🎙';
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
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isMac = /Macintosh|MacIntel|MacPPC|Mac68K/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isWindows = /Windows|Win32|Win64|WinCE|Win95|Win98|Win16|WinNT/.test(ua);
  
  const isChrome = /Chrome/.test(ua) && !/Chromium|Edge|OPR/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|Chromium|Edge|OPR|Firefox/.test(ua);
  
  const supportsBeforeInstallPrompt = 'onbeforeinstallprompt' in window;
  
  console.log(`[PWA] Platform: ${isWindows ? 'Windows' : isAndroid ? 'Android' : isMac ? 'macOS' : isIOS ? 'iOS' : 'unknown'}`);
  console.log(`[PWA] Browser: ${isChrome ? 'Chrome' : isEdge ? 'Edge' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : 'unknown'}`);
  console.log(`[PWA] beforeinstallprompt support: ${supportsBeforeInstallPrompt}`);

  // Handle install prompt (Windows, Android, Linux - Chrome/Edge based browsers)
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt available');
    showInstallPrompt();
  });
  
  // Afficher les guides spécifiques pour les navigateurs sans beforeinstallprompt
  if ((isIOS || isMac) && isSafari && !supportsBeforeInstallPrompt) {
    // iOS et macOS Safari n'ont pas beforeinstallprompt
    showAppleInstallGuide(isIOS ? 'iOS' : 'macOS');
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

function showAppleInstallGuide(platform) {
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

  let instructions = '';
  if (platform === 'iOS') {
    instructions = `
      1. Tapez le bouton Partage (↗️)<br/>
      2. Sélectionnez "Sur l'écran d'accueil"<br/>
      3. Confirmez
    `;
  } else if (platform === 'macOS') {
    instructions = `
      1. Cliquez le menu "Partage" (↗️)<br/>
      2. Sélectionnez "Ajouter à la base de lecture"<br/>
      3. Confirmez
    `;
  }

  guideDiv.innerHTML = `
    <div style="font-weight: 700; margin-bottom: 12px;">🍎 Installer sur ${platform}</div>
    <div style="font-size: 12px; margin-bottom: 12px; opacity: 0.95;">
      ${instructions}
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
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  let errorMessage = 'Erreur microphone : ' + error.name;
  let solution = '';
  
  switch(error.name) {
    case 'NotAllowedError':
      errorMessage = 'Permission refusée';
      solution = isIOS ? 
        'Vérifiez: Réglages → GuitarTune → Microphone' :
        'Autorisez l\'accès au microphone';
      break;
    case 'NotFoundError':
      errorMessage = 'Microphone non détecté';
      solution = 'Vérifiez que votre appareil a un microphone';
      break;
    case 'NotReadableError':
      errorMessage = 'Microphone en utilisation';
      solution = 'Fermez les autres apps utilisant le microphone';
      break;
    case 'PermissionDeniedError':
      errorMessage = 'Permission de microphone refusée';
      solution = isIOS ? 
        'Allez dans Réglages → GuitarTune → Autorisez le microphone' :
        'Autorisez l\'accès au microphone dans les paramètres';
      break;
  }

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
      icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192"><rect fill="%23060609" width="192" height="192"/><circle cx="96" cy="96" r="70" fill="%23f5a623"/></svg>'
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
