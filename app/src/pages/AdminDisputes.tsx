import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { fetchDisputes, decideDispute, type AdminDispute } from '../lib/adminDisputes';

const ADMIN_EMAILS = ['siriusoddjobs@gmail.com'];

export default function AdminDisputes() {
  const { user, loading: authLoading } = useAuth();
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) return;
    fetchDisputes()
      .then(setDisputes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load disputes.'));
  }, [isAdmin]);

  async function handleDecide(d: AdminDispute, decision: 'release_to_tasker' | 'refund_to_poster') {
    const notes = (notesById[d.id] ?? '').trim();
    if (notes.length < 5) return;

    const confirmMsg =
      decision === 'release_to_tasker'
        ? `Release ₦${d.payout_amount.toLocaleString('en-NG')} to ${d.tasker_name ?? 'the tasker'}? This cannot be undone.`
        : `Refund ₦${d.amount.toLocaleString('en-NG')} to ${d.poster_name ?? 'the poster'}? This cannot be undone.`;
    if (!confirm(confirmMsg)) return;

    setError(null);
    setDecidingId(d.id);
    try {
      await decideDispute(d.id, decision, notes);
      setDisputes(
        (prev) =>
          prev?.map((x) =>
            x.id === d.id ? { ...x, status: 'resolved', resolution_notes: notes } : x,
          ) ?? null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDecidingId(null);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <section className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black text-gray-900">Not authorized</h1>
        <p className="mt-2 text-gray-600">This page is only available to Sirius Jobs admins.</p>
      </section>
    );
  }

  const open = disputes?.filter((d) => d.status === 'open') ?? [];
  const resolved = disputes?.filter((d) => d.status !== 'open') ?? [];

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Scale className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-gray-900">Disputes</h1>
          </div>
          <Link to="/admin/badges" className="text-sm font-semibold text-primary hover:underline">
            Badge requests
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {disputes === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
              Open ({open.length})
            </h2>
            <div className="mb-8 space-y-4">
              {open.length === 0 && <p className="text-sm text-gray-400">Nothing open.</p>}
              {open.map((d) => (
                <div key={d.id} className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-gray-900">{d.task_title}</p>
                      <p className="text-xs text-gray-400">
                        Raised by {d.raised_by_role} on {new Date(d.created_at).toLocaleDateString('en-NG')}
                      </p>
                    </div>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 capitalize">
                      {d.task_status}
                    </span>
                  </div>

                  <p className="mb-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{d.reason}</p>

                  <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Poster</p>
                      <p className="text-gray-900">{d.poster_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Tasker</p>
                      <p className="text-gray-900">{d.tasker_name || 'Unknown'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Full charge</p>
                      <p className="text-gray-900">₦{d.amount.toLocaleString('en-NG')}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Tasker payout</p>
                      <p className="text-gray-900">₦{d.payout_amount.toLocaleString('en-NG')}</p>
                    </div>
                  </div>

                  <textarea
                    rows={2}
                    value={notesById[d.id] ?? ''}
                    onChange={(e) => setNotesById((prev) => ({ ...prev, [d.id]: e.target.value }))}
                    placeholder="Resolution notes (required before deciding)"
                    className="mb-3 w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  />

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleDecide(d, 'release_to_tasker')}
                      disabled={decidingId === d.id || (notesById[d.id] ?? '').trim().length < 5}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Release to Tasker
                    </button>
                    <button
                      onClick={() => handleDecide(d, 'refund_to_poster')}
                      disabled={decidingId === d.id || (notesById[d.id] ?? '').trim().length < 5}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Refund to Poster
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">History</h2>
            <div className="space-y-2">
              {resolved.map((d) => (
                <div
                  key={d.id}
                  className="rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{d.task_title}</span>
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 capitalize">
                      {d.status}
                    </span>
                  </div>
                  {d.resolution_notes && (
                    <p className="mt-1 text-xs text-gray-500">{d.resolution_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
