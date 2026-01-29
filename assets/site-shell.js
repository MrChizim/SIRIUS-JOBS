(function(){
  if (typeof window === 'undefined') return;

  function ensureHomeLink(container, defaultClasses) {
    if (!container) return false;
    const existingHome = container.querySelector('a[href="index.html"], a[href="/"], a[href="./"]');
    const labelMatch = Array.from(container.querySelectorAll('a')).some((link) =>
      (link.textContent || '').trim().toLowerCase() === 'home',
    );
    if (existingHome || labelMatch) return false;
    const links = Array.from(container.querySelectorAll('a'));
    const template = links.find((link) => !!link.getAttribute('href'));
    const homeLink = document.createElement('a');
    homeLink.href = 'index.html';
    homeLink.textContent = 'Home';
    homeLink.className = template?.className || defaultClasses;
    if (template?.getAttribute('tabindex')) {
      homeLink.setAttribute('tabindex', template.getAttribute('tabindex'));
    }
    if (typeof window !== 'undefined') {
      const isHome =
        window.location.pathname === '/' ||
        window.location.pathname.endsWith('/index.html') ||
        window.location.pathname.endsWith('index.html');
      if (isHome) {
        homeLink.classList.remove('text-gray-600');
        homeLink.classList.add('text-primary', 'font-semibold');
        homeLink.setAttribute('aria-current', 'page');
      }
    }
    container.insertBefore(homeLink, container.firstChild || null);
    return true;
  }

  function enhanceNav(){
    const nav = document.querySelector('nav');
    if (!nav) return;
    if (nav.dataset.siriusShell === 'skip') {
      return;
    }
    const brand = nav.querySelector('a[href="index.html"], a[href="/"], a[href="./"]');
    if (brand) {
      brand.classList.add('nav-brand');
      brand.querySelectorAll('span:not(.sr-only)').forEach(span => span.remove());
      const logo = brand.querySelector('img');
      if (logo) {
        logo.classList.add('nav-brand__logo');
      }
    }

    let desktopHomeInserted = false;
    const desktopMenus = nav.querySelectorAll('.hidden.lg\\:flex, .lg\\:flex, .hidden.lg\\:grid');
    desktopMenus.forEach((menu) => {
      if (desktopHomeInserted) return;
      const inserted = ensureHomeLink(
        menu,
        'text-sm font-medium text-gray-600 hover:text-primary transition',
      );
      if (inserted) desktopHomeInserted = true;
    });

    const mobileMenu = document.getElementById('mobile-menu');
    if (mobileMenu) {
      const container = mobileMenu.querySelector('.container');
      if (container) {
        ensureHomeLink(
          container,
          'block px-4 py-2.5 text-sm font-medium text-gray-600 hover:text-primary hover:bg-gray-50 rounded-lg transition',
        );
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

  function ensureFavicon() {
    const existing = document.querySelector('link[rel="icon"]');
    if (existing) return;
    const favicon = document.createElement('link');
    favicon.rel = 'icon';
    favicon.type = 'image/png';
    favicon.href = 'images/logo.png';
    document.head.appendChild(favicon);
  }

  function showQuickLoader() {
    if (document.querySelector('.sirius-loader')) return;
    const loader = document.createElement('div');
    loader.className = 'sirius-loader';
    const logo = document.createElement('img');
    logo.src = 'images/logo.png';
    logo.alt = 'SiriusJobs';
    logo.className = 'sirius-loader__logo';
    loader.appendChild(logo);
    document.body.appendChild(loader);
    setTimeout(() => {
      loader.classList.add('sirius-loader--hide');
      setTimeout(() => loader.remove(), 400);
    }, 1000);
  }

  function initAnalytics() {
    const GA_ID = window.SIRIUS_GA_ID || 'G-XXXXXXX';
    if (!GA_ID || GA_ID.includes('XXXX')) return;
    if (document.querySelector(`script[data-ga="${GA_ID}"]`)) return;
    const gaScript = document.createElement('script');
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    gaScript.dataset.ga = GA_ID;
    document.head.appendChild(gaScript);
    const inline = document.createElement('script');
    inline.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${GA_ID}');
    `;
    document.head.appendChild(inline);
  }

  document.addEventListener('DOMContentLoaded', () => {
    ensureFavicon();
    showQuickLoader();
    initAnalytics();
    enhanceNav();
    try {
      window.feather?.replace();
    } catch {}
  });
})();
