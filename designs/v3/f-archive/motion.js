'use strict';
/* Direction F — signature motion.
   1. A cursor-following plate previews the hovered index row (pointer only).
   2. Index rows expand in place into a detail band, one at a time.
   3. Colophon figures run as an odometer.
   Everything else — the grid hairlines drawing down, the headline lines
   rising, the accent rule and the slit opening — is CSS, so it survives
   with JavaScript disabled. */
(() => {
  const motionOn = () => window.MADAR ? window.MADAR.motionOn() : true;
  const EASE = 'cubic-bezier(.19,1,.22,1)';
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------- 1. following plate --- */
  const plate = document.querySelector('[data-float]');
  const plateImages = [...document.querySelectorAll('[data-float-img]')];
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  let target = { x: 0, y: 0 };
  let current = { x: 0, y: 0 };
  let plateRaf = null;
  let plateLive = false;

  function lerpPlate() {
    // Trails the pointer rather than tracking it exactly — a plate being
    // placed on the page, not a cursor.
    current.x += (target.x - current.x) * 0.14;
    current.y += (target.y - current.y) * 0.14;
    plate.style.translate = `${current.x}px ${current.y}px`;
    if (plateLive) plateRaf = requestAnimationFrame(lerpPlate);
    else plateRaf = null;
  }

  function plateEnabled() {
    return plate && finePointer.matches && motionOn();
  }

  if (plate) {
    document.querySelectorAll('.work-row').forEach(row => {
      const sector = row.dataset.plate;

      row.addEventListener('mouseenter', () => {
        if (!plateEnabled()) return;
        plateImages.forEach(img => img.classList.toggle('is-shown', img.dataset.floatImg === sector));
        plate.classList.add('is-live');
        plateLive = true;
        if (!plateRaf) plateRaf = requestAnimationFrame(lerpPlate);
      });

      row.addEventListener('mousemove', event => {
        if (!plateEnabled()) return;
        target.x = event.clientX;
        target.y = event.clientY;
        if (!plate.classList.contains('is-live')) { current.x = target.x; current.y = target.y; }
      });

      row.addEventListener('mouseleave', () => {
        plate.classList.remove('is-live');
        plateLive = false;
      });
    });
  }

  /* -------------------------------------------------- 2. index expansion --- */
  const rows = [...document.querySelectorAll('.work-row')];

  function close(panel, row) {
    row.setAttribute('aria-expanded', 'false');
    if (!motionOn()) { panel.hidden = true; return; }
    const from = panel.scrollHeight;
    const anim = panel.animate(
      [{ height: from + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 400, easing: EASE }
    );
    anim.onfinish = () => { panel.hidden = true; };
  }

  function open(panel, row) {
    row.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!motionOn()) return;
    const to = panel.scrollHeight;
    panel.animate(
      [{ height: '0px', opacity: 0 }, { height: to + 'px', opacity: 1 }],
      { duration: 620, easing: EASE }
    );
    const figure = panel.querySelector('.work-plate');
    if (figure) {
      figure.animate(
        [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }],
        { duration: 740, easing: EASE }
      );
    }
    panel.querySelectorAll('.work-facts > div').forEach((cell, i) => {
      cell.animate(
        [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
        { duration: 440, delay: 220 + i * 60, easing: EASE, fill: 'backwards' }
      );
    });
  }

  rows.forEach(row => {
    const panel = document.getElementById(row.getAttribute('aria-controls'));
    if (!panel) return;
    row.addEventListener('click', () => {
      const isOpen = row.getAttribute('aria-expanded') === 'true';
      rows.forEach(other => {
        if (other === row) return;
        const p = document.getElementById(other.getAttribute('aria-controls'));
        if (p && !p.hidden) close(p, other);
      });
      if (isOpen) close(panel, row); else open(panel, row);
      // The plate would overlap the band it just opened.
      plate?.classList.remove('is-live');
      plateLive = false;
    });
  });

  /* ----------------------------------------------------- 3. odometer --- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const value = Number(el.dataset.count);
        if (!motionOn()) { el.textContent = String(value); return; }
        const start = performance.now(), duration = 1150;
        const tick = now => {
          const t = clamp((now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = String(Math.round(value * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.7 });
    document.querySelectorAll('[data-count]').forEach(n => io.observe(n));
  }

  document.addEventListener('madar:motion', () => {
    if (!motionOn()) { plate?.classList.remove('is-live'); plateLive = false; }
  });
})();
