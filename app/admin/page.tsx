"use client";

{/* fuck off isaac */}

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type UserRow = { id: string; username: string };
type IpLog = {
  id: string;
  ip: string;
  user_agent: string;
  accept_language: string;
  referer: string;
  path: string;
  created_at: string;
  location?: { city?: string; country?: string; country_code?: string; flag?: string };
};

export default function AdminPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedUsername, setSelectedUsername] = useState<string>("");
  const [logs, setLogs] = useState<IpLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Protect page on mount
  useEffect(() => {
    if (!user) return; // wait for auth provider
    if (user.user_metadata?.username !== "SmacklePackle") {
      router.push("/");
    }
  }, [user, router]);

  // Load user list (public read per your RLS) and pick first by default
  useEffect(() => {
    const run = async () => {
      if (!user) return;
      setLoading(true);
      setErrorMsg("");

      const { data, error } = await supabase
        .from("users")
        .select("id, username")
        .order("username", { ascending: true });

      if (error) {
        setErrorMsg(error.message);
      } else {
        setUsers(data || []);
        if (data && data.length > 0) {
          setSelectedUsername((prev) => prev || data[0].username);
        }
      }
      setLoading(false);
    };
    run();
  }, [user]);

  const filteredUsers = useMemo(() => {
    const f = filter.trim().toLowerCase();
    if (!f) return users;
    return users.filter((u) => u.username?.toLowerCase().includes(f));
  }, [users, filter]);

  // Fetch logs for selected user via the secure API route
  const fetchLogs = async (username: string) => {
    if (!username) return;
    setLoadingLogs(true);
    setErrorMsg("");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setErrorMsg("No access token; please re-login.");
      setLoadingLogs(false);
      return;
    }

    const res = await fetch("/api/admin/ip-logs", {
    method: "POST",
    headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,      // ✅ key line
    },
    body: JSON.stringify({ username }),
    });

    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErrorMsg(j?.error || `Request failed with status ${res.status}`);
      setLogs([]);
      setLoadingLogs(false);
      return;
    }

    const j = await res.json();
    setLogs(j.logs || []);
    setLoadingLogs(false);
  };

  // Load logs when selection changes
  useEffect(() => {
    if (!user) return;
    if (user.user_metadata?.username !== "SmacklePackle") return;
    if (!selectedUsername) return;
    fetchLogs(selectedUsername);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUsername, user]);

  if (!user || user.user_metadata?.username !== "SmacklePackle") {
    return null; // short-circuit while redirecting
  }

  if (loading) {
    return <main className="p-6 text-white">Loading users…</main>;
  }

  return (
    <main className="p-6 max-w-6xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">Admin – IP Logs</h1>

      <div className="bg-gray-900 rounded-lg p-4 mb-6 border border-white/10">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex flex-col">
            <label className="text-sm text-gray-300 mb-1">Filter users</label>
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search username…"
              className="px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-success"
            />
          </div>

          <div className="flex flex-col sm:min-w-[260px]">
            <label className="text-sm text-gray-300 mb-1">Select user</label>
            <select
              value={selectedUsername}
              onChange={(e) => setSelectedUsername(e.target.value)}
              className="px-3 py-2 rounded bg-gray-800 border border-gray-700 focus:outline-none focus:border-success"
            >
              {filteredUsers.map((u) => (
                <option key={u.id} value={u.username}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => fetchLogs(selectedUsername)}
            className="mt-2 sm:mt-0 px-4 py-2 rounded bg-success hover:bg-green-600 text-black font-semibold"
          >
            Refresh
          </button>
        </div>

        {errorMsg && (
          <p className="mt-3 text-red-400 text-sm">Error: {errorMsg}</p>
        )}
      </div>

      <div className="overflow-x-auto bg-gray-900 rounded-lg shadow border border-white/10">
        <table className="min-w-full text-sm text-left">
            <thead className="bg-gray-800 text-gray-300">
            <tr>
                <th className="px-4 py-2">Timestamp</th>
                <th className="px-4 py-2">IP</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Path</th>
                <th className="px-4 py-2">User Agent</th>
                <th className="px-4 py-2">Lang</th>
                <th className="px-4 py-2">Referer</th>
            </tr>
            </thead>

            <tbody>
            {(() => {
                if (loadingLogs) {
                return (
                    <tr key="loading">
                    <td className="px-4 py-3" colSpan={7}>Loading logs…</td>
                    </tr>
                );
                }

                if (logs.length === 0) {
                return (
                    <tr key="empty">
                    <td className="px-4 py-3" colSpan={7}>
                        No logs for <span className="font-semibold">{selectedUsername}</span>.
                    </td>
                    </tr>
                );
                }

                return logs.map((log) => {
                const locationText =
                    (log as any).location?.city
                    ? `${(log as any).location.city}${
                        (log as any).location.country ? `, ${(log as any).location.country}` : ""
                        }`
                    : "";

                const locationFlag = (log as any).location?.flag || "";

                // Build <td>s as an array to avoid whitespace text nodes inside <tr>
                const cells = [
                    <td key="ts" className="px-4 py-2">
                    {new Date(log.created_at).toLocaleString()}
                    </td>,
                    <td key="ip" className="px-4 py-2">{log.ip}</td>,
                    <td key="loc" className="px-4 py-2">
                    {locationText}
                    {locationFlag ? (
                        <span className="ml-2" title={(log as any).location?.country || ""}>{locationFlag}</span>
                    ) : null}
                    </td>,
                    <td key="path" className="px-4 py-2">{log.path}</td>,
                    <td key="ua" className="px-4 py-2 truncate max-w-xs">{log.user_agent}</td>,
                    <td key="lang" className="px-4 py-2">{log.accept_language}</td>,
                    <td key="ref" className="px-4 py-2">{log.referer}</td>,
                ];

                return (
                    <tr key={log.id} className="odd:bg-gray-800 even:bg-gray-700">
                    {cells}
                    </tr>
                );
                });
            })()}
            </tbody>
        </table>
        </div>
    </main>
  );
}
