import { NextResponse } from "next/server";

import { getAuthenticatedClient } from "@/lib/supabase/auth-helpers";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/profile/pin-role
 *
 * Sets or clears the user's single pinned target role, stored on user_career_summary.
 * Distinct from the AI-derived `targetRoles` array — this is a user choice used to
 * de-noise the dashboard when a user's analyses span multiple role types.
 */
export async function POST(request: Request) {
  const authResult = await getAuthenticatedClient();
  if (!authResult) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }
  const { user, supabase } = authResult;

  let body: { role?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const role = body.role;
  if (role !== null && typeof role !== "string") {
    return NextResponse.json({ error: "role must be a string or null." }, { status: 400 });
  }

  const normalizedRole = typeof role === "string" ? role.trim().slice(0, 120) || null : null;

  const dbClient = getSupabaseServiceClient() ?? supabase;
  const { error } = await dbClient
    .from("user_career_summary")
    .upsert(
      { user_id: user.id, pinned_target_role: normalizedRole, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );

  if (error) {
    return NextResponse.json({ error: "Failed to update pinned role." }, { status: 500 });
  }

  return NextResponse.json({ pinnedTargetRole: normalizedRole });
}
