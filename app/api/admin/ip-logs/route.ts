import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-only

// Helper: turn country code into a flag emoji
function countryCodeToFlagEmoji(cc?: string) {
  if (!cc) return "";
  return cc
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Simple fetch with timeout
async function fetchWithTimeout(resource: string, ms = 2500) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(resource, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(id);
  }
}

// Geo-lookup one IP via ipwho.is
async function geoIp(ip: string) {
  // localhost / private IPs → friendly label
  if (ip === "::1" || ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)) {
    return { city: "Local", country: "Local Network", country_code: "", flag: "" };
  }
  // strip IPv6-mapped IPv4 ::ffff:x.x.x.x
  const ipv4 = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1] || ip;

  try {
    const res = await fetchWithTimeout(`https://ipwho.is/${encodeURIComponent(ipv4)}`);
    if (!res || !res.ok) return { city: "", country: "", country_code: "", flag: "" };
    const j = await res.json().catch(() => ({}));
    if (j?.success === false) return { city: "", country: "", country_code: "", flag: "" };
    const city = j.city || "";
    const country = j.country || "";
    const country_code = j.country_code || j.country_code2 || "";
    return { city, country, country_code, flag: countryCodeToFlagEmoji(country_code) };
  } catch {
    return { city: "", country: "", country_code: "", flag: "" };
  }
}

export async function POST(req: NextRequest) {
  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Service role key not set" }, { status: 500 });
  }

  try {
    // Identify requester with anon client + forwarded Authorization
    const authHeader = req.headers.get("authorization") || "";
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user: requester },
    } = await authClient.auth.getUser();

    if (!requester) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (requester.user_metadata?.username !== "SmacklePackle") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { username } = await req.json();
    if (!username) {
      return NextResponse.json({ error: "username is required" }, { status: 400 });
    }

    const service = createClient(supabaseUrl, serviceRoleKey);

    // Find target user
    const { data: userRow, error: userErr } = await service
      .from("users")
      .select("id, username")
      .eq("username", username)
      .maybeSingle();
    if (userErr) throw userErr;
    if (!userRow) return NextResponse.json({ logs: [] });

    // Fetch logs (newest first)
    const { data: logs, error: logsErr } = await service
      .from("ip_logs")
      .select("id, ip, user_agent, accept_language, referer, path, created_at")
      .eq("user_id", userRow.id)
      .order("created_at", { ascending: false })
      .limit(300);
    if (logsErr) throw logsErr;

    // Enrich with location (dedupe IPs first)
    const uniqueIps = Array.from(new Set((logs || []).map((l) => l.ip).filter(Boolean)));
    const lookups = await Promise.all(
      uniqueIps.map(async (ip) => ({ ip, loc: await geoIp(ip) }))
    );
    const map = new Map(lookups.map((x) => [x.ip, x.loc]));

    const enriched = (logs || []).map((l) => ({
      ...l,
      location: map.get(l.ip) || { city: "", country: "", country_code: "", flag: "" },
    }));

    return NextResponse.json({ logs: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 500 });
  }
}
