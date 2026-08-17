import { useState, type FormEvent } from 'react';
import { Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Target =
  | { type: 'task'; taskId: string }
  | { type: 'user'; userId: string };

export default function ReportForm({
  target,
  onReported,
  onCancel,
}: {
  target: Target;
  onReported: () => void;
  onCancel: () => void;
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setSubmitting(false);
      setError('You need to be signed in to report something.');
      return;
    }

    const { error: insertError } = await supabase.from('reports').insert({
      reporter_id: user.id,
      target_type: target.type,
      task_id: target.type === 'task' ? target.taskId : null,
      reported_user_id: target.type === 'user' ? target.userId : null,
      reason: reason.trim(),
    });

    setSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    onReported();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-red-200 bg-red-50 p-4">
      <div className="flex items-center gap-2">
        <Flag className="h-4 w-4 text-red-600" />
        <h3 className="text-sm font-bold text-red-700">
          Report this {target.type === 'task' ? 'task' : 'user'}
        </h3>
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}
      <textarea
        rows={3}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        required
        className="w-full resize-none rounded-xl border border-red-200 bg-white px-4 py-3 text-sm focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:outline-none"
        placeholder="What's wrong? Spam, a scam, abusive behavior, etc. Our team will review it."
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-sm font-bold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit Report'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-white px-5 py-2.5 text-sm font-bold text-red-700 transition-all hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
