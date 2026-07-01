/* ============================================================
   Infinite — motion layer
   • Reveals (lines / chars / blocks) run on IntersectionObserver
     + CSS transitions so content is never trapped hidden.
   • GSAP powers the interaction effects from the reference:
     scramble-on-view, shuffle-on-hover, footer arrow draw
     (DrawSVG), elastic overscroll "rebounce", floating balls.
   ============================================================ */
(function () {
  'use strict';
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGSAP = !!window.gsap;

  if (hasGSAP) {
    try {
      gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, DrawSVGPlugin, CustomEase);
      CustomEase.create('out-soft', '0.22,0.61,0.36,1');
    } catch (e) { /* plugin missing — effects degrade, reveals still run */ }
  }

  /* ---------- IntersectionObserver: add .in when in view ---------- */
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });

  /* ---------- Split a heading into clip-masked lines ---------- */
  function splitLines(el) {
    const tokens = [];
    Array.from(el.childNodes).forEach((n) => {
      if (n.nodeType === 3) n.textContent.split(/(\s+)/).forEach((w) => { if (w.trim().length) tokens.push({ t: 'text', v: w }); });
      else if (n.nodeName === 'BR') tokens.push({ t: 'break' });
      else tokens.push({ t: 'node', v: n });
    });
    el.textContent = '';
    const measured = [];
    tokens.forEach((tk) => {
      if (tk.t === 'break') { measured.push({ br: true }); return; }
      const s = document.createElement('span');
      s.style.display = 'inline-block';
      if (tk.t === 'text') s.textContent = tk.v; else s.appendChild(tk.v);
      el.appendChild(s);
      measured.push({ el: s });
    });
    const lines = [];
    let cur = [], lastTop = null;
    measured.forEach((w) => {
      if (w.br) { if (cur.length) lines.push(cur); cur = []; lastTop = null; return; }
      const top = w.el.offsetTop;
      if (lastTop === null) lastTop = top;
      if (top - lastTop > 6 && cur.length) { lines.push(cur); cur = []; }
      lastTop = top;
      cur.push(w.el);
    });
    if (cur.length) lines.push(cur);

    el.textContent = '';
    lines.forEach((line, li) => {
      const wrap = document.createElement('span'); wrap.className = 'line';
      const inner = document.createElement('span'); inner.className = 'line__in';
      inner.style.transitionDelay = (li * 0.08) + 's';
      line.forEach((sp, i) => {
        sp.style.display = '';
        inner.appendChild(sp);
        if (i < line.length - 1) inner.appendChild(document.createTextNode(' '));
      });
      wrap.appendChild(inner);
      el.appendChild(wrap);
    });
  }

  /* ---------- Split a label into per-char stagger spans ---------- */
  function splitChars(el) {
    const text = el.textContent;
    el.textContent = '';
    [...text].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.transitionDelay = (i * 0.022) + 's';
      s.textContent = ch;
      el.appendChild(s);
    });
  }

  /* ---------- Build reveals (after fonts so line wraps are correct) ---------- */
  function buildReveals() {
    try {
      $$('[data-reveal-lines]').forEach((el) => { splitLines(el); io.observe(el); });
      $$('[data-stagger]').forEach((el) => { splitChars(el); io.observe(el); });
      $$('[data-hero-reveal]').forEach((el) => io.observe(el));
      $$('.reveal').forEach((el) => io.observe(el));
    } catch (e) {
      // never trap content — reveal everything
      document.documentElement.classList.add('no-gsap');
      $$('.reveal').forEach((el) => el.classList.add('in'));
    }
  }

  /* ---------- GSAP: scramble-in on view ---------- */
  function initScrambleIn() {
    if (!hasGSAP || reduce) return;
    $$('[data-scramble]').forEach((el) => {
      const original = el.textContent;
      const obs = new IntersectionObserver((es) => {
        es.forEach((e) => {
          if (e.isIntersecting) {
            gsap.to(el, { duration: 0.9, ease: 'none', scrambleText: { text: original, chars: 'upperCase', speed: 0.55, revealDelay: 0.1 } });
            obs.unobserve(el);
          }
        });
      }, { threshold: 0.6 });
      obs.observe(el);
    });
  }

  /* ---------- GSAP: shuffle text on hover ---------- */
  function initShuffle() {
    if (!hasGSAP) return;
    $$('[data-shuffle]').forEach((textEl) => {
      const original = textEl.textContent;
      const host = textEl.closest('.footer_link, .nav__link, a, h3') || textEl;
      let tween;
      const run = () => {
        if (reduce) return;
        tween && tween.kill();
        tween = gsap.to(textEl, { duration: 0.5, ease: 'none', scrambleText: { text: original, chars: 'upperCase', speed: 0.8 } });
      };
      host.addEventListener('mouseenter', run);
      host.addEventListener('focus', run, true);
    });
  }

  /* ---------- GSAP: footer elbow-arrow draw on hover ---------- */
  function initFooterArrows() {
    if (!hasGSAP) return;
    $$('.footer_link').forEach((link) => {
      const path = $('.footer_svg path', link);
      if (!path) return;
      try { gsap.set(path, { drawSVG: '0%' }); } catch (e) { return; }
      link.addEventListener('mouseenter', () => gsap.to(path, { drawSVG: '100%', duration: 0.4, ease: 'power2.out' }));
      link.addEventListener('mouseleave', () => gsap.to(path, { drawSVG: '0%', duration: 0.3, ease: 'power2.in' }));
    });
  }

  /* ---------- Floating gradient balls are CSS-driven (see styles.css)
       to avoid a perpetual GSAP ticker; GSAP stays event-driven. ---------- */

  /* ---------- Elastic overscroll "rebounce" ---------- */
  function initRebounce() {
    const wrapper = $('#pageWrapper');
    const expander = $('#scrollExpander');
    if (!wrapper) return;
    const MAX_DOWN = 320, MAX_UP = 150;
    let pull = 0, releasing = false, idle;

    const docH = () => Math.max(document.body.scrollHeight, document.documentElement.scrollHeight);
    const atBottom = () => window.innerHeight + window.scrollY >= docH() - 2;
    const atTop = () => window.scrollY <= 0;

    function setExpander(v) {
      const o = v > 0 ? Math.min(v / 120, 1) : 0;
      if (!expander) return;
      expander.style.opacity = o;
      expander.style.visibility = o > 0 ? 'visible' : 'hidden';
    }
    function apply() { wrapper.style.transform = 'translateY(' + (-pull) + 'px)'; setExpander(pull); }
    function settle() { wrapper.style.transform = ''; pull = 0; setExpander(0); }

    function release() {
      if (releasing) return;
      releasing = true;
      if (hasGSAP && !reduce) {
        gsap.to({ v: pull }, {
          v: 0, duration: 1.1, ease: 'elastic.out(1, 0.4)',
          onUpdate: function () { pull = this.targets()[0].v; apply(); },
          onComplete: function () { releasing = false; settle(); },
        });
      } else { settle(); releasing = false; }
    }
    function scheduleRelease() { clearTimeout(idle); idle = setTimeout(release, 130); }

    window.addEventListener('wheel', (e) => {
      if (releasing) return;
      if (atBottom() && e.deltaY > 0) { e.preventDefault(); pull = Math.min(pull + e.deltaY * 0.25, MAX_DOWN); apply(); scheduleRelease(); }
      else if (atTop() && e.deltaY < 0) { e.preventDefault(); pull = Math.max(pull + e.deltaY * 0.2, -MAX_UP); apply(); scheduleRelease(); }
    }, { passive: false });

    let startY = null;
    window.addEventListener('touchstart', (e) => { startY = e.touches[0].clientY; }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (startY === null || releasing) return;
      const dy = startY - e.touches[0].clientY;
      if (atBottom() && dy > 0) { e.preventDefault(); pull = Math.min(dy * 0.4, MAX_DOWN); apply(); }
      else if (atTop() && dy < 0) { e.preventDefault(); pull = Math.max(dy * 0.35, -MAX_UP); apply(); }
    }, { passive: false });
    window.addEventListener('touchend', () => { startY = null; if (pull !== 0) release(); }, { passive: true });

    // expose for verification
    window.__rebounce = { apply: (v) => { pull = v; apply(); }, release };
  }

  /* ---------- boot ---------- */
  function boot() {
    buildReveals();
    initScrambleIn();
    initShuffle();
    initFooterArrows();
    initRebounce();
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(boot);
    // failsafe in case fonts.ready stalls
    setTimeout(() => { if (!$('[data-reveal-lines] .line')) boot(); }, 1200);
  } else {
    window.addEventListener('load', boot);
  }
})();
