/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRightLeft, Check, Search, User2, Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import { useCommonStore } from "@/app/_store/commonStore";
import { toast } from "react-hot-toast";
import Link from "next/link";

type LiteUser = { id: string; username: string | null; balance?: number | null };

export default function GivePage() {
  const { user } = useAuth();
  const { balance, setBalance } = useCommonStore();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LiteUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<LiteUser | null>(null);

  const [amountStr, setAmountStr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const debRef = useRef<number | null>(null);

  // Debounced search — hook is always declared; body exits early when needed
  useEffect(() => {
    if (debRef.current) window.clearTimeout(debRef.current);

    // If not logged in or query too short, clear results and bail
    if (!user || !query || query.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    debRef.current = window.setTimeout(async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("users")
          .select("id, username, balance")
          .ilike("username", `%${query.trim()}%`)
          .limit(8);

        if (error) throw error;
        const filtered = (data || []).filter((u) => u.id !== user.id);
        setResults(filtered);
      } catch (e) {
        console.error(e);
        toast.error("Search failed");
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      if (debRef.current) window.clearTimeout(debRef.current);
    };
  }, [query, user]);

  const numericAmount = useMemo(() => {
    const n = parseFloat(amountStr);
    return Number.isFinite(n) ? n : NaN;
  }, [amountStr]);

  const canSubmit =
    !!user &&
    !!picked &&
    Number.isFinite(numericAmount) &&
    numericAmount > 0 &&
    (balance ?? 0) >= numericAmount &&
    !submitting;

  const onSend = async () => {
    if (!user || !picked) return;
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    if ((balance ?? 0) < numericAmount) {
      toast.error("Insufficient balance");
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc("transfer_steaks", {
        p_to: picked.id,
        p_amount: numericAmount,
      });
      if (error) throw error;

      const fromBal =
        Array.isArray(data) ? data[0]?.from_balance : (data as any)?.from_balance;

      if (typeof fromBal === "number") {
        setBalance(fromBal, user.id);
      }

      toast.success(
        `Sent ${numericAmount} Steaks to ${picked.username ?? "player"}!`,
        { icon: "🎉" }
      );

      setAmountStr("");
      setPicked(null);
      setQuery("");
      setResults([]);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Transfer failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f14] text-white">
      {/* Top banner */}
      <div className="relative px-6 py-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.12),transparent_60%)] pointer-events-none" />
        <div className="relative max-w-5xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-200 text-xs font-semibold">
            <Sparkles className="w-4 h-4" /> Send some love
          </div>
          <h1 className="mt-4 text-4xl md:text-6xl font-extrabold tracking-tight">
            Give <span className="text-emerald-400">Steaks</span>
          </h1>
          <p className="mt-3 text-white/70 text-lg max-w-2xl">
            Instantly gift Steaks to friends. Pick a user, enter an amount, and send—secure, fast, and atomic.
          </p>
        </div>
      </div>

      {/* Logged-out view (rendered conditionally, not early-return) */}
      {!user ? (
        <div className="min-h-[50vh] grid place-items-center px-6 pb-20">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-extrabold">Sign in to give Steaks</h2>
            <p className="text-white/60">You need an account to send funds to another player.</p>
            <div className="flex justify-center gap-3 pt-2">
              <Link href="/login" className="px-4 py-2 rounded-lg bg-emerald-500 text-black font-semibold hover:bg-emerald-400">
                Login
              </Link>
              <Link href="/signup" className="px-4 py-2 rounded-lg border border-white/20 hover:bg-white/10">
                Create account
              </Link>
            </div>
          </div>
        </div>
      ) : (
        // Logged-in view
        <div className="px-6 pb-20">
          <div className="max-w-5xl mx-auto grid md:grid-cols-5 gap-6">
            {/* Left: form */}
            <div className="md:col-span-3">
              <div className="relative rounded-2xl border border-white/10 bg-white/[0.04] p-6 overflow-hidden">
                <div
                  className="absolute -inset-px rounded-2xl pointer-events-none"
                  style={{ background: "linear-gradient(135deg, rgba(16,185,129,0.2), transparent 40%)" }}
                />
                <div className="relative space-y-6">
                  {/* Balance */}
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-white/60">Your balance</div>
                    <div className="text-lg font-semibold">
                      {(balance ?? 0).toLocaleString()} <span className="text-emerald-400">Steaks</span>
                    </div>
                  </div>

                  {/* Search users */}
                  <div>
                    <label className="text-sm text-white/70">Find a recipient</label>
                    <div className="mt-2 relative">
                      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#0f141b] px-3 py-2.5 focus-within:ring-2 focus-within:ring-emerald-400/40">
                        <Search className="w-4 h-4 text-white/50" />
                        <input
                          value={query}
                          onChange={(e) => {
                            setQuery(e.target.value);
                            setPicked(null);
                          }}
                          placeholder="Start typing a username…"
                          className="w-full bg-transparent outline-none text-white placeholder-white/40"
                        />
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
                      </div>

                      {/* Results dropdown */}
                      {query.trim().length >= 2 && !picked && (
                        <div className="absolute z-10 mt-2 w-full rounded-xl border border-white/10 bg-[#0e141b]/95 backdrop-blur-xl shadow-xl overflow-hidden">
                          {results.length === 0 && !loading ? (
                            <div className="px-3 py-3 text-sm text-white/60">No users found.</div>
                          ) : (
                            results.map((u) => (
                              <button
                                key={u.id}
                                onClick={() => setPicked(u)}
                                className="w-full text-left px-3 py-2.5 hover:bg-white/10 flex items-center gap-3"
                              >
                                <div className="w-8 h-8 rounded-lg bg-white/10 grid place-items-center">
                                  <User2 className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium truncate">{u.username ?? "Player"}</div>
                                  <div className="text-xs text-white/50 truncate">
                                    Balance: {(u.balance ?? 0).toLocaleString()} Steaks
                                  </div>
                                </div>
                              </button>
                            ))
                          )}
                        </div>
                      )}

                      {/* Picked pill */}
                      {picked && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-400/10 border border-emerald-300/20">
                          <User2 className="w-4 h-4 text-emerald-300" />
                          <span className="text-sm">{picked.username ?? "Player"}</span>
                          <button
                            onClick={() => setPicked(null)}
                            className="ml-1 text-xs text-white/60 hover:text-white"
                            title="Change"
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="text-sm text-white/70">Amount</label>
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        step={0.01}
                        value={amountStr}
                        onChange={(e) => setAmountStr(e.target.value)}
                        placeholder="e.g. 100"
                        className="flex-1 rounded-xl border border-white/10 bg-[#0f141b] px-3 py-2.5 outline-none focus:ring-2 focus:ring-emerald-400/40"
                      />
                      <button
                        type="button"
                        onClick={() => setAmountStr(((balance ?? 0) / 2).toFixed(2))}
                        className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                      >
                        Half
                      </button>
                      <button
                        type="button"
                        onClick={() => setAmountStr((balance ?? 0).toFixed(2))}
                        className="px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 text-sm"
                      >
                        Max
                      </button>
                    </div>
                    <p className="mt-2 text-xs text-white/50">
                      You can’t send more than your current balance.
                    </p>
                  </div>

                  {/* Send */}
                  <div className="pt-2">
                    <button
                      onClick={onSend}
                      disabled={!canSubmit}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 text-black font-semibold px-4 py-3 hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400"
                    >
                      {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-5 h-5" />}
                      {submitting ? "Sending…" : "Send Steaks"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Pretty summary / tips */}
            <div className="md:col-span-2">
              <div className="relative rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 overflow-hidden">
                <div className="absolute -top-24 -right-24 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="relative space-y-5">
                  <h3 className="text-xl font-bold">How it works</h3>
                  <ul className="space-y-3 text-sm text-white/70">
                    <li className="flex gap-3">
                      <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                      Transfers are instant and atomic—either both balances update, or none do.
                    </li>
                    <li className="flex gap-3">
                      <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                      You can only send up to your available balance.
                    </li>
                    <li className="flex gap-3">
                      <Check className="w-4 h-4 mt-0.5 text-emerald-400 shrink-0" />
                      Search finds usernames as you type. Pick carefully!
                    </li>
                  </ul>

                  <div className="mt-6 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
                    <div className="flex items-center gap-2 text-emerald-200 font-semibold">
                      <Sparkles className="w-4 h-4" /> Pro tip
                    </div>
                    <p className="mt-1.5 text-sm text-emerald-100/90">
                      Use the “Max” button to send your full balance in one tap.
                    </p>
                  </div>

                  <div className="mt-6 text-xs text-white/40">
                    Need to receive Steaks? Share your username and ask friends to send via this page.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
