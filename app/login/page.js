"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        router.push("/");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
    });
    if (error) setError(error.message);
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 420, margin: "60px auto" }}>
        <h1 style={{ marginBottom: 20 }}>
          {isSignUp ? "Create an account" : "Log in"}
        </h1>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ marginBottom: 16 }}
          />

          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ marginBottom: 8 }}
          />

          {!isSignUp && (
            <p style={{ textAlign: "right", marginTop: 0, marginBottom: 20 }}>
              <a href="/forgot-password" style={{ color: "#315fc4", fontSize: 14 }}>
                Forgot password?
              </a>
            </p>
          )}

          {error && <div className="error">{error}</div>}

          <button type="submit" disabled={loading}>
            {loading ? "Please wait..." : isSignUp ? "Sign Up" : "Log In"}
          </button>
        </form>

        <div style={{ margin: "20px 0", textAlign: "center", color: "#98a2b3" }}>
          or
        </div>

        <button
          type="button"
          onClick={handleGoogleLogin}
          style={{
            background: "white",
            color: "#172033",
            border: "1px solid #d6dbe5",
            marginBottom: 10,
          }}
        >
          Continue with Google
        </button>

        <p style={{ marginTop: 16, textAlign: "center" }}>
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "none",
              color: "#315fc4",
              width: "auto",
              padding: 0,
              textDecoration: "underline",
            }}
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </section>
    </main>
  );
}