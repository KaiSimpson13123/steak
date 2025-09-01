/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import {
  Trophy, Stars, Target, CalendarClock, Zap, BadgeDollarSign, Sparkles, CheckCircle2
} from "lucide-react";
import Link from "next/link";

/** ---------- Types (loose + supasafe) ---------- */
type Challenge = {
  id: string;
  slug: string;
  title: string;
  frequency: "daily" | "weekly";
  goal: number;
  xp_reward: number;
  steak_reward: number;
  condition: Record<string, any> | null;
  icon?: string | null;
};

type UserChallenge = {
  id: string;
  challenge_id: string;
  user_id: string;
  period_start: string;      // 'YYYY-MM-DD'
  progress: number;
  goal: number | null;       // if null, use challenge.goal
  completed_at: string | null;
};

type Combined = Challenge & {
  user: UserChallenge | null;
  effectiveGoal: number;
};

// XP curve helpers (quadratic-ish: 0, 50, 150, 300, 500, ...)
function totalXpForLevel(level: number): number {
  const L = Math.max(1, Math.floor(level));
  return (L - 1) * L * 50; // tweak if you want a different curve
}

function levelFromXp(xp: number): number {
  let L = 1;
  while (xp >= totalXpForLevel(L + 1)) L++;
  return L;
}

function xpBreakdown(xp: number) {
  const safeXp = Number.isFinite(xp) ? xp : 0;
  const level = levelFromXp(safeXp);
  const start = totalXpForLevel(level);
  const next = totalXpForLevel(level + 1);
  const inLevel = Math.max(0, safeXp - start);
  const toNext = Math.max(1, next - start); // ensure > 0
  return { level, inLevel, toNext };
}


/** ---------- Date helpers ---------- */
function utcDateStr(d = new Date()) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}
function weekStartUTC(d = new Date()) {
  const day = d.getUTCDay(); // 0 = Sun, 1 = Mon, ... 6 = Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  monday.setUTCDate(monday.getUTCDate() + diff);
  return monday.toISOString().slice(0, 10);
}
function humanCountdown(ms: number) {
  if (ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const ss = Math.floor(s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${ss}`;
}

/** ---------- Tiny atoms ---------- */
function Chip({ children, tone = "emerald" }: { children: React.ReactNode; tone?: "emerald" | "yellow" | "purple" | "cyan" }) {
  const map: Record<string, string> = {
    emerald: "text-emerald-300 border-emerald-300/30 bg-emerald-400/10",
    yellow: "text-yellow-300 border-yellow-300/30 bg-yellow-400/10",
    purple: "text-purple-300 border-purple-300/30 bg-purple-400/10",
    cyan: "text-cyan-300 border-cyan-300/30 bg-cyan-400/10",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${map[tone]}`}>
      {children}
    </span>
  );
}

