"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { exportReportToPDF } from "../lib/exportReport";
import BottomNav from "../components/BottomNav";

const STARTER_QUESTIONS = [
  "Why is this risky?",
  "What should I do next?",
  "How can I verify this employer?",
];

export default function Dashboard() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [checks, setChecks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);

  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();

      if (!userData.user) {
        router.push("/login");
        return;
      }

      setUserId(userData.user.id);

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

  useEffect(() => {
    async function loadMessages() {
      setMessages([]);
      setChatInput("");
      setChatError("");

      if (!selected) return;

      const { data, error } = await supabase
        .from("check_messages")
        .select("*")
        .eq("check_id", selected.id)
        .order("created_at", { ascending: true });

      if (!error) setMessages(data || []);
    }

    loadMessages();
  }, [selected]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatLoading]);

  function getRiskClass(level) {
    if (level === "high") return "risk-high";
    if (level === "medium") return "risk-medium";
    return "risk-low";
  }

  function getDisplayLabel(check) {
    if (check.company_name) return check.company_name;

    const text = (check.message_text || "").trim();
    if (!text) return "Unnamed offer";

    const words = text.split(/\s+/).slice(0, 6).join(" ");
    return text.split(/\s+/).length > 6 ? `${words}...` : words;
  }

  function getDomainAgeLine(domain) {
    if (!domain) return { text: "No sender domain provided.", bad: false };
    if (domain.freeProvider)
      return {
        text: `${domain.domain} is a free email provider, so no registration age applies.`,
        bad: false,
      };
    if (domain.unknown || domain.ageDays === undefined)
      return {
        text: `Registration date for ${domain.domain} could not be retrieved.`,
        bad: false,
      };
    return {
      text: `${domain.domain} was registered on ${domain.registeredOn} (${domain.ageDays} days ago).`,
      bad: domain.ageDays < 90,
    };
  }

  function getLinkLine(links) {
    if (!links || !links.checked)
      return { text: "No links were checked.", bad: false };
    if (links.unsafe?.length > 0)
      return {
        text: `${links.unsafe.length} link(s) flagged as unsafe by Google Safe Browsing.`,
        bad: true,
      };
    return {
      text: `${links.urlCount} link(s) checked, none flagged by Google Safe Browsing.`,
      bad: false,
    };
  }

  async function deleteCheck(id) {
    if (!confirm("Delete this check and its chat? This cannot be undone.")) {
      return;
    }

    const { data, error } = await supabase
      .from("checks")
      .delete()
      .eq("id", id)
      .select();

    if (error || !data || data.length === 0) {
      alert("Could not delete this check. Please try again.");
      return;
    }

    setChecks((prev) => prev.filter((c) => c.id !== id));
    setSelected(null);
  }

  async function clearAllHistory() {
    if (
      !confirm(
        "Delete ALL your checks and chats? This cannot be undone."
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("checks")
      .delete()
      .eq("user_id", userId);

    if (error) {
      alert("Could not clear history. Please try again.");
      return;
    }

    setChecks([]);
    setSelected(null);
  }

  async function clearChat() {
    if (!selected) return;
    if (!confirm("Clear the chat for this check?")) return;

    const { error } = await supabase
      .from("check_messages")
      .delete()
      .eq("check_id", selected.id);

    if (error) {
      setChatError("Could not clear the chat. Please try again.");
      return;
    }

    setMessages([]);
    setChatError("");
  }

  async function sendMessage(text) {
    const question = (text ?? chatInput).trim();
    if (!question || chatLoading || !selected) return;

    setChatError("");
    setChatLoading(true);
    setChatInput("");

    const { data: savedUser, error: saveError } = await supabase
      .from("check_messages")
      .insert({
        check_id: selected.id,
        user_id: userId,
        role: "user",
        content: question,
      })
      .select()
      .single();

    if (saveError) {
      setChatError("Could not send your message. Please try again.");
      setChatLoading(false);
      setChatInput(question);
      return;
    }

    const historyBefore = messages;
    setMessages((prev) => [...prev, savedUser]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          history: historyBefore.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          context: {
            companyName: selected.company_name,
            senderDomain: selected.sender_domain,
            messageText: selected.message_text,
            riskScore: selected.risk_score,
            riskLevel: selected.risk_level,
            summary: selected.summary,
            flags: selected.flags,
            security: selected.security,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Something went wrong.");
      }

      const { data: savedReply } = await supabase
        .from("check_messages")
        .insert({
          check_id: selected.id,
          user_id: userId,
          role: "assistant",
          content: result.reply,
        })
        .select()
        .single();

      setMessages((prev) => [
        ...prev,
        savedReply || {
          id: `temp-${Date.now()}`,
          role: "assistant",
          content: result.reply,
        },
      ]);
    } catch (err) {
      setChatError(err.message || "Something went wrong. Please try again.");
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <>
        <BottomNav />
        <main className="container">
          <div className="skeleton skeleton-line" style={{ width: "50%" }} />
          <div className="skeleton skeleton-block" />
          <div className="skeleton skeleton-block" />
        </main>
      </>
    );
  }

  return (
    <>
      <BottomNav />

      <main className="container">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <h1 style={{ margin: 0 }}>Your check history</h1>

          {!selected && checks.length > 0 && (
            <button
              type="button"
              onClick={clearAllHistory}
              style={{
                width: "auto",
                padding: "8px 14px",
                fontSize: 13,
                background: "#b42318",
              }}
            >
              Clear all history
            </button>
          )}
        </div>

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
                  <strong>{getDisplayLabel(check)}</strong>
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

            {selected.security?.aiUnavailable && (
              <div className="match-banner">
                Our AI analyst could not be reached when this check was run,
                so this result is from a basic pattern check instead of a
                full analysis.
              </div>
            )}

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
              <h3>Original message</h3>
              <p>{selected.message_text}</p>
            </div>

            <div className="summary">
              <h3>Summary</h3>
              <p>{selected.summary}</p>
            </div>

            {selected.security && (
              <div className="summary">
                <h3>Security checks</h3>
                {[
                  {
                    label: "Domain age",
                    ...getDomainAgeLine(selected.security.domain),
                  },
                  {
                    label: "Link safety",
                    ...getLinkLine(selected.security.links),
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "8px 0",
                      borderTop: "1px solid #e5e7eb",
                      fontSize: 14,
                    }}
                  >
                    <strong>{item.label}</strong>
                    <span
                      style={{
                        textAlign: "right",
                        color: item.bad ? "#b42318" : "inherit",
                      }}
                    >
                      {item.text}
                    </span>
                  </div>
                ))}
                {selected.security.links?.unsafe?.map((u, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: 13,
                      color: "#b42318",
                      wordBreak: "break-all",
                    }}
                  >
                    {u.url} ({u.threatType})
                  </div>
                ))}
              </div>
            )}

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

            <div className="summary">
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 12,
                }}
              >
                <h3 style={{ margin: 0 }}>Ask a follow-up question</h3>
                {messages.length > 0 && (
                  <button
                    type="button"
                    onClick={clearChat}
                    style={{
                      width: "auto",
                      padding: "6px 12px",
                      fontSize: 12,
                      background: "#f3f4f6",
                      color: "#1a1a1a",
                    }}
                  >
                    Clear chat
                  </button>
                )}
              </div>

              {messages.length === 0 && !chatLoading && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => sendMessage(q)}
                      style={{
                        width: "auto",
                        padding: "6px 12px",
                        fontSize: 13,
                        background: "#f3f4f6",
                        color: "#1a1a1a",
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}

              <div
                style={{
                  maxHeight: 360,
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginBottom: 12,
                }}
              >
                {messages.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: 12,
                      fontSize: 14,
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      background: m.role === "user" ? "#2d3648" : "#f3f4f6",
                      color: m.role === "user" ? "#ffffff" : "#1a1a1a",
                    }}
                  >
                    {m.content}
                  </div>
                ))}

                {chatLoading && (
                  <div
                    style={{
                      alignSelf: "flex-start",
                      padding: "10px 14px",
                      borderRadius: 12,
                      fontSize: 14,
                      background: "#f3f4f6",
                      color: "#6b7280",
                    }}
                  >
                    Thinking...
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {chatError && <div className="error">{chatError}</div>}

              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendMessage();
                  }}
                  placeholder="Ask about this job offer..."
                  maxLength={4000}
                  disabled={chatLoading}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  type="button"
                  onClick={() => sendMessage()}
                  disabled={chatLoading || chatInput.trim().length === 0}
                  style={{ width: "auto", padding: "10px 18px" }}
                >
                  Send
                </button>
              </div>
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

            <button
              type="button"
              onClick={() => deleteCheck(selected.id)}
              style={{
                marginTop: 12,
                background: "#b42318",
              }}
            >
              Delete this check
            </button>
          </section>
        )}
      </main>
    </>
  );
}