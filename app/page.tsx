"use client";

import { useEffect, useState, useRef } from "react";
import {
  Gamepad2,
  Gem,
  Rocket,
  Menu,
  X,
  Ticket,
  Trophy,
  Home as HomeIcon,
  Wallet,
  LogIn,
  Settings,
  Beef,
} from "lucide-react";
import Link from "next/link";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";
import Sidebar from "@/components/Sidebar";
import { Sparkles, Gift } from "lucide-react"; // optional flair

/** --------------------------
 *  CONFIG
 *  -------------------------- */
const games = [
  { name: "MINES", link: "/mines", logo: <Gem size={48} />, img: "/assets/mines.png" },
  { name: "BLACKJACK", link: "/blackjack", logo: <Gem size={48} />, img: "/assets/blackjack.png" },
  { name: "DICE", link: "/dice", logo: <Rocket size={48} />, img: "/assets/dice.png" },
  { name: "HILO", link: "/hilo", logo: <Rocket size={48} />, img: "/assets/hilo.png" },
];

/** Narrow type so we don’t rely on an exact schema */
type RecentBet = {
  id: string;
  username?: string | null;
  game?: string | null;
  amount?: number | null;
  payout?: number | null;
  outcome?: "win" | "loss" | "cashout" | string | null;
  created_at?: string | null;
};

