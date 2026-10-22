'use strict';
/* Direction G — signature motion.
   1. The truss welds itself in (measured path lengths).
   2. The works filmstrip: drag to scroll, arrow buttons, a progress bar, and
      a per-card parallax inside each plate. It is a native scroll container,
      so touch, trackpad, keyboard and scrollbar all work without JS.
   3. Trade slabs open one at a time, with the image plate wiping in.
   4. Capacity figures count up. */
(() => {
  const motionOn = () => window.MADAR ? window.MADAR.motionOn() : true;
  const EASE = 'cubic-bezier(.2,.9,.25,1)';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const rtl = () => document.documentElement.dir === 'rtl';

  /* ----------------------------------------------------------- 1. truss --- */
  document.querySelectorAll('.truss .t').forEach(path => {
    path.style.setProperty('--len', Math.ceil(path.getTotalLength()));
  });

  /* ------------------------------------------------------- 2. filmstrip --- */
  const strip = document.querySelector('[data-strip]');
  const bar = document.querySelector('[data-strip-bar]');
  const prevBtn = document.querySelector('[data-strip-prev]');
  const nextBtn = document.querySelector('[data-strip-next]');

  function visibleCards() {
    return strip ? [...strip.querySelectorAll('.card')].filter(c => !c.hidden) : [];
  }

  function updateStrip() {
    if (!strip) return;
    const max = strip.scrollWidth - strip.clientWidth;
    // scrollLeft is negative in RTL in Chromium/Firefox; normalise to 0..1.
    const pos = Math.abs(strip.scrollLeft);
    const progress = max > 4 ? clamp(pos / max) : 1;

    if (bar) {
      const cards = Math.max(visibleCards().length, 1);
      const width = max > 4 ? Math.max(18, 100 / cards) : 100;
      bar.style.width = width + '%';
      const travel = 100 - width;
      bar.style.transform = `translateX(${(rtl() ? -1 : 1) * travel * progress}%)`;
    }
    if (prevBtn) prevBtn.disabled = max <= 4 || progress <= 0.01;
    if (nextBtn) nextBtn.disabled = max <= 4 || progress >= 0.99;
    strip.closest('.strip-wrap')?.classList.toggle('is-static', max <= 4);
    strip.closest('.works')?.classList.toggle('is-static', max <= 4);

    // Restrained parallax: the plate inside each card drifts against the
    // strip's own scroll, so the filmstrip reads as depth, not as a carousel.
    if (!motionOn()) {
      strip.querySelectorAll('.card-img img').forEach(img => { img.style.removeProperty('--shift'); img.style.translate = ''; });
      return;
    }
    const mid = strip.getBoundingClientRect().left + strip.clientWidth / 2;
    visibleCards().forEach(card => {
      const box = card.getBoundingClientRect();
      const offset = (box.left + box.width / 2 - mid) / strip.clientWidth;  // -1 .. 1
      const img = card.querySelector('.card-img img');
      if (img) img.style.translate = `${(-offset * 22).toFixed(1)}px 0`;
    });
  }

  function page(direction) {
    if (!strip) return;
    const card = visibleCards()[0];
    const step = card ? card.offsetWidth + 18 : strip.clientWidth * 0.8;
    strip.scrollBy({ left: (rtl() ? -1 : 1) * direction * step, behavior: motionOn() ? 'smooth' : 'auto' });
  }
  // In RTL the visual "next" (pointing to the start of the line) still means
  // "advance", so both buttons are expressed in logical, not physical, terms.
  nextBtn?.addEventListener('click', () => page(1));
  prevBtn?.addEventListener('click', () => page(-1));

  /* Drag-to-scroll. Pointer events only, so touch keeps native momentum. */
  if (strip) {
    let dragging = false, startX = 0, startScroll = 0, moved = 0;

    strip.addEventListener('pointerdown', event => {
      if (event.pointerType === 'touch') return;
      if (event.target.closest('a, button')) return;
      dragging = true; moved = 0;
      startX = event.clientX;
      startScroll = strip.scrollLeft;
      strip.setPointerCapture(event.pointerId);
      strip.classList.add('is-dragging');
    });

    strip.addEventListener('pointermove', event => {
      if (!dragging) return;
      const delta = event.clientX - startX;
      moved = Math.abs(delta);
      strip.scrollLeft = startScroll - delta;
    });

    const endDrag = event => {
      if (!dragging) return;
      dragging = false;
      strip.classList.remove('is-dragging');
      try { strip.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    };
    strip.addEventListener('pointerup', endDrag);
    strip.addEventListener('pointercancel', endDrag);
    // Swallow the click that ends a real drag so cards do not activate.
    strip.addEventListener('click', event => { if (moved > 8) { event.preventDefault(); event.stopPropagation(); } }, true);

    strip.addEventListener('scroll', () => requestAnimationFrame(updateStrip), { passive: true });
    addEventListener('resize', () => requestAnimationFrame(updateStrip));
    document.addEventListener('madar:filter', () => requestAnimationFrame(() => { strip.scrollTo({ left: 0 }); updateStrip(); }));
    document.addEventListener('madar:motion', () => requestAnimationFrame(updateStrip));
    window.MADAR?.onLanguage(() => requestAnimationFrame(updateStrip));
    requestAnimationFrame(updateStrip);
  }

  /* --------------------------------------------------------- 3. trades --- */
  const tradeButtons = [...document.querySelectorAll('.trade button')];

  function closeTrade(panel, button) {
    button.setAttribute('aria-expanded', 'false');
    if (!motionOn()) { panel.hidden = true; return; }
    const from = panel.scrollHeight;
    const anim = panel.animate(
      [{ height: from + 'px' }, { height: '0px' }],
      { duration: 380, easing: EASE }
    );
    anim.onfinish = () => { panel.hidden = true; };
  }

  function openTrade(panel, button) {
    button.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!motionOn()) return;
    panel.animate([{ height: '0px' }, { height: panel.scrollHeight + 'px' }], { duration: 560, easing: EASE });
    const plate = panel.querySelector('.trade-img');
    if (plate) {
      plate.animate(
        [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }],
        { duration: 760, delay: 90, easing: EASE, fill: 'backwards' }
      );
    }
    panel.querySelectorAll('.trade-items li').forEach((item, i) => {
      item.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 360, delay: 150 + i * 55, easing: EASE, fill: 'backwards' }
      );
    });
  }

  tradeButtons.forEach(button => {
    const panel = document.getElementById(button.getAttribute('aria-controls'));
    if (!panel) return;
    button.addEventListener('click', () => {
      const isOpen = button.getAttribute('aria-expanded') === 'true';
      tradeButtons.forEach(other => {
        if (other === button) return;
        const p = document.getElementById(other.getAttribute('aria-controls'));
        if (p && !p.hidden) closeTrade(p, other);
      });
      if (isOpen) closeTrade(panel, button); else openTrade(panel, button);
    });
  });

  /* ------------------------------------------------------- 4. counters --- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const value = Number(el.dataset.count);
        if (!motionOn()) { el.textContent = String(value); return; }
        const start = performance.now(), duration = 1000;
        const tick = now => {
          const t = clamp((now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(value * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.55 });
    document.querySelectorAll('[data-count]').forEach(n => io.observe(n));
  }
})();
