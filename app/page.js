"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "./lib/supabase";
import { exportReportToPDF } from "./lib/exportReport";
import BottomNav from "./components/BottomNav";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  const [messageText, setMessageText] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [senderDomain, setSenderDomain] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("Analyzing...");
  const [error, setError] = useState("");

  const timeoutRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/learn");
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  async function analyzeJob() {
    setError("");
    setAnalysis(null);

    if (messageText.trim().length < 10) {
      setError("Please paste a job offer message first.");
      return;
    }

    setLoading(true);
    setLoadingText("Analyzing...");

    timeoutRef.current = setTimeout(() => {
      setLoadingText("Still analyzing, this may take a moment...");
    }, 5000);

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
      clearTimeout(timeoutRef.current);
      setLoading(false);
    }
  }

  function getRiskClass(level) {
    if (level === "high") return "risk-high";
    if (level === "medium") return "risk-medium";
    return "risk-low";
  }

  return (
    <>
      <BottomNav />

      <main className="container">
        <section className="hero">
          <div className="badge">JOB SCAM GUARDIAN</div>
          <h1>Is this job offer a scam?</h1>
          <p>
            Paste a job offer message below and let AI check it for common
            scam patterns.
          </p>
        </section>

        <section className="card">
          <label>Job offer message</label>
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Paste the job offer message here..."
            rows={10}
          />

          <div className="grid">
            <div>
              <label>Company name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Microsoft"
              />
            </div>

            <div>
              <label>Sender email domain</label>
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
            {loading ? loadingText : "Analyze this job offer"}
          </button>
        </section>

        {loading && (
          <section className="results">
            <div className="skeleton skeleton-line" style={{ width: "40%" }} />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-line" style={{ width: "90%" }} />
            <div className="skeleton skeleton-line" style={{ width: "75%" }} />
            <div className="skeleton skeleton-block" />
            <div className="skeleton skeleton-block" />
          </section>
        )}

        {analysis && !loading && (
          <section className="results">
            {analysis.matchedPrevious && (
              <div className="match-banner">
                This message closely matches a job offer already reported by
                another user.
              </div>
            )}

            <div className="result-header">
              <h2>Analysis results</h2>
              <div className={`risk ${getRiskClass(analysis.riskLevel)}`}>
                {analysis.riskLevel?.toUpperCase()} RISK
              </div>
            </div>

            <div className="score">
              <span>Risk score</span>
              <strong>{analysis.riskScore}/100</strong>
            </div>

            <div className="summary">
              <h3>Summary</h3>
              <p>{analysis.summary}</p>
            </div>

            <div className="flags">
              <h3>Warning signs</h3>
              {analysis.flags?.map((flag, index) => (
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
                exportReportToPDF(analysis, { companyName, senderDomain })
              }
            >
              Download this report
            </button>
          </section>
        )}

        <footer>
          <p>
            This tool provides an educational risk assessment. A high or low
            score does not prove whether a job offer or company is
            legitimate. Always verify the employer independently before
            sharing personal information or sending money.
          </p>
        </footer>
      </main>
    </>
  );
}