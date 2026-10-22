'use strict';
(() => {
  const root = document.documentElement;
  const menu = document.querySelector('[data-nav]');
  const menuButton = document.querySelector('.menu-toggle');
  const langButton = document.querySelector('[data-language]');
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('[data-sector]')];
  const count = document.querySelector('.result-count');
  let language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'ar';
  let submitted = false;
  const isEn = () => language === 'en';
  function resultCount() {
    if (count) {
      const number = cards.filter(card => !card.hidden).length;
      count.textContent = isEn() ? `${number} demonstration projects shown` : `عدد المشروعات التوضيحية المعروضة: ${number}`;
    }
  }
  function submissionText() {
    const status = document.querySelector('.form-status');
    if (status && submitted) status.textContent = isEn()
      ? 'Demonstration complete. Nothing was sent or stored. Your entries remain in this page only.'
      : 'اكتملت المحاكاة. لم تُرسل أو تُحفظ أي بيانات. تظل المدخلات في هذه الصفحة فقط.';
  }
  function setLanguage(next) {
    language = next;
    root.lang = language;
    root.dir = isEn() ? 'ltr' : 'rtl';
    document.querySelectorAll('[data-ar][data-en]').forEach(node => { node.textContent = node.dataset[language]; });
    document.querySelectorAll('[data-alt-ar]').forEach(node => { node.alt = node.dataset.failed ? (isEn() ? 'Original conceptual architecture illustration; not a real project' : 'رسم معماري تصوري أصلي؛ لا يمثل مشروعاً حقيقياً') : (isEn() ? node.dataset.altEn : node.dataset.altAr); });
    if (langButton) {
      langButton.textContent = isEn() ? 'العربية' : 'English';
      langButton.lang = isEn() ? 'ar' : 'en';
      langButton.setAttribute('aria-label', isEn() ? 'Switch to Arabic' : 'Switch to English');
    }
    menu?.setAttribute('aria-label', isEn() ? 'Main navigation' : 'التنقل الرئيسي');
    document.querySelector('.filters')?.setAttribute('aria-label', isEn() ? 'Filter projects' : 'تصفية المشروعات');
    document.querySelectorAll('[data-locale-link]').forEach(link => {
      const target = new URL(link.getAttribute('href'), location.href);
      if (isEn()) target.searchParams.set('lang', 'en'); else target.searchParams.delete('lang');
      link.setAttribute('href', target.pathname.split('/').pop() + target.search + target.hash);
    });
    resultCount(); submissionText();
  }
  function closeMenu(returnFocus = false) {
    menu?.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
    if (returnFocus) menuButton?.focus();
  }
  menuButton?.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menuButton.setAttribute('aria-expanded', String(open));
    menu?.classList.toggle('is-open', open);
    if (open) menu?.querySelector('a')?.focus();
  });
  menu?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menuButton?.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!event.target.closest('.site-header')) closeMenu();
  });
  matchMedia('(min-width: 801px)').addEventListener('change', () => closeMenu());
  langButton?.addEventListener('click', () => setLanguage(isEn() ? 'ar' : 'en'));
  filters.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filters.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = category !== 'all' && card.dataset.sector !== category; });
    resultCount();
  }));
  document.querySelector('form')?.addEventListener('submit', event => {
    event.preventDefault();
    submitted = true;
    submissionText();
    document.querySelector('.form-status')?.focus();
  });
  setLanguage(language);
})();
