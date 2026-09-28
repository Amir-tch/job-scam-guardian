const FREE_EMAIL_DOMAINS = [
  "gmail.com", "yahoo.com", "outlook.com", "hotmail.com",
  "proton.me", "protonmail.com", "icloud.com", "aol.com", "mail.com",
];

export function extractUrls(text) {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"')]+/gi) || [];
  return [...new Set(matches)].slice(0, 10);
}

function cleanDomain(input) {
  if (!input) return null;
  let d = input.trim().toLowerCase();
  if (d.includes("@")) d = d.split("@").pop();
  d = d.replace(/^https?:\/\//, "").split("/")[0];
  return d || null;
}

export async function getDomainAge(senderDomain) {
  const domain = cleanDomain(senderDomain);
  if (!domain) return null;
  if (FREE_EMAIL_DOMAINS.includes(domain)) {
    return { domain, freeProvider: true };
  }
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://rdap.org/domain/${encodeURIComponent(domain)}`,
      { signal: controller.signal, headers: { Accept: "application/rdap+json" } }
    );
    clearTimeout(timer);
    if (!res.ok) return { domain, unknown: true };
    const data = await res.json();
    const reg = (data.events || []).find((e) => e.eventAction === "registration");
    if (!reg?.eventDate) return { domain, unknown: true };
    const registeredOn = new Date(reg.eventDate);
    const ageDays = Math.floor((Date.now() - registeredOn.getTime()) / 86400000);
    return {
      domain,
      registeredOn: registeredOn.toISOString().slice(0, 10),
      ageDays,
    };
  } catch (e) {
    return { domain, unknown: true };
  }
}

export async function checkSafeBrowsing(urls) {
  const key = process.env.SAFE_BROWSING_API_KEY;
  if (!key || !urls || urls.length === 0) return { checked: false, unsafe: [] };
  try {
    const res = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client: { clientId: "job-scam-guardian", clientVersion: "1.0" },
          threatInfo: {
            threatTypes: [
              "MALWARE",
              "SOCIAL_ENGINEERING",
              "UNWANTED_SOFTWARE",
              "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            platformTypes: ["ANY_PLATFORM"],
            threatEntryTypes: ["URL"],
            threatEntries: urls.map((url) => ({ url })),
          },
        }),
      }
    );
    if (!res.ok) return { checked: false, unsafe: [] };
    const data = await res.json();
    const unsafe = (data.matches || []).map((m) => ({
      url: m.threat.url,
      threatType: m.threatType,
    }));
    return { checked: true, unsafe, urlCount: urls.length };
  } catch (e) {
    return { checked: false, unsafe: [] };
  }
}

export function describeDomainAge(info) {
  if (!info || info.freeProvider || info.unknown || info.ageDays === undefined) {
    return "Not available";
  }
  return `${info.domain} was registered on ${info.registeredOn} (${info.ageDays} days ago)`;
}

export function applySecurity(analysis, domainInfo, linkInfo) {
  const notes = [];
  let score = analysis.riskScore;

  if (domainInfo?.ageDays !== undefined && domainInfo.ageDays < 90) {
    notes.push(
      `Sender domain ${domainInfo.domain} was registered ${domainInfo.ageDays} days ago. Newly registered domains are common in scams.`
    );
    score = Math.min(100, score + 15);
  }

  if (linkInfo?.unsafe?.length > 0) {
    notes.push(
      `Google Safe Browsing flagged ${linkInfo.unsafe.length} link(s) in this message as unsafe.`
    );
    score = Math.max(score, 85);
  }

  const riskLevel = score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  return {
    ...analysis,
    riskScore: score,
    riskLevel,
    summary: notes.length ? `${analysis.summary} ${notes.join(" ")}` : analysis.summary,
    security: { domain: domainInfo || null, links: linkInfo || null },
  };
}