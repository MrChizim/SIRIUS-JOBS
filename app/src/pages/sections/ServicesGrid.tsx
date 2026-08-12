import { Link } from 'react-router-dom';
import { Search, CheckCircle, ArrowRight, Wrench, Truck, ShieldCheck } from 'lucide-react';

export default function ServicesGrid() {
  return (
    <section className="py-24 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-16 text-center">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-bold tracking-wider text-primary uppercase">
            How You Get Things Done
          </span>
          <h2 className="mb-6 text-4xl font-black lg:text-6xl">
            One Platform,
            <br />
            <span className="text-primary">Every Kind of Task</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            From a quick errand to a full renovation, choose the path that fits the job
          </p>
        </div>

        <div className="grid auto-rows-fr grid-cols-1 gap-6 md:grid-cols-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary to-blue-700 p-8 text-white md:col-span-4 md:row-span-2 lg:p-12">
            <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="space-y-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                  <Search className="h-8 w-8" />
                </div>
                <div>
                  <h3 className="mb-4 text-3xl font-black lg:text-4xl">
                    Small &amp; Everyday Tasks
                  </h3>
                  <p className="mb-6 text-lg leading-relaxed text-white/80">
                    Errands, cleaning, moving, quick repairs. Post it, compare bids, pay through
                    escrow — released only when the job is done.
                  </p>
                  <ul className="space-y-3">
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5" />
                      <span>Payment held in escrow until you confirm</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5" />
                      <span>Bids from verified taskers</span>
                    </li>
                    <li className="flex items-center gap-3">
                      <CheckCircle className="h-5 w-5" />
                      <span>Built on Paystack, secure by default</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="mt-8">
                <Link
                  to="/post-a-task"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-8 py-4 font-bold text-primary transition-all hover:bg-gray-100"
                >
                  Post a Task
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 text-white md:col-span-2">
            <div className="absolute right-0 bottom-0 h-32 w-32 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/20">
                  <Wrench className="h-7 w-7 text-primary-300" />
                </div>
                <h3 className="text-2xl font-black">Big Trade Jobs</h3>
                <p className="leading-relaxed text-white/70">
                  Plumbing, building, electrical work. Get matched with pros, pay a small lead
                  fee, negotiate the job on your terms.
                </p>
              </div>
              <Link
                to="/post-a-task"
                className="group mt-4 inline-flex items-center gap-2 font-semibold text-primary-300"
              >
                Get Quotes
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-blue-50 p-8 md:col-span-2">
            <div className="absolute top-0 left-0 h-full w-full bg-gradient-to-br from-primary/5 to-transparent" />
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="space-y-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <Truck className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-2xl font-black text-gray-900">Browse Open Tasks</h3>
                <p className="leading-relaxed text-gray-600">
                  A tasker or tradesperson? See what's posted near you and start bidding.
                </p>
              </div>
              <Link
                to="/browse-tasks"
                className="group mt-4 inline-flex items-center gap-2 font-semibold text-primary"
              >
                View Tasks
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 p-8 md:col-span-4 lg:p-12">
            <div className="absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
            <div className="relative z-10 flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                    <ShieldCheck className="h-7 w-7 text-primary" />
                  </div>
                  <span className="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-bold tracking-wider text-primary uppercase">
                    Trust Signal
                  </span>
                </div>
                <h3 className="text-3xl font-black text-gray-900">Verified Badge</h3>
                <p className="text-lg leading-relaxed text-gray-600">
                  Taskers and professionals can earn a Verified Badge — ID-checked, credential
                  reviewed — so you know exactly who's showing up.
                </p>
              </div>
              <Link
                to="/for-professionals"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-4 font-bold whitespace-nowrap text-white shadow-lg transition-all hover:bg-primary-700"
              >
                Get Verified
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
