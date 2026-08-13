import { useEffect, useState } from 'react';
import { Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { Dispute } from '../lib/types';

export default function DisputeStatusBanner({ taskId }: { taskId: string }) {
  const [dispute, setDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    supabase
      .from('disputes')
      .select('id, task_id, raised_by, reason, status, resolution_notes, created_at, resolved_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setDispute(data));
  }, [taskId]);

  if (!dispute) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
      <div className="flex items-center gap-2 text-amber-700">
        <Scale className="h-4 w-4" />
        <h3 className="text-sm font-bold">
          {dispute.status === 'open' ? 'Dispute under review' : 'Dispute resolved'}
        </h3>
      </div>
      <p className="mt-1 text-sm text-amber-800">
        {dispute.status === 'open'
          ? "Our team is reviewing this. We'll notify you once it's resolved."
          : dispute.resolution_notes || 'This dispute has been resolved.'}
      </p>
    </div>
  );
}
