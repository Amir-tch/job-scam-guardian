"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import { exportReportToPDF } from "./lib/exportReport";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [messageText, setMessageText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [senderDomain, setSenderDomain] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/learn");
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/learn");
  }

  async function analyzeJob() {
    setError("");
    setAnalysis(null);

    if (messageText.trim().length < 10) {
      setError("Please paste a job offer message first.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageText,
          companyName,
          senderDomain,
          userId: user?.id || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setAnalysis(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function getRiskClass(level) {
    if (level === "high") return "risk-high";
    if (level === "medium") return "risk-medium";
    return "risk-low";
  }

  return (
    <main className="container">
      {user && (
        <div className="top-nav">
          <span>{user.email}</span>
          <a href="/learn">
            <button>Learn</button>
          </a>
          <a href="/stats">
            <button>Community Stats</button>
          </a>
          <a href="/dashboard">
            <button>History</button>
          </a>
          <button onClick={handleLogout}>Log out</button>
        </div>
      )}

      <section className="hero">
        <div className="badge">🛡️ JOB SCAM GUARDIAN</div>
        <h1>Is this job offer a scam?</h1>
        <p>
          Paste a job offer message below and let AI check it for common scam
          patterns.
        </p>
      </section>

      <section className="card">
        <label>Job offer message *</label>
        <textarea
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          placeholder="Paste the job offer message here..."
          rows={10}
        />

        <div className="grid">
          <div>
            <label>Company Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="e.g. Microsoft"
            />
          </div>

          <div>
            <label>Sender Email Domain</label>
            <input
              type="text"
              value={senderDomain}
              onChange={(e) => setSenderDomain(e.target.value)}
              placeholder="e.g. company.com"
            />
          </div>
        </div>

        {error && <div className="error">{error}</div>}

        <button onClick={analyzeJob} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Job Offer"}
        </button>
      </section>

      {analysis && (
        <section className="results">
          {analysis.matchedPrevious && (
            <div
              style={{
                background: "#fff3cd",
                color: "#946200",
                border: "1px solid #ffe69c",
                borderRadius: 10,
                padding: "14px 16px",
                marginBottom: 20,
                fontWeight: 600,
              }}
            >
              This message closely matches a job offer already reported by
              another user.
            </div>
          )}

          <div className="result-header">
            <h2>Analysis Results</h2>
            <div className={`risk ${getRiskClass(analysis.riskLevel)}`}>
              {analysis.riskLevel?.toUpperCase()} RISK
            </div>
          </div>

          <div className="score">
            <span>Risk Score</span>
            <strong>{analysis.riskScore}/100</strong>
          </div>

          <div className="summary">
            <h3>Summary</h3>
            <p>{analysis.summary}</p>
          </div>

          <div className="flags">
            <h3>Warning Signs</h3>
            {analysis.flags?.map((flag, index) => (
              <div
                className={`flag ${flag.detected ? "detected" : "safe"}`}
                key={index}
              >
                <div className="flag-title">
                  <strong>{flag.category}</strong>
                  <span>
                    {flag.detected ? "Detected" : "Not detected"}
                  </span>
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
              exportReportToPDF(analysis, { companyName, senderDomain })
            }
          >
            Export Report (PDF)
          </button>
        </section>
      )}

      <footer>
        <p>
          <strong>Important:</strong> This tool provides an educational risk
          assessment. A high or low score does not prove whether a job offer
          or company is legitimate. Always verify the employer independently
          before sharing personal information or sending money.
        </p>
      </footer>
    </main>
  );
}