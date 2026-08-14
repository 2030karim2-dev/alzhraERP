/**
 * Dhikr & Prayer Ticker — adhan sound via Web Audio API.
 * A calm, repeated call-to-prayer motif generated locally (no audio files,
 * no network). Replace with `new Audio('/adhan.mp3').play()` if a real
 * recording is later dropped into `public/`.
 */
let cachedContext: AudioContext | null = null;

function getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!cachedContext) cachedContext = new Ctor();
    return cachedContext;
}

/** Plays a short two-tone bell (adhan motif) four times, gently. */
export async function playAdhanSound(): Promise<void> {
    const ctx = getContext();
    if (!ctx) return;

    try {
        if (ctx.state === 'suspended') await ctx.resume();
        if (ctx.state !== 'running') return;
    } catch {
        return; // autoplay policy: needs a user gesture first
    }

    const now = ctx.currentTime;
    const tone = (freq: number, start: number, duration: number, peak = 0.12) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(peak, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.05);
    };

    // Simple repeated call motif: (high-low-high) x4 with small gaps.
    for (let i = 0; i < 4; i++) {
        const base = now + i * 1.6;
        tone(880, base, 0.9, 0.10);     // A5
        tone(659.25, base + 0.35, 0.7, 0.08); // E5
        tone(1046.5, base + 0.7, 0.9, 0.07);  // C6
    }
}