export default function Home() {
  const { balance, setBalance } = useCommonStore();
  const { user } = useAuth();

  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [canClaimWeekly, setCanClaimWeekly] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("");
  const [weeklyCountdown, setWeeklyCountdown] = useState("");

  const [showSeason2, setShowSeason2] = useState(true);

  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");

  const [myBetsCount, setMyBetsCount] = useState(0);
  const [myRank, setMyRank] = useState<number | null>(null);

  const [leaderboard, setLeaderboard] = useState<{ username: string; balance: number }[]>([]);
  const [recentBets, setRecentBets] = useState<RecentBet[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [isSuper, setIsSuper] = useState(false);
  const loggedOnceRef = useRef(false);

  /** Super user check (unchanged) */
  useEffect(() => {
    if (!user) return;
    const username = user.user_metadata?.username;
    setIsSuper(username === "SmacklePackle");
  }, [user]);

  /** Leaderboard (unchanged but called more places) */
  const fetchLeaderboard = async () => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("username,balance")
        .order("balance", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (data) setLeaderboard(data);
    } catch (err) {
      console.error("Failed to fetch leaderboard:", err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    // show once per browser until dismissed
    const seen = typeof window !== "undefined" && localStorage.getItem("season2_banner_seen");
    if (seen) setShowSeason2(false);
  }, []);

  const dismissSeason2 = () => {
    setShowSeason2(false);
    try { localStorage.setItem("season2_banner_seen", "1"); } catch {}
  };

  const goPromoWithCode = () => {
    setPromoCode("SEASON2");
    // smooth scroll with your existing offset logic
    scrollToTarget("#promo");
    history.replaceState(null, "", "#promo");
    // (optional) nudge
    toast.success("Code applied! Scroll to Promo to redeem.");
  };

  /** Countdown to prize close (kept) */
  useEffect(() => {
    const targetMs = new Date("2025-10-01T00:00:00Z").getTime();
    const tick = () => {
      const now = Date.now();
      const d = targetMs - now;
      if (d <= 0) return setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      setTimeLeft({
        days: Math.floor(d / 86_400_000),
        hours: Math.floor((d % 86_400_000) / 3_600_000),
        minutes: Math.floor((d % 3_600_000) / 60_000),
        seconds: Math.floor((d % 60_000) / 1000),
      });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const fetchMyRank = async () => {
    if (!user?.id) { setMyRank(null); return; }

    // get a fresh balance (or use store if you prefer)
    const { data: me, error: meErr } = await supabase
      .from("users")
      .select("balance")
      .eq("id", user.id)
      .maybeSingle();
    if (meErr || !me) { setMyRank(null); return; }

    const myBal = Number(me.balance ?? 0);

    // count users strictly ahead of me
    const { count, error } = await supabase
      .from("users")
      .select("id", { count: "exact", head: true })
      .gt("balance", myBal);

    if (error) {
      console.error("Failed to compute rank:", error);
      setMyRank(null);
      return;
    }

    setMyRank((count ?? 0) + 1);
  };

  useEffect(() => {
    fetchMyRank();
  }, [user?.id, balance]);


  /** Visit logging (kept) */
  useEffect(() => {
    if (!user) return;
    if (loggedOnceRef.current) return;
    loggedOnceRef.current = true;
    (async () => {
      if (!user) return;
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const path = typeof window !== "undefined" ? window.location.pathname : "/";
      try {
        const res = await fetch(`/api/visit?path=${encodeURIComponent(path)}`, {
          method: "POST",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j?.error || `HTTP ${res.status}`);
        }
      } catch (e) {
        console.error("visit log failed:", e);
      }
    })();
  }, [user]);

  // 1) Add this helper near the top (inside your component but above return)
  const scrollToTarget = (hash: string) => {
    const el = document.querySelector(hash) as HTMLElement | null;
    if (!el) return;

    // Try to read your fixed nav height; fallback to 80px
    const nav = document.querySelector("nav.fixed") as HTMLElement | null;
    const navH = nav?.offsetHeight ?? 80;

    const y = el.getBoundingClientRect().top + window.scrollY - navH - 8; // small gap
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const onAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, hash: string) => {
    e.preventDefault();
    scrollToTarget(hash);
    // keep the URL hash in sync (no jump)
    history.replaceState(null, "", hash);
  };

  // Optional: if the page loads with a hash, offset that too
  useEffect(() => {
    if (window.location.hash) {
      // Wait a tick so layout is ready
      setTimeout(() => scrollToTarget(window.location.hash), 0);
    }
  }, []);


  const fetchMyBetsCount = async () => {
    if (!user?.id) { setMyBetsCount(0); return; }

    const { count, error } = await supabase
      .from("bets")
      .select("id", { count: "exact", head: true }) // count only
      .eq("user_id", user.id);

    if (error) {
      console.error("Failed to count my bets:", error);
      return;
    }
    setMyBetsCount(count ?? 0);
  };

  useEffect(() => {
    fetchMyBetsCount();
  }, [user?.id]);

  /** Quiz (kept) */
  const generateQuestion = () => {
    setNum1(Math.floor(Math.random() * 20) + 1);
    setNum2(Math.floor(Math.random() * 20) + 1);
    setAnswer("");
    setAnswerState("idle");
  };
  useEffect(() => { generateQuestion(); }, []);
  const submitAnswer = async () => {
    if (!user) return;
    const correct = parseInt(answer) === num1 + num2;
    if (correct) {
      setAnswerState("correct");
      try {
        const { data: userDoc, error: fetchError } = await supabase
          .from("users").select("*").eq("id", user.id).maybeSingle();
        if (fetchError || !userDoc) throw fetchError || new Error("User not found");
        const newBalance = (userDoc.balance || 0) + 1;
        const { error: updateError } = await supabase
          .from("users").update({ balance: newBalance }).eq("id", user.id);
        if (updateError) throw updateError;
        setBalance(newBalance, user.id);
      } catch (err) {
        console.error(err);
      }
    } else {
      setAnswerState("wrong");
    }
    setTimeout(() => generateQuestion(), 1000);
  };

  /** Promo (kept) */
  const [promoCode, setPromoCode] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [modalVisible, setModalVisible] = useState(false);

  const redeemPromo = async () => {
    if (!user) {
      setModalMessage("You must be logged in to redeem promo codes!");
      setModalVisible(true);
      return;
    }
    try {
      const { data: promo, error } = await supabase
        .from("promo_codes").select("*").eq("code", promoCode.toUpperCase()).maybeSingle();
      if (error) throw error;
      if (!promo) {
        setModalMessage("Invalid promo code!");
        setModalVisible(true);
        return;
      }
      const usedBy: string[] = promo.used_by || [];
      if (usedBy.includes(user.id)) {
        setModalMessage("You have already redeemed this code!");
        setModalVisible(true);
        return;
      }
      const { data: userDoc, error: fetchError } = await supabase
        .from("users").select("*").eq("id", user.id).maybeSingle();
      if (fetchError || !userDoc) throw fetchError || new Error("User not found");

      const newBalance = (userDoc.balance || 0) + promo.amount;
      const { error: updateError } = await supabase
        .from("users").update({ balance: newBalance }).eq("id", user.id);
      if (updateError) throw updateError;

      const { error: promoUpdateError } = await supabase
        .from("promo_codes").update({ used_by: [...usedBy, user.id] }).eq("id", promo.id);
      if (promoUpdateError) throw promoUpdateError;

      setBalance(newBalance, user.id);
      setPromoCode("");
      setModalMessage(`Successfully redeemed ${promo.amount} steaks!`);
      setModalVisible(true);
    } catch (err) {
      console.error(err);
      setModalMessage("Failed to redeem promo code.");
      setModalVisible(true);
    }
  };

  /** Rewards (kept) */
  const [dailyIntervalId, setDailyIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [weeklyIntervalId, setWeeklyIntervalId] = useState<NodeJS.Timeout | null>(null);

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds
      .toString().padStart(2, "0")}`;
  };

  const checkRewards = async () => {
    if (!user) return;
    try {
      const { data: userDoc, error } = await supabase
        .from("users").select("*").eq("id", user.id).single();
      if (error || !userDoc) throw error || new Error("User not found");

      const now = new Date();

      // Daily
      const lastDailyUTC = userDoc.lastDailyClaim ? new Date(userDoc.lastDailyClaim + "Z") : null;
      const dailyReset = lastDailyUTC ? new Date(lastDailyUTC.getTime() + 86_400_000) : null;
      if (!lastDailyUTC || now >= dailyReset!) {
        setCanClaimDaily(true);
        setDailyCountdown("");
        if (dailyIntervalId) { clearInterval(dailyIntervalId); setDailyIntervalId(null); }
      } else {
        setCanClaimDaily(false);
        if (dailyIntervalId) clearInterval(dailyIntervalId);
        const id = setInterval(() => {
          const remaining = dailyReset!.getTime() - Date.now();
          if (remaining <= 0) {
            setCanClaimDaily(true);
            setDailyCountdown("");
            clearInterval(id);
            setDailyIntervalId(null);
          } else {
            setDailyCountdown(formatTime(remaining));
          }
        }, 1000);
        setDailyIntervalId(id);
      }

      // Weekly
      const lastWeeklyUTC = userDoc.lastWeeklyClaim ? new Date(userDoc.lastWeeklyClaim + "Z") : null;
      const weeklyReset = lastWeeklyUTC ? new Date(lastWeeklyUTC.getTime() + 7 * 86_400_000) : null;
      if (!lastWeeklyUTC || now >= weeklyReset!) {
        setCanClaimWeekly(true);
        setWeeklyCountdown("");
        if (weeklyIntervalId) { clearInterval(weeklyIntervalId); setWeeklyIntervalId(null); }
      } else {
        setCanClaimWeekly(false);
        if (weeklyIntervalId) clearInterval(weeklyIntervalId);
        const id = setInterval(() => {
          const remaining = weeklyReset!.getTime() - Date.now();
          if (remaining <= 0) {
            setCanClaimWeekly(true);
            setWeeklyCountdown("");
            clearInterval(id);
            setWeeklyIntervalId(null);
          } else {
            setWeeklyCountdown(formatTime(remaining));
          }
        }, 1000);
        setWeeklyIntervalId(id);
      }

      // Keep balance synced
      if (userDoc.balance !== undefined) setBalance(userDoc.balance, user.id);
    } catch (err) {
      console.error("Error fetching user rewards:", err);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const li = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(li);
  }, []);

  useEffect(() => {
    checkRewards();
    const i = setInterval(checkRewards, 5000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (user) checkRewards();
    return () => {
      if (dailyIntervalId) clearInterval(dailyIntervalId);
      if (weeklyIntervalId) clearInterval(weeklyIntervalId);
    };
  }, [user]);

  const claimReward = async (type: "daily" | "weekly") => {
    if (!user) return;
    try {
      const { data: userDoc, error: fetchError } = await supabase
        .from("users").select("*").eq("id", user.id).single();
      if (fetchError || !userDoc) throw fetchError || new Error("User not found");

      const rewardAmount = type === "daily" ? 1000 : 10000;
      const updates: any = { balance: (userDoc.balance || 0) + rewardAmount };
      const now = new Date().toISOString();
      if (type === "daily") updates.lastDailyClaim = now; else updates.lastWeeklyClaim = now;

      const { error: updateError } = await supabase.from("users").update(updates).eq("id", user.id);
      if (updateError) throw updateError;

      setBalance(updates.balance, user.id);
      if (type === "daily") setCanClaimDaily(false); else setCanClaimWeekly(false);
      await checkRewards();
      await fetchLeaderboard();
    } catch (err) {
      console.error(`Error claiming ${type} reward:`, err);
    }
  };

  /** Recent Bets (new; safe if table missing) */
  const fetchRecentBets = async () => {
    try {
      const { data, error } = await supabase
        .from("bets")
        .select("id, username, game, amount, payout, outcome, created_at")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setRecentBets(data || []);
    } catch (e) {
      // Non-fatal: silently ignore if table not present
      console.warn("Recent bets unavailable:", e);
      setRecentBets([]);
    }
  };

  useEffect(() => {
    fetchRecentBets();
    const i = setInterval(fetchRecentBets, 4500);
    return () => clearInterval(i);
  }, []);

  /** ------------- LAYOUT ------------- */
  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* SIDEBAR */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        recentBets={recentBets}
        balance={balance}
      />

      {/* TOP BAR (mobile) */}
      <header id="top" className="md:hidden sticky top-0 z-30 bg-[#0b0f14]/80 backdrop-blur-xl border-b border-white/10 scroll-mt-24 md:scroll-mt-28">
        <div className="h-14 flex items-center px-4">
          <button
            className="p-2 rounded hover:bg-white/10"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar"
          >
            <Menu />
          </button>
          <div className="mx-auto font-bold">Steak</div>
          <div className="text-sm text-white/60">Bal: {balance ?? 0}</div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="md:pl-72">
        {showSeason2 && (
          <section className="px-6 pt-4">
            <div className="relative max-w-7xl mx-auto overflow-hidden rounded-2xl border border-emerald-400/30 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-teal-500/10">
              {/* glow accents */}
              <div className="pointer-events-none absolute -top-16 -left-16 h-40 w-40 rounded-full blur-3xl bg-emerald-500/30" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-40 w-40 rounded-full blur-3xl bg-teal-400/30" />

              <div className="relative flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-5 px-5 py-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded-md bg-emerald-500/20 text-emerald-200 border border-emerald-400/30">
                    <Sparkles size={12} /> NEW
                  </span>
                  <Gift className="w-5 h-5 text-emerald-300" />
                </div>

                <p className="text-sm md:text-base text-emerald-100/90">
                  <span className="font-semibold text-emerald-200">Season 2 is underway!</span>{" "}
                  Use code <span className="font-mono font-bold tracking-wide text-emerald-300">SEASON2</span> for{" "}
                  <span className="font-semibold text-emerald-200">500 Steaks</span>.
                </p>

                <div className="flex items-center gap-2 md:ml-auto">
                  <button
                    onClick={goPromoWithCode}
                    className="px-3 py-2 text-sm rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold transition"
                  >
                    Apply & Redeem
                  </button>
                  <button
                    onClick={dismissSeason2}
                    className="px-3 py-2 text-sm rounded-xl border border-white/15 hover:bg-white/10 text-white/80 transition"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}
        {/* HERO */}
        <section className="relative">
          <div className="absolute inset-0">
            {/* idk bro 
            <img
              src="/assets/Online-gambling.jpg"
              alt="Hero"
              className="w-full h-[42vh] md:h-[56vh] object-cover opacity-40"
            />
            */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0f14]/40 to-[#0b0f14]" />
          </div>

          <div className="relative px-6 pt-10 pb-8 md:pb-14 max-w-7xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-400/10 border border-emerald-300/20 text-emerald-200 text-xs font-semibold">
              Current season ends in {timeLeft.days}d {timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s
            </div>
            <h1 className="mt-5 text-4xl md:text-6xl font-extrabold tracking-tight">
              Welcome to <span className="text-emerald-400">Steak</span>
            </h1>
            <p className="mt-3 text-white/70 text-lg md:text-xl max-w-2xl">
              Play real games, earn rewards, and climb the leaderboard. Feeling lucky?
            </p>

            {/* Quick actions */}
            <div className="mt-6 grid grid-cols-2 sm:flex gap-3">
              <a href="#games" onClick={(e) => onAnchorClick(e, "#games")} className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-black rounded-xl font-semibold">
                Play Now
              </a>
              <a href="#rewards" onClick={(e) => onAnchorClick(e, "#rewards")} className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold">
                Claim Rewards
              </a>
              <a href="#leaderboard" onClick={(e) => onAnchorClick(e, "#leaderboard")} className="px-5 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-semibold">
                View Leaderboard
              </a>
            </div>
          </div>
        </section>

        {/* STATS STRIP */}
        <section className="border-y border-white/10 bg-[#0d1218]/70 backdrop-blur">
          <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Your Rank" value={user ? (myRank ? `#${myRank}` : "—") : "—"} />
            <Stat label="Daily" value={canClaimDaily ? "Ready" : dailyCountdown || "—"} />
            <Stat label="Weekly" value={canClaimWeekly ? "Ready" : weeklyCountdown || "—"} />
            <Stat label="Your Total Bets" value={user ? myBetsCount.toLocaleString() : "0"} />
          </div>
        </section>

        {/* GAMES + RECENT BETS */}
        <section id="games" className="max-w-7xl mx-auto px-6 py-10 mt-5 scroll-mt-24 md:scroll-mt-28">
          <div className="flex items-center gap-3 mb-5">
            <Gamepad2 />
            <h2 className="text-2xl font-bold">Play Now</h2>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            {/* Games grid */}
            <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-6">
              {games.map((game, i) => (
                <div
                  key={i}
                  className={`group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:bg-white/10 transition
                              ${!user ? "pointer-events-none opacity-50" : "hover:border-emerald-400/40"}`}
                >
                  {user ? (
                    <Link href={game.link} className="block">
                      <img src={game.img} alt={game.name}
                        className="w-full h-44 md:h-48 object-cover group-hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                        <div className="font-semibold tracking-wide">{game.name}</div>
                      </div>
                    </Link>
                  ) : (
                    <>
                      <img src={game.img} alt={game.name} className="w-full h-44 md:h-48 object-cover" />
                      <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent">
                        <div className="font-semibold tracking-wide">{game.name}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Recent Bets panel (full size on desktop) */}
            <div className="rounded-2xl border border-white/10 bg-white/5">
              <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="font-semibold">Recent Bets</div>
                <div className="text-xs text-white/50">{recentBets.length} latest</div>
              </div>
              <div className="max-h-[30rem] overflow-auto divide-y divide-white/5">
                {recentBets.length === 0 && (
                  <div className="p-6 text-sm text-white/50">No recent bets to show.</div>
                )}
                {recentBets.slice(0, 6).map((b) => (
                  <div key={b.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/5">
                    <div className="min-w-0">
                      <div className="font-medium truncate">
                        {b.username || "Player"} <span className="text-white/50">played</span>{" "}
                        <span className="text-emerald-300">{b.game || "Game"}</span>
                      </div>
                      <div className="text-xs text-white/40">
                        {b.created_at ? new Date(b.created_at).toLocaleString() : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold">
                        {b.outcome === "win" ? (
                          <span className="text-emerald-400">+{b.payout ?? 0}</span>
                        ) : b.outcome === "loss" ? (
                          <span className="text-red-400">-{b.amount ?? 0}</span>
                        ) : (
                          <span className="text-white/70">{b.payout ?? b.amount ?? 0}</span>
                        )}
                      </div>
                      <div className="text-[10px] text-white/40">bet {b.amount ?? 0}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* EARN STEAK (quiz) */}
        <section className="max-w-7xl mx-auto px-6 py-10">
          <h2 className="text-2xl font-bold mb-2">Earn <span className="text-emerald-400">Steak</span></h2>
          <p className="text-white/60 mb-4">Solve the addition problem to earn +1 steak!</p>
          <form
            onSubmit={(e) => { e.preventDefault(); submitAnswer(); }}
            className="flex flex-wrap items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4"
          >
            <span className="text-xl">{num1} + {num2} =</span>
            <input
              type="number"
              value={answer}
              disabled={!user}
              onChange={(e) => setAnswer(e.target.value)}
              className="px-4 py-2 rounded-xl bg-[#111823] text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
            <button
              type="submit"
              disabled={!user}
              className={`px-6 py-2 rounded-xl w-28 font-semibold transition-colors
                ${answerState === "idle"
                  ? "bg-emerald-500 hover:bg-emerald-600 text-black"
                  : answerState === "correct"
                  ? "bg-green-500 text-black"
                  : "bg-red-500 text-white"}`}
            >
              {answerState === "correct" ? "✔" : answerState === "wrong" ? "✖" : "Submit"}
            </button>
          </form>
        </section>

        {/* REWARDS */}
        <section id="rewards" className="max-w-7xl mx-auto px-6 py-10 scroll-mt-24 md:scroll-mt-28">
          <h2 className="text-2xl font-bold mb-2">
            Claim <span className="text-emerald-400">Rewards</span>
          </h2>
          <p className="text-white/60 mb-5">Claim Daily/Weekly Rewards</p>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => claimReward("daily")}
              disabled={!canClaimDaily}
              className="w-64 bg-[#4cd964] hover:bg-[#3cc153] disabled:bg-[#2c3a47] disabled:text-gray-400 text-black font-semibold py-4 rounded-xl transition-colors"
            >
              {canClaimDaily ? "Claim Daily" : `Next Daily: ${dailyCountdown || "N/A"}`}
            </button>
            <button
              onClick={() => claimReward("weekly")}
              disabled={!canClaimWeekly}
              className="w-64 bg-[#4cd964] hover:bg-[#3cc153] disabled:bg-[#2c3a47] disabled:text-gray-400 text-black font-semibold py-4 rounded-xl transition-colors"
            >
              {canClaimWeekly ? "Claim Weekly" : `Next Weekly: ${weeklyCountdown || "N/A"}`}
            </button>
          </div>
        </section>

        {/* PROMO */}
        <section id="promo" className="max-w-7xl mx-auto px-6 py-10 scroll-mt-24 md:scroll-mt-28">
          <h2 className="text-2xl font-bold mb-4">Promo Codes</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); redeemPromo(); }}
            className="flex flex-wrap gap-3 items-center"
          >
            <input
              type="text"
              value={promoCode}
              disabled={!user}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter code..."
              className="px-4 py-3 rounded-xl bg-[#111823] text-white border border-white/10 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            />
            <button
              type="submit"
              disabled={!user}
              className="px-6 py-3 bg-emerald-500 disabled:bg-gray-600 hover:bg-emerald-600 rounded-xl text-black font-semibold"
            >
              Redeem
            </button>
          </form>
        </section>

        {/* LEADERBOARD */}
        <section id="leaderboard" className="max-w-7xl mx-auto px-6 py-12 scroll-mt-24 md:scroll-mt-28">
          <h2 className="text-3xl font-bold mb-2">🏆 Top Players</h2>
          <p className="text-white/60 mb-6">
            Winner gets $10 AUD: {timeLeft.days}d, {timeLeft.hours}h, {timeLeft.minutes}m, {timeLeft.seconds}s
          </p>

          <div className="w-full bg-white/5 rounded-2xl border border-white/10 overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr_1fr] bg-white/10 text-white/70 font-semibold px-4 py-2">
              <span>Rank</span>
              <span>Username</span>
              <span>Balance</span>
            </div>
            {leaderboard.map((lbUser, idx) => {
              const isCurrentUser = user?.user_metadata?.username === lbUser.username;
              return (
                <div
                  key={lbUser.username}
                  className={`grid grid-cols-[1fr_2fr_1fr] px-4 py-3 
                    ${idx % 2 === 0 ? "bg-white/[0.03]" : "bg-white/[0.01]"}
                    hover:bg-white/10 transition-colors
                    ${idx === 0 ? "relative z-10 outline outline-2 outline-yellow-400" : ""}
                    ${isCurrentUser && idx !== 0 ? "outline outline-2 outline-gray-400" : ""}`}
                >
                  <span className={idx === 0 ? "text-yellow-400 font-bold" : "text-white/80 font-bold"}>
                    {idx + 1}
                  </span>
                  <span className={`font-medium ${isCurrentUser ? "text-emerald-300" : "text-white"}`}>
                    {lbUser.username}
                  </span>
                  <span className="text-emerald-400 font-semibold">{lbUser.balance}</span>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* PROMO MODAL (kept) */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-[#0f141b] text-white p-6 rounded-2xl border border-white/10 w-96">
            <p className="mb-4 text-center">{modalMessage}</p>
            <button
              onClick={() => setModalVisible(false)}
              className="w-full px-4 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-black font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/** ---------- UI Bits ---------- */
function SideLink({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
    >
      <span className="w-5 h-5 grid place-items-center">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-white/50">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}
