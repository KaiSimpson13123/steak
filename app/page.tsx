"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Gem, Rocket } from "lucide-react";
import Link from "next/link";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

const games = [
  { name: "MINES", link: "/mines", logo: <Gem size={48} />, img: "/assets/mines.png" },
  { name: "PLINKO", link: "/plinko", logo: <Rocket size={48} />, img: "/assets/plinko.png" },
  { name: "DICE", link: "/dice", logo: <Rocket size={48} />, img: "/assets/dice.png" },
  { name: "LIMBO", link: "/limbo", logo: <Rocket size={48} />, img: "/assets/limbo.avif" },
];

export default function Home() {
  const { balance, setBalance } = useCommonStore();
  const { user } = useAuth();

  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [canClaimWeekly, setCanClaimWeekly] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("");
  const [weeklyCountdown, setWeeklyCountdown] = useState("");

  const [isSuper, setIsSuper] = useState(false);

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

  const claimReward = async (type: "daily" | "weekly") => {
    if (!user) return;

    try {
      const { data: userDoc, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (fetchError || !userDoc) throw fetchError || new Error("User not found");

      const rewardAmount = type === "daily" ? 1000 : 10000;
      const updates: any = { balance: (userDoc.balance || 0) + rewardAmount };

      const now = new Date().toISOString();
      if (type === "daily") updates.lastDailyClaim = now;
      else updates.lastWeeklyClaim = now;

      const { error: updateError } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.id);

      if (updateError) throw updateError;

      setBalance(updates.balance);

      // Update state
      if (type === "daily") setCanClaimDaily(false);
      else setCanClaimWeekly(false);

    } catch (err) {
      console.error(`Error claiming ${type} reward:`, err);
    }
  };

  // Helper: format remaining time
  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  useEffect(() => {
  if (!user) return;

  let dailyInterval: number;
  let weeklyInterval: number;

  const checkRewards = async () => {
    try {
      const { data: userDoc, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error || !userDoc) throw error || new Error("User not found");

      const now = new Date();

      // === Daily ===
      const lastDailyUTC = userDoc.lastDailyClaim
        ? new Date(userDoc.lastDailyClaim + "Z")
        : null;
      const dailyReset = lastDailyUTC
        ? new Date(lastDailyUTC.getTime() + 24 * 60 * 60 * 1000)
        : null;

      if (!lastDailyUTC || now >= dailyReset!) {
        setCanClaimDaily(true);
        setDailyCountdown("");
      } else {
        setCanClaimDaily(false);
        const updateDailyCountdown = () => {
          const remaining = dailyReset!.getTime() - new Date().getTime();
          if (remaining <= 0) {
            setCanClaimDaily(true);
            setDailyCountdown("");
            clearInterval(dailyInterval);
          } else setDailyCountdown(formatTime(remaining));
        };
        updateDailyCountdown();
        dailyInterval = window.setInterval(updateDailyCountdown, 1000);
      }

      // === Weekly ===
      const lastWeeklyUTC = userDoc.lastWeeklyClaim
        ? new Date(userDoc.lastWeeklyClaim + "Z")
        : null;
      const weeklyReset = lastWeeklyUTC
        ? new Date(lastWeeklyUTC.getTime() + 7 * 24 * 60 * 60 * 1000)
        : null;

      if (!lastWeeklyUTC || now >= weeklyReset!) {
        setCanClaimWeekly(true);
        setWeeklyCountdown("");
      } else {
        setCanClaimWeekly(false);
        const updateWeeklyCountdown = () => {
          const remaining = weeklyReset!.getTime() - new Date().getTime();
          if (remaining <= 0) {
            setCanClaimWeekly(true);
            setWeeklyCountdown("");
            clearInterval(weeklyInterval);
          } else setWeeklyCountdown(formatTime(remaining));
        };
        updateWeeklyCountdown();
        weeklyInterval = window.setInterval(updateWeeklyCountdown, 1000);
      }

      // Update balance from DB
      if (userDoc.balance !== undefined) setBalance(userDoc.balance);

    } catch (err) {
      console.error("Error fetching user rewards:", err);
    }
  };

  checkRewards();

  return () => {
    clearInterval(dailyInterval);
    clearInterval(weeklyInterval);
  };
}, [user, setBalance]);


  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      {/* Welcome */}
      <section className="w-full flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4 flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-white">
            Welcome to <span className="text-success">Steak</span>
          </div>
        </h1>
        <p className="text-xl text-gray-500">Play Real Games with Steak.</p>
      </section>

      {/* Games */}
      <section className="p-6" aria-labelledby="games-heading">
        <h3 className="text-xl text-white p-4 font-bold flex gap-4 items-center">
          <Gamepad2 /> Play Now
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 px-2 sm:px-4 max-w-7xl mx-auto">
          {games.map((game, i) => (
            <div
              key={i}
              className={`group relative flex flex-col items-center justify-center rounded-xl border border-gray-700 transition-all h-56 w-full 
                          ${!user ? "pointer-events-none opacity-50" : "hover:border-success/50"}`}
            >
              {user ? (
                <Link href={game.link} className="w-full h-full">
                  <img
                    src={game.img}
                    alt={game.name}
                    className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition-transform"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-success/0 group-hover:bg-success/20 transition-all"/>
                </Link>
              ) : (
                <>
                  <img
                    src={game.img}
                    alt={game.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-600/50"/>
                </>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Rewards */}
      <section className="w-full flex flex-col items-center text-center mt-6">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4 flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-white">
            Claim <span className="text-success">Rewards</span>
          </div>
        </h1>
        <p className="text-xl text-gray-500">Claim Daily/Weekly Rewards</p>
        <br />
        <div className="flex gap-2">
          <button
            onClick={() => claimReward("daily")}
            disabled={!canClaimDaily}
            className="w-64 bg-[#4cd964] hover:bg-[#3cc153] disabled:bg-[#2c3a47] disabled:text-gray-400 text-black font-medium py-4 rounded-md transition-colors"
          >
            {canClaimDaily ? "Claim Daily" : `Next Daily: ${dailyCountdown || "N/A"}`}
          </button>
          <button
            onClick={() => claimReward("weekly")}
            disabled={!canClaimWeekly}
            className="w-64 bg-[#4cd964] hover:bg-[#3cc153] disabled:bg-[#2c3a47] disabled:text-gray-400 text-black font-medium py-4 rounded-md transition-colors"
          >
            {canClaimWeekly ? "Claim Weekly" : `Next Weekly: ${weeklyCountdown || "N/A"}`}
          </button>
        </div>
      </section>
    </main>
  );
}
