import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ExternalLink, Check, X } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchBadgeRequests,
  getDocumentSignedUrl,
  decideBadgeRequest,
  type BadgeRequest,
} from '../lib/adminBadges';

const ADMIN_EMAILS = ['siriusoddjobs@gmail.com'];

export default function AdminBadges() {
  const { user, loading: authLoading } = useAuth();
  const [requests, setRequests] = useState<BadgeRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

  useEffect(() => {
    if (!isAdmin) return;
    fetchBadgeRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load requests.'));
  }, [isAdmin]);

  async function handleViewDocument(path: string) {
    try {
      const url = await getDocumentSignedUrl(path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open document.');
    }
  }

  async function handleDecide(requestId: string, decision: 'approve' | 'reject') {
    setError(null);
    setDecidingId(requestId);
    try {
      await decideBadgeRequest(requestId, decision);
      setRequests(
        (prev) =>
          prev?.map((r) =>
            r.id === requestId ? { ...r, status: decision === 'approve' ? 'approved' : 'rejected' } : r,
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

  const pending = requests?.filter((r) => r.status === 'pending_review') ?? [];
  const others = requests?.filter((r) => r.status !== 'pending_review') ?? [];

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-black text-gray-900">Verified Badge Requests</h1>
          </div>
          <Link to="/admin/disputes" className="text-sm font-semibold text-primary hover:underline">
            Disputes
          </Link>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {requests === null ? (
          <p className="text-sm text-gray-400">Loading…</p>
        ) : (
          <>
            <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
              Pending review ({pending.length})
            </h2>
            <div className="mb-8 space-y-3">
              {pending.length === 0 && <p className="text-sm text-gray-400">Nothing pending.</p>}
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">
                        {r.profiles?.full_name || 'Unnamed user'}
                      </p>
                      <p className="text-sm text-gray-500">NIN: {r.nin}</p>
                      <p className="text-xs text-gray-400">
                        Submitted {new Date(r.created_at).toLocaleDateString('en-NG')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleViewDocument(r.id_document_url)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-primary hover:text-primary"
                    >
                      View ID
                      <ExternalLink className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleDecide(r.id, 'approve')}
                      disabled={decidingId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check className="h-4 w-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecide(r.id, 'reject')}
                      disabled={decidingId === r.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
              History
            </h2>
            <div className="space-y-2">
              {others.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm"
                >
                  <span className="font-medium text-gray-900">
                    {r.profiles?.full_name || 'Unnamed user'}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                      r.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : r.status === 'rejected'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
