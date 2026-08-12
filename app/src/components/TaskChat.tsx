import { useEffect, useRef, useState, type FormEvent } from 'react';
import { MessageCircle, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
};

const POLL_INTERVAL_MS = 4000;

export default function TaskChat({
  taskId,
  currentUserId,
  otherUserId,
  otherUserLabel,
}: {
  taskId: string;
  currentUserId: string;
  otherUserId: string;
  otherUserLabel: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .eq('task_id', taskId)
      .or(
        `and(sender_id.eq.${currentUserId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${currentUserId})`,
      )
      .order('created_at', { ascending: true });

    setMessages(data ?? []);
  }

  useEffect(() => {
    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId, otherUserId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setError(null);
    setSending(true);

    const { error: sendError } = await supabase.from('messages').insert({
      task_id: taskId,
      sender_id: currentUserId,
      recipient_id: otherUserId,
      body: body.trim(),
    });

    setSending(false);

    if (sendError) {
      setError(sendError.message);
      return;
    }

    setBody('');
    await loadMessages();
  }

  return (
    <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-gray-900">Chat with {otherUserLabel}</h2>
      </div>

      <div className="mb-4 max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-gray-50 p-4">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No messages yet — say hello.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                    isMine ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  {m.body}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <div className="mb-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
