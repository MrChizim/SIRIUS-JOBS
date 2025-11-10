(function(){
  if (typeof window === 'undefined') return;

  function enhanceNav(){
    const nav = document.querySelector('nav');
    if (!nav) return;
    const brand = nav.querySelector('a[href="index.html"], a[href="/"], a[href="./"]');
    if (brand) {
      brand.classList.add('nav-brand');
      brand.querySelectorAll('span:not(.sr-only)').forEach(span => span.remove());
      const logo = brand.querySelector('img');
      if (logo) {
        logo.classList.add('nav-brand__logo');
      }
    }

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
      const container = mobileMenu.querySelector('.container');
      if (container) {
        container.classList.add('site-mobile-list');
        container.querySelectorAll('a').forEach(link => {
          link.classList.add('site-mobile-link');
          if (!link.querySelector('i[data-feather]')) {
            const icon = document.createElement('i');
            icon.setAttribute('data-feather', 'arrow-right');
            link.appendChild(icon);
          }
        });
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    enhanceNav();
    try {
      window.feather?.replace();
    } catch {}
  });
})();
