(() => {
  "use strict";

  /* ---------- Data ---------- */

  // `pos` keeps the characters in frame when a portrait wallpaper is cropped on wide screens.
  const IMAGES = [
    { src: "images/1.jpg", pos: "50% 45%" },
    { src: "images/2.webp", pos: "50% 78%" },
    { src: "images/3.jpg", pos: "60% 72%" },
    { src: "images/4.webp", pos: "50% 50%" },
    { src: "images/5.jpg", pos: "50% 74%" },
    { src: "images/6.jpg", pos: "50% 62%" },
    { src: "images/7.webp", pos: "50% 70%" },
    { src: "images/10.jpg", pos: "50% 55%" },
    { src: "images/11.jpg", pos: "50% 62%" },
    { src: "images/12.jpg", pos: "50% 50%" },
    { src: "images/13.jpg", pos: "50% 55%" },
    { src: "images/14.jpg", pos: "50% 50%" },
    { src: "images/15.jpg", pos: "50% 50%" },
    { src: "images/16.webp", pos: "50% 45%" },
  ];

  const POEM = [
    [
      "How lucky my eyes are to be able to see you",
      "And how lucky my mind is to have gotten to know you",
      "Because you're engraved in my mind",
    ],
    [
      "Another day goes by with me being away",
      "Tell me where you are, and I'll come looking for you",
      "I'd run away anywhere with you, my queen",
    ],
    [
      "I want to stand with you before Allah",
      "So that He may bless us both",
      "May you and I spend our whole lives together",
    ],
    [
      "Even if your home is so far away from here",
      "I'd reach it by boat or by plane",
      "Even if you're on the other side of the sea, I'd swim to you",
    ],
    [
      "Because your heart is so beautiful and precious",
      "So transparent, kind, sincere, pure, and beautiful",
      "That it makes me fall in love with you and only you",
      "I want to spend forever by your side",
    ],
    [
      "A king and his queen in their palace, through the good times and the bad",
      "I feel that every moment with you is priceless",
      "Worth more than gold, as precious as life itself",
      "There's no one like you, my love",
    ],
    [
      "I kept your name inside my heart",
      "Where these words were born",
      "And I sat down to remember",
      "Those words of love and the way we first met",
      "And I drew your silhouette",
      "A beautiful blend of a girl and a woman",
    ],
    [
      "Two hearts intertwined",
      "A story between you and me",
      "You and I will walk together",
      "Because in this life, we're more than just two",
      "Give me your hand, and we'll stay together until the end",
      "With the stars, we'll create a garden.",
    ],
  ];

  const COLORS = ["#ff5fa2", "#ff8fc7", "#b48cff", "#7fd8ff", "#6fe3c1", "#ffd166", "#ff9f6e", "#ff7ab8"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const isTouch = window.matchMedia("(hover: none)").matches;

  const $ = (id) => document.getElementById(id);
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[(Math.random() * arr.length) | 0];

  /* ---------- Background slideshow ---------- */

  const slidesEl = $("slides");
  const slides = IMAGES.map((img, i) => {
    const slide = document.createElement("div");
    slide.className = "slide";
    const el = new Image();
    el.alt = "";
    el.decoding = "async";
    el.style.setProperty("--pos", img.pos);
    slide.appendChild(el);
    slidesEl.appendChild(slide);
    return slide;
  });

  // Wallpapers load one step ahead instead of all at once.
  const loadSlide = (i) => {
    const img = slides[i].firstChild;
    if (!img.src) img.src = IMAGES[i].src;
  };

  let current = 0;
  loadSlide(0);
  loadSlide(1);
  slides[0].classList.add("active");
  setInterval(() => {
    if (document.body.classList.contains("letter-open")) return;
    slides[current].classList.remove("active");
    current = (current + 1) % slides.length;
    loadSlide(current);
    loadSlide((current + 1) % slides.length);
    // Restart Ken Burns on the incoming slide.
    const img = slides[current].firstChild;
    img.style.animation = "none";
    void img.offsetWidth;
    img.style.animation = "";
    slides[current].classList.add("active");
  }, 5500);

  /* ---------- Pop-up carousel + poem ---------- */

  const track = $("track");
  const marquee = track.parentElement;
  // Two copies of the strip so the carousel loops seamlessly.
  const cards = [...IMAGES, ...IMAGES].map((img, i) => {
    const el = new Image();
    el.src = img.src;
    el.alt = "";
    el.decoding = "async";
    el.draggable = false;
    el.style.setProperty("--tilt", (i % 2 ? 2.5 : -2.5) + "deg");
    track.appendChild(el);
    return el;
  });

  // Carousel motion: drifts on its own; a tap jumps to the next picture,
  // pressing and holding stops it, dragging scrolls by hand.
  const carousel = {
    offset: 0,
    held: false,
    dragged: false,
    startX: 0,
    lastX: 0,
    downAt: 0,
    jump: null, // { from, to, start }
  };

  const loopWidth = () => cards[IMAGES.length].offsetLeft - cards[0].offsetLeft;
  const driftSpeed = () => (reduceMotion ? 0.15 : window.innerWidth < 640 ? 0.55 : 0.7); // px per 60fps frame

  function wrapOffset() {
    const w = loopWidth();
    if (w > 0) carousel.offset = ((carousel.offset % w) + w) % w;
  }

  function nextCardDelta() {
    const pad = cards[0].offsetLeft;
    for (const card of cards) {
      const left = card.offsetLeft - carousel.offset;
      if (left > pad + 4) return left - pad;
    }
    return 0;
  }

  function stepCarousel(dt) {
    if (carousel.jump) {
      const t = Math.min((performance.now() - carousel.jump.start) / 450, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      carousel.offset = carousel.jump.from + (carousel.jump.to - carousel.jump.from) * ease;
      if (t === 1) carousel.jump = null;
    } else if (!carousel.held) {
      carousel.offset += driftSpeed() * dt;
    }
    wrapOffset();
    track.style.transform = `translate3d(${-carousel.offset}px, 0, 0)`;
  }

  marquee.addEventListener("pointerdown", (e) => {
    carousel.held = true;
    carousel.dragged = false;
    carousel.jump = null;
    carousel.startX = carousel.lastX = e.clientX;
    carousel.downAt = performance.now();
    marquee.setPointerCapture(e.pointerId);
  });

  marquee.addEventListener("pointermove", (e) => {
    if (!carousel.held) return;
    if (Math.abs(e.clientX - carousel.startX) > 8) carousel.dragged = true;
    if (carousel.dragged) carousel.offset -= e.clientX - carousel.lastX;
    carousel.lastX = e.clientX;
  });

  const release = () => {
    if (!carousel.held) return;
    carousel.held = false;
    const quickTap = !carousel.dragged && performance.now() - carousel.downAt < 300;
    if (quickTap) {
      carousel.jump = { from: carousel.offset, to: carousel.offset + nextCardDelta(), start: performance.now() };
    }
  };
  marquee.addEventListener("pointerup", release);
  marquee.addEventListener("pointercancel", release);

  const poemEl = $("poem");
  const lines = [];
  // The video sits between "There's no one like you, my love" and "I kept your name inside my heart".
  const VIDEO_AFTER_STANZA = 5;
  let video = null;

  POEM.forEach((stanza, i) => {
    if (i === VIDEO_AFTER_STANZA + 1) {
      const figure = document.createElement("figure");
      figure.className = "memory";
      video = document.createElement("video");
      video.src = "videos/bubu.mp4";
      video.controls = false;
      video.playsInline = true;
      video.preload = "metadata";
      figure.appendChild(video);
      poemEl.appendChild(figure);
    }
    const p = document.createElement("p");
    p.className = "stanza";
    stanza.forEach((text) => {
      const span = document.createElement("span");
      span.className = "line";
      span.textContent = text;
      p.appendChild(span);
      lines.push(span);
    });
    poemEl.appendChild(p);
  });

  /* ---------- Gift + modal ---------- */

  const gift = $("gift");
  const overlay = $("overlay");
  const closeBtn = $("close");
  const letterScroll = $("letter-scroll");
  const hint = $("hint");

  if (isTouch) $("hint-verb").textContent = "Tap";

  // Lines fade in as they scroll into view; the first screenful is staggered.
  let revealed = 0;
  const lineObserver = new IntersectionObserver((entries) => {
    let batch = 0;
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const delay = (revealed === 0 ? 0.55 : 0) + batch * 0.1;
      entry.target.style.setProperty("--d", delay.toFixed(2) + "s");
      entry.target.classList.add("in");
      lineObserver.unobserve(entry.target);
      batch++;
    });
    revealed += batch;
  }, { root: letterScroll, rootMargin: "0px 0px -8% 0px" });

  function watchLines() {
    revealed = 0;
    lines.forEach((line) => {
      line.classList.remove("in");
      lineObserver.observe(line);
    });
  }

  let opening = false;

  gift.addEventListener("click", () => {
    if (opening) return;
    opening = true;
    gift.classList.add("shake");

    setTimeout(() => {
      gift.classList.remove("shake");
      gift.classList.add("open");
      const r = gift.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height * 0.35, isSmall() ? 90 : 160);
    }, 500);

    setTimeout(openLetter, 1300);
  });

  function openLetter() {
    overlay.hidden = false;
    document.body.classList.add("letter-open");
    letterScroll.scrollTop = 0;
    watchLines();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add("show"));
    });
    closeBtn.focus({ preventScroll: true });
  }

  function closeLetter() {
    if (overlay.hidden) return;
    overlay.classList.remove("show");
    document.body.classList.remove("letter-open");
    if (video) video.pause();
    wishVideo.pause();
    setTimeout(() => {
      overlay.hidden = true;
      gift.classList.remove("open");
      opening = false;
      gift.focus({ preventScroll: true });
    }, 700);
  }

  /* ---------- Wish cake ---------- */

  const cake = $("cake");
  const wishHint = $("wish-hint");
  const wishBurst = $("wish-burst");
  const wishFigure = $("wish-video");
  const wishVideo = wishFigure.querySelector("video");

  cake.addEventListener("click", () => {
    if (cake.classList.contains("blown")) return;

    // Prime playback inside the tap so mobile browsers allow sound later.
    wishVideo.load();
    const primed = wishVideo.play();
    if (primed) primed.then(() => wishVideo.pause()).catch(() => {});

    cake.classList.add("blown");
    cake.disabled = true;
    wishHint.style.opacity = "0";

    setTimeout(() => {
      const emojis = ["💖", "✨", "🎉", "💕", "⭐", "🎈", "💗"];
      for (let i = 0; i < 18; i++) {
        const s = document.createElement("span");
        const angle = (i / 18) * Math.PI * 2 + rand(-0.2, 0.2);
        const dist = rand(80, 160);
        s.textContent = pick(emojis);
        s.style.setProperty("--x", Math.cos(angle) * dist + "px");
        s.style.setProperty("--y", Math.sin(angle) * dist - 40 + "px");
        s.style.setProperty("--r", rand(-60, 60) + "deg");
        s.style.setProperty("--s", rand(16, 28) + "px");
        wishBurst.appendChild(s);
      }
      setTimeout(() => (wishBurst.textContent = ""), 1600);
    }, 450);

    setTimeout(() => cake.classList.add("gone"), 1300);

    setTimeout(() => {
      cake.hidden = true;
      wishHint.textContent = "Your wish is on its way ✨";
      wishHint.style.opacity = "1";
      wishFigure.hidden = false;
      wishFigure.scrollIntoView({ behavior: "smooth", block: "center" });
      wishVideo.currentTime = 0;
      wishVideo.play().catch(() => {
        // Sound was blocked: play muted so it still starts; controls let her unmute.
        wishVideo.muted = true;
        wishVideo.play().catch(() => {});
      });
    }, 2000);
  });

  /* ---------- Video player controls ---------- */

  const ICONS = {
    play: "M8 5.5v13a1 1 0 0 0 1.5.9l10.4-6.5a1 1 0 0 0 0-1.8L9.5 4.6A1 1 0 0 0 8 5.5z",
    pause: "M7 5h3.5v14H7zM13.5 5H17v14h-3.5z",
    sound: "M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z",
    muted: "M3 9v6h4l5 5V4L7 9H3zm13.6 3l2.7-2.7-1.4-1.4-2.7 2.7-2.7-2.7-1.4 1.4 2.7 2.7-2.7 2.7 1.4 1.4 2.7-2.7 2.7 2.7 1.4-1.4z",
    full: "M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z",
    exit: "M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z",
    replay: "M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z",
  };

  const icon = (name) =>
    `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[name]}"/></svg>`;

  const clock = (s) => {
    s = Math.max(0, Math.floor(s || 0));
    return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
  };

  function setupPlayer(video) {
    video.controls = false;
    video.removeAttribute("controls");
    const frame = video.parentElement;
    frame.classList.add("player");

    const big = document.createElement("button");
    big.type = "button";
    big.className = "player-big";
    big.setAttribute("aria-label", "Play");
    big.innerHTML = icon("play");

    const bar = document.createElement("div");
    bar.className = "player-bar";
    bar.innerHTML = `
      <button type="button" class="pb-play" aria-label="Play">${icon("play")}</button>
      <div class="pb-track" role="slider" aria-label="Seek" tabindex="0"><span class="pb-fill"></span><span class="pb-knob"></span></div>
      <span class="pb-time">0:00</span>
      <button type="button" class="pb-sound" aria-label="Mute">${icon("sound")}</button>
      <button type="button" class="pb-full" aria-label="Full screen">${icon("full")}</button>`;

    frame.append(big, bar);
    const playBtn = bar.querySelector(".pb-play");
    const soundBtn = bar.querySelector(".pb-sound");
    const fullBtn = bar.querySelector(".pb-full");
    const trackEl = bar.querySelector(".pb-track");
    const fill = bar.querySelector(".pb-fill");
    const knob = bar.querySelector(".pb-knob");
    const time = bar.querySelector(".pb-time");

    const toggle = () => (video.paused || video.ended ? video.play().catch(() => {}) : video.pause());

    let idle;
    const wake = () => {
      frame.classList.add("awake");
      clearTimeout(idle);
      idle = setTimeout(() => !video.paused && frame.classList.remove("awake"), 2500);
    };
    const sleep = () => {
      clearTimeout(idle);
      frame.classList.remove("awake");
    };

    // States: before play only the big play icon shows; while playing and
    // after the end nothing shows until a tap; after the end that tap
    // reveals a replay icon.
    let wasPlaying = false;
    const sync = () => {
      const playing = !video.paused && !video.ended;
      frame.classList.toggle("playing", playing);
      frame.classList.toggle("ended", video.ended);
      big.innerHTML = icon(video.ended ? "replay" : "play");
      big.setAttribute("aria-label", video.ended ? "Replay" : "Play");
      playBtn.innerHTML = icon(playing ? "pause" : video.ended ? "replay" : "play");
      playBtn.setAttribute("aria-label", playing ? "Pause" : video.ended ? "Replay" : "Play");
      soundBtn.innerHTML = icon(video.muted ? "muted" : "sound");
      soundBtn.setAttribute("aria-label", video.muted ? "Unmute" : "Mute");
      if ((playing && !wasPlaying) || video.ended) sleep();
      wasPlaying = playing;
    };

    const progress = () => {
      const p = video.duration ? video.currentTime / video.duration : 0;
      fill.style.width = p * 100 + "%";
      knob.style.left = p * 100 + "%";
      time.textContent = clock(video.currentTime) + " / " + clock(video.duration);
    };

    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("ended", sync);
    video.addEventListener("volumechange", sync);
    video.addEventListener("timeupdate", progress);
    video.addEventListener("loadedmetadata", progress);

    big.addEventListener("click", toggle);
    playBtn.addEventListener("click", toggle);
    video.addEventListener("click", () => {
      const awake = frame.classList.contains("awake");
      if (video.ended) awake ? toggle() : wake();
      else if (video.paused || awake) toggle();
      else wake();
    });
    soundBtn.addEventListener("click", () => (video.muted = !video.muted));
    // Full screen on the frame, not the <video>: browsers force landscape for
    // a fullscreen video element, while a fullscreen container follows how
    // the phone is held. Where element fullscreen is missing (iPhone), the
    // frame is lifted to <body> and pinned over the page instead.
    let placeholder = null;
    const isFull = () => frame.classList.contains("is-full");

    const setFullUI = (on) => {
      frame.classList.toggle("is-full", on);
      fullBtn.innerHTML = icon(on ? "exit" : "full");
      fullBtn.setAttribute("aria-label", on ? "Exit full screen" : "Full screen");
      if (!on) frame.scrollIntoView({ block: "center" });
    };

    const enterFull = () => {
      if (frame.requestFullscreen) {
        frame.requestFullscreen({ navigationUI: "hide" }).catch(enterPseudo);
      } else if (frame.webkitRequestFullscreen) {
        frame.webkitRequestFullscreen();
      } else {
        enterPseudo();
      }
    };

    function enterPseudo() {
      placeholder = document.createElement("div");
      placeholder.style.height = frame.offsetHeight + "px";
      frame.replaceWith(placeholder);
      document.body.appendChild(frame);
      frame.classList.add("pseudo-full");
      setFullUI(true);
    }

    const exitFull = () => {
      if (placeholder) {
        frame.classList.remove("pseudo-full");
        placeholder.replaceWith(frame);
        placeholder = null;
        setFullUI(false);
      } else if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitFullscreenElement) {
        document.webkitExitFullscreen();
      }
    };
    frame.exitFull = () => isFull() && exitFull();

    const onFullChange = () => {
      const el = document.fullscreenElement || document.webkitFullscreenElement;
      if (!placeholder) setFullUI(el === frame);
    };
    document.addEventListener("fullscreenchange", onFullChange);
    document.addEventListener("webkitfullscreenchange", onFullChange);

    fullBtn.addEventListener("click", () => (isFull() ? exitFull() : enterFull()));
    frame.addEventListener("pointermove", (e) => e.pointerType === "mouse" && wake());
    bar.addEventListener("pointerdown", wake);

    const seek = (e) => {
      const r = trackEl.getBoundingClientRect();
      const p = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
      if (video.duration) video.currentTime = p * video.duration;
      progress();
    };
    trackEl.addEventListener("pointerdown", (e) => {
      trackEl.setPointerCapture(e.pointerId);
      seek(e);
      const move = (ev) => seek(ev);
      const up = () => {
        trackEl.removeEventListener("pointermove", move);
        trackEl.removeEventListener("pointerup", up);
      };
      trackEl.addEventListener("pointermove", move);
      trackEl.addEventListener("pointerup", up);
    });
    trackEl.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") video.currentTime += 2;
      if (e.key === "ArrowLeft") video.currentTime -= 2;
    });

    sync();
    progress();
  }

  setupPlayer(video);
  setupPlayer(wishVideo);

  // When the wish video ends it dissolves, the letter steps aside and the
  // finale picture fills the pop-up.
  const finale = $("finale");
  const backBtn = $("back");
  const inFinale = () => overlay.classList.contains("finale-on");

  wishVideo.addEventListener("ended", () => {
    if (wishFigure.classList.contains("vanish")) return;
    if (wishFigure.exitFull) wishFigure.exitFull();
    wishFigure.classList.add("vanish");
    setTimeout(() => {
      overlay.classList.add("finale-on");
      finale.hidden = false;
      backBtn.focus({ preventScroll: true });
    }, 1500);
  });

  // Start the whole surprise over from the gift.
  function restart() {
    overlay.classList.add("resetting");
    setTimeout(() => window.location.reload(), 550);
  }

  backBtn.addEventListener("click", restart);
  closeBtn.addEventListener("click", closeLetter);
  overlay.addEventListener("click", (e) => {
    if (!inFinale() && !e.target.closest(".letter, .marquee")) closeLetter();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") inFinale() ? restart() : closeLetter();
    // Keep keyboard focus inside the dialog.
    if (e.key === "Tab" && !overlay.hidden) {
      const focusables = (inFinale()
        ? [backBtn]
        : [closeBtn, letterScroll, ...letterScroll.querySelectorAll("button, video")]
      ).filter((el) => !el.disabled && !el.closest("[hidden]"));
      const i = focusables.indexOf(document.activeElement);
      const next = e.shiftKey ? i - 1 : i + 1;
      e.preventDefault();
      focusables[(next + focusables.length) % focusables.length].focus();
    }
  });

  /* ---------- Particles: balloons, hearts, sparkles, confetti ---------- */

  const canvas = $("fx");
  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, DPR = 1;

  const isSmall = () => W < 640;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2);
    DPR = dpr;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function hexToRgb(hex) {
    const v = parseInt(hex.slice(1), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function shade(hex, amt) {
    const [r, g, b] = hexToRgb(hex);
    const f = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }

  // Pre-rendered sprites: gradients and glows are drawn once, then blitted each frame.
  const sprites = new Map();

  function sprite(key, w, h, paint) {
    let s = sprites.get(key);
    if (!s) {
      s = document.createElement("canvas");
      s.width = Math.ceil(w * DPR);
      s.height = Math.ceil(h * DPR);
      const c = s.getContext("2d");
      c.scale(DPR, DPR);
      paint(c);
      sprites.set(key, s);
    }
    return s;
  }

  const BALLOON_R = 40;

  function balloonSprite(color) {
    const r = BALLOON_R;
    return sprite("b" + color, r * 2, r * 2.3, (c) => {
      const cx = r, y = r;
      const g = c.createRadialGradient(cx - r * 0.3, y - r * 0.35, r * 0.05, cx, y, r * 1.1);
      g.addColorStop(0, shade(color, 0.45));
      g.addColorStop(0.55, color);
      g.addColorStop(1, shade(color, -0.2));
      c.fillStyle = g;
      c.beginPath();
      c.ellipse(cx, y, r * 0.86, r, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = shade(color, -0.2);
      c.beginPath();
      c.moveTo(cx, y + r * 0.96);
      c.lineTo(cx - r * 0.13, y + r * 1.17);
      c.lineTo(cx + r * 0.13, y + r * 1.17);
      c.closePath();
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.beginPath();
      c.ellipse(cx - r * 0.34, y - r * 0.42, r * 0.13, r * 0.25, -0.5, 0, Math.PI * 2);
      c.fill();
    });
  }

  const HEART_S = 24, HEART_PAD = 10;

  function heartSprite(color) {
    const size = HEART_S + HEART_PAD * 2;
    return sprite("h" + color, size, size, (c) => {
      c.translate(size / 2, size / 2);
      heartPath(HEART_S, c);
      c.fillStyle = color;
      c.shadowColor = "rgba(255,95,162,0.45)";
      c.shadowBlur = 8;
      c.fill();
    });
  }

  function heartPath(s, c = ctx) {
    // Heart centred on the origin, s = width.
    const h = s * 0.5;
    c.beginPath();
    c.moveTo(0, -h * 0.4);
    c.bezierCurveTo(0, -h, -h, -h, -h, -h * 0.4);
    c.bezierCurveTo(-h, h * 0.2, 0, h * 0.6, 0, h);
    c.bezierCurveTo(0, h * 0.6, h, h * 0.2, h, -h * 0.4);
    c.bezierCurveTo(h, -h, 0, -h, 0, -h * 0.4);
    c.closePath();
  }

  class Balloon {
    constructor() { this.reset(true); }

    reset(initial) {
      this.r = rand(20, 36) * (isSmall() ? 0.8 : 1);
      this.x = rand(this.r, W - this.r);
      this.y = initial ? rand(H * 0.15, H + 300) : H + this.r * 2 + rand(0, 250);
      this.vy = rand(0.35, 0.85);
      this.sway = rand(6, 18);
      this.phase = rand(0, Math.PI * 2);
      this.color = pick(COLORS);
      this.img = balloonSprite(this.color);
      this.cx = this.x;
    }

    update(dt) {
      this.y -= this.vy * dt;
      this.phase += 0.015 * dt;
      this.cx = this.x + Math.sin(this.phase) * this.sway;
      if (this.y < -this.r * 4) this.reset(false);
    }

    draw() {
      const { cx, y, r, phase } = this;

      ctx.strokeStyle = "rgba(255,255,255,0.8)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(cx, y + r * 1.15);
      ctx.bezierCurveTo(
        cx + Math.sin(phase * 1.3) * 8, y + r * 1.8,
        cx - Math.sin(phase) * 8, y + r * 2.4,
        cx + Math.sin(phase * 0.7) * 5, y + r * 3.2
      );
      ctx.stroke();

      const k = r / BALLOON_R;
      ctx.drawImage(this.img, cx - r, y - r, BALLOON_R * 2 * k, BALLOON_R * 2.3 * k);
    }

    hit(px, py) {
      const dx = (px - this.cx) / (this.r * 0.9);
      const dy = (py - this.y) / this.r;
      return dx * dx + dy * dy <= 1.1;
    }
  }

  class Heart {
    constructor() { this.reset(true); }

    reset(initial) {
      this.s = rand(10, 22) * (isSmall() ? 0.85 : 1);
      this.x = rand(0, W);
      this.y = initial ? rand(0, H) : H + 30;
      this.vy = rand(0.25, 0.7);
      this.sway = rand(10, 30);
      this.phase = rand(0, Math.PI * 2);
      this.rot = rand(-0.4, 0.4);
      this.alpha = rand(0.55, 0.95);
      this.color = pick(["#ff5fa2", "#ff7ab8", "#ff8fc7", "#ff4f8b", "#b48cff", "#ffffff"]);
      this.img = heartSprite(this.color);
    }

    update(dt) {
      this.y -= this.vy * dt;
      this.phase += 0.02 * dt;
      if (this.y < -30) this.reset(false);
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.translate(this.x + Math.sin(this.phase) * this.sway, this.y);
      ctx.rotate(this.rot + Math.sin(this.phase * 0.8) * 0.25);
      const d = (this.s / HEART_S) * (HEART_S + HEART_PAD * 2);
      ctx.drawImage(this.img, -d / 2, -d / 2, d, d);
      ctx.restore();
    }
  }

  class Sparkle {
    constructor() {
      this.x = rand(0, W);
      this.y = rand(0, H);
      this.s = rand(3, 7);
      this.phase = rand(0, Math.PI * 2);
      this.speed = rand(0.03, 0.07);
      this.color = pick(["#ffffff", "#fff3b0", "#ffd6ec"]);
    }

    update(dt) {
      this.phase += this.speed * dt;
    }

    draw() {
      const a = (Math.sin(this.phase) + 1) / 2;
      if (a < 0.05) return;
      const s = this.s * (0.6 + a * 0.6);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(this.x, this.y);
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.moveTo(0, -s * 2);
      ctx.quadraticCurveTo(0, 0, s * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, s * 2);
      ctx.quadraticCurveTo(0, 0, -s * 2, 0);
      ctx.quadraticCurveTo(0, 0, 0, -s * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Confetti {
    constructor(x, y, color) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(3, 11);
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - rand(3, 7);
      this.color = color || pick(COLORS);
      this.size = rand(6, 11);
      this.rot = rand(0, Math.PI * 2);
      this.vr = rand(-0.25, 0.25);
      this.heart = Math.random() < 0.3;
      this.life = 1;
      this.decay = rand(0.006, 0.012);
    }

    update(dt) {
      this.vx *= Math.pow(0.985, dt);
      this.vy = this.vy * Math.pow(0.985, dt) + 0.18 * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.rot += this.vr * dt;
      this.life -= this.decay * dt;
    }

    draw() {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, this.life * 1.5));
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rot);
      ctx.fillStyle = this.color;
      if (this.heart) {
        heartPath(this.size * 1.4);
        ctx.fill();
      } else {
        ctx.scale(1, Math.cos(this.rot * 2));
        ctx.fillRect(-this.size / 2, -this.size / 4, this.size, this.size / 2);
      }
      ctx.restore();
    }

    get dead() {
      return this.life <= 0 || this.y > H + 40;
    }
  }

  let balloons = [], hearts = [], sparkles = [], confetti = [];

  function populate() {
    const small = isSmall();
    const scale = reduceMotion ? 0.4 : 1;
    balloons = Array.from({ length: Math.round((small ? 6 : 12) * scale) }, () => new Balloon());
    hearts = Array.from({ length: Math.round((small ? 10 : 22) * scale) }, () => new Heart());
    sparkles = Array.from({ length: Math.round((small ? 14 : 34) * scale) }, () => new Sparkle());
  }

  function burst(x, y, count, color) {
    for (let i = 0; i < count; i++) confetti.push(new Confetti(x, y, color));
  }

  // Tap a balloon to pop it.
  document.addEventListener("pointerdown", (e) => {
    if (!overlay.hidden || e.target.closest("button")) return;
    for (let i = balloons.length - 1; i >= 0; i--) {
      const b = balloons[i];
      if (b.hit(e.clientX, e.clientY)) {
        burst(b.cx, b.y, 26, b.color);
        b.reset(false);
        break;
      }
    }
  });

  let last = performance.now();
  function frame(now) {
    const dt = Math.min((now - last) / 16.667, 3);
    last = now;
    requestAnimationFrame(frame);
    if (!overlay.hidden) stepCarousel(dt);
    // The canvas is faded out behind the letter; skip the work.
    if (document.body.classList.contains("letter-open") && !confetti.length) return;
    ctx.clearRect(0, 0, W, H);

    for (const s of sparkles) { s.update(dt); s.draw(); }
    for (const h of hearts) { h.update(dt); h.draw(); }
    for (const b of balloons) { b.update(dt); b.draw(); }
    for (const c of confetti) { c.update(dt); c.draw(); }
    confetti = confetti.filter((c) => !c.dead);
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const wasSmall = isSmall();
      const oldDpr = DPR;
      resize();
      if (DPR !== oldDpr) sprites.clear();
      if (wasSmall !== isSmall() || DPR !== oldDpr) populate();
      else sparkles = sparkles.map(() => new Sparkle());
    }, 150);
  });

  resize();
  populate();
  requestAnimationFrame(frame);

  // Welcome confetti from both top corners.
  if (!reduceMotion) {
    setTimeout(() => {
      burst(W * 0.1, H * 0.2, isSmall() ? 40 : 70);
      burst(W * 0.9, H * 0.2, isSmall() ? 40 : 70);
    }, 700);
  }
})();
