import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';
import TaskChat from './TaskChat';

type ThreadPartner = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  lastMessageAt: string;
};

// Shows every distinct person who has messaged about this task, not just accepted or
// currently-bidding taskers — a tasker can message a poster before ever placing a
// bid, so a chat panel scoped only to bids would leave that message invisible to the
// poster, which is exactly what happened before this component existed.
export default function TaskMessageThreads({
  taskId,
  currentUserId,
  initialOpenPartnerId,
}: {
  taskId: string;
  currentUserId: string;
  initialOpenPartnerId?: string | null;
}) {
  const [partners, setPartners] = useState<ThreadPartner[] | null>(null);
  const [openPartnerId, setOpenPartnerId] = useState<string | null>(initialOpenPartnerId ?? null);

  useEffect(() => {
    supabase
      .from('messages')
      .select('sender_id, recipient_id, created_at')
      .eq('task_id', taskId)
      .order('created_at', { ascending: false })
      .then(async ({ data }) => {
        if (!data || data.length === 0) {
          setPartners([]);
          return;
        }

        const partnerIds = new Map<string, string>();
        for (const m of data) {
          const otherId = m.sender_id === currentUserId ? m.recipient_id : m.sender_id;
          if (otherId === currentUserId) continue;
          if (!partnerIds.has(otherId)) partnerIds.set(otherId, m.created_at);
        }

        if (partnerIds.size === 0) {
          setPartners([]);
          return;
        }

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', Array.from(partnerIds.keys()));

        setPartners(
          Array.from(partnerIds.entries()).map(([id, lastMessageAt]) => {
            const profile = profiles?.find((p) => p.id === id);
            return {
              id,
              full_name: profile?.full_name ?? null,
              avatar_url: profile?.avatar_url ?? null,
              lastMessageAt,
            };
          }),
        );
      });
  }, [taskId, currentUserId]);

  if (partners === null || partners.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-700">
        <MessageCircle className="h-4 w-4" />
        Messages
      </h3>
      {partners.map((p) => (
        <div key={p.id}>
          <button
            onClick={() => setOpenPartnerId((id) => (id === p.id ? null : p.id))}
            className="flex w-full items-center gap-3 rounded-2xl border border-gray-200/70 bg-white p-3 text-left transition-colors hover:border-primary/40"
          >
            <Avatar url={p.avatar_url} name={p.full_name} size={36} />
            <span className="flex-1">
              <Link
                to={`/users/${p.id}`}
                onClick={(e) => e.stopPropagation()}
                className="font-semibold text-gray-900 hover:text-primary hover:underline"
              >
                {p.full_name || 'Someone'}
              </Link>
            </span>
            <span className="text-xs font-semibold text-primary">
              {openPartnerId === p.id ? 'Close' : 'Open'}
            </span>
          </button>
          {openPartnerId === p.id && (
            <div className="mt-2">
              <TaskChat
                taskId={taskId}
                currentUserId={currentUserId}
                otherUserId={p.id}
                otherUserLabel={p.full_name || 'this user'}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
