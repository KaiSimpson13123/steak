"use client";

import { useState } from "react";
import { Client, Account, ID } from "appwrite";
import { useRouter } from "next/navigation";

const client = new Client()
  .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
  .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID!);

const account = new Account(client);

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      await account.create(ID.unique(), email, password);
      await account.createSession(email, password);
      router.push("/"); // redirect to homepage
    } catch (err: any) {
      setError(err.message || "Signup failed");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl mb-6">Sign Up</h1>
      <form className="flex flex-col gap-4 w-80" onSubmit={handleSignup}>
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
          Sign Up
        </button>
        <p>Have an account? <button className="underline" onClick={() => router.push("/login")}>Login</button></p>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}
