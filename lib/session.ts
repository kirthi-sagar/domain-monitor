import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// React `cache` dedupes within a single server-render. This means a page
// that calls getUser() + several queries via the same client only pays for
// one Supabase /auth/v1/user round-trip.
export const getUser = cache(async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
});
