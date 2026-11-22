export type SoundEffectType = 'choice' | 'confirm' | 'negative' | 'transition' | 'exam' | 'achievement';

const SOUND_MUTE_KEY = 'recall_sound_muted_v1';
let sharedAudioContext: AudioContext | null = null;

export const isSoundMuted = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(SOUND_MUTE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setSoundMuted = (muted: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SOUND_MUTE_KEY, String(muted));
  } catch {
    // Preference applies cleanly in memory for the current session.
  }
};

const getAudioContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!sharedAudioContext) {
    try {
      sharedAudioContext = new Ctx();
    } catch {
      return null;
    }
  }
  if (sharedAudioContext.state === 'suspended') {
    sharedAudioContext.resume().catch(() => {});
  }
  return sharedAudioContext;
};

const scheduleTone = (ctx: AudioContext, freq: number, delaySec: number, durationSec: number, volume: number, type: OscillatorType = 'sine') => {
  const start = ctx.currentTime + delaySec;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + durationSec);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(start);
  osc.stop(start + durationSec + 0.02);
};

export const playSound = (effect: SoundEffectType): void => {
  if (isSoundMuted()) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (effect) {
      case 'choice':
        scheduleTone(ctx, 520, 0, 0.06, 0.045, 'triangle');
        break;
      case 'confirm':
        scheduleTone(ctx, 587.33, 0, 0.08, 0.045, 'sine');
        scheduleTone(ctx, 783.99, 0.045, 0.1, 0.04, 'sine');
        break;
      case 'negative':
        scheduleTone(ctx, 293.66, 0, 0.11, 0.045, 'triangle');
        scheduleTone(ctx, 246.94, 0.07, 0.14, 0.04, 'sine');
        break;
      case 'transition':
        scheduleTone(ctx, 329.63, 0, 0.22, 0.035, 'sine');
        scheduleTone(ctx, 493.88, 0.06, 0.24, 0.028, 'sine');
        break;
      case 'exam':
        scheduleTone(ctx, 440, 0, 0.09, 0.045, 'triangle');
        scheduleTone(ctx, 554.37, 0.06, 0.09, 0.045, 'triangle');
        scheduleTone(ctx, 659.25, 0.12, 0.18, 0.05, 'sine');
        break;
      case 'achievement':
        scheduleTone(ctx, 523.25, 0, 0.08, 0.045, 'sine');
        scheduleTone(ctx, 659.25, 0.06, 0.09, 0.045, 'sine');
        scheduleTone(ctx, 783.99, 0.12, 0.11, 0.05, 'sine');
        scheduleTone(ctx, 1046.5, 0.19, 0.2, 0.045, 'sine');
        break;
    }
  } catch {
    // Audio playback is strictly non-critical enhancement.
  }
};
