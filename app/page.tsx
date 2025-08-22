"use client";

import { useEffect, useState } from "react";
import { Gamepad2, Gem, Rocket } from "lucide-react";
import Link from "next/link";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { toast } from "react-hot-toast";

// { name: "PLINKO", link: "/plinko", logo: <Rocket size={48} />, img: "/assets/plinko.png" },

const games = [
  { name: "MINES", link: "/mines", logo: <Gem size={48} />, img: "/assets/mines.png" },
  { name: "BLACKJACK", link: "/blackjack", logo: <Gem size={48} />, img: "/assets/blackjack.png" },
  { name: "DICE", link: "/dice", logo: <Rocket size={48} />, img: "/assets/dice.png" },
  { name: "HILO", link: "/hilo", logo: <Rocket size={48} />, img: "/assets/hilo.png" },
];

export default function Home() {
  const { balance, setBalance } = useCommonStore();
  const { user } = useAuth();

  const [canClaimDaily, setCanClaimDaily] = useState(false);
  const [canClaimWeekly, setCanClaimWeekly] = useState(false);
  const [dailyCountdown, setDailyCountdown] = useState("");
  const [weeklyCountdown, setWeeklyCountdown] = useState("");

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const [num1, setNum1] = useState(0);
  const [num2, setNum2] = useState(0);
  const [answer, setAnswer] = useState("");
  const [answerState, setAnswerState] = useState<"idle" | "correct" | "wrong">("idle");

  const [leaderboard, setLeaderboard] = useState<{ username: string; balance: number }[]>([]);

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
    const targetDate = new Date("2025-09-01T00:00:00Z").getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = targetDate - now;

      if (distance <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      setTimeLeft({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000),
      });
    };

    updateCountdown(); // run immediately
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

