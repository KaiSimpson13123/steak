"use client";
import React from "react";
import { useCommonStore } from "@/app/_store/commonStore";
import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";
import { useAuth } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";

export default function Footer() {
  const { setBalance } = useCommonStore();
  const { user } = useAuth();
  const pathname = usePathname();
  const isHome = pathname === "/";

  const resetMoney = () => {
    const pass = prompt("Enter Password");
    if (!user) return;
    if (pass === process.env.NEXT_PUBLIC_PASSWORD) {
      setBalance(1000, user.id);
    } else {
      alert("Password Incorrect");
    }
  };

  return (
    <footer
      className={`relative z-10 bg-[#0b0f14]/80 backdrop-blur-xl border-t border-white/10 ${
        isHome ? "md:ml-72" : "md:ml-0"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 pt-14 pb-[max(3.5rem,env(safe-area-inset-bottom))]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
          {/* About */}
          <div>
            <h3 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-600 bg-clip-text text-transparent">
              About Steak
            </h3>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              An open-source project dedicated to learning gambling mechanics
              safely—no real money, just fun and education.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-xl font-bold text-white">Quick Links</h3>
            <ul className="mt-3 space-y-2 text-sm text-white">
              <li><Link href="/#games" className="hover:text-emerald-400 transition">Games</Link></li>
              <li><Link href="/#rewards" className="hover:text-emerald-400 transition">Rewards</Link></li>
              <li><Link href="/#promo" className="hover:text-emerald-400 transition">Promo Codes</Link></li>
              <li><Link href="/#leaderboard" className="hover:text-emerald-400 transition">Leaderboard</Link></li>
            </ul>
          </div>

          {/* Community */}
          <div>
            <h3 className="text-xl font-bold text-white">Join Our Community</h3>
            <p className="mt-3 text-sm text-white/70 mb-4">
              Connect with us and help make Steak even better!
            </p>
            <div className="flex gap-4">
              <a href="https://github.com/" target="_blank" rel="noopener noreferrer"
                 className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white"><Github /></a>
              <a href="https://twitter.com/" target="_blank" rel="noopener noreferrer"
                 className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white"><Twitter /></a>
              <a href="mailto:contact@steak.com"
                 className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition text-white"><Mail /></a>
            </div>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6 text-center text-sm text-white/50">
          <p>© {new Date().getFullYear()} Steak. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
