/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import {
  Users2, Crown, Plus, LogOut, Search, ShieldCheck, Swords, BadgeDollarSign, Trophy, ArrowRight
} from "lucide-react";

/* ---------------------------
   Types
----------------------------*/
type ClubStats = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  member_count: number;
  total_balance: number | string; // bigint-as-string safe
};

type MyMembership = {
  role: "owner" | "admin" | "member";
  club: ClubStats;
};

type MemberRow = {
  role: "owner" | "admin" | "member";
  user: { id: string; username: string; balance: number };
};

/* ---------------------------
   SupaSAFE helpers (normalize)
----------------------------*/
const toNum = (v: any): number => {
  if (typeof v === "number") return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toStr = (v: any, fallback = ""): string => {
  if (v == null) return fallback;
  return String(v);
};

const normRole = (r: any): "owner" | "admin" | "member" => {
  const x = String(r || "").toLowerCase();
  return x === "owner" || x === "admin" ? (x as any) : "member";
};

function normalizeClubStats(row: any): ClubStats {
  return {
    id: toStr(row?.id),
    name: toStr(row?.name || "Untitled"),
    slug: toStr((row?.slug || "club").toString().toLowerCase()),
    description: row?.description ?? null,
    owner_id: toStr(row?.owner_id),
    created_at: row?.created_at ? toStr(row.created_at) : new Date().toISOString(),
    member_count: toNum(row?.member_count ?? row?.members_count ?? 0),
    total_balance: row?.total_balance ?? row?.sum_balance ?? 0,
  };
}

function normalizeMembershipRow(row: any): MyMembership | null {
  if (!row) return null;
  const club = normalizeClubStats(row?.club ?? {});
  return {
    role: normRole(row?.role),
    club,
  };
}

function normalizeMemberRow(row: any): MemberRow {
  const rawUser = Array.isArray(row?.user) ? row.user[0] : row?.user;
  return {
    role: normRole(row?.role),
    user: {
      id: toStr(rawUser?.id),
      username: toStr(rawUser?.username || "Player"),
      balance: toNum(rawUser?.balance ?? 0),
    },
  };
}

/* ---------------------------
   Page
----------------------------*/
export default function ClubsPage() {
  const { user } = useAuth();

  // UI state
  const [loading, setLoading] = useState(true);

  // Search/explore
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  // Lists
  const [topClubs, setTopClubs] = useState<ClubStats[]>([]);
  const [exploreClubs, setExploreClubs] = useState<ClubStats[]>([]);

  // Membership
  const [myMembership, setMyMembership] = useState<MyMembership | null>(null);
  const [myClubRank, setMyClubRank] = useState<number | null>(null);

  // Create modal
  const [createOpen, setCreateOpen] = useState(false);
  const [cName, setCName] = useState("");
  const [cDesc, setCDesc] = useState("");

  // debounce search
  useEffect(() => {
    const id = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(id);
  }, [query]);

  // fetch membership
  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        if (!user?.id) {
          setMyMembership(null);
          return;
        }
        const { data, error } = await supabase
          .from("club_members")
          .select("role, club:club_stats(*)")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error) throw error;
        if (!active) return;

        setMyMembership(normalizeMembershipRow(data));
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id]);

  // fetch TOP leaderboard (unfiltered)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("club_stats")
          .select("id,name,slug,description,owner_id,created_at,member_count,total_balance")
          .order("total_balance", { ascending: false })
          .limit(10);
        if (error) throw error;
        if (!active) return;

        setTopClubs((data ?? []).map(normalizeClubStats));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { active = false; };
  }, []);

  // fetch Explore (search list)
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const base = supabase
          .from("club_stats")
          .select("id,name,slug,description,owner_id,created_at,member_count,total_balance")
          .order("total_balance", { ascending: false })
          .limit(30);

        const res = debounced ? await base.ilike("name", `%${debounced}%`) : await base;
        if (res.error) throw res.error;
        if (!active) return;
        setExploreClubs((res.data ?? []).map(normalizeClubStats));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { active = false; };
  }, [debounced]);

  // compute my club rank (count clubs ahead)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!myMembership?.club?.id) { setMyClubRank(null); return; }
      try {
        const myTotal = toNum(myMembership.club.total_balance);
        const { count, error } = await supabase
          .from("club_stats")
          .select("id", { count: "exact", head: true })
          .gt("total_balance", myTotal);
        if (error) throw error;
        if (!active) return;
        setMyClubRank((count ?? 0) + 1);
      } catch (e) {
        console.error(e);
        if (active) setMyClubRank(null);
      }
    })();
    return () => { active = false; };
  }, [myMembership?.club?.id, myMembership?.club?.total_balance]);

  const slugify = (s: string) =>
    s.toLowerCase().trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 30);

  // actions
  const createClub = async () => {
    if (!user?.id) return alert("Please sign in.");
    const name = cName.trim();
    if (name.length < 3) return alert("Club name must be at least 3 characters.");
    const slug = slugify(name);
    try {
      const { error } = await supabase
        .from("clubs")
        .insert({
          name,
          slug,
          description: cDesc.trim() || null,
          owner_id: user.id,
        })
        .select("*")
        .single();
      if (error) throw error;

      setCreateOpen(false);
      setCName(""); setCDesc("");

      // refetch membership
      const { data: membership } = await supabase
        .from("club_members")
        .select("role, club:club_stats(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyMembership(normalizeMembershipRow(membership));

      // refresh both lists
      const { data: top } = await supabase
        .from("club_stats")
        .select("id,name,slug,description,owner_id,created_at,member_count,total_balance")
        .order("total_balance", { ascending: false })
        .limit(10);
      setTopClubs((top ?? []).map(normalizeClubStats));

      const { data: explore } = await supabase
        .from("club_stats")
        .select("id,name,slug,description,owner_id,created_at,member_count,total_balance")
        .order("total_balance", { ascending: false })
        .limit(30);
      setExploreClubs((explore ?? []).map(normalizeClubStats));
    } catch (e: any) {
      if (e?.code === "23505") {
        alert("That club name/slug already exists.");
      } else {
        console.error(e);
        alert("Failed to create club.");
      }
    }
  };

  const joinClub = async (clubId: string) => {
    if (!user?.id) return alert("Please sign in.");
    if (myMembership) return alert("You’re already in a club. Leave it first.");
    try {
      const { error } = await supabase
        .from("club_members")
        .insert({ club_id: clubId, user_id: user.id })
        .select()
        .maybeSingle();
      if (error) throw error;

      // refresh membership
      const { data: membership } = await supabase
        .from("club_members")
        .select("role, club:club_stats(*)")
        .eq("user_id", user.id)
        .maybeSingle();
      setMyMembership(normalizeMembershipRow(membership));
    } catch (e: any) {
      if (e?.code === "23505") {
        alert("You’re already in a club.");
      } else {
        console.error(e);
        alert("Couldn’t join club.");
      }
    }
  };

  const leaveClub = async () => {
    if (!user?.id || !myMembership) return;
    if (myMembership.role === "owner") {
      const ok = confirm(
        "You are the owner. You cannot leave while other members remain. Continue only if this is a solo club."
      );
      if (!ok) return;
    }
    try {
      const { error } = await supabase
        .from("club_members")
        .delete()
        .eq("club_id", myMembership.club.id)
        .eq("user_id", user.id);
      if (error) throw error;
      setMyMembership(null);
      setMyClubRank(null);
    } catch (e: any) {
      alert(e?.message ?? "Couldn’t leave club.");
    }
  };

  const myClubMembersQuery = async (clubId: string) => {
    const { data, error } = await supabase
      .from("club_members")
      .select("role, user:users(id, username, balance)")
      .eq("club_id", clubId);
    if (error) throw error;
    return (data ?? []).map(normalizeMemberRow);
  };

  // --- UI ---
  if (!user) {
    return (
      <div className="md:pl-72 px-6 py-20 text-center text-white/80">
        <h1 className="text-4xl font-extrabold">Clubs</h1>
        <p className="mt-2 text-white/60">Sign in to create or join a club.</p>
        <Link href="/login" className="inline-block mt-6 px-5 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Decorative BG */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_30%_-20%,rgba(16,185,129,0.15),transparent)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1000px_500px_at_80%_10%,rgba(59,130,246,0.12),transparent)]" />
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-10 md:py-14 relative">
          <div className="flex items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 text-emerald-300/90 text-xs font-semibold bg-emerald-400/10 border border-emerald-300/20 px-3 py-1 rounded-full">
                <ShieldCheck className="w-4 h-4" /> Social Teams
              </div>
              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
                Join a <span className="text-emerald-400">Club</span>, climb together.
              </h1>
              <p className="mt-3 text-white/70 max-w-2xl">
                Team up with friends, compete on the club leaderboard, and flex your banner.
              </p>
              {!myMembership && (
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                >
                  <Plus className="w-5 h-5" /> Create Club
                </button>
              )}
            </div>

            {/* My club summary pill */}
            <div className="hidden md:block">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur">
                <div className="text-xs text-white/60">Your Club</div>
                <div className="mt-2 flex items-center gap-2 text-xl font-bold">
                  <Swords className="w-5 h-5 text-emerald-400" />
                  {myMembership ? myMembership.club.name : "No Club"}
                </div>
                {myMembership && (
                  <>
                    <div className="mt-2 text-sm text-white/60">
                      Role: <span className="text-white">{myMembership.role}</span>
                    </div>
                    <div className="mt-1 text-sm text-white/60">
                      Rank: <span className="text-white">{myClubRank ? `#${myClubRank}` : "—"}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div className="mt-8 grid sm:grid-cols-3 gap-3">
            <StatCard
              label="Top Club"
              value={topClubs[0]?.name ?? "—"}
              icon={<Trophy className="w-5 h-5 text-yellow-400" />}
            />
            <StatCard
              label="My Club Rank"
              value={myMembership ? (myClubRank ? `#${myClubRank}` : "—") : "—"}
              icon={<Swords className="w-5 h-5 text-emerald-400" />}
            />
            <StatCard
              label="Clubs Total"
              value={Math.max(topClubs.length, exploreClubs.length)}
              icon={<Users2 className="w-5 h-5 text-blue-300" />}
            />
          </div>
        </div>
      </section>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-10 space-y-12">
        {/* Club Leaderboard */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" /> Club Leaderboard
            </h2>
          </div>
          <div className="rounded-2xl overflow-hidden border border-white/10 bg-white/5">
            <div className="grid grid-cols-[60px_2fr_1fr_1fr_120px] bg-white/10 px-4 py-2 text-xs text-white/70">
              <span>#</span>
              <span>Club</span>
              <span>Members</span>
              <span>Total Balance</span>
              <span className="text-right pr-1">Action</span>
            </div>
            {topClubs.length === 0 && (
              <div className="px-4 py-6 text-white/60">No clubs yet—be the first!</div>
            )}
            {topClubs.map((c, idx) => (
              <div
                key={c.id}
                className={`grid grid-cols-[60px_2fr_1fr_1fr_120px] px-4 py-3 items-center border-t border-white/5 ${
                  idx === 0 ? "bg-yellow-400/5" : ""
                }`}
              >
                <div className="font-bold text-white/80">{idx + 1}</div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{c.name}</div>
                  <div className="text-xs text-white/50">/{c.slug}</div>
                </div>
                <div className="text-white/80">{c.member_count}</div>
                <div className="text-emerald-300 font-semibold">{toNum(c.total_balance).toLocaleString()}</div>
                <div className="text-right">
                  <button
                    onClick={() => joinClub(c.id)}
                    disabled={!!myMembership}
                    className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-sm border ${
                      myMembership
                        ? "border-white/20 text-white/40 cursor-not-allowed"
                        : "border-emerald-400/40 text-emerald-300 hover:bg-emerald-400/10"
                    }`}
                  >
                    {myMembership ? "In a club" : <>Join <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* My club */}
        {myMembership && (
          <MyClubPanel
            membership={myMembership}
            onLeave={leaveClub}
            fetchMembers={myClubMembersQuery}
          />
        )}

        {/* Explore / search */}
        {!myMembership && (
          <section>
            <div className="flex items-center gap-3">
              <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                <Search className="w-4 h-4 text-white/60" />
                <input
                  placeholder="Search clubs by name…"
                  className="bg-transparent w-full outline-none"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <button
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-emerald-400/40 hover:bg-emerald-400/10"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                New
              </button>
            </div>

            <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {exploreClubs.map((c) => (
                <ClubCard key={c.id} club={c} onJoin={() => joinClub(c.id)} />
              ))}
              {exploreClubs.length === 0 && (
                <div className="text-white/60">No clubs found. Be the first to create one!</div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0f141b] p-5">
            <div className="text-lg font-semibold">Create a Club</div>
            <div className="mt-3 space-y-3">
              <div>
                <label className="text-xs text-white/60">Name</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none"
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Description (optional)</label>
                <textarea
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 outline-none"
                  value={cDesc}
                  onChange={(e) => setCDesc(e.target.value)}
                />
              </div>
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20"
                onClick={() => setCreateOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                onClick={createClub}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- UI pieces --- */

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wide text-white/60">{label}</div>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>
      <div className="mt-2 text-xl font-bold">{value}</div>
    </div>
  );
}

function ClubCard({ club, onJoin }: { club: ClubStats; onJoin: () => void }) {
  const initials = useMemo(() => {
    const base = club.name.trim();
    const parts = base.split(/\s+/).filter(Boolean);
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : base.slice(0, 2).toUpperCase();
  }, [club.name]);

  return (
    <div className="group rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-emerald-400/30 transition">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 grid place-items-center text-lg font-extrabold">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold truncate">{club.name}</div>
          <div className="text-xs text-white/60">/{club.slug}</div>
        </div>
      </div>
      <p className="mt-3 text-sm text-white/70 line-clamp-2">
        {club.description || "No description yet."}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <div className="text-white/60">Members</div>
          <div className="mt-1 font-semibold flex items-center gap-1">
            <Users2 className="w-4 h-4" /> {club.member_count}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
          <div className="text-white/60">Total Balance</div>
          <div className="mt-1 font-semibold flex items-center gap-1">
            <BadgeDollarSign className="w-4 h-4 text-emerald-400" />
            {toNum(club.total_balance).toLocaleString()}
          </div>
        </div>
      </div>

      <button
        onClick={onJoin}
        className="mt-4 w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold py-2"
      >
        Join
      </button>
    </div>
  );
}

function MyClubPanel({
  membership,
  fetchMembers,
  onLeave,
}: {
  membership: MyMembership;
  fetchMembers: (clubId: string) => Promise<MemberRow[]>;
  onLeave: () => void;
}) {
  const [members, setMembers] = useState<MemberRow[] | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetchMembers(membership.club.id);
        if (active) setMembers(res);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => { active = false; };
  }, [membership.club.id, fetchMembers]);

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-white/60">Your Club</div>
          <div className="mt-1 text-2xl font-bold flex items-center gap-2">
            {membership.role === "owner" && <Crown className="w-6 h-6 text-yellow-400" />}
            {membership.club.name}
          </div>
          <div className="text-xs text-white/60">Role: <span className="text-white">{membership.role}</span></div>
        </div>
        <button
          onClick={onLeave}
          className="inline-flex items-center gap-2 rounded-xl px-3 py-2 bg-white/10 hover:bg-white/20 text-sm"
        >
          <LogOut className="w-4 h-4" /> Leave
        </button>
      </div>

      <div className="mt-5 grid sm:grid-cols-3 gap-3">
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="text-white/60">Members</div>
          <div className="mt-1 font-semibold flex items-center gap-1">
            <Users2 className="w-4 h-4" />
            {members ? members.length : "—"}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="text-white/60">Total Balance</div>
          <div className="mt-1 font-semibold flex items-center gap-1">
            <BadgeDollarSign className="w-4 h-4 text-emerald-400" />
            {toNum(membership.club.total_balance ?? 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
          <div className="text-white/60">Created</div>
          <div className="mt-1 font-semibold">
            {new Date(membership.club.created_at).toLocaleDateString()}
          </div>
        </div>
      </div>

      <div className="mt-6">
        <div className="text-sm text-white/60 mb-2">Roster</div>
        <div className="rounded-xl overflow-hidden border border-white/10">
          <div className="grid grid-cols-[1fr_1fr_1fr] bg-white/10 px-3 py-2 text-xs text-white/70">
            <div>Username</div>
            <div>Role</div>
            <div>Balance</div>
          </div>
          {(members || []).map((m) => (
            <div key={`${m.user.id}-${m.role}`} className="grid grid-cols-[1fr_1fr_1fr] px-3 py-2 text-sm border-t border-white/5">
              <div className="truncate">{m.user.username}</div>
              <div className="capitalize">{m.role}</div>
              <div className="text-emerald-300">{m.user.balance.toLocaleString()}</div>
            </div>
          ))}
          {!members && (
            <div className="px-3 py-3 text-sm text-white/60">Loading members…</div>
          )}
        </div>
      </div>
    </section>
  );
}
