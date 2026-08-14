import { useEffect, useState } from 'react';
import { Download, Share, X, SquarePlus } from 'lucide-react';

const DISMISSED_KEY = 'sirius_install_prompt_dismissed';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own non-standard flag for "already added to home screen"
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISSED_KEY)) return;

    // Android/Chrome fires this when the browser thinks the app is installable —
    // we capture it instead of letting the browser show its own generic prompt, so
    // we can trigger it from our own styled banner/button instead.
    function handleBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // iOS Safari never fires beforeinstallprompt — Apple doesn't support the API —
    // so on iOS we just show manual instructions instead, unconditionally.
    if (isIOS()) {
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  function handleDismiss() {
    setVisible(false);
    setShowIOSInstructions(false);
    localStorage.setItem(DISMISSED_KEY, 'true');
  }

  async function handleInstallClick() {
    if (isIOS()) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      localStorage.setItem(DISMISSED_KEY, 'true');
    }
    setDeferredPrompt(null);
  }

  if (!visible) return null;

  return (
    <div className="fixed inset-x-4 bottom-4 z-[1200] mx-auto max-w-md rounded-2xl border border-gray-200/70 bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:left-auto">
      {showIOSInstructions ? (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="font-bold text-gray-900">Add Sirius Jobs to your Home Screen</p>
            <button
              onClick={handleDismiss}
              aria-label="Dismiss"
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <ol className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                1
              </span>
              Tap the Share button <Share className="inline h-4 w-4 text-primary" /> in Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                2
              </span>
              Scroll down and tap "Add to Home Screen"{' '}
              <SquarePlus className="inline h-4 w-4 text-primary" />
            </li>
            <li className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                3
              </span>
              Tap "Add" — Sirius Jobs now opens like a regular app
            </li>
          </ol>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Download className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-gray-900">Install Sirius Jobs</p>
            <p className="text-xs text-gray-500">Add to your home screen for quick access</p>
          </div>
          <button
            onClick={handleInstallClick}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-700"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 text-gray-400 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
