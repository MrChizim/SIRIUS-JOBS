import { useState, type FormEvent } from 'react';
import { Star } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function ReviewForm({
  taskId,
  onSubmitted,
}: {
  taskId: string;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating === 0) {
      setError('Please select a star rating.');
      return;
    }

    setSubmitting(true);

    const { error: rpcError } = await supabase.rpc('submit_review', {
      p_task_id: taskId,
      p_rating: rating,
      p_comment: comment || null,
    });

    setSubmitting(false);

    if (rpcError) {
      setError(rpcError.message);
      return;
    }

    onSubmitted();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl bg-gray-50 p-4">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            className="p-0.5"
          >
            <Star
              className={`h-6 w-6 ${
                n <= (hoverRating || rating)
                  ? 'fill-amber-400 text-amber-400'
                  : 'fill-transparent text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        rows={2}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Leave a comment (optional)"
        className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
      />

      {error && <p className="text-sm text-red-700">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="rounded-full bg-primary px-5 py-2 text-sm font-bold text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {submitting ? 'Submitting…' : 'Submit Review'}
      </button>
    </form>
  );
}
