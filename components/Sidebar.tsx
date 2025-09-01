/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { X, Home as HomeIcon, Gamepad2, Gift, Ticket, Trophy, Settings, Beef, SendIcon, Crown, Sword } from "lucide-react";
import React from "react";

type RecentBet = {
  id: string;
  username?: string | null;
  game?: string | null;
  amount?: number | null;
  payout?: number | null;
  outcome?: "win" | "loss" | "cashout" | string | null;
  created_at?: string | null;
};

export default function Sidebar({
  open,
  onClose,
  recentBets,
  balance,
}: {
  open: boolean;
  onClose: () => void;
  recentBets: RecentBet[];
  balance?: number | null;
}) {
  // ---- Smooth scroll under fixed navbar (shared helper) ----
  const scrollToTarget = React.useCallback((hash: string) => {
    const selector = hash.startsWith("/#") ? hash.slice(1) : hash; // turn "/#id" -> "#id"
    const el = document.querySelector(selector) as HTMLElement | null;
    if (!el) return;
    const nav = document.querySelector("nav.fixed") as HTMLElement | null;
    const navH = nav?.offsetHeight ?? 80;
    const y = el.getBoundingClientRect().top + window.scrollY - navH - 8;
    window.scrollTo({ top: y, behavior: "smooth" });
    history.replaceState(null, "", selector); // keep URL in sync without jump
  }, []);

  // Intercept clicks on in-page links so we can offset & close sidebar
  const onAnchorClick = React.useCallback(
    (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
      const isHash = href.startsWith("#") || href.startsWith("/#");
      if (!isHash) return; // let normal route links pass through
      e.preventDefault();
      scrollToTarget(href);
      onClose?.();
    },
    [onClose, scrollToTarget]
  );

  return (
    <aside
      className={`fixed z-40 inset-y-0 left-0 w-72 bg-[#0e141b]/80 backdrop-blur-xl border-r border-white/10
                  transform transition-transform duration-300 ease-out
                  ${open ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      aria-hidden={!open}
    >
      <div className="h-full flex flex-col">
        {/* header */}
        <div className="flex items-center gap-3 px-5 pt-6 pb-4 border-b border-white/10">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-400/80 to-emerald-600/80 grid place-items-center">
            <Beef />
          </div>
          <div>
            <div className="font-extrabold text-xl">Steak</div>
            <div className="text-xs text-white/60">Play Real Games</div>
          </div>
          <button
            className="ml-auto md:hidden p-2 rounded hover:bg-white/10"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        {/* nav */}
        <nav className="p-4 space-y-1">
          <SideLink icon={<HomeIcon size={18} />} label="Home" href="#top" onAnchorClick={onAnchorClick} />
          <SideLink icon={<Gamepad2 size={18} />} label="Games" href="#games" onAnchorClick={onAnchorClick} />
          <SideLink icon={<Gift size={18} />} label="Rewards" href="#rewards" onAnchorClick={onAnchorClick} />
          <SideLink icon={<Ticket size={18} />} label="Promo" href="#promo" onAnchorClick={onAnchorClick} />
          <SideLink icon={<Trophy size={18} />} label="Leaderboard" href="#leaderboard" onAnchorClick={onAnchorClick} />
          <SideLink icon={<SendIcon size={18} />} label="Send Steaks" href="/give" />
          <SideLink icon={<Sword size={18} />} label="Season Pass" href="/challenges" />
          <SideLink icon={<Crown size={18} />} label="Clubs" href="/clubs" />
          <SideLink icon={<Settings size={18} />} label="Settings" href="/settings" />
        </nav>

        {/* recent bets (unchanged; show max 3) */}
        <div className="mt-auto">
          <h4 className="px-5 py-3 text-sm font-semibold text-white/70 border-t border-white/10">Recent Bets</h4>
          <div className="max-h-60 overflow-auto px-3 pb-3 space-y-2">
            {(!recentBets || recentBets.length === 0) && (
              <div className="text-xs text-white/40 px-2 py-4">No recent bets yet.</div>
            )}
            {(recentBets || []).slice(0, 3).map((b) => (
              <div
                key={b.id}
                className="text-xs bg-white/5 rounded-lg px-3 py-2 flex items-center justify-between"
              >
                <div className="truncate">
                  <span className="text-white/80">{b.username || "Player"}</span>{" "}
                  <span className="text-white/50">on</span>{" "}
                  <span className="text-emerald-300">{b.game || "Game"}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">
                    {b.outcome === "win" ? (
                      <span className="text-emerald-400">+{b.payout ?? 0}</span>
                    ) : b.outcome === "loss" ? (
                      <span className="text-red-400">-{b.amount ?? 0}</span>
                    ) : (
                      <span className="text-white/70">{b.payout ?? b.amount ?? 0}</span>
                    )}
                  </div>
                  <div className="text-white/40 text-[10px]">
                    {b.created_at ? new Date(b.created_at).toLocaleTimeString() : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}

/* Link component that intercepts #hash links for offset scroll */
function SideLink({
  icon,
  label,
  href,
  onAnchorClick,
}: {
  icon: React.ReactNode;
  label: string;
  href: string;
  onAnchorClick?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
}) {
  const isHash = href.startsWith("#") || href.startsWith("/#");
  return (
    <Link
      href={href}
      onClick={isHash ? (e) => onAnchorClick?.(e, href) : undefined}
      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors"
    >
      <span className="w-5 h-5 grid place-items-center">{icon}</span>
      <span className="font-medium">{label}</span>
    </Link>
  );
}
