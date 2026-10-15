(function() {
  const init = () => {
    document.querySelectorAll('.j4k-menu-toggle').forEach((btn) => {
      const header = btn.closest('header');
      const menu = header ? header.querySelector('.j4k-mobile-menu') : null;
      if (!menu) return;
      btn.addEventListener('click', () => {
        const open = menu.classList.toggle('hidden') === false;
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      menu.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          menu.classList.add('hidden');
          btn.setAttribute('aria-expanded', 'false');
        });
      });
    });

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = document.querySelectorAll('.j4k-reveal');
    if (reduce || !('IntersectionObserver' in window)) return;

    items.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.9) {
        el.classList.add('j4k-is-hidden');
      }
    });

    const observer = new IntersectionObserver((entries) => {
      let delay = 0;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.transitionDelay = delay + 'ms';
          entry.target.classList.remove('j4k-is-hidden');
          delay += 90;
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    items.forEach((el) => {
      if (el.classList.contains('j4k-is-hidden')) observer.observe(el);
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();