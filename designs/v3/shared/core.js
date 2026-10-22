'use strict';
/* Shared behaviour contract for prototype directions D–G.
   Handles only what must behave identically across variants so the comparison
   is fair: language/direction switching, the mobile menu state machine, the
   motion preference, project filtering, scroll reveals and the local-only form.
   Each direction supplies its own CSS transitions and its own signature motion
   in its sibling motion.js — nothing visual is decided here. */
(() => {
  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const narrow = matchMedia('(max-width: 860px)');

  let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar';
  let paused = reduced.matches;
  let submitted = false;
  const langListeners = [];

  const isEn = () => language === 'en';
  const motionOn = () => !paused && !reduced.matches;

  /* ---------------------------------------------------------- language --- */
  const langToggle = document.querySelector('[data-language]');

  function translate() {
    document.querySelectorAll('[data-ar][data-en]').forEach(node => {
      node.textContent = node.dataset[language];
    });
    document.querySelectorAll('[data-alt-ar]').forEach(node => {
      node.alt = isEn() ? node.dataset.altEn : node.dataset.altAr;
    });
    document.querySelectorAll('[data-label-ar]').forEach(node => {
      node.setAttribute('aria-label', isEn() ? node.dataset.labelEn : node.dataset.labelAr);
    });
  }

  function setLanguage(next) {
    language = next;
    root.lang = language;
    root.dir = isEn() ? 'ltr' : 'rtl';
    translate();
    if (langToggle) {
      langToggle.textContent = isEn() ? 'ع' : 'EN';
      langToggle.lang = isEn() ? 'ar' : 'en';
      langToggle.setAttribute('aria-label', isEn() ? 'التبديل إلى العربية' : 'Switch to English');
    }
    document.querySelectorAll('[data-locale-link]').forEach(link => {
      const url = new URL(link.getAttribute('href'), location.href);
      if (isEn()) url.searchParams.set('lang', 'en'); else url.searchParams.delete('lang');
      link.setAttribute('href', url.pathname.split('/').pop() + url.search + url.hash);
    });
    motionLabel();
    countProjects();
    statusText();
    langListeners.forEach(fn => fn(language));
  }

  langToggle?.addEventListener('click', () => setLanguage(isEn() ? 'ar' : 'en'));

  /* ------------------------------------------------------------- motion --- */
  const motionToggle = document.querySelector('[data-motion-toggle]');

  function motionLabel() {
    if (!motionToggle) return;
    const label = paused
      ? (isEn() ? 'Enable motion' : 'تشغيل الحركة')
      : (isEn() ? 'Pause motion' : 'إيقاف الحركة');
    motionToggle.setAttribute('aria-label', label);
    motionToggle.title = label;
    motionToggle.setAttribute('aria-pressed', String(paused));
    const glyph = motionToggle.querySelector('[data-motion-glyph]');
    if (glyph) glyph.textContent = paused ? '▶' : '❙❙';
  }

  function setMotion(next) {
    paused = next;
    body.dataset.motion = paused ? 'paused' : 'playing';
    if (paused) revealAll();
    motionLabel();
    document.dispatchEvent(new CustomEvent('madar:motion', { detail: { on: motionOn() } }));
  }

  motionToggle?.addEventListener('click', () => setMotion(!paused));
  reduced.addEventListener('change', () => setMotion(reduced.matches));

  /* --------------------------------------------------------------- menu --- */
  const menu = document.querySelector('#menu-panel');
  const menuToggle = document.querySelector('[data-menu-toggle]');
  const menuClose = document.querySelector('[data-menu-close]');
  let menuTimer;

  function openMenu() {
    if (!menu || menu.open) return;
    clearTimeout(menuTimer);
    menu.showModal();
    body.classList.add('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => {
      menu.classList.add('is-open');
      (menuClose || menu.querySelector('a'))?.focus();
    });
  }

  function closeMenu(returnFocus = true) {
    if (!menu?.open) return;
    clearTimeout(menuTimer);
    menu.classList.remove('is-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
    menuTimer = setTimeout(() => {
      menu.close();
      body.classList.remove('menu-open');
      if (returnFocus) menuToggle?.focus();
    }, motionOn() ? 520 : 0);
  }

  menuToggle?.addEventListener('click', openMenu);
  menuClose?.addEventListener('click', () => closeMenu());
  menu?.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    const href = link.getAttribute('href') || '';
    if (!href.startsWith('#')) { closeMenu(false); return; }
    const target = document.getElementById(href.slice(1));
    if (!target) return;
    event.preventDefault();
    closeMenu(false);
    setTimeout(() => {
      target.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    }, motionOn() ? 540 : 10);
  }));

  /* ------------------------------------------------- in-page nav scroll --- */
  document.querySelectorAll('a[href^="#"]:not([href="#"])').forEach(link => {
    if (link.closest('#menu-panel')) return;
    link.addEventListener('click', event => {
      const target = document.getElementById(link.getAttribute('href').slice(1));
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: motionOn() ? 'smooth' : 'auto', block: 'start' });
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
    });
  });

  /* ------------------------------------------------------------ filters --- */
  const cards = [...document.querySelectorAll('[data-sector]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const counter = document.querySelector('[data-result-count]');

  function countProjects() {
    if (!counter) return;
    const n = cards.filter(card => !card.hidden).length;
    counter.textContent = isEn()
      ? `${n} demonstration projects shown`
      : `عدد المشروعات الافتراضية المعروضة: ${n}`;
  }

  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(f => f.setAttribute('aria-pressed', String(f === button)));
    cards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.sector !== category;
      if (!card.hidden) card.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('is-in'));
    });
    countProjects();
    document.dispatchEvent(new CustomEvent('madar:filter', { detail: { category } }));
  }));

  /* --------------------------------------------------------------- form --- */
  function statusText() {
    const status = document.querySelector('[data-form-status]');
    if (status && submitted) {
      status.textContent = isEn()
        ? 'Simulation complete. Nothing was sent or stored.'
        : 'اكتملت المحاكاة. لم تُرسل أو تُحفظ أي بيانات.';
    }
  }

  document.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    submitted = true;
    statusText();
    document.querySelector('[data-form-status]')?.focus();
  });

  /* ------------------------------------------------------------ reveals --- */
  function revealAll() {
    document.querySelectorAll('[data-reveal]').forEach(n => n.classList.add('is-in'));
  }

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });

    document.querySelectorAll('[data-reveal]').forEach(node => {
      // Stagger siblings that share a group so rows cascade rather than pop.
      const group = node.closest('[data-reveal-group]');
      if (group) {
        const peers = [...group.querySelectorAll('[data-reveal]')];
        node.style.setProperty('--i', peers.indexOf(node));
      }
      observer.observe(node);
    });
  } else {
    revealAll();
  }

  // Never leave focused content hidden behind an un-fired reveal.
  document.addEventListener('focusin', event => {
    const hidden = event.target.closest?.('[data-reveal]:not(.is-in)');
    if (hidden) hidden.classList.add('is-in');
  });

  /* ----------------------------------------------------- header docking --- */
  const header = document.querySelector('[data-header]');
  if (header) {
    let last = 0, ticking = false;
    const update = () => {
      ticking = false;
      const y = scrollY;
      header.classList.toggle('is-docked', y > 90);
      header.classList.toggle('is-hidden', y > 420 && y > last && !body.classList.contains('menu-open'));
      last = y;
    };
    addEventListener('scroll', () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
  }

  /* ---------------------------------------------------------------- api --- */
  window.MADAR = {
    isEn, motionOn, narrow,
    onLanguage: fn => langListeners.push(fn),
    /* rAF-throttled scroll subscription shared by the per-variant motion files */
    onScroll(fn) {
      let pending = false;
      const run = () => { pending = false; fn(scrollY); };
      addEventListener('scroll', () => {
        if (!pending) { pending = true; requestAnimationFrame(run); }
      }, { passive: true });
      fn(scrollY);
    },
  };

  setLanguage(language);
  setMotion(paused);
  body.classList.add('is-ready');
})();
