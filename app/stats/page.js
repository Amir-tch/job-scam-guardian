"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import BottomNav from "../components/BottomNav";

const CATEGORIES = [
  "Chat-only interview",
  "Upfront payment request",
  "Implausible salary",
  "Urgency pressure",
  "Domain mismatch",
  "Task-based pay scam pattern",
  "Sensitive personal information request",
];

function BarRow({ label, count, percent, color }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          fontSize: 14,
          marginBottom: 6,
        }}
      >
        <span>{label}</span>
        <strong>
          {count} ({percent}%)
        </strong>
      </div>
      <div
        style={{
          height: 8,
          background: "#e5e7eb",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${percent}%`,
            height: "100%",
            background: color,
            borderRadius: 4,
          }}
        />
      </div>
    </div>
  );
}

export default function Stats() {
  const [loading, setLoading] = useState(true);
  const [totalChecks, setTotalChecks] = useState(0);
  const [highRiskPercent, setHighRiskPercent] = useState(0);
  const [topFlag, setTopFlag] = useState("");
  const [averageScore, setAverageScore] = useState(0);
  const [riskCounts, setRiskCounts] = useState({ low: 0, medium: 0, high: 0 });
  const [categoryCounts, setCategoryCounts] = useState({});

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("checks")
        .select("risk_level, risk_score, flags");

      if (!error && data) {
        const total = data.length;
        setTotalChecks(total);

        const risk = { low: 0, medium: 0, high: 0 };
        let scoreSum = 0;
        let scoreCount = 0;

        data.forEach((c) => {
          if (risk[c.risk_level] !== undefined) risk[c.risk_level] += 1;
          if (typeof c.risk_score === "number") {
            scoreSum += c.risk_score;
            scoreCount += 1;
          }
        });

        setRiskCounts(risk);
        setHighRiskPercent(
          total > 0 ? Math.round((risk.high / total) * 100) : 0
        );
        setAverageScore(
          scoreCount > 0 ? Math.round(scoreSum / scoreCount) : 0
        );

        const flagCounts = {};
        CATEGORIES.forEach((cat) => {
          flagCounts[cat] = 0;
        });

        data.forEach((check) => {
          check.flags?.forEach((flag) => {
            if (flag.detected) {
              flagCounts[flag.category] = (flagCounts[flag.category] || 0) + 1;
            }
          });
        });

        setCategoryCounts(flagCounts);

        const sorted = Object.entries(flagCounts)
          .filter(([, count]) => count > 0)
          .sort((a, b) => b[1] - a[1]);

        setTopFlag(sorted.length > 0 ? sorted[0][0] : "Not enough data yet");
      }

      setLoading(false);
    }

    load();
  }, []);

  if (loading) {
    return (
      <>
        <BottomNav />
        <main className="container">
          <div className="skeleton skeleton-line" style={{ width: "50%" }} />
          <div className="skeleton skeleton-block" />
        </main>
      </>
    );
  }

  const pct = (count) =>
    totalChecks > 0 ? Math.round((count / totalChecks) * 100) : 0;

  const sortedCategories = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <>
      <BottomNav />

      <main className="container">
        <section className="hero">
          <div className="badge">PUBLIC STATS</div>
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
            <p style={{ color: "#6b7280", marginBottom: 6, fontSize: 13 }}>
              Total checks run
            </p>
            <strong style={{ fontSize: 30, color: "#2d3648" }}>
              {totalChecks}
            </strong>
          </div>

          <div>
            <p style={{ color: "#6b7280", marginBottom: 6, fontSize: 13 }}>
              Flagged high risk
            </p>
            <strong style={{ fontSize: 30, color: "#b42318" }}>
              {highRiskPercent}%
            </strong>
          </div>

          <div>
            <p style={{ color: "#6b7280", marginBottom: 6, fontSize: 13 }}>
              Most common red flag
            </p>
            <strong style={{ fontSize: 16, color: "#2d3648" }}>
              {topFlag}
            </strong>
          </div>
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 6 }}>Risk level distribution</h3>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 18 }}>
            Average risk score across all checks:{" "}
            <strong style={{ color: "#2d3648" }}>{averageScore}/100</strong>
          </p>
          <BarRow
            label="Low risk"
            count={riskCounts.low}
            percent={pct(riskCounts.low)}
            color="#15803d"
          />
          <BarRow
            label="Medium risk"
            count={riskCounts.medium}
            percent={pct(riskCounts.medium)}
            color="#b45309"
          />
          <BarRow
            label="High risk"
            count={riskCounts.high}
            percent={pct(riskCounts.high)}
            color="#b42318"
          />
        </section>

        <section className="card">
          <h3 style={{ marginBottom: 6 }}>Warning signs breakdown</h3>
          <p style={{ color: "#6b7280", fontSize: 13, marginBottom: 18 }}>
            Share of all checks in which each warning sign was detected.
          </p>
          {sortedCategories.map(([category, count]) => (
            <BarRow
              key={category}
              label={category}
              count={count}
              percent={pct(count)}
              color="#2d3648"
            />
          ))}
        </section>

        <footer>
          <p>
            These statistics update automatically as more people use Job
            Scam Guardian. No personal information is shown here.
          </p>
        </footer>
      </main>
    </>
  );
}