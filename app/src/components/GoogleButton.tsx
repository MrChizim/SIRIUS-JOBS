import { useState } from 'react';
import { supabase } from '../lib/supabase';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.46 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.11A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.6H1.26a12 12 0 0 0 0 10.8l4.01-3.11Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.26 6.6l4.01 3.11C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

export default function GoogleButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      // Hardcoded to www rather than window.location.origin: the bare root domain
      // (siriusjobs.com.ng) has had intermittent DNS propagation issues, while www
      // has been consistently reachable. Revisit once the root domain is confirmed
      // stable everywhere.
      options: { redirectTo: 'https://www.siriusjobs.com.ng' },
    });

    if (oauthError) {
      setError(oauthError.message);
      setLoading(false);
    }
    // On success the browser redirects to Google, so no further state change here.
  }

  return (
    <div>
      {error && <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="flex w-full items-center justify-center gap-3 rounded-full border border-gray-300 bg-white px-6 py-3.5 font-bold text-gray-700 transition-all hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <GoogleIcon />
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>
    </div>
  );
}
