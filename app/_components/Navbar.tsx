/* eslint-disable @next/next/no-img-element */
"use client";

import { useCommonStore } from "@/app/_store/commonStore";
import { Beef, Crown, Menu, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useMemo, useState, useRef } from "react";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const { user, logout } = useAuth();
  const { balance, fetchBalance } = useCommonStore();

  const [isSuper, setIsSuper] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { if (user?.id) fetchBalance(user.id); }, [user, fetchBalance]);
  useEffect(() => { if (user) setIsSuper(user.id === "1284b5b7-9379-4166-96fb-5d343f97b1e3"); }, [user]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const username = user?.user_metadata?.username || user?.email || "Player";
  const initials = useMemo(() => {
    const base = (user?.user_metadata?.username || user?.email || "P").toUpperCase();
    const parts = base.split(/[\s._-]+/).filter(Boolean);
    return parts.length >= 2 ? (parts[0][0] + parts[1][0]).slice(0, 2) : base.slice(0, 2);
  }, [user]);

  return (
    <>
      <nav
        className={`fixed top-0 right-0 left-0 z-50 bg-[#0b0f14]/40 backdrop-blur-xl border-b border-white/10 ${
          isHome ? "md:left-72" : "md:left-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 sm:h-18 flex items-center justify-between gap-3">
            {/* Left: brand + mobile menu */}
            <div className="flex items-center gap-3">
              <button
                className="md:hidden p-2 rounded-lg hover:bg-white/10"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
              >
                <Menu />
              </button>
            </div>

            {/* Center: anchors (desktop) */}
            <div className="hidden md:flex items-center gap-2 text-sm">
              <NavA href="/#top" label="Home" />
              <NavA href="/#games" label="Games" />
              <NavA href="/#rewards" label="Rewards" />
              <NavA href="/#promo" label="Promo" />
              <NavA href="/#leaderboard" label="Leaderboard" />
            </div>

            {/* Right: balance + user */}
            <div className="flex items-center gap-2 sm:gap-3">
              {user && (
                <div className="flex text-white items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
                  <Beef className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium tabular-nums">
                    {balance?.toFixed(2) || "0.00"} Steaks
                  </span>
                </div>
              )}

              {user ? (
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setUserMenuOpen((s) => !s)}
                    className="flex items-center gap-2 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/10"
                    aria-expanded={userMenuOpen}
                  >
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-400/80 to-emerald-600/80 grid place-items-center text-white font-bold text-xs">
                      {initials}
                    </div>
                    <span className="hidden sm:block max-w-[10rem] truncate text-sm font-medium text-white">
                      {username}
                    </span>
                    <ChevronDown size={16} className="text-white/70" />
                  </button>

                  {userMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 bg-[#0e141b]/95 backdrop-blur-xl shadow-xl overflow-hidden">
                      <div className="px-3 py-2 text-xs text-white/60">
                        Signed in as
                        <div className="text-white truncate">{username}</div>
                      </div>
                      {isSuper && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 text-white"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Crown className="w-4 h-4 text-yellow-400" />
                          Admin
                        </Link>
                      )}
                      <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-white/10 text-white" onClick={() => setUserMenuOpen(false)}>
                        Settings
                      </Link>
                      <Link href="/#leaderboard" className="block px-3 py-2 text-sm hover:bg-white/10 text-white" onClick={() => setUserMenuOpen(false)}>
                        Leaderboard
                      </Link>
                      <button
                        onClick={() => { setUserMenuOpen(false); logout(); }}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-white/10 text-red-300"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button
                    onClick={() => router.push("/login")}
                    className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => router.push("/signup")}
                    className="px-3 py-2 rounded-xl border border-emerald-400/50 hover:bg-emerald-400/10 text-white"
                  >
                    Signup
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-60 md:hidden transition ${mobileOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      >
        <div
          className={`absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity ${
            mobileOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setMobileOpen(false)}
        />
        <div
          className={`absolute left-0 top-0 h-full w-[82%] max-w-xs bg-[#0e141b] border-r border-white/10 transform transition-transform duration-300 ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              <img src="/assets/logo.png" alt="Logo" className="h-7 w-7 rounded-lg" />
              <span className="font-bold">Steak</span>
            </div>
            <button className="p-2 rounded-lg hover:bg-white/10" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X />
            </button>
          </div>

          <div className="p-3">
            <MobileLink href="/#top" label="Home" onClick={() => setMobileOpen(false)} />
            <MobileLink href="/#games" label="Games" onClick={() => setMobileOpen(false)} />
            <MobileLink href="/#rewards" label="Rewards" onClick={() => setMobileOpen(false)} />
            <MobileLink href="/#promo" label="Promo" onClick={() => setMobileOpen(false)} />
            <MobileLink href="/#leaderboard" label="Leaderboard" onClick={() => setMobileOpen(false)} />
          </div>

          <div className="mt-auto p-3 space-y-2">
            {user ? (
              <>
                {isSuper && (
                  <Link
                    href="/admin"
                    className="flex items-center justify-center gap-2 w-full px-4 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Crown className="w-4 h-4" /> Admin
                  </Link>
                )}
                <button
                  onClick={() => { setMobileOpen(false); logout(); }}
                  className="w-full px-4 py-2 rounded-xl bg-red-500 hover:bg-red-600 font-semibold"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => { setMobileOpen(false); router.push("/login"); }}
                  className="w-full px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-semibold"
                >
                  Login
                </button>
                <button
                  onClick={() => { setMobileOpen(false); router.push("/signup"); }}
                  className="w-full px-4 py-2 rounded-xl border border-emerald-400/50 hover:bg-emerald-400/10"
                >
                  Signup
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="h-16 sm:h-18" />
    </>
  );
}

/* Bits */
function NavA({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="px-3 py-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition">
      {label}
    </Link>
  );
}
function MobileLink({ href, label, onClick }: { href: string; label: string; onClick?: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="block w-full px-3 py-3 rounded-xl hover:bg-white/10">
      {label}
    </Link>
  );
}
