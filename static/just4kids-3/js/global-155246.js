(function() {
  const init = () => {
    const toggles = document.querySelectorAll('.j4k-menu-toggle');
    const menus = document.querySelectorAll('.j4k-mobile-menu');

    toggles.forEach((toggle, index) => {
      toggle.addEventListener('click', () => {
        const menu = menus[index];
        if (menu) {
          menu.classList.toggle('hidden');
        }
      });
    });

    const reveals = document.querySelectorAll('.j4k-reveal');
    if ('IntersectionObserver' in window) {
      reveals.forEach((el) => el.classList.add('is-hidden'));
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('is-hidden');
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      reveals.forEach((el) => observer.observe(el));
    }
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();