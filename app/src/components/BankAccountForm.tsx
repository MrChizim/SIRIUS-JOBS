import { useEffect, useState, type FormEvent } from 'react';
import { CheckCircle2, Landmark } from 'lucide-react';
import { fetchBanks, resolveBankAccount, saveBankAccount } from '../lib/escrow';

type Bank = { name: string; code: string };

export default function BankAccountForm({
  onSaved,
  heading = 'Add your payout bank account',
  description = "You need a verified bank account before you can bid — this is where you'll be paid when a poster accepts your bid.",
}: {
  onSaved: (accountName: string) => void;
  heading?: string;
  description?: string;
}) {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksLoading, setBanksLoading] = useState(true);
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBanks()
      .then(setBanks)
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load banks.'))
      .finally(() => setBanksLoading(false));
  }, []);

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResolvedName(null);
    setVerifying(true);

    try {
      const name = await resolveBankAccount({ accountNumber, bankCode });
      setResolvedName(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not verify this account.');
    } finally {
      setVerifying(false);
    }
  }

  async function handleSave() {
    setError(null);
    setSaving(true);

    try {
      const name = await saveBankAccount({ accountNumber, bankCode });
      onSaved(name);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this account.');
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Landmark className="h-5 w-5 text-primary" />
        <h3 className="font-bold text-gray-900">{heading}</h3>
      </div>
      <p className="text-sm text-gray-600">{description}</p>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {resolvedName ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3 text-green-700">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-sm font-medium">Account verified: {resolvedName}</span>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save & Continue'}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div>
            <label htmlFor="bankCode" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Bank
            </label>
            <select
              id="bankCode"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              required
              disabled={banksLoading}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="" disabled>
                {banksLoading ? 'Loading banks…' : 'Select your bank'}
              </option>
              {banks.map((b) => (
                <option key={b.code} value={b.code}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="accountNumber"
              className="mb-1.5 block text-sm font-semibold text-gray-900"
            >
              Account number
            </label>
            <input
              id="accountNumber"
              type="text"
              inputMode="numeric"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              required
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              placeholder="0123456789"
            />
          </div>
          <button
            type="submit"
            disabled={verifying || !bankCode || !accountNumber}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verifying ? 'Verifying…' : 'Verify Account'}
          </button>
        </form>
      )}
    </div>
  );
}
