"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function SignupPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username || !email || !password) {
      setError("All fields are required");
      return;
    }

    try {
      // Step 1: create user in Supabase auth
      const { data, error: signupError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { username },
        },
      });

      if (signupError) throw signupError;

      // Step 2: make a user "document" under /users/{uid}
      if (data.user) {
        const userId = data.user.id;

        const { error: dbError } = await supabase
          .from("users")
          .insert([
            {
              id: userId, // this becomes /users/{uid}
              username,
              email,
              balance: 1000,
              lastDailyClaim: null,
              lastWeeklyClaim: null,
              createdAt: new Date().toISOString(),
            },
          ]);

        if (dbError) throw dbError;
      }

      router.push("/login");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
      <h1 className="text-3xl mb-6">Sign Up</h1>
      <form className="flex flex-col gap-4 w-80" onSubmit={handleSignup}>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="p-2 rounded bg-gray-800 text-white"
          required
        />
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
        <p>
          Have an account?{" "}
          <button
            type="button"
            className="underline"
            onClick={() => router.push("/login")}
          >
            Login
          </button>
        </p>
        {error && <p className="text-red-400">{error}</p>}
      </form>
    </div>
  );
}
