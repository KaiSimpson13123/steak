"use client";
import React, { useEffect, useState } from "react";

export default function BlockGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<"idle" | "ok" | "blocked">("idle");
  const [ip, setIp] = useState<string>("");
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch("/api/blocked/check", { method: "GET", cache: "no-store" });
        const j = await res.json();
        if (!mounted) return;
        setIp(j.ip || "");
        setNote(j.note ?? null);
        setState(j.blocked ? "blocked" : "ok");
      } catch {
        setState("ok"); // fail open
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (state === "blocked") {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-black text-white p-6">
        <div className="max-w-lg text-center space-y-4">
          <h1 className="text-3xl font-bold">Access blocked (403: Forbidden)</h1>
          <p className="text-gray-300">Your IP {ip ? <code className="px-1 bg-white/10 rounded">{ip}</code> : ""} is blocked.</p>
          {note ? <p className="text-gray-400 text-sm">Reason: {note}</p> : "No reason provided."}
        </div>
      </div>
    );
  }

  // idle or ok → render app
  return <>{children}</>;
}
