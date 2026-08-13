import { useEffect, useState } from 'react';
import { UserCircle2, CheckCircle2, Landmark, BadgeCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import BankAccountForm from '../components/BankAccountForm';
import VerifiedBadgeForm from '../components/VerifiedBadgeForm';
import { fetchMyBadgeRequest } from '../lib/badge';

type ProfileRow = {
  full_name: string | null;
  phone: string | null;
  city: string | null;
  bank_account_name: string | null;
  bank_account_number: string | null;
  verified_badge: boolean;
};

type BadgeRequestRow = {
  id: string;
  status: string;
  created_at: string;
  reviewer_notes: string | null;
};

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [badgeRequest, setBadgeRequest] = useState<BadgeRequestRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingBank, setEditingBank] = useState(false);

  useEffect(() => {
    if (!user) return;

    supabase
      .from('profiles')
      .select('full_name, phone, city, bank_account_name, bank_account_number, verified_badge')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setProfile(data ?? null);
        setLoading(false);
      });

    fetchMyBadgeRequest().then(setBadgeRequest);
  }, [user]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Settings</h1>
          <p className="mt-2 text-gray-600">Manage your account and payout details</p>
        </div>

        <div className="rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <UserCircle2 className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold text-gray-900">Profile</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">{profile?.full_name || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900">{profile?.phone || '—'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-gray-500">City</dt>
              <dd className="font-medium text-gray-900">{profile?.city || '—'}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
          {editingBank || !profile?.bank_account_number ? (
            <BankAccountForm
              heading={profile?.bank_account_number ? 'Update your payout bank account' : 'Add your payout bank account'}
              description="This is where you'll be paid when a poster accepts your bid on a task."
              onSaved={(name) => {
                setProfile((p) => (p ? { ...p, bank_account_name: name } : p));
                setEditingBank(false);
              }}
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Landmark className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900">Payout bank account</h2>
              </div>
              <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-700">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  {profile.bank_account_name} · ****{profile.bank_account_number.slice(-4)}
                </span>
              </div>
              <button
                onClick={() => setEditingBank(true)}
                className="text-sm font-semibold text-primary hover:underline"
              >
                Change bank account
              </button>
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-gray-200/70 bg-white p-8 shadow-sm">
          {profile?.verified_badge ? (
            <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-blue-700">
              <BadgeCheck className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">You're verified.</span>
            </div>
          ) : badgeRequest && ['pending_payment', 'pending_review'].includes(badgeRequest.status) ? (
            <div className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 text-amber-700">
              <BadgeCheck className="h-5 w-5 shrink-0" />
              <span className="text-sm font-medium">
                {badgeRequest.status === 'pending_payment'
                  ? 'Payment in progress. If you already paid, refresh in a moment.'
                  : "Your verification is under review. We'll notify you once it's approved."}
              </span>
            </div>
          ) : (
            <VerifiedBadgeForm />
          )}
        </div>
      </div>
    </section>
  );
}
