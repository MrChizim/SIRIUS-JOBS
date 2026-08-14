import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';

const POLL_INTERVAL_MS = 15000;

type NotificationRow = {
  id: string;
  kind: string;
  task_id: string | null;
  sender_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
};

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function loadNotifications() {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id, kind, task_id, sender_id, body, read_at, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications(data ?? []);
  }

  useEffect(() => {
    if (!user) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      await supabase.rpc('mark_notifications_read');
      setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    }
  }

  async function handleClearAll() {
    if (!user) return;
    const previous = notifications;
    setNotifications([]);
    const { error } = await supabase.from('notifications').delete().eq('user_id', user.id);
    if (error) setNotifications(previous);
  }

  if (!user) return null;

  return (
    <div className="group relative">
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-gray-600 transition-colors hover:bg-gray-100 hover:text-primary"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-gray-200/70 bg-white p-2 shadow-lg">
          {notifications.length === 0 ? (
            <p className="px-3 py-4 text-center text-sm text-gray-400">No notifications yet.</p>
          ) : (
            <>
              <div className="flex items-center justify-between px-3 py-1.5">
                <span className="text-xs font-bold tracking-wide text-gray-400 uppercase">
                  Notifications
                </span>
                <button
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="max-h-96 space-y-1 overflow-y-auto">
                {notifications.map((n) => (
                  <Link
                    key={n.id}
                    to={
                      n.kind === 'new_message' && n.task_id && n.sender_id
                        ? `/tasks/${n.task_id}?openChatWith=${n.sender_id}`
                        : n.task_id
                          ? `/tasks/${n.task_id}`
                          : '/my-tasks'
                    }
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-2.5 text-sm text-gray-700 transition-colors hover:bg-gray-100"
                  >
                    {n.body}
                    <span className="mt-0.5 block text-xs text-gray-400">
                      {new Date(n.created_at).toLocaleString('en-NG', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
