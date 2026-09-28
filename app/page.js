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

  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [imageMimeType, setImageMimeType] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const timeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/learn");
      } else {
        setUser(data.user);
      }
    });
  }, [router]);

  function handleFile(file) {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file (screenshot, photo, etc.).");
      return;
    }

    setError("");

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      const base64 = result.split(",")[1];
      setImageBase64(base64);
      setImageMimeType(file.type);
      setImagePreview(result);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview(null);
    setImageBase64(null);
    setImageMimeType(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handlePaste(e) {
    const items = e.clipboardData?.items || [];
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        handleFile(file);
        e.preventDefault();
        break;
      }
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  async function analyzeJob() {
    setError("");
    setAnalysis(null);

    const hasText = messageText.trim().length >= 10;
    const hasImage = !!imageBase64;

    if (!hasText && !hasImage) {
      setError("Please paste a job offer message or upload an image first.");
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
          imageBase64,
          imageMimeType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong. Please try again.");
      }

      setAnalysis(data);
      if (data.messageText) setMessageText(data.messageText);
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
            Paste a job offer message, upload a screenshot, or drag an image
            in below and let AI check it for common scam patterns.
          </p>
        </section>

        <section className="card">
          <label>Job offer message</label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            style={{
              border: dragActive ? "2px dashed #2d3648" : "none",
              borderRadius: 8,
            }}
          >
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onPaste={handlePaste}
              placeholder="Paste the job offer message here, or paste/drag an image..."
              rows={10}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFile(e.target.files?.[0])}
              style={{ display: "none" }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "auto",
                padding: "10px 16px",
                background: "#f3f4f6",
                color: "#1a1a1a",
                fontSize: 14,
              }}
            >
              Attach a screenshot
            </button>
          </div>

          {imagePreview && (
            <div
              style={{
                marginBottom: 20,
                position: "relative",
                display: "inline-block",
              }}
            >
              <img
                src={imagePreview}
                alt="Uploaded job offer"
                style={{
                  maxWidth: "200px",
                  maxHeight: "200px",
                  borderRadius: 8,
                  border: "1px solid #e5e7eb",
                  display: "block",
                }}
              />
              <button
                type="button"
                onClick={removeImage}
                style={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  width: 24,
                  height: 24,
                  padding: 0,
                  borderRadius: "50%",
                  background: "#b42318",
                  fontSize: 12,
                }}
              >
                X
              </button>
            </div>
          )}

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