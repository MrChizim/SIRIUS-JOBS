import { useState } from 'react';
import {
  Search,
  Tag,
  MapPin,
  Users,
  Lock,
  MessageCircle,
  CheckCircle2,
  Wallet,
  AlertTriangle,
  Camera,
} from 'lucide-react';

type Track = 'poster' | 'tasker';

function StepCard({
  number,
  icon: Icon,
  title,
  children,
  note,
}: {
  number: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 border-b border-gray-100 py-8 last:border-0">
      <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-black text-white">
        {number}
      </div>
      <div>
        <h3 className="flex items-center gap-2 text-lg font-black text-gray-900">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </h3>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">{children}</p>
        {note && (
          <div className="mt-3 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-gray-200/70 bg-gray-50 px-4 py-2.5 text-xs text-gray-600">
            {note}
          </div>
        )}
      </div>
    </div>
  );
}

const posterSteps = [
  {
    icon: Search,
    title: 'Post what you need done',
    body: "Tap Post a Task from anywhere on the site. Describe the job in a few words and pick a category. Sirius Jobs automatically works out whether it's a Bid & Escrow job or a Get Quotes trade job based on the category you pick.",
    note: (
      <>
        <Tag className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          <b className="text-gray-900">Errands, cleaning, small repairs</b> go through Bid &amp;
          Escrow. <b className="text-gray-900">Plumbing, electrical, building work</b> go through
          Get Quotes.
        </span>
      </>
    ),
  },
  {
    icon: MapPin,
    title: 'Add location, details, and budget',
    body: "Set where the job is, a fuller description, and your budget. If the tasker might need to buy something, like groceries, set your budget to cover both the labor and a rough estimate of the items. You'll settle the exact purchase with the tasker directly once they're on-site.",
  },
  {
    icon: Users,
    title: 'Review bids as they come in',
    body: "Taskers submit bids with their price and a short message. Tap a bidder's name to see their rating, completed-job count, and past reviews before you decide.",
  },
  {
    icon: Lock,
    title: 'Accept a bid, and your payment is held, not sent',
    body: "Accepting a bid takes you to secure checkout for the bid amount. Your money is held safely, and the tasker isn't paid yet. It only releases once you confirm the job is done.",
    note: (
      <>
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>This is what "Payment held in escrow" means everywhere you see it on the site.</span>
      </>
    ),
  },
  {
    icon: MessageCircle,
    title: 'Chat and coordinate',
    body: "Once a bid's accepted, in-app chat opens with your tasker. If the job needs a purchase, they can send you a photo of the item and price right in the chat, and you can approve it before they buy. You can send photos too, so it's easy to show exactly what you mean.",
  },
  {
    icon: CheckCircle2,
    title: 'Confirm complete, then rate',
    body: "When the work is done, tap Mark Complete to release payment to the tasker right away. You'll then be asked to leave a star rating and a short review. This is what future posters see on their profile.",
    note: (
      <>
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
        <span>
          Something wrong? Use <b className="text-gray-900">Raise a dispute</b> instead of
          confirming. Our team reviews it before any money moves.
        </span>
      </>
    ),
  },
];

const taskerSteps = [
  {
    icon: Search,
    title: 'Browse open tasks near you',
    body: "From Browse Tasks, filter by location and category. Each listing shows the path, either Bid & Escrow or Get Quotes, and the budget range, so you know what kind of job it is before you open it.",
  },
  {
    icon: Tag,
    title: 'For Bid & Escrow jobs, place a bid',
    body: "Open the task and submit your price for the labor, plus an optional message. If the job needs materials or supplies, mention that in your message. You and the poster can agree on those separately once you're talking.",
  },
  {
    icon: Lock,
    title: 'For Get Quotes jobs, pay to unlock the lead',
    body: "Trade jobs don't use bidding. Pay a small one-time fee (5% of the job's budget, between ₦500 and ₦10,000) to unlock in-app chat with the poster, then quote and arrange the job directly with them.",
    note: (
      <>
        <MessageCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
        <span>
          The fee unlocks <b className="text-gray-900">chat</b>, not a phone number. Everything
          happens in the app.
        </span>
      </>
    ),
  },
  {
    icon: Camera,
    title: 'Do the job, chat as you go',
    body: "Once your bid's accepted, or your lead's purchased, chat opens with the poster. If you need to buy something for the job, message them the item and price, with a photo if you can, and let them pay the seller directly before you go ahead with the purchase.",
  },
  {
    icon: Wallet,
    title: 'Get paid, get rated',
    body: "For Bid & Escrow jobs, payment releases automatically the moment the poster confirms the job's complete, straight to your linked bank account. Add your payout account from Settings before your first bid can be accepted. Every completed job also earns you a review.",
  },
];

