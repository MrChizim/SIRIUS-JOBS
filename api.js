(function () {
  const DEFAULT_BASE = 'http://localhost:4000';
  const explicitBase =
    typeof window !== 'undefined'
      ? window.SIRIUS_API_BASE || window.__ENV?.API_BASE
      : undefined;

  function resolveBase() {
    if (explicitBase) {
      return explicitBase.endsWith('/') ? explicitBase.slice(0, -1) : explicitBase;
    }
    if (typeof window === 'undefined') {
      return DEFAULT_BASE;
    }

    const origin = window.location.origin;
    if (!origin || origin === 'null' || origin.startsWith('file:')) {
      return DEFAULT_BASE;
    }

    try {
      const current = new URL(origin);
      const preferred = new URL(DEFAULT_BASE);
      const isSameHost =
        current.protocol === preferred.protocol &&
        current.hostname === preferred.hostname &&
        current.port === preferred.port;
      return isSameHost ? '' : DEFAULT_BASE;
    } catch {
      return DEFAULT_BASE;
    }
  }

  const API_BASE = resolveBase();

  function buildApiUrl(path) {
    if (!path) return API_BASE;
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    if (path.startsWith('/')) {
      return `${API_BASE}${path}`;
    }
    return `${API_BASE}/${path}`;
  }

  if (typeof window !== 'undefined') {
    window.__SIRIUS_API_BASE = API_BASE;
    window.__buildApiUrl = buildApiUrl;

    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, init) => {
      if (typeof input === 'string' && input.startsWith('/api/')) {
        return originalFetch(buildApiUrl(input), init);
      }
      return originalFetch(input, init);
    };
  }
})();
