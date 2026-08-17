import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Star, CheckCircle2, MapPin, BadgeCheck, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import Avatar from '../components/Avatar';
import ReportForm from '../components/ReportForm';
import type { Profile, Review } from '../lib/types';

export default function PublicProfile() {
  const { userId } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reported, setReported] = useState(false);

  useEffect(() => {
    if (!userId) return;

    setLoading(true);

    supabase
      .from('profiles')
      .select('id, full_name, city, verified_badge, rating_avg, rating_count, completion_count, avatar_url')
      .eq('id', userId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (error || !data) {
          setNotFound(true);
          setLoading(false);
          return;
        }
        setProfile(data);

        const { data: reviewData } = await supabase
          .from('reviews')
          .select('id, task_id, reviewer_id, rating, comment, created_at, profiles!reviewer_id(full_name)')
          .eq('reviewee_id', userId)
          .order('created_at', { ascending: false });

        setReviews(
          (reviewData ?? []).map((r) => ({
            ...r,
            reviewer_name:
              (r.profiles as unknown as { full_name: string | null } | null)?.full_name ?? null,
          })),
        );
        setLoading(false);
      });
  }, [userId]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <section className="flex min-h-[calc(100vh-5rem)] flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-black text-gray-900">Profile not found</h1>
        <Link to="/browse-tasks" className="mt-6 font-semibold text-primary hover:underline">
          Back to Browse Tasks
        </Link>
      </section>
    );
  }

  return (
    <section className="px-4 py-12 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/browse-tasks"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>

        <div className="rounded-3xl border border-gray-200/70 bg-white p-5 shadow-sm sm:p-8">
          <div className="flex items-center gap-4">
            <Avatar url={profile.avatar_url} name={profile.full_name} size={64} />
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-black text-gray-900">
                  {profile.full_name || 'Sirius Jobs user'}
                </h1>
                {profile.verified_badge && (
                  <span className="flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                    <BadgeCheck className="h-4 w-4" />
                    Verified
                  </span>
                )}
              </div>
            </div>
          </div>
          {profile.city && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {profile.city}
            </p>
          )}
          <div className="mt-4 flex gap-6 text-sm">
            <span className="flex items-center gap-1.5 font-semibold text-gray-900">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {profile.rating_count > 0
                ? `${profile.rating_avg.toFixed(1)} (${profile.rating_count})`
                : 'No reviews yet'}
            </span>
            <span className="flex items-center gap-1.5 text-gray-600">
              <CheckCircle2 className="h-4 w-4" />
              {profile.completion_count} jobs completed
            </span>
          </div>

          {user && user.id !== profile.id && !reporting && !reported && (
            <button
              onClick={() => setReporting(true)}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-red-600"
            >
              <Flag className="h-3.5 w-3.5" />
              Report this user
            </button>
          )}
          {reported && (
            <p className="mt-4 text-xs font-semibold text-green-700">
              Thanks — our team will review this.
            </p>
          )}
          {reporting && (
            <div className="mt-4">
              <ReportForm
                target={{ type: 'user', userId: profile.id }}
                onReported={() => {
                  setReporting(false);
                  setReported(true);
                }}
                onCancel={() => setReporting(false)}
              />
            </div>
          )}
        </div>

        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">Reviews</h2>
          {reviews?.length === 0 && <p className="text-sm text-gray-400">No reviews yet.</p>}
          {reviews?.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-200/70 bg-white p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">{r.reviewer_name || 'Anonymous'}</span>
                <span className="flex items-center gap-1 text-sm text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {r.rating}
                </span>
              </div>
              {r.comment && <p className="mt-1 text-sm text-gray-600">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
