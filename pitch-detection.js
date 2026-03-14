/* ═════════════════════════════════════════════════════════════ */
/* GuitarTune — Pitch Detection Module                         */
/* Détection de fréquence, notes, accords                      */
/* ═════════════════════════════════════════════════════════════ */

// ──────── CONSTANTES MUSICALES ────────
const NOTE_NAMES_US = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTE_NAMES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

const GUITAR_STRINGS = [
  { string: 1, us: 'E', fr: 'Mi', freq: 82.41, octave: 2 },
  { string: 2, us: 'A', fr: 'La', freq: 110.00, octave: 2 },
  { string: 3, us: 'D', fr: 'Ré', freq: 146.83, octave: 3 },
  { string: 4, us: 'G', fr: 'Sol', freq: 196.00, octave: 3 },
  { string: 5, us: 'B', fr: 'Si', freq: 246.94, octave: 3 },
  { string: 6, us: 'E', fr: 'Mi', freq: 329.63, octave: 4 },
];

const COMMON_CHORDS = [
  { name: 'Em', notes: ['E2', 'A2', 'D3'], tolerance: 8 },
  { name: 'Am', notes: ['E2', 'A2', 'C3'], tolerance: 8 },
  { name: 'G', notes: ['E2', 'B2', 'G3'], tolerance: 8 },
  { name: 'D', notes: ['D2', 'A2', 'D3'], tolerance: 8 },
  { name: 'A', notes: ['E2', 'A2', 'E3'], tolerance: 8 },
  { name: 'E', notes: ['E2', 'B2', 'E3'], tolerance: 8 },
  { name: 'C', notes: ['E2', 'G2', 'C3'], tolerance: 8 },
];

// ──────── ÉTAT DE STABILISATION ────────
let frequencyHistory = [];
let stableFrequency = null;
let stabilityCounter = 0;
const STABILITY_THRESHOLD = 5;
const FREQUENCY_TOLERANCE = 8;

// ──────── ESSENTIA.JS ────────
let essentia = null;

async function initEssentia() {
  try {
    essentia = new Essentia(EssentiaWASM);
    console.log('Essentia.js initialized');
  } catch (e) {
    console.warn('Essentia.js not available, using fallback:', e.message);
  }
}

// ──────── STABILISATION FRÉQUENCE ────────
function stabilizeFrequency(newFreq) {
  if (newFreq < 20 || newFreq > 2000) return null;
  
  const inGuitarRange = (newFreq >= 60 && newFreq <= 500);
  
  if (inGuitarRange) {
    frequencyHistory.push(newFreq);
    if (frequencyHistory.length > 10) frequencyHistory.shift();
    
    if (stableFrequency !== null) {
      const diff = Math.abs(newFreq - stableFrequency);
      
      if (diff <= FREQUENCY_TOLERANCE) {
        stabilityCounter++;
        stableFrequency = (stableFrequency * 0.8) + (newFreq * 0.2);
        return stableFrequency;
      } else {
        stabilityCounter = 0;
        stableFrequency = null;
      }
    }
    
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
      
      if (maxCount >= 3) {
        stableFrequency = consensusFreq;
        stabilityCounter = maxCount;
        return stableFrequency;
      }
    }
  } else {
    if (stableFrequency !== null) {
      stabilityCounter = 0;
      stableFrequency = null; 
    }
    return newFreq;
  }
  
  return null;
}

function resetStabilization() {
  frequencyHistory = [];
  stableFrequency = null;
  stabilityCounter = 0;
}

// ──────── CONVERSION FRÉQUENCE → NOTE ────────
function freqToNote(freq) {
  if (!freq || freq < 20) return null;
  const noteNum = 12 * (Math.log2(freq / 440)) + 69;
  const noteInt = Math.round(noteNum);
  const cents = Math.round((noteNum - noteInt) * 100);
  const noteIdx = ((noteInt % 12) + 12) % 12;
  return { noteIdx, cents, us: NOTE_NAMES_US[noteIdx], fr: NOTE_NAMES_FR[noteIdx], freq: freq.toFixed(1) };
}

// ──────── DÉTECTION ESSENTIA.JS ────────
function detectPitchEssentia(audioBuffer) {
  if (!essentia || !audioBuffer) return -1;
  try {
    const preEmphasized = new Float32Array(audioBuffer.length);
    for (let i = 1; i < audioBuffer.length; i++) {
      preEmphasized[i] = audioBuffer[i] - 0.97 * audioBuffer[i - 1];
    }
    
    const windowed = essentia.arrayToVector(preEmphasized);
    const windowed_hann = essentia.Windowing(windowed, 'hann');
    const spectrum = essentia.Spectrum(windowed_hann);
    
    try {
      const { peaks_frequencies, peaks_magnitudes } = essentia.SpectralPeaks(
        spectrum, 
        20, 40, 10000, 0.5
      );
      
      if (peaks_frequencies.length > 0) {
        let bestFreq = -1, bestMag = 0;
        
        for (let i = 0; i < peaks_frequencies.length; i++) {
          const freq = peaks_frequencies[i];
          const mag = peaks_magnitudes[i];
          
          if (freq >= 60 && freq <= 500 && mag > bestMag && mag > 0.003) {
            bestFreq = freq;
            bestMag = mag;
          }
        }
        
        if (bestFreq > 0) return bestFreq;
        
        if (peaks_magnitudes[0] > 0.002) {
          return peaks_frequencies[0];
        }
      }
      
    } catch (peaksError) {
      console.warn('SpectralPeaks error:', peaksError);
    }
    
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

// ──────── AUTOCORRÉLATION (FALLBACK) ────────
function autoCorrelate(buf, sr) {
  const SIZE = buf.length, MAX = Math.floor(SIZE / 2);
  
  let rms = 0;
  for (let i = 0; i < SIZE; i++) rms += buf[i] * buf[i];
  rms = Math.sqrt(rms / SIZE);
  if (rms < 0.003) return -1;

  const emphasized = new Float32Array(SIZE);
  for (let i = 1; i < SIZE; i++) {
    emphasized[i] = buf[i] - 0.95 * buf[i - 1];
  }

  const minPeriod = Math.floor(sr / 500);
  const maxPeriod = Math.floor(sr / 60);
  const searchStart = Math.max(minPeriod, 8);
  const searchEnd = Math.min(maxPeriod, MAX);
  
  let best = -1, bestC = 0;
  let foundCandidate = false;
  
  for (let o = searchStart; o < searchEnd; o++) {
    let correlation = 0, normA = 0, normB = 0;
    
    for (let i = 0; i < MAX; i++) {
      const a = emphasized[i];
      const b = emphasized[i + o];
      correlation += a * b;
      normA += a * a;
      normB += b * b;
    }
    
    const normalizedCorr = normA * normB > 0 ? correlation / Math.sqrt(normA * normB) : 0;
    
    if (normalizedCorr > 0.6 && normalizedCorr > bestC) {
      bestC = normalizedCorr;
      best = o;
      foundCandidate = true;
    }
  }
  
  if (foundCandidate && bestC > 0.7 && best > searchStart && best < searchEnd - 1) {
    const y1 = bestC;
    let y0 = 0, y2 = 0;
    
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

// ──────── DÉTECTION D'ACCORDS ────────
function detectChord(notes) {
  if (!notes || notes.length < 3) return null;
  
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

function getNoteFrequency(noteStr) {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const note = noteStr.slice(0, -1);
  const octave = parseInt(noteStr.slice(-1));
  const semitones = (notes.indexOf(note) || 0) - 9;
  return 27.5 * Math.pow(2, octave + (semitones / 12));
}
