"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { exportReportToPDF } from "../lib/exportReport";
import BottomNav from "../components/BottomNav";

export default function Dashboard() {
  const router = useRouter();
  const [checks, setChecks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      const { data: checksData, error } = await supabase
        .from("checks")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (!error) {
        setChecks(checksData || []);
      }

      setLoading(false);
    }

    load();
  }, [router]);

  function getRiskClass(level) {
    if (level === "high") return "risk-high";
    if (level === "medium") return "risk-medium";
    return "risk-low";
  }

  if (loading) {
    return (
      <>
        <main className="container">
          <div className="skeleton skeleton-line" style={{ width: "50%" }} />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-block" />
        </main>
        <BottomNav />
      </>
    );
  }

  return (
    <>
      <main className="container">
        <h1 style={{ marginBottom: 20 }}>Your check history</h1>

        {checks.length === 0 && (
          <section className="card">
            <p>You haven't analyzed any job offers yet.</p>
          </section>
        )}

        {!selected &&
          checks.map((check) => (
            <section
              key={check.id}
              className="card"
              style={{ marginBottom: 14, cursor: "pointer" }}
              onClick={() => setSelected(check)}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 10,
                }}
              >
                <div>
                  <strong>{check.company_name || "Unnamed company"}</strong>
                  <p style={{ margin: "4px 0", color: "#6b7280", fontSize: 13 }}>
                    {new Date(check.created_at).toLocaleString()}
                  </p>
                </div>

                <div className={`risk ${getRiskClass(check.risk_level)}`}>
                  {check.risk_level?.toUpperCase()} · {check.risk_score}/100
                </div>
              </div>
            </section>
          ))}

        {selected && (
          <section className="results">
            <button
              onClick={() => setSelected(null)}
              style={{
                width: "auto",
                padding: "8px 14px",
                background: "#f3f4f6",
                color: "#1a1a1a",
                marginBottom: 20,
              }}
            >
              Back to history
            </button>

            <div className="result-header">
              <h2>Analysis results</h2>
              <div className={`risk ${getRiskClass(selected.risk_level)}`}>
                {selected.risk_level?.toUpperCase()} RISK
              </div>
            </div>

            <div className="score">
              <span>Risk score</span>
              <strong>{selected.risk_score}/100</strong>
            </div>

            <div className="summary">
              <h3>Summary</h3>
              <p>{selected.summary}</p>
            </div>

            <div className="flags">
              <h3>Warning signs</h3>
              {selected.flags?.map((flag, index) => (
                <div
                  className={`flag ${flag.detected ? "detected" : "safe"}`}
                  key={index}
                >
                  <div className="flag-title">
                    <strong>{flag.category}</strong>
                    <span>{flag.detected ? "Detected" : "Not detected"}</span>
                  </div>

                  {flag.detected && flag.evidence && (
                    <div className="evidence">
                      <strong>Evidence:</strong> "{flag.evidence}"
                    </div>
                  )}

                  <p>{flag.explanation}</p>
                </div>
              ))}
            </div>

            <button
              className="export-btn"
              onClick={() =>
                exportReportToPDF(
                  {
                    riskScore: selected.risk_score,
                    riskLevel: selected.risk_level,
                    summary: selected.summary,
                    flags: selected.flags,
                  },
                  {
                    companyName: selected.company_name,
                    senderDomain: selected.sender_domain,
                  }
                )
              }
            >
              Download this report
            </button>
          </section>
        )}
      </main>

      <BottomNav />
    </>
  );
}