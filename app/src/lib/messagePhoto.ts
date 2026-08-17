import { supabase } from './supabase';

export async function uploadMessagePhoto(taskId: string, file: File): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('You need to be signed in.');

  const ext = file.name.split('.').pop() || 'jpg';
  // Timestamped, unlike the avatar's fixed filename — each photo is its own message,
  // not something meant to overwrite a previous one.
  const path = `${taskId}/${user.id}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from('message-photos')
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw new Error(error.message || 'Could not upload your photo.');

  // Private bucket — store the storage path in messages.image_url and resolve a
  // signed URL at render time instead of a public URL.
  return path;
}

export async function getMessagePhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('message-photos')
    .createSignedUrl(path, 60 * 60);

  if (error) return null;
  return data.signedUrl;
}
