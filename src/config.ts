// Public config, safe to ship in a static bundle. The anon key is publishable;
// RLS and the runtime OTP gate are the real protection, not secrecy of this key.

export const SUPABASE_URL = "https://cwivjpdoicmzdxuaeksg.supabase.co";

export const ANON_KEY = "sb_publishable_EO1ytheMt5-iBTyPeGTYYQ_gW9TMxEH";

// New signups land here after tapping the Confirm signup email link.
export const DOWNLOAD_URL = "https://app.grasp.it/download";

// Stable pointer to the current build, maintained by the release process.
export const LATEST_JSON_URL =
  "https://cwivjpdoicmzdxuaeksg.supabase.co/storage/v1/object/public/downloads/latest.json";
