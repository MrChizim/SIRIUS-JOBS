import { Link } from 'react-router-dom';
import { Gavel, Wrench, ShieldCheck, BadgeCheck } from 'lucide-react';
import { useAuth } from '../../lib/AuthContext';

export default function ForProfessionalsSection() {
  const { user } = useAuth();

  return (
    <section id="for-professionals" className="scroll-mt-20 bg-white py-24 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-bold tracking-wider text-primary uppercase">
            For Taskers &amp; Professionals
          </span>
          <h2 className="mb-6 text-4xl font-black lg:text-6xl">
            Get Paid For <span className="text-primary">Work You Already Do</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            Whether you handle small everyday jobs or run a trade business, Sirius Jobs
            connects you with people who need exactly what you offer, near you, in Nigeria.
          </p>
        </div>

        <div className="mx-auto mb-12 grid max-w-5xl gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-gray-200/70 bg-gray-50 p-8 shadow-lg">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700">
              <Gavel className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-3 text-2xl font-black text-gray-900">Small Jobs</h3>
            <p className="mb-4 text-gray-600">
              Errands, cleaning, small repairs, and other quick tasks. Browse open tasks, bid your
              price, and chat with the poster before they decide.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Payment is charged and held securely the moment your bid is accepted.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                You get paid out directly to your bank account once the poster confirms the job
                is done.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Sirius Jobs takes a 10% commission from the job price. No other fees.
              </li>
            </ul>
          </div>

          <div className="rounded-3xl border border-gray-200/70 bg-gray-50 p-8 shadow-lg">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700">
              <Wrench className="h-7 w-7 text-white" />
            </div>
            <h3 className="mb-3 text-2xl font-black text-gray-900">Trade Jobs</h3>
            <p className="mb-4 text-gray-600">
              Plumbing, electrical, building work, and other bigger jobs that get quoted and
              negotiated directly with the client.
            </p>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Pay a small one-time fee (5% of the job's budget, ₦500–₦10,000) to unlock in-app
                chat with a client whose task matches your trade.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                Quote the job and arrange payment with the client yourself, just like any other
                referral.
              </li>
              <li className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                No commission on the job itself. The lead fee is the only cost.
              </li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mb-12 max-w-5xl rounded-3xl border border-gray-200/70 bg-gray-50 p-8 text-center lg:p-12">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <BadgeCheck className="h-7 w-7 text-primary" />
          </div>
          <h3 className="mb-3 text-2xl font-black text-gray-900">Stand Out With a Verified Badge</h3>
          <p className="mx-auto max-w-xl text-gray-600">
            Submit your NIN and ID for a one-time review to get a Verified Badge on your profile.
            It's a clear trust signal that helps you win more bids and leads. Manage it anytime
            from your account Settings once you're signed in.
          </p>
        </div>

        <div className="text-center">
          <Link
            to={user ? '/browse-tasks' : '/sign-up'}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-700 hover:shadow-xl"
          >
            {user ? 'Browse Open Tasks' : 'Sign Up Free'}
          </Link>
        </div>
      </div>
    </section>
  );
}
