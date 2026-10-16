// Soft romantic harp music, synthesised in the browser (no audio file).
// Each note is a clean plucked tone (a few soft harmonics, each fading on its
// own) rendered once into a buffer, played as a sweet love tune in G major.
// Everything sits in a mid-high register so nothing booms.
(() => {
  "use strict";

  const VOLUME = 0.22; // overall loudness: kept low, it's background music
  const DUCKED = 0.015; // while a video is playing
  const EIGHTH = 0.3; // seconds per eighth note (lilting 6/8)

  // Major chords, voiced from G3 upward (no low bass to rumble).
  const CHORDS = {
    G: [55, 62, 67, 71, 74],
    C: [60, 64, 67, 72, 76],
    D: [57, 62, 66, 69, 74],
  };

  // Eight bars: chord + melody as [eighth within the bar, MIDI note].
  const SONG = [
    ["G", [[0, 83], [2, 86], [3, 83], [5, 79]]],
    ["C", [[0, 84], [2, 88], [3, 86], [5, 84]]],
    ["G", [[0, 83], [3, 79], [4, 81], [5, 83]]],
    ["D", [[0, 81], [2, 78], [3, 81], [5, 86]]],
    ["G", [[0, 83], [2, 86], [3, 86], [5, 83]]],
    ["C", [[0, 88], [2, 86], [3, 84], [5, 88]]],
    ["D", [[0, 86], [2, 84], [3, 81], [5, 78]]],
    ["G", [[0, 79], [2, 83], [3, 79]]],
  ];

  // Arpeggio order across the six eighths of a bar: rising, then back.
  const ARP = [0, 1, 2, 3, 4, 3];

  let ctx = null;
  let master = null;
  let bus = null;
  let started = false;
  let muted = false;
  let ducked = false;
  let nextTime = 0;
  let step = 0; // eighth-note counter
  let timer = null;
  const buffers = new Map();

  const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

  // Harmonic: [multiple of the fundamental, loudness, decay time in seconds].
  const PARTIALS = [
    [1, 1, 1.9],
    [2, 0.32, 0.9],
    [3, 0.1, 0.5],
    [4, 0.04, 0.3],
  ];

  function pluck(midi) {
    if (buffers.has(midi)) return buffers.get(midi);
    const sr = ctx.sampleRate;
    const f = freq(midi);
    const length = Math.floor(sr * 2.2);
    const buf = ctx.createBuffer(1, length, sr);
    const y = buf.getChannelData(0);
    const attack = Math.floor(sr * 0.006);

    for (const [mult, amp, decay] of PARTIALS) {
      const w = (2 * Math.PI * f * mult) / sr;
      const fall = Math.exp(-1 / (decay * sr));
      let level = amp;
      for (let i = 0; i < length; i++) {
        y[i] += level * Math.sin(w * i);
        level *= fall;
      }
    }

    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(y[i]));
    const norm = peak ? 0.6 / peak : 1;
    const fadeOut = Math.floor(sr * 0.05);
    for (let i = 0; i < length; i++) {
      const env = i < attack ? i / attack : i > length - fadeOut ? (length - i) / fadeOut : 1;
      y[i] *= norm * env;
    }

    buffers.set(midi, buf);
    return buf;
  }

  function play(midi, when, velocity, pan) {
    const src = ctx.createBufferSource();
    src.buffer = pluck(midi);
    const gain = ctx.createGain();
    gain.gain.value = velocity;
    let out = gain;
    if (ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = pan;
      gain.connect(p);
      out = p;
    }
    src.connect(gain);
    out.connect(bus);
    src.start(when);
  }

  function reverb() {
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * 1.6);
    const ir = ctx.createBuffer(2, len, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const conv = ctx.createConvolver();
    conv.buffer = ir;
    return conv;
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.4) {
      const bar = SONG[Math.floor(step / 6) % SONG.length];
      const beat = step % 6;
      const chord = CHORDS[bar[0]];
      const human = Math.random() * 0.015; // tiny timing drift so it breathes

      play(chord[ARP[beat]], nextTime + human, beat === 0 ? 0.26 : 0.18, (ARP[beat] - 2) * 0.15);
      for (const [at, note] of bar[1]) {
        if (at === beat) play(note, nextTime + 0.01, at === 0 ? 0.42 : 0.34, 0.15);
      }

      nextTime += EIGHTH;
      step++;
    }
  }

  function level() {
    return muted ? 0 : ducked ? DUCKED : VOLUME;
  }

  function fadeTo(value, seconds) {
    if (!ctx) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(value, now + seconds);
  }

  /* ---------- Mute button ---------- */

  const NOTE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
  const NOTE_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/><path d="M3.5 3.5l17 17" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>';
  let button = null;

  function makeButton() {
    button = document.createElement("button");
    button.type = "button";
    button.className = "music-toggle";
    button.addEventListener("click", () => {
      muted = !muted;
      if (!muted && ctx.state === "suspended") ctx.resume();
      fadeTo(level(), 0.6);
      paintButton();
    });
    document.body.appendChild(button);
    paintButton();
  }

  function paintButton() {
    button.innerHTML = muted ? NOTE_OFF : NOTE;
    button.setAttribute("aria-label", muted ? "Play music" : "Mute music");
    button.classList.toggle("off", muted);
  }

  /* ---------- Public API ---------- */

  window.BirthdayMusic = {
    // Must be called from a tap/click so the browser allows sound.
    start() {
      if (started) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      started = true;
      ctx = new AC();

      master = ctx.createGain();
      master.gain.value = 0.0001;
      const tone = ctx.createBiquadFilter();
      tone.type = "lowpass";
      tone.frequency.value = 5500;
      const clean = ctx.createBiquadFilter(); // trims low rumble
      clean.type = "highpass";
      clean.frequency.value = 180;
      master.connect(clean).connect(tone).connect(ctx.destination);

      bus = ctx.createGain();
      const dry = ctx.createGain();
      dry.gain.value = 0.75;
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      const verb = reverb();
      bus.connect(dry).connect(master);
      bus.connect(verb).connect(wet).connect(master);

      nextTime = ctx.currentTime + 0.15;
      schedule();
      timer = setInterval(schedule, 100);
      fadeTo(level(), 5);
      makeButton();

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) ctx.suspend();
        else if (!muted) ctx.resume();
      });
    },

    // Quiet the music while a video plays.
    duck(on) {
      ducked = on;
      fadeTo(level(), on ? 0.4 : 1.5);
    },
  };
})();
