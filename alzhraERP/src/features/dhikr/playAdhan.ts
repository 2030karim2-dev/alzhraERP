/**
 * Dhikr & Prayer Ticker — Spiritual Adhan Sound Generator.
 * Synthesizes a warm, resonant, beautiful acoustic call to prayer / Takbeerat motif
 * using Web Audio API synthesis with harmonic overtone blending and gentle reverb decay.
 */
let cachedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!cachedContext) cachedContext = new Ctor();
    return cachedContext;
}

/**
 * Plays a rich, resonant, harmonious call-to-prayer melody.
 */
export async function playAdhanSound(previewMode = false): Promise<void> {
    const ctx = getContext();
    if (!ctx) return;

    try {
        if (ctx.state === 'suspended') await ctx.resume();
        if (ctx.state !== 'running') return;
    } catch {
        return; // autoplay restrictions
    }

    const now = ctx.currentTime;

    // Master bus with soft compression
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(previewMode ? 0.35 : 0.45, now);
    masterGain.connect(ctx.destination);

    // Warm Islamic maqam note frequencies (Bayati / Hijaz inspired harmonious notes)
    // D4 (293.66), F4 (349.23), G4 (392.00), A4 (440.00), Bb4 (466.16), C5 (523.25), D5 (587.33)
    const playNote = (freq: number, startTime: number, duration: number, volume = 0.25) => {
        // Fundamental tone
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(freq, startTime);

        // Warm harmonic overtone (Octave + 5th)
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(freq * 1.5, startTime);

        // Envelope: soft attack, sustained resonance, gentle decay
        gain1.gain.setValueAtTime(0.0001, startTime);
        gain1.gain.linearRampToValueAtTime(volume, startTime + 0.15);
        gain1.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

        gain2.gain.setValueAtTime(0.0001, startTime);
        gain2.gain.linearRampToValueAtTime(volume * 0.3, startTime + 0.15);
        gain2.gain.exponentialRampToValueAtTime(0.0001, startTime + duration * 0.8);

        osc1.connect(gain1);
        osc2.connect(gain2);
        gain1.connect(masterGain);
        gain2.connect(masterGain);

        osc1.start(startTime);
        osc2.start(startTime);
        osc1.stop(startTime + duration + 0.1);
        osc2.stop(startTime + duration + 0.1);
    };

    // Melodic Call-to-Prayer / Takbeerat sequence (Allahu Akbar... Allahu Akbar)
    const notes = [
        { f: 392.00, t: 0.0, d: 1.2 },  // G4
        { f: 440.00, t: 0.8, d: 1.4 },  // A4
        { f: 523.25, t: 1.8, d: 1.8 },  // C5
        { f: 440.00, t: 3.2, d: 1.6 },  // A4 (Allahu Akbar)

        { f: 392.00, t: 4.8, d: 1.2 },  // G4
        { f: 440.00, t: 5.6, d: 1.4 },  // A4
        { f: 587.33, t: 6.6, d: 2.2 },  // D5
        { f: 523.25, t: 8.2, d: 2.4 },  // C5 (Allahu Akbar)
    ];

    const count = previewMode ? 4 : notes.length;
    for (let i = 0; i < count; i++) {
        const item = notes[i];
        playNote(item.f, now + item.t, item.d);
    }
}
