(function () {
  if (typeof window === 'undefined') return;

  const STACK_ID = 'siriusToastStack';
  const ICONS = {
    success: 'check-circle',
    error: 'alert-triangle',
    info: 'info',
  };
  const CLASSES = {
    success: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    error: 'bg-red-100 text-red-700 border border-red-200',
    info: 'bg-primary/10 text-primary border border-primary/20',
  };

  function ensureStack() {
    let stack = document.getElementById(STACK_ID);
    if (!stack) {
      stack = document.createElement('div');
      stack.id = STACK_ID;
      stack.className = 'fixed top-20 right-4 z-[120] space-y-3 max-w-xs sm:max-w-sm';
      document.body.appendChild(stack);
    }
    return stack;
  }

  function showToast(message, tone = 'info', options = {}) {
    if (!message) return;
    const stack = ensureStack();
    const toneKey = tone in CLASSES ? tone : 'info';
    const toast = document.createElement('div');
    toast.role = 'status';
    toast.className = `px-4 py-3 rounded-xl shadow-lg flex items-start gap-3 transition-opacity duration-300 ${CLASSES[toneKey]}`;
    toast.innerHTML = `
      <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/70 text-primary flex-shrink-0">
        <i data-feather="${ICONS[toneKey]}" class="w-4 h-4"></i>
      </span>
      <span class="text-sm leading-snug">${message}</span>
    `;
    stack.appendChild(toast);
    try {
      window.feather?.replace();
    } catch {
      // ignore
    }

    const lifespan = typeof options.duration === 'number' ? options.duration : 3200;
    window.setTimeout(() => {
      toast.classList.add('opacity-0');
    }, lifespan);
    window.setTimeout(() => {
      toast.remove();
    }, lifespan + 400);
  }

  window.SiriusUI = window.SiriusUI || {};
  window.SiriusUI.showToast = showToast;
  window.SiriusUI.ensureToastStack = ensureStack;
})();
