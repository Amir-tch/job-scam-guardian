export const CATEGORY_SIGNALS = [
  {
    category: "Chat-only interview",
    patterns: [
      /whatsapp interview/i,
      /telegram interview/i,
      /chat interview/i,
      /no video call/i,
      /interview.{0,20}(whatsapp|telegram)/i,
    ],
    explanation:
      "The message suggests the entire hiring process happens over chat apps rather than a verifiable video call or in-person meeting, a common tactic in fake job offers.",
  },
  {
    category: "Upfront payment request",
    patterns: [
      /registration fee/i,
      /training fee/i,
      /processing fee/i,
      /activation fee/i,
      /send.{0,15}(money|payment)/i,
      /pay.{0,15}(fee|deposit|kit)/i,
    ],
    explanation:
      "The message asks for money upfront before work begins, which legitimate employers do not require.",
  },
  {
    category: "Implausible salary",
    patterns: [
      /₦\s?\d{6,}/,
      /\$\s?\d{4,}.{0,10}(week|daily|day)/i,
      /earn.{0,15}\d{3,}.{0,10}(day|daily)/i,
    ],
    explanation:
      "The message mentions a pay rate that looks unusually high for the type of role described.",
  },
  {
    category: "Urgency pressure",
    patterns: [
      /urgent(ly)?/i,
      /act now/i,
      /immediately/i,
      /within 24 hours/i,
      /limited slots?/i,
      /hurry/i,
    ],
    explanation:
      "The message pressures you to respond or act quickly, a tactic used to prevent careful verification.",
  },
  {
    category: "Domain mismatch",
    patterns: [],
    explanation:
      "The sender's email domain does not appear to match the company name given.",
  },
  {
    category: "Task-based pay scam pattern",
    patterns: [
      /complete.{0,15}tasks?/i,
      /per task/i,
      /task completion/i,
      /optimi[sz]e.{0,15}(product|listing)/i,
      /rating tasks?/i,
    ],
    explanation:
      "The message describes being paid for completing simple, repetitive tasks, a pattern common in task-based pay scams.",
  },
  {
    category: "Sensitive personal information request",
    patterns: [
      /\bBVN\b/i,
      /\bNIN\b/i,
      /bank account number/i,
      /atm pin/i,
      /passport number/i,
    ],
    explanation:
      "The message asks for sensitive personal identification or banking details before any formal hiring process.",
  },
];

function findEvidence(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

export function runSignalLibrary(messageText, companyName, senderDomain) {
  const text = messageText || "";

  const flags = CATEGORY_SIGNALS.map(({ category, patterns, explanation }) => {
    if (category === "Domain mismatch") {
      const companyToken = (companyName || "")
        .toLowerCase()
        .replace(/\s+/g, "")
        .slice(0, 4);
      const detected = Boolean(
        companyName &&
          senderDomain &&
          companyToken &&
          !senderDomain.toLowerCase().includes(companyToken)
      );
      return {
        category,
        detected,
        evidence: detected ? senderDomain : "",
        explanation: detected
          ? explanation
          : "No domain mismatch could be determined from the information provided.",
      };
    }

    const evidence = findEvidence(text, patterns);
    return {
      category,
      detected: Boolean(evidence),
      evidence: evidence || "",
      explanation: evidence
        ? explanation
        : "No pattern for this category was found in the message.",
    };
  });

  const detectedCount = flags.filter((f) => f.detected).length;
  const riskScore = Math.min(90, detectedCount * 15);
  const riskLevel = riskScore >= 70 ? "high" : riskScore >= 40 ? "medium" : "low";

  return {
    riskScore,
    riskLevel,
    flags,
    summary: `Our AI analyst is temporarily unavailable, so this result comes from a basic pattern-matching check instead. ${detectedCount} of 7 known warning sign patterns were found in this message. This is less thorough than a full AI analysis. Please try again later for a complete assessment.`,
  };
}