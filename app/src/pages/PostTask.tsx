import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { NIGERIAN_CITIES } from '../lib/cities';
import type { Category } from '../lib/types';

export default function PostTask() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [city, setCity] = useState('');
  const [locationText, setLocationText] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('slug, label, path')
      .order('label')
      .then(({ data, error: catError }) => {
        if (catError) {
          setError('Could not load task categories. Please refresh and try again.');
        } else {
          setCategories(data ?? []);
        }
        setCategoriesLoading(false);
      });
  }, []);

  const selectedCategory = categories.find((c) => c.slug === categorySlug);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!user) return;

    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
      setError('Minimum budget cannot be higher than maximum budget.');
      return;
    }

    setLoading(true);

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({
        poster_id: user.id,
        title,
        description,
        category_slug: categorySlug,
        city,
        location_text: locationText || null,
        budget_min: budgetMin ? Number(budgetMin) : null,
        budget_max: budgetMax ? Number(budgetMax) : null,
      })
      .select('id')
      .single();

    setLoading(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setCreatedTaskId(data.id);
  }

  if (createdTaskId) {
    return (
      <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 py-16">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-green-100 text-green-600">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Task posted</h1>
          <p className="mt-3 text-gray-600">
            {selectedCategory?.path === 'lead_fee'
              ? "Your task is live. Professionals in your category will be able to purchase this lead and reach out to you directly."
              : 'Your task is live. Taskers nearby can now place bids — you\'ll be able to compare and pick one.'}
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={() => navigate('/browse-tasks')}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-primary-700"
            >
              View Open Tasks
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-16">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <PlusCircle className="h-6 w-6" />
          </div>
          <h1 className="text-3xl font-black text-gray-900">Post a task</h1>
          <p className="mt-2 text-gray-600">
            Tell us what you need done — takes about a minute
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-3xl border border-gray-200/70 bg-white p-8 shadow-lg"
        >
          {error && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          <div>
            <label htmlFor="title" className="mb-1.5 block text-sm font-semibold text-gray-900">
              Task title
            </label>
            <input
              id="title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              placeholder="e.g. Fix leaking kitchen sink"
            />
          </div>

          <div>
            <label
              htmlFor="category"
              className="mb-1.5 block text-sm font-semibold text-gray-900"
            >
              Category
            </label>
            <select
              id="category"
              required
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              disabled={categoriesLoading}
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="" disabled>
                {categoriesLoading ? 'Loading categories…' : 'Select a category'}
              </option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
            {selectedCategory && (
              <p className="mt-1.5 text-xs text-gray-500">
                {selectedCategory.path === 'escrow'
                  ? 'Small task — taskers bid, payment is held securely until you confirm the job is done.'
                  : 'Trade job — matched professionals will reach out directly to quote and arrange the work.'}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-sm font-semibold text-gray-900"
            >
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              placeholder="Give as much detail as you can — size, timing, materials needed, etc."
            />
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="city" className="mb-1.5 block text-sm font-semibold text-gray-900">
                City
              </label>
              <select
                id="city"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
              >
                <option value="" disabled>
                  Select your city
                </option>
                {NIGERIAN_CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="locationText"
                className="mb-1.5 block text-sm font-semibold text-gray-900"
              >
                Area / neighborhood
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="locationText"
                type="text"
                value={locationText}
                onChange={(e) => setLocationText(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                placeholder="e.g. GRA Phase 2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="budgetMin"
                className="mb-1.5 block text-sm font-semibold text-gray-900"
              >
                Budget from (₦)
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="budgetMin"
                type="number"
                min={0}
                value={budgetMin}
                onChange={(e) => setBudgetMin(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                placeholder="5000"
              />
            </div>
            <div>
              <label
                htmlFor="budgetMax"
                className="mb-1.5 block text-sm font-semibold text-gray-900"
              >
                Budget to (₦)
                <span className="ml-1 font-normal text-gray-400">(optional)</span>
              </label>
              <input
                id="budgetMax"
                type="number"
                min={0}
                value={budgetMax}
                onChange={(e) => setBudgetMax(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                placeholder="10000"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || categoriesLoading}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Posting…' : 'Post Task'}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </section>
  );
}
