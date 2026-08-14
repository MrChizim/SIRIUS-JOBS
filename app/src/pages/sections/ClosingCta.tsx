import { Link } from 'react-router-dom';
import { PlusCircle, Search } from 'lucide-react';
import closingCta from '../../assets/photos/closing-cta.jpg';

export default function ClosingCta() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-blue-600 to-blue-800 py-24 text-white lg:py-32">
      <img
        src={closingCta}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/92 via-blue-600/90 to-blue-800/92" />
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-white blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-white blur-3xl" />
      </div>

      <div className="relative z-10 container mx-auto px-4 lg:px-8">
        <div className="mx-auto max-w-4xl space-y-8 text-center">
          <h2 className="text-4xl leading-tight font-black lg:text-6xl">
            Ready To Get
            <br />
            Your Task Done?
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-white/90">
            Join Nigerians posting tasks and taking on jobs every day. Get started for free.
          </p>
          <div className="flex flex-col justify-center gap-4 pt-4 sm:flex-row">
            <Link
              to="/post-a-task"
              className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-10 py-5 text-lg font-bold text-primary shadow-2xl transition-all hover:bg-gray-100"
            >
              <PlusCircle className="h-6 w-6" />
              Post a Task
            </Link>
            <Link
              to="/browse-tasks"
              className="inline-flex items-center justify-center gap-3 rounded-full border-2 border-white bg-white/10 px-10 py-5 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20"
            >
              <Search className="h-6 w-6" />
              Browse Tasks
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
