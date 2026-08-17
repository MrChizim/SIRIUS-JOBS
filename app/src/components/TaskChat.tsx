import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, Send, Paperclip, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { uploadMessagePhoto, getMessagePhotoUrl } from '../lib/messagePhoto';

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string | null;
  image_url: string | null;
  created_at: string;
};

const POLL_INTERVAL_MS = 4000;

function MessagePhoto({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getMessagePhotoUrl(path).then((signedUrl) => {
      if (!cancelled) setUrl(signedUrl);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return <div className="h-40 w-40 animate-pulse rounded-xl bg-gray-200" />;
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt="Attached photo" className="max-h-60 max-w-full rounded-xl object-cover" />
    </a>
  );
}

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
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const hasLoadedOnce = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadMessages() {
    const { data } = await supabase
      .from('messages')
      .select('id, sender_id, recipient_id, body, image_url, created_at')
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
    if (!hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(photoFile);
    setPhotoPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [photoFile]);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setError(null);
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please choose an image file.');
        return;
      }
      setPhotoFile(file);
    }
    e.target.value = '';
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !photoFile) return;
    setError(null);
    setSending(true);

    try {
      let imagePath: string | null = null;
      if (photoFile) {
        imagePath = await uploadMessagePhoto(taskId, photoFile);
      }

      const { error: sendError } = await supabase.from('messages').insert({
        task_id: taskId,
        sender_id: currentUserId,
        recipient_id: otherUserId,
        body: body.trim() || null,
        image_url: imagePath,
      });

      if (sendError) throw new Error(sendError.message);

      setBody('');
      setPhotoFile(null);
      await loadMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your message.');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-gray-900">
          Chat with{' '}
          <Link to={`/users/${otherUserId}`} className="text-primary hover:underline">
            {otherUserLabel}
          </Link>
        </h2>
      </div>

      <div className="mb-4 max-h-80 space-y-2 overflow-y-auto rounded-2xl bg-gray-50 p-4">
        {messages.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No messages yet. Say hello.
          </p>
        ) : (
          messages.map((m) => {
            const isMine = m.sender_id === currentUserId;
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[75%] space-y-1.5 rounded-2xl px-4 py-2 text-sm ${
                    isMine ? 'bg-primary text-white' : 'border border-gray-200 bg-white text-gray-900'
                  }`}
                >
                  {m.image_url && <MessagePhoto path={m.image_url} />}
                  {m.body && <p>{m.body}</p>}
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

      {photoPreviewUrl && (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 p-2">
          <img src={photoPreviewUrl} alt="Selected photo preview" className="h-14 w-14 rounded-lg object-cover" />
          <span className="flex-1 truncate text-xs text-gray-500">{photoFile?.name}</span>
          <button
            type="button"
            onClick={() => setPhotoFile(null)}
            aria-label="Remove photo"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-200 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSend} className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Attach a photo"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-300 text-gray-500 transition-colors hover:border-primary hover:text-primary"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <input
          type="text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 rounded-full border border-gray-300 px-4 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || (!body.trim() && !photoFile)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-white transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label="Send message"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
