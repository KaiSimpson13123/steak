"use client";
import React from "react";
import ConfigForDice from "./ConfigForDice";
import DiceComponent from "./DiceComponent";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase"; // 👈 add this

function DiceGameContainer() {
  const [multiplier, setMultiplier] = React.useState<number>(2);
  const [gameStarted, setGameStarted] = React.useState<boolean>(false);
  const [targetNumber, setTargetNumber] = React.useState<number>(0);
  const [value, setValue] = React.useState([50]); // threshold slider (0..100)
  const [winChance, setWinChance] = React.useState(50);
  const [result, setResult] = React.useState<
    { isWin: boolean; randomNumber: number }[]
  >([]);
  const { setBalance, balance } = useCommonStore();
  const { user } = useAuth();

  // (optional) show a message instead of returning undefined
  if (!user) return <div className="p-4 text-center">Please log in to play Dice.</div>;

  // Save a finalized Dice bet (no pending)
  const saveFinalBetDice = async (params: {
    userId: string;
    username?: string | null;
    amount: number;
    payout: number;
    outcome: "win" | "loss";
    roll: number;
    threshold: number;
    winChance: number;
    multiplier: number;
  }) => {
    const {
      userId, username, amount, payout, outcome,
      roll, threshold, winChance, multiplier
    } = params;

    const { error } = await supabase.from("bets").insert({
      user_id: userId,
      username: username || "Player",
      game: "DICE",
      amount,          // stake
      payout,          // amount returned to balance (0 on loss, stake*multiplier on win)
      outcome,         // 'win' | 'loss'  (use 'loss' to match your enum)
      multiplier,
      metadata: {
        type: "DICE",
        roll,          // the RNG result (1..100)
        threshold,     // the chosen target (value[0])
        winChance,
        direction: "over", // since you're using randomNumber > threshold
        timestamp: new Date().toISOString(),
      },
    });
    if (error) console.error("saveFinalBetDice error:", error);
  };

  const handleBet = async (betAmount: number) => {
    // Validate bet amount
    if (betAmount <= 0 || betAmount > (balance ?? 0)) {
      return;
    }

    // Deduct stake upfront
    const newBalanceAfterBet = (balance ?? 0) - betAmount;
    setBalance(newBalanceAfterBet, user.id);

    // Roll
    const randomNumber = Math.floor(Math.random() * 100) + 1;
    setTargetNumber(randomNumber);
    setGameStarted(true);

    // Win if roll > threshold (value[0])
    const threshold = value[0];
    const isWin = randomNumber > threshold;

    if (isWin) {
      const payout = betAmount * multiplier; // amount returned to balance
      const finalBalance = newBalanceAfterBet + payout;
      setBalance(finalBalance, user.id);
      setResult((r) => [...r, { isWin: true, randomNumber }]);

      // Save finalized WIN
      await saveFinalBetDice({
        userId: user.id,
        username: user.user_metadata?.username || user.email,
        amount: betAmount,
        payout,
        outcome: "win",
        roll: randomNumber,
        threshold,
        winChance,
        multiplier,
      });
    } else {
      setResult((r) => [...r, { isWin: false, randomNumber }]);

      // Save finalized LOSS
      await saveFinalBetDice({
        userId: user.id,
        username: user.user_metadata?.username || user.email,
        amount: betAmount,
        payout: 0,
        outcome: "loss", // IMPORTANT: use 'loss' to match your enum
        roll: randomNumber,
        threshold,
        winChance,
        multiplier,
      });
    }
  };

  return (
    <div className="flex flex-col md:flex-row bg-background gap-4 md:gap-8 p-4 w-full max-w-6xl mx-auto">
      <div className="w-full md:w-1/3 bg-primary">
        <ConfigForDice onBet={handleBet} />
      </div>
      <div className="w-full md:w-2/3">
        <DiceComponent
          value={value}
          setValue={setValue}
          winChance={winChance}
          setWinChance={setWinChance}
          multiplier={multiplier}
          setMultiplier={setMultiplier}
          targetNumber={targetNumber}
          gameStarted={gameStarted}
          result={result}
        />
      </div>
    </div>
  );
}

export default DiceGameContainer;
