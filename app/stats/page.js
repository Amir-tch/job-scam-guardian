"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [totalChecks, setTotalChecks] = useState(0);
  const [highRiskPercent, setHighRiskPercent] = useState(0);
  const [topFlag, setTopFlag] = useState("");

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("checks")
        .select("risk_level, flags");

      if (!error && data) {
        const total = data.length;
        setTotalChecks(total);

        const highRiskCount = data.filter(
          (c) => c.risk_level === "high"
        ).length;

        setHighRiskPercent(
          total > 0 ? Math.round((highRiskCount / total) * 100) : 0
        );

        const flagCounts = {};

        data.forEach((check) => {
          check.flags?.forEach((flag) => {
            if (flag.detected) {
              flagCounts[flag.category] =
                (flagCounts[flag.category] || 0) + 1;
            }
          });
        });

        const sorted = Object.entries(flagCounts).sort(
          (a, b) => b[1] - a[1]
        );

        setTopFlag(sorted.length > 0 ? sorted[0][0] : "Not enough data yet");
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="container">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="container">
      <section className="hero">
        <div className="badge">📊 PUBLIC STATS</div>
        <h1>Job Scam Guardian: Community Data</h1>
        <p>
          Aggregated, anonymized statistics from every job offer checked
          using this tool.
        </p>
      </section>

      <section
        className="card"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 20,
          textAlign: "center",
        }}
      >
        <div>
          <p style={{ color: "#667085", marginBottom: 6 }}>
            Total Checks Run
          </p>
          <strong style={{ fontSize: 32 }}>{totalChecks}</strong>
        </div>

        <div>
          <p style={{ color: "#667085", marginBottom: 6 }}>
            Flagged High Risk
          </p>
          <strong style={{ fontSize: 32 }}>{highRiskPercent}%</strong>
        </div>

        <div>
          <p style={{ color: "#667085", marginBottom: 6 }}>
            Most Common Red Flag
          </p>
          <strong style={{ fontSize: 18 }}>{topFlag}</strong>
        </div>
      </section>

      <footer>
        <p>
          These statistics update automatically as more people use Job Scam
          Guardian. No personal information is shown here.
        </p>
      </footer>
    </main>
  );
}