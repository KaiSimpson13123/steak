"use client";
import React from "react";
import ConfigForBJ from "./ConfigForBJ";
import BJComponent, { Card } from "./BJComponent";
import { useCommonStore } from "@/app/_store/commonStore";
import { useAuth } from "@/components/AuthProvider";

type Status = "idle" | "dealt" | "playerTurn" | "dealerTurn" | "settled";

const ranks = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
const suits = ["♠", "♥", "♦", "♣"] as const;

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const s of suits) for (const r of ranks) deck.push({ suit: s, rank: r });
  return deck;
}
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function handValue(cards: Card[]): { total: number; soft: boolean } {
  let total = 0, aces = 0;
  for (const c of cards) {
    if (c.rank === "A") { aces++; total += 11; }
    else if (["K", "Q", "J"].includes(c.rank) || c.rank === "10") total += 10;
    else total += parseInt(c.rank, 10);
  }
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  const soft = cards.some((c) => c.rank === "A") && total <= 21 && aces > 0;
  return { total, soft };
}
function isBlackjack(cards: Card[]) {
  return cards.length === 2 && handValue(cards).total === 21;
}

export default function BlackjackGameContainer() {
  // state
  const [deck, setDeck] = React.useState<Card[]>([]);
  const [playerHand, setPlayerHand] = React.useState<Card[]>([]);
  const [dealerHand, setDealerHand] = React.useState<Card[]>([]);
  const [status, setStatus] = React.useState<Status>("idle");
  const [dealerHidden, setDealerHidden] = React.useState<boolean>(true);
  const [message, setMessage] = React.useState<string>("Place a bet to begin.");
  const [activeBet, setActiveBet] = React.useState<number>(0);
  const [handInProgress, setHandInProgress] = React.useState<boolean>(false);
  const [lastResults, setLastResults] = React.useState<
    { outcome: "WIN" | "LOSE" | "PUSH" | "BJ"; bet: number; delta: number }[]
  >([]);
  const { setBalance, balance } = useCommonStore();
  const { user } = useAuth();

  // timeout management
  const timeoutsRef = React.useRef<number[]>([]);
  const clearQueuedTimeouts = React.useCallback(() => {
    for (const id of timeoutsRef.current) clearTimeout(id);
    timeoutsRef.current = [];
  }, []);
  const queueTimeout = React.useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timeoutsRef.current.push(id);
  }, []);
  React.useEffect(() => () => clearQueuedTimeouts(), [clearQueuedTimeouts]);

  // helpers
  const draw = React.useCallback((d: Card[]): { card: Card; rest: Card[] } => {
    const [card, ...rest] = d;
    return { card, rest };
  }, []);

  const startNewShoeIfNeeded = React.useCallback((current: Card[]) => {
    if (current.length < 15) return shuffle(buildDeck().concat(buildDeck())); // 2 decks
    return current;
  }, []);

  const settle = React.useCallback(
    (outcome: "WIN" | "LOSE" | "PUSH" | "BJ", betSize: number) => {
      const uid = user?.id;
      let delta = 0;
      if (outcome === "WIN") delta = betSize * 2;    // return + 1x win
      if (outcome === "BJ")  delta = betSize * 2.5;  // return + 1.5x
      if (outcome === "PUSH") delta = betSize * 1;   // return only

      if (uid) setBalance((balance ?? 0) + delta, uid);

      setLastResults((prev) => [...prev, { outcome, bet: betSize, delta: delta - betSize }]);
      setStatus("settled");
      setDealerHidden(false);
      setHandInProgress(false);

      if (outcome === "BJ" || outcome === "WIN") setMessage(`You win $${delta.toFixed(2)}`);
      else if (outcome === "PUSH") setMessage("Tie. Your bet is returned.");
      else setMessage("You lose.");
    },
    [balance, setBalance, user?.id]
  );

  const onBet = React.useCallback(
    (betAmount: number) => {
      if (handInProgress) return;
      if (betAmount <= 0 || betAmount > (balance ?? 0)) return;
      const uid = user?.id;
      if (!uid) return;

      clearQueuedTimeouts();

      // deduct bet upfront
      setBalance((balance ?? 0) - betAmount, uid);
      setActiveBet(betAmount);
      setHandInProgress(true);

      // prepare shoe
      const fresh = startNewShoeIfNeeded(deck.length ? deck : shuffle(buildDeck().concat(buildDeck())));
      let d = [...fresh];

      // pre-draw 4 cards
      const p1 = draw(d); d = p1.rest;
      const d1 = draw(d); d = d1.rest;
      const p2 = draw(d); d = p2.rest;
      const d2 = draw(d); d = d2.rest;

      setDeck(d);
      setPlayerHand([]);
      setDealerHand([]);
      setDealerHidden(true);
      setStatus("dealt");
      setMessage("Dealing...");

      // stagger deal
      queueTimeout(() => setPlayerHand([p1.card]), 0);
      queueTimeout(() => setDealerHand([d1.card]), 300);
      queueTimeout(() => setPlayerHand((h) => [...h, p2.card]), 600);
      queueTimeout(() => setDealerHand((h) => [...h, d2.card]), 900);

      // post-deal: check blackjack
      queueTimeout(() => {
        const newPlayer = [p1.card, p2.card];
        const newDealer = [d1.card, d2.card];
        const playerBJ = isBlackjack(newPlayer);
        const dealerBJ = isBlackjack(newDealer);

        if (playerBJ || dealerBJ) {
          setDealerHidden(false);
          queueTimeout(() => {
            if (playerBJ && dealerBJ) settle("PUSH", betAmount);
            else if (playerBJ) settle("BJ", betAmount);
            else settle("LOSE", betAmount);
          }, 600);
        } else {
          setStatus("playerTurn");
          setMessage("Your turn: Hit, Stand, or Double Down.");
        }
      }, 1100);
    },
    [handInProgress, balance, setBalance, user?.id, deck, startNewShoeIfNeeded, draw, settle, clearQueuedTimeouts, queueTimeout]
  );

  const dealerPlay = React.useCallback(
    (dHand: Card[], dDeck: Card[], playerTotal: number) => {
      let hand = [...dHand];
      let shoe = [...dDeck];

      const step = () => {
        const hv = handValue(hand);
        if (hv.total < 17 || (hv.total === 17 && hv.soft)) {
          const next = draw(shoe);
          hand.push(next.card);
          shoe = next.rest;
          setDealerHand([...hand]);
          setDeck([...shoe]);
          queueTimeout(step, 1000);
        } else {
          if (hv.total > 21) return settle("WIN", activeBet);
          if (playerTotal > hv.total) return settle("WIN", activeBet);
          if (playerTotal < hv.total) return settle("LOSE", activeBet);
          return settle("PUSH", activeBet);
        }
      };
      step();
    },
    [draw, settle, activeBet, queueTimeout]
  );

  const onStand = React.useCallback(() => {
    if (status !== "playerTurn" && status !== "dealt") return;
    const pVal = handValue(playerHand).total;

    setDealerHidden(false);
    setStatus("dealerTurn");
    setMessage("Dealer's turn...");
    dealerPlay(dealerHand, deck, pVal);
  }, [status, playerHand, dealerHand, deck, dealerPlay]);

  const onHit = React.useCallback(() => {
    if (status !== "playerTurn" || !deck.length) return;

    const { card, rest } = draw(deck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(rest);

    const { total } = handValue(newHand);
    if (total > 21) {
      setDealerHidden(false);
      queueTimeout(() => settle("LOSE", activeBet), 700);
    } else if (total === 21) {
      queueTimeout(() => onStand(), 400);
    } else {
      setMessage("Your turn: Hit, Stand, or Double Down.");
    }
  }, [status, deck, draw, playerHand, settle, activeBet, onStand, queueTimeout]);

  const onDouble = React.useCallback(() => {
    if (status !== "playerTurn" || playerHand.length !== 2) return;
    if ((balance ?? 0) < activeBet) return;
    const uid = user?.id;
    if (!uid) return;

    setBalance((balance ?? 0) - activeBet, uid);
    const newBet = activeBet * 2;
    setActiveBet(newBet);

    const { card, rest } = draw(deck);
    const newHand = [...playerHand, card];
    setPlayerHand(newHand);
    setDeck(rest);

    const { total } = handValue(newHand);
    if (total > 21) {
      setDealerHidden(false);
      queueTimeout(() => settle("LOSE", newBet), 700);
    } else {
      queueTimeout(() => onStand(), 400);
    }
  }, [status, playerHand, balance, activeBet, setBalance, user?.id, deck, draw, onStand, settle, queueTimeout]);

  const canHit = status === "playerTurn";
  const canStand = status === "playerTurn" || status === "dealt";
  const canDouble = status === "playerTurn" && playerHand.length === 2 && (balance ?? 0) >= activeBet;

  // ✅ compute totals BEFORE JSX
  const playerTotal = handValue(playerHand).total;
  const dealerTotal = !dealerHidden ? handValue(dealerHand).total : undefined;

  if (!user) {
    return <div className="text-center p-4">Please log in to play Blackjack.</div>;
  }

  return (
    <div className="flex flex-col md:flex-row bg-background gap-4 md:gap-8 p-4 w-full max-w-6xl mx-auto">
      <div className="w-full md:w-1/3">
        <ConfigForBJ onBet={onBet} handInProgress={handInProgress} />
      </div>
      <div className="w-full md:w-2/3">
        <BJComponent
          playerHand={playerHand}
          dealerHand={dealerHand}
          dealerHidden={dealerHidden}
          status={status}
          message={message}
          canHit={canHit}
          canStand={canStand}
          canDouble={canDouble}
          onHit={onHit}
          onStand={onStand}
          onDouble={onDouble}
          lastResults={lastResults}
          playerTotal={playerTotal}
          dealerTotal={dealerTotal}
        />
      </div>
    </div>
  );
}
