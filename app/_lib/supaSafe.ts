// app/_lib/supaSafe.ts
export type UUID = string;

export interface ClubStats {
  id: UUID;
  name: string;
  slug: string;
  description: string | null;
  owner_id: UUID;
  created_at: string;
  member_count: number;
  total_balance: number;
}

export function normalizeClubRow(row: any): ClubStats {
  const totalRaw = row?.total_balance ?? row?.sum_balance ?? 0;
  const total_balance =
    typeof totalRaw === "string" ? parseFloat(totalRaw) : Number(totalRaw || 0);

  return {
    id: String(row?.id ?? ""),
    name: String(row?.name ?? "Untitled"),
    slug: String((row?.slug ?? "club").toString().toLowerCase()),
    description: row?.description ?? null,
    owner_id: String(row?.owner_id ?? ""),
    created_at: row?.created_at ? String(row.created_at) : new Date().toISOString(),
    member_count: Number(row?.member_count ?? row?.members_count ?? 0),
    total_balance: Number.isFinite(total_balance) ? total_balance : 0,
  };
}

export interface Member {
  role: "owner" | "admin" | "member";
  user: { id: string; username: string; balance: number };
}

export function normalizeMemberRow(row: any): Member {
  const u = Array.isArray(row?.user) ? row.user[0] : row?.user;
  return {
    role: (row?.role ?? "member") as Member["role"],
    user: {
      id: String(u?.id ?? ""),
      username: String(u?.username ?? "Player"),
      balance: Number(u?.balance ?? 0),
    },
  };
}
