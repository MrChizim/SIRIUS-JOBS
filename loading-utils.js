/**
 * Loading utilities for Sirius Jobs dashboards
 * Provides skeleton loaders and loading states
 */

(function () {
  if (typeof window === 'undefined') return;

  /**
   * Create a skeleton loader HTML element
   * @param {string} type - Type of skeleton (card, list, table, text)
   * @param {number} count - Number of skeleton items to create
   * @returns {string} HTML string for skeleton loader
   */
  function createSkeleton(type = 'card', count = 3) {
    const skeletons = [];

    for (let i = 0; i < count; i++) {
      switch (type) {
        case 'card':
          skeletons.push(`
            <div class="bg-white rounded-xl border-2 border-gray-100 p-6 animate-pulse">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-5/6 mb-4"></div>
              <div class="flex gap-2 mt-4">
                <div class="h-8 bg-gray-200 rounded w-20"></div>
                <div class="h-8 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          `);
          break;

        case 'list':
          skeletons.push(`
            <div class="flex items-center gap-4 p-4 bg-white rounded-lg border border-gray-200 animate-pulse">
              <div class="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div class="flex-1">
                <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div class="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          `);
          break;

        case 'table':
          skeletons.push(`
            <tr class="animate-pulse">
              <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-full"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-full"></div></td>
              <td class="px-6 py-4"><div class="h-4 bg-gray-200 rounded w-full"></div></td>
              <td class="px-6 py-4"><div class="h-8 bg-gray-200 rounded w-20"></div></td>
            </tr>
          `);
          break;

        case 'text':
          skeletons.push(`
            <div class="animate-pulse">
              <div class="h-3 bg-gray-200 rounded w-full mb-2"></div>
              <div class="h-3 bg-gray-200 rounded w-5/6"></div>
            </div>
          `);
          break;

        default:
          skeletons.push(`
            <div class="h-20 bg-gray-200 rounded animate-pulse"></div>
          `);
      }
    }

    return skeletons.join('\n');
  }

  /**
   * Show loading skeleton in a container
   * @param {string|HTMLElement} container - Container element or selector
   * @param {string} type - Type of skeleton
   * @param {number} count - Number of skeleton items
   */
  function showSkeleton(container, type = 'card', count = 3) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    el.innerHTML = createSkeleton(type, count);
    el.classList.add('loading');
  }

  /**
   * Show a simple loading spinner
   * @param {string|HTMLElement} container - Container element or selector
   * @param {string} message - Loading message
   */
  function showSpinner(container, message = 'Loading...') {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    el.innerHTML = `
      <div class="flex flex-col items-center justify-center py-12">
        <div class="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-gray-600 font-medium">${message}</p>
      </div>
    `;
    el.classList.add('loading');
  }

  /**
   * Show empty state when no data is available
   * @param {string|HTMLElement} container - Container element or selector
   * @param {Object} options - Empty state options
   */
  function showEmptyState(container, options = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const {
      icon = 'inbox',
      title = 'No items found',
      message = 'There are no items to display at this time.',
      actionText = null,
      actionCallback = null
    } = options;

    const actionButton = actionText && actionCallback
      ? `<button onclick="(${actionCallback.toString()})()" class="mt-4 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all">${actionText}</button>`
      : '';

    el.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <i data-feather="${icon}" class="w-16 h-16 text-gray-300 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-600 max-w-md">${message}</p>
        ${actionButton}
      </div>
    `;

    // Replace feather icons if available
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    el.classList.remove('loading');
  }

  /**
   * Show error state when data loading fails
   * @param {string|HTMLElement} container - Container element or selector
   * @param {Object} options - Error state options
   */
  function showErrorState(container, options = {}) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;

    const {
      title = 'Something went wrong',
      message = 'We couldn\'t load the data. Please try again.',
      actionText = 'Try Again',
      actionCallback = null
    } = options;

    const actionButton = actionCallback
      ? `<button onclick="(${actionCallback.toString()})()" class="mt-4 px-6 py-2 bg-primary text-white font-bold rounded-lg hover:bg-primary/90 transition-all">${actionText}</button>`
      : '';

    el.innerHTML = `
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <i data-feather="alert-circle" class="w-16 h-16 text-red-500 mb-4"></i>
        <h3 class="text-xl font-bold text-gray-900 mb-2">${title}</h3>
        <p class="text-gray-600 max-w-md">${message}</p>
        ${actionButton}
      </div>
    `;

    // Replace feather icons if available
    if (typeof feather !== 'undefined') {
      feather.replace();
    }

    el.classList.remove('loading');
  }

  /**
   * Clear loading state and remove loading class
   * @param {string|HTMLElement} container - Container element or selector
   */
  function clearLoading(container) {
    const el = typeof container === 'string' ? document.querySelector(container) : container;
    if (!el) return;
    el.classList.remove('loading');
  }

  /**
   * Disable a button and show loading state
   * @param {string|HTMLElement} button - Button element or selector
   * @param {string} loadingText - Text to show while loading
   * @returns {Function} Function to restore button state
   */
  function setButtonLoading(button, loadingText = 'Loading...') {
    const btn = typeof button === 'string' ? document.querySelector(button) : button;
    if (!btn) return () => {};

    const originalText = btn.textContent;
    const originalDisabled = btn.disabled;

    btn.disabled = true;
    btn.textContent = loadingText;
    btn.classList.add('opacity-75', 'cursor-not-allowed');

    // Return function to restore original state
    return () => {
      btn.disabled = originalDisabled;
      btn.textContent = originalText;
      btn.classList.remove('opacity-75', 'cursor-not-allowed');
    };
  }

  // Expose utilities globally
  window.SiriusLoading = {
    createSkeleton,
    showSkeleton,
    showSpinner,
    showEmptyState,
    showErrorState,
    clearLoading,
    setButtonLoading
  };
})();
