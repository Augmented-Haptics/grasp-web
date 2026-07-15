import { createClient, type User } from "@supabase/supabase-js";
import { ANON_KEY, SUPABASE_URL } from "./config";

// Single client for the whole origin. persistSession keeps the tester signed in
// across the app and future platform pages. Auth is code-based end to end, so no
// email carries a link and there is no redirect to detect.
const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  auth: {
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Send an OTP. `create` gates new-user signup: true in the web funnel, false in the app. */
export function requestCode(email: string, opts: { create: boolean }) {
  return supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: opts.create,
    },
  });
}

/** Verify a 6-digit email code. Also confirms an unconfirmed user (self-heal path). */
export function verifyCode(email: string, token: string) {
  return supabase.auth.verifyOtp({ email, token, type: "email" });
}

/** Current signed-in user, or null. Validates the session against the server. */
export async function getUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function signOut() {
  return supabase.auth.signOut();
}
