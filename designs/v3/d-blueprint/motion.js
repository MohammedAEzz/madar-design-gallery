'use strict';
/* Direction D — signature motion.
   1. The hero elevation draws itself (measured path lengths, staggered).
   2. Register rows expand into dossiers with a measured height transition.
   3. The delivery sequence is a scroll-linked horizontal rail inside a sticky
      section; it degrades to a native snap scroller when motion is off.
   4. Company figures count up once, on first sight. */
(() => {
  const motionOn = () => window.MADAR ? window.MADAR.motionOn() : true;
  const EASE = 'cubic-bezier(.2,.8,.25,1)';

  /* ---------------------------------------------- 1. self-drawing lines --- */
  document.querySelectorAll('.elevation .s').forEach(path => {
    const len = Math.ceil(path.getTotalLength());
    path.style.setProperty('--len', len);
  });

  /* ------------------------------------------------ 2. dossier expansion --- */
  const triggers = [...document.querySelectorAll('.reg-trigger')];

  function collapse(panel, trigger) {
    trigger.setAttribute('aria-expanded', 'false');
    if (!motionOn()) { panel.hidden = true; return; }
    const from = panel.scrollHeight;
    panel.classList.add('is-animating');
    const anim = panel.animate(
      [{ height: from + 'px', opacity: 1 }, { height: '0px', opacity: 0 }],
      { duration: 420, easing: EASE }
    );
    anim.onfinish = () => { panel.classList.remove('is-animating'); panel.hidden = true; };
  }

  function expand(panel, trigger) {
    trigger.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    if (!motionOn()) return;
    const to = panel.scrollHeight;
    panel.animate(
      [{ height: '0px', opacity: 0 }, { height: to + 'px', opacity: 1 }],
      { duration: 560, easing: EASE }
    );
    // Stagger the fact cells so the record reads as it assembles.
    panel.querySelectorAll('.facts > div, .dossier-chal').forEach((cell, i) => {
      cell.animate(
        [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }],
        { duration: 460, delay: 140 + i * 70, easing: EASE, fill: 'backwards' }
      );
    });
  }

  triggers.forEach(trigger => {
    const panel = document.getElementById(trigger.getAttribute('aria-controls'));
    if (!panel) return;
    trigger.addEventListener('click', () => {
      const open = trigger.getAttribute('aria-expanded') === 'true';
      // One dossier at a time keeps the register scannable.
      triggers.forEach(other => {
        if (other === trigger) return;
        const otherPanel = document.getElementById(other.getAttribute('aria-controls'));
        if (otherPanel && !otherPanel.hidden) collapse(otherPanel, other);
      });
      if (open) collapse(panel, trigger); else expand(panel, trigger);
    });
  });

  /* ----------------------------------------------------- 3. delivery rail --- */
  const section = document.querySelector('.delivery');
  const shell = document.querySelector('.rail-shell');
  const rail = document.querySelector('[data-rail]');
  const stages = rail ? [...rail.children] : [];
  const indexOut = document.querySelector('[data-rail-index]');
  const barOut = document.querySelector('[data-rail-bar]');
  const wideEnough = matchMedia('(min-width: 981px)');

  function railActive() {
    return motionOn() && wideEnough.matches;
  }

  function syncRailMode() {
    if (!section) return;
    const on = railActive();
    section.classList.toggle('rail-mode', on);
    if (!on && rail) rail.style.transform = '';
  }

  function updateRail() {
    if (!section || !rail || !shell) return;
    if (!section.classList.contains('rail-mode')) {
      // Native scroller: mark the stage nearest the start edge as active.
      const mid = rail.scrollLeft + rail.clientWidth / 2;
      let best = 0, bestGap = Infinity;
      stages.forEach((stage, i) => {
        const gap = Math.abs(stage.offsetLeft + stage.offsetWidth / 2 - mid);
        if (gap < bestGap) { bestGap = gap; best = i; }
      });
      stages.forEach((s, i) => s.classList.toggle('is-active', i === best));
      return;
    }
    const box = shell.getBoundingClientRect();
    const travel = box.height - innerHeight;
    if (travel <= 0) return;
    const progress = Math.min(1, Math.max(0, -box.top / travel));
    const gutter = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--gutter')) || 40;
    const distance = Math.max(0, rail.scrollWidth - (innerWidth - gutter * 2));
    const shift = distance * progress;
    const rtl = document.documentElement.dir === 'rtl';
    rail.style.transform = `translate3d(${rtl ? shift : -shift}px,0,0)`;

    const active = Math.min(stages.length - 1, Math.round(progress * (stages.length - 1)));
    stages.forEach((s, i) => s.classList.toggle('is-active', i === active));
    if (indexOut) indexOut.textContent = String(active + 1).padStart(2, '0');
    if (barOut) barOut.style.width = `${((active + 1) / stages.length) * 100}%`;
  }

  if (rail) {
    syncRailMode();
    updateRail();
    rail.addEventListener('scroll', () => requestAnimationFrame(updateRail), { passive: true });
    wideEnough.addEventListener('change', () => { syncRailMode(); updateRail(); });
    document.addEventListener('madar:motion', () => { syncRailMode(); updateRail(); });
    addEventListener('resize', () => { syncRailMode(); updateRail(); });
    // Keep the active stage in view when it is reached with the keyboard.
    stages.forEach(stage => stage.addEventListener('focusin', () => {
      if (!section.classList.contains('rail-mode')) stage.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }));
  }

  /* -------------------------------------------------------- 4. counters --- */
  const counters = [...document.querySelectorAll('[data-count]')];
  if (counters.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        io.unobserve(entry.target);
        const el = entry.target;
        const target = Number(el.dataset.count);
        if (!motionOn()) { el.textContent = String(target); return; }
        const duration = 1100;
        const start = performance.now();
        const tick = now => {
          const t = Math.min(1, (now - start) / duration);
          // easeOutExpo, so the number settles rather than ticking linearly
          const eased = t === 1 ? 1 : 1 - Math.pow(2, -9 * t);
          el.textContent = String(Math.round(target * eased));
          if (t < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      });
    }, { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* --------------------------------- scroll driver (shared rAF throttle) --- */
  const drive = () => updateRail();
  if (window.MADAR) window.MADAR.onScroll(drive);
  else addEventListener('scroll', () => requestAnimationFrame(drive), { passive: true });
})();
