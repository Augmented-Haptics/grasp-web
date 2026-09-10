import { ANON_KEY, SUPABASE_URL } from "./config";

// Pre-signup contact capture. Same REST-with-apikey pattern as the release
// lookup; RLS limits anon to reading active campaigns and inserting one lead.
const HEADERS = { apikey: ANON_KEY, "Content-Type": "application/json" };

export type Campaign = { key: string; label: string; active: boolean };

// The table itself is not readable; a single-key lookup keeps campaigns unlisted.

export type Lead = {
  name: string;
  email: string;
  campaign: string;
  newsletter: boolean;
};

/** Campaign for a key, or null when unknown. Throws on network/server errors. */
export async function fetchCampaign(key: string): Promise<Campaign | null> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_campaign`, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({ p_key: key }),
  });
  if (!res.ok) throw new Error(String(res.status));
  const rows = (await res.json()) as Omit<Campaign, "key">[];
  return rows[0] ? { key, ...rows[0] } : null;
}

/** Insert one lead. Resolves to "ok", "closed" (campaign no longer active) or "error". */
export async function submitLead(lead: Lead): Promise<"ok" | "closed" | "error"> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/leads`, {
    method: "POST",
    headers: { ...HEADERS, Prefer: "return=minimal" },
    body: JSON.stringify({
      name: lead.name,
      email: lead.email,
      campaign: lead.campaign,
      newsletter_opt_in_at: lead.newsletter ? new Date().toISOString() : null,
    }),
  });
  if (res.ok) return "ok";
  // RLS refuses the insert once the campaign is deactivated.
  return res.status === 401 || res.status === 403 ? "closed" : "error";
}
