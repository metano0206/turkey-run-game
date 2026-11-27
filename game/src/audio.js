// audio.js — every sound is synthesised with WebAudio: no audio files.
// Gobbles, squawks, pickup pops, a "spotted" sting, knife whistles, oven
// blasts, win/lose jingles, and a small plucked folk loop for music.

let ctx = null;
let master = null;
let musicGain = null;
let muted = false;
let musicTimer = null;
let musicStep = 0;

function ensureContext() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = muted ? 0 : 0.5;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);
  return true;
}

export function unlockAudio() {
  if (ensureContext() && ctx.state === 'suspended') ctx.resume();
}

export function setMuted(value) {
  muted = value;
  if (master) master.gain.value = muted ? 0 : 0.5;
}
export function isMuted() { return muted; }

function tone({ freq = 440, freqEnd = null, type = 'sine', at = 0, dur = 0.15, vol = 0.5, dest = null }) {
  if (!ensureContext()) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(gain).connect(dest ?? master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise({ at = 0, dur = 0.2, vol = 0.4, from = 3000, to = 500 }) {
  if (!ensureContext()) return;
  const t0 = ctx.currentTime + at;
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(from, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  src.connect(filter).connect(gain).connect(master);
  src.start(t0);
}

export const sfx = {
  gobble() {
    // A wobbly little warble: fast pitch wobble on a square-ish tone.
    for (let i = 0; i < 5; i++) {
      tone({ freq: 620 + (i % 2) * 190, type: 'square', at: i * 0.055, dur: 0.06, vol: 0.16 });
    }
    tone({ freq: 420, freqEnd: 240, type: 'sawtooth', at: 0.28, dur: 0.14, vol: 0.12 });
  },
  squawk() {
    tone({ freq: 880, freqEnd: 1900, type: 'sawtooth', dur: 0.16, vol: 0.3 });
    tone({ freq: 1400, freqEnd: 500, type: 'square', at: 0.1, dur: 0.18, vol: 0.2 });
    noise({ dur: 0.18, vol: 0.2, from: 4000, to: 900 });
  },
  jump() { tone({ freq: 300, freqEnd: 720, type: 'sine', dur: 0.16, vol: 0.25 }); },
  thud() { tone({ freq: 130, freqEnd: 55, type: 'sine', dur: 0.14, vol: 0.5 }); noise({ dur: 0.08, vol: 0.15, from: 800, to: 200 }); },
  pickup() {
    tone({ freq: 880, type: 'triangle', dur: 0.09, vol: 0.3 });
    tone({ freq: 1318, type: 'triangle', at: 0.07, dur: 0.14, vol: 0.3 });
  },
  golden() {
    [1046, 1318, 1568, 2093].forEach((f, i) => tone({ freq: f, type: 'triangle', at: i * 0.06, dur: 0.16, vol: 0.25 }));
  },
  spotted() {
    tone({ freq: 392, type: 'square', dur: 0.1, vol: 0.22 });
    tone({ freq: 392, type: 'square', at: 0.12, dur: 0.1, vol: 0.22 });
    tone({ freq: 587, type: 'square', at: 0.24, dur: 0.2, vol: 0.26 });
  },
  lostHim() {
    tone({ freq: 784, type: 'triangle', dur: 0.1, vol: 0.25 });
    tone({ freq: 988, type: 'triangle', at: 0.09, dur: 0.18, vol: 0.25 });
  },
  knifeThrow() { noise({ dur: 0.28, vol: 0.22, from: 5200, to: 1400 }); },
  knifeNear() { noise({ dur: 0.12, vol: 0.3, from: 6000, to: 2400 }); tone({ freq: 1900, freqEnd: 900, dur: 0.1, vol: 0.12 }); },
  ovenBlast() { noise({ dur: 0.7, vol: 0.3, from: 500, to: 2400 }); tone({ freq: 90, freqEnd: 60, dur: 0.6, vol: 0.2 }); },
  splash() { noise({ dur: 0.3, vol: 0.3, from: 1200, to: 300 }); },
  stumble() { tone({ freq: 220, freqEnd: 110, type: 'triangle', dur: 0.18, vol: 0.35 }); },
  stageClear() {
    [523, 659, 784, 1046].forEach((f, i) => tone({ freq: f, type: 'triangle', at: i * 0.09, dur: 0.2, vol: 0.28 }));
  },
  win() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone({ freq: f, type: 'triangle', at: i * 0.13, dur: 0.26, vol: 0.3 }));
  },
  lose() {
    [392, 370, 349, 311].forEach((f, i) => tone({ freq: f, type: 'sawtooth', at: i * 0.24, dur: 0.26, vol: 0.16 }));
  },
  click() { tone({ freq: 660, type: 'triangle', dur: 0.06, vol: 0.2 }); },
};

// A short plucked melody in D major, looped quietly under the run.
const MELODY = [293, 369, 440, 369, 293, 246, 293, 369, 440, 493, 587, 493, 440, 369, 293, 0];
export function startMusic() {
  if (!ensureContext() || musicTimer) return;
  musicTimer = setInterval(() => {
    if (muted) return;
    const note = MELODY[musicStep % MELODY.length];
    musicStep++;
    if (note) tone({ freq: note, type: 'triangle', dur: 0.22, vol: 0.5, dest: musicGain });
    if (musicStep % 4 === 0) tone({ freq: 146, type: 'sine', dur: 0.3, vol: 0.4, dest: musicGain });
  }, 215);
}
export function stopMusic() {
  if (musicTimer) clearInterval(musicTimer);
  musicTimer = null;
}
