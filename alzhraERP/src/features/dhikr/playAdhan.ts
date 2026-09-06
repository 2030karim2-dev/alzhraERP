/**
 * Dhikr & Prayer Ticker — Islamic Adhan Sound System.
 * Supports authentic audio recitations (Makkah, Madinah, Al-Aqsa, Abdulbasit, Takbeerat)
 * with a high-fidelity Web Audio API acoustic synthesizer fallback.
 */
import type { AdhanReciterId } from './types';
import { useDhikrStore } from './dhikrStore';

export interface AdhanReciterInfo {
  id: AdhanReciterId;
  name: string;
  desc: string;
  urls: string[];
}

export const ADHAN_RECITERS: AdhanReciterInfo[] = [
  {
    id: 'makkah',
    name: 'أذان الحرم المكي الشريف',
    desc: 'صوت شجي مهيب من مكة المكرمة',
    urls: [
      'https://cdn.islamic.network/adhan/makkah.mp3',
      'https://ia800301.us.archive.org/15/items/AdhanMakkah/Adhan_Makkah.mp3',
    ],
  },
  {
    id: 'madinah',
    name: 'أذان المسجد النبوي الشريف',
    desc: 'أذان المدينة المنورة الندي',
    urls: [
      'https://ia800204.us.archive.org/11/items/AdhanMadinah/Adhan_Madinah.mp3',
      'https://cdn.islamic.network/adhan/madina.mp3',
    ],
  },
  {
    id: 'quds',
    name: 'أذان المسجد الأقصى المبارك',
    desc: 'تسجيل خاشع من القدس الشريف',
    urls: ['https://ia800304.us.archive.org/21/items/AdhanAlAqsa/Adhan_AlAqsa.mp3'],
  },
  {
    id: 'abdulbasit',
    name: 'أذان الشيخ عبد الباسط عبد الصمد',
    desc: 'أداء صوتي تاريخي خالد',
    urls: ['https://ia800303.us.archive.org/3/items/AdhanAbdulBasit/Adhan_Abdulbasit.mp3'],
  },
  {
    id: 'takbeerat',
    name: 'تكبيرات الأذان (الله أكبر - مختصر)',
    desc: 'تكبيرات الأذان الأولى فقط',
    urls: ['https://ia800301.us.archive.org/15/items/AdhanMakkah/Adhan_Takbeerat.mp3'],
  },
  {
    id: 'synth',
    name: 'الرنين الصوتي الإيماني (يعمل بدون إنترنت)',
    desc: 'نغمات تكبيرات إسلامية رنانة عبر المتصفح',
    urls: [],
  },
];

let activeAudio: HTMLAudioElement | null = null;
let cachedContext: AudioContext | null = null;
let activeOscillators: OscillatorNode[] = [];
let isPlayingState = false;
const stateListeners = new Set<(playing: boolean) => void>();

function setPlayingState(state: boolean): void {
  if (isPlayingState !== state) {
    isPlayingState = state;
    stateListeners.forEach(fn => {
      fn(state);
    });
  }
}

export function isAdhanPlaying(): boolean {
  return isPlayingState;
}

export function subscribeAdhanState(callback: (playing: boolean) => void): () => void {
  stateListeners.add(callback);
  callback(isPlayingState);
  return () => {
    stateListeners.delete(callback);
  };
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!cachedContext) cachedContext = new Ctor();
  return cachedContext;
}

// Unlock audio context on user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = (): void => {
    if (cachedContext && cachedContext.state === 'suspended') {
      void cachedContext.resume().catch(() => {});
    }
  };
  window.addEventListener('click', unlockAudio, { once: true, passive: true });
  window.addEventListener('touchstart', unlockAudio, { once: true, passive: true });
  window.addEventListener('keydown', unlockAudio, { once: true, passive: true });
}

/**
 * Stops any currently playing Adhan immediately.
 */
export function stopAdhanSound(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }

  if (activeOscillators.length > 0) {
    activeOscillators.forEach(osc => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {
        // Ignored if already stopped
      }
    });
    activeOscillators = [];
  }

  setPlayingState(false);
}

/**
 * Plays high-fidelity Web Audio synthesized Takbeerat call (works 100% offline & latency-free).
 */
