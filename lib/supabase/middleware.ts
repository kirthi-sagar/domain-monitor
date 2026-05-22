import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          toSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl;
  const isAppRoute = url.pathname.startsWith("/dashboard") ||
                     url.pathname.startsWith("/domains") ||
                     url.pathname.startsWith("/notifications") ||
                     url.pathname.startsWith("/settings") ||
                     url.pathname.startsWith("/api-keys") ||
                     url.pathname.startsWith("/import");

  if (isAppRoute && !user) {
    const redirect = url.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", url.pathname);
    return NextResponse.redirect(redirect);
  }

  if ((url.pathname === "/login" || url.pathname === "/signup") && user) {
    const redirect = url.clone();
    redirect.pathname = "/dashboard";
    return NextResponse.redirect(redirect);
  }

  return response;
}
