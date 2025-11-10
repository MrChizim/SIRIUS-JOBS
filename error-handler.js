/**
 * Global Error Handler for Sirius Jobs
 * Handles network errors, API failures, and uncaught exceptions
 */

(function () {
  if (typeof window === 'undefined') return;

  // Configuration
  const config = {
    showToast: true,
    logToConsole: true,
    reportToServer: false, // Set to true to send errors to backend
    serverEndpoint: '/api/errors/log',
  };

  /**
   * Error types
   */
  const ErrorType = {
    NETWORK: 'NETWORK_ERROR',
    API: 'API_ERROR',
    AUTHENTICATION: 'AUTH_ERROR',
    VALIDATION: 'VALIDATION_ERROR',
    RUNTIME: 'RUNTIME_ERROR',
    UNKNOWN: 'UNKNOWN_ERROR'
  };

  /**
   * Determine error type from error object
   */
  function getErrorType(error) {
    if (!error) return ErrorType.UNKNOWN;

    if (error instanceof TypeError && error.message.includes('fetch')) {
      return ErrorType.NETWORK;
    }

    if (error.status === 401 || error.status === 403) {
      return ErrorType.AUTHENTICATION;
    }

    if (error.status >= 400 && error.status < 500) {
      return ErrorType.VALIDATION;
    }

    if (error.status >= 500) {
      return ErrorType.API;
    }

    return ErrorType.RUNTIME;
  }

  /**
   * Get user-friendly error message
   */
  function getUserMessage(error, errorType) {
    const defaultMessages = {
      [ErrorType.NETWORK]: 'Unable to connect to the server. Please check your internet connection and try again.',
      [ErrorType.API]: 'Something went wrong on our end. Please try again in a few moments.',
      [ErrorType.AUTHENTICATION]: 'Your session has expired. Please log in again.',
      [ErrorType.VALIDATION]: 'Please check your input and try again.',
      [ErrorType.RUNTIME]: 'An unexpected error occurred. Please refresh the page.',
      [ErrorType.UNKNOWN]: 'Something went wrong. Please try again.'
    };

    // Use error message if available, otherwise use default
    if (error?.message && !error.message.includes('fetch')) {
      return error.message;
    }

    return defaultMessages[errorType] || defaultMessages[ErrorType.UNKNOWN];
  }

  /**
   * Log error to console
   */
  function logError(error, context = {}) {
    if (!config.logToConsole) return;

    console.group('%c[Sirius Error Handler]', 'color: #ef4444; font-weight: bold');
    console.error('Error:', error);
    console.log('Context:', context);
    console.log('Timestamp:', new Date().toISOString());
    console.log('User Agent:', navigator.userAgent);
    console.log('URL:', window.location.href);
    console.groupEnd();
  }

  /**
   * Report error to server
   */
  async function reportError(error, context = {}) {
    if (!config.reportToServer) return;

    try {
      await fetch(config.serverEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: error?.message || 'Unknown error',
          stack: error?.stack,
          type: context.type,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          context
        })
      });
    } catch (reportError) {
      console.warn('Failed to report error to server:', reportError);
    }
  }

  /**
   * Show error toast notification
   */
  function showErrorToast(message, errorType) {
    if (!config.showToast) return;

    // Use SiriusUI toast if available
    if (window.SiriusUI?.showToast) {
      window.SiriusUI.showToast(message, 'error');
      return;
    }

    // Fallback: Create simple toast
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-red-600 text-white px-6 py-4 rounded-lg shadow-lg max-w-md z-50 animate-slide-up';
    toast.innerHTML = `
      <div class="flex items-start gap-3">
        <svg class="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="flex-1">
          <p class="font-semibold mb-1">Error</p>
          <p class="text-sm text-white/90">${message}</p>
        </div>
        <button onclick="this.parentElement.parentElement.remove()" class="text-white/80 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    `;

    document.body.appendChild(toast);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(100px)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  /**
   * Handle authentication errors
   */
  function handleAuthError() {
    // Clear session
    sessionStorage.clear();

    // Clear remember me if not checked
    const remembered = localStorage.getItem('siriusRememberMe');
    if (!remembered) {
      localStorage.removeItem('siriusRememberMe');
      localStorage.removeItem('siriusRememberMeConsult');
    }

    // Show message
    showErrorToast('Your session has expired. Redirecting to login...', ErrorType.AUTHENTICATION);

    // Redirect to login after 2 seconds
    setTimeout(() => {
      window.location.href = 'login.html?expired=true';
    }, 2000);
  }

  /**
   * Main error handler
   */
  function handleError(error, context = {}) {
    const errorType = getErrorType(error);
    const userMessage = getUserMessage(error, errorType);

    // Log error
    logError(error, { ...context, type: errorType });

    // Report to server
    reportError(error, { ...context, type: errorType });

    // Handle authentication errors specially
    if (errorType === ErrorType.AUTHENTICATION) {
      handleAuthError();
      return;
    }

    // Show user-friendly message
    showErrorToast(userMessage, errorType);
  }

  /**
   * Wrap fetch to automatically handle errors
   */
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    try {
      const response = await originalFetch(...args);

      // Handle HTTP errors
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.status = response.status;
        error.response = response;

        // Try to get error message from response body
        try {
          const data = await response.clone().json();
          if (data.error || data.message) {
            error.message = data.error || data.message;
          }
        } catch (e) {
          // Ignore JSON parse errors
        }

        throw error;
      }

      return response;
    } catch (error) {
      // Add context about the request
      error.url = args[0];
      error.method = args[1]?.method || 'GET';

      // Don't automatically handle errors for fetch calls
      // Let the caller decide whether to handle or rethrow
      throw error;
    }
  };

  /**
   * Global error event listener
   */
  window.addEventListener('error', (event) => {
    handleError(event.error, {
      source: 'window.error',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });

  /**
   * Global unhandled promise rejection listener
   */
  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, {
      source: 'unhandledrejection',
      promise: event.promise
    });
  });

  /**
   * Add CSS for toast animation
   */
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slide-up {
      from {
        opacity: 0;
        transform: translateY(100px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    .animate-slide-up {
      animation: slide-up 0.3s ease-out;
    }
  `;
  document.head.appendChild(style);

  // Expose error handler globally
  window.SiriusErrorHandler = {
    handle: handleError,
    configure: (options) => Object.assign(config, options),
    ErrorType
  };

  console.log('%c[Sirius Error Handler] Initialized', 'color: #10b981; font-weight: bold');
})();
