// app/settings/page.tsx
/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import {
  BarChart3,
  Trophy,
  TrendingUp,
  TrendingDown,
  Coins,
  Filter,
  Clock,
  Search,
  Download,
  Dice1,
  Gamepad2,
  Gem,
  Layers,
  Beef
} from "lucide-react";

type BetRow = {
  id: string;
  user_id: string;
  username: string | null;
  game: "MINES" | "BLACKJACK" | "DICE" | "HILO" | string | null;
  amount: number | null;
  payout: number | null;
  outcome: "win" | "loss" | "even" | string | null;
  multiplier?: number | null;
  created_at: string | null;
};

const PAGE_SIZE = 30;

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bets, setBets] = useState<BetRow[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);

  // Filters
  const [q, setQ] = useState("");
  const [gameFilter, setGameFilter] = useState<string>("all");
  const [outcomeFilter, setOutcomeFilter] = useState<string>("all");

  // Lightweight stats source (from fetched bets; good enough and fast)
  const stats = useMemo(() => {
    if (bets.length === 0) {
      return {
        total: 0,
        wins: 0,
        losses: 0,
        evens: 0,
        wagered: 0,
        net: 0,
        biggestWin: 0,
        lastPlayed: null as string | null,
      };
    }
    let wins = 0,
      losses = 0,
      evens = 0,
      wagered = 0,
      net = 0,
      biggestWin = 0;

    for (const b of bets) {
      const amt = Number(b.amount ?? 0);
      const pay = Number(b.payout ?? 0);
      wagered += amt;
      if (b.outcome === "win") {
        wins++;
        biggestWin = Math.max(biggestWin, pay);
        // display model elsewhere shows +payout for win; treat payout as profit
        net += pay;
      } else if (b.outcome === "loss") {
        losses++;
        net -= amt;
      } else {
        evens++;
        // refunded => net 0
      }
    }

    const lastPlayed = bets[0]?.created_at ?? null;
    return {
      total: bets.length,
      wins,
      losses,
      evens,
      wagered,
      net,
      biggestWin,
      lastPlayed,
    };
  }, [bets]);

  const initials = useMemo(() => {
    if (!user) return "P";
    const base = (user.user_metadata?.username || user.email || "P").toUpperCase();
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).slice(0, 2) : base.slice(0, 2);
  }, [user]);

  // Fetch one page (append mode)
  const fetchPage = async (pageIndex: number) => {
    if (!user?.id) return;

    const from = pageIndex * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("bets")
      .select("id,user_id,username,game,amount,payout,outcome,multiplier,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Failed to fetch bets:", error);
      return;
    }

    setBets((prev) => (pageIndex === 0 ? (data ?? []) : [...prev, ...(data ?? [])]));
    setHasMore((data?.length ?? 0) === PAGE_SIZE);
  };

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchPage(0).finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const onLoadMore = async () => {
    const next = page + 1;
    setPage(next);
    await fetchPage(next);
  };

  // Filtered rows (client-side)
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return bets.filter((b) => {
      if (gameFilter !== "all" && (b.game || "").toUpperCase() !== gameFilter.toUpperCase()) return false;
      if (outcomeFilter !== "all" && (b.outcome || "") !== outcomeFilter) return false;
      if (!needle) return true;
      const hay = `${b.username ?? ""} ${b.game ?? ""} ${b.outcome ?? ""}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [bets, q, gameFilter, outcomeFilter]);

  if (!user) {
    return (
      <main className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center rounded-2xl border border-white/10 bg-white/[0.03] p-10">
          <h1 className="text-2xl font-bold text-white">You must be signed in</h1>
          <p className="text-white/60 mt-2">Log in to view your stats and bet history.</p>
          <a
            href="/login"
            className="inline-block mt-6 px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
          >
            Go to Login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#0b0f14] text-white">
      {/* Hero / Header */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full blur-3xl bg-emerald-500/30" />
          <div className="absolute -bottom-32 -right-32 h-72 w-72 rounded-full blur-3xl bg-indigo-500/20" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-16 pb-10">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 grid place-items-center text-xl font-extrabold">
              {initials}
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Settings & Stats</h1>
              <p className="text-white/70">
                Your performance, all in one place — bet history, win rate, and more.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard
            icon={<BarChart3 />}
            label="Total Bets"
            value={stats.total.toLocaleString()}
          />
          <StatCard
            icon={<TrendingUp />}
            label="Wins"
            value={stats.wins.toLocaleString()}
            tone="green"
          />
          <StatCard
            icon={<TrendingDown />}
            label="Losses"
            value={stats.losses.toLocaleString()}
            tone="red"
          />
          <StatCard
            icon={<Trophy />}
            label="Win Rate"
            value={
              stats.total > 0 ? `${((stats.wins / stats.total) * 100).toFixed(1)}%` : "—"
            }
          />
          <StatCard
            icon={<Coins />}
            label="Total Wagered"
            value={formatSteak(stats.wagered)}
          />
          <StatCard
            icon={<Layers />}
            label="Net Profit"
            value={(stats.net >= 0 ? "+" : "") + formatSteak(stats.net)}
            tone={stats.net >= 0 ? "green" : "red"}
          />
        </div>

        <div className="mt-4 text-sm text-white/50 flex items-center gap-2">
          <Clock size={14} />
          <span>
            Last played:{" "}
            {stats.lastPlayed ? new Date(stats.lastPlayed).toLocaleString() : "—"}
          </span>
          <span className="ml-4">Biggest win: {formatSteak(stats.biggestWin)}</span>
        </div>
      </section>

      {/* Filters + Actions */}
      <section className="max-w-7xl mx-auto px-6 mt-10">
        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search bets (game, outcome, username)…"
                  className="w-full rounded-xl bg-[#0f141b] border border-white/10 pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-emerald-400/40"
                />
              </div>

              <div className="flex items-center gap-2">
                <Filter className="text-white/60" size={18} />
                <select
                  value={gameFilter}
                  onChange={(e) => setGameFilter(e.target.value)}
                  className="rounded-lg bg-[#0f141b] border border-white/10 px-3 py-2"
                >
                  <option value="all">All Games</option>
                  <option value="MINES">Mines</option>
                  <option value="BLACKJACK">Blackjack</option>
                  <option value="DICE">Dice</option>
                  <option value="HILO">Higher/Lower</option>
                </select>
                <select
                  value={outcomeFilter}
                  onChange={(e) => setOutcomeFilter(e.target.value)}
                  className="rounded-lg bg-[#0f141b] border border-white/10 px-3 py-2"
                >
                  <option value="all">All Outcomes</option>
                  <option value="win">Win</option>
                  <option value="loss">Loss</option>
                  <option value="even">Refunded</option>
                </select>
              </div>
            </div>

            <button
              onClick={() => exportCsv(filtered)}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10"
              title="Export CSV"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </section>

      {/* Bets Table */}
      <section className="max-w-7xl mx-auto px-6 mt-6 pb-20">
        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[1.25fr,1fr,1fr,1fr,1fr,1fr] bg-white/10 text-white/70 text-xs font-semibold px-4 py-2">
            <div>Date</div>
            <div>Game</div>
            <div>Outcome</div>
            <div>Bet</div>
            <div>Payout</div>
            <div>Net</div>
          </div>

          {loading ? (
            <LoadingRows />
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-white/60 bg-white/[0.03]">
              No bets found.
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {filtered.map((b) => (
                <BetRowItem key={b.id} bet={b} />
              ))}
            </div>
          )}
        </div>

        {hasMore && !loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={onLoadMore}
              className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
            >
              Load more
            </button>
          </div>
        )}
      </section>
    </main>
  );
}

/* ---------- Pieces ---------- */

function StatCard({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  tone?: "green" | "red";
}) {
  const toneClasses =
    tone === "green"
      ? "border-emerald-400/30 bg-emerald-400/[0.06]"
      : tone === "red"
      ? "border-rose-400/30 bg-rose-400/[0.06]"
      : "border-white/10 bg-white/[0.05]";
  return (
    <div
      className={`rounded-2xl border ${toneClasses} p-4 flex items-center gap-3`}
    >
      <div className="p-2 rounded-xl bg-white/10">{icon}</div>
      <div>
        <div className="text-xs text-white/60">{label}</div>
        <div className="text-xl font-bold">{value}</div>
      </div>
    </div>
  );
}

function BetRowItem({ bet }: { bet: BetRow }) {
  const date = bet.created_at ? new Date(bet.created_at) : null;
  const net =
    bet.outcome === "win"
      ? Number(bet.payout ?? 0)
      : bet.outcome === "loss"
      ? -Number(bet.amount ?? 0)
      : 0;

  const outcomeChip =
    bet.outcome === "win"
      ? "text-emerald-300 bg-emerald-500/10 border-emerald-400/30"
      : bet.outcome === "loss"
      ? "text-rose-300 bg-rose-500/10 border-rose-400/30"
      : "text-white/70 bg-white/5 border-white/10";

  const gameIcon = bet.game === "BLACKJACK"
    ? <Gamepad2 size={14} />
    : bet.game === "MINES"
    ? <Gem size={14} />
    : bet.game === "DICE"
    ? <Dice1 size={14} />
    : <Layers size={14} />;

  return (
    <div className="grid grid-cols-[1.25fr,1fr,1fr,1fr,1fr,1fr] items-center px-4 py-2 hover:bg-white/[0.04] transition">
      <div className="text-sm text-white/80">{date ? date.toLocaleString() : "—"}</div>
      <div className="flex items-center gap-2 text-white/90">
        {gameIcon}
        <span className="truncate">{bet.game || "—"}</span>
      </div>
      <div>
        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-xs border ${outcomeChip}`}>
          {bet.outcome === "even" ? "Refunded" : (bet.outcome || "—")}
        </span>
      </div>
      <div className="text-white/90">{formatSteak(bet.amount ?? 0)}</div>
      <div className="text-white/90">
        {bet.outcome === "win" ? (
          <span className="text-emerald-300 font-semibold">+{formatSteak(bet.payout ?? 0)}</span>
        ) : bet.outcome === "loss" ? (
          <span className="text-white/60">—</span>
        ) : (
          <span className="text-white/80">{formatSteak(bet.amount ?? bet.payout ?? 0)}</span>
        )}
      </div>
      <div className={net >= 0 ? "text-emerald-300 font-semibold" : "text-rose-300 font-semibold"}>
        {(net >= 0 ? "+" : "") + formatSteak(net)}
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="divide-y divide-white/5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="grid grid-cols-[1.25fr,1fr,1fr,1fr,1fr,1fr] px-4 py-3">
          {Array.from({ length: 6 }).map((__, j) => (
            <div key={j} className="h-4 rounded bg-white/10 animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

/* Utilities */
function formatSteak(n: number) {
  // If you prefer no decimals, change to 0
  return `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function exportCsv(rows: BetRow[]) {
  const header = [
    "id",
    "created_at",
    "game",
    "outcome",
    "amount",
    "payout",
    "net",
    "multiplier",
  ];

  const lines = rows.map((b) => {
    const amt = Number(b.amount ?? 0);
    const pay = Number(b.payout ?? 0);
    const net =
      b.outcome === "win" ? pay : b.outcome === "loss" ? -amt : 0;

    return [
      b.id,
      b.created_at ?? "",
      b.game ?? "",
      b.outcome ?? "",
      amt,
      pay,
      net,
      b.multiplier ?? "",
    ]
      .map((x) => `"${String(x).replace(/"/g, '""')}"`)
      .join(",");
  });

  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "bets.csv";
  a.click();
  URL.revokeObjectURL(url);
}
