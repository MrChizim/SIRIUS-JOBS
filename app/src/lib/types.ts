export type TaskPath = 'escrow' | 'lead_fee';

export type TaskStatus =
  | 'open'
  | 'bidding_closed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'disputed';

export type Category = {
  slug: string;
  label: string;
  path: TaskPath;
};

export type Task = {
  id: string;
  poster_id: string;
  title: string;
  description: string;
  category_slug: string;
  path: TaskPath;
  budget_min: number | null;
  budget_max: number | null;
  location_text: string | null;
  city: string | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
};
