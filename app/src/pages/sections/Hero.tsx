import { Link } from 'react-router-dom';
import { Search, ArrowRight, PlusCircle } from 'lucide-react';
import heroPrimary from '../../assets/photos/hero-primary.jpg';

export default function Hero() {
  return (
    <section className="overflow-hidden pt-12 pb-20 lg:pb-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-primary">
              <span>Post a task. Get bids. Pay securely.</span>
            </div>

            <h1 className="text-5xl leading-tight font-black lg:text-7xl">
              Get it done by <span className="text-primary">trusted</span> people near you
            </h1>

            <p className="text-xl leading-relaxed text-gray-600">
              From quick errands to big trade jobs, post what you need done, compare bids from
              verified Nigerian professionals, and pay with confidence, on your terms.
            </p>

            <div className="flex flex-col gap-4 sm:flex-row">
              <Link
                to="/post-a-task"
                className="group inline-flex items-center justify-center gap-3 rounded-full bg-primary px-8 py-4 font-bold text-white shadow-xl transition-all hover:bg-primary-700 hover:shadow-2xl"
              >
                <PlusCircle className="h-5 w-5" />
                Post a Task
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                to="/browse-tasks"
                className="inline-flex items-center justify-center gap-3 rounded-full bg-gray-100 px-8 py-4 font-bold text-gray-900 transition-all hover:bg-gray-200"
              >
                <Search className="h-5 w-5" />
                Browse Tasks
              </Link>
            </div>
          </div>

          <div className="relative px-4 pt-8 pb-6 sm:px-6">
            <div className="bento-card relative overflow-hidden rounded-3xl border border-gray-200/50 shadow-xl">
              <img
                src={heroPrimary}
                alt="A tradesperson fixing a kitchen sink"
                className="h-[340px] w-full object-cover sm:h-[420px] lg:h-[520px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            </div>

            <div className="animate-float absolute -bottom-4 left-0 w-60 rounded-2xl bg-white p-5 shadow-lg sm:left-2">
              <p className="text-sm font-semibold text-gray-500">New task nearby</p>
              <p className="mt-1 text-lg font-bold text-gray-900">Fix leaking kitchen sink</p>
              <p className="mt-1 text-sm text-primary">3 bids so far</p>
            </div>
            <div className="absolute top-0 right-0 w-56 rounded-2xl bg-primary p-5 text-white shadow-lg sm:right-2">
              <p className="text-sm font-semibold text-blue-100">Payment held in escrow</p>
              <p className="mt-1 text-lg font-bold">Released when you confirm</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
