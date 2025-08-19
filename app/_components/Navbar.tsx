/* eslint-disable @next/next/no-img-element */
"use client";

import { useCommonStore } from "@/app/_store/commonStore";
import { Beef } from "lucide-react";
import Link from "next/link";

export default function Navbar() {
  const { balance } = useCommonStore();

  // Convert balance from steaks to USD
  const balanceInUSD = balance ? balance * 0.00001 : 0;

  return (
    <nav className="top-0 left-0 right-0 z-50 backdrop-blur-lg bg-black/40 border-b border-white/10">
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
            <div className="flex items-center gap-2 bg-white/5 backdrop-blur-sm px-4 py-2 rounded-xl border border-white/10 text-white">
              <Beef className="w-5 h-5 text-success" />
              <span className="text-base font-medium">
                {balance?.toFixed(0) || "0"} Steaks
              </span>
              <span className="text-sm text-gray-300">
                (${balanceInUSD.toFixed(2)})
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
