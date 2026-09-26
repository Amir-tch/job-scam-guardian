"use client";

import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage("Check your email for a password reset link.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="container">
      <section className="card" style={{ maxWidth: 420, margin: "60px auto" }}>
        <h1 style={{ marginBottom: 20 }}>Reset your password</h1>

        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p style={{ marginTop: 16, textAlign: "center" }}>
          <a href="/login" style={{ color: "#315fc4" }}>
            Back to login
          </a>
        </p>
      </section>
    </main>
  );
}