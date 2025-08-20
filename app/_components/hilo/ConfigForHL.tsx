"use client";
import { useCommonStore } from "@/app/_store/commonStore";
import { Beef } from "lucide-react";
import React from "react";

export default function ConfigForBJ({
  onBet,
  handInProgress,
}: {
  onBet: (amount: number) => void;
  handInProgress: boolean;
}) {
  const [betAmount, setBetAmount] = React.useState<number>(0);
  const [inputValue, setInputValue] = React.useState<string>("");
  const [error, setError] = React.useState<string>("");
  const [cooldown, setCooldown] = React.useState<boolean>(false);
  const { balance } = useCommonStore();

  const handleBetAmountChange = (newValue: string) => {
    setInputValue(newValue);
    const parsedValue = parseFloat(newValue);
    if (!isNaN(parsedValue)) {
      setBetAmount(parsedValue);
      if (parsedValue > (balance ?? 0)) {
        setError("Bet amount cannot exceed your balance");
      } else if (parsedValue <= 0) {
        setError("Bet must be greater than 0");
      } else {
        setError("");
      }
    } else {
      setBetAmount(0);
      setError("");
    }
  };

  const handleHalfAmount = () => {
    if (betAmount > 0) {
      const newAmount = (betAmount / 2).toFixed(2);
      setInputValue(newAmount);
      setBetAmount(parseFloat(newAmount));
      setError("");
    }
  };

  const handleDoubleAmount = () => {
    if (betAmount > 0) {
      const newAmount = (betAmount * 2).toFixed(2);
      if (parseFloat(newAmount) <= (balance ?? 0)) {
        setInputValue(newAmount);
        setBetAmount(parseFloat(newAmount));
        setError("");
      } else {
        setError("Bet amount cannot exceed your balance");
      }
    }
  };

  const handleDeal = () => {
    if (!betAmount || betAmount <= 0 || betAmount > (balance ?? 0) || error) return;
    onBet(betAmount);
    setCooldown(true);
    setTimeout(() => setCooldown(false), 700);
  };

  return (
    <div className="flex flex-col gap-6 p-4 text-white max-w-md mx-auto rounded-2xl bg-slate-900/60 border border-slate-800">
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-[#b0b9d2]">Bet Amount</span>
          <span className="text-white">Balance: ${balance ? balance.toFixed(2) : "0.00"}</span>
        </div>
      </div>

      <div className="flex bg-[#0f172a] rounded-xl overflow-hidden border border-slate-700">
        <div className="flex-1 flex items-center relative">
          <input
            type="number"
            id="betAmount"
            value={inputValue}
            min={0.01}
            step={0.01}
            onChange={(e) => handleBetAmountChange(e.target.value)}
            className="w-full bg-[#0f172a] px-3 py-3 outline-none text-white"
            onClick={(e) => e.currentTarget.select()}
            disabled={handInProgress}
          />
          <div className="absolute right-3 pointer-events-none">
            <Beef className="w-4 h-4 text-emerald-400" />
          </div>
        </div>
        <button
          className="bg-[#0f172a] px-6 border-l border-slate-700 hover:bg-slate-800 transition-colors text-white"
          onClick={handleHalfAmount}
          disabled={!betAmount || betAmount <= 0 || handInProgress}
        >
          ½
        </button>
        <button
          className="bg-[#0f172a] px-6 border-l border-slate-700 hover:bg-slate-800 transition-colors text-white"
          onClick={handleDoubleAmount}
          disabled={!betAmount || betAmount <= 0 || (betAmount * 2 > (balance ?? 0)) || handInProgress}
        >
          2×
        </button>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        onClick={handleDeal}
        className="w-full py-3 rounded-xl bg-emerald-400 text-emerald-950 hover:bg-emerald-300 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors font-semibold"
        disabled={
          !betAmount ||
          betAmount <= 0 ||
          betAmount > (balance ?? 0) ||
          error !== "" ||
          cooldown ||
          handInProgress
        }
      >
        {handInProgress ? "Round in progress..." : cooldown ? "Please wait..." : betAmount > (balance ?? 0) ? "Insufficient Balance" : "Start Round"}
      </button>

      <div className="text-xs text-slate-400">
        Higher or Lower · Predict if the next card will be higher or lower. Ties lose. You can cash out anytime after a correct guess.
      </div>
    </div>
  );
}
