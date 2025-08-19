"use client";

import { useState } from "react";
import { Client, Account } from "appwrite";
import { useRouter } from "next/navigation";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError("");

  if (!email || !password) {
    setError("Email and password are required");
    return;
  }

  try {
    await account.createSession(email.trim(), password);
    router.push("/");
  } catch (err: any) {
    setError(err.message || "Login failed");
  }
};

  return (
    <div className="flex flex-col items-center justify-center min-h-screen text-white">
      <h1 className="text-3xl mb-6">Login</h1>
      <form className="flex flex-col gap-4 w-80" onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white"
          required
        />
        <button
          type="submit"
          className="bg-green-500 hover:bg-green-600 p-2 rounded font-bold"
        >
          Login
        </button>
        <p>Need an account? <button className="underline" onClick={() => router.push("/signup")}>Signup</button></p>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}
