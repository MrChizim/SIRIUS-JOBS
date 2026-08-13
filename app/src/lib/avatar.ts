import { supabase } from './supabase';

export async function uploadAvatar(file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in.');

  const ext = file.name.split('.').pop() || 'jpg';
  // Fixed filename per user (not timestamped like id-documents) — an avatar is meant
  // to be replaced in place, not accumulated as a history of past uploads.
  const path = `${user.id}/avatar.${ext}`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(error.message || 'Could not upload your profile picture.');

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  // Cache-bust so the new image shows immediately instead of a stale cached version
  // at the same URL after an upsert overwrite.
  return `${data.publicUrl}?t=${Date.now()}`;
}
