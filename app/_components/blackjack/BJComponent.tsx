"use client";
import React from "react";
import { motion } from "framer-motion";

type Suit = "♠" | "♥" | "♦" | "♣";
type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export interface Card {
  suit: Suit;
  rank: Rank;
}

interface BJComponentProps {
  playerHand: Card[];
  dealerHand: Card[];
  dealerHidden: boolean;
  status: "idle" | "dealt" | "playerTurn" | "dealerTurn" | "settled";
  message: string;
  canHit: boolean;
  canStand: boolean;
  canDouble: boolean;
  onHit: () => void;
  onStand: () => void;
  onDouble: () => void;
  lastResults: { outcome: "WIN" | "LOSE" | "PUSH" | "BJ"; bet: number; delta: number }[];
  // 👇 NEW
  playerTotal: number;
  dealerTotal?: number;
}

const isRed = (s: Suit) => s === "♥" || s === "♦";

function PlayingCard({
  card,
  hidden = false,
  index = 0,
}: {
  card: Card;
  hidden?: boolean;
  index?: number;
}) {
  return (
    <motion.div
      initial={{ x: -40, opacity: 0, rotateY: 180 }}
      animate={{ x: 0, opacity: 1, rotateY: hidden ? 180 : 0 }}
      transition={{ delay: index * 0.35, duration: 0.45 }}
      className="w-16 h-24 md:w-20 md:h-28 relative [transform-style:preserve-3d]"
    >
      {hidden ? (
        <div className="w-full h-full rounded-xl shadow-lg bg-gradient-to-br from-slate-700 to-slate-900 border border-slate-600 flex items-center justify-center">
          <div className="w-10 h-16 rounded-lg bg-slate-800 border border-slate-500" />
        </div>
      ) : (
        <div className="w-full h-full rounded-2xl shadow-xl bg-white/95 border border-gray-200 flex flex-col justify-between p-2 relative">
          <div className={`text-sm font-bold ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
            {card.rank}<span className="ml-0.5">{card.suit}</span>
          </div>
          <div className={`absolute inset-0 flex items-center justify-center text-3xl ${isRed(card.suit) ? "text-red-500" : "text-gray-800"}`}>
            {card.suit}
          </div>
          <div className={`text-sm font-bold self-end rotate-180 ${isRed(card.suit) ? "text-red-600" : "text-gray-900"}`}>
            {card.rank}<span className="ml-0.5">{card.suit}</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function Hand({
  title,
  cards,
  hideFirst,
  highlight = false,
  // 👇 NEW
  totalLabel,
}: {
  title: string;
  cards: Card[];
  hideFirst?: boolean;
  highlight?: boolean;
  totalLabel?: string;
}) {
  return (
    <div
      className={`w-full rounded-2xl p-4 border ${
        highlight ? "border-amber-400/70 shadow-[0_0_40px_-10px_rgba(245,197,24,0.35)]" : "border-slate-700"
      } bg-slate-800/50 backdrop-blur-sm`}
    >
      <div className="text-sm text-slate-300 mb-3">
        {title} {totalLabel ? `(${totalLabel})` : ""}
      </div>
      <div className="flex gap-2 md:gap-3">
        {cards.map((c, idx) => (
          <PlayingCard key={`${c.suit}-${c.rank}-${idx}`} card={c} hidden={hideFirst && idx === 0} index={idx} />
        ))}
        {cards.length === 0 && <div className="text-slate-400 text-sm">No cards</div>}
      </div>
    </div>
  );
}

export default function BJComponent({
  playerHand,
  dealerHand,
  dealerHidden,
  status,
  message,
  canHit,
  canStand,
  canDouble,
  onHit,
  onStand,
  onDouble,
  lastResults,
  // 👇 NEW
  playerTotal,
  dealerTotal,
}: BJComponentProps) {
  const dealerLabel = dealerHidden ? "?" : dealerTotal?.toString();
  const playerLabel = playerTotal.toString();

  return (
    <div className="w-full aspect-auto bg-slate-900/60 border border-slate-800 rounded-2xl p-4 md:p-6 lg:p-8 flex flex-col gap-6">
      {/* Recent results strip */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {lastResults.slice(-18).map((r, i) => (
          <div
            key={i}
            className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
              r.outcome === "WIN" || r.outcome === "BJ"
                ? "bg-emerald-400 text-emerald-900"
                : r.outcome === "PUSH"
                ? "bg-slate-300 text-slate-900"
                : "bg-rose-400 text-rose-900"
            }`}
            title={`${r.outcome} | Bet $${r.bet.toFixed(2)} | ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(2)}`}
          >
            {r.outcome}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Hand
          title="Dealer"
          cards={dealerHand}
          hideFirst={dealerHidden}
          highlight={status === "dealerTurn"}
          totalLabel={dealerLabel}
        />
        <Hand
          title="You"
          cards={playerHand}
          highlight={status === "playerTurn"}
          totalLabel={playerLabel}
        />
      </div>

      <div className="min-h-[56px] flex items-center justify-center rounded-xl bg-slate-800/60 border border-slate-700">
        <span className="text-slate-200 text-center text-sm md:text-base">{message}</span>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          onClick={onHit}
          disabled={!canHit}
          className="px-5 py-3 rounded-xl bg-emerald-500 text-emerald-950 font-semibold hover:bg-emerald-400 disabled:bg-slate-700 disabled:text-slate-400 transition-colors"
        >
          Hit
        </button>
        <button
          onClick={onStand}
          disabled={!canStand}
          className="px-5 py-3 rounded-xl bg-indigo-500 text-indigo-50 font-semibold hover:bg-indigo-400 disabled:bg-slate-700 disabled:text-slate-400 transition-colors"
        >
          Stand
        </button>
        <button
          onClick={onDouble}
          disabled={!canDouble}
          className="px-5 py-3 rounded-xl bg-amber-400 text-amber-950 font-semibold hover:bg-amber-300 disabled:bg-slate-700 disabled:text-slate-400 transition-colors"
        >
          Double Down
        </button>
      </div>
    </div>
  );
}
