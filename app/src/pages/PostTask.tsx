import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  FileText,
  Wallet,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { NIGERIAN_CITIES } from '../lib/cities';
import { saveTaskDraft, loadTaskDraft, clearTaskDraft, type TaskDraft } from '../lib/taskDraft';
import type { Category } from '../lib/types';

const STEPS = ['What', 'Location', 'Details', 'Review'] as const;

const emptyDraft: TaskDraft = {
  title: '',
  categorySlug: '',
  description: '',
  city: '',
  locationText: '',
  budgetMin: '',
  budgetMax: '',
};

export default function PostTask() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<TaskDraft>(emptyDraft);
  const [stepError, setStepError] = useState<string | null>(null);

  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [createdTaskId, setCreatedTaskId] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('categories')
      .select('slug, label, path')
      .order('label')
      .then(({ data }) => {
        setCategories(data ?? []);
        setCategoriesLoading(false);
      });
  }, []);

  // Restore a draft if we're returning from sign-in/sign-up, and auto-publish once
  // the user is actually authenticated.
  useEffect(() => {
    const saved = loadTaskDraft();
    if (saved) {
      setDraft(saved);
      setStep(3);
    }
  }, []);

  useEffect(() => {
    const saved = loadTaskDraft();
    if (user && saved && !createdTaskId && !publishing) {
      publish(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const selectedCategory = categories.find((c) => c.slug === draft.categorySlug);

  function update<K extends keyof TaskDraft>(key: K, value: TaskDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function goNext() {
    setStepError(null);

    if (step === 0 && (!draft.title.trim() || !draft.categorySlug)) {
      setStepError('Tell us what you need done and pick a category.');
      return;
    }
    if (step === 1 && !draft.city) {
      setStepError('Select your city.');
      return;
    }
    if (step === 2) {
      if (!draft.description.trim()) {
        setStepError('Add a description so taskers know what to expect.');
        return;
      }
      if (draft.budgetMin && draft.budgetMax && Number(draft.budgetMin) > Number(draft.budgetMax)) {
        setStepError('Minimum budget cannot be higher than maximum budget.');
        return;
      }
    }

    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function goBack() {
    setStepError(null);
    setStep((s) => Math.max(s - 1, 0));
  }

  async function publish(d: TaskDraft) {
    if (!user) return;

    setPublishing(true);
    setPublishError(null);

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        poster_id: user.id,
        title: d.title,
        description: d.description,
        category_slug: d.categorySlug,
        city: d.city,
        location_text: d.locationText || null,
        budget_min: d.budgetMin ? Number(d.budgetMin) : null,
        budget_max: d.budgetMax ? Number(d.budgetMax) : null,
      })
      .select('id')
      .single();

    setPublishing(false);

    if (error) {
      setPublishError(error.message);
      return;
    }

    clearTaskDraft();
    setCreatedTaskId(data.id);
  }

  function handlePublishClick() {
    if (user) {
      publish(draft);
      return;
    }
    saveTaskDraft(draft);
    navigate('/sign-up', { state: { from: { pathname: '/post-a-task' } } });
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
              : "Your task is live. Taskers nearby can now place bids, and you'll be able to compare and pick one."}
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
          <p className="mt-2 text-gray-600">Tell us what you need done. No account needed yet.</p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                  i <= step ? 'bg-primary text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 w-8 ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="space-y-5 rounded-3xl border border-gray-200/70 bg-white p-8 shadow-lg">
          {stepError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{stepError}</div>
          )}
          {publishError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {publishError}
            </div>
          )}

          {step === 0 && (
            <>
              <h2 className="text-lg font-bold text-gray-900">What do you need done?</h2>
              <div>
                <label
                  htmlFor="title"
                  className="mb-1.5 block text-sm font-semibold text-gray-900"
                >
                  In a few words
                </label>
                <input
                  id="title"
                  type="text"
                  autoFocus
                  value={draft.title}
                  onChange={(e) => update('title', e.target.value)}
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
                  value={draft.categorySlug}
                  onChange={(e) => update('categorySlug', e.target.value)}
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
                      ? "Taskers will bid on this job. Your payment stays safely on hold until you confirm the work is done, then it's released to them."
                      : 'Professionals matching this job will contact you directly to quote and arrange the work.'}
                  </p>
                )}
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900">Where is this task?</h2>
              </div>
              <div>
                <label htmlFor="city" className="mb-1.5 block text-sm font-semibold text-gray-900">
                  City
                </label>
                <select
                  id="city"
                  value={draft.city}
                  onChange={(e) => update('city', e.target.value)}
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
                  value={draft.locationText}
                  onChange={(e) => update('locationText', e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="e.g. GRA Phase 2"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-bold text-gray-900">Add the details</h2>
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
                  rows={4}
                  value={draft.description}
                  onChange={(e) => update('description', e.target.value)}
                  className="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                  placeholder="Give as much detail as you can: size, timing, materials needed, etc."
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <Wallet className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">
                  Budget <span className="font-normal text-gray-400">(optional)</span>
                </span>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="budgetMin"
                    className="mb-1.5 block text-sm font-semibold text-gray-900"
                  >
                    From (₦)
                  </label>
                  <input
                    id="budgetMin"
                    type="number"
                    min={0}
                    value={draft.budgetMin}
                    onChange={(e) => update('budgetMin', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="5000"
                  />
                </div>
                <div>
                  <label
                    htmlFor="budgetMax"
                    className="mb-1.5 block text-sm font-semibold text-gray-900"
                  >
                    To (₦)
                  </label>
                  <input
                    id="budgetMax"
                    type="number"
                    min={0}
                    value={draft.budgetMax}
                    onChange={(e) => update('budgetMax', e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    placeholder="10000"
                  />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-bold text-gray-900">Review your task</h2>
              <div className="space-y-3 rounded-2xl bg-gray-50 p-5">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Task</p>
                  <p className="font-semibold text-gray-900">{draft.title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Category</p>
                  <p className="text-gray-900">{selectedCategory?.label ?? draft.categorySlug}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Location</p>
                  <p className="text-gray-900">
                    {draft.locationText ? `${draft.locationText}, ` : ''}
                    {draft.city}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Description</p>
                  <p className="text-gray-900">{draft.description}</p>
                </div>
                {(draft.budgetMin || draft.budgetMax) && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Budget</p>
                    <p className="text-gray-900">
                      {draft.budgetMin && `₦${Number(draft.budgetMin).toLocaleString('en-NG')}`}
                      {draft.budgetMin && draft.budgetMax && ' – '}
                      {draft.budgetMax && `₦${Number(draft.budgetMax).toLocaleString('en-NG')}`}
                    </p>
                  </div>
                )}
              </div>

              {!user && (
                <p className="text-sm text-gray-600">
                  Almost there. You'll need to sign in or create a free account to publish this
                  task.
                </p>
              )}
              {publishing && (
                <p className="text-sm font-medium text-primary">Publishing your task…</p>
              )}
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 0 ? (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-5 py-3 text-sm font-bold text-gray-700 transition-all hover:bg-gray-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            ) : (
              <span />
            )}

            {step < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePublishClick}
                disabled={publishing}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {publishing ? 'Publishing…' : user ? 'Publish Task' : 'Continue to Sign Up'}
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
