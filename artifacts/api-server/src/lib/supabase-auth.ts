export type SupabaseAuthUser = {
  id: string;
  email?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, unknown>;
};

export async function verifySupabaseAccessToken(
  accessToken: string,
): Promise<SupabaseAuthUser | null> {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required for authentication.");
  }

  const response = await fetch(`${url.replace(/\/+$/, "")}/auth/v1/user`, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;

  const user = (await response.json()) as SupabaseAuthUser;
  return typeof user.id === "string" ? user : null;
}
