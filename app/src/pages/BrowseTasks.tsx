import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Wallet, ArrowRight, Search, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { NIGERIAN_CITIES } from '../lib/cities';
import type { Category, Task } from '../lib/types';

function formatBudget(min: number | null, max: number | null) {
  const fmt = (n: number) => `₦${n.toLocaleString('en-NG')}`;
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return 'Budget not specified';
}

export default function BrowseTasks() {
  const { user } = useAuth();

  const [categories, setCategories] = useState<Category[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cityFilter, setCityFilter] = useState<string>('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');

  useEffect(() => {
    supabase
      .from('categories')
      .select('slug, label, path')
      .order('label')
      .then(({ data }) => setCategories(data ?? []));
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('profiles')
      .select('city')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.city) setCityFilter(data.city);
      });
  }, [user]);

  useEffect(() => {
    setLoading(true);
    setError(null);

    let query = supabase
      .from('tasks')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false });

    if (cityFilter) query = query.eq('city', cityFilter);
    if (categoryFilter) query = query.eq('category_slug', categoryFilter);

    query.then(({ data, error: fetchError }) => {
      if (fetchError) {
        setError('Could not load tasks. Please try again.');
      } else {
        setTasks(data ?? []);
      }
      setLoading(false);
    });
  }, [cityFilter, categoryFilter]);

  const categoryLabel = (slug: string) => categories.find((c) => c.slug === slug)?.label ?? slug;

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="container mx-auto">
        <div className="mb-10 text-center">
          <h1 className="text-4xl font-black text-gray-900">Browse Tasks</h1>
          <p className="mt-2 text-lg text-gray-600">
            {cityFilter ? `Open tasks in ${cityFilter}` : 'Open tasks across Nigeria'}
          </p>
          <Link
            to="/how-it-works"
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-primary"
          >
            <BookOpen className="h-3.5 w-3.5" />
            New here? See how it works
          </Link>
        </div>

        <div className="mx-auto mb-10 flex max-w-3xl flex-col gap-3 sm:flex-row">
          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none sm:w-auto"
          >
            <option value="">All Nigeria</option>
            {NIGERIAN_CITIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none sm:w-auto"
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mx-auto mb-8 max-w-3xl rounded-xl bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="mx-auto max-w-md py-20 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400">
              <Search className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">No open tasks here yet</h2>
            <p className="mt-2 text-gray-600">
              Try a different city or category, or be the first to post one.
            </p>
            <Link
              to="/post-a-task"
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:bg-primary-700"
            >
              Post a Task
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {tasks.map((task) => (
              <Link
                key={task.id}
                to={`/tasks/${task.id}`}
                className="bento-card flex flex-col rounded-3xl border border-gray-200/70 bg-white p-6 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">
                    {categoryLabel(task.category_slug)}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      task.path === 'escrow'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {task.path === 'escrow' ? 'Bid & Escrow' : 'Get Quotes'}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-gray-900">{task.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-gray-600">
                  {task.description}
                </p>

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {task.location_text ? `${task.location_text}, ` : ''}
                    {task.city ?? 'Location not set'}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
                  <Wallet className="h-4 w-4 shrink-0 text-gray-500" />
                  {formatBudget(task.budget_min, task.budget_max)}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
