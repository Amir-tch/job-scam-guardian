"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setMessage("Password updated. Redirecting to login...");
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 420, margin: "60px auto" }}>
        <h1 style={{ marginBottom: 20 }}>Set a new password</h1>

        <form onSubmit={handleSubmit}>
          <label>New password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={{ marginBottom: 20 }}
          />

          {error && <div className="error">{error}</div>}
          {message && (
            <div
              style={{
                background: "#dcfae6",
                color: "#087443",
                borderRadius: 10,
                padding: 12,
                marginBottom: 18,
              }}
            >
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </section>
    </main>
  );
}