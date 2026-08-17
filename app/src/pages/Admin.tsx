import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  ExternalLink,
  Check,
  X,
  Scale,
  BarChart3,
  Users,
  ListChecks,
  Wallet,
  Flag,
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import {
  fetchBadgeRequests,
  getDocumentSignedUrl,
  decideBadgeRequest,
  type BadgeRequest,
} from '../lib/adminBadges';
import { fetchDisputes, decideDispute, type AdminDispute } from '../lib/adminDisputes';
import { fetchReports, decideReport, type AdminReport } from '../lib/adminReports';
import { fetchPlatformStats, type PlatformStats } from '../lib/adminStats';

const ADMIN_EMAILS = ['siriusoddjobs@gmail.com'];

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  );
}

function StatsTab() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlatformStats()
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load stats.'));
  }, []);

  if (error) {
    return <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  if (!stats) return <p className="text-sm text-gray-400">Loading…</p>;

  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;

  return (
    <>
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard icon={Users} label="Total users" value={stats.userCount.toLocaleString('en-NG')} />
        <StatCard
          icon={ListChecks}
          label="Tasks completed"
          value={stats.tasksCompleted.toLocaleString('en-NG')}
        />
        <StatCard
          icon={ListChecks}
          label="Tasks in progress"
          value={stats.tasksInProgress.toLocaleString('en-NG')}
        />
        <StatCard icon={ListChecks} label="Open tasks" value={stats.tasksOpen.toLocaleString('en-NG')} />
        <StatCard icon={Wallet} label="Escrow volume paid out" value={fmt(stats.totalVolume)} />
        <StatCard icon={Wallet} label="Commission earned" value={fmt(stats.totalCommission)} />
      </div>

      <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
        Top categories (completed tasks)
      </h2>
      {stats.topCategories.length === 0 ? (
        <p className="text-sm text-gray-400">No completed tasks yet.</p>
      ) : (
        <div className="space-y-2">
          {stats.topCategories.map((c) => (
            <div
              key={c.label}
              className="flex items-center justify-between rounded-xl border border-gray-200/70 bg-white px-4 py-3"
            >
              <span className="text-sm font-semibold text-gray-900">{c.label}</span>
              <span className="text-sm text-gray-500">{c.count}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function BadgesTab() {
  const [requests, setRequests] = useState<BadgeRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  useEffect(() => {
    fetchBadgeRequests()
      .then(setRequests)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load requests.'));
  }, []);

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

  if (requests === null) return <p className="text-sm text-gray-400">Loading…</p>;

  const pending = requests.filter((r) => r.status === 'pending_review');
  const others = requests.filter((r) => r.status !== 'pending_review');

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
        Pending review ({pending.length})
      </h2>
      <div className="mb-8 space-y-3">
        {pending.length === 0 && <p className="text-sm text-gray-400">Nothing pending.</p>}
        {pending.map((r) => (
          <div key={r.id} className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-bold text-gray-900">{r.profiles?.full_name || 'Unnamed user'}</p>
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

      <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">History</h2>
      <div className="space-y-2">
        {others.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm"
          >
            <span className="font-medium text-gray-900">{r.profiles?.full_name || 'Unnamed user'}</span>
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
  );
}

function DisputesTab() {
  const [disputes, setDisputes] = useState<AdminDispute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchDisputes()
      .then(setDisputes)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load disputes.'));
  }, []);

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
          prev?.map((x) => (x.id === d.id ? { ...x, status: 'resolved', resolution_notes: notes } : x)) ??
          null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDecidingId(null);
    }
  }

  if (disputes === null) return <p className="text-sm text-gray-400">Loading…</p>;

  const open = disputes.filter((d) => d.status === 'open');
  const resolved = disputes.filter((d) => d.status !== 'open');

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

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
          <div key={d.id} className="rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">{d.task_title}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 capitalize">
                {d.status}
              </span>
            </div>
            {d.resolution_notes && <p className="mt-1 text-xs text-gray-500">{d.resolution_notes}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

function ReportsTab() {
  const [reports, setReports] = useState<AdminReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [notesById, setNotesById] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchReports()
      .then(setReports)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load reports.'));
  }, []);

  async function handleDecide(r: AdminReport, decision: 'reviewed' | 'dismissed') {
    setError(null);
    setDecidingId(r.id);
    try {
      const notes = (notesById[r.id] ?? '').trim() || undefined;
      await decideReport(r.id, decision, notes);
      setReports(
        (prev) =>
          prev?.map((x) => (x.id === r.id ? { ...x, status: decision, admin_notes: notes ?? null } : x)) ??
          null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setDecidingId(null);
    }
  }

  if (reports === null) return <p className="text-sm text-gray-400">Loading…</p>;

  const open = reports.filter((r) => r.status === 'open');
  const resolved = reports.filter((r) => r.status !== 'open');

  return (
    <>
      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">
        Open ({open.length})
      </h2>
      <div className="mb-8 space-y-4">
        {open.length === 0 && <p className="text-sm text-gray-400">Nothing open.</p>}
        {open.map((r) => (
          <div key={r.id} className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
            <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-bold text-gray-900">
                  {r.target_type === 'task' ? (
                    <>
                      Task:{' '}
                      {r.task_id ? (
                        <Link to={`/tasks/${r.task_id}`} className="text-primary hover:underline">
                          {r.task_title || 'Untitled task'}
                        </Link>
                      ) : (
                        r.task_title || 'Untitled task'
                      )}
                    </>
                  ) : (
                    <>
                      User:{' '}
                      {r.reported_user_id ? (
                        <Link
                          to={`/users/${r.reported_user_id}`}
                          className="text-primary hover:underline"
                        >
                          {r.reported_user_name || 'Unnamed user'}
                        </Link>
                      ) : (
                        r.reported_user_name || 'Unnamed user'
                      )}
                    </>
                  )}
                </p>
                <p className="text-xs text-gray-400">
                  Reported by {r.reporter_name || 'a user'} on{' '}
                  {new Date(r.created_at).toLocaleDateString('en-NG')}
                </p>
              </div>
            </div>

            <p className="mb-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-700">{r.reason}</p>

            <textarea
              rows={2}
              value={notesById[r.id] ?? ''}
              onChange={(e) => setNotesById((prev) => ({ ...prev, [r.id]: e.target.value }))}
              placeholder="Admin notes (optional)"
              className="mb-3 w-full resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />

            <div className="flex gap-3">
              <button
                onClick={() => handleDecide(r, 'reviewed')}
                disabled={decidingId === r.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Check className="h-4 w-4" />
                Mark Reviewed
              </button>
              <button
                onClick={() => handleDecide(r, 'dismissed')}
                disabled={decidingId === r.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-600 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <X className="h-4 w-4" />
                Dismiss
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mb-3 text-sm font-bold tracking-wide text-gray-500 uppercase">History</h2>
      <div className="space-y-2">
        {resolved.map((r) => (
          <div key={r.id} className="rounded-xl border border-gray-200/70 bg-white px-4 py-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium text-gray-900">
                {r.target_type === 'task' ? r.task_title || 'Untitled task' : r.reported_user_name || 'Unnamed user'}
              </span>
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${
                  r.status === 'reviewed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {r.status}
              </span>
            </div>
            {r.admin_notes && <p className="mt-1 text-xs text-gray-500">{r.admin_notes}</p>}
          </div>
        ))}
      </div>
    </>
  );
}

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<'stats' | 'badges' | 'disputes' | 'reports'>('stats');

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);

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

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <h1 className="mb-8 text-2xl font-black text-gray-900">Admin</h1>

        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setTab('stats')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'stats' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Stats
          </button>
          <button
            onClick={() => setTab('badges')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'badges' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            Badge Requests
          </button>
          <button
            onClick={() => setTab('disputes')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'disputes' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Scale className="h-4 w-4" />
            Disputes
          </button>
          <button
            onClick={() => setTab('reports')}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
              tab === 'reports' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Flag className="h-4 w-4" />
            Reports
          </button>
        </div>

        {tab === 'stats' ? (
          <StatsTab />
        ) : tab === 'badges' ? (
          <BadgesTab />
        ) : tab === 'disputes' ? (
          <DisputesTab />
        ) : (
          <ReportsTab />
        )}
      </div>
    </section>
  );
}
