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
        container.classList.add('site-mobile-list', 'grid', 'grid-cols-2', 'gap-3', 'p-4');
        container.querySelectorAll('a').forEach(link => {
          const href = link.getAttribute('href') || '';
          if (href === 'register.html' || link.classList.contains('site-mobile-skip')) {
            link.remove();
            return;
          }
          const label = (link.textContent || '').trim();
          const isMarketplace = /marketplace/i.test(label);
          link.className = '';
          link.classList.add(
            'site-mobile-link',
            'flex',
            'items-center',
            'justify-center',
            'gap-2',
            'rounded-lg',
            'shadow-sm',
            'bg-white',
            'py-2',
            'px-3',
            'text-sm',
            'font-medium',
            'border',
            'border-gray-200',
            'text-gray-700',
            'transition',
            'hover:shadow-md'
          );
          link.style.color = isMarketplace ? '#0056b3' : '#333333';
          link.innerHTML = `<span>${label}</span>`;
          if (!link.querySelector('i[data-feather]')) {
            const icon = document.createElement('i');
            icon.setAttribute('data-feather', 'arrow-right');
            icon.classList.add('w-4', 'h-4');
            icon.style.color = isMarketplace ? '#0056b3' : '#333333';
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
