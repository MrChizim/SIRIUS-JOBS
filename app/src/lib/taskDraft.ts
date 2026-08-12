const DRAFT_KEY = 'sirius_task_draft';

export type TaskDraft = {
  title: string;
  categorySlug: string;
  description: string;
  city: string;
  locationText: string;
  budgetMin: string;
  budgetMax: string;
};

export function saveTaskDraft(draft: TaskDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function loadTaskDraft(): TaskDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TaskDraft;
  } catch {
    return null;
  }
}

export function clearTaskDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
