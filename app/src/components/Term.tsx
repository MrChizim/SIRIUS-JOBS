import { useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';

const DEFINITIONS: Record<string, string> = {
  escrow:
    'Your payment is held safely by Sirius Jobs the moment you accept a bid. The tasker only gets paid once you confirm the job is done.',
  'lead fee':
    "A small one-time fee a professional pays to unlock chat with you on a trade job. It's not a payment for the work itself, that gets arranged directly between you and the professional.",
  'verified badge':
    "A trust signal on a tasker's profile showing our team has checked their ID and NIN.",
  dispute:
    "If something goes wrong with a job, either side can raise this while it's in progress. Our team steps in to review it and decide how the held payment should be handled.",
};

export default function Term({ children, word }: { children: React.ReactNode; word: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const definition = DEFINITIONS[word.toLowerCase()];

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (!definition) return <>{children}</>;

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-0.5 border-b border-dotted border-current font-inherit text-inherit"
        aria-expanded={open}
      >
        {children}
        <Info className="h-3 w-3 text-gray-400" />
      </button>
      {open && (
        <span className="absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 rounded-xl border border-gray-200 bg-white p-3 text-left text-xs leading-relaxed font-normal text-gray-600 normal-case shadow-lg">
          {definition}
        </span>
      )}
    </span>
  );
}
