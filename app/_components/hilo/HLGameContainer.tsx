"use client";
import React from "react";
import ConfigForBJ from "./ConfigForHL";
import BJComponent, { Card, Outcome } from "./HLComponent";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase"; // 👈 add this

type Status = "idle" | "awaitingGuess" | "revealing" | "settled";
type Rank = "2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"J"|"Q"|"K"|"A";
const suits = ["♠", "♥", "♦", "♣"] as const;

const rankOrder: Rank[] = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
function rankValue(r: Rank): number { return rankOrder.indexOf(r) + 2; }

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of suits) for (const r of rankOrder) deck.push({ suit: s as any, rank: r as any });
  return deck;
}
function shuffle<T>(arr: T[]): T[] { const a = [...arr]; for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a; }

function countOutcomes(current: Card, remaining: Card[]) {
  let higher = 0, lower = 0, equal = 0;
  const cur = rankValue(current.rank as Rank);
  for (const c of remaining) {
    const v = rankValue(c.rank as Rank);
    if (v > cur) higher++; else if (v < cur) lower++; else equal++;
  }
  return { higher, lower, equal, total: remaining.length };
}

const HOUSE_EDGE = 0.99;
function stepMultipliersFor(current: Card, remaining: Card[]) {
  const { higher, lower, total } = countOutcomes(current, remaining);
  const pHigher = total ? higher / total : 0;
  const pLower  = total ? lower  / total : 0;
  const mHigher = pHigher > 0 ? (1 / pHigher) * HOUSE_EDGE : 0;
  const mLower  = pLower  > 0 ? (1 / pLower)  * HOUSE_EDGE : 0;
  return { higher: mHigher, lower: mLower };
}

