"use client";

import { useEffect, useState, ReactNode } from "react";
import { Client, Account } from "appwrite";
import { useRouter } from "next/navigation";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

interface AuthProviderProps {
  children: ReactNode;
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      try {
        const currentUser = await account.get();
        setUser(currentUser);
      } catch (err) {
        console.log("User not logged in, redirecting...");
        router.push("/login"); // redirect guests to login
      }
    };
    checkUser();
  }, [router]);

  if (!user) return <p className="text-white">Loading...</p>;

  return <>{children}</>;
}
