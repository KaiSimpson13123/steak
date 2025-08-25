/* eslint-disable @next/next/no-img-element */
"use client";

import { useConfigStore } from "@/app/_store/configStore";
import { useGridStore } from "@/app/_store/gridStore";
import { useEffect, useState } from "react";
import { Gem, Beef } from "lucide-react";
import { useCommonStore } from "@/app/_store/commonStore";
import { addGameResult } from "@/app/_constants/data";
import Modal from "../ui/Modal";

export default function GridComponent() {
  const {
    selectedGrid,
    handleSelectGrid,
    setSelectedGrid,
    numberOfSuccessfulClicks,
    setNumberOfSuccessfulClicks,
  } = useGridStore();
  const {
    numberOfMines,
    isGameSetup,
    setNumberOfMines,
    betAmount,
    resetGame,
    clearConfigStore,
  } = useConfigStore();
  const { balance } = useCommonStore();

  const [mines, setMines] = useState<number[]>([]);
  const [showModal, setShowModal] = useState(false);

  // NEW: cheat overlay toggle + key buffer
  const [showEyes, setShowEyes] = useState(false);
  useEffect(() => {
    let buffer = "";
    const onKey = (e: KeyboardEvent) => {
      // ignore modifier-only keys
      if (e.key.length !== 1) return;
      buffer = (buffer + e.key).toUpperCase().slice(-4);
      if (buffer === "RIZZ") {
        setShowEyes((s) => !s);
        buffer = "";
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (isGameSetup) {
      setSelectedGrid({});
      const generateUniqueMines = () => {
        const minePositions = new Set<number>();
        const total = Math.max(0, Math.min(25, numberOfMines || 0));
        while (minePositions.size < total) {
          minePositions.add(Math.floor(Math.random() * 25));
        }
        return Array.from(minePositions);
      };
      setMines(generateUniqueMines());
    } else {
      // hide overlay when game not set up
      setShowEyes(false);
    }
  }, [numberOfMines, isGameSetup, setSelectedGrid]);

  const handleGridClick = (index: number) => {
    if (!isGameSetup) return;

    if (mines.includes(index)) {
      handleSelectGrid(index);
      const audio = new Audio("/assets/audio/mine-audio.mp3");
      audio.play();
      setShowModal(true);
      setNumberOfMines(1);
      setNumberOfSuccessfulClicks(0);
      clearConfigStore();
      resetGame();

      addGameResult(
        <div className="flex items-center justify-center gap-1">
          <Beef size={20} />
          Mines
        </div>,
        "Loss",
        -betAmount!,
        balance! < 100 ? (
          <div className="text-green-500">1000 (Restored)</div>
        ) : (
          balance!
        )
      );
    } else {
      if (!selectedGrid[index]) {
        handleSelectGrid(index);
        setNumberOfSuccessfulClicks(numberOfSuccessfulClicks + 1);
        const audio = new Audio("/assets/audio/win-audio.mp3");
        audio.play();
      }
    }
  };

  return (
    <div className="grid grid-cols-5 gap-3 w-full max-w-xl mx-auto">
      {Array.from({ length: 25 }).map((_, index) => {
        const isSelected = !!selectedGrid[index];
        const isMine = mines.includes(index);

        return (
          <div
            key={index}
            className={`relative aspect-square w-full min-h-18 flex justify-center items-center transition-all rounded-md duration-500 ${
              isSelected
                ? isMine
                  ? "border-red-500 text-white animate-shake bg-[#071924] scale-95"
                  : "border-green-500 text-white animate-pop bg-[#071924] scale-95"
                : "bg-[#2f4553] hover:scale-105 active:scale-95 active:bg-[#071924]"
            }`}
            onClick={() => handleGridClick(index)}
          >
            {/* Revealed state (clicked or after loss modal) */}
            {(isSelected || showModal) && (
              <>
                {isMine ? (
                  <div className="relative flex p-2 items-center justify-center w-full h-full bg-primary text-white font-bold rounded-md">
                    <img
                      src="/assets/mine.svg"
                      alt="bomb"
                      className="w-4/5 h-4/5 animate-fade-in"
                    />
                  </div>
                ) : (
                  <div className="relative flex p-2 items-center justify-center w-full h-full bg-primary text-white font-bold rounded-md">
                    <Beef className="w-4/5 h-4/5 animate-fade-in text-[#4cd964]" />
                  </div>
                )}
              </>
            )}

            {/* NEW: Cheat overlay — shows mines with opacity when EYES is toggled */}
            {!isSelected && showEyes && isMine && (
              <img
                src="/assets/mine.svg"
                alt="mine hint"
                className="pointer-events-none absolute inset-0 m-auto w-4/5 h-4/5 opacity-30"
              />
            )}
          </div>
        );
      })}
      <Modal
        isOpen={showModal}
        closeModal={() => setShowModal(false)}
        result="lose"
        amount={100}
      />
    </div>
  );
}
