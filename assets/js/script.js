/* ============================================================
   Sui.io replica — interactions
   ============================================================ */
(function () {
  'use strict';
  const $ = (s, c) => (c || document).querySelector(s);
  const $$ = (s, c) => Array.from((c || document).querySelectorAll(s));

  /* ---------- Sticky nav shadow on scroll ---------- */
  const nav = $('#nav');
  const onScroll = () => nav && nav.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Services timeline: spine fill + node track scroll ---------- */
  const tl = $('#svcTimeline');
  if (tl) {
    const fill = $('#tlFill');
    const node = $('#tlNode');
    let ticking = false;
    const measure = () => {
      ticking = false;
      const rect = tl.getBoundingClientRect();
      const ref = window.innerHeight * 0.5;      // reading line = viewport centre
      let p = (ref - rect.top) / rect.height;
      p = Math.max(0, Math.min(1, p));
      if (fill) fill.style.height = (p * 100) + '%';
      if (node) node.style.top = (p * 100) + '%';
    };
    const onTL = () => { if (!ticking) { ticking = true; requestAnimationFrame(measure); } };
    window.addEventListener('scroll', onTL, { passive: true });
    window.addEventListener('resize', onTL, { passive: true });
    measure();
  }

  /* ---------- Scroll-scrubbed effects (advance on scroll-down, rewind on scroll-up) ---------- */
  const curtainSec = $('#curtainSec');
  const stmtBig = $('.statement__big');
  const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  // progress 0→1 as an element's top travels from `a` down to `b` (fractions of viewport height)
  const bandTop = (rect, vh, a, b) => clamp01((vh * a - rect.top) / (vh * (a - b)));
  let scTick = false;
  const scMeasure = () => {
    scTick = false;
    const vh = window.innerHeight;
    if (curtainSec) {
      const p = bandTop(curtainSec.getBoundingClientRect(), vh, 0.92, 0.42);
      curtainSec.style.setProperty('--cp', p.toFixed(4));
    }
    if (stmtBig) {
      const p = bandTop(stmtBig.getBoundingClientRect(), vh, 0.85, 0.28);
      const ks = [clamp01((p - 0.10) / 0.26), clamp01((p - 0.40) / 0.24), clamp01((p - 0.66) / 0.24)];
      ks.forEach((k, i) => {
        stmtBig.style.setProperty('--k' + (i + 1), k.toFixed(3));
        stmtBig.style.setProperty('--k' + (i + 1) + 'c', clamp01((k - 0.35) / 0.5).toFixed(3));
      });
    }
  };
  const scScroll = () => { if (!scTick) { scTick = true; requestAnimationFrame(scMeasure); } };
  if (curtainSec || stmtBig) {
    window.addEventListener('scroll', scScroll, { passive: true });
    window.addEventListener('resize', scScroll, { passive: true });
    scMeasure();
  }

  /* ---------- Hover-accordion: one row open at a time (first open by default) ---------- */
  const accRows = $$('#accList .acc-row');
  if (accRows.length) {
    const setActive = (row) => { accRows.forEach(r => r.classList.toggle('is-active', r === row)); };
    setActive(accRows[0]);
    accRows.forEach(row => {
      row.addEventListener('mouseenter', () => setActive(row));
      row.addEventListener('focusin', () => setActive(row));
    });
  }

  /* ---------- Announcement banner dismiss ---------- */
  const pencilClose = $('#pencilClose');
  if (pencilClose) pencilClose.addEventListener('click', () => {
    const p = $('#pencil');
    if (p) p.style.display = 'none';
  });

  /* ---------- Desktop mega-menu (hover + click, one open at a time) ---------- */
  const items = $$('.nav__item[data-mega]');
  let closeTimer;
  const closeAll = () => items.forEach(i => i.classList.remove('open'));
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      clearTimeout(closeTimer);
      closeAll();
      item.classList.add('open');
    });
    item.addEventListener('mouseleave', () => {
      closeTimer = setTimeout(closeAll, 120);
    });
    const link = $('.nav__link', item);
    link && link.addEventListener('click', e => {
      e.preventDefault();
      const isOpen = item.classList.contains('open');
      closeAll();
      if (!isOpen) item.classList.add('open');
    });
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('.nav__item')) closeAll();
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });

  /* ---------- Mobile nav ---------- */
  const mobileNav = $('#mobileNav');
  const openMobile = () => { mobileNav.classList.add('open'); document.body.classList.add('no-scroll'); };
  const closeMobile = () => { mobileNav.classList.remove('open'); document.body.classList.remove('no-scroll'); };
  const burger = $('#burger');
  burger && burger.addEventListener('click', openMobile);
  const mClose = $('#mobileClose');
  mClose && mClose.addEventListener('click', closeMobile);
  $$('.m-group > button').forEach(b => {
    b.addEventListener('click', () => {
      const g = b.parentElement;
      const wasOpen = g.classList.contains('open');
      $$('.m-group').forEach(x => x.classList.remove('open'));
      if (!wasOpen) g.classList.add('open');
      const sign = b.querySelector('span');
      $$('.m-group span').forEach(s => s.textContent = '+');
      if (sign && !wasOpen) sign.textContent = '–';
    });
  });
  $$('.mobile-nav a').forEach(a => a.addEventListener('click', closeMobile));

  /* ---------- Hero word rotator ---------- */
  const rotator = $('#rotator');
  if (rotator) {
    const list = $('ul', rotator);
    const lis = $$('li', list);
    let idx = 0;
    const h = lis[0] ? lis[0].offsetHeight : 0;
    list.style.transition = 'transform .6s cubic-bezier(.22,.61,.36,1)';
    setInterval(() => {
      idx = (idx + 1) % lis.length;
      list.style.transform = `translateY(${-idx * h}px)`;
    }, 2200);
  }

  /* ---------- Logo marquee: duplicate track for seamless loop ---------- */
  const marquee = $('#marquee');
  if (marquee) {
    marquee.innerHTML += marquee.innerHTML;
  }

  /* ---------- Industry tabs ---------- */
  const tabs = $$('.tab');
  const panels = $$('.panel');
  tabs.forEach(t => t.addEventListener('click', () => {
    const i = t.dataset.tab;
    tabs.forEach(x => x.classList.toggle('active', x === t));
    panels.forEach(p => p.classList.toggle('active', p.dataset.panel === i));
  }));
  // auto-advance tabs
  let tabIdx = 0, tabTimer = setInterval(advance, 5000);
  function advance() {
    tabIdx = (tabIdx + 1) % tabs.length;
    tabs[tabIdx] && tabs[tabIdx].click();
  }
  $('#tabsNav') && $('#tabsNav').addEventListener('mouseenter', () => clearInterval(tabTimer));

  /* ---------- Scroll reveal is handled by GSAP (gsap-init.js).
       Fallback: if GSAP is unavailable, reveal everything immediately. ---------- */
  if (!window.gsap) {
    $$('.reveal').forEach(r => r.classList.add('in'));
  }

  /* ---------- Subtle hero parallax on pointer ---------- */
  const heroBg = $('.hero__bg img');
  if (heroBg && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', e => {
      const x = (e.clientX / window.innerWidth - 0.5) * 18;
      const y = (e.clientY / window.innerHeight - 0.5) * 18;
      heroBg.style.transform = `translateX(calc(-50% + ${x}px)) translateY(${y}px)`;
    }, { passive: true });
  }
})();