const generateQuestion = () => {
    setNum1(Math.floor(Math.random() * 20) + 1);
    setNum2(Math.floor(Math.random() * 20) + 1);
    setAnswer("");
    setAnswerState("idle");
  };

  useEffect(() => {
    generateQuestion();
  }, []);

  const submitAnswer = async () => {
    if (!user) return;

    const correct = parseInt(answer) === num1 + num2;

    if (correct) {
    setAnswerState("correct");
    try {
      const { data: userDoc, error: fetchError } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (fetchError || !userDoc) throw fetchError || new Error("User not found");

      const newBalance = (userDoc.balance || 0) + 1; // <-- always +1
      const { error: updateError } = await supabase
        .from("users")
        .update({ balance: newBalance })
        .eq("id", user.id);

      if (updateError) throw updateError;
      setBalance(newBalance, user.id);
    } catch (err) {
      console.error(err);
    }
  } else {
    // mark wrong when incorrect
    setAnswerState("wrong");
  }

    // After 1 second, reset button and generate new question
    setTimeout(() => {
      generateQuestion();
    }, 1000);
  };


  // Inside your Home component, after reward state hooks:
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
      .from("promo_codes")
      .select("*")
      .eq("code", promoCode.toUpperCase())
      .maybeSingle(); // allows 0 rows without throwing

    if (error) throw error;

    if (!promo) {
      setModalMessage("Invalid promo code!");
      setModalVisible(true);
      return;
    }

    // Check if user already redeemed it
    const usedBy: string[] = promo.used_by || [];
    if (usedBy.includes(user.id)) {
      setModalMessage("You have already redeemed this code!");
      setModalVisible(true);
      return;
    }

    // Update user balance
    const { data: userDoc, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError || !userDoc) throw fetchError || new Error("User not found");

    const newBalance = (userDoc.balance || 0) + promo.amount;

    // Transaction: update user balance
    const { error: updateError } = await supabase
      .from("users")
      .update({ balance: newBalance })
      .eq("id", user.id);

    if (updateError) throw updateError;

    // Mark code as used
    const { error: promoUpdateError } = await supabase
      .from("promo_codes")
      .update({ used_by: [...usedBy, user.id] })
      .eq("id", promo.id);

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

      setBalance(updates.balance, user.id);

      // Update state
      if (type === "daily") setCanClaimDaily(false);
      else setCanClaimWeekly(false);

      await checkRewards();
      // Refresh leaderboard
      await fetchLeaderboard();

    } catch (err) {
      console.error(`Error claiming ${type} reward:`, err);
    }
  };

  useEffect(() => {
  fetchLeaderboard(); // initial
  const interval = setInterval(fetchLeaderboard, 5000);
  return () => clearInterval(interval);
}, []);

  useEffect(() => {
    checkRewards();
    const interval = setInterval(checkRewards, 5000);
  return () => clearInterval(interval);
  }, []);

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

  const [dailyIntervalId, setDailyIntervalId] = useState<NodeJS.Timeout | null>(null);
  const [weeklyIntervalId, setWeeklyIntervalId] = useState<NodeJS.Timeout | null>(null);

  const checkRewards = async () => {
  if (!user) return;

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
      if (dailyIntervalId) {
        clearInterval(dailyIntervalId);
        setDailyIntervalId(null);
      }
    } else {
      setCanClaimDaily(false);
      if (dailyIntervalId) clearInterval(dailyIntervalId);
      const id = setInterval(() => {
        const remaining = dailyReset!.getTime() - new Date().getTime();
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
      if (weeklyIntervalId) {
        clearInterval(weeklyIntervalId);
        setWeeklyIntervalId(null);
      }
    } else {
      setCanClaimWeekly(false);
      if (weeklyIntervalId) clearInterval(weeklyIntervalId);
      const id = setInterval(() => {
        const remaining = weeklyReset!.getTime() - new Date().getTime();
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

    // Always update balance
    if (userDoc.balance !== undefined) setBalance(userDoc.balance, user.id);
  } catch (err) {
    console.error("Error fetching user rewards:", err);
  }
};

useEffect(() => {
  if (user) {
    checkRewards(); // run immediately on load
  }
  return () => {
    if (dailyIntervalId) clearInterval(dailyIntervalId);
    if (weeklyIntervalId) clearInterval(weeklyIntervalId);
  };
}, [user]);




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

      {/* Earn Steak Section */}
      <section className="w-full flex flex-col items-center text-center mt-20 mb-20">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4 flex flex-col items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 text-white">
            Earn <span className="text-success">Steak</span>
          </div>
        </h1>
        <p className="text-gray-400 mb-4">Solve the addition problem to earn +1 steak!</p>

        <form
          onSubmit={(e) => {
            e.preventDefault(); // stop page reload
            submitAnswer();
          }}
          className="flex gap-2 items-center mb-2"
        >
          <span className="text-white text-xl">
            {num1} + {num2} =
          </span>
          <input
            type="number"
            value={answer}
            disabled={!user}
            onChange={(e) => setAnswer(e.target.value)}
            className="px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-success"
          />
          <button
            type="submit"
            disabled={!user}
            className={`px-4 py-2 rounded-md disabled:bg-gray-600 font-medium text-black transition-colors w-24 ${
              answerState === "idle"
                ? "bg-success hover:bg-green-600"
                : answerState === "correct"
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          >
            {answerState === "correct"
              ? "✔"
              : answerState === "wrong"
              ? "✖"
              : "Submit"}
          </button>
        </form>
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
      
      {/* Promo Codes */}
      <section className="w-full flex flex-col items-center text-center mt-8">
        <p className="text-xl text-gray-500">Promo Codes</p>
        <br />

        <form
          onSubmit={(e) => {
            e.preventDefault(); // prevent page reload
            redeemPromo();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={promoCode}
            disabled={!user}
            onChange={(e) => setPromoCode(e.target.value)}
            placeholder="Enter code..."
            className="px-4 py-2 rounded-md bg-gray-700 text-white border border-gray-600 focus:outline-none focus:border-success"
          />
          <button
            type="submit"
            disabled={!user}
            className="px-6 py-2 bg-success disabled:bg-gray-600 hover:bg-green-600 rounded-md text-black font-medium"
          >
            Redeem
          </button>
        </form>
      </section>


      <section className="w-full max-w-4xl flex flex-col items-center text-center mt-20 mb-20">
          <h2 className="text-4xl text-white font-bold mb-6">🏆 Top Players</h2>
          <h3 className="text-xl text-gray-300 font-bold mb-6">
            Winner gets $10 AUD: {timeLeft.days}d, {timeLeft.hours}h, {timeLeft.minutes}m, {timeLeft.seconds}s
          </h3>
          <div className="w-full bg-gray-800 rounded-xl shadow-lg overflow-hidden">
            <div className="grid grid-cols-[1fr_2fr_1fr] bg-gray-900 text-gray-400 font-semibold px-4 py-2">
              <span>Rank</span>
              <span>Username</span>
              <span>Balance</span>
            </div>
            {leaderboard.map((lbUser, idx) => {
                const isCurrentUser = user?.user_metadata?.username === lbUser.username;

                return (
                  <div
                    key={lbUser.username}
                    className={`grid grid-cols-[1fr_2fr_1fr] px-4 py-3 rounded-md border 
                      ${idx === 0 ? "border-2 border-yellow-400 bg-gray-800 relative z-10" : ""} 
                      ${isCurrentUser && idx !== 0 ? "border-2 border-gray-400" : "border border-gray-700"} 
                      ${idx % 2 === 0 ? "bg-gray-800" : "bg-gray-700/50"} 
                      hover:bg-gray-600 transition-colors`}
                  >
                    <span className={idx === 0 ? "text-yellow-400 font-bold" : "text-gray-300 font-bold"}>
                      {idx + 1}
                    </span>
                    <span
                      className={`font-medium ${
                        isCurrentUser ? "text-blue-300" : "text-white"
                      }`}
                    >
                      {lbUser.username}
                    </span>
                    <span className="text-green-400 font-semibold">{lbUser.balance}</span>
                  </div>
                );
              })}

          </div>
        </section>


      {/* Promo Code Modal */}
      {modalVisible && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 text-white p-6 rounded-lg w-96 flex flex-col items-center">
            <p className="mb-4 text-center">{modalMessage}</p>
            <button
              onClick={() => setModalVisible(false)}
              className="px-4 py-2 bg-success hover:bg-green-600 rounded-md text-black font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
