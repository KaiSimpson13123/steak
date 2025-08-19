/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Gem, Rocket } from "lucide-react";
import Link from "next/link";
import { useCommonStore } from "@/app/_store/commonStore";
import { Client, Account, Databases, ID, Query } from "appwrite";
import AuthProvider from "@/components/AuthProvider";


const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!) // must start with NEXT_PUBLIC_
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);
const databases = new Databases(client);

const DATABASE_ID = process.env.DATABASE_ID!;
const COLLECTION_ID = process.env.USERS_COLLECTION_ID!;

const games = [
  { name: "MINES", link: "/mines", logo: <Gem size={48} />, img: "/assets/mines.png" },
  { name: "PLINKO", link: "/plinko", logo: <Rocket size={48} />, img: "/assets/plinko.png" },
  { name: "DICE", link: "/dice", logo: <Rocket size={48} />, img: "/assets/dice.png" },
  { name: "LIMBO", link: "/limbo", logo: <Rocket size={48} />, img: "/assets/limbo.avif" },
];

export default function Home() {
  const { balance, setBalance } = useCommonStore();
  
  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [canClaimWeekly, setCanClaimWeekly] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  {/*
  // Load current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await account.get();
        setUserId(user.$id);

        // Fetch user's reward info
        const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, user.$id);

        const now = new Date();
        const lastDaily = doc.lastDailyClaim ? new Date(doc.lastDailyClaim) : null;
        const lastWeekly = doc.lastWeeklyClaim ? new Date(doc.lastWeeklyClaim) : null;

        setCanClaimDaily(!lastDaily || now.toDateString() !== lastDaily.toDateString());

        setCanClaimWeekly(
          !lastWeekly || (now.getTime() - lastWeekly.getTime()) / (1000 * 60 * 60 * 24) >= 7
        );

        setBalance(doc.balance || 0);
      } catch (err) {
        console.error("Error fetching user/rewards:", err);
      }
    };
    fetchUser();
  }, [setBalance]);  */}

  const claimReward = async (type: "daily" | "weekly") => {
    if (!userId) return;
    try {
      const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID, userId);

      const rewardAmount = type === "daily" ? 1000 : 10000;
      const updates: any = { balance: (doc.balance || 0) + rewardAmount };

      if (type === "daily") {
        updates.lastDailyClaim = new Date().toISOString();
        setCanClaimDaily(false);
      } else {
        updates.lastWeeklyClaim = new Date().toISOString();
        setCanClaimWeekly(false);
      }

      await databases.updateDocument(DATABASE_ID, COLLECTION_ID, userId, updates);

      setBalance(updates.balance);
    } catch (err) {
      console.error(`Error claiming ${type} reward:`, err);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center py-24 px-4 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <section className="w-full flex flex-col items-center text-center">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4 flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-white">
            Welcome to <span className="text-success">Steak</span>
          </div>
        </h1>
        <p className="text-xl text-gray-500">Play Real Games with Steak.</p>
      </section>

      {/* Games Section */}
      <section className="p-6" aria-labelledby="games-heading">
        <h3 className="text-xl text-white p-4 font-bold flex gap-4 items-center">
          <Gamepad2 /> Play Now
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 px-2 sm:px-4 max-w-7xl mx-auto">
          {games.map((game, i) => (
            <Link
              key={i}
              href={game.link}
              className="group relative flex flex-col items-center justify-center rounded-xl border border-gray-700 hover:border-success/50 transition-all h-56 w-full"
            >
              <img
                src={game.img}
                alt={game.name}
                className="w-full h-full object-cover rounded-lg transform group-hover:scale-105 transition-transform"
              />
              <div className="absolute bottom-0 left-0 w-full h-1 bg-success/0 group-hover:bg-success/20 transition-all" />
            </Link>
          ))}
        </div>
      </section>

      {/* Rewards Section */}
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
            {canClaimDaily ? "Claim Daily" : "Already Claimed"}
          </button>
          <button
            onClick={() => claimReward("weekly")}
            disabled={!canClaimWeekly}
            className="w-64 bg-[#4cd964] hover:bg-[#3cc153] disabled:bg-[#2c3a47] disabled:text-gray-400 text-black font-medium py-4 rounded-md transition-colors"
          >
            {canClaimWeekly ? "Claim Weekly" : "Already Claimed"}
          </button>
        </div>
      </section>
    </main>
  );
}