export default function BlackjackGameContainer() {
  // state
  const [deck, setDeck] = React.useState<Card[]>([]);
  const [currentCard, setCurrentCard] = React.useState<Card | null>(null);
  const [lastRevealed, setLastRevealed] = React.useState<Card | null>(null);

  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState<string>("Place a bet to begin.");
  const [activeBet, setActiveBet] = React.useState<number>(0);
  const [handInProgress, setHandInProgress] = React.useState<boolean>(false);
  const [totalMultiplier, setTotalMultiplier] = React.useState<number>(1);
  const [steps, setSteps] = React.useState<number>(0);              // 👈 track correct guesses

  const [lastResults, setLastResults] = React.useState<{ outcome: Outcome; bet: number; delta: number }[]>([]);
  const { setBalance, balance } = useCommonStore();
  const { user } = useAuth();

  // keep the original first card of the hand for metadata
  const initialCardRef = React.useRef<Card | null>(null);           // 👈

  // timeouts
  const timeoutsRef = React.useRef<number[]>([]);
  const clearQueuedTimeouts = React.useCallback(() => { for (const id of timeoutsRef.current) clearTimeout(id); timeoutsRef.current=[]; }, []);
  const queueTimeout = React.useCallback((fn: () => void, ms: number) => { const id = window.setTimeout(fn, ms); timeoutsRef.current.push(id); }, []);
  React.useEffect(() => () => clearQueuedTimeouts(), [clearQueuedTimeouts]);

  // helpers
  const draw = React.useCallback((d: Card[]): { card: Card; rest: Card[] } => { const [card, ...rest] = d; return { card, rest }; }, []);
  const startNewShoe = React.useCallback(() => shuffle(buildDeck()), []);

  // save finalized bet (no pending)
  const saveFinalBetHiLo = React.useCallback(async (params: {
    userId: string;
    username?: string | null;
    amount: number;
    payout: number;
    outcome: "loss" | "win";  // use your enum values
    totalMultiplier: number;
    steps: number;
    startCard?: Card | null;
    endCard?: Card | null;
  }) => {
    const { userId, username, amount, payout, outcome, totalMultiplier, steps, startCard, endCard } = params;
    const { error } = await supabase.from("bets").insert({
      user_id: userId,
      username: username || "Player",
      game: "HILO",
      amount,
      payout,
      outcome,                 // 'loss' or 'cashout'
      multiplier: totalMultiplier,
      metadata: {
        type: "HILO",
        steps,
        startCard,
        endCard,
        timestamp: new Date().toISOString(),
      },
    });
    if (error) console.error("saveFinalBetHILO error:", error);
  }, []);

  // settlement helpers
  const pushResult = React.useCallback((outcome: Outcome, bet: number, delta: number) => {
    setLastResults((prev) => [...prev, { outcome, bet, delta }]);
  }, []);

  const loseRound = React.useCallback((betSize: number) => {
    setStatus("settled");
    setHandInProgress(false);
    setMessage("You lost. Better luck next time!");
    pushResult("LOSE", betSize, -betSize);
  }, [pushResult]);

  const cashout = React.useCallback(async (uid: string, amount: number, betSize: number) => {
    setBalance((balance ?? 0) + amount, uid);
    setStatus("settled");
    setHandInProgress(false);
    setMessage(`Cashed out $${amount.toFixed(2)}.`);
    pushResult("CASHOUT", betSize, amount - betSize);

    // save finalized CASHOUT
    await saveFinalBetHiLo({
      userId: uid,
      username: user?.user_metadata?.username || user?.email,
      amount: betSize,
      payout: amount,
      outcome: "win",
      totalMultiplier,
      steps,
      startCard: initialCardRef.current,
      endCard: currentCard, // no new reveal on cashout; use current
    });
  }, [balance, setBalance, pushResult, saveFinalBetHiLo, totalMultiplier, steps, user?.user_metadata?.username, user?.email, currentCard]);

  // Start round
  const onBet = React.useCallback((betAmount: number) => {
    if (handInProgress) return;
    if (betAmount <= 0 || betAmount > (balance ?? 0)) return;
    const uid = user?.id;
    if (!uid) return;

    clearQueuedTimeouts();

    // Deduct bet upfront
    setBalance((balance ?? 0) - betAmount, uid);

    // Build shoe & deal first card
    const shoe = startNewShoe();
    const { card, rest } = draw(shoe);

    initialCardRef.current = card;        // 👈 remember first card
    setDeck(rest);
    setCurrentCard(card);
    setLastRevealed(null);
    setActiveBet(betAmount);
    setTotalMultiplier(1);
    setSteps(0);                          // 👈 reset steps
    setStatus("awaitingGuess");
    setHandInProgress(true);
    setMessage("Pick Higher or Lower. Ties lose.");
  }, [handInProgress, balance, setBalance, user?.id, startNewShoe, draw, clearQueuedTimeouts]);

  // Guess handlers
  const resolveGuess = React.useCallback((guess: "higher" | "lower") => {
    if (status !== "awaitingGuess" || !currentCard || deck.length === 0) return;

    setStatus("revealing");
    setMessage("Revealing...");

    // step multiplier from current state BEFORE drawing
    const { higher, lower } = stepMultipliersFor(currentCard, deck);
    const stepMult = guess === "higher" ? higher : lower;

    const { card: nextCard, rest } = draw(deck);

    queueTimeout(async () => {
      setLastRevealed(nextCard);

      const cur = rankValue(currentCard.rank as Rank);
      const nxt = rankValue(nextCard.rank as Rank);
      const won = guess === "higher" ? nxt > cur : nxt < cur;

      if (!won) {
        // ties or incorrect => LOSE
        setDeck(rest);
        setCurrentCard(nextCard);

        // save finalized LOSS
        if (user?.id) {
          await saveFinalBetHiLo({
            userId: user.id,
            username: user.user_metadata?.username || user.email,
            amount: activeBet,
            payout: 0,
            outcome: "loss",
            totalMultiplier,         // multiplier before losing step
            steps,                   // steps completed before the loss
            startCard: initialCardRef.current,
            endCard: nextCard,       // the bust card
          });
        }

        loseRound(activeBet);
        return;
      }

      // Correct guess: update multiplier, continue
      const newTotal = parseFloat((totalMultiplier * stepMult).toFixed(6));
      setTotalMultiplier(newTotal);
      setSteps((s) => s + 1);            // 👈 count a successful step
      setCurrentCard(nextCard);
      setDeck(rest);
      setStatus("awaitingGuess");
      setMessage(`Correct! Step ×${stepMult.toFixed(2)} · Total ×${newTotal.toFixed(2)}. Choose again or cash out.`);
    }, 600);
  }, [status, currentCard, deck, draw, queueTimeout, totalMultiplier, activeBet, loseRound, saveFinalBetHiLo, user?.id, user?.user_metadata?.username, user?.email, steps]);

  const onHigher = React.useCallback(() => resolveGuess("higher"), [resolveGuess]);
  const onLower  = React.useCallback(() => resolveGuess("lower"),  [resolveGuess]);

  const onCashout = React.useCallback(() => {
    const uid = user?.id;
    if (!uid) return;
    if (!handInProgress) return;
    const payout = activeBet * totalMultiplier;
    // your UI already blocks cashout if multiplier <= 1, so payout > stake
    cashout(uid, payout, activeBet);
  }, [user?.id, handInProgress, activeBet, totalMultiplier, cashout]);

  // UI flags
  const canHigherLower = status === "awaitingGuess" && !!currentCard && deck.length > 0;
  const canCashout = handInProgress && status !== "revealing" && status !== "idle";

  const stepMultipliers = React.useMemo(() => {
    if (!currentCard) return { higher: 0, lower: 0 };
    return stepMultipliersFor(currentCard, deck);
  }, [currentCard, deck]);

  if (!user) {
    return <div className="text-center p-4">Please log in to play Higher or Lower.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row bg-background gap-4 md:gap-8 p-4 w-full max-w-6xl mx-auto">
      <div className="w-full md:w-1/3">
        <ConfigForBJ onBet={onBet} handInProgress={handInProgress} />
      </div>
      <div className="w-full md:w-2/3">
        <BJComponent
          currentCard={currentCard}
          lastRevealed={lastRevealed}
          status={status}
          message={message}
          stepMultipliers={stepMultipliers}
          totalMultiplier={totalMultiplier}
          betAmount={activeBet}
          canHigher={canHigherLower && stepMultipliers.higher > 0}
          canLower={canHigherLower && stepMultipliers.lower > 0}
          canCashout={canCashout && totalMultiplier > 1}
          onHigher={onHigher}
          onLower={onLower}
          onCashout={onCashout}
          lastResults={lastResults}
        />
      </div>
    </div>
  );
}