async function playSynthesizedAdhan(volume: number, previewMode = false): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }
    if (ctx.state !== 'running') return;
  } catch {
    return;
  }

  setPlayingState(true);
  const now = ctx.currentTime;

  // Master bus with warm compression and high audible volume
  const masterGain = ctx.createGain();
  const effectiveGain = Math.max(0.2, Math.min(1.0, volume));
  masterGain.gain.setValueAtTime(effectiveGain, now);
  masterGain.connect(ctx.destination);

  const playHarmonicNote = (freq: number, startTime: number, duration: number) => {
    // 1. Fundamental tone (Warm sine)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    // 2. Harmonic overtone (Rich triangle - Octave)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, startTime);

    // 3. Sub-harmonic body
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(freq * 0.5, startTime);

    // Smooth envelope with resonant decay
    gain1.gain.setValueAtTime(0.0001, startTime);
    gain1.gain.linearRampToValueAtTime(0.7, startTime + 0.18);
    gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    gain2.gain.setValueAtTime(0.0001, startTime);
    gain2.gain.linearRampToValueAtTime(0.35, startTime + 0.18);
    gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.85);

    gain3.gain.setValueAtTime(0.0001, startTime);
    gain3.gain.linearRampToValueAtTime(0.2, startTime + 0.18);
    gain3.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.9);

    osc1.connect(gain1);
    osc2.connect(gain2);
    osc3.connect(gain3);

    gain1.connect(masterGain);
    gain2.connect(masterGain);
    gain3.connect(masterGain);

    osc1.start(startTime);
    osc2.start(startTime);
    osc3.start(startTime);

    const stopTime = startTime + duration + 0.2;
    osc1.stop(stopTime);
    osc2.stop(stopTime);
    osc3.stop(stopTime);

    activeOscillators.push(osc1, osc2, osc3);
  };

  // Resonant Islamic Maqam (Allahu Akbar... Allahu Akbar... Ash-hadu alla ilaha illallah)
  const notes = [
    { f: 392.0, t: 0.0, d: 1.4 }, // G4 - Allaaahu
    { f: 440.0, t: 1.0, d: 1.6 }, // A4 - Akbaaar
    { f: 523.25, t: 2.2, d: 2.0 }, // C5
    { f: 440.0, t: 3.8, d: 1.8 }, // A4

    { f: 392.0, t: 5.6, d: 1.4 }, // G4 - Allaaahu
    { f: 440.0, t: 6.6, d: 1.6 }, // A4 - Akbaaar
    { f: 587.33, t: 7.8, d: 2.4 }, // D5
    { f: 523.25, t: 9.6, d: 2.6 }, // C5

    { f: 440.0, t: 12.2, d: 1.8 }, // Ash-hadu
    { f: 493.88, t: 13.8, d: 2.2 }, // an la ilaha
    { f: 440.0, t: 15.6, d: 2.8 }, // illallaah
  ];

  const count = previewMode ? 4 : notes.length;
  let maxEndTime = 0;

  for (let i = 0; i < count; i++) {
    const item = notes[i];
    playHarmonicNote(item.f, now + item.t, item.d);
    maxEndTime = Math.max(maxEndTime, item.t + item.d);
  }

  // Set timeout to reset playing state when done
  setTimeout(
    () => {
      setPlayingState(false);
      activeOscillators = [];
    },
    (maxEndTime + 0.5) * 1000
  );
}

export interface PlayAdhanOptions {
  previewMode?: boolean | undefined;
  reciterId?: AdhanReciterId | undefined;
  volume?: number | undefined;
}

/**
 * Plays the Adhan sound with the user's selected reciter and volume.
 * Falls back gracefully to synthesized acoustic Adhan if offline.
 */
export async function playAdhanSound(options: PlayAdhanOptions = {}): Promise<void> {
  // Stop existing sound first
  stopAdhanSound();

  const store = useDhikrStore.getState();
  const reciterId = options.reciterId || store.adhanReciter || 'makkah';
  const volume = options.volume !== undefined ? options.volume : (store.volume ?? 0.9);

  if (reciterId === 'synth') {
    await playSynthesizedAdhan(volume, options.previewMode);
    return;
  }

  const reciter = ADHAN_RECITERS.find(r => r.id === reciterId);
  const urls = reciter?.urls || [];

  if (urls.length === 0) {
    await playSynthesizedAdhan(volume, options.previewMode);
    return;
  }

  // Try playing real audio from URLs
  let playedSuccessfully = false;

  for (const url of urls) {
    try {
      const audio = new Audio(url);
      audio.crossOrigin = 'anonymous';
      audio.volume = Math.max(0.1, Math.min(1.0, volume));

      // Handle preview mode (play first 15 seconds)
      if (options.previewMode) {
        audio.addEventListener('timeupdate', () => {
          if (audio.currentTime >= 15) {
            stopAdhanSound();
          }
        });
      }

      audio.addEventListener('ended', () => {
        setPlayingState(false);
        activeAudio = null;
      });

      audio.addEventListener('error', () => {
        setPlayingState(false);
        activeAudio = null;
      });

      activeAudio = audio;
      setPlayingState(true);
      await audio.play();
      playedSuccessfully = true;
      break;
    } catch {
      // Try next URL or fall back
    }
  }

  if (!playedSuccessfully) {
    // Seamless fallback to synthesized acoustic Adhan
    await playSynthesizedAdhan(volume, options.previewMode);
  }
}