function ProgressBar({ value, max }: { value: number | null | undefined; max: number | null | undefined }) {
  const v = Number(value ?? 0);
  const m = Number(max ?? 0);

  const pct =
    Number.isFinite(v) && Number.isFinite(m) && m > 0
      ? Math.max(0, Math.min(100, (v / m) * 100))
      : 0;

  return (
    <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
      <div
        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-[width] duration-500"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}


/** ---------- XP math ---------- */
/** Cumulative XP to reach level n (n>=0): 100 * n*(n+1)/2
 *  L0->L1: 100, L1->L2: 200, L2->L3: 300, ...
 *  Smooth, easy to read.
 */
function cumulativeXPForLevel(n: number) {
  return Math.max(0, Math.floor(100 * (n * (n + 1)) / 2));
}
function levelFromXP(xp: number) {
  // Solve 100 * L(L+1)/2 <= xp  -> L^2 + L - (2*xp/100) <= 0
  const a = 1;
  const b = 1;
  const c = - (2 * (xp / 100));
  const L = Math.floor((-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a));
  return Math.max(0, L);
}
function levelProgressFromXP(xp: number) {
  const level = levelFromXP(xp);
  const curStart = cumulativeXPForLevel(level);
  const nextStart = cumulativeXPForLevel(level + 1);
  const delta = nextStart - curStart || 1;
  const within = xp - curStart;
  const pct = Math.max(0, Math.min(1, within / delta));
  return {
    level,
    xpIntoLevel: within,
    xpForLevel: delta,
    xpToNext: Math.max(0, nextStart - xp),
    nextLevelAt: nextStart,
    progressPct: pct,
  };
}

/** ---------- Fancy XP Status ---------- */
function XPStatus({ xp }: { xp: number }) {
  const p = levelProgressFromXP(xp);

  return (
    <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-4 overflow-hidden">
      {/* subtle glow */}
      <div className="pointer-events-none absolute -inset-1 opacity-20 blur-3xl bg-gradient-to-r from-emerald-500/20 via-cyan-500/10 to-transparent" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl grid place-items-center bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-2xl font-extrabold text-emerald-200">
            {p.level}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-white/80 font-semibold">Season XP</span>
              <Chip tone="cyan"><Sparkles className="w-4 h-4" /> Boost Active</Chip>
            </div>
            <div className="mt-1 text-xs text-white/60">
              {p.xpIntoLevel.toLocaleString()} / {p.xpForLevel.toLocaleString()} to Level {p.level + 1}
            </div>
          </div>
        </div>

        <div className="md:flex-1 md:max-w-[520px]">
          <div className="h-3 w-full rounded-full bg-white/10 overflow-hidden ring-1 ring-white/10">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#34d399, #10b981,#06b6d4)]"
              style={{ width: `${Math.round(p.progressPct * 100)}%` }}
            />
          </div>
          <div className="mt-1.5 text-[11px] text-white/50 text-right">
            {p.xpToNext.toLocaleString()} XP to next level
          </div>
        </div>
      </div>
    </div>
  );
}

/** ---------- The Page ---------- */
export default function ChallengesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"daily" | "weekly">("daily");

  const [loading, setLoading] = useState(true);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [mine, setMine] = useState<UserChallenge[]>([]);
  const [claiming, setClaiming] = useState<string | null>(null);

  // XP state
  const [xp, setXp] = useState<number>(0);
  const { level, inLevel, toNext } = useMemo(() => xpBreakdown(xp), [xp]);

  // Resets
  const [dailyCountdown, setDailyCountdown] = useState("00:00:00");
  const [weeklyCountdown, setWeeklyCountdown] = useState("00:00:00");

  // Compute period keys
  const today = useMemo(() => utcDateStr(new Date()), []);
  const thisWeek = useMemo(() => weekStartUTC(new Date()), []);

  // Countdowns
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const nextDaily = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
      const dayLeft = nextDaily.getTime() - now.getTime();

      const nextMonday = new Date(weekStartUTC(now));
      nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
      const weekLeft = nextMonday.getTime() - now.getTime();

      setDailyCountdown(humanCountdown(dayLeft));
      setWeeklyCountdown(humanCountdown(weekLeft));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  // Fetch XP (supasafe)
  const fetchXP = async () => {
    if (!user?.id) { setXp(0); return; }
    const res = await supabase
      .from("user_xp")
      .select("xp")
      .eq("user_id", user.id)
      .maybeSingle();
    if (res.error) { console.warn("XP fetch failed:", res.error); return; }
    const row = (res.data || {}) as any;
    const val = Number(row.xp_total ?? row.xp ?? 0);
    setXp(Number.isFinite(val) ? val : 0);
  };

  useEffect(() => {
    fetchXP();
  }, [user?.id]);

  // Fetch challenges + my rows
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        setLoading(true);

        const cq = await supabase
          .from("challenges")
          .select("*")
          .order("frequency", { ascending: true });

        if (cq.error) throw cq.error;
        const all = (cq.data as unknown) as Challenge[];
        if (!active) return;
        setChallenges(all || []);

        if (user?.id) {
          const uq = await supabase
            .from("user_challenges")
            .select("*")
            .eq("user_id", user.id)
            .in("period_start", [today, thisWeek]);

          if (uq.error) throw uq.error;
          setMine(((uq.data || []) as unknown) as UserChallenge[]);

          // Ensure enrollment (idempotent)
          const missing: Partial<UserChallenge>[] = [];
          for (const ch of all) {
            const period = ch.frequency === "daily" ? today : thisWeek;
            const exists = (uq.data || []).some((r: any) => r.challenge_id === ch.id && r.period_start === period);
            if (!exists) {
              missing.push({
                user_id: user.id,
                challenge_id: ch.id,
                period_start: period,
                progress: 0,
                goal: null,
                completed_at: null,
              });
            }
          }
          if (missing.length) {
            await supabase.from("user_challenges").upsert(missing as any, {
              onConflict: "user_id,challenge_id,period_start",
              ignoreDuplicates: true,
            });
            const uq2 = await supabase
              .from("user_challenges")
              .select("*")
              .eq("user_id", user.id)
              .in("period_start", [today, thisWeek]);
            if (!uq2.error && active) {
              setMine(((uq2.data || []) as unknown) as UserChallenge[]);
            }
          }
        } else {
          setMine([]);
        }
      } catch (e) {
        console.error("Challenges fetch error:", e);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user?.id, today, thisWeek]);

  // Merge
  const combined: Combined[] = useMemo(() => {
    const map = new Map<string, UserChallenge>();
    for (const uc of mine) map.set(`${uc.challenge_id}:${uc.period_start}`, uc);

    return challenges.map((ch) => {
      const period = ch.frequency === "daily" ? today : thisWeek;
      const uc = map.get(`${ch.id}:${period}`) || null;
      return {
        ...ch,
        user: uc,
        effectiveGoal: uc?.goal ?? ch.goal,
      };
    });
  }, [challenges, mine, today, thisWeek]);

  // Claim handler
  const claim = async (ch: Combined) => {
    if (!user?.id) return alert("Sign in to claim.");
    const uc = ch.user;
    if (!uc) return;
    if (uc.completed_at) return;
    if (uc.progress < ch.effectiveGoal) return;

    try {
      setClaiming(ch.id);

      const rpc = await supabase.rpc("claim_challenge", { p_challenge_id: ch.id });
      if (!rpc.error) {
        // server handled rewards + marking complete
      } else if (rpc.error?.code === "42883") {
        // Fallback (non-atomic)
        // 1) mark as completed (guard by null to avoid double-claim)
        const mark = await supabase
            .from("user_challenges")
            .update({ completed_at: new Date().toISOString() })
            .eq("id", uc.id)
            .is("completed_at", null)
            .select()
            .maybeSingle();

        if (mark.error) throw mark.error;

        // 2) credit steak_reward to user balance (users table)
        const me = await supabase
            .from("users")
            .select("balance")
            .eq("id", user.id)
            .maybeSingle();
        if (me.error) throw me.error;

        const newBal = (Number(me.data?.balance ?? 0) + Number(ch.steak_reward));
        const updBal = await supabase
            .from("users")
            .update({ balance: newBal })
            .eq("id", user.id);
        if (updBal.error) throw updBal.error;

        // 3) credit XP in user_xp (insert or update on user_id)
        const curXP = await supabase
            .from("user_xp")
            .select("xp")
            .eq("user_id", user.id)
            .maybeSingle();

        const currentXP = Number(curXP.data?.xp ?? 0);
        const newXP = currentXP + Number(ch.xp_reward);

        const upsertXP = await supabase
            .from("user_xp")
            .upsert({ user_id: user.id, xp: newXP }, { onConflict: "user_id" });
        if (upsertXP.error) throw upsertXP.error;
        } else {
        throw rpc.error;
        }

      // Refresh my rows + XP
      const ref = await supabase
        .from("user_challenges")
        .select("*")
        .eq("user_id", user.id)
        .in("period_start", [today, thisWeek]);
      if (!ref.error) setMine(((ref.data || []) as unknown) as UserChallenge[]);

      await fetchXP();
    } catch (e: any) {
      console.error("Claim failed:", e);
      alert(e?.message ?? "Could not claim.");
    } finally {
      setClaiming(null);
    }
  };

  // UI helpers
  const daily = combined.filter((c) => c.frequency === "daily");
  const weekly = combined.filter((c) => c.frequency === "weekly");
  const currentList = tab === "daily" ? daily : weekly;

  if (!user) {
    return (
      <div className="md:pl-72 px-6 py-20 text-center text-white/80">
        <h1 className="text-4xl font-extrabold">Challenges</h1>
        <p className="mt-2 text-white/60">Sign in to track progress and claim rewards.</p>
        <Link
          href="/login"
          className="inline-block mt-6 px-5 py-3 rounded-xl bg-emerald-500 text-black font-semibold hover:bg-emerald-400"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full opacity-20 blur-3xl bg-emerald-500/20" />
        <div className="absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full opacity-10 blur-3xl bg-cyan-500/20" />
        <div className="relative max-w-7xl mx-auto px-6 py-10 md:py-14">
          <div className="flex items-start justify-between gap-6">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-white/70 text-xs font-semibold">
                <Stars className="w-4 h-4 text-emerald-300" />
                Season Boosted XP
              </span>
              <h1 className="mt-4 text-4xl md:text-5xl font-extrabold tracking-tight">
                Daily & Weekly <span className="text-emerald-400">Challenges</span>
              </h1>
              <p className="mt-3 text-white/70 max-w-2xl">
                Play, progress, and claim rewards. Complete tasks to earn Steaks and XP for your upcoming Season Pass.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm">
                <Chip tone="yellow"><CalendarClock className="w-4 h-4" /> Daily resets in {dailyCountdown}</Chip>
                <Chip tone="purple"><CalendarClock className="w-4 h-4" /> Weekly resets in {weeklyCountdown}</Chip>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-white/60">Pro Tip</div>
                <div className="mt-2 text-white/80">
                  Mines + Dice have fast cycles — perfect for daily quests.
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-8 inline-flex rounded-xl border border-white/10 bg-white/5 p-1">
            <button
              onClick={() => setTab("daily")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === "daily" ? "bg-emerald-500 text-black" : "text-white/80 hover:bg-white/10"
              }`}
            >
              Daily
            </button>
            <button
              onClick={() => setTab("weekly")}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                tab === "weekly" ? "bg-emerald-500 text-black" : "text-white/80 hover:bg-white/10"
              }`}
            >
              Weekly
            </button>
          </div>

          <div className="relative mt-5 w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl grid place-items-center bg-gradient-to-br from-emerald-400/30 to-emerald-600/30 text-2xl font-extrabold text-emerald-200">
            {level}
          </div>
          <div className="flex items-center gap-2">
              <span className="text-white/80 font-semibold">Season XP</span>
              <Chip tone="cyan"><Sparkles className="w-4 h-4" /> Boost Active</Chip>
            </div>
            </div>
            <div className="flex items-center justify-between text-sm text-white/70 mt-2">
                <span>Level {level}</span>
                <span>
                {Math.min(inLevel, toNext).toLocaleString()} / {toNext.toLocaleString()} XP
                </span>
            </div>
            <div className="mt-2">
                <ProgressBar value={inLevel} max={toNext} />
            </div>
            </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-7xl mx-auto px-6 py-10 md:py-12">
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 animate-pulse h-40"
              />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white/70">
            No {tab} challenges yet. Check back soon!
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {currentList.map((c) => {
              const done = !!c.user?.completed_at;
              const progress = c.user?.progress ?? 0;
              const goal = c.effectiveGoal || 1;
              const canClaim = !done && progress >= goal;

              return (
                <div key={c.id} className="group relative rounded-2xl border border-white/10 bg-white/5 p-4 hover:border-emerald-400/30 transition">
                  <div className="pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 group-hover:opacity-100 transition blur-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10" />
                  <div className="relative">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-gradient-to-br from-emerald-400/30 to-emerald-600/30">
                          {c.icon ? (
                            <img src={c.icon} alt="" className="w-5 h-5" />
                          ) : (
                            <Target className="w-5 h-5 text-emerald-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold leading-tight">{c.title}</div>
                          <div className="text-xs text-white/60 capitalize">{c.frequency}</div>
                        </div>
                      </div>
                      {done ? (
                        <Chip tone="cyan"><CheckCircle2 className="w-4 h-4" /> Claimed</Chip>
                      ) : (
                        <Chip tone="emerald"><Zap className="w-4 h-4" /> Active</Chip>
                      )}
                    </div>

                    {c.condition && (
                      <div className="mt-3 text-[11px] text-white/50 line-clamp-2">
                        {Object.entries(c.condition).map(([k, v]) => (
                          <span key={k} className="mr-2">• {k}: {String(v)}</span>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                      <Chip tone="yellow"><Trophy className="w-4 h-4" /> {c.xp_reward} XP</Chip>
                      <Chip tone="emerald"><BadgeDollarSign className="w-4 h-4" /> {c.steak_reward} Steaks</Chip>
                    </div>

                    <div className="mt-3 text-xs text-white/60">
                      Progress: <span className="text-white">{Math.min(progress, goal)}/{goal}</span>
                    </div>
                    <div className="mt-2"><ProgressBar value={progress} max={goal} /></div>

                    <div className="mt-4">
                      <button
                        disabled={!canClaim || claiming === c.id}
                        onClick={() => claim(c)}
                        className={`w-full rounded-xl py-2 font-semibold transition ${
                          canClaim
                            ? "bg-emerald-500 hover:bg-emerald-600 text-black"
                            : "bg-white/10 text-white/50 cursor-not-allowed"
                        }`}
                      >
                        {done ? "Claimed" : claiming === c.id ? "Claiming…" : canClaim ? "Claim Reward" : "Keep Going"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
