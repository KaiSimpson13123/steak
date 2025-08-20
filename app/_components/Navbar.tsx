/* eslint-disable @next/next/no-img-element */
"use client";

import { useCommonStore } from "@/app/_store/commonStore";
import { Beef, Crown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { useEffect, useState } from "react";

export default function Navbar() {
  const router = useRouter();
  const { user, logout } = useAuth(); // get logged-in user and logout function

  const { balance, fetchBalance } = useCommonStore();

  const [isSuper, setIsSuper] = useState(false);

  // ✅ fetch balance when user is logged in
  useEffect(() => {
    if (user?.id) {
      fetchBalance(user.id);
    }
  }, [user, fetchBalance]);

  useEffect(() => {
  if (!user) return;

  const username = user.user_metadata?.username;
  if (username === "SmacklePackle") {
    setIsSuper(true);
  } else {
    setIsSuper(false);
  }
  // Only run when `user` first becomes available
}, [user]);

  // Convert balance from steaks to USD
  const balanceInUSD = balance ? balance * 0.000001 : 0;

  return (
    <nav className="top-0 left-0 right-0 z-50 backdrop-blur-lg bg-[#191b36] border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 sm:h-20">
          <Link
            href="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <img
              src="/assets/logo.png"
              alt="Logo"
              width={100}
              height={100}
              className="h-6 sm:h-7 w-auto"
            />
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {/* Balance display */}
            {user && (
              <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 text-white">
              <Beef className="w-5 h-5 text-success" />
              <span className="text-base font-medium">
                {balance?.toFixed(2) || "0"} Steaks
              </span>
            </div>
            )}
            

            {/* Show username and logout if logged in */}
            {user ? (
              <div className="flex items-center gap-3 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 text-white">
                <span className="font-medium">
                  {user.user_metadata?.username || user.email}
                </span>
                <button
                  onClick={logout}
                  className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded font-semibold"
                >
                  Logout
                </button>
              </div>
            ) : (
              <>
              <button
                onClick={() => router.push("/login")}
                className="bg-success hover:bg-success px-3 py-1 rounded font-semibold"
              >
                Login
              </button>
              <button
                onClick={() => router.push("/signup")}
                className="bg-success hover:bg-success px-3 py-1 rounded font-semibold"
              >
                Signup
              </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
