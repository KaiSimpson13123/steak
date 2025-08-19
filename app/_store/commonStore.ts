import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib/supabase";

type CommonStore = {
  profitAmount: number;
  setProfitAmount: (profitAmount: number) => void;
  multiplier: number;
  setMultiplier: (multiplier: number) => void;
  balance: number;
  setBalance: (balance: number, userId?: string) => void;
  fetchBalance: (userId: string) => Promise<void>;
  clearCommonState: () => void;
};

// ✅ declare outside so it doesn't cause syntax errors
let balanceUpdateTimeout: NodeJS.Timeout | null = null;

export const useCommonStore = create<CommonStore>()(
  persist(
    (set, get) => ({
      profitAmount: 0,
      multiplier: 0,
      balance: 1000,

      setProfitAmount: (profitAmount) => set({ profitAmount }),
      setMultiplier: (multiplier) => set({ multiplier }),

      setBalance: (balance, userId) => {
        const safeBalance = Math.max(0, Math.round(balance * 100) / 100);
        set({ balance: safeBalance });

        if (userId) {
          if (balanceUpdateTimeout) clearTimeout(balanceUpdateTimeout);
          balanceUpdateTimeout = setTimeout(() => {
            supabase
              .from("users")
              .update({ balance: safeBalance })
              .eq("id", userId)
              .then(({ error }) => {
                if (error) console.error("Supabase balance update error:", error.message);
              });
          }, 300); // waits 300ms before writing
        }
      },

      fetchBalance: async (userId: string) => {
        const { data, error } = await supabase
          .from("users")
          .select("balance")
          .eq("id", userId)
          .single();

        if (!error && data) {
          set({ balance: data.balance });
        } else if (error) {
          console.error("Error fetching balance:", error.message);
        }
      },

      clearCommonState: () => {
        const currentBalance = get().balance;
        set({
          profitAmount: 0,
          multiplier: 0,
          balance: currentBalance < 100 ? 1000 : currentBalance,
        });
      },
    }),
    { name: "config-storage" }
  )
);
