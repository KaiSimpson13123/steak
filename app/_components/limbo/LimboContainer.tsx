"use client";
import { useState } from "react";
import LimboComponent from "./LimboComponent";
import { generateWeightedRandom } from "@/lib/utils";
import LimboConfig from "./LimboConfig";
import { useLimboStore } from "@/app/_store/limboStore";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";

function LimboContainer() {
  const {
    setIsRolling,
    setDisplayMultiplier,
    recentWins,
    setRecentWins,
    multiplier,
  } = useLimboStore();
  const { balance, setBalance } = useCommonStore();
  const { user, logout } = useAuth();

  const handleBet = (amount: number) => {
    // Validate bet amount
    if (amount <= 0 || amount > balance) {
      return;
    }

    if (!user) return;

    // Deduct bet amount upfront
    const newBalanceAfterBet = balance - amount;
    setBalance(newBalanceAfterBet, user.id);

    setIsRolling(true);
    const randomMultiplier = generateWeightedRandom();

    setDisplayMultiplier(randomMultiplier);
    if (randomMultiplier >= multiplier) {
      // Player wins - add winnings to already reduced balance
      const winnings = amount * randomMultiplier;
      const finalBalance = newBalanceAfterBet + winnings;
      setBalance(finalBalance, user.id);
      setRecentWins([
        ...recentWins,
        { isWin: true, randomNumber: randomMultiplier },
      ]);
    } else {
      // Player loses - bet was already deducted
      setRecentWins([
        ...recentWins,
        { isWin: false, randomNumber: randomMultiplier },
      ]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-background gap-4 md:gap-8 p-4 w-full max-w-6xl mx-auto">
      <div className="w-full md:w-1/3 bg-primary">
        <LimboConfig onBet={handleBet} />
      </div>
      <div className="w-full md:w-2/3">
        <LimboComponent />
      </div>
    </div>
  );
}

export default LimboContainer;
