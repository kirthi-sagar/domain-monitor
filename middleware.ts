import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

// Only run middleware where auth/session matters. Skip marketing pages and
// public API routes (they auth themselves with API keys / cron secrets).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/domains/:path*",
    "/channels/:path*",
    "/team/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/api-keys/:path*",
    "/import/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
    "/auth/:path*",
    "/invite/:path*",
  ],
};
