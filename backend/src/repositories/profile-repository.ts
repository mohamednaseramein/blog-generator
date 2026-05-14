import { getSupabase } from '../db/supabase.js';
import type { AuthorProfile, BlogIntent } from '../domain/types.js';
import { AppError } from '../middleware/error-handler.js';

interface AuthorProfileRow {
  id: string;
  user_id: string | null;
  name: string;
  author_role: string;
  audience_persona: string;
  intent: string;
  tone_of_voice: string;
  voice_note: string;
  is_predefined: boolean;
  voice_sample_text: string | null;
  created_at: string;
  updated_at: string;
}

function toModel(row: AuthorProfileRow): AuthorProfile {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    authorRole: row.author_role,
    audiencePersona: row.audience_persona,
    intent: row.intent as BlogIntent,
    toneOfVoice: row.tone_of_voice,
    voiceNote: row.voice_note,
    isPredefined: row.is_predefined,
    voiceSampleText: row.voice_sample_text ?? null,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export async function getProfilesOwnedByUser(userId: string): Promise<AuthorProfile[]> {
  const { data, error } = await getSupabase()
    .from('author_profiles')
    .select()
    .eq('user_id', userId)
    .eq('is_predefined', false)
    .order('created_at', { ascending: true })
    .returns<AuthorProfileRow[]>();

  if (error) throw new Error(error.message);
  return (data ?? []).map(toModel);
}

export async function getAllProfiles(userId: string): Promise<AuthorProfile[]> {
  const { data, error } = await getSupabase()
    .from('author_profiles')
    .select()
    .or(`is_predefined.eq.true,user_id.eq.${userId}`)
    .order('is_predefined', { ascending: false })
    .order('created_at', { ascending: true })
    .returns<AuthorProfileRow[]>();

  if (error) throw new Error(error.message);
  return data.map(toModel);
}

export async function getPredefinedProfiles(): Promise<AuthorProfile[]> {
  const { data, error } = await getSupabase()
    .from('author_profiles')
    .select()
    .eq('is_predefined', true)
    .order('created_at', { ascending: true })
    .returns<AuthorProfileRow[]>();

  if (error) throw new Error(error.message);
  return data.map(toModel);
}

export async function getProfileById(userId: string, id: string): Promise<AuthorProfile | null> {
  const { data, error } = await getSupabase()
    .from('author_profiles')
    .select()
    .eq('id', id)
    .or(`is_predefined.eq.true,user_id.eq.${userId}`)
    .single<AuthorProfileRow>();

  if (error?.code === 'PGRST116') return null;
  if (error) throw new Error(error.message);
  return toModel(data);
}

export async function createProfile(
  userId: string,
  name: string,
  authorRole: string,
  audiencePersona: string,
  intent: string,
  toneOfVoice: string,
  voiceNote: string,
): Promise<AuthorProfile> {
  const { data, error } = await getSupabase()
    .from('author_profiles')
    .insert({
      user_id: userId,
      name,
      author_role: authorRole,
      audience_persona: audiencePersona,
      intent,
      tone_of_voice: toneOfVoice,
      voice_note: voiceNote,
      is_predefined: false,
    })
    .select()
    .single<AuthorProfileRow>();

  if (error) throw new Error(error.message);
  console.log(`[profile-repository] created profile id=${data.id} name="${name}"`);
  return toModel(data);
}

export async function cloneProfileFromPredefined(userId: string, predefinedId: string): Promise<AuthorProfile> {
  const { data, error } = await getSupabase()
    .from('author_profiles')
    .select()
    .eq('id', predefinedId)
    .eq('is_predefined', true)
    .single<AuthorProfileRow>();

  if (error?.code === 'PGRST116') {
    throw new AppError(404, 'NOT_FOUND', `Predefined profile ${predefinedId} not found`);
  }
  if (error) throw new Error(error.message);

  const predefined = toModel(data);
  if (!predefined) {
    throw new AppError(404, 'NOT_FOUND', `Predefined profile ${predefinedId} not found`);
  }

  const newName = `${predefined.name} (Copy)`;
  return createProfile(
    userId,
    newName,
    predefined.authorRole,
    predefined.audiencePersona,
    predefined.intent,
    predefined.toneOfVoice,
    predefined.voiceNote,
  );
}

export async function updateProfile(
  userId: string,
  id: string,
  updates: {
    name?: string;
    authorRole?: string;
    audiencePersona?: string;
    intent?: string;
    toneOfVoice?: string;
    voiceNote?: string;
  },
): Promise<AuthorProfile> {
  const profile = await getProfileById(userId, id);
  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', `Profile ${id} not found`);
  }

  if (profile.isPredefined) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot edit a predefined profile');
  }

  const { data, error } = await getSupabase()
    .from('author_profiles')
    .update({
      ...(updates.name !== undefined && { name: updates.name }),
      ...(updates.authorRole !== undefined && { author_role: updates.authorRole }),
      ...(updates.audiencePersona !== undefined && { audience_persona: updates.audiencePersona }),
      ...(updates.intent !== undefined && { intent: updates.intent }),
      ...(updates.toneOfVoice !== undefined && { tone_of_voice: updates.toneOfVoice }),
      ...(updates.voiceNote !== undefined && { voice_note: updates.voiceNote }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .single<AuthorProfileRow>();

  if (error) throw new Error(error.message);
  console.log(`[profile-repository] updated profile id=${id}`);
  return toModel(data);
}

export async function deleteProfile(userId: string, id: string): Promise<void> {
  const profile = await getProfileById(userId, id);
  if (!profile) {
    throw new AppError(404, 'NOT_FOUND', `Profile ${id} not found`);
  }

  if (profile.isPredefined) {
    throw new AppError(403, 'FORBIDDEN', 'Cannot delete a predefined profile');
  }

  const { error } = await getSupabase()
    .from('author_profiles')
    .delete()
    .eq('id', id)
    .eq('user_id', userId);

  if (error) throw new Error(error.message);
  console.log(`[profile-repository] deleted profile id=${id}`);
}
