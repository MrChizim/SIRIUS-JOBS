import { useState, type FormEvent } from 'react';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function RaiseDisputeForm({
  taskId,
  onRaised,
}: {
  taskId: string;
  onRaised: () => void;
}) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (reason.trim().length < 10) {
      setError('Please describe the issue in at least 10 characters.');
      return;
    }

    setSubmitting(true);
    const { error: rpcError } = await supabase.rpc('raise_dispute', {
      p_task_id: taskId,
      p_reason: reason.trim(),
    });
    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    onRaised();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-bold text-red-700">Raise a dispute</h3>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        className="w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:outline-none"
        placeholder="Explain what went wrong. Our team will review and decide how to resolve it."
      />
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Dispute'}
      </button>
    </form>
  );
}
