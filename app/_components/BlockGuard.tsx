"use client";
import React, { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";

export default function BlockGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"idle" | "ok" | "blocked">("idle");
  const [ip, setIp] = useState<string>("");
  const [note, setNote] = useState<string | null>(null);
  const [type, setType] = useState<string>("");

  const { user } = useAuth();

  useEffect(() => {
    let mounted = true;

    async function checkBans() {
      try {
        // --- IP ban check ---
        const res = await fetch("/api/blocked/check", { method: "GET", cache: "no-store" });
        const j = await res.json();
        if (!mounted) return;

        if (j.blocked) {
          setIp(j.ip || "");
          setType("IP Blocked");
          setNote(j.note || "No reason provided.");
          setState("blocked");
          return; // stop if blocked
        }

        // --- User ban check ---
        if (user) {
          const { data, error } = await supabase
            .from("blocked_users")
            .select("reason")
            .eq("user_id", user.id)
            .maybeSingle();

          if (error) {
            console.error("Failed to fetch user bans:", error);
            return;
          }

          if (data) {
            setType("User Account Banned");
            setNote(data.reason || "No reason provided.");
            setState("blocked");
            return;
          }
        }

        // If no bans hit
        setState("ok");
      } catch (err) {
        console.error("Ban check failed:", err);
      }
    }

    // Run immediately on mount
    checkBans();

    // Poll every 5 seconds
    const interval = setInterval(checkBans, 5000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [user]);

  if (state === "blocked") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black text-white p-6">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-bold">Access blocked (403: Forbidden)</h1>
          <p className="text-gray-300">
            Your access to this platform has been blocked. ({type})
          </p>
          {note ? (
            <p className="text-gray-400 text-sm">Reason: {note}</p>
          ) : (
            <p>No reason provided.</p>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