const glossary = [
  {
    term: 'Escrow',
    definition:
      'Your payment is held safely by Sirius Jobs the moment a bid is accepted. It only releases to the tasker once the poster confirms the job is done, so neither side has to pay or work first on trust alone.',
  },
  {
    term: 'Lead fee',
    definition:
      "The small one-time fee a professional pays on a trade job to unlock chat with the poster. It's not a payment for the work itself, that gets quoted and paid separately, directly between the two of you.",
  },
  {
    term: 'Verified Badge',
    definition:
      "A trust signal shown on a tasker's profile once our team has checked their ID and NIN. It's optional, but it helps you win more bids and leads.",
  },
  {
    term: 'Dispute',
    definition:
      "If something goes wrong with a job that's in progress, either the poster or the tasker can raise this. It pauses the held payment until our team reviews what happened and decides how it should be resolved.",
  },
  {
    term: 'Bid',
    definition:
      "A tasker's offer to do a Bid & Escrow job for a stated price, along with an optional message. A poster can compare multiple bids before choosing one to accept.",
  },
];

export default function Guide() {
  const [track, setTrack] = useState<Track>('poster');
  const steps = track === 'poster' ? posterSteps : taskerSteps;

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-bold tracking-wider text-primary uppercase">
          Getting Started
        </span>
        <h1 className="text-3xl font-black text-gray-900 lg:text-4xl">How Sirius Jobs works</h1>
        <p className="mt-3 max-w-xl text-gray-600">
          Whether you need something done or you're the one doing it, here's exactly how the
          platform works, step by step.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
            <span className="inline-block rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-bold tracking-wide text-green-700 uppercase">
              Bid &amp; Escrow
            </span>
            <p className="mt-2 text-sm text-gray-600">
              <b className="text-gray-900">Small, everyday jobs.</b> Cleaning, errands, small
              repairs, moving, furniture assembly. Taskers bid a price, you accept one, and
              payment is held safely until you confirm the job's done.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200/70 bg-white p-5 shadow-sm">
            <span className="inline-block rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold tracking-wide text-amber-800 uppercase">
              Get Quotes
            </span>
            <p className="mt-2 text-sm text-gray-600">
              <b className="text-gray-900">Bigger trade jobs.</b> Plumbing, electrical, building
              work, painting, AC repair. A professional pays a small fee to unlock chat with you,
              then quotes and arranges the job directly.
            </p>
          </div>
        </div>

        <div className="sticky top-20 z-10 mt-10 flex justify-center bg-white py-3">
          <div className="inline-flex gap-1 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              onClick={() => setTrack('poster')}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                track === 'poster' ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
              }`}
            >
              I need something done
            </button>
            <button
              onClick={() => setTrack('tasker')}
              className={`rounded-full px-5 py-2 text-sm font-bold transition-colors ${
                track === 'tasker' ? 'bg-primary text-white' : 'text-gray-600 hover:text-primary'
              }`}
            >
              I want to do tasks
            </button>
          </div>
        </div>

        <div className="mt-4">
          {steps.map((step, i) => (
            <StepCard
              key={step.title}
              number={String(i + 1)}
              icon={step.icon}
              title={step.title}
              note={step.note}
            >
              {step.body}
            </StepCard>
          ))}
        </div>

        <div className="mt-16">
          <h2 className="text-xl font-black text-gray-900">Key terms</h2>
          <p className="mt-1 text-sm text-gray-600">A few words you'll see around the site.</p>
          <div className="mt-4 space-y-3">
            {glossary.map((g) => (
              <div key={g.term} className="rounded-2xl border border-gray-200/70 bg-white p-4 shadow-sm">
                <p className="font-bold text-gray-900">{g.term}</p>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">{g.definition}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 rounded-2xl border border-gray-200/70 bg-gray-50 p-6 text-center">
          <p className="text-sm text-gray-600">
            Questions this didn't answer?{' '}
            <a href="/about#faq" className="font-semibold text-primary hover:underline">
              Check the FAQ
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
