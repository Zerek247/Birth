// Soft romantic harp music, synthesised in the browser (no audio file).
// Each note is a plucked string (Karplus-Strong) rendered once into a buffer,
// played as a light, happy music-box style love tune in C major (6/8).
(() => {
  "use strict";

  const VOLUME = 0.16; // overall loudness: kept low, it's background music
  const DUCKED = 0.015; // while a video is playing
  const EIGHTH = 0.3; // seconds per eighth note (lilting 6/8)

  // Major chords only, with sweet added notes: C(add9), Fmaj7, G6.
  const CHORDS = {
    C: [48, 55, 64, 67, 74],
    F: [41, 48, 57, 64, 69],
    G: [43, 50, 59, 62, 64],
  };

  // Eight bars: chord + melody as [eighth within the bar, MIDI note].
  const SONG = [
    ["C", [[0, 76], [2, 79], [3, 84]]],
    ["F", [[0, 81], [2, 79], [3, 77], [5, 81]]],
    ["C", [[0, 79], [3, 76], [4, 79]]],
    ["G", [[0, 74], [2, 76], [3, 77], [5, 74]]],
    ["C", [[0, 76], [2, 79], [3, 84], [5, 86]]],
    ["F", [[0, 88], [2, 84], [3, 81], [5, 84]]],
    ["G", [[0, 83], [2, 86], [3, 79], [5, 83]]],
    ["C", [[0, 84], [3, 79], [4, 76]]],
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

  function pluck(midi) {
    if (buffers.has(midi)) return buffers.get(midi);
    const sr = ctx.sampleRate;
    const f = freq(midi);
    const period = Math.max(2, Math.round(sr / f));
    const ring = midi < 55 ? 3.4 : 2.4; // seconds until ~silent
    const length = Math.floor(sr * ring);
    const buf = ctx.createBuffer(1, length, sr);
    const y = buf.getChannelData(0);

    // Soft excitation: smoothed noise reads as a finger, not a pick.
    for (let i = 0; i < period; i++) y[i] = Math.random() * 2 - 1;
    for (let pass = 0; pass < 3; pass++) {
      for (let i = 1; i < period; i++) y[i] = (y[i] + y[i - 1]) * 0.5;
    }

    const loss = Math.pow(0.001, 1 / (f * ring));
    for (let i = period; i < length; i++) {
      y[i] = loss * 0.5 * (y[i - period] + y[Math.max(0, i - period - 1)]);
    }

    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(y[i]));
    const norm = peak ? 0.6 / peak : 1;
    const attack = Math.floor(sr * 0.004);
    for (let i = 0; i < length; i++) y[i] *= norm * (i < attack ? i / attack : 1);

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
    const len = Math.floor(sr * 2);
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

      play(chord[ARP[beat]], nextTime + human, beat === 0 ? 0.32 : 0.22, (ARP[beat] - 2) * 0.15);
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
      master.connect(tone).connect(ctx.destination);

      bus = ctx.createGain();
      const dry = ctx.createGain();
      dry.gain.value = 0.75;
      const wet = ctx.createGain();
      wet.gain.value = 0.28;
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
