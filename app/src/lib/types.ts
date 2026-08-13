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

export type Profile = {
  id: string;
  full_name: string | null;
  city: string | null;
  verified_badge: boolean;
  rating_avg: number;
  rating_count: number;
  completion_count: number;
  avatar_url: string | null;
};

export type Review = {
  id: string;
  task_id: string;
  reviewer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
};

export type DisputeStatus = 'open' | 'resolved' | 'escalated';

export type Dispute = {
  id: string;
  task_id: string;
  raised_by: string;
  reason: string;
  status: DisputeStatus;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};
