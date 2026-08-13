import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Task } from '../lib/types';

export default function EditTaskForm({
  task,
  onSaved,
  onCancel,
}: {
  task: Task;
  onSaved: (updates: Pick<Task, 'title' | 'description' | 'budget_min' | 'budget_max'>) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description);
  const [budgetMin, setBudgetMin] = useState(task.budget_min?.toString() ?? '');
  const [budgetMax, setBudgetMax] = useState(task.budget_max?.toString() ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Title and description cannot be empty.');
      return;
    }
    if (budgetMin && budgetMax && Number(budgetMin) > Number(budgetMax)) {
      setError('Minimum budget cannot be higher than maximum budget.');
      return;
    }

    setSaving(true);
    const updates = {
      title: title.trim(),
      description: description.trim(),
      budget_min: budgetMin ? Number(budgetMin) : null,
      budget_max: budgetMax ? Number(budgetMax) : null,
    };

    const { error: updateError } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', task.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    onSaved(updates);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200/70 bg-gray-50 p-4">
      {error && <div className="rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-semibold text-gray-700">Description</label>
        <textarea
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          className="w-full resize-none rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Budget from (₦)</label>
          <input
            type="number"
            min={0}
            value={budgetMin}
            onChange={(e) => setBudgetMin(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">Budget to (₦)</label>
          <input
            type="number"
            min={0}
            value={budgetMax}
            onChange={(e) => setBudgetMax(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
