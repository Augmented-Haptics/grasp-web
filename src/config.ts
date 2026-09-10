// Public config, safe to ship in a static bundle. The anon key is publishable;
// RLS and the runtime OTP gate are the real protection, not secrecy of this key.

// A gitignored .env.local can point both at a local stack (see supabase status).
export const SUPABASE_URL: string =
  import.meta.env.VITE_SUPABASE_URL ?? "https://cwivjpdoicmzdxuaeksg.supabase.co";

export const ANON_KEY: string =
  import.meta.env.VITE_ANON_KEY ?? "sb_publishable_EO1ytheMt5-iBTyPeGTYYQ_gW9TMxEH";

// Newest row of app_releases, maintained by the release process.
export const LATEST_RELEASE_URL =
  `${SUPABASE_URL}/rest/v1/latest_release?select=version,released_at,installers`;
