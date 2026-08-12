import { Search, MessageCircle, ShieldCheck } from 'lucide-react';

const steps = [
  {
    number: 1,
    icon: Search,
    title: 'Post Your Task',
    description:
      'Tell us what you need done — a quick errand or a big trade job. Add your budget and location, and go live in minutes.',
    marginClass: '',
  },
  {
    number: 2,
    icon: MessageCircle,
    title: 'Compare Bids',
    description:
      'Verified taskers and professionals bid on your task. Check ratings, chat, and pick the one that fits.',
    marginClass: 'lg:mt-12',
  },
  {
    number: 3,
    icon: ShieldCheck,
    title: 'Pay With Confidence',
    description:
      'Your payment is held in escrow and released only when you confirm the job is done — or pay a small lead fee for bigger trade work.',
    marginClass: 'lg:mt-24',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-gray-50 py-24 lg:py-32">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="mb-20 text-center">
          <span className="mb-4 inline-block rounded-full bg-primary/10 px-4 py-2 text-sm font-bold tracking-wider text-primary uppercase">
            How It Works
          </span>
          <h2 className="mb-6 text-4xl font-black lg:text-6xl">
            Get Started In <span className="text-primary">3 Simple Steps</span>
          </h2>
          <p className="mx-auto max-w-2xl text-xl text-gray-600">
            From posted task to finished job, without the back-and-forth
          </p>
        </div>

        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-3">
          {steps.map(({ number, icon: Icon, title, description, marginClass }) => (
            <div key={number} className={`relative ${marginClass}`}>
              <div className="absolute -top-4 -left-4 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <span className="text-3xl font-black text-primary">{number}</span>
              </div>
              <div className="rounded-3xl bg-white p-8 pt-12 shadow-lg transition-shadow hover:shadow-2xl">
                <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700">
                  <Icon className="h-8 w-8 text-white" />
                </div>
                <h3 className="mb-4 text-2xl font-black">{title}</h3>
                <p className="leading-relaxed text-gray-600">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
