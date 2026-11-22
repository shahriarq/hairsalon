/* Style86 — scroll film, chapters, tabs, hours, language. No dependencies. */
(() => {
  "use strict";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let lang = "it";
  try { if (localStorage.getItem("s86-lang") === "en") lang = "en"; } catch (_) {}
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  /* ───────── Scroll film ─────────
     Each shot is a still photo moved by a virtual camera. `from`/`to` are
     camera states: scale (1 = cover fit), x/y pan as a fraction of the
     image's overflow (-1..1). Shots overlap by `blend` for crossfades.
     Replace the media files (same names) with the salon's real photos. */
  const SHOTS = [
    { src: "media/hero-1.jpg", bg: "media/hero-1-bg.jpg", cap: "Via Luigi Ornato 59",
      from: { s: 1.25, x: -0.9, y: 0 }, to: { s: 1.9, x: -1, y: 0.3 } },   // walk up to the sign (x<0 pans right, y>0 pans up)
    { src: "media/hero-2.jpg", bg: "media/hero-2-bg.jpg", cap: { it: "Le postazioni", en: "The stations" },
      from: { s: 1.4, x: 0.7, y: 0.15 }, to: { s: 1.05, x: -0.2, y: 0 } },
    { src: "media/hero-3.jpg", bg: "media/hero-3-bg.jpg", cap: { it: "Il lavaggio", en: "The wash bar" },
      from: { s: 1.08, x: -0.4, y: 0 },  to: { s: 1.45, x: 0.35, y: 0.25 } },
    { src: "media/hero-4.jpg", bg: "media/hero-4-bg.jpg", cap: { it: "Lo specchio", en: "The mirror" },
      from: { s: 1.5, x: 0.5, y: -0.1 }, to: { s: 1.08, x: 0.25, y: 0.05 } },
    { src: "media/hero-5.jpg", bg: "media/hero-5-bg.jpg", cap: { it: "L'accoglienza", en: "Reception" },
      from: { s: 1.35, x: 0.7, y: 0.25 }, to: { s: 1.0, x: 0, y: 0 } },
  ];
  const BLEND = 0.35; // fraction of a shot's span spent crossfading into the next

  const film = $("#film");
  const canvas = $("#filmCanvas");
  const backdrop = $("#filmBackdrop");
  const bctx = backdrop && backdrop.getContext ? backdrop.getContext("2d", { alpha: false }) : null;
  const capEl = $("#filmCap");
  let capIndex = -1;
  const bar = $("#filmBar");
  const chapters = $$(".chapter", film);
  const ctx = canvas && canvas.getContext ? canvas.getContext("2d", { alpha: false }) : null;

  if (!ctx) film.classList.add("no-canvas");

  const load = (src) => {
    const img = new Image();
    img.decoding = "async";
    img.src = src;
    img.addEventListener("load", () => { if (!ctx || reduceMotion) return; needsDraw = true; kick(); });
    return img;
  };
  const images = SHOTS.map((shot) => load(shot.src));
  const backs = SHOTS.map((shot) => load(shot.bg));

  let target = 0, current = 0, needsDraw = true, running = false, visible = true;
  let cw = 0, ch = 0, dpr = 1, bw = 0, bh = 0;

  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    cw = Math.round(r.width * dpr);
    ch = Math.round(r.height * dpr);
    canvas.width = cw;
    canvas.height = ch;
    if (bctx) {
      bw = Math.round(window.innerWidth / 4);   // blurred source, so a small buffer is enough
      bh = Math.round(window.innerHeight / 4);
      backdrop.width = bw;
      backdrop.height = bh;
    }
    needsDraw = true;
  }

  function drawShot(i, local, alpha) {
    const img = images[i];
    if (!img.complete || !img.naturalWidth) return false;
    const { from, to } = SHOTS[i];
    const t = ease(clamp(local));
    const s = lerp(from.s, to.s, t);
    const cover = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * s;
    const w = img.naturalWidth * cover;
    const h = img.naturalHeight * cover;
    const ox = (w - cw) / 2, oy = (h - ch) / 2;
    const x = -ox + lerp(from.x, to.x, t) * ox;
    const y = -oy + lerp(from.y, to.y, t) * oy;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, x, y, w, h);
    return true;
  }

  function drawBack(i, alpha) {
    const img = backs[i];
    if (!bctx || !img.complete || !img.naturalWidth) return;
    const k = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * 1.1;
    const w = img.naturalWidth * k, h = img.naturalHeight * k;
    bctx.globalAlpha = alpha;
    bctx.drawImage(img, (bw - w) / 2, (bh - h) / 2, w, h);
  }

  function caption(i) {
    if (!capEl || i === capIndex) return;
    capIndex = i;
    const c = SHOTS[i].cap;
    capEl.textContent = typeof c === "string" ? c : c[lang] || c.it;
  }

  function render(p) {
    const n = SHOTS.length;
    const span = 1 / n;
    const pos = clamp(p, 0, 0.9999) / span;    // 0..n
    const i = Math.floor(pos);
    const local = pos - i;                       // 0..1 within shot i
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0e0c0a";
    ctx.fillRect(0, 0, cw, ch);
    // keep the camera moving through the blend so motion never stalls
    const stretch = 1 + BLEND;
    drawShot(i, local / stretch + (i > 0 ? BLEND / stretch : 0), 1);
    const blendStart = 1 - BLEND;
    if (bctx) { bctx.globalAlpha = 1; bctx.fillStyle = "#0e0c0a"; bctx.fillRect(0, 0, bw, bh); drawBack(i, 1); }
    let shown = i;
    if (i + 1 < n && local > blendStart) {
      const a = (local - blendStart) / BLEND;
      drawShot(i + 1, ((local - blendStart) / stretch), ease(a));
      drawBack(i + 1, ease(a));
      if (a > 0.5) shown = i + 1;
    }
    ctx.globalAlpha = 1;
    if (bctx) bctx.globalAlpha = 1;
    caption(shown);
  }

  function progress() {
    const r = film.getBoundingClientRect();
    const total = r.height - window.innerHeight;
    return total > 0 ? clamp(-r.top / total) : 0;
  }

  function updateChapters(p) {
    for (const c of chapters) {
      const on = p >= parseFloat(c.dataset.from) && p < parseFloat(c.dataset.to);
      c.classList.toggle("is-active", on);
      c.toggleAttribute("inert", !on);
    }
    if (bar) bar.style.transform = `scaleX(${p})`;
  }

  function tick() {
    current = lerp(current, target, 0.12);
    if (Math.abs(target - current) < 0.0004) current = target;
    if (ctx && visible) render(current);
    updateChapters(current);
    if (current !== target || needsDraw) {
      needsDraw = false;
      requestAnimationFrame(tick);
    } else {
      running = false;
    }
  }
  function kick() {
    target = progress();
    if (!running) { running = true; requestAnimationFrame(tick); }
  }

  if (reduceMotion) {
    chapters.forEach((c) => { c.classList.add("is-active"); c.removeAttribute("inert"); });
  } else if (ctx) {
    resize();
    window.addEventListener("resize", () => { resize(); kick(); });
    window.addEventListener("scroll", kick, { passive: true });
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(film);
    images[0].addEventListener("load", kick);
    kick();
  } else {
    window.addEventListener("scroll", () => updateChapters(progress()), { passive: true });
    updateChapters(0);
  }

  /* ───────── Nav + phone dock ───────── */
  const nav = $("#nav"), dock = $("#dock");
  function onScroll() {
    const y = window.scrollY;
    nav.classList.toggle("is-solid", y > window.innerHeight * 0.6);
    if (dock) dock.classList.toggle("is-visible", y > film.offsetTop + film.offsetHeight - window.innerHeight * 0.6);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ───────── Marquee: duplicate once for a seamless loop ───────── */
  const track = $(".strip__track");
  if (track && !reduceMotion) {
    [...track.children].forEach((n) => {
      const c = n.cloneNode(true);
      c.setAttribute("aria-hidden", "true");
      track.appendChild(c);
    });
  }

  /* ───────── Service tabs (WAI-ARIA tabs pattern) ───────── */
  const tabs = $$(".tab");
  function select(tab, focus) {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
      $("#" + t.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) tab.focus();
  }
  tabs.forEach((t, i) => {
    t.addEventListener("click", () => select(t));
    t.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
      if (d) { e.preventDefault(); select(tabs[(i + d + tabs.length) % tabs.length], true); }
    });
  });

  /* ───────── Work & salon rail: drag, arrows, progress ─────────
     Touch uses native scrolling; mouse and pen get click-and-drag with a
     little momentum. */
  const rail = $("#rail");
  if (rail) {
    const prev = $("#railPrev"), next = $("#railNext"), railBar = $("#railBar");
    const cards = $$(".rail__item", rail);
    const step = () => (cards[0] ? cards[0].getBoundingClientRect().width + 18 : 320);
    const maxScroll = () => rail.scrollWidth - rail.clientWidth;

    function sync() {
      const m = maxScroll();
      const r = m > 0 ? rail.scrollLeft / m : 0;
      if (railBar) railBar.style.transform = `scaleX(${Math.max(0.04, r)})`;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= m - 2;
    }
    rail.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    prev.addEventListener("click", () => rail.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }));
    next.addEventListener("click", () => rail.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }));
    rail.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight") { e.preventDefault(); next.click(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); prev.click(); }
    });
    // Trackpads send small sideways deltas inside vertical swipes; the browser
    // then latches the whole gesture to the rail and the page stops scrolling.
    // A mostly-vertical gesture over the rail is handed straight to the page.
    rail.addEventListener("wheel", (e) => {
      if (e.ctrlKey || e.deltaX === 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      window.scrollBy(0, e.deltaY * unit);
    }, { passive: false });

    let down = false, moved = false, startX = 0, startLeft = 0, lastX = 0, lastT = 0, vel = 0, raf = 0;
    const settle = () => rail.classList.toggle("is-dragging", false); // snapping resumes
    function glide() {
      vel *= 0.94;
      rail.scrollLeft -= vel;
      if (Math.abs(vel) > 0.4 && rail.scrollLeft > 0 && rail.scrollLeft < maxScroll()) raf = requestAnimationFrame(glide);
      else settle();
    }
    rail.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch" || e.button !== 0) return;
      cancelAnimationFrame(raf);
      down = true; moved = false;
      startX = lastX = e.clientX; startLeft = rail.scrollLeft; lastT = performance.now(); vel = 0;
      rail.setPointerCapture(e.pointerId);
    });
    rail.addEventListener("pointermove", (e) => {
      if (!down) return;
      const dx = e.clientX - startX;
      if (!moved && Math.abs(dx) > 4) { moved = true; rail.classList.add("is-dragging"); }
      if (!moved) return;
      rail.scrollLeft = startLeft - dx;
      const t = performance.now();
      vel = (e.clientX - lastX) * (16 / Math.max(1, t - lastT));
      lastX = e.clientX; lastT = t;
    });
    const end = (e) => {
      if (!down) return;
      down = false;
      if (rail.hasPointerCapture(e.pointerId)) rail.releasePointerCapture(e.pointerId);
      if (!moved) return;
      if (reduceMotion || Math.abs(vel) < 1) settle(); else raf = requestAnimationFrame(glide);
    };
    rail.addEventListener("pointerup", end);
    rail.addEventListener("pointercancel", end);
    rail.addEventListener("click", (e) => { if (moved) { e.preventDefault(); e.stopPropagation(); } }, true);
    sync();
  }

  /* ───────── Hours: mark today ───────── */
  const today = new Date().getDay();
  const todayRow = $(`.hours tr[data-day="${today}"]`);
  if (todayRow) todayRow.classList.add("is-today");

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();

  /* ───────── Language (IT default, EN) ───────── */
  const EN = {
    skip: "Skip to content",
    "nav.services": "Services", "nav.studio": "The studio", "nav.salon": "The salon", "nav.visit": "Hours",
    "cta.book": "Book", "cta.bookOnline": "Book online", "cta.prices": "See prices", "cta.reserve": "Book your chair", "cta.call": "Call",
    "hero.eyebrow": "Hair & Barber · Milan Niguarda",
    "hero.lede": "Cuts, beards and colour done calmly, precisely, by experienced hands.",
    "hero.scroll": "Scroll",
    "ch1.k": "Barber", "ch1.t": "Clean fades.<br>Clipper-sharp beards.", "ch1.p": "Every cut starts from the shape of your face and ends with a crisp line.",
    "ch2.k": "Colour", "ch2.t": "Ammonia-free<br>colour.", "ch2.p": "Highlights, balayage and treatments with Olaplex and Redken, so hair stays healthy.",
    "ch3.k": "Clients", "ch3.t": "Over <span class=\"num\">460</span> reviews<br>on Treatwell.",
    "strip.1": "Ammonia-free colour", "strip.2": "Clipper beard trims", "strip.3": "Highlights", "strip.4": "Men · Women",
    "svc.eyebrow": "Price list", "svc.title": "Services and prices",
    "svc.sub": "Indicative prices. The always-current menu and live availability are on Treatwell.",
    "svc.tab1": "Men", "svc.tab2": "Women", "svc.tab3": "Colour & care", "svc.cta": "Full menu and booking",
    "s.taglioUomo": "Men's cut", "s.fade": "Skin fade", "s.taglioBarba": "Cut + beard", "s.barba": "Clipper beard trim",
    "s.ritoccoUomo": "Men's colour touch-up", "s.piega": "Wash and blow-dry", "s.taglioDonna": "Cut, wash and blow-dry",
    "s.permanente": "Perm", "s.acconciatura": "Event styling", "s.colore": "Ammonia-free colour",
    "s.schiariture": "Highlights / balayage", "s.olaplex": "Olaplex treatment", "s.botox": "Hair botox",
    "studio.eyebrow": "The studio", "studio.title": "A neighbourhood salon<br>with city-centre standards.",
    "studio.p1": "Style86 is in Niguarda, on via Luigi Ornato. Men and women come in for a quick cut or a full colour change, and get the same attention. The motto is written on the sign:",
    "studio.p2": "Sami and his team work with professional Olaplex and Redken products and ammonia-free colour. Clients come back for the precise beard line, the clean space and the honest price.",
    "facts.rating": "average rating on Treatwell", "facts.reviews": "verified reviews", "facts.days": "days open each week",
    "salon.eyebrow": "Work & salon", "salon.title": "From the Style86 chair", "salon.ig": "More on Instagram", "salon.divider": "The salon",
    "salon.w1": "Balayage and waves", "salon.w2": "Soft waves", "salon.w3": "Blonde ombré", "salon.w4": "Glass-straight", "salon.w5": "Highlights",
    "salon.c1": "The entrance", "salon.c2": "The stations", "salon.c3": "The wash bar", "salon.c4": "The mirror", "salon.c5": "Reception",
    "rev.eyebrow": "Reviews", "rev.meta": "Average across 460+ verified Treatwell reviews", "rev.read": "Read the reviews",
    "rev.t1": "Careful cuts and beards", "rev.p1": "The most common theme: precise lines and clean fades.",
    "rev.t2": "Clean and welcoming", "rev.p2": "Clients often mention how tidy the salon is and how they are greeted.",
    "rev.t3": "Friendly staff", "rev.p3": "Sami is named in many reviews for going out of his way.",
    "rev.t4": "Fair prices", "rev.p4": "Careful work at neighbourhood prices, not city-centre ones.",
    "visit.eyebrow": "Visit us", "visit.title": "Hours and address", "visit.map": "Open in Maps",
    "d.1": "Monday", "d.2": "Tuesday", "d.3": "Wednesday", "d.4": "Thursday", "d.5": "Friday", "d.6": "Saturday", "d.0": "Sunday", "d.closed": "Closed",
    "final.title": "Your next chair<br><em>is free.</em>", "final.p": "Pick a service and a time online in under a minute. Pay at the salon.",
  };
  const IT = {};
  $$("[data-i18n]").forEach((el) => { IT[el.dataset.i18n] = el.textContent; });
  $$("[data-i18n-html]").forEach((el) => { IT[el.dataset.i18nHtml] = el.innerHTML; });

  /* ───────── Back to top ───────── */
  const toTop = $("#toTop");
  if (toTop) {
    // appear once the hero film is over, so it never covers the film's progress bar
    const showTop = () => toTop.classList.toggle("is-visible", window.scrollY > film.offsetTop + film.offsetHeight - window.innerHeight * 0.5);
    window.addEventListener("scroll", showTop, { passive: true });
    showTop();
    toTop.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
      const skip = $(".wordmark");
      if (skip) skip.focus({ preventScroll: true });
    });
  }

  const langBtn = $("#lang");

  function applyLang() {
    const dict = lang === "en" ? EN : IT;
    $$("[data-i18n]").forEach((el) => { const v = dict[el.dataset.i18n]; if (v != null) el.textContent = v; });
    $$("[data-i18n-html]").forEach((el) => { const v = dict[el.dataset.i18nHtml]; if (v != null) el.innerHTML = v; });
    document.documentElement.lang = lang;
    $$("[data-l]", langBtn).forEach((s) => s.classList.toggle("is-on", s.dataset.l === lang));
    langBtn.setAttribute("aria-label", lang === "en" ? "Passa all'italiano" : "Switch to English");
    if (toTop) toTop.setAttribute("aria-label", lang === "en" ? "Back to top" : "Torna all'inizio");
    capIndex = -1;
    if (ctx && !reduceMotion) render(current);
    if (todayRow) todayRow.querySelector("th").dataset.today = lang === "en" ? "Today" : "Oggi";
  }
  langBtn.addEventListener("click", () => {
    lang = lang === "en" ? "it" : "en";
    try { localStorage.setItem("s86-lang", lang); } catch (_) {}
    applyLang();
  });
  applyLang();
})();
