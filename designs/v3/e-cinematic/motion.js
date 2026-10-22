'use strict';
/* Direction E — signature motion.
   1. The manifesto is lit word by word as it passes through the viewport.
   2. Chapters stack: each pinned panel dims and recedes as the next cuts over
      it, and its copy rises in as it arrives.
   3. The craft list crossfades a full-bleed still behind whichever row is
      hovered, focused or open.
   4. Numerals count up once, paired with the CSS light sweep. */
(() => {
  const motionOn = () => window.MADAR ? window.MADAR.motionOn() : true;
  const EASE = 'cubic-bezier(.16,1,.3,1)';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------- 1. lit statement --- */
  const statement = document.querySelector('[data-statement]');
  let words = [];

  function buildWords() {
    if (!statement) return;
    words = [];
    statement.querySelectorAll(':scope > span').forEach(line => {
      const text = (line.dataset[window.MADAR && window.MADAR.isEn() ? 'en' : 'ar'] || line.textContent).trim();
      line.textContent = '';
      text.split(/\s+/).forEach((word, i, all) => {
        const w = document.createElement('span');
        w.className = 'w';
        w.textContent = word + (i < all.length - 1 ? ' ' : '');
        line.appendChild(w);
        words.push(w);
      });
    });
  }

  function litStatement() {
    if (!statement || !words.length) return;
    if (!motionOn()) { words.forEach(w => w.classList.add('lit')); return; }
    const box = statement.getBoundingClientRect();
    // Light the line as it travels from 85% to 35% of the viewport height.
    const progress = clamp((innerHeight * 0.85 - box.top) / (box.height + innerHeight * 0.5));
    const lit = Math.round(progress * words.length * 1.25);
    words.forEach((w, i) => w.classList.toggle('lit', i < lit));
  }

  buildWords();
  window.MADAR?.onLanguage(() => { buildWords(); litStatement(); });

  /* ------------------------------------------------ 2. chapter stacking --- */
  const stack = document.querySelector('[data-stack]');
  const chapters = stack ? [...stack.querySelectorAll('.chapter')] : [];

  function updateChapters() {
    if (!chapters.length) return;
    const visible = chapters.filter(c => !c.hidden);
    if (!motionOn() || window.MADAR?.narrow.matches) {
      visible.forEach(c => {
        c.style.removeProperty('--in');
        c.style.transform = '';
        c.style.filter = '';
        const still = c.querySelector('.chapter-still img');
        if (still) still.style.transform = '';
      });
      return;
    }
    visible.forEach((chapter, i) => {
      const next = visible[i + 1];
      const box = chapter.getBoundingClientRect();

      // Arrival: copy rises as the panel reaches the top of the viewport.
      const arriving = clamp((innerHeight - box.top) / (innerHeight * 0.55));
      chapter.style.setProperty('--in', arriving.toFixed(3));

      // Departure: how far the following panel has covered this one.
      let covered = 0;
      if (next) {
        const nb = next.getBoundingClientRect();
        covered = clamp((innerHeight - nb.top) / innerHeight);
      }
      const scale = 1 - covered * 0.07;
      chapter.style.transform = `scale(${scale.toFixed(4)})`;
      chapter.style.filter = `brightness(${(1 - covered * 0.55).toFixed(3)})`;

      // A restrained parallax inside the frame — the image drifts, not the panel.
      const still = chapter.querySelector('.chapter-still img');
      if (still) {
        const drift = clamp(-box.top / innerHeight, -1, 1) * 4;
        still.style.transform = `scale(1.1) translate3d(0, ${drift.toFixed(2)}%, 0)`;
      }
    });
  }

  document.addEventListener('madar:filter', () => requestAnimationFrame(updateChapters));

  /* ---------------------------------------------------- 3. craft stills --- */
  const craftRows = [...document.querySelectorAll('.craft-row')];
  const craftImages = [...document.querySelectorAll('[data-craft-img]')];
  let craftLock = null;          // index of the open row, if any

  function showCraft(index) {
    craftImages.forEach((img, i) => img.classList.toggle('is-shown', i === index));
  }
  showCraft(0);

  craftRows.forEach(row => {
    const index = Number(row.dataset.craftIndex);
    const panel = document.getElementById(row.getAttribute('aria-controls'));

    const preview = () => { if (craftLock === null) showCraft(index); };
    row.addEventListener('mouseenter', preview);
    row.addEventListener('focus', preview);
    row.addEventListener('mouseleave', () => { if (craftLock === null) showCraft(0); });

    row.addEventListener('click', () => {
      const open = row.getAttribute('aria-expanded') === 'true';
      craftRows.forEach(other => {
        if (other === row) return;
        other.setAttribute('aria-expanded', 'false');
        const p = document.getElementById(other.getAttribute('aria-controls'));
        if (p) p.hidden = true;
      });
      row.setAttribute('aria-expanded', String(!open));
      if (!panel) return;
      if (open) {
        panel.hidden = true;
        craftLock = null;
        showCraft(0);
      } else {
        panel.hidden = false;
        craftLock = index;
        showCraft(index);
        if (motionOn()) {
          panel.animate(
            [{ opacity: 0, transform: 'translateY(-10px)' }, { opacity: 1, transform: 'none' }],
            { duration: 520, easing: EASE }
          );
        }
      }
    });
  });

  /* -------------------------------------------------------- 4. counters --- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        if (!motionOn()) { el.textContent = String(target); return; }
        const start = performance.now(), duration = 1400;
        const tick = now => {
          const t = clamp((now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(n => io.observe(n));
  }

  /* ------------------------------------------------------- scroll driver --- */
  const drive = () => { litStatement(); updateChapters(); };
  if (window.MADAR) window.MADAR.onScroll(drive);
  else addEventListener('scroll', () => requestAnimationFrame(drive), { passive: true });
  addEventListener('resize', () => requestAnimationFrame(drive));
  document.addEventListener('madar:motion', () => requestAnimationFrame(drive));
})();
