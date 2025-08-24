// app/api/visit/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    // Pull the access token coming from the client
    const authHeader = req.headers.get("authorization") || "";
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // This works because we forwarded the user's Bearer token
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Extract request metadata
    const hdrs = req.headers;
    const xff = hdrs.get("x-forwarded-for") ?? "";
    const ip =
      (xff.split(",")[0] || "").trim() ||
      hdrs.get("x-real-ip") ||
      "unknown";

    const userAgent = hdrs.get("user-agent") || "";
    const acceptLanguage = hdrs.get("accept-language") || "";
    const referer = hdrs.get("referer") || "";
    const url = new URL(req.url);
    const path = url.searchParams.get("path") || "/";

    // Insert using the user's JWT (RLS: auth.uid() = user_id)
    const { error: dbErr } = await supabase.from("ip_logs").insert({
      user_id: user.id,
      ip,
      user_agent: userAgent,
      accept_language: acceptLanguage,
      referer,
      path,
    });

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Unexpected error" },
      { status: 500 }
    );
  }
}
