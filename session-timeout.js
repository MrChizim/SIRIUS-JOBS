(function () {
  if (typeof window === 'undefined') return;

  const SESSION_TIMEOUT_HOURS = Number(window.__SESSION_TIMEOUT_HOURS || 24);
  const WARNING_MINUTES = 5;
  const CHECK_INTERVAL_MS = 60 * 1000; // Check every minute

  const sessionKeys = [
    'siriusWorkerAuth',
    'siriusEmployerAuth',
    'siriusClientAuth',
    'siriusProAuth',
    'siriusMarketplaceSession',
  ];

  function parseSession(key) {
    try {
      const data = sessionStorage.getItem(key);
      if (!data) return null;
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Failed to parse session ${key}:`, error);
      return null;
    }
  }

  function clearSession(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to clear session ${key}:`, error);
    }
  }

  function clearAllSessions() {
    sessionKeys.forEach(clearSession);
    localStorage.removeItem('siriusMarketplaceSession');
  }

  function getSessionAge(session) {
    if (!session || !session.loggedInAt) return null;
    const loginTime = new Date(session.loggedInAt).getTime();
    const now = Date.now();
    return Math.floor((now - loginTime) / 1000 / 60); // Age in minutes
  }

  function checkSessionTimeout() {
    const timeoutMinutes = SESSION_TIMEOUT_HOURS * 60;
    const warningThreshold = timeoutMinutes - WARNING_MINUTES;

    sessionKeys.forEach((key) => {
      const session = parseSession(key);
      if (!session) return;

      const ageMinutes = getSessionAge(session);
      if (ageMinutes === null) return;

      // Session expired
      if (ageMinutes >= timeoutMinutes) {
        clearSession(key);
        console.log(`Session ${key} expired after ${ageMinutes} minutes`);

        // Show notification if we're on a dashboard page
        if (window.location.pathname.includes('dashboard')) {
          alert(
            `Your session has expired after ${SESSION_TIMEOUT_HOURS} hours of inactivity. Please log in again.`,
          );
          window.location.href = '/login.html';
        }
      }
      // Warning before expiration
      else if (ageMinutes >= warningThreshold) {
        const minutesLeft = timeoutMinutes - ageMinutes;
        console.warn(`Session ${key} will expire in ${minutesLeft} minutes`);

        // Could show a warning banner here
        if (!window.__sessionWarningShown) {
          window.__sessionWarningShown = true;
          const showWarning = confirm(
            `Your session will expire in ${minutesLeft} minute(s). Do you want to continue working?`,
          );
          if (showWarning) {
            // Refresh session by updating loggedInAt
            session.loggedInAt = new Date().toISOString();
            sessionStorage.setItem(key, JSON.stringify(session));
            window.__sessionWarningShown = false;
          }
        }
      }
    });

    // Check marketplace session (uses localStorage)
    try {
      const marketplaceSession = localStorage.getItem('siriusMarketplaceSession');
      if (marketplaceSession) {
        const data = JSON.parse(marketplaceSession);
        if (data.signedInAt) {
          const ageMinutes = Math.floor((Date.now() - data.signedInAt) / 1000 / 60);
          if (ageMinutes >= timeoutMinutes) {
            localStorage.removeItem('siriusMarketplaceSession');
            if (window.location.pathname.includes('marketplace-dashboard')) {
              alert(`Your session has expired. Please log in again.`);
              window.location.href = '/login.html#merchant-login';
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error checking marketplace session:', error);
    }
  }

  // Start checking on page load
  function initSessionTimeout() {
    // Check immediately
    checkSessionTimeout();

    // Then check periodically
    setInterval(checkSessionTimeout, CHECK_INTERVAL_MS);

    // Also check when page becomes visible (tab switching)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        checkSessionTimeout();
      }
    });

    // Update session activity on user interaction
    const updateActivity = () => {
      sessionKeys.forEach((key) => {
        const session = parseSession(key);
        if (session) {
          session.lastActivity = new Date().toISOString();
          sessionStorage.setItem(key, JSON.stringify(session));
        }
      });
    };

    // Update activity on mouse move, keyboard, clicks (throttled)
    let activityTimeout;
    const throttledUpdateActivity = () => {
      if (activityTimeout) return;
      activityTimeout = setTimeout(() => {
        updateActivity();
        activityTimeout = null;
      }, 60000); // Update at most once per minute
    };

    document.addEventListener('mousemove', throttledUpdateActivity);
    document.addEventListener('keydown', throttledUpdateActivity);
    document.addEventListener('click', throttledUpdateActivity);
  }

  // Expose utilities
  window.SiriusSessionTimeout = {
    check: checkSessionTimeout,
    clearAll: clearAllSessions,
    getSessionAge: (key) => {
      const session = parseSession(key);
      return getSessionAge(session);
    },
    refreshSession: (key) => {
      const session = parseSession(key);
      if (session) {
        session.loggedInAt = new Date().toISOString();
        session.lastActivity = new Date().toISOString();
        sessionStorage.setItem(key, JSON.stringify(session));
      }
    },
  };

  // Auto-initialize
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSessionTimeout);
  } else {
    initSessionTimeout();
  }
})();
