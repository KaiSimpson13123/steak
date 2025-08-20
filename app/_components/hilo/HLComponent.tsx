"use client";
import React from "react";
import { motion } from "framer-motion";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export interface Card {
  suit: Suit;
  rank: Rank;
}

export type Outcome = "WIN" | "LOSE" | "CASHOUT";

interface HiLoComponentProps {
  currentCard: Card | null;
  lastRevealed: Card | null; // the just-revealed next card (for animation/status)
  status: "idle" | "awaitingGuess" | "revealing" | "settled";
  message: string;

  stepMultipliers: { higher: number; lower: number };
  totalMultiplier: number;
  betAmount: number;

  canHigher: boolean;
  canLower: boolean;
  canCashout: boolean;

  onHigher: () => void;
  onLower: () => void;
  onCashout: () => void;

  lastResults: { outcome: Outcome; bet: number; delta: number }[];
}

const isRed = (s: Suit) => s === "♥" || s === "♦";

function PlayingCard({
  card,
  ghost = false,
  pulse = false,
  index = 0,
}: {
  card: Card;
  ghost?: boolean;
  pulse?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ y: 12, opacity: 0, rotate: -2 }}
      animate={{ y: 0, opacity: 1, rotate: 0 }}
      transition={{ delay: index * 0.1, duration: 0.35 }}
      className={`w-24 h-36 md:w-28 md:h-40 relative rounded-2xl shadow-xl border ${
        ghost ? "bg-white/10 border-slate-700" : "bg-white/95 border-gray-200"
      } ${pulse ? "animate-pulse" : ""}`}
      style={{ perspective: 1200 }}
    >
      <div className={`absolute inset-0 p-3 flex flex-col justify-between ${ghost ? "opacity-50" : ""}`}>
        <div className={`text-base font-bold ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
          {card.rank}
          <span className="ml-1">{card.suit}</span>
        </div>
        <div className={`absolute inset-0 flex items-center justify-center text-4xl ${isRed(card.suit) ? "text-red-500" : "text-gray-800"}`}>
          {card.suit}
        </div>
        <div className={`text-base font-bold self-end rotate-180 ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
          {card.rank}
          <span className="ml-1">{card.suit}</span>
        </div>
      </div>
    </motion.div>
  );
}

export default function BJComponent({
  currentCard,
  lastRevealed,
  status,
  message,
  stepMultipliers,
  totalMultiplier,
  betAmount,
  canHigher,
  canLower,
  canCashout,
  onHigher,
  onLower,
  onCashout,
  lastResults,
}: HiLoComponentProps) {
  const potential = betAmount * totalMultiplier;

  return (
    <div className="w-full bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 lg:p-8 flex flex-col gap-6">
      {/* Recent results strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {lastResults.slice(-18).map((r, i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              r.outcome === "WIN" || r.outcome === "CASHOUT"
                ? "bg-emerald-400 text-emerald-900"
                : "bg-rose-400 text-rose-900"
            }`}
            title={`${r.outcome} | Bet $${r.bet.toFixed(2)} | ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(2)}`}
          >
            {r.outcome}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-xs text-slate-400">Total Multiplier</div>
          <div className="text-3xl font-extrabold text-emerald-300 drop-shadow">
            ×{totalMultiplier.toFixed(2)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-400">Potential Payout</div>
          <div className="text-3xl font-extrabold text-white">$ {potential.toFixed(2)}</div>
        </div>
      </div>

      {/* Cards area */}
      <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
        <div className="flex items-center justify-center">
          {currentCard ? (
            <PlayingCard card={currentCard} />
          ) : (
            <div className="w-24 h-36 md:w-28 md:h-40 rounded-2xl bg-slate-800/80 border border-slate-700" />
          )}
        </div>

        <div className="flex flex-col gap-4">
          {/* Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={onHigher}
              disabled={!canHigher}
              className="px-5 py-4 rounded-xl bg-emerald-500 text-emerald-950 font-semibold hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 transition-colors flex items-center justify-between"
            >
              <span>Higher</span>
              <span className="text-sm font-bold bg-emerald-900/20 px-2 py-1 rounded">
                ×{stepMultipliers.higher.toFixed(2)}
              </span>
            </button>
            <button
              onClick={onLower}
              disabled={!canLower}
              className="px-5 py-4 rounded-xl bg-indigo-500 text-indigo-50 font-semibold hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-400 transition-colors flex items-center justify-between"
            >
              <span>Lower</span>
              <span className="text-sm font-bold bg-indigo-900/20 px-2 py-1 rounded">
                ×{stepMultipliers.lower.toFixed(2)}
              </span>
            </button>
          </div>

          <button
            onClick={onCashout}
            disabled={!canCashout}
            className="px-5 py-4 rounded-xl bg-amber-400 text-amber-950 font-semibold hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400 transition-colors"
          >
            Cash Out $ {potential.toFixed(2)}
          </button>

          {/* Status box */}
          <div className="min-h-[56px] flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700">
            <span className="text-slate-200 text-center text-sm md:text-base">{message}</span>
          </div>

          {/* Reveal preview / last reveal */}
          
        </div>
      </div>
    </div>
  );
}
