// app/api/admin/block-ip/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { ip, action, note } = await req.json();
    if (!ip || !action) {
      return NextResponse.json({ error: "ip and action required" }, { status: 400 });
    }

    // identify requester by Bearer token (from client)
    const authHeader = req.headers.get("authorization") || "";
    const authed = createClient(url, anon, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: requester } } = await authed.auth.getUser();
    if (!requester) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

    const username = requester.user_metadata?.username;
    if (username !== "SmacklePackle") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const svc = createClient(url, service);

    if (action === "block") {
      const { error } = await svc
        .from("blocked_ips")
        .upsert({ ip, note: note ?? null, created_by: requester.id }, { onConflict: "ip" });
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "blocked" });
    }

    if (action === "unblock") {
      const { error } = await svc.from("blocked_ips").delete().eq("ip", ip);
      if (error) throw error;
      return NextResponse.json({ ok: true, status: "unblocked" });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
