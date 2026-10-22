'use strict';
(() => {
  const root = document.documentElement;
  const body = document.body;
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = matchMedia('(max-width: 850px)');
  const toggle = document.querySelector('[data-language]');
  const motionButton = document.querySelector('.motion-toggle');
  const menu = document.querySelector('#menu-panel');
  const menuButton = document.querySelector('.menu-toggle');
  const closeButton = document.querySelector('.menu-close');
  const cards = [...document.querySelectorAll('[data-sector]')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const counter = document.querySelector('.result-count');
  let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar';
  let paused = prefersReduced.matches;
  let submitted = false;
  let menuTimer;
  let framePending = false;
  let observer;
  const isEn = () => language === 'en';
  const activeMotion = () => !paused && !prefersReduced.matches;
  function countProjects() {
    if (counter) {
      const count = cards.filter(card => !card.hidden).length;
      counter.textContent = isEn() ? `${count} demonstration projects shown` : `عدد المشروعات الافتراضية المعروضة: ${count}`;
    }
  }
  function submissionText() {
    const status = document.querySelector('.form-status');
    if (status && submitted) status.textContent = isEn()
      ? 'Simulation complete. No information was sent or stored.'
      : 'اكتملت المحاكاة. لم تُرسل أو تُحفظ أي بيانات.';
  }
  function motionLabel() {
    if (!motionButton) return;
    const label = paused ? (isEn() ? 'Enable motion' : 'تشغيل الحركة') : (isEn() ? 'Pause motion' : 'إيقاف الحركة');
    motionButton.setAttribute('aria-label', label);
    motionButton.title = label;
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.querySelector('span').textContent = paused ? '▷' : 'Ⅱ';
  }
  function setLanguage(next) {
    language = next;
    root.lang = language;
    root.dir = isEn() ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-ar][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
    document.querySelectorAll('[data-alt-ar]').forEach(node => { node.alt = isEn() ? node.dataset.altEn : node.dataset.altAr; });
    if (toggle) {
      toggle.textContent = isEn() ? 'عربي' : 'EN';
      toggle.lang = isEn() ? 'ar' : 'en';
      toggle.setAttribute('aria-label', isEn() ? 'Switch to Arabic' : 'Switch to English');
    }
    document.querySelector('.desktop-nav')?.setAttribute('aria-label', isEn() ? 'Main navigation' : 'التنقل الرئيسي');
    document.querySelector('.filters')?.setAttribute('aria-label', isEn() ? 'Filter projects' : 'تصفية المشروعات');
    menu?.setAttribute('aria-label', isEn() ? 'Navigation menu' : 'قائمة التنقل');
    document.querySelectorAll('.locale-link').forEach(link => {
      const target = new URL(link.getAttribute('href'), location.href);
      if (isEn()) target.searchParams.set('lang', 'en'); else target.searchParams.delete('lang');
      link.setAttribute('href', target.pathname.split('/').pop() + target.search + target.hash);
    });
    motionLabel(); countProjects(); submissionText();
  }
  function revealAll() {
    document.querySelectorAll('.will-reveal').forEach(node => node.classList.add('is-in'));
  }
  function setMotion(next) {
    paused = next;
    body.dataset.motion = paused ? 'paused' : 'playing';
    if (paused) {
      revealAll();
      document.querySelectorAll('[data-parallax]').forEach(node => { node.style.transform = ''; });
    }
    motionLabel();
  }
  function openMenu() {
    clearTimeout(menuTimer);
    if (menu.open) return;
    menu.showModal();
    body.classList.add('menu-open');
    menuButton.setAttribute('aria-expanded', 'true');
    requestAnimationFrame(() => { menu.classList.add('is-open'); closeButton.focus(); });
  }
  function closeMenu(returnFocus = true) {
    if (!menu?.open) return;
    clearTimeout(menuTimer);
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuTimer = setTimeout(() => {
      menu.close();
      body.classList.remove('menu-open');
      if (returnFocus) menuButton.focus();
    }, activeMotion() ? 450 : 0);
  }
  menuButton?.addEventListener('click', openMenu);
  closeButton?.addEventListener('click', () => closeMenu());
  menu?.addEventListener('cancel', event => { event.preventDefault(); closeMenu(); });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', event => {
    const href = link.getAttribute('href');
    if (href.startsWith('#')) {
      const target = document.getElementById(href.slice(1));
      if (target) {
        event.preventDefault();
        closeMenu(false);
        setTimeout(() => {
          target.scrollIntoView({behavior: activeMotion() ? 'smooth' : 'instant'});
          target.setAttribute('tabindex', '-1');
          target.focus({preventScroll:true});
        }, activeMotion() ? 470 : 10);
      }
    } else closeMenu(false);
  }));
  toggle?.addEventListener('click', () => setLanguage(isEn() ? 'ar' : 'en'));
  motionButton?.addEventListener('click', () => setMotion(!paused));
  prefersReduced.addEventListener('change', () => setMotion(prefersReduced.matches));
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => {
      card.hidden = category !== 'all' && card.dataset.sector !== category;
      if (!card.hidden) card.querySelectorAll('[data-reveal]').forEach(node => node.classList.add('is-in'));
    });
    document.querySelector('.project-collection')?.classList.toggle('is-filtered', category !== 'all');
    countProjects();
  }));
  document.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault(); submitted = true; submissionText();
    document.querySelector('.form-status')?.focus();
  });
  // Different reveal treatments for type, image shutters, structural rules and facts.
  if (activeMotion() && 'IntersectionObserver' in window) {
    body.classList.add('motion-ready');
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, {threshold: .08, rootMargin:'0px 0px -30px 0px'});
    document.querySelectorAll('[data-reveal]').forEach((node,index) => {
      node.classList.add('will-reveal');
      if (node.dataset.reveal === 'number') node.style.setProperty('--reveal-delay',`${(index%3)*80}ms`);
      observer.observe(node);
    });
  }
  // Native scrolling; parallax is disabled on narrow screens and under reduced motion.
  function updateParallax() {
    framePending = false;
    document.querySelector('.site-header')?.classList.toggle('is-floating', scrollY > Math.min(innerHeight * .7, 620));
    if (!activeMotion() || smallScreen.matches) return;
    const viewHeight = innerHeight;
    document.querySelectorAll('[data-parallax]').forEach(node => {
      const parent = node.parentElement.getBoundingClientRect();
      if (parent.bottom < 0 || parent.top > viewHeight) return;
      const rate = Number(node.dataset.parallax);
      const delta = Math.max(-55,Math.min(55,-parent.top*rate));
      node.style.transform = `translate3d(0,${delta}px,0)`;
    });
  }
  addEventListener('scroll', () => {
    if (!framePending) { framePending = true; requestAnimationFrame(updateParallax); }
  }, {passive:true});
  smallScreen.addEventListener('change', () => {
    document.querySelectorAll('[data-parallax]').forEach(node=>{node.style.transform='';});
  });
  // Details keep native semantics. Height animation adds continuity without hiding content.
  document.querySelectorAll('.service-rows details').forEach(details => {
    details.addEventListener('toggle', () => {
      if (details.open && activeMotion()) details.querySelector('div')?.animate(
        [{opacity:0,transform:'translateY(-8px)'},{opacity:1,transform:'translateY(0)'}],
        {duration:430,easing:'cubic-bezier(.22,1,.36,1)'}
      );
    });
  });
  document.addEventListener('focusin', event => {
    event.target.closest?.('.will-reveal')?.classList.add('is-in');
  });
  setLanguage(language);
  setMotion(paused);
})();
