import { useState, type FormEvent } from 'react';
import { BadgeCheck, UploadCloud } from 'lucide-react';
import { uploadIdDocument, startBadgePayment, BADGE_FEE_NAIRA } from '../lib/badge';

export default function VerifiedBadgeForm() {
  const [nin, setNin] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please attach a photo or scan of your ID.');
      return;
    }
    if (nin.length !== 11) {
      setError('NIN must be 11 digits.');
      return;
    }

    setSubmitting(true);
    try {
      const idDocumentPath = await uploadIdDocument(file);
      const authorizationUrl = await startBadgePayment({ nin, idDocumentPath });
      window.location.href = authorizationUrl;
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2">
        <BadgeCheck className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-gray-900">Get Verified</h3>
      </div>
      <p className="text-sm text-gray-600">
        Pay a one-time fee of ₦{BADGE_FEE_NAIRA.toLocaleString('en-NG')} to submit your NIN and ID
        for review. Once approved, a Verified badge appears on your profile.
      </p>

      {error && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div>
        <label htmlFor="nin" className="mb-1.5 block text-sm font-semibold text-gray-900">
          NIN
        </label>
        <input
          id="nin"
          type="text"
          inputMode="numeric"
          maxLength={11}
          value={nin}
          onChange={(e) => setNin(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          placeholder="12345678901"
        />
      </div>
      <div>
        <label htmlFor="idFile" className="mb-1.5 block text-sm font-semibold text-gray-900">
          ID document
        </label>
        <label
          htmlFor="idFile"
          className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 hover:border-primary hover:text-primary"
        >
          <UploadCloud className="h-5 w-5" />
          {file ? file.name : 'Upload a clear photo (JPG/PNG/PDF)'}
        </label>
        <input
          id="idFile"
          type="file"
          accept="image/*,.pdf"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Uploading…' : `Pay ₦${BADGE_FEE_NAIRA.toLocaleString('en-NG')} & Submit`}
      </button>
    </form>
  );
}
