// app/api/blocked/check/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only

function extractIp(h: Headers) {
  const xff = h.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  const cand = first || h.get("x-real-ip") || h.get("cf-connecting-ip") || "";
  // normalize ::ffff:x.x.x.x
  const m = cand.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  return (m ? m[1] : cand) || "unknown";
}

export async function GET(req: NextRequest) {
  if (!service) {
    return NextResponse.json({ blocked: false, reason: "service role missing" }, { status: 500 });
  }
  try {
    const ip = extractIp(req.headers);

    // localhost/private IPs are never blocked (optional)
    if (
      ip === "unknown" ||
      ip === "::1" ||
      ip.startsWith("127.") ||
      ip.startsWith("10.") ||
      ip.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
    ) {
      return NextResponse.json({ blocked: false, ip });
    }

    const supa = createClient(url, service);
    const { data, error } = await supa
      .from("blocked_ips")
      .select("ip,note,created_at")
      .eq("ip", ip)
      .maybeSingle();

    if (error) throw error;

    const blocked = !!data;
    return NextResponse.json({
      blocked,
      ip,
      note: data?.note ?? null,
      blocked_at: data?.created_at ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ blocked: false, error: e?.message ?? "error" }, { status: 200 });
  }
}
